#!/usr/bin/env bash
# Build (venv + deps) if needed, then start the Cloud2BIM web server.
# Usage: ./run_server.sh [extra uvicorn args]
# Env:   HOST (default 0.0.0.0), PORT (default 8001), PYTHON (default python3)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

VENV="$ROOT/.venv"
STAMP="$VENV/.deps.stamp"
PYTHON="${PYTHON:-python3}"

if [ -f "requirements.txt" ]; then
    REQS=(requirements.txt)
else
    REQS=(requirements-docker.txt)
fi

if [ ! -d "$VENV" ]; then
    echo "[run] Creating virtualenv..."
    "$PYTHON" -m venv "$VENV"
    rm -f "$STAMP"
fi

# Rebuild deps when the stamp is missing or older than any requirements file
need_install=0
[ -f "$STAMP" ] || need_install=1
for f in "${REQS[@]}"; do
    if [ ! -f "$f" ]; then
        echo "[run] Missing $f" >&2
        exit 1
    fi
    if [ ! -f "$STAMP" ] || [ "$f" -nt "$STAMP" ]; then
        need_install=1
    fi
done

if [ "$need_install" -eq 1 ]; then
    echo "[run] Installing dependencies (${REQS[*]})..."
    "$VENV/bin/python" -m pip install --upgrade pip
    "$VENV/bin/python" -m pip install -r "${REQS[0]}" ${REQS[1]:+"-r"} ${REQS[1]:+"${REQS[1]}"}
    touch "$STAMP"
else
    echo "[run] Dependencies up to date."
fi

if ! "$VENV/bin/python" -c "import uvicorn, fastapi" 2>/dev/null; then
    echo "[run] uvicorn/fastapi missing, reinstalling web deps..."
    if [ -f requirements-web.txt ] && [ "${#REQS[@]}" -gt 1 ]; then
        "$VENV/bin/python" -m pip install -r requirements-web.txt
    else
        "$VENV/bin/python" -m pip install -r requirements-docker.txt
    fi
    touch "$STAMP"
fi

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8001}"

echo "[run] Starting server on http://localhost:$PORT"
exec "$VENV/bin/uvicorn" web.main:app --host "$HOST" --port "$PORT" "$@"
