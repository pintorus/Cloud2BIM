"""Measure candidate signals for classifying a scan as interior / exterior / mixed."""
import os
import sys

os.environ.setdefault("MPLBACKEND", "Agg")
import numpy as np
from matplotlib.path import Path as MplPath

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aux_functions import load_xyz_file, identify_slabs, split_pointcloud_to_storeys

XYZ = sys.argv[1]
ITH = int(sys.argv[2]) if len(sys.argv) > 2 else 10

pts, rgb = load_xyz_file(XYZ, plot_xyz=False, select_ith_lines=True, ith_lines=ITH)
pts = np.round(pts, 3)
pts = pts - np.array([pts[:, 0].min(), pts[:, 1].min(), 0.0])
n = len(pts)
print(f"file={os.path.basename(os.path.dirname(XYZ))}  points(sampled)={n:,}")

slabs, _ = identify_slabs(pts, rgb, 0.3, 0.4, z_step=0.15, pc_resolution=0.002,
                         plot_segmented_plane=False)
print(f"slabs={len(slabs)}")
for i, s in enumerate(slabs):
    print(f"  slab{i}: bottom_z={s['slab_bottom_z_coord']:.3f} th={s['thickness']:.3f}")

if len(slabs) < 2:
    print("only 1 slab -> classify as EXTERIOR (no ceiling captured)")
    sys.exit(0)

storeys = split_pointcloud_to_storeys(pts, slabs)
print(f"storeys={len(storeys)}")

for i, s in enumerate(slabs):
    poly = s["polygon"].get_xy()
    p = MplPath(poly)
    x, y = pts[:, 0], pts[:, 1]
    inside = p.contains_points(np.column_stack([x, y]))
    bb_w = x.max() - x.min()
    bb_h = y.max() - y.min()
    # shoelace area of the hull
    a = 0.5 * abs(np.dot(poly[:, 0], np.roll(poly[:, 1], -1)) - np.dot(poly[:, 1], np.roll(poly[:, 0], -1)))
    rect = a / (bb_w * bb_h) if bb_w * bb_h else 0
    # points near this slab's z, and how many of them are inside its own footprint
    band = np.abs(pts[:, 2] - (s["slab_bottom_z_coord"] + s["thickness"] / 2)) < 0.15
    frac_in = inside[band].mean() if band.any() else float("nan")
    print(f"  slab{i}: hull_area={a:7.2f} m2  bbox={bb_w:6.2f}x{bb_h:6.2f} ({bb_w*bb_h:7.2f} m2)"
          f"  rectangularity={rect:.3f}  pts_in_own_footprint={frac_in:.3f}")

# vertical structure: how much is floor / ceiling / walls
z = pts[:, 2]
storey0 = storeys[0][:, 2]
lo, hi = storey0.min(), storey0.max()
span = hi - lo
print(f"storey0 z {lo:.2f}..{hi:.2f} (span {span:.2f})")
for name, f0, f1 in [("bottom slab", 0.00, 0.12), ("walls", 0.12, 0.88), ("top slab", 0.88, 1.01)]:
    m = (storey0 >= lo + f0 * span) & (storey0 < lo + f1 * span)
    print(f"   {name:12s} {m.mean()*100:5.1f}% of storey points")
