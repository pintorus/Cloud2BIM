"""Run identify_walls locally on a job's converted_input.xyz to inspect the axes."""
import os
import sys

os.environ.setdefault("MPLBACKEND", "Agg")
os.environ["CLOUD2BIM_DEBUG_AXES"] = "1"

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aux_functions import (load_xyz_file, identify_slabs, split_pointcloud_to_storeys,
                           identify_walls)

XYZ = sys.argv[1]
ABS_MIN = float(sys.argv[2])
ABS_MAX = float(sys.argv[3])
ITH = int(os.environ.get("ITH", "1"))

pts, rgb = load_xyz_file(XYZ, plot_xyz=False, select_ith_lines=(ITH > 1), ith_lines=ITH)
pts = np.round(pts, 3)
pts = pts - np.array([pts[:, 0].min(), pts[:, 1].min(), 0.0])

slabs, _ = identify_slabs(pts, rgb, 0.3, 0.4, z_step=0.15, pc_resolution=0.002,
                          plot_segmented_plane=False)
storeys = split_pointcloud_to_storeys(pts, slabs)
pc = storeys[0]
z_floor = slabs[0]["slab_bottom_z_coord"]
z_ceiling = slabs[1]["slab_bottom_z_coord"]
print(f"points={len(pc):,} z_floor={z_floor:.2f} z_ceiling={z_ceiling:.2f}")

identify_walls(pc, 0.002, 0.1, 0.05, 0.75, z_floor, z_ceiling,
               grid_coefficient=5, slab_polygon=slabs[1]["polygon"],
               exterior_scan=False, exterior_walls_thickness=0.3,
               wall_band_low=0.30, wall_band_high=0.70, wall_band_z=(ABS_MIN, ABS_MAX),
               mask_erode=3)
