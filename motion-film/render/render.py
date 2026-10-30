#!/usr/bin/env python3
"""
PARTH- · THE REPOSITORY IS A LIVING PLANET
Deterministic offline renderer (Pillow + numpy). 1920×1080 · 30 fps · 45 s.

Every fact on screen is verified repo metadata — see ../film-data.json.
Seed 541087 is taken from the real first commit sha `5a41087`.

Usage
  python render.py --still 37 poster.png     # one art-direction still
  python render.py --poster                  # official poster -> ../out/poster.jpg
  python render.py --render                  # full film  -> ../out/parth-living-planet.mp4
  python render.py --render --scale 0.5      # fast draft render
"""
import argparse, io, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONT_DIR = os.path.join(ROOT, "assets", "fonts")
OUT = os.path.join(ROOT, "out")
FPS, DUR = 30, 45.0
SEED = 541087

VOID   = (3, 4, 10)
ICE    = (234, 246, 255)
CYAN   = (95, 245, 226)
AMBER  = (255, 179, 71)
VIOLET = (124, 92, 255)
DEEP   = (11, 30, 58)
DIM    = (120, 150, 180)

rng = np.random.default_rng(SEED)

def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def lerp(a, b, t): return a + (b - a) * t
def smooth(t): t = clamp(t); return t * t * (3 - 2 * t)
def ease_out(t): return 1 - (1 - clamp(t)) ** 3
def env(t, t0, t1, fade_in=1.0, fade_out=1.0):
    return smooth((t - t0) / fade_in) * (1 - smooth((t - (t1 - fade_out)) / fade_out))
def sc(c, k): return tuple(int(clamp(v * k, 0, 255)) for v in c)
def mix(c1, c2, t): return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))
def rgba(c, a): return (c[0], c[1], c[2], int(255 * clamp(a)))

_font_cache = {}
def font(name, size):
    key = (name, int(size))
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(os.path.join(FONT_DIR, name), max(4, int(size)))
    return _font_cache[key]
def LIGHT(s): return font("SpaceGrotesk-Light.ttf", s)
def MED(s):   return font("SpaceGrotesk-Medium.ttf", s)
def BOLD(s):  return font("SpaceGrotesk-Bold.ttf", s)
def MONO(s):  return font("DejaVuSansMono.ttf", s)

class Canvas:
    """Base RGB (additive light) + RGBA overlay (true-alpha text/skin) + glow."""
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.s = w / 1920.0
        self.img = Image.new("RGB", (w, h), VOID)
        self.d = ImageDraw.Draw(self.img)
        self.ovl = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.o = ImageDraw.Draw(self.ovl)
        self.glow = Image.new("RGB", (w, h), (0, 0, 0))
        self.g = ImageDraw.Draw(self.glow)

    def X(self, x): return x * self.s
    def text_w(self, txt, fnt, tracking=0):
        return (sum(self.d.textlength(ch, font=fnt) + tracking for ch in txt) - (tracking if txt else 0))

    def tracked(self, cx, y, txt, fnt, colour, tracking=0, align="c", alpha=1.0):
        if alpha <= 0.02: return 0
        fill = rgba(colour, alpha)
        tr = self.X(tracking)
        total = self.text_w(txt, fnt, tr)
        x = self.X(cx) - total / 2 if align == "c" else self.X(cx)
        yy = self.X(y)
        for ch in txt:
            self.o.text((x, yy), ch, font=fnt, fill=fill)
            x += self.d.textlength(ch, font=fnt) + tr
        return total / self.s

    def dot(self, draw, x, y, r, colour):
        x, y, r = self.X(x), self.X(y), max(0.6, self.X(r))
        draw.ellipse([x - r, y - r, x + r, y + r], fill=colour)

    def dotA(self, x, y, r, colour, alpha):
        if alpha <= 0.03: return
        x, y, r = self.X(x), self.X(y), max(0.6, self.X(r))
        self.o.ellipse([x - r, y - r, x + r, y + r], fill=rgba(colour, alpha))

    def lineD(self, pts, colour, width=2, glow_k=0.0):
        P = [(self.X(px), self.X(py)) for px, py in pts]
        if glow_k > 0:
            self.g.line(P, fill=sc(colour, glow_k), width=max(1, int(self.X(width + 5))), joint="curve")
        self.d.line(P, fill=colour, width=max(1, int(self.X(width))), joint="curve")

    def finish(self):
        base = Image.alpha_composite(self.img.convert("RGBA"), self.ovl).convert("RGB")
        gw, gh = max(2, self.w // 4), max(2, self.h // 4)
        g = self.glow.resize((gw, gh), Image.BILINEAR).filter(ImageFilter.GaussianBlur(9))
        g = g.resize((self.w, self.h), Image.BILINEAR)
        out = ImageChops.screen(base, g)
        out = ImageChops.screen(out, g)
        return out

# ── baked layers ─────────────────────────────────────────────────────────────
def make_nebula(W, H):
    ow, oh = int(W * 1.25), int(H * 1.25)
    arr = np.zeros((oh, ow), dtype=np.float32)
    for octv, amp in [(5, 1.0), (10, 0.5), (22, 0.26)]:
        small = rng.random((octv, int(octv * ow / oh) + 2)).astype(np.float32)
        layer = np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((ow, oh), Image.BICUBIC), dtype=np.float32) / 255
        arr += layer * amp
    arr /= arr.max()
    arr = np.clip((arr - 0.40) * 1.7, 0, 1) ** 1.5
    tint = np.zeros((oh, ow, 3), dtype=np.float32)
    grad = (np.linspace(0, 1, ow, dtype=np.float32)[None, :] * 0.7 + np.linspace(0, 0.5, oh, dtype=np.float32)[:, None]) / 1.2
    for i in range(3):
        tint[..., i] = arr * (DEEP[i] * 1.15 * (1 - grad) + VIOLET[i] * 0.42 * grad)
    img = Image.fromarray(np.clip(tint, 0, 255).astype(np.uint8))
    return img.filter(ImageFilter.GaussianBlur(14))

_sphere_cache = {}
def sphere_sprite(R):
    R = int(round(R / 8) * 8)
    if R < 8: R = 8
    if R in _sphere_cache: return _sphere_cache[R], R
    y, x = np.mgrid[-R:R + 1, -R:R + 1].astype(np.float32)
    nx, ny = x / R, y / R
    r2 = nx * nx + ny * ny
    inside = r2 <= 1.0
    z = np.sqrt(np.clip(1 - r2, 0, 1))
    lx, ly, lz = -0.58, -0.42, 0.70
    Ln = math.sqrt(lx * lx + ly * ly + lz * lz); lx, ly, lz = lx / Ln, ly / Ln, lz / Ln
    nlen = np.sqrt(nx ** 2 + ny ** 2 + z ** 2); nlen[nlen == 0] = 1
    diff = np.clip((nx * lx + ny * ly + z * lz) / nlen, 0, 1)
    diff = diff ** 1.35
    fres = (1 - z) ** 3.2 * (0.18 + 0.82 * diff)          # rim lit mostly on day side
    spec = diff ** 14
    bands = 0.5 + 0.5 * np.sin(ny * 9.0 + 1.2) * np.sin(nx * 6.0 - 0.6)
    img = np.zeros((2 * R + 1, 2 * R + 1, 4), dtype=np.float32)
    day = np.array([28, 96, 118], float)
    night = np.array([5, 10, 24], float)
    for i in range(3):
        img[..., i] = (night[i] + (day[i] - night[i]) * diff * (0.85 + 0.3 * bands)
                       + CYAN[i] * fres * 0.85 + AMBER[i] * spec * 0.5 + VIOLET[i] * (1 - diff) * (1 - z) ** 2 * 0.10)
    img[..., 3] = inside * 255
    spr = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGBA")
    _sphere_cache[R] = spr
    return spr, R

def glow_disc(R, colour):
    R = max(4, int(R))
    y, x = np.mgrid[-R:R, -R:R].astype(np.float32)
    a = np.clip(1 - np.sqrt(x * x + y * y) / R, 0, 1) ** 2.4
    arr = np.zeros((2 * R, 2 * R, 3), dtype=np.float32)
    for i in range(3): arr[..., i] = a * colour[i]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

STARS = [(rng.random(), rng.random(), rng.random(), 0.4 + rng.random()) for _ in range(420)]
DUST = [(rng.random() * math.tau, 120 + rng.random() * 760, 0.5 + rng.random(), rng.random()) for _ in range(340)]
def fib_sphere(n=520):
    pts, ga = [], math.pi * (3 - math.sqrt(5))
    for i in range(n):
        yy = 1 - (i / (n - 1)) * 2; rr = math.sqrt(max(0, 1 - yy * yy)); th = ga * i
        pts.append((math.cos(th) * rr, yy, math.sin(th) * rr))
    return pts
SKIN = fib_sphere()

CX, CY = 960, 540

def draw_stars(c, t, push):
    for (fx, fy, depth, br) in STARS:
        x = CX + (fx * 1920 - CX) * (1 + push * (0.4 + depth)) + math.sin(t * 0.05 + depth * 9) * 6 * depth
        y = CY + (fy * 1080 - CY) * (1 + push * (0.4 + depth))
        tw = 0.65 + 0.35 * math.sin(t * (0.6 + depth) + fx * 40)
        k = (0.25 + 0.75 * depth) * tw * br
        c.dot(c.d, x, y, 0.7 + depth * 1.5, sc(mix(DIM, ICE, depth), clamp(k)))
        if depth > 0.9: c.dot(c.g, x, y, 2.4, sc(CYAN, 0.22 * tw))

def orbit_point(a, rx, ry, tilt, cx=CX, cy=CY):
    x, y = math.cos(a) * rx, math.sin(a) * ry
    return (cx + x * math.cos(tilt) - y * math.sin(tilt),
            cy + x * math.sin(tilt) + y * math.cos(tilt))

def draw_orbit(c, rx, ry, tilt, colour, alpha, width=2, dash=0, arc=1.0, glow_k=0.3, cx=CX, cy=CY, a_range=None):
    if alpha <= 0.02: return
    steps = 170
    if a_range is not None:
        a0, a1 = a_range
        n = max(2, int(steps * abs(a1 - a0) / math.tau))
        pts = [orbit_point(a0 + (a1 - a0) * i / n, rx, ry, tilt, cx, cy) for i in range(n + 1)]
    else:
        n = max(2, int(steps * clamp(arc)))
        pts = [orbit_point(i / steps * math.tau * arc - math.pi / 2, rx, ry, tilt, cx, cy) for i in range(n + 1)]
    for draw, wdt, cc in [(c.g, width + 3, sc(colour, alpha * glow_k)), (c.d, width, sc(colour, alpha))]:
        P = [(c.X(px), c.X(py)) for px, py in pts]
        if dash:
            for i in range(0, len(P) - 1, dash * 2):
                seg = P[i:i + dash + 1]
                if len(seg) > 1: draw.line(seg, fill=cc, width=max(1, int(c.X(wdt))))
        else:
            draw.line(P, fill=cc, width=max(1, int(c.X(wdt))), joint="curve")

def label(c, x, y, txt, colour, alpha, size=25, align="c", tracking=5):
    c.tracked(x, y, txt, MONO(c.X(size)), colour, tracking, align, alpha)

def headline(c, y, txt, alpha, size=92, colour=ICE, fnt_fn=None, tracking=2, rise=0.0, cx=CX):
    c.tracked(cx, y + rise * 26, txt, (fnt_fn or LIGHT)(c.X(size)), colour, tracking, "c", alpha)

def chip(c, cx, y, txt, alpha, colour=CYAN):
    if alpha <= 0.02: return
    f = MONO(c.X(26)); tr = 4
    w = c.text_w(txt, f, c.X(tr)) / c.s + 46; h = 52
    x0, y0 = cx - w / 2, y
    c.o.rounded_rectangle([c.X(x0), c.X(y0), c.X(x0 + w), c.X(y0 + h)], radius=c.X(26),
                          outline=rgba(colour, alpha * 0.85), width=max(1, int(c.X(2))))
    c.tracked(cx, y0 + 13, txt, f, ICE, tr, "c", alpha)

# ── ACT 1 · VOID (0–9) ───────────────────────────────────────────────────────
def act1(c, t):
    a = env(t, 0, 9.4, 0.8, 1.0)
    breathe = 0.5 + 0.5 * math.sin(t * 1.35)
    c.dot(c.g, CX, CY, 30 + 12 * breathe, sc(CYAN, 0.42 * a))
    c.dot(c.d, CX, CY, 3 + 2 * breathe + max(0, t - 7.5) * 3, sc(ICE, a))
    ring_r = 90 + (t * 14) % 260
    c.d.ellipse([c.X(CX - ring_r), c.X(CY - ring_r), c.X(CX + ring_r), c.X(CY + ring_r)],
                outline=sc(CYAN, a * 0.20 * (1 - (ring_r - 90) / 260)), width=max(1, int(c.X(2))))
    for (ang0, rad, spd, frac) in DUST[:170]:
        ang = ang0 + t * 0.02 * spd
        x, y = CX + math.cos(ang) * rad, CY + math.sin(ang) * rad * 0.62
        c.dot(c.d, x, y, 1 + frac * 1.4, sc(mix(CYAN, ICE, frac), a * (0.25 + 0.5 * frac)))
    k = env(t, 1.6, 8.8, 1.6, 0.9)
    headline(c, 648, "EVERY WORLD BEGINS", k, 74, ICE, LIGHT, 10, rise=1 - k)
    k2 = env(t, 3.4, 8.8, 1.6, 0.9)
    headline(c, 738, "WITH A SINGLE LINE.", k2, 74, ICE, LIGHT, 10, rise=1 - k2)
    label(c, CX, 884, "GITHUB.COM/PARTHORIGANAL/PARTH-   ·   2026 · 10 · 30", DIM,
          env(t, 5.2, 8.8, 1.4, 0.9) * 0.95, 24)

# ── ACT 2 · THE FIRST COMMIT (9–19) ──────────────────────────────────────────
def meteor_pos(tau):
    e = clamp(tau) ** 2.1
    return lerp(210, CX, e), lerp(135, CY, e ** 0.92) + math.sin(e * 2.2) * 26 * (1 - e)

def act2(c, t):
    T0, TIMP = 9.4, 12.15
    if T0 <= t <= TIMP + 0.05:
        tau = (t - T0) / (TIMP - T0)
        ignite = smooth(tau / 0.08)
        hx, hy = meteor_pos(tau)
        for j in range(46):
            back = j / 46 * 0.34
            px, py = meteor_pos(max(0, tau - back))
            jr = math.sin(j * 12.9898) * 9 * back * 3
            fade = (1 - j / 46) ** 1.7 * ignite
            c.dot(c.g, px, py + jr, 4 + 15 * fade, sc(AMBER, 0.5 * fade))
            c.dot(c.d, px, py + jr, 1.2 + 3.4 * fade, sc(mix(AMBER, ICE, fade), fade))
        c.dot(c.g, hx, hy, 38, sc(AMBER, 0.65 * ignite)); c.dot(c.d, hx, hy, 9, sc(ICE, ignite))
        if hx > 330:   # label sits below-left of the flight path, clear of the trail
            label(c, hx - 168, hy + 44, "5A41087", AMBER, 0.95, 27, tracking=6)
            c.d.line([c.X(hx - 96), c.X(hy + 34), c.X(hx - 14), c.X(hy + 6)], fill=sc(AMBER, .7), width=max(1, int(c.X(2))))
    if t >= TIMP:
        dt = t - TIMP
        flash = math.exp(-dt * 5.5)
        if flash > 0.02:
            R = 60 + dt * 900
            disc = glow_disc(c.X(R), sc(mix(AMBER, ICE, .5), flash))
            box = (int(c.X(CX - R)), int(c.X(CY - R)), int(c.X(CX + R)), int(c.X(CY + R)))
            region = c.img.crop(box)
            c.img.paste(ImageChops.screen(region, disc.resize(region.size)), box[:2])
            c.d = ImageDraw.Draw(c.img)
        for i, speed in enumerate([520, 380, 270]):
            rr = dt * speed; al = math.exp(-dt * 1.15) * (0.8 - i * 0.18)
            if al > 0.02 and rr < 1500:
                c.d.ellipse([c.X(CX - rr), c.X(CY - rr * .62), c.X(CX + rr), c.X(CY + rr * .62)],
                            outline=sc(CYAN if i else ICE, al), width=max(1, int(c.X(3 - i * .6))))
        settle_fade = math.exp(-max(0.0, dt - 2.2) * 0.38) * (1 - smooth((t - 17.6) / 1.2))
        if settle_fade > 0.02:
            for j in range(110):
                fr = j / 110; ang = fr * math.tau + math.sin(j * 7.7) + dt * 0.12
                rr = (140 + 320 * (((j * 37) % 100) / 100)) * ease_out(clamp(dt / 2.8))
                x, y = CX + math.cos(ang) * rr, CY + math.sin(ang) * rr * 0.62
                c.dot(c.d, x, y, 1.1 + 1.8 * fr, sc(mix(AMBER, CYAN, fr), 0.8 * settle_fade))
                c.dot(c.g, x, y, 4.5, sc(AMBER, 0.28 * settle_fade))
        c.dot(c.g, CX, CY, 40, sc(CYAN, .45)); c.dot(c.d, CX, CY, 5, ICE)
        arc = smooth((t - 13.2) / 2.6)
        a_ring = arc * (1 - smooth((t - 18.2) / 0.9))
        if a_ring > 0.01:
            draw_orbit(c, 435, 252, -0.14, CYAN, a_ring * 0.95, 3, arc=max(arc, .001))
            mx, my = orbit_point(-0.7, 435, 252, -0.14)
            label(c, mx, my - 46, "BRANCH — MAIN", CYAN, a_ring, 24)
        k = env(t, 13.4, 18.6, 1.1, 0.8)
        headline(c, 812, "INITIAL COMMIT", k, 82, ICE, LIGHT, 14, rise=1 - k)
        label(c, CX, 906, "THE FIRST LIGHT.", ICE, env(t, 14.3, 18.6, 1.1, 0.8) * 0.85, 26, tracking=9)
        for i, txt in enumerate(["1 COMMIT", "1 BRANCH", "1 FILE"]):
            chip(c, CX + (i - 1) * 300, 952, txt, env(t, 15.2 + i * 0.45, 18.6, 0.8, 0.8))

# ── ACT 3 · THE MONOLITH (19–31) ─────────────────────────────────────────────
def act3(c, t):
    a = env(t, 19, 31.2, 1.2, 1.0)
    if a <= 0.01: return
    for i in range(4):
        rr = 300 + i * 130
        box = [c.X(620 - rr), c.X(560 - rr), c.X(620 + rr), c.X(560 + rr)]
        c.d.arc(box, 180, 360, fill=sc(VIOLET, a * (0.20 - i * 0.035)), width=max(1, int(c.X(2))))
        c.d.line([c.X(620 - rr), c.X(560), c.X(620 - rr), c.X(950)], fill=sc(VIOLET, a * .12), width=1)
        c.d.line([c.X(620 + rr), c.X(560), c.X(620 + rr), c.X(950)], fill=sc(VIOLET, a * .12), width=1)
    label(c, 620, 988, "STRUCTURE — 1 FILE · FOLDERS UNBORN", VIOLET, a * .85, 23)
    fx0, fy0, fx1, fy1 = 420, 250, 820, 910
    depth = 46
    c.d.polygon([(c.X(fx1), c.X(fy0)), (c.X(fx1 + depth), c.X(fy0 + 30)), (c.X(fx1 + depth), c.X(fy1 - 60)), (c.X(fx1), c.X(fy1))],
                fill=sc(DEEP, 0.4 + 0.6 * a), outline=sc(CYAN, a * .35))
    c.d.rectangle([c.X(fx0), c.X(fy0), c.X(fx1), c.X(fy1)], fill=(7, 12, 24), outline=sc(CYAN, a * .9), width=max(1, int(c.X(3))))
    c.g.rectangle([c.X(fx0), c.X(fy0), c.X(fx1), c.X(fy1)], outline=sc(CYAN, a * .45), width=max(1, int(c.X(5))))
    f_title = BOLD(c.X(64))
    tw = c.tracked(fx0 + 44, 330, "# Parth-", f_title, ICE, 1, align="l", alpha=a)
    if (t * 1.4) % 1 < 0.62:
        cx0 = fx0 + 44 + tw + 12
        c.o.rectangle([c.X(cx0), c.X(334), c.X(cx0 + 30), c.X(394)], fill=rgba(AMBER, a))
        c.dot(c.g, cx0 + 15, 364, 20, sc(AMBER, a * .7))
    label(c, fx0 + 44, 440, "README.MD", CYAN, a, 26, align="l", tracking=5)
    label(c, fx0 + 44, 486, "1 LINE · 8 BYTES OF SKY", DIM, a * .9, 23, align="l", tracking=3)
    c.d.line([c.X(fx0 + 44), c.X(560), c.X(fx1 - 44), c.X(560)], fill=sc(CYAN, a * .4), width=1)
    for i in range(5):
        yy = 610 + i * 52
        c.d.line([c.X(fx0 + 44), c.X(yy), c.X(fx0 + 44 + 240 + 90 * math.sin(i * 2.7)), c.X(yy)], fill=sc(DIM, a * .22), width=max(1, int(c.X(2))))
    rivers = [(CYAN, 0.0), (VIOLET, 1.7), (AMBER, 3.4)]
    for col, ph in rivers:
        fade_in = smooth((t - 21.5 - ph * 0.6) / 1.6) * a
        if fade_in <= 0.02: continue
        for braid, off in [(0, 0), (1, 9)]:
            pts = []
            for i in range(91):
                u = i / 90
                x = lerp(866, 1790, u)
                y = 706 + ph * 52 + math.sin(u * 5.2 + ph + t * 0.55 + braid * 1.3) * 32 * u + u * u * 110 + off
                pts.append((x, y))
            k = fade_in * (0.85 if braid == 0 else 0.35)
            c.lineD(pts, sc(col, k), 2.6 if braid == 0 else 1.6, glow_k=fade_in * 0.30)
        pi = int(((t * 0.11 + ph) % 1.0) * 89)
        u = pi / 90
        px = lerp(866, 1790, u)
        py = 706 + ph * 52 + math.sin(u * 5.2 + ph + t * 0.55) * 32 * u + u * u * 110
        c.dot(c.g, px, py, 15, sc(col, fade_in)); c.dot(c.d, px, py, 3.6, sc(ICE, fade_in))
    label(c, 1330, 566, "RIVERS OF LANGUAGE —", ICE, a * .95, 27, tracking=6)
    label(c, 1330, 606, "NOT YET CHOSEN", AMBER, a * .98, 27, tracking=6)
    k = env(t, 21, 30.6, 1.4, 0.9)
    headline(c, 300, "A CATHEDRAL", k, 76, ICE, LIGHT, 6, cx=1330)
    headline(c, 392, "OF ONE LINE.", k, 76, ICE, LIGHT, 6, cx=1330)

# ── ACT 4 · PROTO-PLANET (31–40) ─────────────────────────────────────────────
PCY = 518
def planet(c, t, R, cy, alpha, skin=True):
    if R <= 12: return
    spr, RR = sphere_sprite(c.X(R))
    half = RR  # sprite is 2R+1 px in device space
    c.img.paste(spr, (int(c.X(CX) - half), int(c.X(cy) - half)), spr)
    c.d = ImageDraw.Draw(c.img)
    if not skin: return
    rot = t * 0.16; tilt = -0.42
    for idx, (x, y, z) in enumerate(SKIN):
        if idx % 2: continue                      # sparse city-lights, not pepper
        xr = x * math.cos(rot) - z * math.sin(rot); zr = x * math.sin(rot) + z * math.cos(rot)
        yr = y * math.cos(tilt) - zr * math.sin(tilt); zz = y * math.sin(tilt) + zr * math.cos(tilt)
        if zz < 0.05: continue
        tw = 0.5 + 0.5 * math.sin(t * 1.1 + x * 7 + y * 5)
        if tw < 0.45: continue
        col = AMBER if (idx % 23 == 0) else (ICE if idx % 5 == 0 else CYAN)
        c.dotA(CX + xr * R * 0.99, cy + yr * R * 0.99, 0.9 + 1.3 * clamp(zz), col, alpha * clamp(zz) * tw * 0.9)

def act4(c, t):
    a = env(t, 31, 40.4, 1.2, 0.9)
    grow = ease_out((t - 31.4) / 3.4)
    R = 298 * grow
    RINGS = [(500, 288, -0.15, CYAN, 0, "MAIN"), (612, 296, 0.09, VIOLET, 6, "FUTURE BRANCH")]
    kr = a * smooth((t - 33) / 1.6)
    for rx, ry, tl, col, dash, name in RINGS:      # far side of each orbit, behind the planet
        draw_orbit(c, rx, ry, tl, col, kr * .9, 2 if dash else 3, dash=dash, cy=PCY, a_range=(math.pi, math.tau))
    planet(c, t, R, PCY, a * grow)
    for rx, ry, tl, col, dash, name in RINGS:      # near side, in front
        k = kr
        draw_orbit(c, rx, ry, tl, col, k * .9, 2 if dash else 3, dash=dash, cy=PCY, a_range=(0, math.pi))
        if name == "MAIN" and k > 0.02:
            ang = t * 0.42
            mx, my = orbit_point(ang, rx, ry, tl, CX, PCY)
            behind = math.sin(ang) < 0 and (mx - CX) ** 2 + (my - PCY) ** 2 < (R * 1.02) ** 2
            if not behind:                          # the commit-moon is eclipsed when it passes behind
                c.dot(c.g, mx, my, 20, sc(AMBER, k)); c.dot(c.d, mx, my, 5, sc(ICE, k))
                if mx < CX:
                    w = c.text_w("5A41087 · MAIN", MONO(c.X(22)), c.X(3)) / c.s
                    label(c, mx - 26 - w, my - 14, "5A41087 · MAIN", AMBER, k * .95, 22, align="l", tracking=3)
                else:
                    label(c, mx + 28, my - 14, "5A41087 · MAIN", AMBER, k * .95, 22, align="l", tracking=3)
        elif name and k > 0.02:
            lx, ly = orbit_point(0.85, rx, ry, tl, CX, PCY)
            label(c, lx, ly + 32, name, VIOLET, k * .85, 21)
    label(c, CX, 100, "NO RELEASES.  NO STARS YET.", DIM, env(t, 34.2, 39.8, 1.3, 0.8) * .95, 27, tracking=8)
    k2 = env(t, 35.8, 39.8, 1.4, 0.8)
    headline(c, 868, "ONLY GRAVITY.", k2, 94, ICE, LIGHT, 16, rise=1 - k2)

# ── ACT 5 · TITLE (40–45) — planet becomes the horizon ───────────────────────
def act5(c, t):
    sink = ease_out((t - 40.1) / 2.0)             # camera tilts: planet sinks → horizon arc
    R = lerp(298, 470, sink)
    cy = lerp(PCY, 1140, sink)
    planet(c, t, R, cy, 1.0, skin=(sink < 0.6))
    draw_orbit(c, lerp(500, 560, sink), lerp(288, 300, sink), -0.15, CYAN, (1 - sink) * 0.8, 3, cy=lerp(PCY, 900, sink))
    settle = ease_out((t - 40.4) / 1.5)
    f = BOLD(c.X(215))
    total = c.text_w("PARTH", f, c.X(8)) / c.s
    x = CX - (total + 120) / 2
    y = 252 - (1 - settle) * 40
    for i, ch in enumerate("PARTH"):
        ka = smooth((t - 40.5 - i * 0.13) / 0.9)
        c.tracked(x, y + (1 - ka) * 30, ch, f, ICE, 0, align="l", alpha=ka)
        x += (c.d.textlength(ch, font=f) + c.X(8)) / c.s
    kh = smooth((t - 41.3) / 0.9)                 # the hyphen — hero of the film
    hy = y + 108
    if kh > 0.02:
        c.o.rectangle([c.X(x + 4), c.X(hy), c.X(x + 4 + 96 * kh), c.X(hy + 26)], fill=rgba(AMBER, kh))
        c.g.rectangle([c.X(x + 4), c.X(hy), c.X(x + 4 + 96 * kh), c.X(hy + 26)], fill=sc(AMBER, kh * .8))
    ext = smooth((t - 42.2) / 1.6)                # hyphen → open horizon line
    if ext > 0.02:
        c.d.line([c.X(x + 104), c.X(hy + 13), c.X(x + 104 + ext * (1900 - (x + 104))), c.X(hy + 13)],
                 fill=sc(AMBER, 0.75 * ext), width=max(1, int(c.X(3))))
    label(c, CX, 548, "THE REPOSITORY IS A LIVING PLANET", ICE, smooth((t - 42.3) / 1.2), 31, tracking=11)
    label(c, CX, 600, "IT HAS JUST BEGUN TO BREATHE", CYAN, smooth((t - 43.0) / 1.2), 27, tracking=9)
    k4 = smooth((t - 43.6) / 1.0)                 # credits over the horizon, on a soft scrim
    if k4 > 0.02:
        sw, sh = max(4, int(c.X(1000))), max(4, int(c.X(196)))
        scrim = Image.new("L", (sw, sh), 0)
        ImageDraw.Draw(scrim).ellipse([0, 0, sw, sh], fill=int(130 * k4))
        scrim = scrim.filter(ImageFilter.GaussianBlur(max(2, int(c.X(28)))))
        c.img.paste((1, 2, 6), (int(c.X(CX - 500)), int(c.X(916 - 98))), scrim)
        c.d = ImageDraw.Draw(c.img)
    label(c, CX, 856, "1 FILE · 1 COMMIT · 1 BRANCH", ICE, k4 * .97, 24, tracking=5)
    label(c, CX, 898, "EVERYTHING ELSE — UNWRITTEN", ICE, k4 * .72, 23, tracking=5)
    label(c, CX, 944, "GITHUB.COM/PARTHORIGANAL/PARTH-", DIM, k4 * .9, 21, tracking=4)

# ── frame assembly ───────────────────────────────────────────────────────────
_nebula, _vig = {}, {}
def vignette(W, H):
    if (W, H) not in _vig:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt(((xx - W / 2) / (W * 0.72)) ** 2 + ((yy - H / 2) / (H * 0.72)) ** 2)
        f = 1 - 0.52 * np.clip((d - 0.55) / 0.75, 0, 1) ** 2 * (3 - 2 * np.clip((d - 0.55) / 0.75, 0, 1))
        _vig[(W, H)] = f[..., None]
    return _vig[(W, H)]

def frame(t, W=1920, H=1080, poster=False):
    c = Canvas(W, H)
    if W not in _nebula: _nebula[W] = make_nebula(W, H)
    neb = _nebula[W]
    alpha_rise = 0.35 + 0.65 * smooth(t / 26)
    dx = int(math.sin(t * 0.03) * W * 0.04 + t * W * 0.0005)
    x0 = max(0, min(neb.width - W, W // 8 + dx)); y0 = H // 8
    region = neb.crop((x0, y0, x0 + W, y0 + H))
    if alpha_rise < 0.99:
        region = Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), region, alpha_rise)
    c.img = ImageChops.screen(c.img, region)
    c.d = ImageDraw.Draw(c.img)
    push = 0.05 * smooth(t / DUR) + 0.11 * env(t, 19, 31, 3, 3)
    draw_stars(c, t, push)
    if poster:
        act5(c, 44.4)
    else:
        if t < 10: act1(c, t)
        if 8.8 < t < 19.6: act2(c, t)
        if 18.4 < t < 32: act3(c, t)
        if 30.4 < t < 40.6: act4(c, t)
        if t >= 39.9: act5(c, t)
    out = c.finish()
    arr = np.asarray(out).astype(np.float32) * vignette(W, H)
    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(out)
    bar = int(H * (0.045 + 0.05 * (smooth((t - 40) / 2) if not poster else 1.0)))
    d.rectangle([0, 0, W, bar], fill=(0, 0, 0)); d.rectangle([0, H - bar, W, H], fill=(0, 0, 0))
    if not poster:
        k = min(smooth(t / 1.4), 1 - smooth((t - 44.55) / 0.45))
        if k < 0.999: out = Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), out, k)
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--still", nargs=2, metavar=("SECONDS", "FILE"))
    ap.add_argument("--poster", action="store_true")
    ap.add_argument("--render", action="store_true")
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--ffmpeg", default=os.path.join(ROOT, "tools", "ffmpeg"))
    args = ap.parse_args()
    W, H = int(1920 * args.scale), int(1080 * args.scale)
    os.makedirs(OUT, exist_ok=True)
    if args.still:
        frame(float(args.still[0]), W, H).save(args.still[1]); print("still ->", args.still[1]); return
    if args.poster:
        p = os.path.join(OUT, "poster.jpg")
        frame(44.4, 1920, 1080, poster=True).save(p, quality=93); print("poster ->", p); return
    if args.render:
        wav = os.path.join(OUT, "film.wav")
        mp4 = os.path.join(OUT, "parth-living-planet.mp4")
        cmd = [args.ffmpeg, "-y", "-f", "image2pipe", "-vcodec", "png", "-r", str(FPS), "-i", "-"]
        if os.path.exists(wav): cmd += ["-i", wav]
        cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "medium", "-r", str(FPS)]
        if os.path.exists(wav): cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]
        cmd += ["-movflags", "+faststart", mp4]
        print("ENCODING:", " ".join(cmd), flush=True)
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        total = int(FPS * DUR)
        for i in range(total):
            buf = io.BytesIO(); frame(i / FPS, W, H).save(buf, "PNG")
            try: proc.stdin.write(buf.getvalue())
            except BrokenPipeError: break
            if i % 60 == 0: print(f"frame {i}/{total} ({i / FPS:.1f}s)", flush=True)
        proc.stdin.close(); proc.wait()
        print("DONE ->", mp4, "exit", proc.returncode)

if __name__ == "__main__":
    main()
