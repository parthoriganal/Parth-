#!/usr/bin/env bash
# Render Singularity Bloom with Blender-as-a-Python-module.
#
# The sandbox has no X server and no X11 client libs, so we shim the four
# libraries Blender's binary links against but never actually calls when it
# runs headless (Xrender / Xfixes / Xi / xkbcommon) — see setup_bpy_headless.sh.
set -euo pipefail
cd "$(dirname "$0")"

VENV="../.venv"
STUBS="$VENV/xstubs"
if [ ! -x "$VENV/bin/python" ]; then
  echo "no venv — run ./setup_bpy_headless.sh first" >&2
  exit 1
fi
if [ ! -f "$STUBS/libstub.so" ]; then
  echo "no X shims — run ./setup_bpy_headless.sh first" >&2
  exit 1
fi

export LD_LIBRARY_PATH="$PWD/$STUBS:${LD_LIBRARY_PATH:-}"
export LD_PRELOAD="$PWD/$STUBS/libstub.so"
exec "$VENV/bin/python" build_scene.py "$@"
