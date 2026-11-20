#!/usr/bin/env bash
# Reproducible build script for KAGE // CRIMSON ECLIPSE (24s @ 24fps, 1920x1080)
# Usage: bash fight-animation/build.sh
set -euo pipefail

cd "$(dirname "$0")/.."

PY="${PY:-/tmp/animvenv/bin/python}"
if [ ! -x "$PY" ]; then
  echo "Bootstrapping Python venv (/tmp/animvenv) with imageio-ffmpeg + numpy + pillow..."
  python3 -m venv /tmp/animvenv
  /tmp/animvenv/bin/pip install -q imageio-ffmpeg numpy pillow
  PY="/tmp/animvenv/bin/python"
fi

if [ ! -d "/tmp/animnode/node_modules/@napi-rs/canvas" ]; then
  echo "Bootstrapping Skia canvas (/tmp/animnode)..."
  mkdir -p /tmp/animnode
  (cd /tmp/animnode && npm init -y >/dev/null 2>&1 && npm install --no-audit --no-fund @napi-rs/canvas)
fi

FFMPEG_BIN=$("$PY" -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())")

echo "== 1/2 Synthesizing 48 kHz stereo score & foley =="
"$PY" fight-animation/synth_audio.py /tmp/kage_audio.wav

echo "== 2/2 Rendering 576 frames (1920x1080 @ 24fps) + muxing MP4 =="
FFMPEG="$FFMPEG_BIN" node fight-animation/render_frames.mjs \
  fight-animation/final/kage_crimson_eclipse.mp4 \
  /tmp/kage_audio.wav

rm -f /tmp/kage_audio.wav
ls -lh fight-animation/final/kage_crimson_eclipse.mp4 fight-animation/preview_contact_sheet.png
