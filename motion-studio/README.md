# Motion Studio OS — vector render pipeline

Workspace for **THE EQUITY MACHINE**. Notion is the source of truth for *content*
(📦 Episodes · 🎞️ Scenes · 📚 Research Sources). This repo is the source of truth
for *pixels*: one animated SVG per scene, rendered frame-accurately to MP4.

```
scenes/            one animated SVG per scene (source of truth for art + motion)
renders/           poster stills + encoded MP4s
tools/render-scene.mjs   SVG -> frames (seeks the SMIL clock)
tools/serve.py           static server with HTTP Range (video seeking)
index.html         download page (also served as GitHub Pages)
```

## Why SVG carries the timeline

Each scene SVG embeds a **SMIL** timeline (`<animate>` / `<animateTransform>`), so the
vector file is not just the art — it *is* the motion. The renderer seeks the SVG's own
animation clock (`svg.setCurrentTime(t)`) instead of screen-recording, which means:

- **frame-accurate** — frame N is always at exactly t = N/fps, no dropped or doubled frames
- **deterministic** — the same SVG always produces a byte-identical MP4
- **re-renderable** — edit a number, re-run, re-embed; nothing is redrawn by hand

## Render a scene

```bash
npm install                                   # puppeteer-core + @sparticuz/chromium

# single still (poster art)
node tools/render-scene.mjs --svg scenes/scene-10-fortune-in-shares.svg \
     --out renders/scene-10 --still 6.5

# full scene -> frames
node tools/render-scene.mjs --svg scenes/scene-10-fortune-in-shares.svg \
     --out renders/scene-10 --fps 30 --end 7

# encode
ffmpeg -y -framerate 30 -i renders/scene-10/frames/f%05d.png \
       -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -movflags +faststart \
       renders/scene-10-fortune-in-shares.mp4
```

> On a non-Amazon-Linux host, `@sparticuz/chromium` skips its shared-library bundle —
> `tools/render-scene.mjs` unpacks `al2023.tar.br` itself and points `LD_LIBRARY_PATH` at it.

## Serve (for Notion embeds)

```bash
python3 tools/serve.py 3000
```

Byte-range support is required — Notion's video player and browser seeking both
request `Range: bytes=…`, and a plain `http.server` answers `200` with the whole
file, which breaks seeking.

## Claim discipline (non-negotiable)

Every number on a frame maps to a dated row in **📚 Research Sources**. Two rules
the film already follows and the vector work preserves:

- **Equity ≠ cash.** A valuation is not money in a bank. "Mostly stock" stays on screen.
- **Date every figure.** "Forbes · 29 Oct 2026" is on the frame, not in a footnote.
