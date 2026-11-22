# NEON ORBIT

An immersive, scroll-driven 3D instrument built in this repo, coloured and
typeset from **Parth Gosra's Figma team library** (`jVyB81kl0gZUrm5oc0GPIn`).

One WebGL context holds the whole experience. There is no per-section canvas and
no video: the camera flies a choreographed path through a single scene, so every
transition is continuous rather than stitched together.

```bash
npm run orbit        # → http://localhost:5200
npm run orbit:build  # → dist/orbit/  (static, ~151 kB gzip JS)
```

## The five stations

| # | Station | What happens |
|---|---|---|
| 01 | **CORE** | Stellated chrome artefact, iridescent glass shell, three orbital rings, 1 500 dust motes. Drag to spin it; click to send a pulse ring out. |
| 02 | **FIELD** | The artefact disperses into 46 shards as you scroll, then reassembles. The same meshes move — nothing is rebuilt or reloaded. |
| 03 | **LAB** | Six glass orbs, each a fresnel-shaded sphere around a point light in one of the library's six colours, unprojected to sit exactly inside its DOM cell. Hover to inspect, click to copy the hex. |
| 04 | **SIGNAL** | A ~9 000-point spring lattice on canvas, driven by three travelling waves. Drag to inject velocity; the marks decay in about four seconds. |
| 05 | **EXIT** | Pull back until the artefact is small again, then a marquee. |

## From the Figma library

Read out of the document tree — not sampled from a screenshot:

| Style | Value | Node | Where it appears |
|---|---|---|---|
| `Fuschia/100` | `#EF5DA8` | `91:0` | orb 1, hyper easter egg, shards |
| `Fuschia/80` | `#F178B6` | `91:1` | orb 2 |
| `Fuschia/60` | `#FCDDEC` | `91:2` | orb 3 |
| `Iris/100` | `#5D5FEF` | `91:3` | orb 4, primary CTA, rings |
| `Iris/80` | `#7879F1` | `91:4` | orb 5 |
| `Iris/60` | `#A5A6F6` | `91:5` | orb 6, focus rings |

Type is the library's own: **Work Sans** at the published sizes and tracking
(Header 1 34/700/−0.68, Header 2 20/700/−0.4, Body 13/400/−0.26), self-hosted
from the OFL files in `.claude/skills/anthropic/canvas-design/canvas-fonts`.
The dark world palette extends those six colours — it doesn't replace them.

## How it's built

```
neon-orbit/
├── index.html            # five stations, real copy, no placeholders
├── src/
│   ├── tokens.css        # @font-face + the Figma tokens as custom properties
│   ├── orbit.css         # editorial layout, HUD, stations, responsive, print
│   ├── world.js          # the whole 3D scene, camera path, materials, post
│   ├── wavefield.js      # station 04's spring lattice
│   └── main.js           # scroll → station, DOM↔3D registration, eggs
└── test/visual.mjs       # headless Chromium harness (dev tooling)
```

**Camera as narrative.** `CAM` in `world.js` is a list of keyframes in *station
units* (0 = CORE … 4 = EXIT), eased with smoothstep between keys. Scroll progress
maps onto that same 0–4 axis, so the camera always arrives at the moment the copy
does.

**Chrome that reads as chrome.** The environment is a procedural studio dome —
a canvas-painted equirectangular gradient with colour wedges and strip lights,
baked once through `PMREMGenerator`. No HDR files, no CDN, no paid assets.

**DOM ↔ 3D registration.** The lab orbs aren't positioned by hand. Each frame,
`placeOrbs()` takes its DOM cell's centre, converts to NDC, and unprojects to a
fixed depth in front of the camera, then scales the orb to ~36 % of the cell's
shorter side. Move the grid with CSS and the orbs follow.

## Performance

Budgeted for a 6 GB Android phone, not just a laptop:

- **One** WebGL context for the entire page.
- `tier=low` is chosen at parse time for narrow viewports, ≤ 4 cores, or
  `deviceMemory ≤ 4` (desktop browsers report no `deviceMemory`, so they are
  *not* mislabelled). Low tier: no post-processing, pixel ratio ≤ 1.35, ~4× fewer
  dust motes and shards, simpler geometry.
- Bloom exists only on the high tier and is **dropped automatically** if the
  measured frame rate stays under 34 fps for 4 s; pixel ratio then falls to 1.
- The wavefield pauses via `IntersectionObserver` when off-screen and drops from
  9 200 to 5 200 points on low tier. Points are batched into 3 fills per frame.
- The renderer pauses on `visibilitychange` — no battery burn in a background tab.
- Frame delta is clamped at 50 ms so a stall can't teleport the scene.

## Accessibility & fallbacks

- `prefers-reduced-motion` is honoured at parse time: motion starts off, the
  loader's spinners and grain stop, reveals are pre-shown, and the wavefield's
  travelling wave is damped to 28 %.
- The motion toggle in the HUD is a real control; the choice persists in
  `localStorage`. Reduced-motion users keep the ability to opt back in.
- Without WebGL, a fallback panel explains it and the DOM experience — palette,
  type, copy, marquee — still renders in full.
- The wavefield canvas is focusable and `Space` resets it; swatches are buttons
  and respond to `←`/`→`; the skip link and focus rings are visible throughout.
- Every colour swatch reports its live WCAG contrast against the ink.

## Easter eggs

- **Konami code** (`↑↑↓↓←→←→BA`) destabilises the orbit: magenta shock, camera
  spin, HUD state change, then it restabilises on its own.
- Click the hero without dragging → a pulse ring expands from the core.
- Drag the core and let go → it keeps spinning with inertia, then damps.

## Verification

`npm run test:orbit` drives the real page in headless Chromium (SwiftShader
WebGL2) and asserts boot completion, per-station screenshots, orb activation,
swatch copy + toast, wavefield energy after a drag, zero horizontal overflow,
and the reduced-motion path. Screenshots land in `neon-orbit/.shots/`.

```bash
npm run orbit &                 # server must be up
npm run test:orbit
npm run test:orbit -- mobile
```
