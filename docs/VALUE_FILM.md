# MAISON / Volume 002 — Value Is Built

The second original film, made in response to the request for more distinct 3D models, typography-synchronised ticking, SVG decoration, and persistent rotating corner objects.

## Files

- `public/films/maison-value.mp4`: finished 24-second vertical MP4, 720 × 1280, 24 fps, H.264 + stereo AAC.
- `public/films/maison-value-poster.png`: first-sequence poster.
- `value.html`: interactive browser version, using the same deterministic scene renderer as the MP4 export.
- `src/value-film.js`: original procedural 3D models, kinetic typography, animated SVG composition and six-sequence choreography.
- `scripts/mix-value-sound.py`: original mechanical sound design, timed to text-reveal events, and six voiceover cues.

Volume 001 remains available at `/` and `public/films/maison-legacy.mp4`.

## Five distinct hero models

1. **Engraved silver coin** — reeded edge, metal rims, original guilloche-style face texture, monogram crest, engraved border lettering and laurel motif. Symbolises intrinsic value.
2. **Faceted diamond** — custom flat-faceted geometry, physically based refractive material and a gold girdle detail. Symbolises precision.
3. **Lacquer-black chess king** — lathed profile with gold inlay rings and a gold cross. Symbolises deliberate strategy.
4. **Fountain pen** — black lacquer body, metallic bands, detached cap with clip, gold nib and slit. Symbolises identity and considered work.
5. **Hourglass** — lathed glass bulbs, gold frame, black end plates and visible sand. Symbolises finite time and intention.

The final sequence brings all five together. Smaller copies of the coin, diamond, and chess king rotate independently in the corners. No static stock photo is substituted for a rotating model.

## SVG and typography

Original SVG compass and seal graphics are decoded and composited into the exported frames. Technical dot grids, sweeping orbital curves, connected callout lines and expanding type markers supplement these graphics. Headlines use staggered, per-glyph translation, rotation and opacity. Captions reveal as typed text. Cormorant Garamond and Manrope are self-hosted under the SIL Open Font License, with licenses in `public/fonts`.

## Sound

Six separately generated voiceover clips use the voice selected by the user earlier in the conversation. Each is positioned within its corresponding four-second sequence. All clips are shorter than the 3.5-second cue window; no spoken sentence is cut off.

Crisp, short ticks occur at the actual headline glyph-reveal timestamps, with softer ticks for the secondary line, low impact accents at the scene changes, and quiet swishes. The original synthesized atmosphere sits beneath the narration; no copyrighted background music is downloaded.

## Reproduce

```sh
npm install
# Install in a Python virtual environment when required by your operating system:
python -m pip install imageio-ffmpeg
npm run value:sound
npm run dev
# In a second terminal:
npm run value:render
npm run value:test
```

The rendering script exports 576 deterministic frames through headless Chromium and encodes them with FFmpeg. It saves no large intermediate frame sequence. The previous film is not overwritten.

The same open-source foundations and license notes in [FILM.md](./FILM.md) apply: Three.js, Playwright, Sparticuz Chromium, FFmpeg/imageio-ffmpeg, and Google Fonts. The new models, SVG designs, typography, composition and mechanical sound design are original to this project. MAISON is a fictional creative concept.

## Validation

`value:test` checks all six scenes produce distinct frames, readiness of embedded SVG assets, play/pause, chapter navigation, seeking, mute/unmute, narration duration, mobile overflow, and browser errors. Representative frames are also visually reviewed before export. The finished MP4 is decoded from beginning to end with FFmpeg before publishing.
