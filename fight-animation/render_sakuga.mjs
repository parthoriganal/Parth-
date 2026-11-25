#!/usr/bin/env node
/**
 * KAGE // CRIMSON ECLIPSE — Studio Sakuga Cut (22.0s @ 24fps = 528 frames, 1920x1080)
 *
 * Combines 9 custom studio-grade anime fight artworks with:
 * - Aggressive Sakuga camera choreography (crash-zooms, whip pans, Dutch tilts, trauma shake)
 * - Real per-pixel artwork-derived Jujutsu-Kaisen-style Sakuga Impact Frames (B&W Ink / Crimson / Cyan)
 * - Physical Diagonal Screen-Tear Bisection during the Zero-Point Severance climax
 * - Live 24fps VFX overlays (sword smear crescents, lightning bolts, pouring/frozen rain, embers,
 *   Voronoi shards, shockwave rings, hand-brushed calligraphic "斬", RGB chromatic aberration)
 * - 2.39:1 Cinema Letterbox Frame-Break where hero slashes & shards rip over the black bars!
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CANVAS_PKG = process.env.CANVAS_PKG || '/tmp/animnode/node_modules/@napi-rs/canvas';
const { createCanvas, loadImage } = require(CANVAS_PKG);

const W = 1920;
const H = 1080;
const FPS = 24;
const DURATION = 22.0;
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 528
const BAR_H = 114;

const OUT_MP4 = process.argv[2] || 'fight-animation/final/kage_crimson_eclipse.mp4';
const AUDIO_WAV = process.argv[3] || '/tmp/kage_audio.wav';
const FFMPEG_BIN = process.env.FFMPEG || 'ffmpeg';
const ART_DIR = 'fight-animation/art';
const STILLS_DIR = 'fight-animation/stills';
const CONTACT_SHEET = 'fight-animation/preview_contact_sheet.png';

fs.mkdirSync(path.dirname(OUT_MP4), { recursive: true });
fs.mkdirSync(STILLS_DIR, { recursive: true });

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t, 0, 1)));
const easeInOutCubic = (t) => {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

// ============================================================================
// PRE-BAKED PROCEDURAL OVERLAYS (Rain, Embers, Film Grain)
// ============================================================================
const worldRng = mulberry32(20261120);
const RAIN = Array.from({ length: 240 }, () => ({
  x: worldRng() * (W + 400) - 200,
  y: worldRng() * H,
  len: 46 + worldRng() * 82,
  speed: 1650 + worldRng() * 1100,
  alpha: 0.14 + worldRng() * 0.28,
  width: 1.0 + worldRng() * 1.6,
}));

const EMBERS = Array.from({ length: 130 }, () => ({
  x: worldRng() * W,
  y: worldRng() * H,
  r: 1.8 + worldRng() * 4.8,
  vx: -55 - worldRng() * 130,
  vy: -45 - worldRng() * 110,
  phase: worldRng() * Math.PI * 2,
  warm: worldRng() > 0.32,
}));

function buildGrainTiles() {
  const tiles = [];
  for (let k = 0; k < 4; k++) {
    const tw = 320;
    const th = 180;
    const c = createCanvas(tw, th);
    const g = c.getContext('2d');
    const img = g.createImageData(tw, th);
    const r = mulberry32(9001 + k * 777);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() > 0.5 ? 255 : 0;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = Math.floor(r() * 15);
    }
    g.putImageData(img, 0, 0);
    tiles.push(c);
  }
  return tiles;
}
const GRAIN_TILES = buildGrainTiles();

// ============================================================================
// HAND-BRUSHED CALLIGRAPHIC KANJI "斬" (SLASH) + SAKUGA VFX
// ============================================================================
function drawBrushStroke(ctx, pts, wStart, wMid, wEnd, color) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  const segs = 14;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const tm = (t0 + t1) * 0.5;
    const sample = (t) => {
      const u = 1 - t;
      return [
        u * u * pts[0][0] + 2 * u * t * pts[1][0] + t * t * pts[2][0],
        u * u * pts[0][1] + 2 * u * t * pts[1][1] + t * t * pts[2][1],
      ];
    };
    const [x0, y0] = sample(t0);
    const [x1, y1] = sample(t1);
    const w = tm < 0.5 ? lerp(wStart, wMid, tm * 2) : lerp(wMid, wEnd, (tm - 0.5) * 2);
    ctx.lineWidth = Math.max(1, w);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawKanjiSlash(ctx, cx, cy, size, color, glowColor = null) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 200;
  ctx.scale(s, s);
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 34;
  }
  drawBrushStroke(ctx, [[-82, -62], [-44, -68], [-8, -64]], 10, 14, 8, color);
  drawBrushStroke(ctx, [[-76, -34], [-72, -6], [-68, 22]], 9, 12, 7, color);
  drawBrushStroke(ctx, [[-74, -34], [-42, -38], [-14, -32]], 9, 13, 10, color);
  drawBrushStroke(ctx, [[-14, -32], [-18, -4], [-22, 20]], 11, 12, 7, color);
  drawBrushStroke(ctx, [[-68, -8], [-44, -10], [-20, -8]], 7, 10, 6, color);
  drawBrushStroke(ctx, [[-68, 18], [-44, 16], [-20, 18]], 8, 11, 7, color);
  drawBrushStroke(ctx, [[-88, 48], [-46, 42], [-4, 38]], 10, 14, 8, color);
  drawBrushStroke(ctx, [[-44, -92], [-46, -4], [-46, 92]], 13, 15, 6, color);
  drawBrushStroke(ctx, [[74, -84], [46, -68], [16, -54]], 13, 14, 6, color);
  drawBrushStroke(ctx, [[18, -56], [16, 12], [2, 78]], 12, 14, 4, color);
  drawBrushStroke(ctx, [[18, -14], [52, -20], [92, -22]], 11, 15, 9, color);
  drawBrushStroke(ctx, [[58, -16], [58, 38], [56, 98]], 14, 16, 5, color);

  const r = mulberry32(777);
  ctx.fillStyle = color;
  for (let i = 0; i < 30; i++) {
    const a = r() * Math.PI * 2;
    const d = 52 + r() * 88;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.8 + r() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSlashArc(ctx, x1, y1, cx, cy, x2, y2, thickness, color, coreColor = '#ffffff', alpha = 1.0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  ctx.shadowColor = color;
  ctx.shadowBlur = 36;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx + nx * thickness, cy + ny * thickness, x2, y2);
  ctx.quadraticCurveTo(cx - nx * thickness * 0.32, cy - ny * thickness * 0.32, x1, y1);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 14;
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx + nx * thickness * 0.5, cy + ny * thickness * 0.5, x2, y2);
  ctx.quadraticCurveTo(cx + nx * thickness * 0.1, cy + ny * thickness * 0.1, x1, y1);
  ctx.closePath();
  ctx.fill();

  const r = mulberry32(Math.floor(Math.abs(x1 * 17 + y2 * 11)) + 1);
  ctx.fillStyle = color;
  for (let i = 0; i < 16; i++) {
    const u = r();
    const px = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * cx + u * u * x2 + (r() - 0.5) * thickness * 1.45;
    const py = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * cy + u * u * y2 + (r() - 0.5) * thickness * 1.45;
    ctx.beginPath();
    ctx.arc(px, py, 2 + r() * 6.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLightningBolt(ctx, x1, y1, x2, y2, seed, color = '#00f0ff', width = 4, jitter = 52) {
  const r = mulberry32(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  const steps = 11;
  const pts = [[x1, y1]];
  for (let i = 1; i < steps; i++) {
    const u = i / steps;
    pts.push([lerp(x1, x2, u) + (r() - 0.5) * jitter, lerp(y1, y2, u) + (r() - 0.5) * jitter]);
  }
  pts.push([x2, y2]);

  ctx.strokeStyle = color;
  ctx.lineWidth = width * 2.2;
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = width * 0.75;
  ctx.stroke();
  ctx.restore();
}

function drawSpeedlines(ctx, cx, cy, count, seed, color, innerR = 240, outerR = 1400) {
  const r = mulberry32(seed);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const r0 = innerR + r() * 260;
    const spread = 0.004 + r() * 0.017;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a - spread) * outerR, cy + Math.sin(a - spread) * outerR);
    ctx.lineTo(cx + Math.cos(a + spread) * outerR, cy + Math.sin(a + spread) * outerR);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSparks(ctx, cx, cy, progress, count, seed, colorA = '#ffffff', colorB = '#ffaa22', radius = 620) {
  const r = mulberry32(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = easeOutExpo(progress) * (0.3 + r() * 0.95) * radius;
    const len = (22 + r() * 62) * (1 - progress * 0.72);
    const x0 = cx + Math.cos(a) * d;
    const y0 = cy + Math.sin(a) * d + progress * progress * 85;
    ctx.strokeStyle = i % 3 === 0 ? colorA : colorB;
    ctx.globalAlpha = clamp(1 - progress * 1.05, 0, 1);
    ctx.lineWidth = 1.8 + r() * 3.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 - Math.cos(a) * len, y0 - Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShockwaveRing(ctx, cx, cy, progress, maxR, color, lineW = 16) {
  if (progress <= 0 || progress >= 1) return;
  const r = easeOutExpo(progress) * maxR;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.globalAlpha = 1 - progress;
  ctx.lineWidth = Math.max(1, lineW * (1 - progress));
  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawVoronoiShards(ctx, cx, cy, progress, count, seed, fill = '#04050a', stroke = '#00f0ff') {
  const r = mulberry32(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const dist = easeOutExpo(progress) * (180 + r() * 920);
    const sx = cx + Math.cos(a) * dist;
    const sy = cy + Math.sin(a) * dist;
    const sz = (18 + r() * 70) * (1 - progress * 0.35);
    const rot = r() * Math.PI * 2 + progress * (r() - 0.5) * 6;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-sz, -sz * 0.3);
    ctx.lineTo(sz * 0.85, -sz * 0.65);
    ctx.lineTo(sz * 0.4, sz * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawStarGlint(ctx, cx, cy, size, color = '#00f0ff', alpha = 1.0) {
  if (size <= 1 || alpha <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = color;
  ctx.shadowBlur = 38;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.09, -size * 0.09);
  ctx.lineTo(size * 2.3, 0);
  ctx.lineTo(size * 0.09, size * 0.09);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.09, size * 0.09);
  ctx.lineTo(-size * 2.3, 0);
  ctx.lineTo(-size * 0.09, -size * 0.09);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRainAndEmbers(ctx, t, slowMo = 0, rainAlpha = 1.0, emberBoost = 1.0) {
  ctx.save();
  const speedMul = 1 - slowMo * 0.96;
  const slant = -0.22;
  if (rainAlpha > 0.01) {
    for (const d of RAIN) {
      const prog = t * d.speed * speedMul;
      const y = ((d.y + prog) % (H + 200)) - 100;
      const x = ((d.x + prog * slant) % (W + 400) + (W + 400)) % (W + 400) - 200;
      const len = d.len * (slowMo > 0.5 ? 0.16 : 1.0);
      ctx.strokeStyle = `rgba(200, 235, 255, ${d.alpha * rainAlpha})`;
      ctx.lineWidth = d.width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * slant, y + len);
      ctx.stroke();
      if (slowMo > 0.45) {
        ctx.fillStyle = `rgba(180, 248, 255, ${0.65 * slowMo})`;
        ctx.beginPath();
        ctx.arc(x, y, d.width * 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.globalCompositeOperation = 'lighter';
  const eScale = 1 - slowMo * 0.92;
  for (const e of EMBERS) {
    const ex = ((e.x + e.vx * t * eScale) % W + W) % W;
    const ey = ((e.y + e.vy * t * eScale + Math.sin(t * 3 + e.phase) * 28) % H + H) % H;
    const glow = 0.4 + 0.6 * Math.sin(t * 6 + e.phase);
    ctx.fillStyle = e.warm
      ? `rgba(255, ${Math.floor(85 + glow * 125)}, 35, ${clamp((0.32 + glow * 0.5) * emberBoost, 0, 1)})`
      : `rgba(0, 240, 255, ${clamp((0.28 + glow * 0.5) * emberBoost, 0, 1)})`;
    ctx.beginPath();
    ctx.arc(ex, ey, e.r * (0.75 + glow * 0.55), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ============================================================================
// REAL PER-PIXEL ARTWORK-DERIVED SAKUGA IMPACT FILTERS + CHROMATIC ABERRATION
// ============================================================================
function applySakugaImpactFilter(ctx, mode) {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    if (mode === 'bw') {
      // Iconic Jujutsu Kaisen / One Piece stark black-and-white ink impact frame!
      const v = lum > 112 ? 255 : 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
    } else if (mode === 'crimson') {
      // Blood-crimson & pitch-black high-contrast negative flash!
      if (lum > 145) {
        d[i] = 255;
        d[i + 1] = 230;
        d[i + 2] = 170;
      } else if (lum > 72) {
        d[i] = 255;
        d[i + 1] = 20;
        d[i + 2] = 58;
      } else {
        d[i] = 6;
        d[i + 1] = 2;
        d[i + 2] = 6;
      }
    } else if (mode === 'cyan') {
      // Inverted electric-cyan & obsidian negative flash!
      if (lum > 130) {
        d[i] = 5;
        d[i + 1] = 8;
        d[i + 2] = 18;
      } else if (lum > 52) {
        d[i] = 0;
        d[i + 1] = 240;
        d[i + 2] = 255;
      } else {
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function applyChromaticAberration(ctx, shiftPx) {
  const s = Math.round(shiftPx);
  if (s <= 0) return;
  const img = ctx.getImageData(0, 0, W, H);
  const src = new Uint8ClampedArray(img.data);
  const dst = img.data;
  const stride = W * 4;
  for (let y = 0; y < H; y++) {
    const row = y * stride;
    for (let x = 0; x < W; x++) {
      const i = row + x * 4;
      const rx = Math.min(W - 1, x + s);
      const bx = Math.max(0, x - s);
      dst[i] = src[row + rx * 4];
      dst[i + 2] = src[row + bx * 4 + 2];
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Draws an artwork with camera transform + optional directional whip-pan motion blur!
function drawShot(ctx, img, { zoom = 1.05, panX = 0, panY = 0, tilt = 0, shakeX = 0, shakeY = 0, whipBlur = 0, brightness = 1.0 } = {}) {
  const drawOnce = (ox, oy, alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W * 0.5 + shakeX + ox, H * 0.5 + shakeY + oy);
    ctx.rotate(tilt);
    ctx.scale(zoom, zoom);
    ctx.translate(-W * 0.5 - panX, -H * 0.5 - panY);
    // Cover-fit 1376x768 cleanly onto 1920x1080
    const scale = Math.max(W / img.width, H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (W - dw) * 0.5, (H - dh) * 0.5, dw, dh);
    ctx.restore();
  };

  if (whipBlur > 0.5) {
    drawOnce(-whipBlur * 1.4, 0, 0.35);
    drawOnce(-whipBlur * 0.7, 0, 0.55);
    drawOnce(0, 0, 0.9);
    drawOnce(whipBlur * 0.7, 0, 0.45);
  } else {
    drawOnce(0, 0, 1.0);
  }

  if (brightness > 1.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255, 255, 255, ${clamp((brightness - 1) * 0.35, 0, 0.5)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ============================================================================
// MAIN RENDERER
// ============================================================================
async function main() {
  const names = [
    'shot01_standoff',
    'shot02_eye_clash',
    'shot02b_dash',
    'shot03_blade_clash',
    'shot04_oni_cleave',
    'shot05_aerial_flurry',
    'shot06_overdrive',
    'shot07_iaijutsu_counter',
    'shot08_finale_sever',
  ];
  const shots = {};
  for (const n of names) {
    shots[n] = await loadImage(path.join(ART_DIR, `${n}.png`));
  }

  const mainCanvas = createCanvas(W, H);
  const ctx = mainCanvas.getContext('2d');

  // 9 Keyframes across the whole 22s anime short for visual QA contact sheet
  const KEYFRAMES = [
    { frame: 30, name: '01_standoff_title' },      // 1.25s
    { frame: 66, name: '02_eye_clash' },           // 2.75s
    { frame: 102, name: '03_supersonic_dash' },    // 4.25s
    { frame: 121, name: '04_clash_impact_bw' },    // 5.04s — Real artwork-derived Sakuga Impact!
    { frame: 132, name: '05_blade_clash_live' },   // 5.50s — Live slashes + frame-break sparks
    { frame: 204, name: '06_oni_ground_shatter' }, // 8.50s
    { frame: 274, name: '07_aerial_7slash' },      // 11.42s
    { frame: 404, name: '08_screen_tear_sever' },  // 16.83s — Physical screen-tear bisection!
    { frame: 462, name: '09_sheathe_finale' },     // 19.25s — Katana sheathe glint finale
  ];
  const KF_MAP = new Map(KEYFRAMES.map((k) => [k.frame, k]));
  const thumbs = new Map();

  console.log(`Rendering ${TOTAL_FRAMES} frames (${DURATION}s @ ${FPS}fps, ${W}x${H}) -> ${OUT_MP4}`);
  const ffArgs = [
    '-y',
    '-f', 'rawvideo',
    '-pixel_format', 'rgba',
    '-video_size', `${W}x${H}`,
    '-framerate', String(FPS),
    '-i', 'pipe:0',
    '-i', AUDIO_WAV,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '21',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-shortest',
    OUT_MP4,
  ];
  const ff = spawn(FFMPEG_BIN, ffArgs, { stdio: ['pipe', 'inherit', 'pipe'] });
  let ffStderr = '';
  ff.stderr.on('data', (c) => (ffStderr += c.toString()));

  const t0Wall = Date.now();

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / FPS;
    const shRng = mulberry32(f * 1013 + 7);
    const breakOverlays = [];

    let impactFilter = null; // null | 'bw' | 'crimson' | 'cyan'
    let chroma = 0;
    let slowMo = 0;
    let rainAlpha = 0.85;
    let emberBoost = 1.0;
    let overdriveBars = false;

    ctx.fillStyle = '#040408';
    ctx.fillRect(0, 0, W, H);

    // ========================================================================
    // 11-BEAT HYPER-KINETIC STUDIO ANIME EDITING & CHOREOGRAPHY
    // ========================================================================
    if (t < 2.50) {
      // BEAT 1: Blood Eclipse Standoff (0.0s - 2.50s)
      const p = t / 2.50;
      const shake = t >= 1.20 && t < 1.45 ? 16 * (1 - (t - 1.20) / 0.25) : 0;
      drawShot(ctx, shots.shot01_standoff, {
        zoom: lerp(1.04, 1.15, easeInOutCubic(p)),
        panY: lerp(12, -16, p),
        shakeX: (shRng() - 0.5) * shake,
        shakeY: (shRng() - 0.5) * shake,
      });
      // Pulsing Blood Eclipse corona bloom + cyan katana spark pulse
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const eg = ctx.createRadialGradient(W * 0.5, 195, 30, W * 0.5, 195, 360);
      eg.addColorStop(0, `rgba(255, 38, 66, ${0.22 + 0.12 * Math.sin(t * 5)})`);
      eg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = eg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      chroma = t >= 1.20 && t < 1.38 ? 10 : 0;
    } else if (t < 3.70) {
      // BEAT 2: Split-Screen Anime Eye Clash (2.50s - 3.70s)
      const dt = t - 2.50;
      const p = dt / 1.20;
      const shake = dt < 0.25 ? 24 * (1 - dt / 0.25) : 4;
      drawShot(ctx, shots.shot02_eye_clash, {
        zoom: lerp(1.24, 1.07, easeOutExpo(p)),
        tilt: lerp(-0.04, 0.01, p),
        shakeX: (shRng() - 0.5) * shake,
        shakeY: (shRng() - 0.5) * shake,
        whipBlur: dt < 0.12 ? 32 * (1 - dt / 0.12) : 0,
      });
      // Live animated crimson-white lightning crackling down the center diagonal!
      drawLightningBolt(ctx, W * 0.59, -40, W * 0.37, H + 40, f * 7, '#ff1e42', 4.5, 38);
      drawSpeedlines(ctx, W * 0.5, H * 0.5, 38, f * 11, 'rgba(255,255,255,0.14)', 320, 1300);
      rainAlpha = 0.45;
      chroma = dt < 0.25 ? 10 : 4;
    } else if (t < 5.00) {
      // BEAT 3: Supersonic Iaijutsu Lightning Dash (3.70s - 5.00s)
      const dt = t - 3.70;
      const p = dt / 1.30;
      const shake = 8 + p * 16;
      drawShot(ctx, shots.shot02b_dash, {
        zoom: lerp(1.06, 1.34, easeInOutCubic(p)),
        panX: lerp(-35, 95, p),
        panY: lerp(15, -20, p),
        tilt: lerp(0.01, -0.055, p),
        shakeX: (shRng() - 0.5) * shake,
        shakeY: (shRng() - 0.5) * shake,
        whipBlur: p > 0.72 ? (p - 0.72) * 140 : dt < 0.12 ? 28 : 0,
      });
      // Crackling animated electric-cyan speed streaks & lightning whips
      drawLightningBolt(ctx, 0, 260 + Math.sin(t * 24) * 80, 1180, 520, f * 5, '#00f0ff', 4, 58);
      drawSpeedlines(ctx, 1280, 480, 55, f * 13, 'rgba(0, 240, 255, 0.22)', 260, 1400);
      breakOverlays.push(() => {
        if (p > 0.45) {
          drawSlashArc(ctx, -60, 740, 780, 520, W + 60, 390, 44 * p, '#00f0ff', '#ffffff', 0.78);
        }
      });
      chroma = 4 + p * 9;
    } else if (t < 7.40) {
      // BEAT 4: DEAD-CENTER EXPLOSIVE BLADE CLASH + ARTWORK IMPACT FRAMES! (5.00s - 7.40s)
      const dt = t - 5.00;
      const p = dt / 2.40;
      if (dt < 0.06) impactFilter = 'bw';
      else if (dt < 0.12) impactFilter = 'crimson';
      else if (dt < 0.18) impactFilter = 'cyan';

      const shake = dt < 0.65 ? 36 * (1 - dt / 0.65) : Math.abs(t - 6.55) < 0.18 ? 18 : 5;
      drawShot(ctx, shots.shot03_blade_clash, {
        zoom: dt < 0.35 ? lerp(1.36, 1.18, dt / 0.35) : lerp(1.18, 1.07, (dt - 0.35) / 2.05),
        tilt: lerp(-0.06, 0.035, p),
        shakeX: (shRng() - 0.5) * shake,
        shakeY: (shRng() - 0.5) * shake,
        brightness: dt < 0.25 ? 1.7 : 1.05,
      });

      const cx = W * 0.5;
      const cy = H * 0.48;
      if (impactFilter) {
        drawSpeedlines(ctx, cx, cy, 85, f * 19, impactFilter === 'bw' ? '#000000' : '#ffffff', 220, 1400);
      }

      breakOverlays.push(() => {
        drawShockwaveRing(ctx, cx, cy, dt / 0.9, 880, '#ffffff', 20);
        drawShockwaveRing(ctx, cx, cy, (dt - 0.10) / 1.1, 1020, '#00f0ff', 12);
        drawShockwaveRing(ctx, cx, cy, (dt - 0.18) / 1.2, 1120, '#ff244c', 10);
        if (dt < 1.8) {
          drawSlashArc(ctx, 520, 990, 820, 520, 1340, 75, 52 * clamp(1 - dt * 0.45, 0.2, 1), '#00f0ff', '#ffffff', clamp(1 - dt * 0.45, 0, 1));
          drawSlashArc(ctx, 1410, 990, 1100, 510, 600, 70, 58 * clamp(1 - dt * 0.45, 0.2, 1), '#ff244c', '#ffb800', clamp(1 - dt * 0.45, 0, 1));
          drawLightningBolt(ctx, cx, cy, cx + (shRng() - 0.5) * 850, cy - 340, f * 3, '#00f0ff', 3.5, 62);
          drawLightningBolt(ctx, cx, cy, cx + (shRng() - 0.5) * 850, cy + 320, f * 5, '#ff244c', 3.5, 62);
        }
        drawSparks(ctx, cx, cy, (dt % 0.85) / 0.85, 65, 500 + Math.floor(dt * 4), '#ffffff', dt % 0.2 < 0.1 ? '#00f0ff' : '#ffb800', 760);
      });
      chroma = dt < 0.45 ? 15 : 4;
      emberBoost = 1.6;
    } else if (t < 8.10) {
      // BEAT 5: Rapid Anime Reaction Punch-In on Oni-Zero's Demon Eye (7.40s - 8.10s)
      const dt = t - 7.40;
      const p = dt / 0.70;
      const shake = 12;
      drawShot(ctx, shots.shot02_eye_clash, {
        zoom: lerp(1.72, 1.98, p),
        panX: 340, // Focus tight on Oni-Zero's cracked crimson eye!
        panY: -10,
        tilt: lerp(0.05, 0.09, p),
        shakeX: (shRng() - 0.5) * shake,
        shakeY: (shRng() - 0.5) * shake,
        whipBlur: dt < 0.08 ? 36 : 0,
      });
      drawSpeedlines(ctx, W * 0.52, H * 0.48, 48, f * 23, 'rgba(255, 36, 76, 0.3)', 220, 1200);
      overdriveBars = true;
      chroma = 8;
    } else if (t < 10.30) {
      // BEAT 6: ONI-ZERO COLOSSAL BRIDGE SHATTER CLEAVE (8.10s - 10.30s)
      const dt = t - 8.10;
      const p = dt / 2.20;
      if (dt < 0.06) impactFilter = 'bw';
      else if (dt < 0.14) impactFilter = 'crimson';

      const shake = dt < 0.75 ? 42 * (1 - dt / 0.75) : 6;
      drawShot(ctx, shots.shot04_oni_cleave, {
        zoom: lerp(1.28, 1.12, easeOutExpo(p)),
        panY: lerp(42, -24, p),
        tilt: lerp(0.05, -0.025, p),
        shakeX: (shRng() - 0.5) * shake,
        shakeY: (shRng() - 0.5) * shake * 1.35,
      });
      breakOverlays.push(() => {
        if (dt < 1.1) {
          drawSlashArc(ctx, 1180, 40, 760, 440, 880, 990, 92 * (1 - dt / 1.1), '#ff1e42', '#ffb800', 1 - dt / 1.1);
          drawShockwaveRing(ctx, 880, 780, dt / 0.95, 920, '#ff244c', 18);
          drawSparks(ctx, 880, 760, dt / 1.1, 75, 810, '#ffb800', '#ff1e42', 780);
          drawVoronoiShards(ctx, 880, 720, dt / 1.1, 22, 815, '#12080e', '#ff244c');
        }
      });
      overdriveBars = true;
      chroma = dt < 0.45 ? 14 : 4;
      emberBoost = 1.9;
    } else if (t < 12.80) {
      // BEAT 7: 7-SLASH SUPERSONIC AERIAL CRESCENT BARRAGE! (10.30s - 12.80s)
      const dt = t - 10.30;
      const p = dt / 2.50;
      const slashSpecs = [
        { t0: 10.45, x1: 180, y1: 180, cx: 880, cy: 140, x2: 1680, y2: 560 },
        { t0: 10.72, x1: 1620, y1: 240, cx: 920, cy: 520, x2: 260, y2: 780 },
        { t0: 10.98, x1: 280, y1: 760, cx: 860, cy: 260, x2: 1600, y2: 180 },
        { t0: 11.24, x1: 1580, y1: 190, cx: 1060, cy: 620, x2: 380, y2: 460 },
        { t0: 11.50, x1: 420, y1: 320, cx: 1020, cy: 240, x2: 1580, y2: 760, parry: true },
        { t0: 11.78, x1: 1560, y1: 720, cx: 940, cy: 480, x2: 420, y2: 140, parry: true },
        { t0: 12.06, x1: 460, y1: 160, cx: 1040, cy: 480, x2: 1540, y2: 880, parry: true },
      ];

      let recentSlash = 0;
      for (const s of slashSpecs) {
        const age = t - s.t0;
        if (age >= 0 && age < 0.16) recentSlash = Math.max(recentSlash, 1 - age / 0.16);
        if (s.parry && age >= 0 && age < 0.045) impactFilter = 'cyan';
      }

      const shake = 8 + recentSlash * 22;
      drawShot(ctx, shots.shot05_aerial_flurry, {
        zoom: lerp(1.12, 1.24, Math.sin(p * Math.PI)),
        panX: lerp(-90, 95, easeInOutCubic(p)),
        panY: lerp(-25, 25, p),
        tilt: lerp(-0.04, 0.045, p),
        shakeX: (shRng() - 0.5) * shake,
        shakeY: (shRng() - 0.5) * shake,
        whipBlur: dt < 0.10 ? 36 : recentSlash * 18,
      });

      breakOverlays.push(() => {
        for (const s of slashSpecs) {
          const age = t - s.t0;
          if (age >= 0 && age < 0.55) {
            const a = clamp(1 - age / 0.55, 0, 1);
            drawSlashArc(ctx, s.x1, s.y1, s.cx, s.cy, s.x2, s.y2, 68 * a, '#00f0ff', '#ffffff', a);
            if (s.parry && age < 0.35) {
              drawSparks(ctx, 1340, 640, age / 0.35, 42, Math.floor(s.t0 * 100), '#ffffff', '#ffb800', 560);
              drawShockwaveRing(ctx, 1340, 640, age / 0.32, 420, '#ffb800', 12);
            }
          }
        }
      });
      chroma = 4 + recentSlash * 10;
    } else if (t < 15.10) {
      // BEAT 8: CRIMSON ECLIPSE OVERDRIVE! (12.80s - 15.10s)
      const dt = t - 12.80;
      const p = dt / 2.30;
      if (dt < 0.05) impactFilter = 'crimson';
      const shake = 10 + p * 18;
      drawShot(ctx, shots.shot06_overdrive, {
        zoom: lerp(1.06, 1.30, easeInOutCubic(p)),
        panX: lerp(-45, 55, p),
        tilt: lerp(0.05, -0.075, p),
        shakeX: (shRng() - 0.5) * shake,
        shakeY: (shRng() - 0.5) * shake,
        whipBlur: dt < 0.10 ? 34 : 0,
      });
      // Live animated crimson-gold lightning pillars & pulsing blood-wave glare
      drawLightningBolt(ctx, 420, -20, 360, H + 20, f * 7, '#ff244c', 5.5, 52);
      drawLightningBolt(ctx, 1220, -20, 1280, H + 20, f * 11, '#ffb800', 4.5, 48);
      breakOverlays.push(() => {
        if (p > 0.45) {
          const wp = (p - 0.45) / 0.55;
          drawSlashArc(ctx, 1680, 60, 1260 - wp * 380, 560, 260, 990, 95 * wp, '#ff143c', '#ffd166', 0.85 * wp);
        }
      });
      overdriveBars = true;
      chroma = 6 + p * 10;
      emberBoost = 2.0;
    } else if (t < 16.75) {
      // BEAT 9: BULLET-TIME SILENCE — KATANA HILT CLOSE-UP (15.10s - 16.75s)
      const dt = t - 15.10;
      const p = dt / 1.65;
      slowMo = 1.0;
      rainAlpha = 0.7;
      drawShot(ctx, shots.shot07_iaijutsu_counter, {
        zoom: lerp(1.03, 1.20, p),
        panX: lerp(-25, 35, p),
        panY: lerp(10, -12, p),
        tilt: lerp(-0.015, 0.015, p),
      });
      // Building blinding cyan star glint right on the exposed steel edge!
      const glint = smoothstep(0.32, 0.96, p);
      drawStarGlint(ctx, 1345 + p * 18, 635 - p * 8, 165 * glint, '#00f0ff', glint);
      chroma = glint > 0.7 ? 4 : 0;
    } else if (t < 17.55) {
      // BEAT 10: ZERO-POINT SCREEN-TEAR BISECTION + ULTIMATE "斬" SAKUGA IMPACT!! (16.75s - 17.55s)
      const dt = t - 16.75;
      if (dt < 0.34) {
        // PHYSICAL DIAGONAL SCREEN-TEAR BISECTION OF ONI-ZERO'S OVERDRIVE WAVE!
        const sp = easeOutExpo(dt / 0.34);
        const shift = sp * 115;

        // Blinding electric-cyan & white plasma void exposed behind the tear!
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(0, 0, W, H);

        // Top half of sliced screen rockets UP-LEFT
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W, 0);
        ctx.lineTo(W, H * 0.42);
        ctx.lineTo(0, H * 0.62);
        ctx.closePath();
        ctx.clip();
        drawShot(ctx, shots.shot06_overdrive, { zoom: 1.14, panX: shift, panY: shift * 0.35 });
        ctx.restore();

        // Bottom half of sliced screen rockets DOWN-RIGHT
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, H * 0.62);
        ctx.lineTo(W, H * 0.42);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.clip();
        drawShot(ctx, shots.shot06_overdrive, { zoom: 1.14, panX: -shift, panY: -shift * 0.35 });
        ctx.restore();

        breakOverlays.push(() => {
          // Razor electric-cyan & white plasma beam tearing straight across the screen!
          drawSlashArc(ctx, -80, H * 0.63, W * 0.5, H * 0.52, W + 80, H * 0.41, 120 * (1 - sp * 0.2), '#00f0ff', '#ffffff', 1.0);
          drawVoronoiShards(ctx, W * 0.5, H * 0.52, sp * 0.7, 36, 1675, '#060812', '#00f0ff');
          drawSparks(ctx, W * 0.5, H * 0.52, sp, 85, 1680, '#ffffff', '#00f0ff', 880);
        });
        rainAlpha = 0;
        chroma = 18;
      } else if (dt < 0.54) {
        // PURE WHITE IMPACT FRAME + GIANT HAND-BRUSHED KANJI "斬" (SLASH) BREAKING OVER BARS!
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        drawSpeedlines(ctx, W * 0.5, H * 0.5, 110, f * 29, '#000000', 210, 1450);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(0, H * 0.54);
        ctx.lineTo(W, H * 0.44);
        ctx.lineTo(W, H * 0.50);
        ctx.lineTo(0, H * 0.60);
        ctx.closePath();
        ctx.fill();
        breakOverlays.push(() => {
          drawKanjiSlash(ctx, W * 0.5, H * 0.5, 560, '#000000', '#00f0ff');
        });
        rainAlpha = 0;
        chroma = 14;
      } else {
        // ARTWORK-DERIVED INVERTED CYAN -> B&W FINALE IMPACT FRAMES!
        impactFilter = dt < 0.65 ? 'cyan' : 'bw';
        drawShot(ctx, shots.shot08_finale_sever, {
          zoom: 1.24,
          shakeX: (shRng() - 0.5) * 38,
          shakeY: (shRng() - 0.5) * 38,
        });
        breakOverlays.push(() => {
          drawKanjiSlash(ctx, W * 0.5, H * 0.5, 420, '#ffffff', '#ff244c');
          drawShockwaveRing(ctx, W * 0.5, H * 0.5, (dt - 0.54) / 0.25, 1050, '#00f0ff', 18);
          drawVoronoiShards(ctx, W * 0.5, H * 0.5, (dt - 0.54) / 0.25, 34, 1730, '#ff1e42', '#ffb800');
        });
        rainAlpha = 0;
        chroma = 16;
      }
    } else {
      // BEAT 11: ICONIC ANIME FINALE — KATANA SHEATHE GLINT & DELAYED SHATTER (17.55s - 22.00s)
      const dt = t - 17.55;
      const p = dt / 4.45;
      const clickShake = t >= 19.45 && t < 19.95 ? 24 * (1 - (t - 19.45) / 0.5) : dt < 0.45 ? 18 * (1 - dt / 0.45) : 0;
      drawShot(ctx, shots.shot08_finale_sever, {
        zoom: lerp(1.20, 1.04, easeOutExpo(p)),
        panX: lerp(35, 0, p),
        panY: lerp(-12, 0, p),
        shakeX: (shRng() - 0.5) * clickShake,
        shakeY: (shRng() - 0.5) * clickShake,
      });

      // Lingering electric-cyan severance flash fading across sky right after beat 10
      if (dt < 0.9) {
        const a = 1 - dt / 0.9;
        breakOverlays.push(() => {
          drawSlashArc(ctx, -60, 620, 660, 380, 1260, 210, 65 * a, '#00f0ff', '#ffffff', a);
        });
      }

      // Bright 4-point cyan star-glint right on Kage's katana hilt at the exact *CLICK* (19.20s)!
      if (t >= 19.12 && t < 19.72) {
        const gp = 1 - Math.abs((t - 19.30) / 0.32);
        if (gp > 0) drawStarGlint(ctx, 1418, 578, 125 * gp, '#00f0ff', gp);
      }

      // Delayed crimson-gold energy shatter bursting behind Kage off Oni-Zero at 19.45s!
      if (t >= 19.45 && t < 21.0) {
        const sp = clamp((t - 19.45) / 1.45, 0, 1);
        breakOverlays.push(() => {
          drawShockwaveRing(ctx, 430, 635, sp, 640, '#ff244c', 14);
          drawVoronoiShards(ctx, 430, 635, sp, 26, 1945, '#ff1e42', '#ffb800');
          drawSparks(ctx, 430, 635, sp, 58, 1950, '#ffb800', '#ff244c', 620);
        });
      }
      chroma = t >= 19.45 && t < 19.85 ? 12 : dt < 0.35 ? 10 : 0;
    }

    // Apply real per-pixel artwork-derived Sakuga Impact Filter when active!
    if (impactFilter) {
      applySakugaImpactFilter(ctx, impactFilter);
    } else {
      // Live 24fps rain, embers, animated film grain on 2s, and cinema vignette
      drawRainAndEmbers(ctx, t, slowMo, rainAlpha, emberBoost);
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.drawImage(GRAIN_TILES[Math.floor(f / 2) % GRAIN_TILES.length], 0, 0, W, H);
      ctx.restore();

      const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.36, W * 0.5, H * 0.5, W * 0.65);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.52)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
    }

    // 2.39:1 Anamorphic Cinema Letterbox Bars (BEFORE frame-break overlays!)
    ctx.fillStyle = '#030306';
    ctx.fillRect(0, 0, W, BAR_H);
    ctx.fillRect(0, H - BAR_H, W, BAR_H);
    ctx.fillStyle = overdriveBars ? 'rgba(255, 36, 76, 0.55)' : 'rgba(0, 240, 255, 0.26)';
    ctx.fillRect(0, BAR_H - 1.5, W, 1.5);
    ctx.fillRect(0, H - BAR_H, W, 1.5);

    // Frame-Break Hero VFX ripping OVER the letterbox bars!
    for (const fn of breakOverlays) fn();

    // Sliced Kinetic Title Card (0.55s - 2.35s, sliced cleanly at 1.20s!)
    if (t >= 0.55 && t < 2.35) {
      const enter = easeOutExpo((t - 0.55) / 0.30);
      const exit = 1 - smoothstep(1.95, 2.35, t);
      const slice = t >= 1.20 ? easeOutExpo((t - 1.20) / 0.22) : 0;
      ctx.save();
      ctx.globalAlpha = enter * exit;
      ctx.font = '900 84px "DejaVu Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, 240);
      ctx.clip();
      ctx.translate(-slice * 18, -slice * 5);
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(4, 4, 10, 0.85)';
      ctx.strokeText('KAGE // CRIMSON ECLIPSE', W * 0.5, 240);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 24;
      ctx.fillText('KAGE // CRIMSON ECLIPSE', W * 0.5, 240);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 240, W, 180);
      ctx.clip();
      ctx.translate(slice * 20, slice * 5);
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(4, 4, 10, 0.85)';
      ctx.strokeText('KAGE // CRIMSON ECLIPSE', W * 0.5, 240);
      ctx.fillStyle = '#ff244c';
      ctx.shadowColor = '#ff1e42';
      ctx.shadowBlur = 24;
      ctx.fillText('KAGE // CRIMSON ECLIPSE', W * 0.5, 240);
      ctx.restore();

      if (t >= 1.18 && t < 1.52) {
        const fp = 1 - (t - 1.18) / 0.34;
        drawSlashArc(ctx, 260, 252, W * 0.5, 240, W - 260, 228, 28 * fp, '#00f0ff', '#ffffff', fp);
      }
      ctx.restore();
    }

    // Opening fade-in (0.0s - 0.30s) & Finale End-Card Fade-Out (20.65s - 22.00s)
    if (t < 0.30) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - t / 0.30})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (t >= 20.65) {
      const fade = smoothstep(20.70, 21.80, t);
      ctx.fillStyle = `rgba(3, 3, 6, ${fade * 0.94})`;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = smoothstep(20.75, 21.25, t) * (1 - smoothstep(21.75, 22.0, t));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 58px "DejaVu Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.fillText('KAGE // CRIMSON ECLIPSE', W * 0.5, H * 0.47);
      ctx.shadowBlur = 0;
      ctx.font = '700 20px "DejaVu Sans Mono", monospace';
      ctx.fillStyle = '#ff244c';
      ctx.fillText('FIN', W * 0.5, H * 0.54);
      ctx.restore();
    }

    // Per-Pixel RGB Chromatic Aberration Split on impacts & overdrive!
    if (chroma >= 4) {
      applyChromaticAberration(ctx, chroma);
    }

    if (KF_MAP.has(f)) {
      const kf = KF_MAP.get(f);
      fs.writeFileSync(path.join(STILLS_DIR, `${kf.name}.png`), mainCanvas.toBuffer('image/png'));
      const thumb = createCanvas(640, 360);
      thumb.getContext('2d').drawImage(mainCanvas, 0, 0, 640, 360);
      thumbs.set(f, thumb);
    }

    const raw = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(raw)) {
      await new Promise((resolve) => ff.stdin.once('drain', resolve));
    }

    if ((f + 1) % 66 === 0 || f === TOTAL_FRAMES - 1) {
      const el = ((Date.now() - t0Wall) / 1000).toFixed(1);
      console.log(`  frame ${f + 1}/${TOTAL_FRAMES} (${(((f + 1) / TOTAL_FRAMES) * 100).toFixed(0)}%)  [${el}s]`);
    }
  }

  ff.stdin.end();
  const exitCode = await new Promise((resolve) => ff.on('close', resolve));
  if (exitCode !== 0) {
    console.error('ffmpeg failed:\n', ffStderr.slice(-2000));
    process.exit(exitCode);
  }

  // Build 3x3 visual QA contact sheet
  const sheet = createCanvas(1920, 1080);
  const sctx = sheet.getContext('2d');
  sctx.fillStyle = '#050508';
  sctx.fillRect(0, 0, 1920, 1080);
  KEYFRAMES.forEach((kf, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const thumb = thumbs.get(kf.frame);
    if (thumb) {
      sctx.drawImage(thumb, col * 640, row * 360, 640, 360);
      sctx.fillStyle = 'rgba(0,0,0,0.68)';
      sctx.fillRect(col * 640 + 8, row * 360 + 8, 270, 26);
      sctx.fillStyle = '#00f0ff';
      sctx.font = '700 15px "DejaVu Sans Mono", monospace';
      sctx.fillText(`f${kf.frame} (${(kf.frame / FPS).toFixed(2)}s) ${kf.name}`, col * 640 + 14, row * 360 + 26);
    }
  });
  fs.writeFileSync(CONTACT_SHEET, sheet.toBuffer('image/png'));

  const stat = fs.statSync(OUT_MP4);
  console.log(`Done! Video: ${OUT_MP4} (${(stat.size / (1024 * 1024)).toFixed(2)} MB) | Contact sheet: ${CONTACT_SHEET}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
