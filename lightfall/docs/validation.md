# Validation record

- Rendered all 1,776 frames at 960×540, 24 fps, for 74 seconds.
- Final MP4: H.264 video, AAC mono 48 kHz audio; fast-start container.
- Decoded the entire final MP4 through FFmpeg with `-v error`: no decode errors.
- Inspected five desktop frames spanning the five chapters, and an extracted
  frame from the final encoded MP4.
- Automated Chromium mobile test at 390×844: play with a progressing audio
  clock, pause, all five chapter seeks, mute, captions, end card, replay, no
  horizontal overflow. No HTTP, JavaScript or shader errors observed.
- MP3 browser master added after detecting a headless AAC-decoder playback
  compatibility issue. The supplied AAC master remains the MP4 audio source.
- Intro dismissal is synchronous so a slow software renderer cannot leave a
  partially faded title overlay blocking playback controls.

Tests used Chromium with software WebGL. They validate rendering and function,
not a guaranteed frame rate on every phone. The MP4 has a half-resolution ray
view, upsampled beneath full-resolution text and 3D schematic lines. The source
supports higher render scales for hardware-accelerated exports.
