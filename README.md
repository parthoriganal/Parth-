# AUREUM — an ident made entirely of code

**36 seconds · 864 frames · 52 shots · 24 fps · 2.39:1**

No footage. No images. No textures. No AI video. Every pixel in this film is computed
at runtime from geometry, light and shaders — then it can be rendered to a real MP4 on
GitHub Actions.

```
open ?render=1   →  deterministic frame server for the MP4 encoder
```

---

## What it is

A five-movement title sequence in the register of a broadcast ident: a technical,
restrained, brass-and-bone design system in front of a metallic 3D field, composited
through a full film chain (GTAO-era occlusion is replaced by bloom + halation + gate
weave, aberration, grain, vignette and a hard 2.39:1 mask).

It runs **live in the browser at 60 fps** and it **exports to H.264**, from the same
source, because the whole film is a pure function of the frame index:

```js
t = frame / 24        // no delta-time, no Math.random(), no accumulation
```

Render frame 517 alone, or in sequence — identical pixels. That determinism is the
only reason a browser can be used as a film renderer.

---

## The edit

| # | Movement | Time | Shots | Function |
|---|---|---|---|---|
| I | **OVERTURE** | 0–6 s | 6 | darkness, one pulse, a hairline opens, the wordmark rises |
| II | **GRID** | 6–14 s | 12 | technical build: rulers, readouts, barcodes, crosshairs |
| III | **SLAM** | 14–22 s | 16 | kinetic type — one cut every ~12 frames, inversions, slice reveals |
| IV | **FIELD** | 22–32 s | 14 | the 3D field erupts: cloud → tunnel → burst → vortex → collapse |
| V | **LOCKUP** | 32–36 s | 4 | drain, ring, wordmark, end card, grain decay |

Cut density peaks at **~4 cuts per second** in the SLAM and FIELD movements.
The score is sequenced to the same 120 BPM grid the edit is cut on.

---

## The seventeen graphic systems

Every shot is one of these, drawn on a 1920×1080 canvas with one grid, one palette
(`#06070a` ink, `#f4efe6` bone, `#c2a15c` brass, `#e0492c` ember, `#6e7a85` steel)
and manual letter-spacing — no webfonts, no image assets.

`void` · `rules` · `wordmark` · `counter` · `grid` · `hud` · `bars` · `metric` ·
`flash` · `typeSlam` · `typeSlice` · `typeStack` · `invert` · `glitch` · `field` ·
`lockup` · `endcard`

Typographic layer is composited **after** tone mapping, in display space — the way a
finishing artist builds type over a graded plate. That is why the bone white stays
pure white and the small caps stay sharp instead of being crushed by ACES.

---

## The physical layer

- **320 machined slabs** — instanced boxes, metalness 1.0, lit only by an HDRI
- **160 hairline rings** — instanced tori, 3 radial segments
- **16,000 motes** — positions solved per-vertex in the shader, additive
- **one light core** — pushed above 1.0 so it is the only thing that blooms
- **HDRI environment** — generated at runtime from `RoomEnvironment`, no `.hdr` file
- **7 formations** — cloud, grid, tunnel, burst, vortex, collapse, ring

Draw calls for the entire field: **3**.

---

## The film chain

```
scene → HDR half-float → bloom (mip-mapped) → ACES filmic + sRGB
      → aberration + halation + glitch bands + gate weave
      → typography → grain → vignette → 2.39:1 letterbox
```

- Tone mapping happens exactly **once**, at the output pass.
- Bloom threshold at 0.86 with a deliberately HDR core.
- Grain is luminance-weighted (heaviest in the shadows) and keyed to the frame index.
- Letterbox is a projector gate with a hairline, not a CSS crop.

---

## Run it

```bash
npm install
npm run dev            # → http://localhost:5173
npm run build          # → dist/
npm run verify         # 864 frames through a mock canvas, no GPU needed
```

### Controls

| Key | Action |
|---|---|
| `Space` | play / pause |
| `←` `→` | step one frame |
| `R` | restart |
| `S` | procedural score on/off (synthesised live, no audio file) |
| `H` | hide interface |
| scrub | drag the timeline — the film is stateless, so scrubbing is instant |

The interface auto-hides; move the mouse to bring it back.

---

## Get the MP4 — two ways

### 1. In your browser (fastest)

Click **EXPORT MP4** in the transport bar. The page paints all 864 frames at
1920×1080, encodes H.264 with WebCodecs and muxes it with `mp4-muxer` — then hands
you `aureum_1920x1080.mp4`. Nothing is uploaded; the file never leaves your machine.
Takes about a minute on a laptop, and needs Chrome or Edge.

### 2. On GitHub Actions (no browser needed)

`Actions → Render MP4 → Run workflow` — see below.

## Render a real MP4

The browser is used as a rasteriser only: seek to frame *N*, paint, screenshot.
Then `ffmpeg` encodes.

```bash
npm run build
npx playwright install chromium

node scripts/render.mjs                  # 1920×1080 master → out/aureum_1920x1080.mp4
node scripts/render.mjs --scale 0.5      # 960×540 draft
node scripts/render.mjs --from 300 --to 420
node scripts/render.mjs --still 512      # one frame as PNG
```

### Or let GitHub do it — Actions is the render farm

`Actions → Render MP4 → Run workflow`.

It installs headless Chromium (software WebGL), builds, paints all 864 frames,
encodes H.264 at CRF 17, uploads the artifact and publishes a Release with the MP4
attached. Roughly 10–25 minutes on a standard runner, comfortably inside the 6-hour
job cap. No GPU required.

`Actions → Deploy to GitHub Pages` publishes the live version on every push to `main`.

---

## File map

```
src/timeline.js    the edit — 52 shots, cameras, grade, the state function
src/scene3d.js     320 slabs, 160 rings, 16k motes, 7 formations, HDRI
src/overlay.js     17 graphic systems on a 1920×1080 canvas
src/shaders.js     background haze, particle field, film gate
src/audio.js       synthesised score on the 120 BPM cut grid
src/export.js      WebCodecs + mp4-muxer → MP4 in the browser
src/main.js        renderer, post chain, transport, capture API
scripts/render.mjs Playwright frame server → ffmpeg
```

---

## Honest notes

- **No GPU in CI.** Software WebGL renders ~1–3 frames per second at 1080p. That is
  fine for 864 frames; it is not fine for a 10-minute film.
- **No audio file ships.** The score is synthesised in the browser on demand, so the
  MP4 is silent by design. Add a `-i score.wav` to the ffmpeg call to mux one.
- **Fonts are system fonts.** Times and Helvetica are chosen so nothing needs
  downloading — the price is that typography varies slightly per OS.
- **This is not photoreal.** It is title design and motion graphics, which is what
  code is genuinely good at. Veo-class footage is a different discipline entirely.
- **Rendering requires WebGL 2.** Without hardware acceleration you get an error card,
  not a broken frame.

Built to be forked: change `SECTIONS` in `src/timeline.js` and you have cut a
different film.
