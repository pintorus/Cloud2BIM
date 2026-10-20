#!/usr/bin/env bash
# Wrapper calling install_linux.sh
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$ROOT_DIR/install_linux.sh" "$@"
