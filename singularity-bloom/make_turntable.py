"""
Assemble the turntable PNGs into an animated GIF + a contact sheet.

    ./render.sh --turntable 10 --width 360 --samples 24 --out out/tt --no-glb
    ./.venv/bin/python make_turntable.py out/tt/renders out/turntable.gif

Frames come out of Cycles already denoised; this just grades them slightly,
cross-fades a ping-pong loop and writes an optimised, palette-per-frame GIF.
"""

import sys
from pathlib import Path

from PIL import Image, ImageEnhance

frames_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "out/tt/renders")
out_gif = Path(sys.argv[2] if len(sys.argv) > 2 else "docs/turntable.gif")
sheet_path = out_gif.with_name(out_gif.stem + "-sheet.jpg")

files = sorted(frames_dir.glob("*.png"))
if not files:
    raise SystemExit(f"no PNG frames in {frames_dir}")

imgs = []
for f in files:
    im = Image.open(f).convert("RGB")
    im = ImageEnhance.Contrast(im).enhance(1.06)
    im = ImageEnhance.Color(im).enhance(1.08)
    imgs.append(im)

# ping-pong so the loop breathes instead of snapping
seq = imgs + imgs[-2:0:-1]

w, h = imgs[0].size
target_w = 420
scale = target_w / w
if target_w != w:
    seq = [im.resize((target_w, int(h * scale)), Image.LANCZOS) for im in seq]

out_gif.parent.mkdir(parents=True, exist_ok=True)
seq[0].save(
    out_gif,
    save_all=True,
    append_images=seq[1:],
    duration=90,
    loop=0,
    optimize=True,
    disposal=2,
)

# contact sheet of the raw frames
cols = min(5, len(imgs))
rows = (len(imgs) + cols - 1) // cols
tw, th = 260, int(260 * h / w)
sheet = Image.new("RGB", (cols * tw, rows * th), (5, 8, 12))
for i, im in enumerate(imgs):
    sheet.paste(im.resize((tw, th), Image.LANCZOS), ((i % cols) * tw, (i // cols) * th))
sheet.save(sheet_path, quality=90)

print(f"gif   {out_gif}  ({out_gif.stat().st_size / 1e3:.0f} kB, {len(seq)} frames)")
print(f"sheet {sheet_path}  ({sheet_path.stat().st_size / 1e3:.0f} kB)")
