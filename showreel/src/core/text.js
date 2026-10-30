/** Typography: tracked layout, per-glyph transforms, gradients, slicing. */
import { scratch, clearScratch } from './pool.js';

export const FONT = {
  display: 'Anton',
  sans: 'SpaceGrotesk-Regular',
  sansMed: 'SpaceGrotesk-Medium',
  sansSB: 'SpaceGrotesk-SemiBold',
  sansBold: 'SpaceGrotesk-Bold',
  sansLight: 'SpaceGrotesk-Light',
  serif: 'InstrumentSerif-Regular',
  serifIt: 'InstrumentSerif-Italic',
  mono: 'JetBrainsMono-Regular',
  monoMed: 'JetBrainsMono-Medium',
  monoBold: 'JetBrainsMono-Bold',
  monoLight: 'JetBrainsMono-Light',
};

export const setFont = (ctx, size, family = FONT.display) => {
  ctx.font = `400 ${size}px "${family}"`;
};

/** Width of tracked text (does not draw). */
export function trackedWidth(ctx, text, tracking = 0) {
  const chars = [...text];
  let w = 0;
  for (let i = 0; i < chars.length; i++) w += ctx.measureText(chars[i]).width + (i < chars.length - 1 ? tracking : 0);
  return w;
}

/**
 * Draw text glyph-by-glyph with tracking.
 * `perChar(i, n)` may return {dx,dy,scale,rot,alpha,skewX,color,yOff}.
 */
export function drawText(ctx, text, x, y, opts = {}) {
  const {
    size = 100,
    family = FONT.display,
    tracking = 0,
    align = 'center',
    color = '#fff',
    alpha = 1,
    gradient = null,
    stroke = null,
    strokeWidth = 2,
    perChar = null,
    composite = null,
    shadow = 0,
  } = opts;
  setFont(ctx, size, family);
  if (opts.bold) ctx.font = `700 ${size}px "${family}"`;
  if (opts.weight) ctx.font = `${opts.weight} ${size}px "${family}"`;

  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b, i) => a + b + (i < chars.length - 1 ? tracking : 0), 0);
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;

  ctx.save();
  if (composite) ctx.globalCompositeOperation = composite;
  ctx.globalAlpha *= alpha;
  ctx.textBaseline = opts.baseline ?? 'alphabetic';
  ctx.textAlign = 'left';
  if (gradient) ctx.fillStyle = gradient;
  else ctx.fillStyle = color;

  for (let i = 0; i < chars.length; i++) {
    const m = perChar ? perChar(i, chars.length) : null;
    const cw = widths[i];
    const cx = cursor + (m?.dx ?? 0);
    const cy = y + (m?.yOff ?? 0) + (m?.dy ?? 0);
    if (!m || (m.alpha ?? 1) > 0.001) {
      ctx.save();
      ctx.globalAlpha *= m?.alpha ?? 1;
      const px = cx + cw / 2;
      ctx.translate(px, cy);
      if (m?.rot) ctx.rotate(m.rot);
      if (m?.skewX) ctx.transform(1, 0, m.skewX, 1, 0, 0);
      if (m?.scale != null) ctx.scale(m.scale, m.scale * (m.scaleY ?? 1));
      ctx.translate(-cw / 2, 0);
      const chColor = m?.color ?? null;
      if (chColor) ctx.fillStyle = chColor;
      else if (gradient) ctx.fillStyle = gradient;
      if (shadow > 0) {
        ctx.shadowColor = opts.shadowColor ?? 'rgba(120,220,255,0.9)';
        ctx.shadowBlur = shadow;
      }
      if (stroke) {
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = stroke;
        ctx.strokeText(chars[i], 0, 0);
      }
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
    }
    cursor += cw + tracking;
  }
  ctx.restore();
  return total;
}

/** Rasterise text into a scratch buffer at 1:1 design-space resolution. */
export function rasterText(key, F, opts, pad = 60) {
  const { text, size = 300, family = FONT.display, tracking = 0, color = '#fff', weight = 400 } = opts;
  const probe = scratch('probe', 8, 8).ctx;
  probe.font = `${weight} ${size}px "${family}"`;
  const w = Math.ceil(trackedWidth(probe, text, tracking)) + pad * 2;
  const h = Math.ceil(size * 1.5) + pad * 2;
  const s = scratch(key, w, h);
  clearScratch(s);
  const c = s.ctx;
  c.save();
  c.font = `${weight} ${size}px "${family}"`;
  c.fillStyle = color;
  c.textBaseline = 'middle';
  const chars = [...text];
  const widths = chars.map((ch) => c.measureText(ch).width);
  const total = widths.reduce((a, b, i) => a + b + (i < chars.length - 1 ? tracking : 0), 0);
  let x = pad + (w - pad * 2 - total) / 2;
  for (let i = 0; i < chars.length; i++) {
    c.fillText(chars[i], x, h / 2);
    x += widths[i] + tracking;
  }
  c.restore();
  return { surface: s, w, h, pad, size };
}

/** Horizontal band slicing / shearing of a raster (datamosh-style). */
export function sliceCopy(ctx, src, { y0 = 0, y1 = 0, offset = 0, alpha = 1, scale = 1, rotate = 0, blend = 'source-over' } = {}) {
  const h = src.h ?? src.canvas.height;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = blend;
  const hh = y1 - y0;
  ctx.translate(offset, y0);
  if (rotate) ctx.rotate(rotate);
  if (scale !== 1) {
    ctx.translate(-src.w * (scale - 1) / 2, -hh * (scale - 1) / 2);
    ctx.scale(scale, scale);
  }
  ctx.drawImage(src.canvas, 0, y0, src.w, hh, 0, 0, src.w, hh);
  ctx.restore();
}

/** A slab of colour with an edge highlight — used constantly for "light" shapes. */
export function lightBar(ctx, x, y, w, h, color = '180,240,255', alpha = 1, radius = 0) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(0.5, `rgba(${color},1)`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  if (radius) {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, radius) : ctx.rect(x, y, w, h);
    ctx.fill();
  } else ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Small mono microtype label with a leading tick, used for the HUD feel. */
export function microLabel(ctx, text, x, y, { size = 15, color = 'rgba(255,255,255,0.55)', align = 'left', tick = true, tracking = 3 } = {}) {
  ctx.save();
  setFont(ctx, size, FONT.mono);
  ctx.fillStyle = color;
  const w = trackedWidth(ctx, text, tracking);
  if (align === 'right') x -= w;
  if (align === 'center') x -= w / 2;
  if (tick) {
    ctx.fillRect(x - 16, y - size * 0.36, 8, 1.4);
  }
  ctx.textBaseline = 'alphabetic';
  let cx = x;
  for (const ch of [...text]) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
  ctx.restore();
  return w;
}

/** Largest font size (<= max) so that tracked text fits maxWidth. */
export function fitSize(ctx, text, family, maxWidth, max = 400, tracking = 0) {
  setFont(ctx, 100, family);
  const w100 = trackedWidth(ctx, text, tracking * (100 / max));
  const size = Math.floor((100 * maxWidth) / Math.max(1, w100));
  return Math.min(max, size);
}

/**
 * Draw a whole string with tracking via native letterSpacing — keeps kerning and
 * italic ligatures intact, and is far cheaper than per-glyph layout.
 */
export function drawString(ctx, text, x, y, o = {}) {
  const {
    size = 100,
    family = FONT.display,
    tracking = 0,
    align = 'center',
    color = '#fff',
    weight = 400,
    baseline = 'middle',
    alpha = 1,
    gradient = null,
    blend = null,
    stroke = null,
    strokeWidth = 1.5,
  } = o;
  ctx.save();
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.letterSpacing = `${tracking}px`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.globalAlpha *= alpha;
  if (blend) ctx.globalCompositeOperation = blend;
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = gradient ?? color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Width of a string with tracking applied (native letterSpacing). */
export function stringWidth(ctx, text, size, family, tracking = 0, weight = 400) {
  ctx.save();
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.letterSpacing = `${tracking}px`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

/** Wrap output of a scene into a soft dark scrim to guarantee type legibility. */
export function scrim(ctx, x, y, rx, ry, strength = 0.55, color = '4,4,6') {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, `rgba(${color},${strength})`);
  g.addColorStop(0.55, `rgba(${color},${strength * 0.5})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.translate(x, y);
  ctx.scale(1, ry / Math.max(rx, ry));
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
  ctx.restore();
}
