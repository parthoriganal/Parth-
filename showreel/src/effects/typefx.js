/** Kinetic typography devices. */
import { clamp, ease, lerp } from '../core/math.js';
import { hash1 } from '../core/noise.js';
import { FONT, drawText, setFont, trackedWidth } from '../core/text.js';

/**
 * Big stacked word block: words slide in with stagger, get a slice-glitch and
 * a scanline mask. Returns nothing.
 */
export function stackedWords(ctx, words, t, o = {}) {
  const {
    cx = 960,
    y0 = 300,
    size = 150,
    family = FONT.display,
    tracking = -2,
    lineH = 1.02,
    inAt = 0,
    stagger = 0.07,
    dur = 0.5,
    align = 'center',
    color = '#fff',
    gradient = null,
    direction = 1,
    exitAt = Infinity,
    exitDur = 0.3,
    offsetX = 0,
    squashIn = true,
  } = o;
  setFont(ctx, size, family);
  const lh = size * lineH;
  words.forEach((word, i) => {
    const st = inAt + i * stagger;
    const p = clamp((t - st) / dur);
    if (p <= 0) return;
    const ex = clamp((t - exitAt - i * 0.04) / exitDur);
    if (ex >= 1) return;
    const e = ease.outExpo(p);
    const a = e * (1 - ex);
    const y = y0 + i * lh + (1 - e) * size * 0.42 * direction - ex * size * 0.5 * direction;
    const sc = squashIn ? lerp(1.14, 1, e) : 1;
    const tr = tracking + (1 - e) * 40;
    ctx.save();
    ctx.translate(cx + offsetX, y);
    ctx.scale(1, sc);
    ctx.globalAlpha = a;
    if (ex > 0) ctx.transform(1, 0, ex * 0.25, 1, 0, 0);
    drawText(ctx, word, 0, 0, {
      size,
      family,
      tracking: tr,
      align,
      color,
      gradient,
      baseline: 'middle',
      perChar: (k) => ({ dy: Math.sin(k * 0.8 + t * 6) * 1.2 * (1 - e) }),
    });
    ctx.restore();
  });
}

/** Per-character elastic pop with rotation and colour sweep. */
export function elasticChars(ctx, text, x, y, t, o = {}) {
  const {
    size = 240,
    family = FONT.display,
    tracking = 4,
    start = 0,
    stagger = 0.045,
    dur = 0.7,
    color = '#fff',
    gradient = null,
    align = 'center',
    wave = 0,
    exit = Infinity,
    exitDur = 0.35,
    baseline = 'middle',
  } = o;
  setFont(ctx, size, family);
  const n = [...text].length;
  const total = trackedWidth(ctx, text, tracking);
  const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  let cursor = x0;
  const chars = [...text];
  ctx.save();
  ctx.textBaseline = baseline;
  for (let i = 0; i < n; i++) {
    const ch = chars[i];
    const w = ctx.measureText(ch).width;
    const st = start + i * stagger;
    const p = clamp((t - st) / dur);
    if (p > 0) {
      const ex = clamp((t - exit - i * 0.02) / exitDur);
      if (ex < 1) {
        const e = ease.outBack(p, 2.2);
        const s = lerp(0.2, 1, clamp(e)) * (1 - ex * 0.4);
        const rot = (1 - ease.outCubic(p)) * (i % 2 ? 0.5 : -0.5) + ex * 0.4;
        const dy = (1 - ease.outCubic(p)) * 90 * (i % 2 ? 1 : -1) + Math.sin(t * 4 + i * 0.6) * wave;
        ctx.save();
        ctx.translate(cursor + w / 2, y + dy);
        ctx.rotate(rot);
        ctx.scale(s, s);
        ctx.globalAlpha = clamp(p * 2) * (1 - ex);
        if (gradient) ctx.fillStyle = gradient;
        else ctx.fillStyle = color;
        ctx.fillText(ch, -w / 2, 0);
        ctx.restore();
      }
    }
    cursor += w + tracking;
  }
  ctx.restore();
  return total;
}

/** Extruded depth stack — repeated offset copies read as a dimensional slab. */
export function extrudedText(ctx, text, x, y, t, o = {}) {
  const {
    size = 200,
    depth = 18,
    dx = -0.5,
    dy = 0.35,
    front = '#ffffff',
    side = '20,60,110',
    tracking = 0,
    family = FONT.display,
    align = 'center',
    skew = 0,
    baseline = 'middle',
    alpha = 1,
  } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let i = depth; i >= 1; i--) {
    const k = i / depth;
    ctx.save();
    ctx.translate(x + dx * i * 2.2, y + dy * i * 2.2);
    if (skew) ctx.transform(1, 0, skew, 1, 0, 0);
    drawText(ctx, text, 0, 0, {
      size,
      family,
      tracking,
      align,
      color: `rgba(${side},${0.25 + 0.75 * (1 - k)})`,
      baseline,
    });
    ctx.restore();
  }
  drawText(ctx, text, x, y, { size, family, tracking, align, color: front, baseline });
  ctx.restore();
}

/** Text with a moving gradient band + chromatic split (premium headline). */
export function premiumWord(ctx, text, x, y, t, o = {}) {
  const {
    size = 300,
    family = FONT.display,
    tracking = 0,
    align = 'center',
    bands = ['#ffffff', '#bfe9ff', '#6fd4ff', '#ffffff'],
    chroma = 0,
    glow = 0,
    alpha = 1,
    baseline = 'middle',
    perChar = null,
    skew = 0,
    blend = null,
  } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (blend) ctx.globalCompositeOperation = blend;
  const grad = ctx.createLinearGradient(x - size * 2, y - size * 0.5, x + size * 2, y + size * 0.5);
  const shift = (Math.sin(t * 0.9) + 1) / 2;
  bands.forEach((c, i) => grad.addColorStop(clamp(i / (bands.length - 1) * 0.9 + shift * 0.1), c));
  if (chroma > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawText(ctx, text, x - chroma, y, { size, family, tracking, align, color: 'rgba(255,40,80,0.55)', baseline, perChar });
    drawText(ctx, text, x + chroma, y, { size, family, tracking, align, color: 'rgba(40,220,255,0.55)', baseline, perChar });
    ctx.restore();
  }
  if (glow > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${Math.round(glow)}px)`;
    drawText(ctx, text, x, y, { size, family, tracking, align, color: 'rgba(170,235,255,0.55)', baseline, perChar });
    ctx.filter = 'none';
    ctx.restore();
  }
  if (skew) {
    ctx.save();
    ctx.translate(x, y);
    ctx.transform(1, 0, skew, 1, 0, 0);
    drawText(ctx, text, 0, 0, { size, family, tracking, align, gradient: grad, baseline, perChar });
    ctx.restore();
  } else {
    drawText(ctx, text, x, y, { size, family, tracking, align, gradient: grad, baseline, perChar });
  }
  ctx.restore();
}

/** Microcopy line that types itself out. */
export function typedLine(ctx, text, x, y, t, o = {}) {
  const { size = 16, family = FONT.mono, color = 'rgba(200,235,255,0.75)', tracking = 3, start = 0, cps = 45, align = 'left', cursor = true } = o;
  const n = Math.max(0, Math.min([...text].length, Math.floor((t - start) * cps)));
  if (n <= 0) return 0;
  const shown = [...text].slice(0, n).join('');
  setFont(ctx, size, family);
  const w = trackedWidth(ctx, shown, tracking);
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.save();
  ctx.fillStyle = color;
  for (const ch of [...shown]) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
  if (cursor && Math.floor(t * 8) % 2 === 0 && n < [...text].length) {
    ctx.fillStyle = color;
    ctx.fillRect(cx + 2, y - size * 0.75, size * 0.42, size * 0.85);
  }
  ctx.restore();
  return w;
}

/** Huge outline word used as a background texture layer. */
export function outlineWord(ctx, text, x, y, o = {}) {
  const { size = 700, color = '255,255,255', alpha = 0.08, width = 2, family = FONT.display, tracking = 0, align = 'center' } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  setFont(ctx, size, family);
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = `rgba(${color},1)`;
  ctx.lineWidth = width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${tracking}px`;
  ctx.textAlign = align;
  ctx.strokeText(text, x, y);
  ctx.restore();
}

/** Word whose glyphs are randomly displaced — used for corruption beats. */
export function glitchedText(ctx, text, x, y, t, o = {}) {
  const { size = 220, family = FONT.display, color = '#fff', amount = 1, tracking = 0, seed = 0, align = 'center', baseline = 'middle' } = o;
  setFont(ctx, size, family);
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b, i) => a + b + (i < chars.length - 1 ? tracking : 0), 0);
  let cursor = align === 'center' ? x - total / 2 : x;
  ctx.save();
  ctx.textBaseline = baseline;
  for (let i = 0; i < chars.length; i++) {
    const r1 = hash1(i * 13 + seed + Math.floor(t * 24) * 7);
    const r2 = hash1(i * 29 + seed + Math.floor(t * 24) * 11);
    const dx = (r1 - 0.5) * 70 * amount;
    const dy = (r2 - 0.5) * 26 * amount;
    const sc = 1 + (r1 - 0.5) * 0.3 * amount;
    ctx.save();
    ctx.translate(cursor + widths[i] / 2 + dx, y + dy);
    ctx.scale(1, sc);
    ctx.fillStyle = r2 > 0.82 && amount > 0.4 ? 'rgba(255,60,120,0.9)' : color;
    ctx.fillText(chars[i], -widths[i] / 2, 0);
    ctx.restore();
    cursor += widths[i] + tracking;
  }
  ctx.restore();
}
