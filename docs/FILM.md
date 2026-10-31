# MAISON — A legacy in seconds

An original 22-second vertical luxury-watchmaking film inspired by the supplied motion-design references, without copying their graphics or footage.

## Deliverables

- `public/films/maison-legacy.mp4`: 720 × 1280, 9:16, 24 fps, H.264 / AAC, fast-start MP4.
- `public/films/maison-poster.png`: still from the first sequence.
- `/`: interactive real-time WebGL player with voiceover, seeking, chapter navigation, fullscreen, and MP4 download.

## Art direction

Six sequences: invitation, distinction, precision, details, lifetime, legacy. Antique gold and lacquer-black mechanical components against ivory technical grids. Manrope for impactful typography, Cormorant Garamond for classic italic accents. A procedural pocket-watch model with Roman-numeral dial, moving hands, winding crown, bevelled case, and an exploded assembly sequence. Orbiting toothed gears, metal rings, sculptural framing and restrained original sound design complete the composition.

## Open-source foundations and credits

Only relevant dependencies are used; no third-party stock models or reference footage are redistributed.

| Project | Purpose | License |
| --- | --- | --- |
| [Three.js](https://github.com/mrdoob/three.js) | WebGL renderer, geometry, materials, procedural studio environment | MIT |
| [Playwright](https://github.com/microsoft/playwright) | Deterministic, frame-by-frame browser rendering | Apache-2.0 |
| [Chromium for serverless](https://github.com/Sparticuz/chromium) | Headless Chromium runtime for exporting in Linux | MIT; Chromium has additional upstream licenses |
| [FFmpeg](https://github.com/FFmpeg/FFmpeg) | Video encoding and sound mixing, executed as an external tool | Build-dependent LGPL/GPL; the local imageio-ffmpeg binary is GPL-enabled |
| [imageio-ffmpeg](https://github.com/imageio/imageio-ffmpeg) | Provides the local FFmpeg executable used by export scripts | BSD-2-Clause wrapper; FFmpeg retains its own license |
| [Google Fonts](https://github.com/google/fonts) | Self-hosted Manrope and Cormorant Garamond | SIL Open Font License 1.1; included alongside the fonts |

All 3D models, scene arrangements, typography layouts, animation, and mechanical sound design in this project are created in code for this film. Narration is AI-generated using the voice selected in this conversation. MAISON is a fictional creative concept, not an affiliation or advertisement for an existing watch manufacturer.

## Run

```sh
npm install
npm run dev
```

Vite listens on `0.0.0.0:5173` and accepts preview hosts. Fonts and audio are hosted locally; runtime does not require font CDNs.

## Rebuild video

```sh
python -m pip install imageio-ffmpeg  # use a virtual environment if necessary
npm run film:sound
# Keep npm run dev running in another terminal, then:
npm run film:render
```

`film:render` uses the Chromium binary bundled with `@sparticuz/chromium`, renders all 528 frames at exact timestamps, and pipes them to FFmpeg. NSS libraries are unpacked into a temporary directory for Linux runners. Rendering can take several minutes on a software GPU. The MP4 is written directly into `public/films`; no frame sequence or large intermediate dataset is stored in Git.

The sound script mixes the selected narration with synthesized mechanical ticks, a quiet harmonic bed, and transition pulses. It does not download music.
