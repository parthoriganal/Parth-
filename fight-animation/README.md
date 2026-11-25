# KAGE // CRIMSON ECLIPSE — Studio Sakuga 2D Anime Fight Cut (v3)

A **22-second, 1920×1080 @ 24 fps** high-impact 2D anime fight short combining **9 custom illustrated anime keyframes** (`fight-animation/art/`) with live 24 fps Sakuga compositing, real per-pixel artwork-derived Jujutsu-Kaisen-style impact frames, physical diagonal screen-tear bisection, 2.39:1 cinema letterbox frame-breaks, and a custom frame-synced 48 kHz stereo battle soundtrack.

## Visual & Audio Highlights

- **9 Custom Illustrated Studio Anime Artworks (`fight-animation/art/`)**: Cohesive Ufotable × Studio Trigger × Spider-Verse aesthetic featuring **Kage** (cyber-ronin with electric-cyan scarf & lightning katana) vs **Oni-Zero** (cracked horned Oni mask, black-and-gold samurai armor, molten crimson odachi) across a rain-drenched Neo-Edo Torii bridge under a giant Blood Eclipse.
- **11-Beat Hyper-Kinetic Editing & Camera Choreography**:
  - `0.00s – 2.50s` — Blood Eclipse bridge standoff + razor-sliced title card (`KAGE // CRIMSON ECLIPSE`)
  - `2.50s – 3.70s` — Extreme close-up split-screen eye clash with live crackling lightning
  - `3.70s – 5.00s` — Supersonic iaijutsu lightning dash with speedlines & directional whip blur
  - `5.00s – 7.40s` — Dead-center explosive blade clash with **real artwork-derived B&W / Crimson / Cyan Sakuga Impact Frames** + letterbox frame-break shockwave rings
  - `7.40s – 8.10s` — Rapid anime reaction punch-in on Oni-Zero's cracked mask
  - `8.10s – 10.30s` — Colossal molten bridge-shatter cleave + shattering shards breaking over bars
  - `10.30s – 12.80s` — 7-slash supersonic aerial crescent flurry with timed parry sparks
  - `12.80s – 15.10s` — Ben-Day halftone Crimson Eclipse Overdrive with live crimson/gold lightning pillars
  - `15.10s – 16.75s` — Bullet-time silence + twin heartbeats + frozen rain crystals + katana draw glint
  - `16.75s – 17.55s` — **Physical Diagonal Screen-Tear Bisection** slicing Oni-Zero's Overdrive canvas cleanly in half + giant hand-brushed calligraphic **`斬`** (SLASH) impact flash
  - `17.55s – 22.00s` — Iconic katana sheathe `*CLICK*` + cyan hilt star-glint + delayed shatter + fade-out
- **Synced 48 kHz Stereo Soundtrack (`synth_audio.py`)**: Driving 135 BPM taiko war groove, Phrygian synth-bass, metallic FM katana clashes, plasma crackles, bullet-time vacuum heartbeat drop, 808 severance bass drop, and crisp katana sheathe click.

## Files

- `fight-animation/final/kage_crimson_eclipse.mp4` — Final 1080p H.264/AAC MP4 deliverable
- `fight-animation/preview_contact_sheet.png` — 3×3 keyframe QA contact sheet
- `fight-animation/art/` — 9 studio-grade 2D anime fight keyframes
- `fight-animation/stills/` — 9 exported 1080p keyframe stills from the final composited render
- `fight-animation/render_sakuga.mjs` — Skia Canvas2D (`@napi-rs/canvas`) 24 fps Sakuga compositor & VFX engine
- `fight-animation/synth_audio.py` — Procedural NumPy 48 kHz stereo audio synthesizer
- `fight-animation/build.sh` — Reproducible end-to-end build script
