# KAGE // CRIMSON ECLIPSE — 2D Sakuga Fight Animation

A **24-second, 1920×1080 @ 24 fps (576 frames)** original 2D anime fighting short rendered procedurally with Skia (`@napi-rs/canvas`) and paired with a frame-synced 48 kHz stereo battle score & foley track synthesized in NumPy.

## Deliverables

- **Final Video (H.264 + AAC 192k stereo):** `fight-animation/final/kage_crimson_eclipse.mp4`
- **3×3 Keyframe Contact Sheet:** `fight-animation/preview_contact_sheet.png`
- **High-Res Keyframe Stills:** `fight-animation/stills/01_*.png` → `09_*.png`

## Visual Style & Sakuga Techniques

- **Spider-Verse × Sumi-e Neo-Noir Aesthetic:** Diagonal Ben-Day halftone print matrices, 2s animated film grain, wet mirror floor reflections, and atmospheric Blood Eclipse lighting.
- **2.39:1 Cinema Letterbox Frame-Break:** Peak sword arcs, shockwaves, lightning, Voronoi shards, and calligraphic kanji burst physically over the black cinema bars.
- **Multi-Frame Sakuga Impact Frames:** Stark alternating monochrome, crimson-obsidian, electric-cyan negative frames, and a hand-brushed calligraphic kanji **`斬` (SLASH)** impact flash.
- **Chromatic Aberration (RGB Split):** Dynamic per-pixel R/B channel offset on impacts, Overdrive, and the Ultimate Severance.
- **Articulated 2D Fighters:** Sculpted cel-shaded silhouettes with 2-bone IK limbs, flowing physics-driven scarf & tattered crimson cloak, conical Ronin Kasa hat (`KAGE`) vs. wide Shogun Kabuto horns & layered Sode armor (`ONI-ZERO`).

## Six-Act Fight Choreography

| Act | Time | Sequence |
|---|---|---|
| **I. Standoff & Eye Cut-In** | `0.0s – 3.5s` | Rain-drenched Neo-Edo Torii bridge under the Blood Eclipse, razor-sliced title card, diagonal split-screen anime eye cut-in |
| **II. Iaijutsu Dash & Clash** | `3.5s – 7.5s` | Anticipation crouch, ink-burst launch, ghost-afterimage dash, 4-frame Sakuga Impact Clash, frame-breaking blade lock & lightning |
| **III. Aerial 7-Slash Flurry** | `7.5s – 12.5s` | Ground-shattering crimson cleave, airborne bridge debris, 7-slash supersonic crescent barrage with cyan ghosts, brutal counter-kick |
| **IV. Crimson Eclipse Overdrive** | `12.5s – 16.5s` | Dutch-angled palette surge, scarlet lightning pillars, colossal crescent blood-wave slash |
| **V. Zero-Point Severance** | `16.5s – 21.0s` | Bullet-time silence + katana hilt close-up with suspended raindrops → blinding flash-step bisection & **`斬`** impact shatter |
| **VI. Sheathe & Finale** | `21.0s – 24.0s` | Calm katana sheathe glint (`*click*`), delayed crimson shockwave shattering behind Kage as Oni-Zero drops to one knee |

## Re-render

```bash
bash fight-animation/build.sh
```
