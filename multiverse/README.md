# AETHERBOUND

An original 78-second real-time sci-fi sequence, in five continuous movements.
Three.js r180 + custom GLSL + procedural geometry + Web Audio. No CDN, external
textures, models, fonts or audio files. No Marvel characters, logos or scenes.

## Run / download

Download the repository ZIP from GitHub, extract it, and serve this folder:

```sh
python3 -m http.server 8080 --bind 0.0.0.0 --directory multiverse
```

Open http://localhost:8080. ES modules require an HTTP server, not `file://`.
No npm install or build is needed for this standalone project.

## The film

| Time | Movement |
|---|---|
| 00–13 | The Quiet Between — a watcher in the cosmic deep |
| 13–29 | The Engine of Worlds — an orbital cathedral revealed |
| 29–47 | The Rift — iris blades, energy arcs, a growing vortex |
| 47–62 | The Other Side — continuous flight through the aperture |
| 62–78 | Aetherbound — a wide reveal of floating islands and a ringed giant |

The renderer combines banded painterly surface shading, inverted-hull outlines,
procedural nebulae, shader particles, additive light shafts, two-scale HDR bloom,
ACES, split-tone grading, grain and localized portal refraction. Light shafts
are translucent approximations, not ray-marched volumetrics.

## Controls

Play button starts playback and unlocks the procedural ambient score.
Space: pause/resume; R: restart; M: mute; F: fullscreen; 1–5: jump to a movement.
The seek bar supports dragging, arrow keys, Shift+arrow, Home and End.
Playback pauses in hidden tabs. Mobile uses a capped pixel ratio and no MSAA.
WebGL2 / hardware acceleration is required; unsupported devices see a fallback.
Full-screen permission depends on the embedding host/browser.

Query parameters: `?t=40` opens paused at 40 seconds; `?autoplay` starts without
a click (audio can remain blocked until a user gesture).

## Google Sites

Host the **whole multiverse folder**, retaining its subfolders, on an HTTPS
static host such as GitHub Pages. In Google Sites choose **Insert → Embed → By
URL**, then paste the hosted `/multiverse/` URL. Use a wide embed, preferably
16:10 or 16:9, at least 600px high. Sound requires clicking Play inside the embed.
A source-code GitHub URL is not an embeddable webpage. The repository Pages
workflow includes this folder on its next deployment from main.

## Checks

```sh
node multiverse/test/timeline.mjs
```

Browser validation performed in Chromium with software WebGL: five desktop
frames, a 390×844 mobile viewport, play, pause, seek to the Rift, and restart.
No JavaScript or shader errors were observed. Software-rendered browser checks
are not a guarantee of frame rate on every mobile GPU.

Source map: `src/film` is direction and score; `src/world` is scene geometry;
`src/core` is shaders and postprocessing; `src/ui` is the interface.
Three.js is locally vendored under its MIT license in `vendor/THREE-LICENSE.txt`.
