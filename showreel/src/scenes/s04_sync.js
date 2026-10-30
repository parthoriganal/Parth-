/**
 * 05 — SYNC (15.0 → 20.0s)
 * Kinetic typography locked to a 120 BPM grid: ten half-second beats, each a
 * different typographic device, over an oscilloscope field. The chapter is the
 * rhythmic spine of the film — fast, precise, and deliberately machine-like.
 */
import { TAU, clamp, ease, lerp, smoothstep } from '../core/math.js';
import { hash1 } from '../core/noise.js';
import { simplex2 } from '../core/noise.js';
import { FONT, microLabel, drawString, stringWidth } from '../core/text.js';
import { scratch, clearScratch } from '../core/pool.js';
import { moire, ringField } from '../effects/patterns.js';
import { dust } from '../effects/particles.js';

const CYAN = '125,249,255';
const MAG = '255,45,120';
const BONE = '245,240,232';
const BEAT = 0.5;

const BEATS = [
  { word: 'SYNC', style: 'slices', tex: 'scan', ox: 0, oy: -40, rot: 0 },
  { word: 'SIGNAL', style: 'columns', tex: 'columns', ox: -120, oy: 20, rot: 0 },
  { word: 'BREAK', style: 'outline', tex: 'rings', ox: 180, oy: -30, rot: 0 },
  { word: 'NOISE', style: 'glitch', tex: 'blocks', ox: 0, oy: 10, rot: 0 },
  { word: 'RHYTHM', style: 'skew', tex: 'diagonal', ox: -60, oy: 0, rot: 0 },
  { word: 'TYPE', sub: 'IS TIME', style: 'editorial', tex: 'column', ox: 0, oy: 0, rot: 0 },
  { word: 'PULSE', style: 'radial', tex: 'burst', ox: 0, oy: 0, rot: 0 },
  { word: 'VOLT', sub: 'AGE', style: 'stack', tex: 'numeral', ox: 0, oy: 0, rot: 0 },
  { word: 'SYNC', style: 'invert', tex: 'none', ox: 0, oy: 0, rot: 0 },
  { word: '', style: 'smear', tex: 'none', ox: 0, oy: 0, rot: 0 },
];

export const s04 = {
  id: 'sync',
  start: 15.0,
  end: 20.0,
  draw(F, lt) {
    const { ctx, w, h } = F;
    const t = lt;
    const beat = Math.min(BEATS.length - 1, Math.floor(t / BEAT));
    const bp = (t % BEAT) / BEAT; // 0..1 within the beat
    const k = t / BEAT;
    const out = smoothstep(4.55, 4.95, t);

    // ---------- backdrop ----------
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#05060b');
    bg.addColorStop(0.5, '#070810');
    bg.addColorStop(1, '#03040a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // pulse on every beat
    const hit = Math.exp(-bp * 6.5);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createRadialGradient(960, 540, 0, 960, 540, 900);
    cg.addColorStop(0, `rgba(${CYAN},${0.05 + hit * 0.05})`);
    cg.addColorStop(1, `rgba(${CYAN},0)`);
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // ---------- oscilloscope + readout ----------
    drawScope(ctx, t, hit);

    // ---------- frequency bars, bottom ----------
    ctx.save();
    ctx.globalAlpha = 0.55;
    const bars = 48;
    for (let i = 0; i < bars; i++) {
      const v = Math.abs(simplex2(i * 0.32 + t * 3.2, t * 1.4)) * (0.4 + hit * 0.9);
      const bh = 12 + v * 150;
      const x = 120 + i * ((w - 240) / bars);
      const g = ctx.createLinearGradient(0, 1010, 0, 1010 - bh);
      g.addColorStop(0, `rgba(${CYAN},0.05)`);
      g.addColorStop(1, `rgba(${CYAN},${0.3 + hit * 0.4})`);
      ctx.fillStyle = g;
      ctx.fillRect(x, 1010 - bh, (w - 240) / bars - 5, bh);
    }
    ctx.restore();

    // ---------- moire field, low alpha ----------
    ctx.save();
    ctx.globalAlpha = 0.5;
    moire(ctx, t, { count: 60, radius: 1400, color: CYAN, alpha: 0.05, gap: 4, width: 1, speedA: 0.25, speedB: -0.18, scale: 1 });
    ctx.restore();

    dust(ctx, t, { count: 70, color: CYAN, alpha: 0.3, seed: 44, speed: 24 });

    // ---------- per-beat background graphic ----------
    const b0 = BEATS[beat];
    drawTexture(ctx, b0.tex, t, bp, hit, w, h);

    // ---------- persistent ghost word: the frame is never empty ----------
    const ghostWords = ['SYNC', 'SIGNAL', 'BREAK', 'NOISE', 'RHYTHM', 'TYPE', 'PULSE', 'VOLTAGE'];
    const gi = Math.floor(t / (BEAT * 2)) % ghostWords.length;
    const gp = (t / (BEAT * 2)) % 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.1 * (1 - Math.abs(gp - 0.5) * 0.9);
    ctx.translate(960, 540);
    ctx.rotate(-0.06);
    drawString(ctx, ghostWords[gi], 0, 0, {
      size: 520, tracking: -18, align: 'center', color: 'rgb(90,190,230)',
    });
    ctx.restore();

    // ---------- the word ----------
    const b = BEATS[beat];
    if (b.word && out < 1) {
      drawBeat(ctx, b, t, bp, hit, w, h);
    }

    // ---------- exit smear ----------
    if (out > 0) {
      drawSmear(ctx, t, out, w, h);
    }

    // ---------- HUD ----------
    ctx.save();
    ctx.globalAlpha = 0.75;
    microLabel(ctx, '04 — SYNC', 112, 126, { size: 12, color: 'rgba(200,240,255,0.55)', tracking: 6 });
    microLabel(ctx, `BPM 120  /  BEAT ${String(beat + 1).padStart(2, '0')}/10`, w - 112, 126, {
      size: 12, color: 'rgba(200,240,255,0.55)', tracking: 5, align: 'right', tick: false,
    });
    // beat dots
    for (let i = 0; i < BEATS.length; i++) {
      const on = i === beat;
      ctx.fillStyle = on ? `rgba(${MAG},0.95)` : 'rgba(200,240,255,0.22)';
      ctx.fillRect(w / 2 - BEATS.length * 11 + i * 22, 122, on ? 16 : 8, 2);
    }
    ctx.strokeStyle = 'rgba(160,225,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(86, 96, w - 172, h - 192);

    // time ruler along the bottom
    ctx.strokeStyle = 'rgba(170,230,255,0.16)';
    ctx.beginPath();
    ctx.moveTo(120, 960);
    ctx.lineTo(w - 120, 960);
    ctx.stroke();
    for (let i = 0; i <= 40; i++) {
      const x = 120 + (i / 40) * (w - 240);
      const major = i % 5 === 0;
      ctx.strokeStyle = `rgba(170,230,255,${major ? 0.3 : 0.14})`;
      ctx.beginPath();
      ctx.moveTo(x, 960);
      ctx.lineTo(x, 960 + (major ? 12 : 6));
      ctx.stroke();
    }
    const px = 120 + (t / 5) * (w - 240);
    ctx.fillStyle = `rgba(${MAG},0.9)`;
    ctx.fillRect(px - 1, 950, 2, 22);
    ctx.restore();
  },
};

/** A different graphic field per beat, so no two half-seconds look alike. */
function drawTexture(ctx, tex, t, bp, hit, w, h) {
  if (!tex || tex === 'none') return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const enter = Math.min(1, bp / 0.2);
  ctx.globalAlpha = 0.85 * enter;

  if (tex === 'scan') {
    for (let i = 0; i < 26; i++) {
      const y = ((i / 26) * h + t * 260) % h;
      const a = 0.05 + 0.1 * Math.abs(Math.sin(i * 1.7 + t * 4));
      ctx.fillStyle = `rgba(${CYAN},${a})`;
      ctx.fillRect(0, y, w, 1 + (i % 4) * 2);
    }
  } else if (tex === 'columns') {
    const n = 26;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * w;
      const a = 0.03 + 0.09 * Math.abs(Math.sin(i * 0.9 - t * 3));
      ctx.fillStyle = `rgba(${CYAN},${a})`;
      ctx.fillRect(x, 0, (w / n) * 0.62, h);
    }
  } else if (tex === 'rings') {
    ctx.strokeStyle = `rgba(${CYAN},0.09)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 22; i++) {
      const r = 60 + i * 54 + Math.sin(i + t * 3) * 8;
      ctx.beginPath();
      ctx.arc(960, 540, r, 0, TAU);
      ctx.stroke();
    }
  } else if (tex === 'blocks') {
    for (let i = 0; i < 60; i++) {
      const gx = (hash1(i * 3.1) * 16) | 0;
      const gy = (hash1(i * 7.7) * 9) | 0;
      const live = hash1(i * 11.3 + Math.floor(t * 20)) > 0.62;
      if (!live) continue;
      ctx.fillStyle = `rgba(${i % 5 ? CYAN : MAG},${0.06 + 0.1 * hash1(i * 13)})`;
      ctx.fillRect(gx * 120, gy * 120, 118, 118);
    }
  } else if (tex === 'diagonal') {
    ctx.save();
    ctx.rotate(-0.32);
    ctx.fillStyle = `rgba(${CYAN},0.05)`;
    for (let x = -1400; x < 2600; x += 46) ctx.fillRect(x + ((t * 120) % 46), -900, 16, 2800);
    ctx.restore();
  } else if (tex === 'column') {
    ctx.fillStyle = `rgba(${MAG},0.14)`;
    ctx.fillRect(1010, 0, 300, h);
    ctx.fillStyle = `rgba(${CYAN},0.05)`;
    ctx.fillRect(0, 0, 460, h);
  } else if (tex === 'burst') {
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * TAU + t * 0.12;
      const g = ctx.createLinearGradient(960, 540, 960 + Math.cos(a) * 1300, 540 + Math.sin(a) * 1300);
      g.addColorStop(0, `rgba(${CYAN},${0.07 + hit * 0.05})`);
      g.addColorStop(1, `rgba(${CYAN},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(960, 540);
      ctx.arc(960, 540, 1300, a - 0.012, a + 0.012);
      ctx.closePath();
      ctx.fill();
    }
  } else if (tex === 'numeral') {
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.font = `400 900px "${FONT.display}"`;
    ctx.letterSpacing = '-20px';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = `rgba(${CYAN},0.14)`;
    ctx.lineWidth = 2;
    ctx.strokeText('08', 960, 560 + Math.sin(t) * 10);
    ctx.restore();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */

function scopeColor(t) {
  return (Math.floor(t / BEAT) % 2) ? CYAN : CYAN;
}

function drawScope(ctx, t, hit) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // grid
  ctx.strokeStyle = `rgba(${CYAN},0.06)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= 1920; x += 60) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1080);
  }
  for (let y = 0; y <= 1080; y += 60) {
    ctx.moveTo(0, y);
    ctx.lineTo(1920, y);
  }
  ctx.stroke();

  // waveform
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    for (let x = 0; x <= 1920; x += 6) {
      const u = x / 1920;
      const y =
        540 +
        (Math.sin(u * 22 + t * 9 + layer) * 26 + Math.sin(u * 61 - t * 13) * 12) *
          (1 + hit * 1.8) *
          (layer === 0 ? 1 : layer === 1 ? 0.6 : 0.35);
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = `rgba(${layer === 1 ? MAG : CYAN},${(0.16 - layer * 0.04) * (0.6 + hit)})`;
    ctx.lineWidth = layer === 0 ? 1.4 : 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawBeat(ctx, b, t, bp, hit, w, h) {
  const cx = w / 2 + (b.ox || 0);
  const cy = 540 + (b.oy || 0);
  const enter = ease.outExpo(clamp(bp / 0.28));
  const exit = smoothstep(0.93, 1.0, bp);
  const wob = Math.sin(t * 2.2) * 3;

  if (b.style === 'slices') {
    const size = 340;
    const word = b.word;
    const wid = stringWidth(ctx, word, size, FONT.display, -10);
    ctx.save();
    ctx.globalAlpha = 1 - exit;
    const bands = 9;
    for (let i = 0; i < bands; i++) {
      const y0 = cy - size * 0.52 + (i / bands) * size * 1.04;
      const bh = (size * 1.04) / bands;
      const d = Math.abs(i - (bands - 1) / 2) / ((bands - 1) / 2);
      const slip = (1 - enter) * (i % 2 ? 1 : -1) * 700 * (0.3 + d) + exit * (i % 2 ? 1 : -1) * 260;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0, w, bh + 1);
      ctx.clip();
      const g = ctx.createLinearGradient(0, y0, 0, y0 + bh);
      g.addColorStop(0, `rgb(${BONE})`);
      g.addColorStop(1, `rgb(${CYAN})`);
      drawString(ctx, word, cx + slip, cy + wob, { size, tracking: -10, align: 'center', gradient: g });
      ctx.restore();
    }
    // chromatic echo
    ctx.globalCompositeOperation = 'lighter';
    drawString(ctx, word, cx - 14 - (1 - enter) * 100, cy, { size, tracking: -10, align: 'center', color: `rgba(${MAG},0.35)` });
    drawString(ctx, word, cx + 14 + (1 - enter) * 100, cy, { size, tracking: -10, align: 'center', color: `rgba(${CYAN},0.35)` });
    ctx.restore();
  } else if (b.style === 'columns') {
    const size = 260;
    const wid = stringWidth(ctx, b.word, size, FONT.display, 18);
    const cols = 16;
    ctx.save();
    ctx.globalAlpha = 1 - exit;
    for (let i = 0; i < cols; i++) {
      const x0 = cx - wid / 2 + (i / cols) * wid;
      const cw = wid / cols;
      const rise = (1 - enter) * (i % 3 === 0 ? 1 : i % 3 === 1 ? 0.6 : 0.3) * 900;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, 0, cw + 1, h);
      ctx.clip();
      drawString(ctx, b.word, cx, cy - rise, { size, tracking: 18, align: 'center', color: `rgb(${BONE})` });
      ctx.restore();
    }
    ctx.restore();
  } else if (b.style === 'outline') {
    const size = 300;
    ctx.save();
    ctx.globalAlpha = (1 - exit) * 0.95;
    const sc = lerp(1.4, 1, enter);
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.rotate((1 - enter) * 0.08);
    for (let i = 5; i >= 0; i--) {
      ctx.save();
      ctx.globalAlpha *= i === 0 ? 1 : 0.16 / (i * 0.5);
      ctx.strokeStyle = i === 0 ? `rgb(${BONE})` : `rgb(${CYAN})`;
      ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.font = `400 ${size + i * 26}px "${FONT.display}"`;
      ctx.letterSpacing = '2px';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(b.word, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  } else if (b.style === 'glitch') {
    const size = 300;
    ctx.save();
    ctx.globalAlpha = 1 - exit;
    const rows = 14;
    for (let i = 0; i < rows; i++) {
      const y0 = cy - size * 0.6 + (i / rows) * size * 1.2;
      const bh = (size * 1.2) / rows;
      const r = hash1(i * 7 + Math.floor(t * 30) * 13);
      const dx = (r - 0.5) * 260 * (1 - enter * 0.7) + Math.sin(t * 40 + i) * 6;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0, w, bh);
      ctx.clip();
      drawString(ctx, b.word, cx + dx, cy, {
        size, tracking: -6, align: 'center',
        color: r > 0.8 ? `rgb(${MAG})` : `rgb(${BONE})`,
      });
      ctx.restore();
    }
    // scan flashes
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(${CYAN},${0.2 * (1 - enter)})`;
    for (let i = 0; i < 8; i++) ctx.fillRect(0, hash1(i * 3 + Math.floor(t * 24)) * h, w, 2);
    ctx.restore();
  } else if (b.style === 'skew') {
    const size = 230;
    const wid = stringWidth(ctx, b.word, size, FONT.display, 4);
    ctx.save();
    ctx.globalAlpha = 1 - exit;
    ctx.translate(cx, cy);
    ctx.rotate(-0.06);
    ctx.transform(1, 0, -0.22 + Math.sin(t * 3) * 0.02, 1, 0, 0);
    ctx.scale(lerp(1.3, 1, enter), 1);
    for (let i = 6; i >= 0; i--) {
      ctx.save();
      ctx.globalAlpha *= i === 0 ? 1 : 0.1;
      drawString(ctx, b.word, 0, i * 3.5, { size, tracking: 4, align: 'center', color: i === 0 ? `rgb(${BONE})` : `rgb(${CYAN})` });
      ctx.restore();
    }
    // red echo bars
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(${MAG},0.5)`;
    ctx.fillRect(-wid / 2, 26, wid, 3);
    ctx.restore();
  } else if (b.style === 'editorial') {
    const p = enter;
    ctx.save();
    ctx.globalAlpha = 1 - exit;
    const size = 200;
    drawString(ctx, 'TYPE', cx - 300 * (1 - p), 470, { size, tracking: -4, align: 'left', color: `rgb(${BONE})` });
    drawString(ctx, 'IS TIME', cx - 300 * (1 - p) + 40, 640, {
      size, family: FONT.serifIt, tracking: 0, align: 'left', color: `rgb(${CYAN})`,
    });
    ctx.fillStyle = `rgba(${MAG},0.9)`;
    ctx.fillRect(cx - 300 * (1 - p) + 12, 690, 300 * p, 2);
    microLabel(ctx, 'KINETIC SET  /  05', cx - 300 * (1 - p) + 12, 728, {
      size: 12, color: 'rgba(200,240,255,0.6)', tracking: 4, tick: false,
    });
    ctx.restore();
  } else if (b.style === 'radial') {
    ctx.save();
    ctx.globalAlpha = 1 - exit;
    ctx.globalCompositeOperation = 'lighter';
    ringField(ctx, t, { cx, cy, count: 22, r0: 40, r1: 620 + hit * 120, color: CYAN, alpha: 0.18 + hit * 0.2, width: 1.2, squash: 0.5, speed: 2 });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 1 - exit;
    ctx.scale(lerp(1.25, 1, enter), lerp(1.25, 1, enter));
    ctx.translate((1 - enter) * 0, (1 - enter) * 0);
    drawString(ctx, b.word, cx / (lerp(1.25, 1, enter)), cy / (lerp(1.25, 1, enter)), {
      size: 300, tracking: 26, align: 'center',
      gradient: (() => {
        const g = ctx.createLinearGradient(0, cy - 140, 0, cy + 140);
        g.addColorStop(0, `rgb(${BONE})`);
        g.addColorStop(1, `rgb(${CYAN})`);
        return g;
      })(),
    });
    ctx.restore();
  } else if (b.style === 'stack') {
    const size = 260;
    ctx.save();
    ctx.globalAlpha = 1 - exit;
    const a = enter;
    drawString(ctx, 'VOLT', cx - 150, 440 - (1 - a) * 60, { size, tracking: -8, align: 'center', color: `rgb(${BONE})` });
    drawString(ctx, 'AGE', cx - 150, 700 + (1 - a) * 60, { size, tracking: -8, align: 'center', color: `rgb(${MAG})` });
    // vertical rails
    ctx.fillStyle = `rgba(${CYAN},0.35)`;
    ctx.fillRect(cx - 150 - 360, 300, 1, 480 * a);
    ctx.fillRect(cx - 150 + 360, 300, 1, 480 * a);
    ctx.restore();
  } else if (b.style === 'invert') {
    ctx.save();
    ctx.globalAlpha = 1 - exit;
    ctx.fillStyle = `rgb(${BONE})`;
    ctx.fillRect(0, 0, w, h);
    const sc = lerp(1.16, 1, enter);
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.globalCompositeOperation = 'source-over';
    drawString(ctx, 'SYNC', 0, 0, { size: 360, tracking: -12, align: 'center', color: '#08080c' });
    ctx.fillStyle = `rgb(${MAG})`;
    ctx.fillRect(-260, 168, 520 * enter, 6);
    ctx.restore();
  }
}

function drawSmear(ctx, t, out, w, h) {
  const S = scratch('s04smear', w, h);
  clearScratch(S);
  S.ctx.drawImage(S.canvas, 0, 0);
  ctx.save();
  // stretch the previous frame vertically into bands
  ctx.globalAlpha = out;
  const src = scratch('s04src', w, h);
  clearScratch(src);
  for (let i = 0; i < 26; i++) {
    const y = (i / 26) * h;
    const r = hash1(i * 5 + Math.floor(t * 40));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(${i % 3 ? CYAN : MAG},${0.16 * out * (0.4 + r)})`;
    ctx.fillRect(0, y, w, 2 + r * 26);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(5,6,11,${out * 0.85})`;
  ctx.fillRect(0, 0, w, h);
  // a single bright line collapses to the centre
  ctx.globalCompositeOperation = 'lighter';
  const ly = 540;
  const g = ctx.createLinearGradient(0, ly - 140, 0, ly + 140);
  g.addColorStop(0, `rgba(${CYAN},0)`);
  g.addColorStop(0.5, `rgba(${BONE},${out})`);
  g.addColorStop(1, `rgba(${MAG},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, ly - 140, w, 280);
  ctx.restore();
}
