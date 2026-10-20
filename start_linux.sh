#!/usr/bin/env bash
# ==============================================================================
# Cloud2BIM - Linux Launcher
# Starts the web server and automatically opens the browser.
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

VENV_DIR="$ROOT_DIR/.venv"
VENV_PY="$VENV_DIR/bin/python"
VENV_UVICORN="$VENV_DIR/bin/uvicorn"

if [ ! -d "$VENV_DIR" ] || [ ! -f "$VENV_UVICORN" ]; then
    echo "[Cloud2BIM] Environnement non configuré. Lancement de l'installateur..."
    bash "$ROOT_DIR/install_linux.sh"
fi

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8001}"
URL="http://localhost:$PORT"

echo "===================================================="
echo " Cloud2BIM - Démarrage du serveur"
echo " URL: $URL"
echo " (Appuyez sur Ctrl+C pour arrêter le serveur)"
echo "===================================================="

# Open web browser after a brief delay so the server is ready
(
    sleep 1.5
    if command -v xdg-open &>/dev/null; then
        xdg-open "$URL" &>/dev/null || true
    elif command -v gnome-open &>/dev/null; then
        gnome-open "$URL" &>/dev/null || true
    else
        "$VENV_PY" -m webbrowser "$URL" &>/dev/null || true
    fi
) &

exec "$VENV_UVICORN" web.main:app --host "$HOST" --port "$PORT" "$@"
