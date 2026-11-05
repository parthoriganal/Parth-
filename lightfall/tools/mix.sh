#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
FFMPEG="${FFMPEG:-ffmpeg}"
python3 tools/score.py
"$FFMPEG" -y -i audio/01-hook.mp3 -i audio/02-disk.mp3 -i audio/03-lensing.mp3 -i audio/04-shadow.mp3 -i audio/05-ending.mp3 -i audio/underscore.wav -filter_complex '[0:a]atempo=0.9,adelay=0|0[v0];[1:a]atempo=0.9,adelay=12000|12000[v1];[2:a]atempo=0.9,adelay=27000|27000[v2];[3:a]atempo=0.9,adelay=41000|41000[v3];[4:a]atempo=0.9,adelay=57000|57000[v4];[v0][v1][v2][v3][v4]amix=inputs=5:normalize=0,acompressor=threshold=0.18:ratio=2:attack=15:release=180,volume=1.35[vo];[5:a]volume=0.7[music];[vo][music]amix=inputs=2:normalize=0,alimiter=limit=0.89,apad,atrim=duration=74[out]' -map '[out]' -c:a aac -b:a 160k -ar 48000 audio/master.m4a
"$FFMPEG" -y -i audio/master.m4a -c:a libmp3lame -b:a 160k audio/master.mp3
