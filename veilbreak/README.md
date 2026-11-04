# VEILBREAK — a cinematic multiverse sequence

**An original five-act sci-fi short, rendered live in the browser with three.js.**

A painted nebula. A colossal ring suspended in the dark. A door that opens in it.
A universe on fire on the other side. A lone watcher who was already there.

96 seconds. One continuous camera. No textures, no models, no image files, no
build step, no CDN, no third-party render pipeline — every surface, every
particle, every light and the entire grade is procedural geometry and GLSL.

```
veilbreak/
├── index.html                  the frame, the chrome, the fallback
├── assets/
│   ├── style.css               hairline typography, anamorphic bars
│   ├── main.js                 boot, playback, camera, adaptive resolution
│   ├── core/
│   │   ├── timeline.js         five acts · camera keys · light & grade beats
│   │   ├── staging.js          world positions of every subject
│   │   ├── shaders.js          the look — 12 shader pairs, all GLSL ES 1.00
│   │   ├── world.js            the set: both universes, ~36k tris, ~48 draws
│   │   └── post.js             bright → blur ×2 → film composite
│   └── vendor/
│       ├── three.module.min.js three.js r166 (MIT)
│       └── THREE-LICENSE.txt
├── docs/
│   ├── storyboard.md           shot list, timing, palette, transitions
│   └── proxy-*.png             CPU staging frames (not screenshots — see below)
└── test/
    ├── shaders.mjs             compiles every shader with glslangValidator
    ├── timeline.mjs            continuity + composition + flight-path checks
    ├── project.mjs             imports, wiring, budgets, set builds & disposes
    └── preview.mjs             CPU proxy renderer (staging only)
```

---

## Run it

Any static file server. There is nothing to install and nothing to compile.

```bash
# from the repository root
python3 -m http.server 8080 --directory veilbreak
# open http://localhost:8080/
```

or

```bash
npx serve veilbreak          # or: npm run film
```

**It must be served over HTTP, not opened as `file://`** — ES modules are blocked
by the browser's file-origin rules. Every other part of the project is happy to
run from a plain folder.

### Controls

| Input | Action |
|---|---|
| `space` / `k` / click the frame | play · pause |
| `←` `→` | seek ∓5 s |
| `1`–`5` | jump to an act |
| `r` | restart |
| `h` | hide the interface |
| `f` | fullscreen |
| drag / click the timeline | scrub |

The interface fades out after 2.6 s of stillness and comes back on any pointer
movement.

### URL parameters

| Parameter | Meaning |
|---|---|
| `?t=42` | start 42 s in |
| `?act=3` | start at act III |
| `?embed=1` | chrome-free, autoplaying, looping — the Google Sites mode |
| `?ui=0` | keep the act captions, drop the player |
| `?quality=low` | force the mobile pipeline (no wide bloom, fewer particles) |
| `?loop=0` | stop on the final card instead of looping |
| `?speed=0.75` | playback rate, 0.25–3 |

---

## Host it

The folder is completely static and has no server requirements, so anything
that serves files will do: GitHub Pages, Netlify, Vercel, S3, Cloudflare Pages,
Firebase Hosting, a plain nginx box.

### GitHub Pages (this repository is already set up)

`.github/workflows/deploy.yml` builds the Vite app and copies `veilbreak/` into
the Pages artifact verbatim. Push to `main`, and the film appears at:

```
https://<user>.github.io/<repo>/veilbreak/
```

### Embed in Google Sites

1. Host the folder over **HTTPS** (Google Sites refuses to embed plain HTTP).
2. Publish and copy the URL, adding the embed flag:
   `https://<your-host>/veilbreak/?embed=1`
3. In Google Sites: **Insert → Embed → By URL**, paste the URL, then stretch
   the block to the size you want.
4. Suggested size: **16:9** — e.g. 960 × 540, or full width at 100 % with a
   fixed height. The film re-frames itself for portrait and narrow blocks
   (the lens opens up rather than cropping the shot).

`?embed=1` hides the header and the player, autoplays, loops, and keeps only the
act captions, so the block reads as a film rather than as an app. If you would
rather keep the player, drop the flag.

### Performance

| | desktop | phone |
|---|---|---|
| pixel ratio cap | 1.5 | 1.15 |
| scene MSAA | 2× | off |
| bloom levels | 2 (soft + wide anamorphic) | 1 |
| dust / embers | 3 600 / 2 100 | 1 500 / 900 |
| shards | 142 | 62 |
| draw calls | ~48 | ~40 |
| triangles | ~36 k | ~26 k |

Nothing is allocated per frame: the world is built once, every animated value
lives in a uniform, and repeated geometry is merged on the CPU at load time and
animated in the vertex shader. If the first two seconds of frames average worse
than 26 ms, `main.js` steps the pixel ratio down before it ever drops a frame
budget, and finally disables the wide bloom pass.

---

## The film

| | act | time | what happens |
|---|---|---|---|
| **I** | *The Long Dark* | 0 – 15.5 s | A painted void. Dust, distant stars, a rumour of a shape 240 units out. The camera drifts in. |
| **II** | *The Archive* | 15.5 – 34 s | A crane up and around reveals the gate: a 60-unit ring of standing stones, armillary rims, slabs adrift. The structure wakes. |
| **III** | *The Door* | 34 – 54 s | The aperture ignites — a vortex, three shockwaves travelling outward, matter spiralling in. The lens opens as the camera closes. |
| **IV** | *Inversion* | 54 – 72 s | The surge. The camera crosses the threshold inside a white flash. The universe inverts: cold teal to ember, ring to ruin. |
| **V** | *Ember World* | 72 – 96 s | The wide reveal: a shattered ring, twin suns, ruined spires, and the watcher on a drifting shard. Title. Fade. |

Full shot list, camera keys and palette: [`docs/storyboard.md`](docs/storyboard.md).

---

## How it is made

### Direction is data

Every camera move, light level, glow, flash and grade impulse is a pure function
of one number: story time. `timeline.js` holds a shot list — position, look-at
target, vertical fov and roll — and interpolates it with **monotone cubic
Hermite splines** (Fritsch–Carlson tangent limiting). Those are C1-continuous
and mathematically cannot overshoot the authored keys, so the camera never swings
wide of the ring on a spline overshoot, and there is no velocity discontinuity
between shots: the whole 96 seconds is one continuous move. Story time is
therefore scrubbable, testable and re-timeable from node — which is exactly what
the test suite does.

### The look

Nothing here is a texture. Surfaces are lit with a quantised four-step ramp
(`smoothstep` shoulders, never hard borders), jittered by a low-frequency
value-noise "brush" layer so the bands read as paint rather than as a shader
artifact. On top of that: a two-part rim light, a cool bounce from the nebula
below, carved glyph bands that glow with the structure's power, panel seams,
and **ink outlines as geometry** — an inverted hull in the vertex shader,
expanded proportionally to view depth so the stroke keeps a constant width on
screen (~2–3 px at 1080p), faded by atmospheric haze at distance. No screen-space
derivatives anywhere, which is why the silhouette stays clean at every resolution
and the cost stays flat on a phone.

The sky is a painted dome: a twisted galactic ribbon shaped by six octaves of
value noise, dust lanes eating into it, the whole thing posterised into five
tonal steps and dithered with a second noise layer, plus two procedural star
layers with per-star colour and twinkle. It rides with the camera, so it has no
parallax and no visible edge.

The aperture is a single additive disc: a vortex whose arms wind tighter toward
the centre, three shockwaves that keep travelling outward, a hot core, and an
aperture rim. Matter spirals into it as GPU-animated points whose radius decays
and whose angle winds up along their life. As the camera closes in, the composite
pass bends the whole frame toward the lens centre and pushes chromatic aberration
up — the distortion is *in the grade*, centred on the aperture, which is why the
crossing feels like going through something rather than past it.

### The grade

Seven passes, no post-processing dependency:

```
scene (half-float, MSAA) ─► bright pass ─► blur H/V at ½ res ─────────┐
                              └─► downsample ─► blur H/V at ¼ res (wide) ─┤
                                                                          ▼
                        composite: ACES ▸ split-tone ▸ S-curve ▸ vignette
                                   ▸ sRGB ▸ flash ▸ grain ▸ fade ─► screen
```

Everything upstream stays in linear light with values above 1.0, so the aperture
genuinely blows out instead of clipping; the filmic curve and the split toning
(shadows cool and highlights warm in the cold universe, inverted in the ember
one) happen once, at the end, where they belong.

### Identity

Original throughout: the ring, the aperture, the ember world and the watcher are
invented for this piece. No Marvel characters, logos, scenes, or assets are used
or referenced; the *What If…?* influence is stylistic — cel-shaded geometry,
painted skies, ink line work, and a palette that changes sides of the spectrum
when reality does.

---

## Tests

```bash
node test/shaders.mjs     # compiles all 24 shader stages with glslangValidator
node test/timeline.mjs    # continuity, framing, flight path, universe handover
node test/project.mjs     # imports, DOM wiring, budgets, build & dispose
node test/preview.mjs     # CPU proxy frames → docs/proxy-*.png
```

`test/shaders.mjs` compiles every shader with the Khronos reference compiler
using the exact prefix three.js injects, so a typo is a test failure rather than
a black screen. It needs `glslangValidator` on `PATH` (or `GLSLANG=/path/to/bin`);
without it the suite degrades to static checks instead of failing.

`test/timeline.mjs` is the direction test: it proves the camera path is smooth
(peak 13 u/s, peak 20.6 °/s of fov), that act II actually holds the whole ring in
frame at four aspect ratios, that the aperture stays centred through act III, that
the closing shot puts the watcher's head in the lower-left third with both suns in
frame, that the camera crosses the ring **only** through its aperture and never
clips the set, and that the two universes swap inside the flash.

`test/preview.mjs` is honest about what it is: there is no GPU in CI, so it walks
the real scene graph, projects it through the real camera pose, and rasterises a
flat, cel-shaded approximation on the CPU. It is not the film — no GLSL, no bloom,
no grain — but it does prove staging: scale, silhouette, framing, overlap.
The `docs/proxy-*.png` files are its output, and they are labelled as proxies,
not screenshots.

---

## Browser support

WebGL2, ES modules, `ResizeObserver`. Anything from Chrome 90 / Safari 15 /
Firefox 90 onwards (three.js r166 itself requires WebGL2). If the context cannot
be created the page says so instead of showing a black rectangle.

`prefers-reduced-motion` is respected: the threshold flash, grain and chromatic
aberration are damped to a fraction of their cinematic values.
