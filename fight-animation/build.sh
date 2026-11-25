#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PYTHON_BIN="${PYTHON_BIN:-/tmp/animvenv/bin/python}"
FFMPEG_BIN="${FFMPEG:-$($PYTHON_BIN -c 'import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())')}"
AUDIO_WAV="/tmp/kage_audio.wav"
OUT_MP4="fight-animation/final/kage_crimson_eclipse.mp4"

echo "1/2 Synthesizing 48 kHz stereo battle soundtrack & foley..."
"$PYTHON_BIN" fight-animation/synth_audio.py "$AUDIO_WAV"

echo "2/2 Compositing 528 frames (1920x1080 @ 24fps Studio Sakuga Cut)..."
FFMPEG="$FFMPEG_BIN" node fight-animation/render_sakuga.mjs "$OUT_MP4" "$AUDIO_WAV"

rm -f "$AUDIO_WAV"
echo "Build complete -> $OUT_MP4"
