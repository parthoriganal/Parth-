/**
 * Liquid ribbon: a 2.5D twisting band drawn as a strip of quads.
 * Each quad's brightness comes from the surface normal of a virtual twist, so a
 * purely 2D construct reads as a dimensional, folding ribbon of light.
 */
import { TAU, clamp, lerp } from '../core/math.js';
import { simplex2 } from '../core/noise.js';

const cache = new Map();
function pathFor(key, N, fn) {
  const c = cache.get(key);
  if (c && c.N === N) return c;
  const pts = new Array(N + 1);
  for (let i = 0; i <= N; i++) pts[i] = { x: 0, y: 0 };
  const o = { N, pts, x: 0, y: 0 };
  cache.set(key, o);
  return o;
}

/**
 * @param {object} o
 *  - width: half-width px
 *  - amp/freq: undulation
 *  - twist: radians across the full length
 *  - speed: twist animation speed
 *  - colors: [edge, mid, light] as "r,g,b"
 */
export function ribbon(ctx, t, o = {}) {
  const {
    N = 150,
    x0 = -160,
    x1 = 2080,
    cy = 540,
    width = 120,
    amp = 90,
    freq = 1.6,
    amp2 = 40,
    freq2 = 3.1,
    phase = 0,
    twist = 9,
    twistSpeed = 0.7,
    shade = '32,120,220',
    mid = '90,230,255',
    light = '255,255,255',
    depth = 0.55,
    alpha = 1,
    glowAmt = 0.5,
    noiseAmp = 0,
    noiseScale = 1.4,
    taper = 0,
    xShift = 0,
  } = o;

  const P = new Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = lerp(x0, x1, u) + xShift;
    let y = cy + Math.sin(u * TAU * freq + phase + t * 0.9) * amp * (0.55 + 0.45 * Math.sin(t * 0.5 + 1)) +
      Math.sin(u * TAU * freq2 - phase * 1.7 + t * 0.6) * amp2;
    if (noiseAmp) y += simplex2(u * freq2 * noiseScale, t * 0.5) * noiseAmp;
    const lean = Math.cos(u * TAU * freq + phase + t * 0.9) * amp * 0.22;
    P[i] = { x: x + lean, y, u };
  }

  // normals
  const quads = [];
  for (let i = 0; i < N; i++) {
    const p0 = P[i];
    const p1 = P[i + 1];
    const tx = p1.x - p0.x;
    const ty = p1.y - p0.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const u = (i + 0.5) / N;
    const tw = u * twist + t * twistSpeed;
    const taperK = taper ? 1 - Math.pow(Math.abs(u - 0.5) * 2, 2) * taper : 1;
    const hw = width * Math.cos(tw) * taperK;
    const d = Math.sin(tw);
    quads.push({ p0, p1, nx, ny, hw, d, tw, u });
  }
  quads.sort((a, b) => a.d - b.d);

  ctx.save();
  ctx.globalAlpha *= alpha;
  for (const q of quads) {
    const { p0, p1, nx, ny, hw, d } = q;
    const lit = clamp(0.2 + 0.8 * Math.abs(Math.cos(q.tw)));
    const warm = clamp(0.5 + 0.5 * d);
    const g = ctx.createLinearGradient(0, p0.y - width, 0, p0.y + width);
    g.addColorStop(0, `rgba(${shade},${0.42 + 0.3 * lit})`);
    g.addColorStop(0.5, `rgba(${mid},${0.4 + 0.45 * lit})`);
    g.addColorStop(1, `rgba(${shade},${0.4 + 0.28 * lit})`);
    ctx.fillStyle = g;
    const ov = 1.2; // overlap neighbours so the strip never shows seams
    const t0x = (p1.x - p0.x), t0y = (p1.y - p0.y);
    const tl = Math.hypot(t0x, t0y) || 1;
    const ex = (t0x / tl) * ov, ey = (t0y / tl) * ov;
    const hh = hw + 0.5;
    ctx.beginPath();
    ctx.moveTo(p0.x - ex + nx * hh, p0.y - ey + ny * hh);
    ctx.lineTo(p1.x + ex + nx * hh, p1.y + ey + ny * hh);
    ctx.lineTo(p1.x + ex - nx * hh, p1.y + ey - ny * hh);
    ctx.lineTo(p0.x - ex - nx * hh, p0.y - ey - ny * hh);
    ctx.closePath();
    ctx.fill();

    // specular streak when the surface turns toward the viewer
    if (lit > 0.93) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${light},${(lit - 0.93) * 1.6})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p0.x + nx * hw * 0.06, p0.y + ny * hw * 0.06);
      ctx.lineTo(p1.x + nx * hw * 0.06, p1.y + ny * hw * 0.06);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();

  // glowing rim on both edges (drawn after, un-sorted, additive)
  if (glowAmt > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= alpha * glowAmt;
    for (const side of [1, -1]) {
      const grd = ctx.createLinearGradient(x0, 0, x1, 0);
      grd.addColorStop(0, `rgba(${light},0)`);
      grd.addColorStop(0.25, `rgba(${light},0.5)`);
      grd.addColorStop(0.6, `rgba(${light},0.75)`);
      grd.addColorStop(1, `rgba(${light},0)`);
      ctx.strokeStyle = grd;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < quads.length; i++) {
        const q = quads[i];
        const px = q.p0.x + q.nx * q.hw * side;
        const py = q.p0.y + q.ny * q.hw * side;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  return quads;
}

/** A flat flowing field line (like a contour of a liquid surface). */
export function contourLines(ctx, t, o = {}) {
  const {
    count = 26,
    x0 = -100,
    x1 = 2020,
    cy = 540,
    spread = 420,
    amp = 60,
    amp2 = 26,
    freq = 1.1,
    freq2 = 2.7,
    phase = 0,
    speed = 0.5,
    color = '110,220,255',
    alpha = 0.35,
    width = 1.2,
    dash = null,
    N = 120,
  } = o;
  ctx.save();
  ctx.lineWidth = width;
  for (let k = 0; k < count; k++) {
    const f = count === 1 ? 0 : k / (count - 1) - 0.5;
    const yBase = cy + f * spread * 1.7;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const x = lerp(x0, x1, u);
      const y =
        yBase +
        Math.sin(u * TAU * freq + phase + t * speed + f * 2.4) * amp * (0.6 + 0.4 * Math.sin(t * 0.4 + f * 3)) +
        Math.sin(u * TAU * freq2 - phase + t * speed * 1.7) * amp2;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = `rgba(${color},${alpha * (0.35 + 0.65 * (1 - Math.abs(f) * 1.4))})`;
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Metallic ductile "blade" shape — a filled wave used as a graphic mass. */
export function blade(ctx, t, o = {}) {
  const {
    cx = 960,
    cy = 540,
    len = 1500,
    thick = 90,
    rot = 0,
    freq = 1.2,
    amp = 40,
    color = '255,190,130',
    alpha = 1,
    shade = true,
  } = o;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.globalAlpha *= alpha;
  const N = 80;
  const edge = (side) => {
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const x = (u - 0.5) * len;
      const k = Math.sin(u * TAU * freq + t * 1.2) * amp;
      const t2 = thick * (0.35 + 0.65 * Math.sin(u * Math.PI)) * side;
      const px = x;
      const py = k + t2;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
  };
  ctx.beginPath();
  edge(1);
  for (let i = N; i >= 0; i--) {
    const u = i / N;
    const x = (u - 0.5) * len;
    const k = Math.sin(u * TAU * freq + t * 1.2) * amp;
    const t2 = thick * (0.35 + 0.65 * Math.sin(u * Math.PI)) * -1;
    ctx.lineTo(x, k + t2);
  }
  ctx.closePath();
  if (shade) {
    const g = ctx.createLinearGradient(0, -thick, 0, thick);
    g.addColorStop(0, `rgba(${color},0.95)`);
    g.addColorStop(0.35, `rgba(255,255,255,0.92)`);
    g.addColorStop(0.6, `rgba(${color},0.9)`);
    g.addColorStop(1, `rgba(${color},0.35)`);
    ctx.fillStyle = g;
  } else ctx.fillStyle = `rgba(${color},1)`;
  ctx.fill();
  ctx.restore();
}
