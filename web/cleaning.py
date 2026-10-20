"""Point cloud cleaning: decimation (voxel grid) + noise removal (SOR / ROR).

Shared by the browser preview endpoint (``web.pointcloud``) and by the CLI
pipeline (``cloud2entities.py``) so the visualised result matches the model.

All functions operate on an ``(N, 3)`` float array of positions and return the
indices of the points to keep, so colours (or any other per-point channel) can
be filtered with the exact same selection.
"""

from __future__ import annotations

import hashlib
import json

import numpy as np

# Keys understood by :func:`normalize_clean_params`.
PARAM_KEYS = ("voxel_size", "sor_k", "sor_std_ratio", "ror_radius", "ror_min_neighbors")


def normalize_clean_params(params):
    """Coerce a loose dict (query string / YAML) into the canonical clean dict."""
    p = params or {}

    def _f(key, default):
        try:
            return float(p.get(key, default) or default)
        except (TypeError, ValueError):
            return float(default)

    def _i(key, default):
        try:
            return int(float(p.get(key, default) or default))
        except (TypeError, ValueError):
            return int(default)

    return {
        "voxel_size": _f("voxel_size", 0.0),
        "sor_k": _i("sor_k", 0),
        "sor_std_ratio": _f("sor_std_ratio", 2.0),
        "ror_radius": _f("ror_radius", 0.0),
        "ror_min_neighbors": _i("ror_min_neighbors", 4),
    }


def is_clean_active(params):
    p = normalize_clean_params(params)
    return p["voxel_size"] > 0 or p["sor_k"] > 0 or p["ror_radius"] > 0


def clean_cache_suffix(params):
    """Stable short hash of the cleaning parameters, for cache filenames."""
    p = normalize_clean_params(params)
    raw = json.dumps(p, sort_keys=True).encode()
    return hashlib.sha1(raw).hexdigest()[:12]


def _voxel_keep(positions, voxel_size):
    """Keep one representative point per voxel of the given edge length.

    The representative is the point closest to its voxel *centroid* rather than
    an arbitrary member: this keeps real measured coordinates (no synthetic
    averaging) but avoids the position bias of picking, e.g., the first point,
    which can shave the ends of walls and erode opening edges.
    """
    keys = np.floor(positions / voxel_size).astype(np.int64)
    uniq, inverse = np.unique(keys, axis=0, return_inverse=True)
    m = len(uniq)
    counts = np.bincount(inverse, minlength=m).astype(np.float64)
    counts[counts == 0] = 1.0
    centroids = np.empty((m, 3), dtype=np.float64)
    for axis in range(3):
        centroids[:, axis] = (
            np.bincount(inverse, weights=positions[:, axis], minlength=m) / counts
        )
    d = np.linalg.norm(positions - centroids[inverse], axis=1)
    order = np.lexsort((d, inverse))       # group by voxel, nearest centroid first
    sorted_inv = inverse[order]
    take = np.empty(len(order), dtype=bool)
    take[0] = True
    take[1:] = sorted_inv[1:] != sorted_inv[:-1]
    return np.sort(order[take])


def _sor_keep(positions, k, std_ratio):
    """Statistical Outlier Removal: drop points whose mean k-NN distance is
    beyond ``mean + std_ratio * std`` of the whole cloud."""
    from scipy.spatial import cKDTree

    n = len(positions)
    k = min(k + 1, n)
    if k < 2:
        return np.arange(n)

    tree = cKDTree(positions)
    dist, _ = tree.query(positions, k=k, workers=-1)
    mean_d = dist[:, 1:].mean(axis=1)
    threshold = mean_d.mean() + std_ratio * mean_d.std()
    return np.where(mean_d <= threshold)[0]


def _ror_keep(positions, radius, min_neighbors):
    """Radius Outlier Removal: keep points having >= min_neighbors within radius."""
    from scipy.spatial import cKDTree

    tree = cKDTree(positions)
    counts = tree.query_ball_point(positions, radius, return_length=True, workers=-1)
    return np.where(counts >= min_neighbors)[0]


def clean_indices(positions, params):
    """Return the indices of ``positions`` surviving the requested cleaning.

    Noise removal runs **before** decimation and on the full-resolution cloud.
    Doing it the other way round (voxel first) thins every neighbourhood to the
    same spacing, so genuine boundary points - wall ends, opening edges - look
    like statistical outliers and get deleted, which fragments walls and can
    close openings. Filtering first keeps those edges: they still have plenty of
    real neighbours on the raw cloud, so only true isolated noise is dropped.
    """
    p = normalize_clean_params(params)
    positions = np.asarray(positions)
    idx = np.arange(len(positions))

    if p["sor_k"] > 0 and len(positions) > 2:
        keep = _sor_keep(positions, p["sor_k"], p["sor_std_ratio"])
        idx, positions = idx[keep], positions[keep]

    if p["ror_radius"] > 0 and len(positions):
        keep = _ror_keep(positions, p["ror_radius"], p["ror_min_neighbors"])
        idx, positions = idx[keep], positions[keep]

    if p["voxel_size"] > 0 and len(positions):
        keep = _voxel_keep(positions, p["voxel_size"])
        idx = idx[keep]

    return idx


def clean_points(positions, params, colors=None):
    """Return ``(positions, colors)`` filtered by the cleaning parameters."""
    idx = clean_indices(positions, params)
    pos = np.asarray(positions)[idx]
    col = None if colors is None else np.asarray(colors)[idx]
    return pos, col


def suggest_clean_params(positions, sample=60_000):
    """Analyse a cloud and propose sensible cleaning parameters.

    Heuristically estimates the median nearest-neighbour spacing, the fraction
    of statistical outliers, and the fraction of isolated points, then derives:

    * ``voxel_size``  ~ 2 x spacing (decimates redundant samples, keeps detail)
    * ``sor_k``       enabled when a non-trivial share of points are outliers
    * ``ror_radius``  ~ 3 x spacing, enabled when isolated points are common

    Returns ``(params, diagnostics)``.
    """
    from scipy.spatial import cKDTree

    defaults = normalize_clean_params({})
    pos = np.asarray(positions, dtype=np.float64)
    n = len(pos)
    diag = {
        "n_points": int(n),
        "spacing_m": 0.0,
        "noise_fraction": 0.0,
        "isolated_fraction": 0.0,
    }
    if n < 20:
        return defaults, diag

    tree = cKDTree(pos)
    rng = np.random.default_rng(0)
    probe_idx = rng.choice(n, size=min(sample, n), replace=False)

    # Nearest-neighbour spacing (k = 2 -> first column is the point itself)
    k_nn = min(2, n)
    d_nn, _ = tree.query(pos[probe_idx], k=k_nn, workers=-1)
    nn = d_nn[:, 1] if k_nn == 2 else d_nn[:, 0]
    nn = nn[np.isfinite(nn)]
    if len(nn) == 0:
        return defaults, diag
    spacing = float(np.median(nn))
    diag["spacing_m"] = spacing

    # Statistical outliers: mean k-NN distance beyond mean + 2 std
    k_sor = min(9, n)
    if k_sor >= 3:
        d_k, _ = tree.query(pos[probe_idx], k=k_sor, workers=-1)
        mean_d = d_k[:, 1:].mean(axis=1)
        thr = mean_d.mean() + 2.0 * mean_d.std()
        diag["noise_fraction"] = float((mean_d > thr).mean())

    # Isolated points: fewer than 4 neighbours within 3 x spacing
    radius = max(3.0 * spacing, 1e-6)
    counts = tree.query_ball_point(pos[probe_idx], radius, return_length=True, workers=-1)
    diag["isolated_fraction"] = float((counts < 4).mean())

    voxel = round(2.0 * spacing, 4) if spacing > 0 else 0.0
    params = {
        "voxel_size": voxel,
        "sor_k": 8 if diag["noise_fraction"] > 0.005 else 0,
        "sor_std_ratio": 2.0,
        "ror_radius": round(radius, 4) if diag["isolated_fraction"] > 0.01 else 0.0,
        "ror_min_neighbors": 4,
    }
    return normalize_clean_params(params), diag
