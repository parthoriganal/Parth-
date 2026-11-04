# VEILBREAK — storyboard & shot list

Total running time **96.0 s**, five acts, one continuous camera move.
Story time is the single variable that drives the picture; every number below is
the authored key in `assets/core/timeline.js`.

---

## Palette & light

| | cold universe (acts I–III) | ember universe (acts IV–V) |
|---|---|---|
| sky deep | `#04060e` | `#090407` |
| sky mid | `#0a2436` teal | `#36100f` maroon |
| sky accent | `#1f97ad` | `#c2471c` |
| starlight | `#bfe2ff` | `#ffd2a0` |
| stone | `#3d5468` | `#6a3a30` |
| stone shadow | `#0a141f` | `#150607` |
| key light | `#ffe2b8` warm, from upper-left | `#ffb070` warm, from the twin suns |
| rim | `#74e6ff` cyan | `#ff7a3a` ember |
| haze | `#14384e` | `#3d1712` |
| grade | shadows cool, highlights clean | shadows warm, highlights gold |

Key light direction: cold `(-0.38, 0.74, 0.56)`, ember `(0.52, 0.44, 0.73)`.
The two are cross-faded by `uAlt` inside the shader, so the whole set re-lights
during the flash.

---

## I. THE LONG DARK — 0 → 15.5 s

> *Before the door, there was only distance.*

A painted void, and one rumour of a shape 238 units out, half-swallowed by haze.
Dust drifts on three independent sine paths. Stars twinkle at two depths.

| t | camera position | look-at | fov | note |
|---|---|---|---|---|
| 0 | `0, 6, 238` | `0, -2, 0` | 44° | fades up from black over 2.6 s |
| 7 | `-9, 10, 198` | `0, -1, 0` | 44° | slow left drift, 0.9° of Dutch |
| 14 | `-18, 16, 140` | `0, 0, 0` | 43° | the structure begins to resolve |

Fade-in `smoothstep(0 → 2.6)`. No cut. Peak speed 5.7 u/s.

---

## II. THE ARCHIVE — 15.5 → 34 s

> *A structure older than the sky it hangs in.*

The crane. Up, right, over and down: the shot goes from a distant silhouette to a
three-quarter view of a 60-unit ring of standing stones, tilted 9° off the lens,
with armillary rims turning at four different rates and slabs adrift outside it.
The structure "wakes" between 16 and 24.5 s (`uStructure` 0 → 1): glyph bands
light, the engraved ring starts to run.

| t | camera position | look-at | fov | note |
|---|---|---|---|---|
| 18 | `-8, 27, 106` | `0, 3, 0` | 42° | low, looking up through the ring |
| 23 | `26, 41, 88` | `0, 3, 0` | 38° | **the reveal: whole ring in frame** |
| 28 | `52, 24, 64` | `0, 0, 0` | 38° | profile, maximum parallax |
| 32 | `46, 11, 53` | `0, 1, 0` | 39° | settling toward the aperture |

---

## III. THE DOOR — 34 → 54 s

> *Something on the far side has begun to answer.*

The aperture ignites at 35 s and keeps building. A vortex winds up inside the
frame; three shockwaves leave the centre on a 2.9 s cycle; matter spirals in
along the aperture plane. The lens *opens* as the camera closes — the classic
push-and-widen that makes an approach feel inevitable rather than merely near.

| t | camera position | look-at | fov | note |
|---|---|---|---|---|
| 38 | `30, 4, 50` | `0, 0, 0` | 42° | first light in the aperture |
| 44 | `6, 3, 46` | `0, 0, 0` | 46° | head-on; the frame is a circle |
| 49 | `-20, 5, 42` | `0, 0, 0` | 50° | orbit continues left |
| 54 | `-26, 4, 34` | `0, 0, 0` | 55° | the surge begins |

---

## IV. INVERSION — 54 → 72 s

> *Every law, rewritten in a single step.*

Fov 55° → 96° in eight seconds while the camera travels from 34 units to the
threshold. Shockwaves accelerate, chromatic aberration climbs, the composite
bends the whole frame toward the aperture. At **62.35 s** the camera passes
through the plane. A white flash of ±0.42 s covers the universe swap: the cold
set is hidden, the ember set appears, the ring becomes its own ruin, the suns
come up. The camera does not cut — it keeps moving, out the other side, and
turns to look back at what it came through.

| t | camera position | look-at | fov | note |
|---|---|---|---|---|
| 58 | `-16, 2, 22` | `0, 0, 0` | 63° | waves fill the frame |
| 61 | `-6, 1, 12` | `0, 0, 0` | 76° | 12 units out |
| **62.35** | `0, 0, 2` | `0, 0, -1` | **96°** | **the crossing — flash peaks 62.51** |
| 64.5 | `0, 3, -22` | `0, 1, 0` | 72° | arrival, looking back at the ruin |
| 68 | `-12, 9, -38` | `0, 3, 0` | 60° | pulling out |

---

## V. EMBER WORLD — 72 → 96 s

> *And on the far side — someone was already watching.*

The wide reveal: the shattered ring (four great arcs of the outer rim, three of
the middle, three of the aperture, rubble still clinging to the fractures), twin
suns rising behind it, six ruined spires on the horizon, shards adrift, and — in
the lower-left third — the watcher: a hooded silhouette with a staff, standing on
a drifting shard of the old world, rim-lit ember against the burning sky. The
camera cranes back and up the whole time; the frame fills with the ruin.

| t | camera position | look-at | fov | note |
|---|---|---|---|---|
| 74 | `-28, 17, -58` | `-2, 6, 2` | 50° | the ruin, close |
| 82 | `-42, 25, -78` | `2, 10, 4` | 42° | the watcher enters frame-left |
| 90 | `-48, 30, -90` | `4, 12, 6` | 36° | **final composition** |
| 96 | `-52, 33, -96` | `4, 12, 6` | 36° | holds; fades to black 93.2 → 95.9 |

Final frame, in numbers (16:9, verified by `test/timeline.mjs`):

```
shattered ring   centre   x +0.01  y −0.38   spans x −0.37 … +0.51, cropped low
sun A            x +0.27  y +0.57            upper right
sun B            x +0.48  y +0.36            inside the broken ring
watcher  head    x −0.56  y −0.29
watcher  feet    x −0.55  y −0.81            figure is 0.52 of frame height
```

The title card fades in from 88 s while the camera is still settling, holds over
the final image, and the film fades to black at 95.9 s before looping.

---

## Transition grammar

Only two transitions exist in the film, and both are earned:

1. **The wake** (16 → 24.5 s) — not a cut, a lighting change. The Archive's
   glyphs and rim lights come up while the camera is already moving.
2. **The flash** (62.35 s ± 0.4 s) — the only place the set changes under the
   camera. It is a real event in the world (the aperture discharging), it is
   triggered by the crossing, and it is brief enough to read as a hit rather
   than as a cover-up.

Everything else is one continuous move: 96 seconds, 20 authored camera keys,
zero cuts.
