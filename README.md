# Cloud2BIM

Automated Scan-to-BIM pipeline that converts 3D point clouds into IFC models.
Supports indoor building scans in **E57**, **LAS / LAZ**, and **XYZ** format.

Fork of [VaclavNezerka/Cloud2BIM](https://github.com/VaclavNezerka/Cloud2BIM) & [jacobm85/Cloud2BIM](https://github.com/jacobm85/Cloud2BIM) — extended with automated Windows/Linux installers, a web interface with 3D IFC viewer, an interactive 3D point cloud cleaner, multi-language support (EN/FR), additional format support, and pipeline optimizations.

---

## Key Features

1. **Slab detection** — scans the Z-axis histogram to locate floor and ceiling slabs.
2. **Wall segmentation** — builds a 2D occupancy map, extracts wall contours and groups parallel segments; PCA rotation handles buildings not aligned with XYZ axes.
3. **Opening detection** — classifies windows and doors from wall cross-sections.
4. **IFC export** — writes standards-compliant IFC 2x3 files with slabs, walls, openings, and spaces.
5. **Interactive 3D BIM Viewer** — view and inspect generated IFC models directly in your browser.
6. **Point Cloud Cleaner** — interactive 3D point cloud pre-processing tool (Statistical Outlier Removal, voxel downsampling, bounding box cropping).
7. **Bilingual Web Interface** — switch between English (EN) and French (FR) in one click.
8. **1-Click Installers** — seamless setup for both **Windows** and **Linux**.

---

## Installation & Quick Start

### Option 1: Windows (1-Click Installer)

**Prerequisites:**
- Windows 10 / 11 (64-bit)
- [Python 3.10+](https://www.python.org/downloads/) (make sure to check **"Add python.exe to PATH"** during installation)

**Installation:**
1. Clone or download this repository.
2. Double-click on **`install.bat`** (or right-click `install_windows.ps1` -> *Run with PowerShell*).
   - The installer verifies Python, creates the local virtual environment (`.venv`), installs all dependencies, and creates a **Cloud2BIM** shortcut on your Desktop.

**To Run:**
- Double-click the **Cloud2BIM** shortcut on your Desktop, or run **`start_windows.bat`**.
- The server starts and automatically opens your web browser at **`http://localhost:8001`**.

---

### Option 2: Linux (1-Click Installer)

**Prerequisites:**
- Python 3.10, 3.11, or 3.12 (`python3`, `python3-venv`, `python3-pip`)
- On Debian/Ubuntu:
  ```bash
  sudo apt update && sudo apt install -y python3 python3-venv python3-pip libgl1 libgomp1
  ```
- On Fedora/RHEL:
  ```bash
  sudo dnf install -y python3 python3-pip mesa-libGL libgomp
  ```
- On Arch Linux:
  ```bash
  sudo pacman -S python python-pip
  ```

**Installation:**
```bash
git clone https://github.com/pintorus/Cloud2BIM.git
cd Cloud2BIM
./install.sh
```
The installer configures the `.venv`, installs requirements, and adds a desktop shortcut to your application menu and Desktop.

**To Run:**
```bash
./start_linux.sh
```
Or launch **Cloud2BIM** directly from your desktop application launcher. It automatically opens **`http://localhost:8001`**.

---

### Option 3: Docker (Containerized)

1. Create data directories:
   ```bash
   mkdir -p /mnt/ssd250/scan2bim/{uploads,jobs,output_xyz,images,pointclouds}
   ```
2. Edit `docker-compose.yml` to match your local paths.
3. Build and run:
   ```bash
   docker compose up --build
   ```
4. Open **`http://localhost:8001`** in your browser.

---

## Web Interface

The web interface provides an intuitive 4-step wizard:

1. **Select file** — upload a point cloud (`.e57`, `.las`, `.laz`, `.xyz`) or browse a mounted network folder.
2. **Parameters** — configure slab thicknesses, wall dimensions, dilution factor, and IFC metadata.
3. **Processing** — live log stream; background task execution with automatic status updates.
4. **Result & 3D Viewer** — inspect the IFC model in the integrated 3D viewer, download the IFC file or intermediate outputs.

### Point Cloud Cleaner (`/clean`)

Before running the BIM reconstruction, you can inspect and clean raw point clouds:
- Open the **Point Cloud Cleaner** tab from the interface or visit `http://localhost:8001/clean`.
- **Statistical Outlier Removal (SOR)**: filter out airborne scan noise and isolated dust points.
- **Voxel Downsampling**: uniform spatial subsampling.
- **Bounding Box Crop**: crop out unwanted exterior areas, ground terrain, or distant objects.
- Inspect before / after point counts in real-time.

### Multi-language UI

Switch between English and French at any time using the language selector (`EN` / `FR`) in the top navigation bar.

---

## Command-Line Usage

You can also run Cloud2BIM directly in CLI mode:

```bash
# Activate your virtual environment
# On Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate.bat

# Run the pipeline with a config file
python cloud2entities.py config.yaml
```

### Key Parameters (`config.yaml`)

| Parameter | Default | Description |
|---|---|---|
| `dilute` | `true` | Enable point cloud downsampling |
| `dilution_factor` | `10` | Keep every Nth point (10 = 90% reduction) |
| `pc_resolution` | `0.002` | Expected point spacing (m) |
| `bfs_thickness` | `0.3` | Bottom floor slab thickness (m) |
| `tfs_thickness` | `0.4` | Top floor slab thickness (m) |
| `min_wall_length` | `0.10` | Minimum wall length to keep (m) |
| `max_wall_thickness` | `0.75` | Maximum wall thickness (m) |

---

## Diagnostic Scripts

Specialized diagnostic scripts are included for debugging complex geometries and tuning parameters on raw scans:

- **`diag_axes.py`** — inspect building rotation angles and principal wall orientation axes.
- **`diag_exterior.py`** — analyze interior vs exterior point distributions.
- **`diag_openings.py`** — sweep door and window detection thresholds across wall cross-sections.
- **`diag_walls.py`** — replay wall segmentation step-by-step with intermediate statistics.

Usage:
```bash
python diag_axes.py /path/to/scan.xyz <abs_min_z> <abs_max_z>
python diag_walls.py /path/to/scan.xyz <slab_idx>
```

---

## Supported Formats

| Format | Notes |
|---|---|
| `.xyz` | Tab-separated ASCII, header line `//X\tY\tZ` |
| `.e57` | Native E57 format — converted automatically |
| `.las` / `.laz` | LiDAR point clouds — converted via `laspy` + `lazrs` |

---

## Project Structure

```
Cloud2BIM/
├── install.bat             # 1-Click Windows installer entry point
├── install_windows.bat     # Windows batch installer
├── install_windows.ps1     # Windows PowerShell installer
├── start_windows.bat       # Windows launcher (starts server + opens browser)
├── run_server.bat          # Windows launcher alias
├── install.sh              # 1-Click Linux installer entry point
├── install_linux.sh        # Linux bash installer
├── start_linux.sh          # Linux launcher (starts server + opens browser)
├── run_server.sh           # Linux server script
├── requirements.txt        # Universal Python requirements (UTF-8)
├── requirements-docker.txt # Docker requirements
├── cloud2entities.py       # Main pipeline script
├── aux_functions.py        # Slab, wall, and opening detection algorithms
├── space_generator.py      # Room/space extraction (Shapely)
├── generate_ifc.py         # IFC model generator (ifcopenshell)
├── plotting_functions.py   # Visualizations and diagnostic plots
├── diag_*.py               # Diagnostic and tuning scripts
├── icon.ico / icon.png     # Application icons
└── web/
    ├── main.py             # FastAPI backend server
    ├── job_manager.py      # Background job manager
    ├── cleaning.py         # Point cloud filtering and cleaning algorithms
    ├── pointcloud.py       # Point cloud format handlers and caching
    └── static/             # Frontend UI (HTML/CSS/JS, Three.js viewer, i18n)
```

---

## License

Original research algorithms by Václav Nežerka et al., CTU in Prague.
Web interface, pipeline improvements, point cloud cleaning, multi-language UI, and installers by Jacob & Pintorus.
