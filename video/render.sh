#!/usr/bin/env bash
# render.sh - rebuild the whole video from the narration clips.
#
#   ./video/render.sh
#
# Needs: python3 with pillow + an ffmpeg binary. In this sandbox neither is on PATH,
# so bootstrap a venv once:
#
#   python3 -m venv ~/.ytvid && ~/.ytvid/bin/pip install imageio-ffmpeg pillow
#   export FFMPEG=$(~/.ytvid/bin/python -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())")
#   PY=~/.ytvid/bin/python
#
# Stages, in order — each one feeds the next:
#   1. build_timeline.py  measure the mp3s, concat narration.m4a, write timeline.json
#   2. render_video.py    draw every frame with Pillow, pipe raw RGB into ffmpeg
#   3. make_transcript.py emit narration.srt for the yt-chapters / yt-edit tools
set -euo pipefail

cd "$(dirname "$0")/.."
PY="${PY:-python3}"
FF="${FFMPEG:-ffmpeg}"
export FFMPEG="$FF"

[ -x "$PY" ] || command -v "$PY" >/dev/null || { echo "no python: $PY"; exit 1; }
command -v "$FF" >/dev/null || { echo "no ffmpeg: $FF (see header)"; exit 1; }

echo "== timeline =="
"$PY" video/build_timeline.py

echo "== render =="
mkdir -p out
"$PY" video/render_video.py --timeline video/timeline.json \
    --audio video/narration.m4a --out out/video.mp4

echo "== transcript =="
"$PY" video/make_transcript.py

echo "== deliverable =="
mkdir -p video/final
cp out/video.mp4 video/final/video.mp4
ls -lh video/final/video.mp4

echo
echo "ship it, or change it?"
