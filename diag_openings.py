"""Sweep identify_openings parameters on a job's converted_input.xyz."""
import os
import sys

os.environ.setdefault("MPLBACKEND", "Agg")

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aux_functions import (load_xyz_file, identify_slabs, split_pointcloud_to_storeys,
                           identify_walls, identify_openings)

XYZ = sys.argv[1]

pts, rgb = load_xyz_file(XYZ, plot_xyz=False, select_ith_lines=False, ith_lines=1)
pts = np.round(pts, 3)
pts = pts - np.array([pts[:, 0].min(), pts[:, 1].min(), 0.0])

slabs, _ = identify_slabs(pts, rgb, 0.3, 0.4, z_step=0.15, pc_resolution=0.002,
                          plot_segmented_plane=False)
storeys = split_pointcloud_to_storeys(pts, slabs)
pc = storeys[0]
z_floor = slabs[0]["slab_bottom_z_coord"]
z_ceiling = slabs[1]["slab_bottom_z_coord"]
zone = (slabs[0]["slab_bottom_z_coord"] + slabs[0]["thickness"],
        slabs[1]["slab_bottom_z_coord"])
print(f"points={len(pc):,} z_floor={z_floor:.2f} z_ceiling={z_ceiling:.2f} zone={zone}")

res = identify_walls(pc, 0.002, 0.1, 0.05, 0.75, z_floor, z_ceiling,
                     grid_coefficient=5, slab_polygon=slabs[1]["polygon"],
                     exterior_scan=False, exterior_walls_thickness=0.3,
                     wall_band_low=0.30, wall_band_high=0.70, wall_band_z=zone,
                     mask_erode=3)

groups = res[4]
labels = res[5]
print(f"{len(groups)} walls: labels={labels}")

configs = [dict(histogram_threshold=ht) for ht in (0.8, 0.85)]

for cfg in configs:
    print(f"\n=== thr={cfg['histogram_threshold']} minH={cfg.get('min_opening_height',0.6)} "
          f"zTop={cfg.get('opening_min_z_top',1.6)} ===")
    total = 0
    for j, (group, label) in enumerate(zip(groups, labels)):
        widths, heights, types = identify_openings(
            j + 1, group, label, 0.002, 5,
            histogram_threshold=cfg["histogram_threshold"],
            min_opening_width=0.4, min_opening_height=cfg.get("min_opening_height", 0.6),
            max_opening_aspect_ratio=4, door_z_max=0.1,
            door_min_height=1.6, opening_min_z_top=cfg.get("opening_min_z_top", 1.6),
            plot_histograms_for_openings=False)
        total += len(widths)
        for (x0, x1), (z0, z1), t in zip(widths, heights, types):
            print(f"  wall{j+1} {t:6s} x[{x0:6.2f},{x1:6.2f}] w={x1-x0:.2f} "
                  f"z[{z0:4.2f},{z1:4.2f}] h={z1-z0:.2f}")
    print(f"  -> total openings = {total}")
