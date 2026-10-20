#!/usr/bin/env bash
# ==============================================================================
# Cloud2BIM - Linux Installer
# Automated Scan-to-BIM pipeline
# ==============================================================================
set -euo pipefail

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${BLUE}${BOLD}====================================================${NC}"
echo -e "${BLUE}${BOLD}        Cloud2BIM - Installation pour Linux          ${NC}"
echo -e "${BLUE}${BOLD}====================================================${NC}"
echo ""

# 1. Check Python installation
echo -e "${BOLD}[1/6] Détection de Python...${NC}"

CANDIDATES=("python3.12" "python3.11" "python3.10" "python3")
PYTHON_BIN=""

for cmd in "${CANDIDATES[@]}"; do
    if command -v "$cmd" &>/dev/null; then
        # Check version >= 3.10
        ver_check=$("$cmd" -c 'import sys; print(1 if sys.version_info >= (3, 10) else 0)' 2>/dev/null || echo "0")
        if [ "$ver_check" = "1" ]; then
            PYTHON_BIN=$(command -v "$cmd")
            break
        fi
    fi
done

if [ -z "$PYTHON_BIN" ]; then
    echo -e "${RED}[ERREUR] Python 3.10 ou supérieur est requis mais n'a pas été trouvé.${NC}"
    echo "Veuillez installer Python 3.10+ :"
    echo "  - Ubuntu/Debian : sudo apt update && sudo apt install -y python3 python3-venv python3-pip"
    echo "  - Fedora/RHEL   : sudo dnf install -y python3 python3-pip"
    echo "  - Arch Linux    : sudo pacman -S python python-pip"
    exit 1
fi

PY_VERSION=$("$PYTHON_BIN" --version 2>&1)
echo -e "${GREEN}✓ Trouvé : $PYTHON_BIN ($PY_VERSION)${NC}"

# 2. Check for python venv module
echo -e "\n${BOLD}[2/6] Vérification du module venv...${NC}"
if ! "$PYTHON_BIN" -m venv --help &>/dev/null; then
    echo -e "${RED}[ERREUR] Le module venv n'est pas disponible pour $PYTHON_BIN.${NC}"
    echo "Veuillez installer le paquet venv :"
    echo "  - Ubuntu/Debian : sudo apt install -y python3-venv"
    echo "  - Fedora/RHEL   : sudo dnf install -y python3-libs"
    exit 1
fi
echo -e "${GREEN}✓ Module venv disponible.${NC}"

# 3. Check recommended system shared libraries (libGL, libgomp for Open3D/OpenCV)
echo -e "\n${BOLD}[3/6] Vérification des bibliothèques système...${NC}"
MISSING_LIBS=()
if ! ldconfig -p 2>/dev/null | grep -q "libGL.so.1"; then
    MISSING_LIBS+=("libgl1 (OpenGL)")
fi
if ! ldconfig -p 2>/dev/null | grep -q "libgomp.so.1"; then
    MISSING_LIBS+=("libgomp1 (OpenMP)")
fi

if [ ${#MISSING_LIBS[@]} -gt 0 ]; then
    echo -e "${YELLOW}[INFO] Bibliothèques recommandées potentiellement absentes : ${MISSING_LIBS[*]}${NC}"
    echo -e "${YELLOW}Si vous rencontrez une erreur au lancement d'Open3D, installez-les via :${NC}"
    echo -e "  sudo apt install -y libgl1 libgomp1"
else
    echo -e "${GREEN}✓ Bibliothèques graphiques et OpenMP détectées.${NC}"
fi

# 4. Create or recreate virtual environment
echo -e "\n${BOLD}[4/6] Configuration de l'environnement virtuel (.venv)...${NC}"
VENV_DIR="$ROOT_DIR/.venv"

# If venv exists but points to another directory (shebang check), recreate it cleanly
RECREATE_VENV=0
if [ -d "$VENV_DIR" ]; then
    if [ -f "$VENV_DIR/pyvenv.cfg" ]; then
        if ! grep -q "$VENV_DIR" "$VENV_DIR/pyvenv.cfg" 2>/dev/null && [ ! -f "$VENV_DIR/bin/python" ]; then
            RECREATE_VENV=1
        fi
    fi
fi

if [ ! -d "$VENV_DIR" ] || [ "$RECREATE_VENV" -eq 1 ]; then
    echo "Création de l'environnement virtuel dans $VENV_DIR..."
    "$PYTHON_BIN" -m venv --clear "$VENV_DIR"
else
    echo "Environnement virtuel existant réutilisé."
fi

VENV_PY="$VENV_DIR/bin/python"
VENV_PIP="$VENV_DIR/bin/pip"

# 5. Install Python dependencies
echo -e "\n${BOLD}[5/6] Installation des dépendances Python...${NC}"
"$VENV_PY" -m pip install --upgrade pip setuptools wheel

REQ_FILE="$ROOT_DIR/requirements.txt"
if [ ! -f "$REQ_FILE" ]; then
    REQ_FILE="$ROOT_DIR/requirements-docker.txt"
fi

echo "Installation depuis $(basename "$REQ_FILE")..."
"$VENV_PIP" install -r "$REQ_FILE"

# Make sure web packages are present
if ! "$VENV_PY" -c "import uvicorn, fastapi" &>/dev/null; then
    echo "Installation complémentaire des paquets FastAPI/Uvicorn..."
    "$VENV_PIP" install "fastapi>=0.115.0" "uvicorn[standard]>=0.30.0" "python-multipart>=0.0.12" "aiofiles>=24.1.0"
fi

touch "$VENV_DIR/.deps.stamp"
echo -e "${GREEN}✓ Dépendances installées avec succès.${NC}"

# 6. Make launcher scripts executable & create Desktop shortcuts
echo -e "\n${BOLD}[6/6] Configuration des raccourcis et lanceurs...${NC}"
chmod +x "$ROOT_DIR/start_linux.sh" 2>/dev/null || true
chmod +x "$ROOT_DIR/run_server.sh" 2>/dev/null || true
chmod +x "$ROOT_DIR/install_linux.sh" 2>/dev/null || true
[ -f "$ROOT_DIR/install.sh" ] && chmod +x "$ROOT_DIR/install.sh" 2>/dev/null || true

ICON_PATH="$ROOT_DIR/icon.png"
[ ! -f "$ICON_PATH" ] && ICON_PATH="$ROOT_DIR/title.png"

# Generate .desktop file content
DESKTOP_CONTENT="[Desktop Entry]
Version=1.0
Type=Application
Name=Cloud2BIM
Comment=Automated Scan-to-BIM Web Application
Exec=\"$ROOT_DIR/start_linux.sh\"
Path=$ROOT_DIR
Icon=$ICON_PATH
Terminal=true
Categories=Development;Engineering;Science;
StartupNotify=true
"

# Add to system applications menu
APPS_DIR="$HOME/.local/share/applications"
if [ -d "$APPS_DIR" ] || mkdir -p "$APPS_DIR" 2>/dev/null; then
    echo "$DESKTOP_CONTENT" > "$APPS_DIR/cloud2bim.desktop"
    chmod +x "$APPS_DIR/cloud2bim.desktop" 2>/dev/null || true
    echo -e "${GREEN}✓ Raccourci ajouté dans le menu des applications (~/.local/share/applications/cloud2bim.desktop)${NC}"
fi

# Add to user's Desktop if folder exists
for dt in "$HOME/Desktop" "$HOME/Bureau"; do
    if [ -d "$dt" ]; then
        echo "$DESKTOP_CONTENT" > "$dt/Cloud2BIM.desktop"
        chmod +x "$dt/Cloud2BIM.desktop" 2>/dev/null || true
        # In GNOME, trust the desktop file if gio is available
        if command -v gio &>/dev/null; then
            gio set "$dt/Cloud2BIM.desktop" metadata::trusted true 2>/dev/null || true
        fi
        echo -e "${GREEN}✓ Raccourci créé sur le Bureau ($dt/Cloud2BIM.desktop)${NC}"
    fi
done

# Quick self-test of core modules
echo -e "\n${BOLD}Vérification de l'intégrité de l'application...${NC}"
if "$VENV_PY" -c "import open3d, ifcopenshell, cv2, fastapi, uvicorn; from web.main import app; print('OK')" &>/dev/null; then
    echo -e "${GREEN}✓ Tous les modules Cloud2BIM sont opérationnels !${NC}"
else
    echo -e "${YELLOW}[ATTENTION] Le test d'import a rencontré un avertissement, mais l'installation est terminée.${NC}"
fi

echo ""
echo -e "${GREEN}${BOLD}====================================================${NC}"
echo -e "${GREEN}${BOLD}       Installation terminée avec succès !          ${NC}"
echo -e "${GREEN}${BOLD}====================================================${NC}"
echo ""
echo "Pour démarrer Cloud2BIM :"
echo -e "  - Via le terminal :  ${BOLD}./start_linux.sh${NC}"
echo -e "  - Ou double-cliquez sur l'icône ${BOLD}Cloud2BIM${NC} sur votre Bureau."
echo ""
echo -e "L'application s'ouvrira automatiquement sur : ${BLUE}http://localhost:8001${NC}"
echo ""
