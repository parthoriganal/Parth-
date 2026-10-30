/**
 * Drawing primitives: cached glow sprites, gradients, tracked text, grain,
 * vignette, scanlines. Everything is resolution-aware (design space is 1920x1080,
 * the renderer scales accordingly).
 */
import { TAU, clamp } from './math.js';
import { hash1 } from './noise.js';
import { surface } from './platform.js';

const glowCache = new Map();

/** Radial falloff sprite, cached by colour + core sharpness. Additive-friendly. */
export function glowSprite(color = '255,255,255', sharp = 0.16, size = 128) {
  const key = `${color}|${sharp}|${size}`;
  let s = glowCache.get(key);
  if (s) return s;
  const { canvas, ctx } = surface(size, size);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, `rgba(${color},1)`);
  g.addColorStop(sharp, `rgba(${color},0.62)`);
  g.addColorStop(sharp + (1 - sharp) * 0.35, `rgba(${color},0.2)`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowCache.set(key, canvas);
  return canvas;
}

export function drawGlow(ctx, x, y, radius, color = '255,255,255', alpha = 1, sharp = 0.16) {
  if (alpha <= 0.002 || radius <= 0.4) return;
  const prev = ctx.globalAlpha;
  const prevOp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = prev * clamp(alpha, 0, 1);
  const spr = glowSprite(color, sharp);
  ctx.drawImage(spr, x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = prev;
  ctx.globalCompositeOperation = prevOp;
}

export function radialFill(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function linearFill(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** A bloom-ish horizontal light streak. */
export function drawStreak(ctx, cx, cy, len, thick, color = '255,255,255', alpha = 1) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= clamp(alpha, 0, 1);
  const g = ctx.createLinearGradient(cx - len / 2, 0, cx + len / 2, 0);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(0.5, `rgba(${color},0.95)`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(cx - len / 2, cy - thick / 2, len, thick);
  const vg = ctx.createLinearGradient(0, cy - thick * 4, 0, cy + thick * 4);
  vg.addColorStop(0, `rgba(${color},0)`);
  vg.addColorStop(0.5, `rgba(${color},0.22)`);
  vg.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = vg;
  ctx.fillRect(cx - len * 0.34, cy - thick * 4, len * 0.68, thick * 8);
  ctx.restore();
}

/** Layout text with custom tracking. Returns per-glyph x offsets. */
export function measureTracked(ctx, text, tracking = 0) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  return { chars, widths, total };
}

export function drawTracked(ctx, text, x, y, { tracking = 0, align = 'left', color = '#fff' } = {}) {
  const { chars, widths, total } = measureTracked(ctx, text, tracking);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.fillStyle = color;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cx, y);
    cx += widths[i] + tracking;
  }
  return total;
}

/** Line-by-line type block with tracking; returns total height. */
export function drawBlock(ctx, lines, x, y, opts = {}) {
  const { leading = 1, tracking = 0, align = 'left', color = '#fff' } = opts;
  const size = opts.size ?? parseFloat(ctx.font);
  const lh = size * leading;
  lines.forEach((ln, i) => drawTracked(ctx, ln, x, y + i * lh, { tracking, align, color }));
  return lines.length * lh;
}

let grainTiles = null;
function buildGrain(count = 4, size = 384) {
  const tiles = [];
  for (let k = 0; k < count; k++) {
    const { canvas, ctx } = surface(size, size);
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const v = hash1(p * 977 + k * 7919) * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    tiles.push(canvas);
  }
  return tiles;
}

/** Animated film grain in screen space. */
export function grain(ctx, w, h, t, amount = 0.06) {
  if (!grainTiles) grainTiles = buildGrain();
  const tile = grainTiles[Math.floor(t * 30) % grainTiles.length];
  const ox = -Math.floor((t * 7919) % tile.width);
  const oy = -Math.floor((t * 104729) % tile.height);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = amount;
  for (let y = oy; y < h; y += tile.height) {
    for (let x = ox; x < w; x += tile.width) ctx.drawImage(tile, x, y);
  }
  ctx.restore();
}

export function vignette(ctx, w, h, strength = 0.55, radius = 1.05) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, Math.max(w, h) * 0.62 * radius);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.62, `rgba(0,0,0,${strength * 0.35})`);
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function scanlines(ctx, w, h, alpha = 0.05, gap = 3) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(255,255,255,1)`;
  for (let y = 0; y < h; y += gap * 2) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, y, w, gap * 0.55);
  }
  ctx.restore();
}

/** Soft dark-to-transparent edge shading to keep eyes inside the frame. */
export function edgeShade(ctx, w, h, color = '0,0,0', a = 0.5, thickness = 0.18) {
  const tw = w * thickness;
  const th = h * thickness;
  const l = ctx.createLinearGradient(0, 0, tw, 0);
  l.addColorStop(0, `rgba(${color},${a})`);
  l.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = l;
  ctx.fillRect(0, 0, tw, h);
  const r = ctx.createLinearGradient(w, 0, w - tw, 0);
  r.addColorStop(0, `rgba(${color},${a})`);
  r.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = r;
  ctx.fillRect(w - tw, 0, tw, h);
  const b = ctx.createLinearGradient(0, h, 0, h - th);
  b.addColorStop(0, `rgba(${color},${a})`);
  b.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = b;
  ctx.fillRect(0, h - th, w, th);
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Regular polygon / star path. */
export function polyPath(ctx, cx, cy, radius, sides, rot = 0, inner = null) {
  ctx.beginPath();
  if (inner == null) {
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * TAU;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
  } else {
    for (let i = 0; i < sides * 2; i++) {
      const a = rot + (i / (sides * 2)) * TAU;
      const r = i % 2 ? radius * inner : radius;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
  }
  ctx.closePath();
}

/** Draw a dashed circle arc (returns nothing). */
export function arcDash(ctx, cx, cy, r, a0, a1, dash, offset = 0) {
  ctx.beginPath();
  ctx.setLineDash(dash);
  ctx.lineDashOffset = offset;
  ctx.arc(cx, cy, r, a0, a1);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function withLayer(ctx, blend, alpha, fn) {
  ctx.save();
  if (blend) ctx.globalCompositeOperation = blend;
  if (alpha != null) ctx.globalAlpha *= alpha;
  fn();
  ctx.restore();
}

/** Fit font size so that text fills a target width. */
export function fitFont(ctx, text, family, maxWidth, startSize = 400, weight = 400) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  const w = ctx.measureText(text).width;
  if (w <= 0) return startSize;
  return Math.floor((startSize * maxWidth) / w);
}
