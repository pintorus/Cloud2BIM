"""Build a browser-friendly, downsampled point cloud binary from E57 / LAS / LAZ / XYZ.

The browser cannot parse E57, so the point cloud is downsampled server-side and
streamed to a Three.js ``THREE.Points`` viewer as a compact binary blob.

Binary layout (little-endian):
    magic      : 4 bytes  b"C2BP"
    version    : uint32   (=1)
    n_points   : uint32
    has_color  : uint32   (0 or 1)
    bbox_min   : 3 x float32   (absolute source coordinates)
    bbox_max   : 3 x float32
    positions  : n_points x 3 x float32  (relative to bbox_min -> starts at 0)
    colors     : n_points x 3 x uint8    (present only when has_color == 1)
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np

_MAGIC = b"C2BP"
_VERSION = 1
_CACHE_VERSION = 4
DEFAULT_MAX_POINTS = 3_000_000
# Above this many points the *preview* decimates before cleaning to stay
# responsive; the pipeline always cleans the full cloud.
_CLEAN_FULL_LIMIT = 12_000_000


def _normalize_colors(colors):
    """Scale a colour array to the uint8 range the binary format expects.

    E57 exposes colour as float in [0, 1] while LAS/XYZ give 0-255 integers.
    Truncating the float form straight to uint8 rounds every channel down to
    0 or 1, which paints the whole cloud black, so scale it up first.
    """
    if colors is None or colors.size == 0:
        return colors
    arr = np.asarray(colors, dtype=np.float64)
    if float(arr.max()) <= 1.0:
        arr = arr * 255.0
    return np.clip(arr, 0, 255).astype(np.uint8)


def _colors_are_useful(colors):
    """Whether a colour channel actually carries information.

    Sources without colour are frequently exported as R=G=B=0 (or a constant
    grey). Rendering those literally paints the whole cloud black, so treat a
    degenerate channel as "no colour" and let the viewer fall back to a height
    gradient.
    """
    if colors is None or colors.size == 0:
        return False
    if int(colors.max()) == 0:
        return False
    # Mean luminance over 765 is "visually black" - keep the threshold very
    # low so a genuinely dark but real cloud still keeps its colour.
    return float(colors.astype(np.float64).sum(axis=1).mean()) >= 4.0


def _sample(positions, colors, max_points):
    """Uniform stride subsample so we keep <= max_points points."""
    n = len(positions)
    if n <= max_points:
        return positions, colors
    stride = int(np.ceil(n / max_points))
    return positions[::stride], (colors[::stride] if colors is not None else None)


def _read_e57(path):
    from aux_functions import read_e57
    data = read_e57(path)
    positions = np.asarray(data.points, dtype=np.float64)
    colors = np.asarray(data.color)
    if colors.ndim != 2 or colors.shape[1] < 3 or colors.shape[0] != positions.shape[0]:
        colors = None
    return positions, colors


def _read_las(path):
    import laspy
    las = laspy.read(path)
    positions = np.vstack((np.asarray(las.x), np.asarray(las.y), np.asarray(las.z))).T
    try:
        colors = np.vstack((
            np.asarray(las.red), np.asarray(las.green), np.asarray(las.blue),
        )).T
        if colors.max() > 255:
            colors = colors >> 8
        colors = colors.astype(np.uint8)
    except Exception:
        colors = None
    return positions, colors


def _read_xyz(path, max_points):
    """Stream an ASCII XYZ file, keeping bounded memory via stride sampling."""
    import os
    est_lines = max(1, os.path.getsize(path) // 32)
    stride = max(1, est_lines // max_points)

    positions, colors = [], []
    with open(path, "r", errors="ignore") as fh:
        for i, line in enumerate(fh):
            if i % stride:
                continue
            parts = line.split()
            if len(parts) < 3:
                continue
            try:
                x, y, z = float(parts[0]), float(parts[1]), float(parts[2])
            except ValueError:
                continue  # header line
            positions.append((x, y, z))
            if len(parts) >= 6:
                try:
                    colors.append((int(float(parts[3])), int(float(parts[4])), int(float(parts[5]))))
                except ValueError:
                    colors.append((200, 200, 200))
    pos = np.asarray(positions, dtype=np.float64)
    if colors and len(colors) != len(positions):
        colors = None
    col = np.asarray(colors, dtype=np.uint8) if colors else None
    return pos, col


def _load_source(path, max_points, clean_params=None):
    suffix = Path(path).suffix.lower()
    if suffix == ".e57":
        positions, colors = _read_e57(path)
    elif suffix in (".las", ".laz"):
        positions, colors = _read_las(path)
    else:
        positions, colors = _read_xyz(path, max_points)

    if positions is None or len(positions) == 0:
        raise ValueError("Point cloud is empty or unreadable")

    finite = np.isfinite(positions).all(axis=1)
    positions = positions[finite]
    if colors is not None:
        colors = colors[finite]
        colors = _normalize_colors(colors)

    if not _colors_are_useful(colors):
        colors = None

    # Clean at full resolution first so the preview matches what the pipeline
    # computes, then downsample only for display. Filtering the already-strided
    # cloud would change the effective density and mislead the preview.
    if clean_params is not None:
        from web.cleaning import clean_points, is_clean_active
        if is_clean_active(clean_params):
            if len(positions) <= _CLEAN_FULL_LIMIT:
                positions, colors = clean_points(positions, clean_params, colors)
            else:
                # Pathologically large cloud: decimate first to stay responsive.
                positions, colors = _sample(positions, colors, _CLEAN_FULL_LIMIT)
                positions, colors = clean_points(positions, clean_params, colors)

    positions, colors = _sample(positions, colors, max_points)

    return positions, colors


def source_cache_key(path):
    """Stable cache key from path + size + mtime + reader version."""
    st = Path(path).stat()
    raw = f"{path}|{st.st_size}|{int(st.st_mtime)}|v{_CACHE_VERSION}".encode()
    return hashlib.sha1(raw).hexdigest()[:16]


def build_pointcloud_binary(source_path, out_path, max_points=DEFAULT_MAX_POINTS,
                            clean_params=None):
    """Write the downsampled point cloud binary to ``out_path``.

    When ``clean_params`` is given and active, the decimation / noise removal is
    applied before writing so the preview reflects the cleaned cloud. Returns a
    small metadata dict (also embedded in the file header).
    """
    positions, colors = _load_source(source_path, max_points, clean_params=clean_params)

    bbox_min = positions.min(axis=0)
    bbox_max = positions.max(axis=0)
    rel = (positions - bbox_min).astype(np.float32)

    has_color = colors is not None
    n = len(rel)

    with open(out_path, "wb") as fh:
        fh.write(_MAGIC)
        fh.write(np.uint32(_VERSION).tobytes())
        fh.write(np.uint32(n).tobytes())
        fh.write(np.uint32(1 if has_color else 0).tobytes())
        fh.write(bbox_min.astype(np.float32).tobytes())
        fh.write(bbox_max.astype(np.float32).tobytes())
        fh.write(rel.tobytes())
        if has_color:
            fh.write(np.ascontiguousarray(colors, dtype=np.uint8).tobytes())

    return {
        "n_points": int(n),
        "has_color": bool(has_color),
        "bbox_min": [float(v) for v in bbox_min],
        "bbox_max": [float(v) for v in bbox_max],
    }
