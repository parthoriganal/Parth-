/** Deterministic particle systems: dust, sparks, glyph rain, bokeh, tracer streams. */
import { TAU, clamp, lerp } from '../core/math.js';
import { hash1, hash2 } from '../core/noise.js';
import { simplex2 } from '../core/noise.js';
import { drawGlow } from '../core/draw.js';

export const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/\\<>[]{}#$%&*+=—∆◊'.split('');

/** Slow drifting motes with depth parallax. */
export function dust(ctx, t, o = {}) {
  const { count = 200, color = '200,240,255', alpha = 0.5, seed = 1, speed = 12, drift = 30, size = 2.4 } = o;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const depth = hash1(i * 3.7 + seed);
    const bx = hash1(i * 7.1 + seed) * 2200 - 140;
    const by = hash1(i * 11.3 + seed) * 1240 - 80;
    const x = bx + Math.sin(t * 0.3 + i) * drift * depth + t * speed * depth * 0.15;
    const y = ((by - t * speed * (0.3 + depth)) % 1240 + 1240) % 1240 - 80;
    const a = alpha * (0.2 + depth * 0.8) * (0.6 + 0.4 * Math.sin(t * 2 + i));
    drawGlow(ctx, x, y, size * (0.7 + depth * 2.2), color, a * 0.8, 0.25);
  }
  ctx.restore();
}

/** Fast radial sparks around a point, endlessly recycled. */
export function sparks(ctx, cx, cy, t, o = {}) {
  const { count = 160, color = '190,240,255', alpha = 1, radius = 900, seed = 2, squash = 1, minR = 40, speed = 0.6 } = o;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const ang = hash1(i * 5.3 + seed) * TAU;
    const rnd = hash1(i * 9.7 + seed);
    const p = ((t * speed * (0.6 + rnd) + hash1(i * 13.1 + seed)) % 1);
    const r = minR + Math.pow(p, 1.5) * radius;
    const len = (18 + rnd * 120) * (0.3 + p);
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r * squash;
    const x2 = cx + Math.cos(ang) * (r + len);
    const y2 = cy + Math.sin(ang) * (r + len) * squash;
    const a = alpha * Math.sin(p * Math.PI) * (0.3 + rnd * 0.7);
    ctx.strokeStyle = `rgba(${color},${a})`;
    ctx.lineWidth = 0.6 + (1 - p) * 2.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Columns of falling/mutating glyphs. */
export function glyphRain(ctx, t, o = {}) {
  const {
    cols = 26,
    rows = 18,
    x0 = 60,
    x1 = 1860,
    y0 = 120,
    y1 = 980,
    size = 22,
    family = 'JetBrainsMono-Regular',
    color = '150,235,255',
    alpha = 0.5,
    speed = 1,
    seed = 4,
    density = 0.55,
  } = o;
  ctx.save();
  ctx.font = `400 ${size}px "${family}"`;
  ctx.textAlign = 'center';
  const dx = (x1 - x0) / (cols - 1);
  const dy = (y1 - y0) / (rows - 1);
  for (let c = 0; c < cols; c++) {
    const colSpeed = 0.5 + hash1(c * 3.1 + seed) * 1.6;
    const off = hash1(c * 7.7 + seed) * rows;
    const flick = 0.5 + hash1(c * 11.3 + seed) * 0.5;
    for (let r = 0; r < rows; r++) {
      const y = y0 + ((r + off + t * colSpeed * speed) % rows) * dy;
      const n = hash2(c, r + Math.floor(t * 8 * flick) * 31);
      if (n > density) continue;
      const g = GLYPHS[Math.floor(hash2(c * 31, r * 17) * GLYPHS.length)];
      const a = alpha * (0.25 + n * 0.9) * (0.55 + 0.45 * Math.sin(t * 3 + c + r));
      ctx.fillStyle = `rgba(${color},${clamp(a, 0, 1)})`;
      ctx.fillText(g, x0 + c * dx, y);
    }
  }
  ctx.restore();
}

/** Large soft bokeh discs for depth. */
export function bokeh(ctx, t, o = {}) {
  const { count = 26, color = '120,200,255', alpha = 0.18, seed = 5, minR = 30, maxR = 160 } = o;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const depth = hash1(i * 3.3 + seed);
    const r = lerp(minR, maxR, depth);
    const x = (hash1(i * 7.9 + seed) * 2100 - 90 + Math.sin(t * 0.2 + i) * 40 * depth);
    const y = (hash1(i * 11.7 + seed) * 1180 - 50 + Math.cos(t * 0.17 + i * 2) * 30 * depth);
    const a = alpha * (0.25 + depth * 0.75);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${a * 0.5})`);
    g.addColorStop(0.72, `rgba(${color},${a * 0.75})`);
    g.addColorStop(0.92, `rgba(${color},${a})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Streams of tracers flowing along a sine field — reads as a data river. */
export function tracerStream(ctx, t, o = {}) {
  const {
    count = 120,
    color = '140,230,255',
    alpha = 0.6,
    yBase = 540,
    spread = 320,
    amp = 70,
    speed = 1.4,
    seed = 8,
    len = 2.2,
    width = 1.4,
    freq = 0.9,
  } = o;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const lane = hash1(i * 3.9 + seed) - 0.5;
    const d = Math.abs(lane) * 2;
    const sp = speed * (0.6 + hash1(i * 7.1 + seed) * 1.2);
    const p = ((t * sp + hash1(i * 11.1 + seed)) % 1);
    const u = p;
    const x = -100 + u * 2120;
    const y = yBase + lane * spread + Math.sin(u * TAU * freq * 3 + t * 0.8 + lane * 6) * amp * (1 - d * 0.5);
    const u2 = Math.max(0, u - 0.02 * len);
    const x2 = -100 + u2 * 2120;
    const y2 = yBase + lane * spread + Math.sin(u2 * TAU * freq * 3 + t * 0.8 + lane * 6) * amp * (1 - d * 0.5);
    const a = alpha * Math.sin(p * Math.PI) * (0.3 + hash1(i * 13.7) * 0.7);
    const g = ctx.createLinearGradient(x, y, x2, y2);
    g.addColorStop(0, `rgba(${color},${a})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.strokeStyle = g;
    ctx.lineWidth = width * (0.5 + hash1(i * 17.3) * 1.2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A swarm that orbits a moving attractor. */
export function swarm(ctx, cx, cy, t, o = {}) {
  const { count = 300, color = '220,245,255', alpha = 0.8, radius = 420, seed = 12, size = 2, arms = 3 } = o;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const a0 = hash1(i * 3.1 + seed) * TAU;
    const rad = radius * (0.25 + hash1(i * 7.3 + seed) * 0.85);
    const spd = 0.4 + hash1(i * 11.9 + seed) * 1.1;
    const a = a0 + t * spd * 0.6 + Math.sin(t * 0.7 + i) * 0.1;
    const wob = simplex2(Math.cos(a) * 1.4, Math.sin(a) * 1.4 + t * 0.2) * 40;
    const x = cx + Math.cos(a) * (rad + wob);
    const y = cy + Math.sin(a) * (rad + wob) * 0.62;
    const al = alpha * (0.2 + hash1(i * 13.3) * 0.8) * (0.5 + 0.5 * Math.sin(t * 2 + i * 0.7));
    drawGlow(ctx, x, y, size * (1 + hash1(i * 17) * 2.5), color, al * 0.9, 0.2);
  }
  ctx.restore();
}

/** Concentric dot-matrix whose dots pulse in a travelling wave. */
export function dotWave(ctx, t, o = {}) {
  const {
    cx = 960,
    cy = 540,
    rings = 30,
    perRing = 60,
    r0 = 60,
    r1 = 900,
    color = '170,235,255',
    alpha = 0.6,
    size = 2.4,
    squash = 0.6,
    speed = 1,
  } = o;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let r = 0; r < rings; r++) {
    const rr = lerp(r0, r1, r / (rings - 1));
    const n = Math.max(8, Math.round(perRing * (r / rings) * 0.4 + 10));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + r * 0.14 + t * 0.1;
      const w = Math.sin(r * 0.5 - t * 3 * speed + i * 0.2);
      const s = size * (0.5 + 1.6 * Math.max(0, w));
      const al = alpha * (0.15 + 0.85 * Math.max(0, w)) * (1 - (r / rings) * 0.55);
      ctx.fillStyle = `rgba(${color},${clamp(al, 0, 1)})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash, s, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}
