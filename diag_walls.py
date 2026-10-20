"""Instrumented replay of identify_walls on a job's converted_input.xyz.

Replicates each stage of aux_functions.identify_walls and reports the count /
distribution after every step, so we can see exactly where walls are lost.
"""
import os
import sys

os.environ.setdefault("MPLBACKEND", "Agg")

import numpy as np
import cv2
from skimage.morphology import closing, footprint_rectangle
from matplotlib.patches import Polygon as MplPolygon

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import aux_functions as af
from aux_functions import (
    load_xyz_file, identify_slabs, split_pointcloud_to_storeys,
    get_line_segments, merge_collinear_segments, group_segments,
    calculate_wall_axis, adjust_intersections, swell_polygon,
    distance_between_points, _pca_dominant_angle, _rotate_pts_2d,
)

XYZ = sys.argv[1]
GRID_COEFF = float(sys.argv[2]) if len(sys.argv) > 2 else 5
PC_RES = float(sys.argv[3]) if len(sys.argv) > 3 else 0.002
MIN_LEN = float(sys.argv[4]) if len(sys.argv) > 4 else 0.1
MIN_TH = float(sys.argv[5]) if len(sys.argv) > 5 else 0.05
MAX_TH = float(sys.argv[6]) if len(sys.argv) > 6 else 0.75
EXT = sys.argv[7] == "1" if len(sys.argv) > 7 else False
CV_MODE_NAME = sys.argv[8] if len(sys.argv) > 8 else "EXTERNAL"
CV_MODE = sys.argv[8] if len(sys.argv) > 8 else "EXTERNAL"
CV_MODE = {"EXTERNAL": cv2.RETR_EXTERNAL, "LIST": cv2.RETR_LIST,
           "CCOMP": cv2.RETR_CCOMP, "TREE": cv2.RETR_TREE}[CV_MODE_NAME]

print("=" * 70)
print(f"RETR={CV_MODE_NAME} exterior_scan={EXT}")
print(f"input={XYZ}")
print(f"grid_coefficient={GRID_COEFF} pc_resolution={PC_RES} min_len={MIN_LEN} "
      f"min_th={MIN_TH} max_th={MAX_TH} exterior_scan={EXT}")
print("=" * 70)

DIL = os.environ.get("DILUTE", "0") == "1"
ITH = int(os.environ.get("ITH", "10"))
pts, rgb = load_xyz_file(XYZ, plot_xyz=False, select_ith_lines=DIL, ith_lines=ITH)
pts = np.round(pts, 3)
off = np.array([pts[:, 0].min(), pts[:, 1].min(), 0.0])
pts = pts - off
print(f"[1] points loaded            : {len(pts):,}  z range {pts[:,2].min():.2f}..{pts[:,2].max():.2f}")

slabs, _ = identify_slabs(pts, rgb, 0.3, 0.4, z_step=0.15, pc_resolution=PC_RES, plot_segmented_plane=False)
print(f"[2] slabs detected          : {len(slabs)}")
for i, s in enumerate(slabs):
    print(f"      slab{i}: bottom_z={s['slab_bottom_z_coord']:.3f} th={s['thickness']:.3f}")

storeys = split_pointcloud_to_storeys(pts, slabs)
print(f"[3] storeys                 : {len(storeys)}  sizes={[len(s) for s in storeys]}")

for i, pc in enumerate(storeys):
    print("-" * 70)
    print(f"STOREY {i}")
    if i + 1 >= len(slabs):
        print("  no upper slab, skipping")
        continue
    if EXT:
        z_placement = slabs[i]['slab_bottom_z_coord'] + slabs[i]['thickness']
    else:
        z_placement = slabs[i]['slab_bottom_z_coord'] if i == 0 else \
            slabs[i]['slab_bottom_z_coord'] + slabs[i]['thickness']
    top_z = slabs[i + 1]['slab_bottom_z_coord']
    print(f"  z_placement={z_placement:.3f} top_z={top_z:.3f}")

    z = pc[:, 2]
    z_max_pc, z_min_pc = z.max(), z.min()
    BAND_LO = float(os.environ.get("BAND_LO", "0.85"))
    BAND_HI = float(os.environ.get("BAND_HI", "1.2"))
    ABS_MIN = os.environ.get("ABS_MIN"); ABS_MAX = os.environ.get("ABS_MAX")
    if ABS_MIN and ABS_MAX:
        z_lo, z_hi = float(ABS_MIN), float(ABS_MAX)
    else:
        z_hi = z_min_pc + BAND_HI * (z_max_pc - z_min_pc)
        z_lo = z_min_pc + BAND_LO * (z_max_pc - z_min_pc)
    mask = (z >= z_lo) & (z <= z_hi)
    pts2d = np.column_stack([pc[mask, 0], pc[mask, 1]])
    print(f"  [a] wall-band points      : {len(pts2d):,} of {len(pc):,}  (band {z_lo:.2f}..{z_hi:.2f})")

    ang = _pca_dominant_angle(pts2d)
    do_rot = abs(ang) > np.radians(3)
    print(f"  [b] PCA angle             : {np.degrees(ang):.2f} deg -> rotate={do_rot}")
    slab_polygon = slabs[i + 1]['polygon']
    if do_rot:
        pts2d = _rotate_pts_2d(pts2d, -ang)
        if slab_polygon is not None:
            slab_polygon = MplPolygon(_rotate_pts_2d(slab_polygon.get_xy(), -ang))

    pixel = PC_RES * GRID_COEFF
    x_min, y_min = pts2d.min(axis=0)
    x_max, y_max = pts2d.max(axis=0)
    xs = np.arange(x_min + 0.5 * pixel, x_max, pixel)
    ys = np.arange(y_min + 0.5 * pixel, y_max, pixel)
    grid, _, _ = np.histogram2d(pts2d[:, 0], pts2d[:, 1], bins=[xs, ys])
    grid = grid.T
    print(f"  [c] histogram             : {grid.shape} pixel_size={pixel:.4f} m  occupancy={float((grid>0.01).mean()):.4f}")

    binary = (grid > 0.01).astype(np.uint8) * 255
    nz_before = int((binary > 0).sum())
    binary = closing(binary, footprint_rectangle((5, 5)))
    ERODE = int(os.environ.get("ERODE", "0"))
    if ERODE > 0:
        k = np.ones((ERODE, ERODE), np.uint8)
        binary = cv2.erode(binary, k, iterations=1)
        print(f"        (eroded {ERODE}x{ERODE} -> {int((binary>0).sum())} px)")
    nz_after = int((binary > 0).sum())
    print(f"  [d] mask px before/after  : {nz_before} -> {nz_after}")

    contours, _ = cv2.findContours(binary, CV_MODE, cv2.CHAIN_APPROX_NONE)
    print(f"  [e] contours              : {len(contours)}  areas={[int(cv2.contourArea(c)) for c in contours]}")

    M = np.float32([[1, 0, 1], [0, 1, 1]])
    adjusted = [cv2.transform(c, M) for c in contours]
    all_seg = []
    for c in adjusted:
        all_seg.extend(get_line_segments(c, pixel, segment_approximation_tolerance=0.04))
    world = [[[p[0] * pixel + x_min, p[1] * pixel + y_min] for p in s] for s in all_seg]
    lens = np.array([distance_between_points(s[0], s[1]) for s in world])
    print(f"  [f] raw segments          : {len(world)}  len min/med/max = "
          f"{lens.min():.2f}/{np.median(lens):.2f}/{lens.max():.2f}" if len(lens) else "  [f] raw segments: 0")
    if len(lens):
        print(f"        segments >= {MIN_LEN} m  : {(lens>=MIN_LEN).sum()}  "
              f"(dropped {(lens<MIN_LEN).sum()}, lengths of dropped: "
                  f"{np.round(np.sort(lens[lens<MIN_LEN])[:12],2)})")

    filtered = [s for s in world if distance_between_points(s[0], s[1]) >= MIN_LEN]
    print(f"  [g] filtered segments     : {len(filtered)}")

    final = merge_collinear_segments([s.copy() for s in filtered], MIN_TH, MAX_TH)
    print(f"  [h] after collinear merge : {len(final)}")

    groups, labels, facade_cands = group_segments(final, MAX_TH, 'interior')
    print(f"  [i] interior groups       : {len(groups)}  labels={labels}")
    for gi, g in enumerate(groups):
        gl = [distance_between_points(x[0], x[1]) for x in g]
        print(f"        group{gi}: {len(g)} segs, lengths {np.round(gl,2).tolist()}")

    if not EXT:
        swollen = swell_polygon(slab_polygon.get_xy(), 0.45)
        facade_cands = list(facade_cands) + list(swollen)
        print(f"  [j] facade candidates     : {len(facade_cands)}")
        fl = [distance_between_points(s[0], s[1]) for s in facade_cands]
        if fl:
            print(f"        facade lengths       : {np.round(np.sort(fl)[::-1],2).tolist()}")
        fg, flabels, _ = group_segments(facade_cands, MAX_TH, 'exterior')
        print(f"  [k] exterior groups       : {len(fg)}")
        groups = list(groups) + list(fg)
        labels = list(labels) + list(flabels)
    else:
        print(f"  [j] facade candidates     : SKIPPED (exterior_scan=True)")

    axes, ths = [], []
    for g, lab in zip(groups, labels):
        ax, th = calculate_wall_axis(g)
        if ax is None or any(np.isnan(c) for p in ax for c in p):
            print(f"        dropped group (axis invalid): {lab}")
            continue
        axes.append(ax); ths.append(th)
    print(f"  [l] valid wall axes       : {len(axes)}  thicknesses={np.round(ths,3).tolist()}")
    for k, ax in enumerate(axes):
        L = distance_between_points(ax[0], ax[1])
        print(f"        wall{k+1}: start=({ax[0][0]:.2f},{ax[0][1]:.2f}) end=({ax[1][0]:.2f},{ax[1][1]:.2f}) len={L:.2f}")
    axes = adjust_intersections(axes, MAX_TH)
    print(f"  [m] after adjust_intersect : {len(axes)}")
print("=" * 70)
