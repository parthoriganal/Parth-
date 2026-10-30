/** Pattern systems: halftone, moiré, kaleidoscope, lattices, illusion fields. */
import { TAU, clamp, lerp } from '../core/math.js';
import { hash2 } from '../core/noise.js';

/** Halftone grid with a luminance field function. 2D and cheap. */
export function halftone(ctx, o = {}) {
  const {
    x0 = 0,
    x1 = 1920,
    y0 = 0,
    y1 = 1080,
    step = 18,
    maxR = 8,
    color = '255,255,255',
    alpha = 1,
    field = () => 0.5,
    angle = 0.6,
  } = o;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  ctx.save();
  ctx.fillStyle = `rgba(${color},1)`;
  ctx.globalAlpha *= alpha;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const diag = Math.hypot(x1 - x0, y1 - y0) / 2;
  for (let gy = -diag; gy <= diag; gy += step) {
    for (let gx = -diag; gx <= diag; gx += step) {
      const x = cx + gx * ca - gy * sa;
      const y = cy + gx * sa + gy * ca;
      if (x < x0 - 10 || x > x1 + 10 || y < y0 - 10 || y > y1 + 10) continue;
      const v = field(x, y);
      if (v <= 0.02) continue;
      const r = maxR * clamp(v);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Perspective dot plane receding to a vanishing point, undulating. */
export function dotPerspective(ctx, t, o = {}) {
  const {
    cx = 960,
    horizon = 470,
    rows = 22,
    cols = 46,
    color = '130,215,255',
    alpha = 0.5,
    size = 2.2,
    spread = 2600,
    zNear = 1.2,
    zFar = 60,
    speed = 6,
    wave = 60,
    squash = 1,
  } = o;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let r = 0; r < rows; r++) {
    const v = r / rows;
    const z = lerp(zNear, zFar, Math.pow(v, 1.9));
    const pz = ((z - (t * speed) % zFar) % zFar + zFar) % zFar + 0.6;
    const s = 900 / pz;
    const y = horizon + s * 90 * squash;
    if (y > 1150) continue;
    const fade = clamp(1 - pz / zFar) ** 0.8;
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1) - 0.5;
      const x = cx + u * spread * (s / 600);
      const off = Math.sin(u * 8 + t * 0.8 + pz * 0.3) * wave * (s / 600);
      if (x < -60 || x > 1980) continue;
      const a = alpha * fade * (0.3 + 0.7 * Math.abs(Math.cos(u * Math.PI)));
      ctx.fillStyle = `rgba(${color},${clamp(a, 0, 1)})`;
      const sz = clamp(size * (s / 500), 0.4, 7);
      ctx.beginPath();
      ctx.arc(x, y + off, sz, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Two rotating sets of lines — produces shifting moiré interference. */
export function moire(ctx, t, o = {}) {
  const {
    cx = 960,
    cy = 540,
    count = 90,
    radius = 1200,
    color = '190,240,255',
    alpha = 0.18,
    speedA = 0.12,
    speedB = -0.09,
    gap = 3,
    width = 1.6,
    scale = 1,
  } = o;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(${color},${alpha})`;
  ctx.lineWidth = width;
  for (let set = 0; set < 2; set++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(set ? t * speedB : t * speedA);
    ctx.scale(set ? scale * 0.8 : scale, set ? scale * 0.8 : scale);
    ctx.beginPath();
    for (let i = -count; i <= count; i++) {
      const x = i * (gap * 6);
      ctx.moveTo(x, -radius);
      ctx.lineTo(x, radius);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Kaleidoscope: draws `segments` mirrored wedges of a scratch surface.
 * `src` must be { canvas, w, h } already rendered at full-frame size.
 */
export function kaleido(ctx, src, o = {}) {
  const {
    cx = 960,
    cy = 540,
    segments = 12,
    radius = 1100,
    rot = 0,
    alpha = 1,
    composite = 'lighter',
    scale = 1,
    mirror = true,
  } = o;
  const step = TAU / segments;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = composite;
  for (let i = 0; i < segments; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot + i * step);
    ctx.scale(scale, scale);
    if (mirror && i % 2) ctx.scale(1, -1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -step / 2, step / 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(src.canvas, -cx, -cy);
    ctx.restore();
  }
  ctx.restore();
}

/** Hexagonal lattice with pulsing edges. */
export function hexLattice(ctx, t, o = {}) {
  const { cx = 960, cy = 540, size = 46, color = '140,225,255', alpha = 0.35, width = 1, radius = 1200, decay = 0 } = o;
  ctx.save();
  ctx.strokeStyle = `rgba(${color},${alpha})`;
  ctx.lineWidth = width;
  const w = size * 1.732;
  const h = size * 1.5;
  ctx.beginPath();
  const nx = Math.ceil(radius / w);
  const ny = Math.ceil(radius / h);
  for (let j = -ny; j <= ny; j++) {
    for (let i = -nx; i <= nx; i++) {
      const x = cx + i * w + (j % 2 ? w / 2 : 0);
      const y = cy + j * h;
      const d = Math.hypot(x - cx, y - cy);
      if (d > radius) continue;
      if (decay && hash2(i, j) > decay) continue;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + Math.PI / 6;
        const px = x + Math.cos(a) * size;
        const py = y + Math.sin(a) * size;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** Radial ray burst (sunburst) — a classic editorial device, done with light. */
export function sunburst(ctx, t, o = {}) {
  const { cx = 960, cy = 540, count = 60, color = '255,220,180', alpha = 0.1, radius = 1600, rot = 0, width = 0.5 } = o;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, cy);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + t * rot;
    const spread = (TAU / count) * width;
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * radius, Math.sin(a) * radius);
    g.addColorStop(0, `rgba(${color},${alpha})`);
    g.addColorStop(0.55, `rgba(${color},${alpha * 0.4})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, a - spread, a + spread);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Vertical/horizontal slit-scan stripe field, useful for glitch and warp. */
export function stripes(ctx, o = {}) {
  const {
    x0 = 0,
    y0 = 0,
    w = 1920,
    h = 1080,
    count = 40,
    vertical = true,
    color = '255,255,255',
    alphaAt = () => 0.2,
    thickness = 0.5,
  } = o;
  ctx.save();
  ctx.fillStyle = `rgba(${color},1)`;
  for (let i = 0; i < count; i++) {
    const a = alphaAt(i / (count - 1), i);
    if (a <= 0.002) continue;
    ctx.globalAlpha = a;
    if (vertical) {
      const x = x0 + ((i + 0.5) / count) * w;
      ctx.fillRect(x - (w / count) * thickness * 0.5, y0, (w / count) * thickness, h);
    } else {
      const y = y0 + ((i + 0.5) / count) * h;
      ctx.fillRect(x0, y - (h / count) * thickness * 0.5, w, (h / count) * thickness);
    }
  }
  ctx.restore();
}

/** Concentric ring interference — reads as an optical illusion / tunnel. */
export function ringField(ctx, t, o = {}) {
  const {
    cx = 960,
    cy = 540,
    count = 70,
    r0 = 8,
    r1 = 1200,
    color = '170,235,255',
    alpha = 0.3,
    width = 1.3,
    squash = 0.72,
    rot = 0,
    wobble = 0,
    speed = 1,
  } = o;
  ctx.save();
  ctx.strokeStyle = `rgba(${color},${alpha})`;
  ctx.lineWidth = width;
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  for (let i = 0; i < count; i++) {
    const p = i / (count - 1);
    const r = lerp(r0, r1, Math.pow(p, 1.7)) * (1 + Math.sin(i * 0.7 + t * speed * 2) * 0.03);
    const wb = wobble ? Math.sin(i * 0.5 + t * speed) * wobble : 0;
    ctx.globalAlpha = alpha * (0.25 + 0.75 * (1 - p));
    ctx.beginPath();
    ctx.ellipse(0, 0, r + wb, r * squash + wb * squash, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/** Flowing "liquid metal" field using layered sine bands. */
export function liquidBands(ctx, t, o = {}) {
  const {
    bands = 26,
    colorA = '10,20,40',
    colorB = '60,150,230',
    colorC = '200,250,255',
    alpha = 0.9,
    amp = 90,
    freq = 1.4,
    speed = 0.7,
    y0 = -60,
    y1 = 1140,
    width = 1920,
  } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let i = 0; i < bands; i++) {
    const p = i / (bands - 1);
    const yBase = lerp(y0, y1, p);
    ctx.beginPath();
    const N = 46;
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      const x = u * width;
      const y =
        yBase +
        Math.sin(u * TAU * freq + t * speed + p * 2.6) * amp * (0.4 + 0.6 * Math.sin(t * 0.5 + p)) +
        Math.sin(u * TAU * freq * 2.3 - t * speed * 1.4 + p * 4) * amp * 0.28;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.lineWidth = 2 + 26 * Math.pow(1 - Math.abs(p - 0.5) * 2, 2);
    const mix = Math.abs(Math.sin(p * Math.PI * 1.3 + t * 0.4));
    const col = mix > 0.62 ? colorC : mix > 0.3 ? colorB : colorA;
    ctx.strokeStyle = `rgba(${col},${0.25 + 0.75 * (1 - Math.abs(p - 0.5) * 1.6)})`;
    ctx.stroke();
  }
  ctx.restore();
}
