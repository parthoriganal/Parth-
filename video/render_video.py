#!/usr/bin/env python3
"""render_video.py - paint the timeline into an MP4.

    python3 video/render_video.py --timeline video/timeline.json \
        --audio video/narration.m4a --out out/video.mp4
    python3 video/render_video.py --timeline video/timeline.json --frames 48 --probe out

Nothing here is AI video or stock footage. Every frame is drawn with Pillow and piped
as raw RGB straight into ffmpeg's stdin, so no intermediate PNGs touch the disk.

The timeline is beat-driven: each beat carries the spoken line's start/duration (measured
from the real TTS clip, never guessed) plus a visual spec, and the frame loop just asks
"which beat is on screen, and how far into it are we".
"""
import argparse, json, os, subprocess, sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
FPS = 24

BG = (11, 13, 18)
FG = (232, 236, 242)
DIM = (118, 128, 145)
ACC = (88, 166, 255)
RED = (248, 81, 73)
GRN = (63, 185, 80)
AMB = (224, 168, 60)
PANEL = (20, 24, 32)

FONT_DIR = "/usr/share/fonts/truetype/dejavu"
_cache = {}


def font(size, mono=False, bold=True):
    key = (size, mono, bold)
    if key not in _cache:
        name = ("DejaVuSansMono" if mono else "DejaVuSans") + ("-Bold" if bold else "") + ".ttf"
        _cache[key] = ImageFont.truetype(os.path.join(FONT_DIR, name), size)
    return _cache[key]


def lerp(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def fade(p, at, dur=0.14):
    """0 -> 1 over `dur` of beat progress, starting at `at`."""
    return ease((p - at) / dur)


def build_bg():
    """Static background: vignette + faint grid. Drawn once, copied per frame."""
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    for x in range(0, W, 80):
        d.line([(x, 0), (x, H)], fill=(16, 19, 26), width=1)
    for y in range(0, H, 80):
        d.line([(0, y), (W, y)], fill=(16, 19, 26), width=1)
    vig = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-W * 0.25, -H * 0.35, W * 1.25, H * 1.35], fill=34)
    img = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), img, vig.point(lambda v: 255 - v))
    return img


BG_IMG = build_bg()


def text(d, xy, s, size, col=FG, mono=False, bold=True, anchor="la"):
    d.text(xy, s, font=font(size, mono, bold), fill=col, anchor=anchor)
    return s


def center(d, y, s, size, col=FG, mono=False):
    d.text((W // 2, y), s, font=font(size, mono), fill=col, anchor="ma")


def wrap(d, s, size, maxw, mono=False):
    words, lines, cur = s.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font(size, mono)) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def header(d, beat):
    lbl = beat.get("label", beat["id"]).upper()
    text(d, (88, 64), lbl, 26, DIM, mono=True)
    d.line([(88, 104), (W - 88, 104)], fill=(30, 36, 48), width=2)


def progress_bar(d, p):
    y = H - 46
    d.line([(88, y), (W - 88, y)], fill=(30, 36, 48), width=6)
    d.line([(88, y), (88 + (W - 176) * p, y)], fill=ACC, width=6)


# ------------------------------- beat visuals -------------------------------

def v_hook(d, p, beat):
    lines = wrap(d, beat.get("line", ""), 62, W - 320)
    names = beat.get("names") or []
    for i, ln in enumerate(lines):
        a = fade(p, 0.03 + i * 0.10)
        text(d, (88, 190 + i * 82), ln, 62, lerp(BG, FG, a))
    # 11 folders; yt-edit lifts out and fades
    n = len(names) or 11
    fw, gap = 118, 22
    x0 = (W - (n * fw + (n - 1) * gap)) // 2
    y0 = 700
    for i in range(n):
        x = x0 + i * (fw + gap)
        lift, alpha = 0.0, 1.0
        if beat.get("drop") == i:
            t = ease((p - 0.42) / 0.34)
            lift, alpha = -190 * t, 1.0 - t
        col = lerp(BG, ACC if beat.get("drop") == i else PANEL, alpha)
        d.rounded_rectangle([x, y0 + lift, x + fw, y0 + 74 + lift], radius=10, fill=col,
                            outline=lerp(BG, (52, 62, 80), alpha), width=2)
        if alpha > 0.12:
            text(d, (x + fw // 2, y0 + 37 + lift), names[i] if i < len(names) else "", 14,
                 lerp(BG, FG if beat.get("drop") != i else RED, alpha), mono=True, anchor="mm")
    if p > 0.78:
        a = fade(p, 0.78)
        center(d, 830, "ModuleNotFoundError: No module named 'deadair'", 34,
               lerp(BG, RED, a), mono=True)


def v_counters(d, p, beat):
    specs = [("SKILLS", 11), ("TOOLS", 6), ("LINES OF PYTHON", 535)]
    cw = (W - 176) // 3
    for i, (lbl, n) in enumerate(specs):
        cx = 88 + cw * i + cw // 2
        t = ease((p - i * 0.07) / 0.40)
        val = int(round(n * t))
        text(d, (cx, 380), f"{val:,}" if n >= 1000 else str(val), 132, lerp(BG, ACC, t), anchor="ma")
        text(d, (cx, 500), lbl, 27, lerp(BG, DIM, fade(p, 0.10 + i * 0.07)), mono=True, anchor="ma")
    if p > 0.66:
        a = fade(p, 0.66, 0.20)
        pts = []
        x = 300
        for k in range(9):
            pts.append((x, 300 + (k % 3) * 46 + (k % 2) * 30))
            x += (W - 600) / 8
        col = lerp(BG, RED, a)
        for j in range(len(pts) - 1):
            d.line([pts[j], pts[j + 1]], fill=col, width=7)


def v_twocol(d, p, beat):
    pw = (W - 176 - 60) // 2
    for i, (ttl, sub, on) in enumerate([("PROMPT", "read by the model", False),
                                        ("TOOL", "actually executes", True)]):
        x = 88 + i * (pw + 60)
        lit = fade(p, 0.52) if on else 0.0
        a = fade(p, 0.06 + i * 0.16)
        d.rounded_rectangle([x, 300, x + pw, 640], radius=18,
                            fill=lerp(BG, PANEL, a), outline=lerp(BG, ACC if on else (52, 62, 80), max(a, lit)), width=3 + int(lit * 3))
        text(d, (x + pw // 2, 400), ttl, 72, lerp(BG, FG, a), anchor="ma")
        text(d, (x + pw // 2, 490), sub, 30, lerp(BG, DIM, a), mono=True, anchor="ma")
    if p > 0.70:
        center(d, 720, "a tool that silently fails is worse than no tool", 38, lerp(BG, AMB, fade(p, 0.70)))


def v_imports(d, p, beat):
    names = ["csv", "json", "os", "re", "statistics", "sys"]
    for i, n in enumerate(names):
        a = fade(p, i * 0.075, 0.12)
        wch = int(d.textlength(n, font=font(40, mono=True))) + 64
        x = 88 + (i % 3) * 300
        y = 260 + (i // 3) * 120
        d.rounded_rectangle([x, y, x + wch, y + 84], radius=12, fill=lerp(BG, PANEL, a),
                            outline=lerp(BG, ACC, a), width=2)
        text(d, (x + wch // 2, y + 42), n, 40, lerp(BG, FG, a), mono=True, anchor="mm")
    for i, s in enumerate(["no network", "no subprocess", "no eval"]):
        a = fade(p, 0.52 + i * 0.11, 0.14)
        y = 570 + i * 82
        text(d, (120, y), "OK", 34, lerp(BG, GRN, a), mono=True)
        text(d, (210, y), s, 40, lerp(BG, FG, a), mono=True)
    a = fade(p, 0.90, 0.10)
    center(d, 860, "which means it runs anywhere - including here", 34, lerp(BG, DIM, a))


def v_checks(d, p, beat):
    n, bad = 17, 8
    order = [2, 5, 6, 8, 10, 12, 13, 15]
    cw, ch, gap = 92, 46, 12
    per = 5
    for i in range(n):
        r, c = divmod(i, per)
        x, y = 88 + c * (cw + gap), 210 + r * (ch + gap)
        isbad = i in order
        t = 0.0
        if isbad:
            k = order.index(i)
            t = fade(p, 0.14 + k * 0.055, 0.10)
        d.rounded_rectangle([x, y, x + cw, y + ch], radius=7,
                            fill=lerp(lerp(BG, PANEL, fade(p, 0.02 + i * 0.012)), RED, t),
                            outline=lerp(BG, (52, 62, 80), fade(p, 0.02)), width=2)
    x1 = 88 + 6 * (cw + gap)
    text(d, (x1, 215), f"{int(round(8 * ease((p - 0.14) / 0.44)))} of {n}", 128,
         lerp(BG, RED, fade(p, 0.16)), anchor="la")
    text(d, (x1, 360), "CHECKS FAILED", 30, lerp(BG, DIM, fade(p, 0.30)), mono=True)
    if p > 0.62:
        a = fade(p, 0.62, 0.18)
        s = "ModuleNotFoundError: No module named 'deadair'"
        k = int(len(s) * ease((p - 0.62) / 0.30))
        d.rounded_rectangle([x1 - 24, 460, W - 88, 560], radius=12, fill=lerp(BG, PANEL, a),
                            outline=lerp(BG, RED, a), width=2)
        text(d, (x1, 510), s[:k], 33, lerp(BG, RED, a), mono=True, anchor="lm")
    if p > 0.90:
        center(d, 880, "not at install. at runtime.", 42, lerp(BG, AMB, fade(p, 0.90)))


def v_verify(d, p, beat):
    d.rounded_rectangle([88, 190, W - 88, 840], radius=16, fill=(8, 10, 14),
                        outline=lerp(BG, (52, 62, 80), fade(p, 0.02)), width=2)
    text(d, (128, 236), "$ npm run verify:yt-skill", 34, lerp(BG, DIM, fade(p, 0.04)), mono=True)
    rows = beat.get("rows", [])
    for i, s in enumerate(rows):
        a = fade(p, 0.10 + i * 0.075, 0.10)
        if a <= 0:
            break
        good = s.strip().startswith("\u2713")
        text(d, (128, 330 + i * 78), s, 34, lerp(BG, GRN if good else FG, a), mono=True)
    if p > 0.72:
        a = fade(p, 0.72, 0.18)
        y = 330 + max(len(rows), 1) * 78 + 30
        d.line([(128, y), (W - 128, y)], fill=lerp(BG, (52, 62, 80), a), width=2)
        text(d, (128, y + 34), "17 passed, 0 failed", 46, lerp(BG, GRN, a), mono=True)
    if p > 0.86:
        center(d, 930, "it fails loudly - that is the whole point", 40, lerp(BG, ACC, fade(p, 0.86)))


def v_bars(d, p, beat):
    specs = [("BIG CHANNEL", 410000, 0.20, "1.0x  its own median", DIM),
             ("SMALL CHANNEL", 412000, 1.00, "14.78x  its own median", ACC)]
    maxw = W - 660
    for i, (lbl, views, rel, note, col) in enumerate(specs):
        y = 330 + i * 230
        a = fade(p, 0.10 + i * 0.16)
        text(d, (88, y - 58), lbl, 32, lerp(BG, FG, a), mono=True)
        t = ease((p - (0.10 + i * 0.16)) / 0.40)
        wlen = int(maxw * rel * t)
        d.rounded_rectangle([88, y, 88 + max(wlen, 6), y + 104], radius=12, fill=lerp(BG, col, a))
        text(d, (88 + maxw + 44, y + 4), f"{views:,}", 42, lerp(BG, FG, a), mono=True)
        text(d, (88 + maxw + 44, y + 62), note, 27, lerp(BG, col, a), mono=True)
    if p > 0.68:
        center(d, 800, "same views. completely different signal.", 44, lerp(BG, AMB, fade(p, 0.68)))
    if p > 0.86:
        center(d, 880, "seventy-four lines of Python", 30, lerp(BG, DIM, fade(p, 0.86)), mono=True)


def v_close(d, p, beat):
    a = fade(p, 0.06, 0.25)
    center(d, 430, "run it before you trust it", 62, lerp(BG, FG, a))
    b = fade(p, 0.34, 0.22)
    s = "npm run verify:yt-skill"
    wch = int(d.textlength(s, font=font(46, mono=True))) + 90
    d.rounded_rectangle([W // 2 - wch // 2, 560, W // 2 + wch // 2, 660], radius=14,
                        fill=lerp(BG, (8, 10, 14), b), outline=lerp(BG, ACC, b), width=2)
    text(d, (W // 2, 610), s, 46, lerp(BG, ACC, b), mono=True, anchor="mm")


VISUALS = {"hook": v_hook, "counters": v_counters, "twocol": v_twocol, "imports": v_imports,
           "checks": v_checks, "verify": v_verify, "bars": v_bars, "close": v_close}


def v_lines(d, p, beat):
    """Fallback: staggered lines of text."""
    for i, ln in enumerate(beat.get("lines", [])):
        a = fade(p, 0.05 + i * 0.13)
        for j, sub in enumerate(wrap(d, ln, 54, W - 320)):
            text(d, (88, 240 + i * 150 + j * 68), sub, 54, lerp(BG, FG, a))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--timeline", required=True)
    ap.add_argument("--audio")
    ap.add_argument("--out", default="out/video.mp4")
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--frames", type=int, default=0, help="render only N frames (speed probe)")
    ap.add_argument("--crf", default="19")
    a = ap.parse_args()

    tl = json.load(open(a.timeline))
    beats = tl["beats"]
    total = max(b["start"] + b["dur"] for b in beats)
    nframes = int(round(total * FPS))
    if a.frames:
        nframes = min(nframes, a.frames)

    scale = a.scale
    if scale != 1.0:
        global W, H
        W, H = int(W * scale), int(H * scale)
        global BG_IMG
        BG_IMG = BG_IMG.resize((W, H))

    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    ff = os.environ.get("FFMPEG") or "ffmpeg"
    cmd = [ff, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    if a.audio:
        cmd += ["-i", a.audio]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", a.crf, "-pix_fmt", "yuv420p"]
    cmd += (["-c:a", "aac", "-b:a", "192k", "-shortest"] if a.audio else ["-an"])
    cmd += [a.out]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        for n in range(nframes):
            t = n / FPS
            beat = next((b for b in beats if b["start"] <= t < b["start"] + b["dur"]), beats[-1])
            p = (t - beat["start"]) / beat["dur"]
            img = BG_IMG.copy()
            d = ImageDraw.Draw(img)
            header(d, beat)
            VISUALS.get(beat["kind"], v_lines)(d, p, beat)
            progress_bar(d, t / total)
            proc.stdin.write(img.tobytes())
            if n % 240 == 0:
                print(f"  frame {n}/{nframes}  ({t:.1f}s)", flush=True)
    finally:
        proc.stdin.close()
        err = proc.stderr.read().decode()
        rc = proc.wait()
    if rc != 0:
        print(err[-2500:], file=sys.stderr)
        sys.exit(rc)
    print(f"\n  {a.out}   {nframes} frames   {nframes / FPS:.2f}s   {W}x{H}@{FPS}")


if __name__ == "__main__":
    main()
