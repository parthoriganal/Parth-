/**
 * Simulated depth: a tiny perspective camera and volumetric constructs built
 * purely from 2D primitives. No 3D engine — just projection maths.
 */
import { TAU, clamp } from '../core/math.js';
import { hash1 } from '../core/noise.js';
import { drawGlow } from '../core/draw.js';

export function makeCam({ fov = 900, x = 0, y = 0, cx = 960, cy = 540 } = {}) {
  return { fov, x, y, cx, cy };
}

export function project(cam, x, y, z) {
  const zz = Math.max(0.35, z);
  const s = cam.fov / zz;
  return { x: cam.cx + (x - cam.x) * s, y: cam.cy + (y - cam.y) * s, s };
}

/** A tunnel of rotating polygon frames rushing toward the camera. */
export function drawTunnel(ctx, F, opts) {
  const {
    t = 0,
    cam = makeCam(),
    rings = 34,
    sides = 6,
    radius = 260,
    spacing = 34,
    speed = 240,
    zNear = 6,
    rotation = 0.35,
    color = '190,245,255',
    width = 2.2,
    alpha = 1,
    twist = 0,
    glow = 0.5,
    dash = null,
  } = opts;

  const total = rings * spacing;
  const phase = (t * speed) % total;

  for (let i = 0; i < rings; i++) {
    const z = ((i * spacing - phase) % total + total) % total + zNear;
    if (z < zNear * 0.6) continue;
    const s = cam.fov / z;
    const rr = radius * s;
    if (rr > 4200) continue;
    const fade = clamp(1 - (z - zNear) / total) ** 0.7;
    const rot = t * rotation + i * twist + Math.sin(z * 0.02 + t) * 0.06;
    const a = alpha * fade * clamp((rr + 40) / 120);
    if (a < 0.004) continue;
    ctx.save();
    ctx.strokeStyle = `rgba(${color},${a * 0.55})`;
    ctx.lineWidth = Math.max(0.6, width * s * 4.5);
    if (dash) ctx.setLineDash([dash * s, dash * s * 0.55]);
    ctx.beginPath();
    for (let k = 0; k < sides; k++) {
      const ang = rot + (k / sides) * TAU;
      const px = cam.cx + Math.cos(ang) * rr - cam.x * s;
      const py = cam.cy + Math.sin(ang) * rr * 0.82 - cam.y * s;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    // inner hot edge on the closest rings
    if (rr < 700) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.5})`;
      ctx.lineWidth = Math.max(0.5, width * s * 1.6);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  if (glow > 0) {
    drawGlow(ctx, cam.cx - cam.x * 6, cam.cy - cam.y * 6, 260 + Math.sin(t * 2) * 30, '180,240,255', glow * 0.5, 0.3);
  }
}

/** Radial light streaks with depth (parallax against the tunnel). */
export function drawRadialStreaks(ctx, F, opts) {
  const {
    t = 0,
    cam = makeCam(),
    count = 220,
    color = '200,245,255',
    alpha = 0.5,
    length = 1.0,
    inner = 120,
    speed = 1,
    seed = 0,
  } = opts;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const ang = hash1(i * 3 + seed * 97) * TAU;
    const z = 4 + hash1(i * 7 + seed) * 120;
    const s = cam.fov / z;
    const r0 = inner * s * 0.25;
    const r1 = r0 + (260 + hash1(i * 11 + seed) * 900) * s * 0.35 * length;
    const a = alpha * clamp(1 - z / 110) * (0.35 + hash1(i * 13) * 0.65);
    const x0 = cam.cx + Math.cos(ang) * r0 - cam.x * s * 0.2;
    const y0 = cam.cy + Math.sin(ang) * r0 - cam.y * s * 0.2;
    const x1 = cam.cx + Math.cos(ang) * r1 - cam.x * s * 0.2;
    const y1 = cam.cy + Math.sin(ang) * r1 - cam.y * s * 0.2;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(${color},0)`);
    g.addColorStop(0.4, `rgba(${color},${a})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(0.7, 2.4 * s * 0.3);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A receding plane grid (floor or wall) drawn with perspective — the backbone of
 * the architectural scene.
 */
export function drawGridPlane(ctx, opts) {
  const {
    cam = makeCam(),
    t = 0,
    horizon = 0.52,
    lines = 26,
    lanes = 20,
    color = '140,220,255',
    alpha = 0.5,
    zNear = 2,
    zFar = 160,
    speed = 1,
    width = 1.1,
    plane = 'floor',
    curve = 0,
  } = opts;
  const hy = cam.cy + (horizon - 0.5) * 1080;
  ctx.save();
  ctx.lineCap = 'round';

  // depth lines (receding)
  for (let i = 0; i <= lanes; i++) {
    const u = i / lanes;
    const x = (u - 0.5) * 2600;
    const a = alpha * (0.45 + 0.55 * Math.abs(Math.cos(u * Math.PI)));
    const p0 = project(cam, x, 0, zNear * 2);
    const p1 = project(cam, x, 0, zFar);
    const g = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
    g.addColorStop(0, `rgba(${color},${a})`);
    g.addColorStop(0.4, `rgba(${color},${a * 0.5})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.strokeStyle = g;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // cross lines (moving toward camera)
  const span = zFar;
  for (let i = 0; i < lines; i++) {
    const z = ((i / lines) * span - (t * speed * span) / 6) % span;
    const zz = (z + span) % span + zNear;
    const s = cam.fov / zz;
    const y = cam.cy + (0 - cam.y) * s;
    if (plane === 'floor') {
      // handled by projection above
    }
    const a = alpha * clamp(1 - zz / span) ** 1.1;
    if (a < 0.01) continue;
    ctx.strokeStyle = `rgba(${color},${a})`;
    ctx.lineWidth = Math.max(0.5, (width * 1.6) / (1 + zz * 0.05));
    ctx.beginPath();
    const pL = project(cam, -1300, 0, zz);
    const pR = project(cam, 1300, 0, zz);
    const yOff = curve ? Math.sin(zz * 0.2 + t) * curve * 10 : 0;
    ctx.moveTo(pL.x, pL.y + yOff);
    ctx.lineTo(pR.x, pR.y + yOff);
    ctx.stroke();
  }
  ctx.restore();
  return hy;
}

/** Bright horizontal anamorphic flare — the signature "light" element. */
export function anamorphicFlare(ctx, x, y, opts = {}) {
  const { length = 1500, thickness = 2.2, color = '200,240,255', alpha = 1, core = 40, tilt = 0 } = opts;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.globalAlpha *= alpha;

  const g = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(0.42, `rgba(${color},${0.35})`);
  g.addColorStop(0.5, `rgba(255,255,255,${0.95})`);
  g.addColorStop(0.58, `rgba(${color},${0.35})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-length / 2, -thickness / 2, length, thickness);

  const v = ctx.createLinearGradient(0, -core, 0, core);
  v.addColorStop(0, `rgba(${color},0)`);
  v.addColorStop(0.5, `rgba(255,255,255,0.9)`);
  v.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = v;
  ctx.fillRect(-length * 0.13, -core / 2, length * 0.26, core);

  drawGlow(ctx, 0, 0, core * 2.1, '255,255,255', 0.85, 0.1);
  drawGlow(ctx, 0, 0, core * 5, color.split(',').map((c) => Math.round(Number(c) * 0.8)).join(','), 0.5, 0.2);
  ctx.restore();
}

/** Volumetric "god ray" wedges from a point. */
export function lightWedges(ctx, cx, cy, t, opts = {}) {
  const { count = 12, color = '150,230,255', alpha = 0.16, radius = 1500, rotate = 0.05 } = opts;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, cy);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + t * rotate;
    const spread = 0.18 + hash1(i * 17) * 0.22;
    const len = radius * (0.5 + hash1(i * 31) * 0.7);
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    g.addColorStop(0, `rgba(${color},${alpha})`);
    g.addColorStop(0.6, `rgba(${color},${alpha * 0.25})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, a - spread / 2, a + spread / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Concentric ellipse rings (a "shockwave" family) that read as a portal. */
export function shockwave(ctx, cx, cy, t, opts = {}) {
  const { count = 3, radius = 900, life = 0.9, color = '190,245,255', squash = 0.62, width = 3, start = 0 } = opts;
  const lt = t - start;
  if (lt < 0 || lt > life * count) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const p = (lt - i * life * 0.28) / life;
    if (p < 0 || p > 1) continue;
    const r = radius * Math.pow(p, 0.55) * (1 - i * 0.12);
    const a = (1 - p) ** 2 * 0.9;
    ctx.strokeStyle = `rgba(${color},${a})`;
    ctx.lineWidth = width * (1 - p * 0.6);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * squash, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}
