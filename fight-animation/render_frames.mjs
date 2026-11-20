#!/usr/bin/env node
/**
 * KAGE // CRIMSON ECLIPSE — 24s @ 24fps (576 frames) 1920x1080 2D Sakuga Fight Short
 * v2 Master Cut: Sculpted Cel-Shaded Anime Silhouettes + Swept Kabuto Demon Horns +
 * Organic Martial-Arts IK + Sumi-e Ink Splatters + Spider-Verse Halftones +
 * 2.39:1 Frame-Break Cinema Bars + Chromatic Aberration RGB Split.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CANVAS_PKG = process.env.CANVAS_PKG || '/tmp/animnode/node_modules/@napi-rs/canvas';
const { createCanvas } = require(CANVAS_PKG);

const W = 1920;
const H = 1080;
const FPS = 24;
const DURATION = 24.0;
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 576
const BAR_H = 128;

const OUT_MP4 = process.argv[2] || 'fight-animation/final/kage_crimson_eclipse.mp4';
const AUDIO_WAV = process.argv[3] || '/tmp/kage_audio.wav';
const FFMPEG_BIN = process.env.FFMPEG || 'ffmpeg';
const STILLS_DIR = process.env.STILLS_DIR || 'fight-animation/stills';
const CONTACT_SHEET = process.env.CONTACT_SHEET || 'fight-animation/preview_contact_sheet.png';

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

// Analytical 2-bone IK solver in 2D
function solveIK(ax, ay, tx, ty, l1, l2, bendDir = 1) {
  const dx = tx - ax;
  const dy = ty - ay;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const d = clamp(dist, Math.abs(l1 - l2) + 0.001, l1 + l2 - 0.001);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const baseAng = Math.atan2(dy, dx);
  const ang = baseAng + bendDir * Math.acos(cosA);
  return {
    jx: ax + Math.cos(ang) * l1,
    jy: ay + Math.sin(ang) * l1,
    ex: ax + (dx / dist) * d,
    ey: ay + (dy / dist) * d,
  };
}

// ============================================================================
// PRE-BAKED PROCEDURAL TEXTURES (Spider-Verse Halftone + Film Grain)
// ============================================================================
function buildHalftonePattern() {
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,0.24)';
  const spacing = 16;
  for (let y = 0; y < H; y += spacing) {
    const off = ((y / spacing) % 2) * (spacing * 0.5);
    for (let x = -spacing; x < W + spacing; x += spacing) {
      const nx = (x - W * 0.5) / (W * 0.5);
      const ny = (y - H * 0.5) / (H * 0.5);
      const rDist = Math.hypot(nx, ny);
      const rad = clamp((rDist - 0.38) * 4.4, 0.7, 4.5);
      g.beginPath();
      g.arc(x + off, y, rad, 0, Math.PI * 2);
      g.fill();
    }
  }
  return c;
}

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
      img.data[i + 3] = Math.floor(r() * 13);
    }
    g.putImageData(img, 0, 0);
    tiles.push(c);
  }
  return tiles;
}

const HALFTONE_CANVAS = buildHalftonePattern();
const GRAIN_TILES = buildGrainTiles();

const worldRng = mulberry32(424242);
const RAIN_DROPS = Array.from({ length: 240 }, () => ({
  x: worldRng() * (W + 400) - 200,
  y: worldRng() * H,
  len: 44 + worldRng() * 70,
  speed: 1500 + worldRng() * 900,
  alpha: 0.14 + worldRng() * 0.28,
  width: 0.9 + worldRng() * 1.4,
}));

const EMBERS = Array.from({ length: 130 }, () => ({
  x: worldRng() * W,
  y: worldRng() * H,
  r: 1.5 + worldRng() * 4.2,
  vx: -38 - worldRng() * 95,
  vy: -28 - worldRng() * 82,
  phase: worldRng() * Math.PI * 2,
  warm: worldRng() > 0.28,
}));

const SKYLINE = Array.from({ length: 26 }, (_, i) => ({
  x: i * 86 - 100,
  w: 64 + worldRng() * 72,
  h: 175 + worldRng() * 290,
  pagoda: worldRng() > 0.58,
  neon: worldRng() > 0.54,
  neonCyan: worldRng() > 0.58,
  seed: Math.floor(worldRng() * 10000),
}));

const DEBRIS_CHUNKS = Array.from({ length: 24 }, (_, i) => ({
  x0: 760 + (worldRng() - 0.5) * 440,
  vx: (worldRng() - 0.5) * 340,
  vy: -540 - worldRng() * 540,
  rot: worldRng() * Math.PI * 2,
  vrot: (worldRng() - 0.5) * 8,
  size: 18 + worldRng() * 46,
  sides: 5 + Math.floor(worldRng() * 3),
}));

// ============================================================================
// HAND-BRUSHED CALLIGRAPHIC KANJI & SUMI-E INK SPLATTERS
// ============================================================================
function drawBrushStroke(ctx, pts, wStart, wMid, wEnd, color) {
  if (pts.length < 2) return;
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
      if (pts.length === 2) {
        return [lerp(pts[0][0], pts[1][0], t), lerp(pts[0][1], pts[1][1], t)];
      }
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
    ctx.shadowBlur = 32;
  }
  // 車
  drawBrushStroke(ctx, [[-82, -62], [-44, -68], [-8, -64]], 10, 14, 8, color);
  drawBrushStroke(ctx, [[-76, -34], [-72, -6], [-68, 22]], 9, 12, 7, color);
  drawBrushStroke(ctx, [[-74, -34], [-42, -38], [-14, -32]], 9, 13, 10, color);
  drawBrushStroke(ctx, [[-14, -32], [-18, -4], [-22, 20]], 11, 12, 7, color);
  drawBrushStroke(ctx, [[-68, -8], [-44, -10], [-20, -8]], 7, 10, 6, color);
  drawBrushStroke(ctx, [[-68, 18], [-44, 16], [-20, 18]], 8, 11, 7, color);
  drawBrushStroke(ctx, [[-88, 48], [-46, 42], [-4, 38]], 10, 14, 8, color);
  drawBrushStroke(ctx, [[-44, -92], [-46, -4], [-46, 92]], 13, 15, 6, color);
  // 斤
  drawBrushStroke(ctx, [[74, -84], [46, -68], [16, -54]], 13, 14, 6, color);
  drawBrushStroke(ctx, [[18, -56], [16, 12], [2, 78]], 12, 14, 4, color);
  drawBrushStroke(ctx, [[18, -14], [52, -20], [92, -22]], 11, 15, 9, color);
  drawBrushStroke(ctx, [[58, -16], [58, 38], [56, 98]], 14, 16, 5, color);

  const r = mulberry32(777);
  ctx.fillStyle = color;
  for (let i = 0; i < 28; i++) {
    const a = r() * Math.PI * 2;
    const d = 55 + r() * 82;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.5 + r() * 4.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Sumi-e calligraphic ink-splatter & stylized anime dust burst!
function drawInkBurst(ctx, cx, cy, progress, seed, color = '#06050a', rimColor = '#00f0ff', radius = 190) {
  if (progress <= 0 || progress >= 1) return;
  const r = mulberry32(seed);
  ctx.save();
  const alpha = 1 - progress;
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI * 0.95 + r() * Math.PI * 0.9;
    const d = easeOutExpo(progress) * (35 + r() * radius);
    const sx = cx + Math.cos(a) * d;
    const sy = cy + Math.sin(a) * d * 0.55;
    const rad = (8 + r() * 24) * (1 - progress * 0.5);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath();
    ctx.arc(sx, sy, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = alpha * 0.7;
    ctx.stroke();
  }
  ctx.restore();
}

// Varied stylized cyberpunk kanji-like neon signs (zero repeating crosses!)
function drawNeonSign(ctx, x, y, w, h, color, seed, alpha = 0.65) {
  const r = mulberry32(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(7, 5, 13, 0.88)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  const rows = Math.max(2, Math.floor((h - 14) / 24));
  for (let i = 0; i < rows; i++) {
    const gy = y + 14 + i * 23;
    const kind = Math.floor(r() * 4);
    ctx.beginPath();
    if (kind === 0) {
      // Stylized 'カ' / katakana angle
      ctx.moveTo(x + 5, gy);
      ctx.lineTo(x + w - 5, gy);
      ctx.lineTo(x + w - 8, gy + 13);
      ctx.moveTo(x + w * 0.45, gy - 4);
      ctx.lineTo(x + 7, gy + 14);
    } else if (kind === 1) {
      // Boxed kanji '口' / '日'
      ctx.rect(x + 6, gy - 2, w - 12, 13);
      ctx.moveTo(x + 6, gy + 5);
      ctx.lineTo(x + w - 6, gy + 5);
    } else if (kind === 2) {
      // Slash glyph '刀' / '刃'
      ctx.moveTo(x + 5, gy);
      ctx.lineTo(x + w - 5, gy - 2);
      ctx.lineTo(x + 8, gy + 14);
    } else {
      // Twin horizontal bars '二' / '三'
      ctx.moveTo(x + 7, gy);
      ctx.lineTo(x + w - 7, gy);
      ctx.moveTo(x + 5, gy + 7);
      ctx.lineTo(x + w - 5, gy + 7);
      ctx.moveTo(x + 8, gy + 13);
      ctx.lineTo(x + w - 8, gy + 13);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ============================================================================
// ENVIRONMENT: BLOOD ECLIPSE, NEO-EDO SKYLINE, TORII BRIDGE & FEATHERED PUDDLE REFLECTION
// ============================================================================
function drawEnvironment(ctx, t, opts = {}) {
  const { overdrive = 0, eclipsePulse = 0, bridgeCrack = 0, camX = 0, camY = 0, slowMo = 0 } = opts;
  const groundY = 815;

  // 1. Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (overdrive > 0.1) {
    sky.addColorStop(0, `rgb(${Math.floor(lerp(8, 42, overdrive))}, ${Math.floor(lerp(6, 4, overdrive))}, ${Math.floor(lerp(18, 12, overdrive))})`);
    sky.addColorStop(0.55, `rgb(${Math.floor(lerp(42, 140, overdrive))}, ${Math.floor(lerp(10, 12, overdrive))}, ${Math.floor(lerp(24, 24, overdrive))})`);
    sky.addColorStop(1, `rgb(${Math.floor(lerp(18, 58, overdrive))}, 6, 14)`);
  } else {
    sky.addColorStop(0, '#060510');
    sky.addColorStop(0.45, '#190817');
    sky.addColorStop(0.75, '#460c1f');
    sky.addColorStop(1, '#12060e');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(-350, -350, W + 700, H + 700);

  // 2. Massive Blood Eclipse
  const ex = W * 0.5 - camX * 0.12;
  const ey = 355 - camY * 0.1;
  const eRad = 225 + eclipsePulse * 35 + overdrive * 45 + Math.sin(t * 2.2) * 4;

  ctx.save();
  const corona = ctx.createRadialGradient(ex, ey, eRad * 0.85, ex, ey, eRad * 2.75);
  corona.addColorStop(0, overdrive > 0.3 ? 'rgba(255, 75, 45, 0.96)' : 'rgba(255, 34, 68, 0.78)');
  corona.addColorStop(0.28, 'rgba(210, 18, 50, 0.40)');
  corona.addColorStop(0.65, 'rgba(115, 8, 34, 0.14)');
  corona.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(ex, ey, eRad * 2.75, 0, Math.PI * 2);
  ctx.fill();

  if (overdrive > 0.05) {
    ctx.strokeStyle = `rgba(255, 184, 0, ${0.42 * overdrive})`;
    ctx.lineWidth = 3;
    for (let r = 1; r <= 4; r++) {
      ctx.beginPath();
      ctx.arc(ex, ey, eRad * (1.15 + r * 0.32) + ((t * 140) % 90), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Blazing corona flame ring
  ctx.strokeStyle = overdrive > 0.2 ? '#ffb800' : '#ff2a4d';
  ctx.lineWidth = 5.5;
  ctx.shadowColor = '#ff1e42';
  ctx.shadowBlur = 32;
  ctx.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const jitter =
      Math.sin(a * 9 + t * 2.8) * (7 + overdrive * 15) +
      Math.cos(a * 17 - t * 4.1) * (4 + overdrive * 9);
    const rr = eRad + 4 + jitter;
    const px = ex + Math.cos(a) * rr;
    const py = ey + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#050409';
  ctx.beginPath();
  ctx.arc(ex, ey, eRad, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffd6aa';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(ex, ey, eRad + 1, -1.15, 0.35);
  ctx.stroke();
  ctx.restore();

  // 3. Swirling mist bands across the eclipse
  ctx.save();
  ctx.fillStyle = 'rgba(12, 6, 18, 0.52)';
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 420 + t * (18 + i * 4)) % (W + 600)) - 300 - camX * 0.2;
    const cy = 225 + i * 52;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 260 + i * 24, 20 + (i % 3) * 9, -0.03, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Distant Neo-Edo Skyline + Pagodas
  ctx.save();
  const skyShiftX = -camX * 0.35;
  for (const b of SKYLINE) {
    const bx = b.x + skyShiftX;
    const by = groundY - b.h;
    ctx.fillStyle = '#080610';
    ctx.fillRect(bx, by, b.w, b.h + 40);
    ctx.fillStyle = 'rgba(255, 42, 77, 0.26)';
    ctx.fillRect(bx, by, b.w, 2);

    if (b.pagoda) {
      ctx.fillStyle = '#080610';
      for (let tier = 0; tier < 2; tier++) {
        const ty = by - tier * 38;
        const tw = b.w * (1.28 - tier * 0.22);
        const tx = bx + b.w * 0.5;
        ctx.beginPath();
        ctx.moveTo(tx - tw * 0.64, ty + 6);
        ctx.quadraticCurveTo(tx, ty - 28, tx + tw * 0.64, ty + 6);
        ctx.lineTo(tx + tw * 0.44, ty + 16);
        ctx.lineTo(tx - tw * 0.44, ty + 16);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (b.neon) {
      const nc = b.neonCyan ? '#00f0ff' : '#ff244c';
      drawNeonSign(ctx, bx + b.w * 0.2, by + 32, 26, Math.min(110, b.h * 0.48), nc, b.seed, 0.58);
    }
  }
  ctx.restore();

  // 5. Monumental Torii Gate behind the duelists
  ctx.save();
  const tx = W * 0.5 - camX * 0.65;
  const ty = groundY;
  ctx.fillStyle = '#11060c';
  ctx.strokeStyle = 'rgba(255, 36, 76, 0.38)';
  ctx.lineWidth = 2.2;
  const pillarSpan = 355;
  for (const side of [-1, 1]) {
    const px = tx + side * pillarSpan;
    ctx.beginPath();
    ctx.moveTo(px - 23, ty);
    ctx.lineTo(px - 15, ty - 425);
    ctx.lineTo(px + 15, ty - 425);
    ctx.lineTo(px + 23, ty);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillRect(tx - pillarSpan - 80, ty - 350, (pillarSpan + 80) * 2, 26);
  ctx.strokeRect(tx - pillarSpan - 80, ty - 350, (pillarSpan + 80) * 2, 26);
  ctx.beginPath();
  ctx.moveTo(tx - pillarSpan - 145, ty - 448);
  ctx.quadraticCurveTo(tx, ty - 406, tx + pillarSpan + 145, ty - 448);
  ctx.lineTo(tx + pillarSpan + 124, ty - 404);
  ctx.quadraticCurveTo(tx, ty - 376, tx - pillarSpan - 124, ty - 404);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1c0810';
  ctx.fillRect(tx - 24, ty - 400, 48, 66);
  ctx.strokeStyle = '#ff244c';
  ctx.strokeRect(tx - 24, ty - 400, 48, 66);
  ctx.restore();

  // 6. Wet Obsidian Bridge Deck with Feathered Radial Reflections (NO boxy rectangle!)
  ctx.save();
  const deckGrad = ctx.createLinearGradient(0, groundY, 0, H);
  deckGrad.addColorStop(0, '#170a14');
  deckGrad.addColorStop(0.28, '#0a0711');
  deckGrad.addColorStop(1, '#030307');
  ctx.fillStyle = deckGrad;
  ctx.fillRect(-400, groundY, W + 800, H - groundY + 300);

  // Soft feathered wet-mirror eclipse shimmer puddle
  const puddle = ctx.createRadialGradient(ex, groundY + 12, 20, ex, groundY + 95, 520);
  puddle.addColorStop(0, 'rgba(255, 34, 68, 0.34)');
  puddle.addColorStop(0.45, 'rgba(220, 20, 58, 0.14)');
  puddle.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = puddle;
  ctx.fillRect(-400, groundY, W + 800, H - groundY);

  // Horizontal wet water-ripple shimmer streaks across the reflection
  ctx.fillStyle = 'rgba(255, 70, 95, 0.16)';
  for (let i = 0; i < 14; i++) {
    const ry = groundY + 10 + i * 16;
    const rw = (360 - i * 18) + Math.sin(t * 4 + i * 1.7) * 28;
    ctx.fillRect(ex - rw * 0.5, ry, rw, 2.2);
  }

  // Horizon bridge rim
  ctx.strokeStyle = overdrive > 0.2 ? 'rgba(255, 165, 45, 0.72)' : 'rgba(255, 42, 77, 0.52)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-400, groundY);
  ctx.lineTo(W + 400, groundY);
  ctx.stroke();

  // Perspective bridge seams
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.065)';
  ctx.lineWidth = 1.4;
  for (let i = -8; i <= 8; i++) {
    const xTop = W * 0.5 + i * 140 - camX * 0.9;
    const xBot = W * 0.5 + i * 260 - camX * 1.15;
    ctx.beginPath();
    ctx.moveTo(xTop, groundY);
    ctx.lineTo(xBot, H + 80);
    ctx.stroke();
  }

  // Glowing molten magma cracks in deck after Act III slam
  if (bridgeCrack > 0.01) {
    ctx.save();
    ctx.strokeStyle = '#ff384c';
    ctx.shadowColor = '#ff1e42';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3.8 * bridgeCrack;
    const crackCx = 960;
    const branches = [
      [[0, 0], [-65, 28], [-155, 65], [-260, 120]],
      [[0, 0], [55, 32], [140, 74], [240, 130]],
      [[0, 0], [-18, 48], [-55, 125]],
      [[0, 0], [24, 54], [70, 140]],
      [[-65, 28], [-90, 78]],
      [[55, 32], [110, 45]],
    ];
    for (const br of branches) {
      ctx.beginPath();
      br.forEach(([dx, dy], idx) => {
        const px = crackCx + dx * bridgeCrack;
        const py = groundY + 12 + dy * bridgeCrack;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();

  // 7. Drifting Ash Embers
  ctx.save();
  const timeScale = 1 - slowMo * 0.92;
  for (const e of EMBERS) {
    const ex2 = ((e.x + e.vx * t * timeScale) % W + W) % W;
    const ey2 = ((e.y + e.vy * t * timeScale + Math.sin(t * 2 + e.phase) * 24) % H + H) % H;
    const glow = 0.4 + 0.6 * Math.sin(t * 5 + e.phase);
    ctx.fillStyle = e.warm
      ? `rgba(255, ${Math.floor(80 + glow * 115)}, 40, ${0.38 + glow * 0.5})`
      : `rgba(0, 240, 255, ${0.28 + glow * 0.45})`;
    ctx.beginPath();
    ctx.arc(ex2, ey2, e.r * (0.7 + glow * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRain(ctx, t, slowMo = 0, intensity = 1.0) {
  ctx.save();
  const speedMul = 1 - slowMo * 0.96;
  const slant = -0.22;
  for (const d of RAIN_DROPS) {
    const prog = t * d.speed * speedMul;
    const y = ((d.y + prog) % (H + 200)) - 100;
    const x = ((d.x + prog * slant) % (W + 400) + (W + 400)) % (W + 400) - 200;
    const len = d.len * (slowMo > 0.5 ? 0.22 : 1.0);
    ctx.strokeStyle = `rgba(195, 225, 255, ${d.alpha * intensity})`;
    ctx.lineWidth = d.width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len * slant, y + len);
    ctx.stroke();
  }
  const splashR = mulberry32(Math.floor(t * 12) * 31 + 7);
  ctx.strokeStyle = `rgba(200, 230, 255, ${0.20 * intensity})`;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 20; i++) {
    const sx = splashR() * W;
    const sy = 822 + splashR() * 135;
    const sr = 6 + splashR() * 22;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr, sr * 0.24, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ============================================================================
// SCULPTED CEL-SHADED 2D ANIME FIGHTERS (Organic Bezier Armor + Hakama + Swept Kabuto!)
// ============================================================================
function drawOrganicLimb(ctx, x1, y1, x2, y2, w1, w2, fill, shadeFill, rimColor, flare = 0) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const mx = (x1 + x2) * 0.5;
  const my = (y1 + y2) * 0.5;

  // Sculpted curved limb with subtle muscle/hakama cloth bulge
  ctx.beginPath();
  ctx.moveTo(x1 + nx * w1, y1 + ny * w1);
  ctx.quadraticCurveTo(mx + nx * (w1 + w2) * (0.58 + flare), my + ny * (w1 + w2) * (0.58 + flare), x2 + nx * w2, y2 + ny * w2);
  ctx.lineTo(x2 - nx * w2, y2 - ny * w2);
  ctx.quadraticCurveTo(mx - nx * (w1 + w2) * (0.52 + flare * 0.6), my - ny * (w1 + w2) * (0.52 + flare * 0.6), x1 - nx * w1, y1 - ny * w1);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  // Cel-shaded highlight band on front edge (gives 3D anime volume instead of flat wireframe!)
  if (shadeFill) {
    ctx.beginPath();
    ctx.moveTo(x1 + nx * w1, y1 + ny * w1);
    ctx.quadraticCurveTo(mx + nx * (w1 + w2) * (0.58 + flare), my + ny * (w1 + w2) * (0.58 + flare), x2 + nx * w2, y2 + ny * w2);
    ctx.lineTo(x2 + nx * w2 * 0.28, y2 + ny * w2 * 0.28);
    ctx.quadraticCurveTo(mx + nx * (w1 + w2) * 0.18, my + ny * (w1 + w2) * 0.18, x1 + nx * w1 * 0.28, y1 + ny * w1 * 0.28);
    ctx.closePath();
    ctx.fillStyle = shadeFill;
    ctx.fill();
  }

  // Crisp subtle key-rim stroke
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * w1, y1 + ny * w1);
  ctx.quadraticCurveTo(mx + nx * (w1 + w2) * (0.58 + flare), my + ny * (w1 + w2) * (0.58 + flare), x2 + nx * w2, y2 + ny * w2);
  ctx.stroke();
}

function drawFighter(ctx, cfg) {
  const {
    kind = 'kage',
    x,
    y,
    scale = 1.0,
    facing = 1,
    lean = 0.15,
    crouch = 0,
    airborne = 0,
    swordAngle = -0.5,
    swordGrip = 'front',
    lFootOff = [-44, 0],
    rFootOff = [46, 0],
    t = 0,
    alpha = 1.0,
    ghostColor = null,
    silhouetteMode = null,
    aura = 0,
  } = cfg;

  const isKage = kind === 'kage';
  const rim = ghostColor || (isKage ? '#00f0ff' : '#ff244c');
  const accent = ghostColor || (isKage ? '#8cf9ff' : '#ffb800');
  const bodyFill =
    silhouetteMode === 'white'
      ? '#ffffff'
      : silhouetteMode === 'black'
      ? '#000000'
      : ghostColor
      ? ghostColor
      : isKage
      ? '#090e18'
      : '#12060b';
  const celHighlight =
    silhouetteMode || ghostColor
      ? null
      : isKage
      ? 'rgba(0, 210, 255, 0.18)'
      : 'rgba(255, 42, 77, 0.22)';

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);

  // Wet ground shadow + faint cyan/crimson puddle reflection beneath boots
  if (!ghostColor && !silhouetteMode && airborne < 150) {
    const shScale = clamp(1 - airborne / 170, 0.2, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.beginPath();
    ctx.ellipse(0, 4 + airborne, 78 * shScale, 14 * shScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isKage ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 36, 76, 0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 12 + airborne, 54 * shScale, 8 * shScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const H_SCALE = isKage ? 1.04 : 1.24;
  const hipY = (-104 + crouch * 38) * H_SCALE;
  const hipX = crouch * 14;
  const torsoLen = 76 * H_SCALE;
  const shoulderX = hipX + Math.sin(lean) * torsoLen;
  const shoulderY = hipY - Math.cos(lean) * torsoLen;
  const headX = shoulderX + Math.sin(lean * 0.72) * 26 * H_SCALE;
  const headY = shoulderY - Math.cos(lean * 0.72) * 29 * H_SCALE;

  // Power aura glow behind fighter
  if (aura > 0.05 && !ghostColor) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ag = ctx.createRadialGradient(shoulderX, shoulderY + 20, 10, shoulderX, shoulderY + 20, 175 * H_SCALE);
    ag.addColorStop(0, isKage ? `rgba(0, 240, 255, ${0.42 * aura})` : `rgba(255, 36, 76, ${0.52 * aura})`);
    ag.addColorStop(0.5, isKage ? `rgba(0, 120, 255, ${0.18 * aura})` : `rgba(255, 160, 0, ${0.22 * aura})`);
    ag.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(shoulderX, shoulderY + 20, 175 * H_SCALE, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 1. FLOWING CLOTH BACK-LAYER (Sculpted Multi-Fold Scarf / Tattered Crimson Shogun Cape)
  ctx.save();
  if (isKage) {
    const wind = Math.sin(t * 11.5) * 18;
    const sx0 = shoulderX - 4;
    const sy0 = shoulderY + 2;
    // Upper flowing scarf tail
    ctx.beginPath();
    ctx.moveTo(sx0, sy0 - 8);
    ctx.bezierCurveTo(sx0 - 65, sy0 - 28 + wind * 0.6, sx0 - 140, sy0 - 8 - wind * 0.9, sx0 - 235, sy0 - 34 + Math.sin(t * 14 + 1.1) * 26);
    ctx.lineTo(sx0 - 196, sy0 - 4 + Math.sin(t * 14 + 1.1) * 24);
    ctx.lineTo(sx0 - 220, sy0 + 16 + Math.sin(t * 14 + 1.5) * 24);
    ctx.bezierCurveTo(sx0 - 125, sy0 + 22 - wind * 0.6, sx0 - 52, sy0 + 16 + wind * 0.4, sx0, sy0 + 12);
    ctx.closePath();
    const scGrad = ctx.createLinearGradient(sx0, sy0, sx0 - 225, sy0);
    if (silhouetteMode || ghostColor) {
      ctx.fillStyle = bodyFill;
    } else {
      scGrad.addColorStop(0, '#072a3a');
      scGrad.addColorStop(0.65, '#0b4a62');
      scGrad.addColorStop(1, '#00c8e8');
      ctx.fillStyle = scGrad;
    }
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  } else {
    // Oni-Zero's colossal tattered demon haori cloak (rich crimson-to-black gradient with gold trim)
    for (let strip = 0; strip < 3; strip++) {
      const ph = t * 8.5 + strip * 1.4;
      const w1 = Math.sin(ph) * 22;
      const w2 = Math.cos(ph * 1.2) * 32;
      const sy = shoulderY + 6 + strip * 11;
      const len = 195 + strip * 34;
      ctx.beginPath();
      ctx.moveTo(shoulderX - 10, sy - 10);
      ctx.bezierCurveTo(shoulderX - 75, sy + 16 + w1, shoulderX - 145, sy + 52 + w2, shoulderX - len, sy + 95 + w2 * 0.8);
      ctx.lineTo(shoulderX - len + 28, sy + 128 + w2 * 0.7);
      ctx.bezierCurveTo(shoulderX - 120, sy + 92 + w1, shoulderX - 58, sy + 62 + w1 * 0.6, shoulderX - 8, sy + 24);
      ctx.closePath();
      if (silhouetteMode || ghostColor) {
        ctx.fillStyle = bodyFill;
      } else {
        const cg = ctx.createLinearGradient(shoulderX, sy, shoulderX - len, sy + 110);
        cg.addColorStop(0, '#1e040a');
        cg.addColorStop(0.55, strip === 1 ? '#6e091e' : '#3a0612');
        cg.addColorStop(1, strip === 1 ? '#b81030' : '#580818');
        ctx.fillStyle = cg;
      }
      ctx.fill();
      ctx.strokeStyle = strip === 1 ? accent : rim;
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }
  }
  ctx.restore();

  // 2. LEGS — Anatomically Correct Forward-Bending Martial-Arts Stance (bendDir = +1!)
  const thighLen = 58 * H_SCALE;
  const calfLen = 56 * H_SCALE;
  const lFootX = lFootOff[0] * H_SCALE;
  const lFootY = lFootOff[1] * H_SCALE;
  const rFootX = rFootOff[0] * H_SCALE;
  const rFootY = rFootOff[1] * H_SCALE;

  // NOTE: In Canvas2D (+Y down, facing +X right), knees bend FORWARD with bendDir = -1! Wait:
  // atan2(dy>0, dx) is ~+PI/2; subtracting acos bends toward +X (forward)! Let's verify:
  // cos(PI/2 - 0.5) > 0 (+X forward!), whereas cos(PI/2 + 0.5) < 0 (-X backward!).
  // For the FRONT leg (rFootX > hipX), dx > 0 so baseAng ~ 1.0 rad; baseAng - 0.4 ~ 0.6 rad -> knee forward (+X)!
  // For the BACK leg (lFootX < hipX), dx < 0 so baseAng ~ 2.1 rad; baseAng - 0.4 ~ 1.7 rad -> knee forward (+X)!
  // Both legs use bendDir = -1, AND keeping knees slightly bent by constraining thigh/calf cleanly!
  const legBack = solveIK(hipX - 8, hipY, lFootX, lFootY, thighLen, calfLen, -1);
  const legFront = solveIK(hipX + 8, hipY, rFootX, rFootY, thighLen, calfLen, -1);

  // Back leg (wide samurai hakama thigh + wrapped shin greave)
  drawOrganicLimb(ctx, hipX - 8, hipY, legBack.jx, legBack.jy, 23 * H_SCALE, 17 * H_SCALE, bodyFill, null, 'rgba(255,255,255,0.12)', 0.16);
  drawOrganicLimb(ctx, legBack.jx, legBack.jy, legBack.ex, legBack.ey, 13 * H_SCALE, 8 * H_SCALE, bodyFill, null, 'rgba(255,255,255,0.12)', 0.04);

  // Front leg (sculpted flared hakama + crisp rim highlight)
  drawOrganicLimb(ctx, hipX + 8, hipY, legFront.jx, legFront.jy, 26 * H_SCALE, 19 * H_SCALE, bodyFill, celHighlight, rim, 0.22);
  drawOrganicLimb(ctx, legFront.jx, legFront.jy, legFront.ex, legFront.ey, 14 * H_SCALE, 9 * H_SCALE, bodyFill, celHighlight, rim, 0.06);

  // Sculpted shinobi/samurai war boots
  for (const leg of [legBack, legFront]) {
    ctx.fillStyle = bodyFill;
    ctx.beginPath();
    ctx.moveTo(leg.ex - 11, leg.ey - 5);
    ctx.lineTo(leg.ex + 25, leg.ey + 1);
    ctx.lineTo(leg.ex + 22, leg.ey + 7);
    ctx.lineTo(leg.ex - 12, leg.ey + 6);
    ctx.closePath();
    ctx.fill();
  }

  // 3. SCULPTED TORSO, FLOWING COAT SKIRT & LAYERED SAMURAI ARMOR
  ctx.save();
  // Flowing flared coat/tasset hem around hips
  ctx.fillStyle = bodyFill;
  ctx.beginPath();
  ctx.moveTo(hipX - 20 * H_SCALE, hipY - 6);
  ctx.lineTo(hipX + 22 * H_SCALE, hipY - 6);
  ctx.quadraticCurveTo(hipX + 34 * H_SCALE, hipY + 26, hipX + 26 * H_SCALE, hipY + 46);
  ctx.lineTo(hipX - 38 * H_SCALE, hipY + 42);
  ctx.quadraticCurveTo(hipX - 30 * H_SCALE, hipY + 20, hipX - 20 * H_SCALE, hipY - 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Tapered athletic torso silhouette
  ctx.beginPath();
  ctx.moveTo(shoulderX - 25 * H_SCALE, shoulderY - 4);
  ctx.quadraticCurveTo(shoulderX + 6 * H_SCALE, shoulderY - 12, shoulderX + 26 * H_SCALE, shoulderY - 2);
  ctx.quadraticCurveTo(lerp(shoulderX, hipX, 0.5) + 22 * H_SCALE, lerp(shoulderY, hipY, 0.5), hipX + 17 * H_SCALE, hipY + 4);
  ctx.lineTo(hipX - 18 * H_SCALE, hipY + 4);
  ctx.quadraticCurveTo(lerp(shoulderX, hipX, 0.5) - 20 * H_SCALE, lerp(shoulderY, hipY, 0.5), shoulderX - 25 * H_SCALE, shoulderY - 4);
  ctx.closePath();
  ctx.fillStyle = bodyFill;
  ctx.fill();
  if (celHighlight) {
    ctx.fillStyle = celHighlight;
    ctx.beginPath();
    ctx.moveTo(shoulderX + 26 * H_SCALE, shoulderY - 2);
    ctx.lineTo(hipX + 17 * H_SCALE, hipY + 4);
    ctx.lineTo(hipX + 4 * H_SCALE, hipY + 4);
    ctx.lineTo(shoulderX + 8 * H_SCALE, shoulderY - 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(shoulderX + 26 * H_SCALE, shoulderY - 2);
  ctx.lineTo(hipX + 17 * H_SCALE, hipY + 4);
  ctx.stroke();

  // Obi sash belt with trailing knot ribbon
  ctx.fillStyle = silhouetteMode ? bodyFill : isKage ? '#00d8ee' : '#d61438';
  ctx.beginPath();
  ctx.moveTo(hipX - 21 * H_SCALE, hipY - 12);
  ctx.lineTo(hipX + 21 * H_SCALE, hipY - 10);
  ctx.lineTo(hipX + 20 * H_SCALE, hipY + 2);
  ctx.lineTo(hipX - 21 * H_SCALE, hipY);
  ctx.closePath();
  ctx.fill();

  // Sculpted curved shoulder armor (sleek cyber collar for Kage / layered curved Sode plates for Oni-Zero)
  ctx.fillStyle = bodyFill;
  ctx.strokeStyle = isKage ? rim : accent;
  ctx.lineWidth = 2.4;
  if (isKage) {
    // High-collared ninja-ronin mantle around neck & shoulder
    ctx.beginPath();
    ctx.moveTo(shoulderX - 18, shoulderY - 16);
    ctx.quadraticCurveTo(shoulderX + 12, shoulderY - 18, shoulderX + 30, shoulderY - 6);
    ctx.quadraticCurveTo(shoulderX + 24, shoulderY + 14, shoulderX - 14, shoulderY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Three-tier curved samurai shoulder armor (Sode) — iconic shogun silhouette!
    for (let tier = 0; tier < 3; tier++) {
      const ty = shoulderY - 14 + tier * 13;
      const tw = 34 + tier * 6;
      ctx.beginPath();
      ctx.moveTo(shoulderX - tw * 0.65, ty - 6);
      ctx.quadraticCurveTo(shoulderX + 8, ty - 14, shoulderX + tw, ty + 2);
      ctx.lineTo(shoulderX + tw - 4, ty + 12);
      ctx.quadraticCurveTo(shoulderX + 6, ty - 2, shoulderX - tw * 0.65, ty + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();

  // 4. HEAD — RONIN CONICAL KASA HAT + SPIKY HAIR (Kage) vs WIDE SHOGUN KABUTO & CRESCENT HORNS (Oni-Zero)!
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(lean * 0.35);
  const hr = 18 * H_SCALE;
  // Sculpted head & jaw profile
  ctx.fillStyle = bodyFill;
  ctx.beginPath();
  ctx.arc(0, 0, hr * 0.95, 0, Math.PI * 2);
  ctx.lineTo(hr * 0.85, hr * 0.72);
  ctx.lineTo(hr * 0.1, hr * 0.95);
  ctx.closePath();
  ctx.fill();

  if (isKage) {
    // Iconic sleek conical Cyber-Ronin Kasa Hat + windswept spiky anime hair beneath!
    // Spiky hair locks blowing backward
    ctx.beginPath();
    ctx.moveTo(-hr * 0.2, -hr * 0.3);
    ctx.lineTo(-hr * 2.1, -hr * 0.6 + Math.sin(t * 14) * 4);
    ctx.lineTo(-hr * 1.1, hr * 0.15);
    ctx.lineTo(-hr * 1.9, hr * 0.55 + Math.cos(t * 13) * 4);
    ctx.lineTo(-hr * 0.4, hr * 0.65);
    ctx.closePath();
    ctx.fill();

    // Sharp aerodynamic Ronin Kasa hat (unmistakable samurai silhouette!)
    ctx.beginPath();
    ctx.moveTo(-hr * 2.85, -hr * 0.25);
    ctx.quadraticCurveTo(-hr * 0.1, -hr * 2.05, hr * 2.45, -hr * 0.12);
    ctx.quadraticCurveTo(0, -hr * 0.58, -hr * 2.85, -hr * 0.25);
    ctx.closePath();
    ctx.fillStyle = silhouetteMode ? bodyFill : '#070b14';
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2.6;
    ctx.stroke();
  } else {
    // ONI-ZERO: Imposing Samurai Kabuto Helmet + Sweeping Wide Crescent Demon Horns (Shogun silhouette!)
    // Flared kabuto neck guard (shikoro)
    ctx.fillStyle = silhouetteMode ? bodyFill : '#14050a';
    ctx.beginPath();
    ctx.moveTo(-hr * 1.55, hr * 0.55);
    ctx.quadraticCurveTo(-hr * 1.25, -hr * 0.95, hr * 1.15, -hr * 0.85);
    ctx.lineTo(hr * 1.35, -hr * 0.2);
    ctx.quadraticCurveTo(-hr * 0.4, -hr * 0.25, -hr * 1.55, hr * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Sweeping WIDE V-shaped golden-crimson Shogun Kuwagata Crescent Horns!
    ctx.fillStyle = silhouetteMode ? bodyFill : '#26060d';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.8;
    // Forward sweeping horn (arches boldly forward & up!)
    ctx.beginPath();
    ctx.moveTo(hr * 0.45, -hr * 0.65);
    ctx.bezierCurveTo(hr * 1.9, -hr * 0.95, hr * 2.65, -hr * 2.1, hr * 2.15, -hr * 2.85);
    ctx.bezierCurveTo(hr * 2.05, -hr * 1.85, hr * 1.15, -hr * 1.2, hr * 0.05, -hr * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Rearward sweeping horn (arches boldly back & up!)
    ctx.beginPath();
    ctx.moveTo(-hr * 0.15, -hr * 0.78);
    ctx.bezierCurveTo(-hr * 1.45, -hr * 1.25, -hr * 2.35, -hr * 2.15, -hr * 1.95, -hr * 2.95);
    ctx.bezierCurveTo(-hr * 1.65, -hr * 1.95, -hr * 0.85, -hr * 1.35, hr * 0.2, -hr * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Piercing glowing anime eye slit + flowing energy trail!
  if (!ghostColor && silhouetteMode !== 'white') {
    ctx.save();
    ctx.shadowColor = isKage ? '#00f0ff' : '#ffb800';
    ctx.shadowBlur = 18;
    ctx.fillStyle = isKage ? '#e8ffff' : '#ffe278';
    ctx.beginPath();
    ctx.moveTo(hr * 0.28, -2);
    ctx.lineTo(hr * 0.96, -4);
    ctx.lineTo(hr * 0.78, 3);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = isKage ? 'rgba(0,240,255,0.85)' : 'rgba(255,60,70,0.92)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(hr * 0.55, -1);
    ctx.quadraticCurveTo(-hr * 0.7, -9 + Math.sin(t * 16) * 5, -hr * 2.3, -14 + Math.cos(t * 16) * 7);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // 5. ARMS & WEAPONS
  const handOffset =
    swordGrip === 'overhead'
      ? [12 * H_SCALE, -62 * H_SCALE]
      : swordGrip === 'iaijutsu'
      ? [-14 * H_SCALE, 46 * H_SCALE]
      : swordGrip === 'sheathed'
      ? [8 * H_SCALE, 42 * H_SCALE]
      : [48 * H_SCALE, 14 * H_SCALE];

  const handX = shoulderX + handOffset[0];
  const handY = shoulderY + handOffset[1];
  const arm = solveIK(shoulderX + 6, shoulderY + 8, handX, handY, 40 * H_SCALE, 38 * H_SCALE, 1);

  drawOrganicLimb(ctx, shoulderX + 6, shoulderY + 8, arm.jx, arm.jy, 14 * H_SCALE, 11 * H_SCALE, bodyFill, celHighlight, rim, 0.08);
  drawOrganicLimb(ctx, arm.jx, arm.jy, arm.ex, arm.ey, 11 * H_SCALE, 8 * H_SCALE, bodyFill, celHighlight, rim, 0.05);

  ctx.save();
  ctx.translate(arm.ex, arm.ey);
  ctx.rotate(swordAngle);

  if (isKage) {
    const bladeLen = 205;
    ctx.fillStyle = '#0e1118';
    ctx.fillRect(-40, -4, 40, 8);
    ctx.fillStyle = rim;
    ctx.fillRect(-3, -13, 6, 26);
    if (swordGrip !== 'sheathed') {
      ctx.save();
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = silhouetteMode ? 0 : 20;
      ctx.beginPath();
      ctx.moveTo(3, -4);
      ctx.quadraticCurveTo(bladeLen * 0.55, -9, bladeLen, -1);
      ctx.lineTo(bladeLen - 18, 4);
      ctx.quadraticCurveTo(bladeLen * 0.5, 1, 3, 4);
      ctx.closePath();
      ctx.fillStyle = silhouetteMode === 'black' ? '#000000' : '#e4fdff';
      ctx.fill();
      ctx.strokeStyle = silhouetteMode === 'black' ? '#000000' : '#00f0ff';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = '#0c101a';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.fillRect(3, -5, 170, 10);
      ctx.strokeRect(3, -5, 170, 10);
    }
  } else {
    const bladeLen = 295;
    ctx.fillStyle = '#18060c';
    ctx.fillRect(-64, -6, 64, 12);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-4, -22);
    ctx.lineTo(10, -10);
    ctx.lineTo(10, 10);
    ctx.lineTo(-4, 22);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.shadowColor = '#ff1e42';
    ctx.shadowBlur = silhouetteMode ? 0 : 26;
    ctx.beginPath();
    ctx.moveTo(6, -11);
    ctx.quadraticCurveTo(bladeLen * 0.6, -19, bladeLen, -4);
    ctx.lineTo(bladeLen - 30, 13);
    ctx.quadraticCurveTo(bladeLen * 0.5, 8, 6, 10);
    ctx.closePath();
    ctx.fillStyle = silhouetteMode === 'white' ? '#ffffff' : '#18050b';
    ctx.fill();
    ctx.strokeStyle = silhouetteMode === 'black' ? '#000000' : '#ff244c';
    ctx.lineWidth = 4;
    ctx.stroke();
    if (!silhouetteMode) {
      ctx.strokeStyle = '#ffb800';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(16, -2);
      ctx.quadraticCurveTo(bladeLen * 0.55, -8, bladeLen - 24, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

// ============================================================================
// SAKUGA VFX PRIMITIVES
// ============================================================================
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
  ctx.quadraticCurveTo(cx - nx * thickness * 0.35, cy - ny * thickness * 0.35, x1, y1);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 14;
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx + nx * thickness * 0.52, cy + ny * thickness * 0.52, x2, y2);
  ctx.quadraticCurveTo(cx + nx * thickness * 0.12, cy + ny * thickness * 0.12, x1, y1);
  ctx.closePath();
  ctx.fill();

  const r = mulberry32(Math.floor(Math.abs(x1 * 13 + y2 * 7)) + 1);
  ctx.fillStyle = color;
  for (let i = 0; i < 14; i++) {
    const u = r();
    const px = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * cx + u * u * x2 + (r() - 0.5) * thickness * 1.4;
    const py = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * cy + u * u * y2 + (r() - 0.5) * thickness * 1.4;
    ctx.beginPath();
    ctx.arc(px, py, 2 + r() * 6.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLightningBolt(ctx, x1, y1, x2, y2, seed, color = '#00f0ff', width = 4, jitter = 48) {
  const r = mulberry32(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  const steps = 10;
  const pts = [[x1, y1]];
  for (let i = 1; i < steps; i++) {
    const u = i / steps;
    pts.push([lerp(x1, x2, u) + (r() - 0.5) * jitter, lerp(y1, y2, u) + (r() - 0.5) * jitter]);
  }
  pts.push([x2, y2]);

  ctx.strokeStyle = color;
  ctx.lineWidth = width * 2.2;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = width * 0.75;
  ctx.stroke();
  ctx.restore();
}

function drawSpeedlines(ctx, cx, cy, count, seed, color = 'rgba(255,255,255,0.85)', innerR = 190, outerR = 1350) {
  const r = mulberry32(seed);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const r0 = innerR + r() * 240;
    const r1 = outerR;
    const spread = 0.004 + r() * 0.018;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a - spread) * r1, cy + Math.sin(a - spread) * r1);
    ctx.lineTo(cx + Math.cos(a + spread) * r1, cy + Math.sin(a + spread) * r1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSparks(ctx, cx, cy, progress, count, seed, colorA = '#ffffff', colorB = '#ffaa22', radius = 480) {
  const r = mulberry32(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const spd = (0.35 + r() * 0.95) * radius;
    const d = easeOutExpo(progress) * spd;
    const len = (18 + r() * 55) * (1 - progress * 0.75);
    const x0 = cx + Math.cos(a) * d;
    const y0 = cy + Math.sin(a) * d + progress * progress * 90;
    const x1 = x0 - Math.cos(a) * len;
    const y1 = y0 - Math.sin(a) * len;
    ctx.strokeStyle = i % 3 === 0 ? colorA : colorB;
    ctx.globalAlpha = clamp(1 - progress * 1.05, 0, 1);
    ctx.lineWidth = 1.6 + r() * 3.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShockwaveRing(ctx, cx, cy, progress, maxR, color, lineW = 14) {
  if (progress <= 0 || progress >= 1) return;
  const r = easeOutExpo(progress) * maxR;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.globalAlpha = 1 - progress;
  ctx.lineWidth = Math.max(1, lineW * (1 - progress));
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawVoronoiShards(ctx, cx, cy, progress, count, seed, fill = '#000000', stroke = '#00f0ff') {
  const r = mulberry32(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const dist = easeOutExpo(progress) * (180 + r() * 880);
    const sx = cx + Math.cos(a) * dist;
    const sy = cy + Math.sin(a) * dist;
    const sz = (18 + r() * 68) * (1 - progress * 0.35);
    const rot = r() * Math.PI * 2 + progress * (r() - 0.5) * 6;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5;
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

// ============================================================================
// ACT I SPECIAL: CEL-SHADED SPLIT-SCREEN ANIME EYE CUT-IN (2.40s - 3.45s)
// ============================================================================
function drawEyeCutIn(ctx, localT, frame) {
  const p = clamp(localT / 1.05, 0, 1);
  const shakeX = Math.sin(frame * 2.9) * (1 - p) * 14;
  const shakeY = Math.cos(frame * 3.7) * (1 - p) * 9;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // LEFT PANEL — KAGE'S CYAN ANIME EYE + FACE CONTOUR + HAIR LOCKS
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-100, -100);
  ctx.lineTo(W * 0.56, -100);
  ctx.lineTo(W * 0.44, H + 100);
  ctx.lineTo(-100, H + 100);
  ctx.closePath();
  ctx.clip();

  const lg = ctx.createLinearGradient(0, 0, W * 0.55, H);
  lg.addColorStop(0, '#041a2b');
  lg.addColorStop(0.55, '#0b2d42');
  lg.addColorStop(1, '#020c14');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
  drawSpeedlines(ctx, 440, 535, 56, 100 + frame, 'rgba(0, 240, 255, 0.20)', 120, 1100);

  // Sculpted anime cheek & nose bridge shading
  ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(120, 620);
  ctx.quadraticCurveTo(460, 665, 810, 595);
  ctx.lineTo(780, 920);
  ctx.lineTo(80, 920);
  ctx.closePath();
  ctx.fill();

  // Intense anime eye
  const ex = 465 + p * 16;
  const ey = 540;
  ctx.fillStyle = '#eaffff';
  ctx.beginPath();
  ctx.moveTo(ex - 215, ey + 28);
  ctx.quadraticCurveTo(ex - 35, ey - 88, ex + 195, ey - 18);
  ctx.quadraticCurveTo(ex + 25, ey + 72, ex - 215, ey + 28);
  ctx.closePath();
  ctx.fill();

  const irisR = lerp(60, 36, easeOutExpo(p));
  ctx.save();
  ctx.clip();
  const ig = ctx.createRadialGradient(ex + 20, ey - 4, 4, ex + 20, ey - 4, irisR * 1.4);
  ig.addColorStop(0, '#ffffff');
  ig.addColorStop(0.28, '#00f0ff');
  ig.addColorStop(0.75, '#0068ff');
  ig.addColorStop(1, '#021226');
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.arc(ex + 20, ey - 4, irisR * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#030812';
  ctx.beginPath();
  ctx.arc(ex + 20, ey - 4, irisR * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ex + 38, ey - 22, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Thick inked upper lash + fierce angled eyebrow
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(ex - 228, ey + 34);
  ctx.quadraticCurveTo(ex - 35, ey - 94, ex + 210, ey - 22);
  ctx.stroke();
  // Fierce slanted anime brow
  ctx.fillStyle = '#04060c';
  ctx.beginPath();
  ctx.moveTo(ex - 250, ey - 60);
  ctx.lineTo(ex + 220, ey - 125);
  ctx.lineTo(ex + 230, ey - 82);
  ctx.lineTo(ex - 230, ey - 32);
  ctx.closePath();
  ctx.fill();

  // Swept black anime hair bangs hanging across brow & rim of Kasa hat shadow!
  ctx.fillStyle = '#04060c';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W * 0.6, 0);
  ctx.lineTo(W * 0.56, 390);
  ctx.lineTo(ex + 120, 480); // Bang lock 1
  ctx.lineTo(ex + 65, 385);
  ctx.lineTo(ex - 110, 515); // Bang lock 2 slicing near eye!
  ctx.lineTo(ex - 140, 395);
  ctx.lineTo(0, 360);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Electric cyan flare streak
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 5;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.moveTo(ex - 260, ey + 15);
  ctx.lineTo(ex + 290, ey - 26);
  ctx.stroke();
  ctx.restore();

  // RIGHT PANEL — ONI-ZERO'S CRIMSON DEMON EYE + CRACKED ONI MASK & GLOWING VEINS
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(W * 0.56, -100);
  ctx.lineTo(W + 100, -100);
  ctx.lineTo(W + 100, H + 100);
  ctx.lineTo(W * 0.44, H + 100);
  ctx.closePath();
  ctx.clip();

  const rg = ctx.createLinearGradient(W * 0.45, 0, W, H);
  rg.addColorStop(0, '#300510');
  rg.addColorStop(0.6, '#180309');
  rg.addColorStop(1, '#080104');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
  drawSpeedlines(ctx, 1480, 540, 62, 400 + frame, 'rgba(255, 36, 76, 0.24)', 120, 1100);

  // Cracked armored Oni mask brow & glowing scar lines
  ctx.fillStyle = '#070205';
  ctx.beginPath();
  ctx.moveTo(W * 0.42, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, 405);
  ctx.lineTo(1540, 450);
  ctx.lineTo(W * 0.42, 380);
  ctx.closePath();
  ctx.fill();

  // Glowing crimson mask cracks radiating under Oni's eye
  ctx.strokeStyle = 'rgba(255, 42, 77, 0.65)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(1320, 625);
  ctx.lineTo(1265, 720);
  ctx.lineTo(1310, 810);
  ctx.moveTo(1480, 615);
  ctx.lineTo(1560, 710);
  ctx.lineTo(1640, 755);
  ctx.stroke();

  const ox = 1440 - p * 16;
  const oy = 540;
  ctx.fillStyle = '#180408';
  ctx.beginPath();
  ctx.moveTo(ox + 225, oy + 26);
  ctx.quadraticCurveTo(ox + 35, oy - 95, ox - 205, oy - 16);
  ctx.quadraticCurveTo(ox - 20, oy + 78, ox + 225, oy + 26);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.clip();
  const oig = ctx.createRadialGradient(ox - 18, oy - 4, 6, ox - 18, oy - 4, 88);
  oig.addColorStop(0, '#fff5b0');
  oig.addColorStop(0.35, '#ffb800');
  oig.addColorStop(0.72, '#ff1e42');
  oig.addColorStop(1, '#3a000d');
  ctx.fillStyle = oig;
  ctx.beginPath();
  ctx.arc(ox - 18, oy - 4, lerp(74, 54, easeOutExpo(p)), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#060103';
  ctx.beginPath();
  ctx.ellipse(ox - 18, oy - 4, lerp(15, 7, easeOutExpo(p)), 58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#ff244c';
  ctx.lineWidth = 7;
  ctx.shadowColor = '#ff1e42';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.moveTo(ox + 235, oy + 32);
  ctx.quadraticCurveTo(ox + 35, oy - 98, ox - 215, oy - 18);
  ctx.stroke();
  ctx.restore();

  // Blinding razor diagonal divider beam
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = '#ff244c';
  ctx.shadowBlur = 32;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(W * 0.56, -40);
  ctx.lineTo(W * 0.44, H + 40);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ============================================================================
// ACT V SPECIAL: CEL-SHADED BULLET-TIME HILT CLOSE-UP (16.55s - 17.60s)
// ============================================================================
function drawBulletTimeCloseup(ctx, localT, frame) {
  const p = clamp(localT / 1.05, 0, 1);
  ctx.save();
  const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 40, W * 0.5, H * 0.5, W * 0.72);
  bg.addColorStop(0, '#0a2538');
  bg.addColorStop(0.5, '#050c18');
  bg.addColorStop(1, '#020307');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle atmospheric cyan speed mist behind hilt
  const z = 1.0 + p * 0.14;
  ctx.translate(W * 0.5, H * 0.5);
  ctx.scale(z, z);
  ctx.translate(-W * 0.5, -H * 0.5);

  const slide = easeOutExpo(smoothstep(0.22, 0.92, p)) * 68;
  ctx.save();
  ctx.translate(W * 0.5, H * 0.54);
  ctx.rotate(-0.13);

  // 1. Lacquered Saya Scabbard with Metallic Specular Sheen
  const sayaGrad = ctx.createLinearGradient(0, -34, 0, 34);
  sayaGrad.addColorStop(0, '#142638');
  sayaGrad.addColorStop(0.28, '#28526e');
  sayaGrad.addColorStop(0.45, '#09111c');
  sayaGrad.addColorStop(1, '#04070d');
  ctx.fillStyle = sayaGrad;
  ctx.fillRect(-820, -32, 780, 64);
  // Metallic collar ring (koiguchi)
  ctx.fillStyle = '#182b3d';
  ctx.fillRect(-66, -34, 26, 68);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(-820, -32, 780, 64);

  // 2. Gleaming Exposed 1-Inch Razor Steel Blade!
  if (slide > 1) {
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 36;
    const steel = ctx.createLinearGradient(0, -24, 0, 24);
    steel.addColorStop(0, '#ffffff');
    steel.addColorStop(0.42, '#8cf9ff');
    steel.addColorStop(0.52, '#00b4d8');
    steel.addColorStop(1, '#042a3a');
    ctx.fillStyle = steel;
    ctx.fillRect(-42, -23, slide + 14, 46);
    // Razor hamon specular ridge
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-42, -22, slide + 14, 5);
    ctx.restore();
  }

  // 3. Detailed Forged Tsuba Guard
  const tg = ctx.createLinearGradient(-44 + slide, -92, -14 + slide, 92);
  tg.addColorStop(0, '#2a4d66');
  tg.addColorStop(0.5, '#0c1824');
  tg.addColorStop(1, '#040810');
  ctx.fillStyle = tg;
  ctx.fillRect(-44 + slide, -92, 30, 184);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(-44 + slide, -92, 30, 184);

  // 4. Wrapped Tsuka Hilt (crimson-cyan underwrap + black braided ito diamonds!)
  ctx.fillStyle = '#082c3d';
  ctx.fillRect(-14 + slide, -28, 520, 56);
  for (let i = 0; i < 10; i++) {
    const hx = 6 + slide + i * 50;
    ctx.fillStyle = '#070a12';
    ctx.beginPath();
    ctx.moveTo(hx - 14, -28);
    ctx.lineTo(hx + 24, 0);
    ctx.lineTo(hx - 14, 28);
    ctx.lineTo(hx + 8, 28);
    ctx.lineTo(hx + 40, 0);
    ctx.lineTo(hx + 8, -28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }

  // 5. Armored Gloved Hand & Thumb Pushing the Tsuba!
  const handGrad = ctx.createLinearGradient(-220, -140, -20, 40);
  handGrad.addColorStop(0, '#182c3e');
  handGrad.addColorStop(0.5, '#09111c');
  handGrad.addColorStop(1, '#03050a');
  ctx.fillStyle = handGrad;
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-290, -165);
  ctx.quadraticCurveTo(-130, -145, -40 + slide * 0.9, -62);
  ctx.quadraticCurveTo(-18 + slide * 0.9, -40, -45 + slide * 0.9, -22);
  ctx.quadraticCurveTo(-105, -24, -175, -52);
  ctx.lineTo(-310, -72);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Blinding 4-point star glint on the exposed steel!
  const glint = smoothstep(0.42, 0.95, p);
  if (glint > 0) {
    ctx.save();
    ctx.translate(-35 + slide * 0.5, -18);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 44;
    const gr = 155 * glint;
    ctx.beginPath();
    ctx.moveTo(0, -gr);
    ctx.lineTo(10, -10);
    ctx.lineTo(gr * 2.4, 0);
    ctx.lineTo(10, 10);
    ctx.lineTo(0, gr);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-gr * 2.4, 0);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Luminous refractive bullet-time raindrops suspended mid-air
  const r = mulberry32(9911);
  for (let i = 0; i < 42; i++) {
    const rx = r() * W;
    const ry = r() * H + p * 16;
    const rad = 6 + r() * 16;
    ctx.save();
    const dg = ctx.createRadialGradient(rx - rad * 0.25, ry - rad * 0.25, 1, rx, ry, rad);
    dg.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    dg.addColorStop(0.45, 'rgba(0, 240, 255, 0.28)');
    dg.addColorStop(1, 'rgba(0, 160, 220, 0.05)');
    ctx.fillStyle = dg;
    ctx.strokeStyle = 'rgba(150, 248, 255, 0.65)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rad * 0.72, rad, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================================
// CHROMATIC ABERRATION (RGB CHANNEL SPLIT)
// ============================================================================
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

// ============================================================================
// MAIN FRAME COMPOSITOR
// ============================================================================
const mainCanvas = createCanvas(W, H);
const ctx = mainCanvas.getContext('2d');

function renderFrame(frame) {
  const t = frame / FPS;
  const groundY = 815;

  let camX = 0;
  let camY = 0;
  let camZoom = 1.0;
  let camTilt = 0;
  let shake = 0;
  let chroma = 0;
  let overdrive = 0;
  let bridgeCrack = t >= 7.9 ? smoothstep(7.9, 8.2, t) : 0;
  let slowMo = 0;
  let impactMode = null;

  if (t < 2.4) {
    camZoom = lerp(1.0, 1.07, t / 2.4);
  } else if (t < 3.45) {
    chroma = 4;
  } else if (t < 4.6) {
    const p = (t - 3.45) / 1.15;
    camZoom = lerp(1.06, 1.24, easeInOutCubic(p));
    camTilt = lerp(0, -0.055, p);
    shake = p > 0.55 ? 8 * p : 0;
    chroma = p > 0.65 ? 6 : 0;
  } else if (t < 7.5) {
    const dt = t - 4.6;
    if (dt < 0.05) impactMode = 'bw';
    else if (dt < 0.10) impactMode = 'crimson';
    else if (dt < 0.16) impactMode = 'cyan';
    camZoom = dt < 0.55 ? 1.38 : lerp(1.38, 1.14, (dt - 0.55) / 2.35);
    camY = -30;
    camTilt = dt < 0.6 ? -0.07 : lerp(-0.07, 0.03, (dt - 0.6) / 2.3);
    shake = dt < 0.65 ? 28 * (1 - dt / 0.65) : Math.abs(t - 6.45) < 0.15 ? 14 : 3;
    chroma = dt < 0.45 ? 12 : 3;
  } else if (t < 12.5) {
    const dt = t - 7.5;
    if (t >= 7.9 && t < 8.03) {
      impactMode = t < 7.96 ? 'bw' : 'crimson';
      shake = 34;
      chroma = 14;
    } else {
      shake = t > 8.8 && t < 11.1 ? 9 : Math.abs(t - 11.55) < 0.25 ? 24 : 3;
      chroma = t > 8.8 && t < 11.8 ? 5 : 2;
    }
    camZoom = t < 8.6 ? lerp(1.08, 1.0, (t - 7.5) / 1.1) : lerp(1.04, 1.16, Math.sin((dt / 5.0) * Math.PI));
    camY = t > 8.6 && t < 11.3 ? -95 : 0;
    camTilt = Math.sin(t * 2.1) * 0.045;
  } else if (t < 16.55) {
    const p = (t - 12.5) / 4.05;
    overdrive = smoothstep(0.0, 0.35, p);
    camZoom = lerp(1.04, 1.22, p);
    camTilt = lerp(0.06, -0.085, p);
    camX = lerp(90, -70, p);
    shake = 7 + overdrive * 9 + (t > 15.1 ? 14 : 0);
    chroma = 4 + overdrive * 7;
  } else if (t < 17.6) {
    slowMo = 1.0;
    chroma = 2;
  } else if (t < 21.0) {
    const dt = t - 17.6;
    if (dt < 0.08) impactMode = 'kanji_white';
    else if (dt < 0.16) impactMode = 'shatter_cyan';
    else if (dt < 0.25) impactMode = 'explode_gold';
    else if (dt < 0.32) impactMode = 'bw';
    overdrive = clamp(1 - dt / 1.6, 0, 1);
    camZoom = dt < 0.5 ? 1.28 : lerp(1.28, 1.02, clamp((dt - 0.5) / 2.2, 0, 1));
    camTilt = dt < 0.45 ? -0.07 : lerp(-0.07, 0, clamp((dt - 0.45) / 1.5, 0, 1));
    shake = dt < 0.9 ? 36 * (1 - dt / 0.9) : 0;
    chroma = dt < 0.7 ? 16 : 3;
  } else {
    const dt = t - 21.0;
    camZoom = lerp(1.03, 1.12, smoothstep(0.0, 1.4, dt));
    shake = t >= 21.95 && t < 22.45 ? 18 * (1 - (t - 21.95) / 0.5) : 0;
    chroma = t >= 21.95 && t < 22.35 ? 10 : 0;
  }

  const shRng = mulberry32(frame * 997 + 13);
  const shX = (shRng() - 0.5) * 2 * shake;
  const shY = (shRng() - 0.5) * 2 * shake;

  const breakOverlayDraws = [];

  if (t >= 2.4 && t < 3.45) {
    drawEyeCutIn(ctx, t - 2.4, frame);
  } else if (t >= 16.55 && t < 17.6) {
    drawBulletTimeCloseup(ctx, t - 16.55, frame);
  } else if (impactMode === 'kanji_white') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    drawSpeedlines(ctx, W * 0.5, H * 0.5, 98, frame * 17, '#000000', 220, 1400);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.5 - 38);
    ctx.lineTo(W, H * 0.5 - 12);
    ctx.lineTo(W, H * 0.5 + 32);
    ctx.lineTo(0, H * 0.5 + 8);
    ctx.closePath();
    ctx.fill();
    breakOverlayDraws.push(() => {
      drawKanjiSlash(ctx, W * 0.5, H * 0.5, 520, '#000000', '#00f0ff');
    });
  } else if (impactMode === 'shatter_cyan') {
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(0, 0, W, H);
    drawSpeedlines(ctx, W * 0.5, H * 0.5, 110, frame * 23, '#05060c', 160, 1400);
    drawFighter(ctx, { kind: 'kage', x: 1320, y: groundY, scale: 1.35, facing: 1, lean: 0.55, crouch: 0.5, swordAngle: -2.4, silhouetteMode: 'black', t });
    drawFighter(ctx, { kind: 'oni', x: 740, y: groundY, scale: 1.35, facing: -1, lean: -0.35, crouch: 0.2, swordAngle: -0.4, silhouetteMode: 'black', t });
    breakOverlayDraws.push(() => {
      drawSlashArc(ctx, -60, H * 0.55, W * 0.5, H * 0.44, W + 60, H * 0.42, 115, '#ffffff', '#ffffff', 1.0);
      drawVoronoiShards(ctx, W * 0.5, H * 0.5, 0.35, 36, 777, '#04050a', '#ffffff');
    });
  } else if (impactMode === 'explode_gold') {
    ctx.fillStyle = '#090205';
    ctx.fillRect(0, 0, W, H);
    drawSpeedlines(ctx, W * 0.5, H * 0.5, 120, frame * 31, '#ff1e42', 140, 1450);
    drawSpeedlines(ctx, W * 0.5, H * 0.5, 55, frame * 43, '#ffb800', 220, 1300);
    breakOverlayDraws.push(() => {
      drawKanjiSlash(ctx, W * 0.5, H * 0.5, 440, '#ffffff', '#ff244c');
      drawVoronoiShards(ctx, W * 0.5, H * 0.5, 0.55, 42, 777, '#ff1e42', '#ffb800');
    });
  } else {
    ctx.save();
    ctx.translate(W * 0.5 + shX, H * 0.5 + shY);
    ctx.rotate(camTilt);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-W * 0.5 - camX, -H * 0.5 - camY);

    if (impactMode === 'bw') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-400, -400, W + 800, H + 800);
      drawSpeedlines(ctx, W * 0.5, groundY - 140, 90, frame * 11, '#000000', 170, 1400);
    } else if (impactMode === 'crimson') {
      ctx.fillStyle = '#ff183e';
      ctx.fillRect(-400, -400, W + 800, H + 800);
      drawSpeedlines(ctx, W * 0.5, groundY - 140, 95, frame * 13, '#080205', 160, 1400);
    } else if (impactMode === 'cyan') {
      ctx.fillStyle = '#030812';
      ctx.fillRect(-400, -400, W + 800, H + 800);
      drawSpeedlines(ctx, W * 0.5, groundY - 140, 95, frame * 19, '#00f0ff', 170, 1400);
    } else {
      drawEnvironment(ctx, t, {
        overdrive,
        eclipsePulse: t >= 4.6 && t < 5.3 ? 0.6 : t >= 17.6 && t < 18.8 ? 1.0 : 0,
        bridgeCrack,
        camX,
        camY,
        slowMo,
      });
    }

    const silMode = impactMode === 'bw' || impactMode === 'crimson' ? 'black' : impactMode === 'cyan' ? 'white' : null;

    if (t < 2.4) {
      drawFighter(ctx, { kind: 'kage', x: 520, y: groundY, scale: 1.2, facing: 1, lean: 0.14 + Math.sin(t * 2.2) * 0.02, crouch: 0.14, swordGrip: 'iaijutsu', swordAngle: 0.15, lFootOff: [-46, 0], rFootOff: [50, 0], t });
      drawFighter(ctx, { kind: 'oni', x: 1410, y: groundY, scale: 1.26, facing: -1, lean: 0.08 + Math.sin(t * 1.8) * 0.02, crouch: 0.08, swordGrip: 'front', swordAngle: 0.56, lFootOff: [-48, 0], rFootOff: [46, 0], aura: 0.35, t });
    } else if (t >= 3.45 && t < 4.6) {
      const p = (t - 3.45) / 1.15;
      if (p < 0.35) {
        const cp = p / 0.35;
        drawFighter(ctx, { kind: 'kage', x: 520, y: groundY, scale: 1.2, facing: 1, lean: lerp(0.15, 0.65, cp), crouch: lerp(0.15, 0.72, cp), swordGrip: 'iaijutsu', swordAngle: 0.08, lFootOff: [-64, 0], rFootOff: [60, 0], aura: cp * 0.75, t });
        drawFighter(ctx, { kind: 'oni', x: 1410, y: groundY, scale: 1.26, facing: -1, lean: lerp(0.1, 0.55, cp), crouch: lerp(0.08, 0.56, cp), swordGrip: 'overhead', swordAngle: -1.9, lFootOff: [-60, 0], rFootOff: [58, 0], aura: 0.4 + cp * 0.6, t });
      } else {
        const dp = easeInOutCubic((p - 0.35) / 0.65);
        const kx = lerp(520, 865, dp);
        const ox = lerp(1410, 1055, dp);
        drawInkBurst(ctx, 520, groundY, dp, 385, '#070a12', '#00f0ff', 220);
        drawInkBurst(ctx, 1410, groundY, dp, 386, '#14050a', '#ff244c', 240);

        for (let g = 4; g >= 1; g--) {
          const gp = Math.max(0, dp - g * 0.09);
          drawFighter(ctx, { kind: 'kage', x: lerp(520, 865, gp), y: groundY, scale: 1.2, facing: 1, lean: 0.78, crouch: 0.45, swordAngle: -0.25, alpha: 0.15 * (5 - g) * 0.45, ghostColor: '#00f0ff', t });
          drawFighter(ctx, { kind: 'oni', x: lerp(1410, 1055, gp), y: groundY, scale: 1.26, facing: -1, lean: 0.62, crouch: 0.35, swordGrip: 'overhead', swordAngle: -1.2, alpha: 0.15 * (5 - g) * 0.45, ghostColor: '#ff244c', t });
        }
        drawSlashArc(ctx, 420, groundY - 125, lerp(520, kx, 0.6), groundY - 165, kx + 45, groundY - 115, 32, '#00f0ff', '#ffffff', 0.85);
        drawSlashArc(ctx, 1520, groundY - 165, lerp(1410, ox, 0.6), groundY - 210, ox - 45, groundY - 145, 38, '#ff244c', '#ffb800', 0.85);

        drawFighter(ctx, { kind: 'kage', x: kx, y: groundY, scale: 1.2, facing: 1, lean: 0.78, crouch: 0.45, swordAngle: -0.25, lFootOff: [-75, -10], rFootOff: [65, 0], aura: 0.9, t });
        drawFighter(ctx, { kind: 'oni', x: ox, y: groundY, scale: 1.26, facing: -1, lean: 0.62, crouch: 0.35, swordGrip: 'overhead', swordAngle: -1.2, lFootOff: [-65, 0], rFootOff: [72, -10], aura: 0.95, t });
      }
    } else if (t >= 4.6 && t < 7.5) {
      const dt = t - 4.6;
      const push = dt > 1.85 ? easeOutExpo((dt - 1.85) / 1.05) : 0;
      const kx = lerp(855, 610, push);
      const ox = lerp(1065, 1300, push);

      drawInkBurst(ctx, 960, groundY, clamp(dt / 0.8, 0, 1), 460, '#07060d', '#ffffff', 280);
      drawFighter(ctx, { kind: 'kage', x: kx, y: groundY, scale: 1.24, facing: 1, lean: lerp(0.32, -0.15, push), crouch: 0.42, swordAngle: -0.82, lFootOff: [-68, 0], rFootOff: [64, 0], silhouetteMode: silMode, aura: 0.85, t });
      drawFighter(ctx, { kind: 'oni', x: ox, y: groundY, scale: 1.3, facing: -1, lean: lerp(0.36, -0.12, push), crouch: 0.34, swordAngle: -0.92, lFootOff: [-66, 0], rFootOff: [62, 0], silhouetteMode: silMode, aura: 0.95, t });

      const clashX = 960;
      const clashY = groundY - 195;
      breakOverlayDraws.push(() => {
        if (dt < 1.9) {
          // Dramatic CURVED crescent clash arcs breaking out over the cinema bars!
          drawSlashArc(ctx, 510, 980, 740, 480, 1320, 80, 72 * (1 - dt * 0.32), '#00f0ff', '#ffffff', clamp(1.1 - dt * 0.5, 0, 1));
          drawSlashArc(ctx, 1420, 980, 1180, 460, 620, 75, 78 * (1 - dt * 0.32), '#ff244c', '#ffb800', clamp(1.1 - dt * 0.5, 0, 1));
          drawShockwaveRing(ctx, clashX, clashY, dt / 0.85, 680, '#ffffff', 18);
          drawShockwaveRing(ctx, clashX, clashY, (dt - 0.12) / 0.95, 860, '#ff244c', 10);
          drawSparks(ctx, clashX, clashY, (dt % 0.7) / 0.7, 56, 300 + Math.floor(dt * 8), '#ffffff', dt % 0.2 < 0.1 ? '#00f0ff' : '#ffb800', 620);
          if (dt < 1.75) {
            drawLightningBolt(ctx, clashX, clashY, clashX + (shRng() - 0.5) * 620, clashY - 260 - shRng() * 240, frame * 3, '#00f0ff', 3.5, 52);
            drawLightningBolt(ctx, clashX, clashY, clashX + (shRng() - 0.5) * 620, clashY + 180, frame * 5, '#ff244c', 3.5, 52);
          }
        }
      });
    } else if (t >= 7.5 && t < 12.5) {
      if (t >= 7.9) {
        const rd = t - 7.9;
        for (const rock of DEBRIS_CHUNKS) {
          const rx = rock.x0 + rock.vx * rd;
          const ry = groundY + rock.vy * rd + 0.5 * 360 * rd * rd;
          if (ry > H + 120) continue;
          ctx.save();
          ctx.translate(rx, ry);
          ctx.rotate(rock.rot + rock.vrot * rd);
          ctx.fillStyle = silMode === 'black' ? '#000000' : '#140c16';
          ctx.strokeStyle = '#ff244c';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let s = 0; s < rock.sides; s++) {
            const a = (s / rock.sides) * Math.PI * 2;
            const rr = rock.size * (s % 2 === 0 ? 1.0 : 0.76);
            if (s === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
            else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      if (t < 8.75) {
        const slamP = smoothstep(7.5, 7.92, t);
        const vaultP = smoothstep(7.85, 8.75, t);
        const ox = lerp(1280, 990, slamP);
        const kx = lerp(610, 420, vaultP);
        const ky = groundY - Math.sin(vaultP * Math.PI * 0.65) * 340;

        if (t >= 7.9) drawInkBurst(ctx, 960, groundY, clamp((t - 7.9) / 0.8, 0, 1), 791, '#120509', '#ff244c', 320);
        drawFighter(ctx, { kind: 'oni', x: ox, y: groundY, scale: 1.3, facing: -1, lean: lerp(-0.2, 0.72, slamP), crouch: lerp(0.1, 0.58, slamP), swordGrip: slamP < 0.65 ? 'overhead' : 'front', swordAngle: lerp(-2.2, 0.65, slamP), silhouetteMode: silMode, aura: 1.0, t });
        drawFighter(ctx, { kind: 'kage', x: kx, y: ky, scale: 1.18, facing: 1, lean: -0.45, crouch: 0.45, airborne: groundY - ky, swordAngle: -1.6, silhouetteMode: silMode, t });

        if (t >= 7.82 && t < 8.55) {
          const sp = (t - 7.82) / 0.73;
          breakOverlayDraws.push(() => {
            drawSlashArc(ctx, 1180, 120, 740, 420, 920, 900, 105 * (1 - sp), '#ff1e42', '#ffb800', 1 - sp);
            drawShockwaveRing(ctx, 960, groundY, sp, 720, '#ff244c', 16);
            drawSparks(ctx, 960, groundY, sp, 60, 790, '#ffb800', '#ff1e42', 640);
          });
        }
      } else if (t < 11.4) {
        const slashSpecs = [
          { t0: 8.85, x1: 240, y1: 260, cx: 880, cy: 140, x2: 1580, y2: 520, kx: 1380, ky: 460 },
          { t0: 9.18, x1: 1560, y1: 310, cx: 960, cy: 560, x2: 340, y2: 720, kx: 490, ky: 620 },
          { t0: 9.48, x1: 360, y1: 700, cx: 820, cy: 240, x2: 1460, y2: 240, kx: 1320, ky: 320 },
          { t0: 9.76, x1: 1440, y1: 220, cx: 1040, cy: 610, x2: 460, y2: 420, kx: 600, ky: 440 },
          { t0: 10.05, x1: 520, y1: 380, cx: 1020, cy: 240, x2: 1420, y2: 680, kx: 1260, ky: 580, parry: true },
          { t0: 10.35, x1: 1380, y1: 680, cx: 880, cy: 520, x2: 560, y2: 220, kx: 680, ky: 350, parry: true },
          { t0: 10.68, x1: 620, y1: 240, cx: 1020, cy: 480, x2: 1360, y2: 760, kx: 1180, ky: 660, parry: true },
        ];

        const parryActive = t >= 10.05;
        drawFighter(ctx, { kind: 'oni', x: 980, y: groundY, scale: 1.3, facing: t % 0.6 < 0.3 ? -1 : 1, lean: 0.25, crouch: 0.28, swordAngle: parryActive ? -1.4 + Math.sin(t * 28) * 1.1 : -0.7, aura: parryActive ? 1.0 : 0.65, t });

        let cur = slashSpecs[0];
        for (const s of slashSpecs) if (t >= s.t0) cur = s;

        for (const s of slashSpecs) {
          const age = t - s.t0;
          if (age > 0 && age < 0.85) {
            const a = clamp(1 - age / 0.85, 0, 1);
            drawFighter(ctx, { kind: 'kage', x: s.kx, y: s.ky, scale: 1.14, facing: s.x2 > s.x1 ? 1 : -1, lean: 0.65, airborne: groundY - s.ky, swordAngle: -0.5, alpha: a * 0.4, ghostColor: '#00f0ff', t });
            breakOverlayDraws.push(() => {
              drawSlashArc(ctx, s.x1, s.y1, s.cx, s.cy, s.x2, s.y2, 74 * a, '#00f0ff', '#ffffff', a);
              if (s.parry && age < 0.45) {
                drawSparks(ctx, 980, groundY - 210, age / 0.45, 36, Math.floor(s.t0 * 100), '#ffffff', '#ffb800', 480);
                drawShockwaveRing(ctx, 980, groundY - 210, age / 0.38, 340, '#ffb800', 10);
              }
            });
          }
        }
        drawFighter(ctx, { kind: 'kage', x: cur.kx, y: cur.ky, scale: 1.18, facing: cur.x2 > cur.x1 ? 1 : -1, lean: 0.72, airborne: groundY - cur.ky, swordAngle: -0.4, aura: 0.85, t });
      } else {
        const kp = smoothstep(11.4, 12.45, t);
        const kx = lerp(890, 340, easeOutExpo(kp));
        const ky = groundY - Math.sin(kp * Math.PI) * 165;
        drawFighter(ctx, { kind: 'oni', x: 990, y: groundY, scale: 1.3, facing: -1, lean: -0.25, crouch: 0.15, lFootOff: [-30, 0], rFootOff: [92, -135], swordAngle: 0.8, aura: 0.9, t });
        drawFighter(ctx, { kind: 'kage', x: kx, y: ky, scale: 1.18, facing: 1, lean: -0.65, airborne: groundY - ky, swordAngle: -2.1, t });
        if (t >= 11.5 && t < 12.2) {
          const sp = (t - 11.5) / 0.7;
          breakOverlayDraws.push(() => {
            drawShockwaveRing(ctx, 880, groundY - 150, sp, 520, '#ff244c', 16);
            drawSparks(ctx, 880, groundY - 150, sp, 55, 1155, '#00f0ff', '#ff244c', 620);
          });
        }
      }
    } else if (t >= 12.5 && t < 16.55) {
      const swing = smoothstep(14.95, 15.35, t);
      if (t > 13.1) {
        const pillars = [480, 740, 1220, 1520];
        for (let i = 0; i < pillars.length; i++) {
          if (t > 13.2 + i * 0.28) {
            drawLightningBolt(ctx, pillars[i], 40, pillars[i] + (shRng() - 0.5) * 40, groundY + 40, frame * 7 + i * 29, '#ff1e42', 6, 48);
          }
        }
      }
      drawFighter(ctx, { kind: 'kage', x: 370, y: groundY, scale: 1.18, facing: 1, lean: 0.45, crouch: 0.55, swordGrip: 'iaijutsu', swordAngle: 0.1, lFootOff: [-65, 0], rFootOff: [60, 0], aura: 0.45, t });
      drawFighter(ctx, { kind: 'oni', x: 1320, y: groundY, scale: 1.4, facing: -1, lean: lerp(-0.18, 0.65, swing), crouch: lerp(0.05, 0.42, swing), swordGrip: swing < 0.4 ? 'overhead' : 'front', swordAngle: lerp(-2.35, 0.35, swing), aura: 1.35, t });

      if (t >= 15.05) {
        const wp = clamp((t - 15.05) / 1.5, 0, 1);
        const wx = lerp(1240, 320, wp);
        breakOverlayDraws.push(() => {
          drawSlashArc(ctx, wx + 220, 70, wx - 170, 520, wx + 210, 995, 175, '#ff143c', '#ffd166', 0.96);
          drawSlashArc(ctx, wx + 290, 120, wx - 80, 520, wx + 280, 940, 95, '#7a0018', '#ff244c', 0.85);
          drawSparks(ctx, wx, groundY - 40, (wp * 2) % 1, 42, 1510 + frame, '#ffb800', '#ff1e42', 420);
        });
      }
    } else if (t >= 17.6 && t < 21.0) {
      const dt = t - 17.6;
      drawFighter(ctx, { kind: 'oni', x: 780, y: groundY, scale: 1.34, facing: -1, lean: 0.12, crouch: 0.15, swordAngle: 0.45, silhouetteMode: silMode, aura: clamp(0.8 - dt * 0.35, 0, 0.8), t });
      drawFighter(ctx, { kind: 'kage', x: 1380, y: groundY, scale: 1.22, facing: 1, lean: 0.42 - clamp(dt * 0.12, 0, 0.25), crouch: 0.45 - clamp(dt * 0.15, 0, 0.3), swordAngle: -2.65, lFootOff: [-65, 0], rFootOff: [68, 0], silhouetteMode: silMode, aura: clamp(1.1 - dt * 0.35, 0.2, 1.1), t });

      const tearAlpha = clamp(1 - (dt - 0.3) / 2.6, 0, 1);
      if (tearAlpha > 0) {
        breakOverlayDraws.push(() => {
          drawSlashArc(ctx, -80, 565, 960, 515, W + 80, 485, 88 * tearAlpha, '#00f0ff', '#ffffff', tearAlpha);
          drawShockwaveRing(ctx, 960, 535, clamp((dt - 0.2) / 1.4, 0, 1), 980, '#00f0ff', 14);
          drawVoronoiShards(ctx, 960, 535, clamp((dt - 0.2) / 1.6, 0, 1), 32, 1760, '#08050d', '#00f0ff');
          drawSparks(ctx, 960, 535, clamp((dt - 0.2) / 1.3, 0, 1), 70, 1770, '#ffffff', '#00f0ff', 760);
        });
      }
    } else if (t >= 21.0) {
      const sheathed = t >= 21.65;
      const kneel = smoothstep(21.95, 22.75, t);
      drawFighter(ctx, { kind: 'oni', x: 760, y: groundY + kneel * 32, scale: 1.32, facing: -1, lean: lerp(0.12, 0.58, kneel), crouch: lerp(0.15, 0.85, kneel), swordAngle: lerp(0.45, 1.48, kneel), lFootOff: [-45, 0], rFootOff: [52, 0], aura: kneel < 0.3 ? 0.35 : 0, t });
      drawFighter(ctx, { kind: 'kage', x: 1380, y: groundY, scale: 1.22, facing: 1, lean: 0.08, crouch: 0.05, swordGrip: sheathed ? 'sheathed' : 'iaijutsu', swordAngle: 0.14, lFootOff: [-38, 0], rFootOff: [40, 0], t });

      if (t >= 21.62 && t < 22.15) {
        const gp = 1 - Math.abs((t - 21.74) / 0.26);
        if (gp > 0) {
          ctx.save();
          ctx.translate(1388, groundY - 112);
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 32;
          const r = 88 * gp;
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.lineTo(6, -6);
          ctx.lineTo(r * 2.0, 0);
          ctx.lineTo(6, 6);
          ctx.lineTo(0, r);
          ctx.lineTo(-6, 6);
          ctx.lineTo(-r * 2.0, 0);
          ctx.lineTo(-6, -6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      if (t >= 21.95) {
        const sp = clamp((t - 21.95) / 1.4, 0, 1);
        breakOverlayDraws.push(() => {
          drawShockwaveRing(ctx, 760, groundY - 140, sp, 580, '#ff244c', 12);
          drawVoronoiShards(ctx, 760, groundY - 140, sp, 26, 2195, '#ff1e42', '#ffb800');
          drawSparks(ctx, 760, groundY - 140, sp, 52, 2200, '#ffb800', '#ff244c', 560);
        });
      }
    }

    if (!impactMode) drawRain(ctx, t, slowMo, 1.0);
    ctx.restore();
  }

  // Post-world texture layers
  if (!impactMode) {
    ctx.save();
    ctx.drawImage(HALFTONE_CANVAS, 0, 0);
    const grain = GRAIN_TILES[Math.floor(frame / 2) % GRAIN_TILES.length];
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(grain, 0, 0, W, H);
    ctx.restore();

    const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.34, W * 0.5, H * 0.5, W * 0.64);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // 2.39:1 Cinema Letterbox Bars
  ctx.fillStyle = '#030306';
  ctx.fillRect(0, 0, W, BAR_H);
  ctx.fillRect(0, H - BAR_H, W, BAR_H);
  ctx.fillStyle = overdrive > 0.2 ? 'rgba(255, 36, 76, 0.48)' : 'rgba(0, 240, 255, 0.22)';
  ctx.fillRect(0, BAR_H - 1.5, W, 1.5);
  ctx.fillRect(0, H - BAR_H, W, 1.5);

  // Frame-Break Hero FX over the cinema bars!
  for (const fn of breakOverlayDraws) fn();

  // Kinetic Sliced Title Card (0.45s - 2.25s)
  if (t >= 0.45 && t < 2.25) {
    const enter = easeOutExpo((t - 0.45) / 0.35);
    const exit = 1 - smoothstep(1.85, 2.25, t);
    const slice = t >= 1.05 ? easeOutExpo((t - 1.05) / 0.25) : 0;
    ctx.save();
    ctx.globalAlpha = enter * exit;
    ctx.font = '900 84px "DejaVu Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, 244);
    ctx.clip();
    ctx.translate(-slice * 16, -slice * 5);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 22;
    ctx.fillText('KAGE // CRIMSON ECLIPSE', W * 0.5, 244);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 244, W, 200);
    ctx.clip();
    ctx.translate(slice * 18, slice * 5);
    ctx.fillStyle = '#ff244c';
    ctx.shadowColor = '#ff1e42';
    ctx.shadowBlur = 22;
    ctx.fillText('KAGE // CRIMSON ECLIPSE', W * 0.5, 244);
    ctx.restore();

    if (t >= 1.02 && t < 1.38) {
      const fp = 1 - (t - 1.02) / 0.36;
      drawSlashArc(ctx, 280, 254, W * 0.5, 242, W - 280, 234, 24 * fp, '#00f0ff', '#ffffff', fp);
    }

    ctx.font = '700 22px "DejaVu Sans Mono", monospace';
    ctx.fillStyle = 'rgba(225, 240, 255, 0.78)';
    ctx.shadowBlur = 0;
    ctx.fillText('2D SAKUGA ORIGINAL  •  24 FPS  •  1920×1080', W * 0.5, 304);
    ctx.restore();
  }

  // End Card & Fade-out (22.65s - 24.0s)
  if (t >= 22.65) {
    const fade = smoothstep(22.75, 23.85, t);
    ctx.fillStyle = `rgba(3, 3, 6, ${fade * 0.92})`;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = smoothstep(22.7, 23.25, t) * (1 - smoothstep(23.75, 24.0, t));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 58px "DejaVu Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18;
    ctx.fillText('KAGE // CRIMSON ECLIPSE', W * 0.5, H * 0.47);
    ctx.shadowBlur = 0;
    ctx.font = '700 20px "DejaVu Sans Mono", monospace';
    ctx.fillStyle = '#ff244c';
    ctx.fillText('FIN', W * 0.5, H * 0.54);
    ctx.restore();
  }

  if (t < 0.35) {
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - t / 0.35})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (chroma >= 4) {
    applyChromaticAberration(ctx, chroma);
  }
}

const KEYFRAMES = [
  { frame: 28, name: '01_standoff_title' },
  { frame: 66, name: '02_eye_cutin' },
  { frame: 112, name: '03_clash_impact' },
  { frame: 122, name: '04_blade_lock_sparks' },
  { frame: 226, name: '05_aerial_flurry' },
  { frame: 368, name: '06_overdrive_wave' },
  { frame: 416, name: '07_bullettime_hilt' },
  { frame: 423, name: '08_ultimate_kanji' },
  { frame: 522, name: '09_sheathe_finale' },
];
const KEYFRAME_MAP = new Map(KEYFRAMES.map((k) => [k.frame, k]));
const capturedCanvases = new Map();

async function main() {
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
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-shortest',
    OUT_MP4,
  ];

  const ff = spawn(FFMPEG_BIN, ffArgs, { stdio: ['pipe', 'inherit', 'pipe'] });
  let ffStderr = '';
  ff.stderr.on('data', (chunk) => {
    ffStderr += chunk.toString();
  });

  const tStart = Date.now();
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    renderFrame(f);

    if (KEYFRAME_MAP.has(f)) {
      const kf = KEYFRAME_MAP.get(f);
      fs.writeFileSync(path.join(STILLS_DIR, `${kf.name}.png`), mainCanvas.toBuffer('image/png'));
      const thumb = createCanvas(640, 360);
      thumb.getContext('2d').drawImage(mainCanvas, 0, 0, 640, 360);
      capturedCanvases.set(f, thumb);
    }

    const raw = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(raw)) {
      await new Promise((resolve) => ff.stdin.once('drain', resolve));
    }

    if ((f + 1) % 72 === 0 || f === TOTAL_FRAMES - 1) {
      const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
      console.log(`  frame ${f + 1}/${TOTAL_FRAMES} (${(((f + 1) / TOTAL_FRAMES) * 100).toFixed(0)}%)  [${elapsed}s]`);
    }
  }

  ff.stdin.end();
  const exitCode = await new Promise((resolve) => ff.on('close', resolve));
  if (exitCode !== 0) {
    console.error('ffmpeg failed:\n', ffStderr.slice(-2000));
    process.exit(exitCode);
  }

  const sheet = createCanvas(1920, 1080);
  const sctx = sheet.getContext('2d');
  sctx.fillStyle = '#050508';
  sctx.fillRect(0, 0, 1920, 1080);
  KEYFRAMES.forEach((kf, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const thumb = capturedCanvases.get(kf.frame);
    if (thumb) {
      sctx.drawImage(thumb, col * 640, row * 360, 640, 360);
      sctx.fillStyle = 'rgba(0,0,0,0.65)';
      sctx.fillRect(col * 640 + 8, row * 360 + 8, 250, 26);
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
