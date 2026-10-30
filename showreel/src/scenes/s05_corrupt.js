/**
 * 05 — CORRUPT (20.0 → 25.0s)
 * The signal fails. Glyph rain, datamosh band displacement, block corruption,
 * a vertical hold roll and an acid-green negatived moment. The edit gets
 * physically damaged before it shatters in the next chapter.
 */
import { TAU, clamp, ease, smoothstep } from '../core/math.js';
import { hash1, hash2 } from '../core/noise.js';
import { drawGlow } from '../core/draw.js';
import { FONT, microLabel } from '../core/text.js';
import { glyphRain, dust } from '../effects/particles.js';
import { glitchedText } from '../effects/typefx.js';

const ACID = '#b6ff2e';
const RED = '#ff2b3d';
const ICY = '#9fe8ff';

export const s05 = {
  id: 'corrupt',
  start: 20.0,
  end: 25.0,
  draw(F, lt) {
    const { ctx, w, h } = F;
    const t = lt;

    // ---------- base ----------
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, w, h);

    // slow drifting corrupted gradient
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, 400 + Math.sin(t) * 120, 300, 700, '40,120,255', 0.1, 0.6);
    drawGlow(ctx, 1500, 800 + Math.cos(t * 0.8) * 100, 650, '255,40,80', 0.1, 0.6);
    ctx.restore();

    // ---------- glyph rain ----------
    ctx.save();
    ctx.globalAlpha = 0.9;
    glyphRain(ctx, t, {
      cols: 30, rows: 20, size: 20, color: '150,235,255', alpha: 0.34, speed: 0.8, seed: 6, density: 0.5,
    });
    ctx.restore();

    // ---------- broken geometry ----------
    const gp = smoothstep(0.1, 0.5, t);
    if (gp > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.globalCompositeOperation = 'lighter';
      // displaced grid fragments
      for (let i = 0; i < 26; i++) {
        const x = hash1(i * 3.7) * w;
        const y = hash1(i * 7.3) * h;
        const ww = 60 + hash1(i * 11.1) * 380;
        const hh = 2 + hash1(i * 13.7) * 6;
        const dx = Math.sin(t * 2 + i) * 40;
        ctx.fillStyle = `rgba(${i % 4 ? '150,230,255' : '255,45,70'},${0.06 + hash1(i * 17.3) * 0.14})`;
        ctx.fillRect(x + dx, y, ww, hh);
      }
      // broken ring fragments
      for (let i = 0; i < 5; i++) {
        const a0 = hash1(i * 5.1) * TAU + t * 0.3;
        const r = 220 + i * 110 + Math.sin(t + i) * 20;
        ctx.strokeStyle = `rgba(160,235,255,${0.1 + 0.05 * (i % 2)})`;
        ctx.lineWidth = 1 + (i % 3);
        ctx.beginPath();
        ctx.arc(960, 540, r, a0, a0 + 0.5 + hash1(i) * 1.4);
        ctx.stroke();
      }
      ctx.restore();
    }

    dust(ctx, t, { count: 120, color: '170,235,255', alpha: 0.4, seed: 55, speed: 40 });

    // ---------- the message ----------
    const msgIn = 0.5;
    const msgOut = 3.9;
    if (t > msgIn && t < msgOut + 0.4) {
      const amp = smoothstep(msgIn, msgIn + 0.2, t) * (1 - smoothstep(msgOut, msgOut + 0.35, t));
      const p = ease.outExpo(clamp((t - msgIn) / 0.3));
      ctx.save();
      ctx.globalAlpha = amp;
      // hard white plate, slightly off-axis — the only clean thing on screen
      ctx.translate(0, 0);
      glitchedText(ctx, 'CORRUPT', 960, 480, t, {
        size: 290, color: '#f4f7f8', amount: 0.55 + 0.45 * Math.abs(Math.sin(t * 5)), tracking: -8, seed: 9,
      });
      // chromatic split
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = amp * 0.55;
      glitchedText(ctx, 'CORRUPT', 960 - 16, 480, t, { size: 290, color: 'rgba(255,43,61,0.7)', amount: 0.6, tracking: -8, seed: 3 });
      glitchedText(ctx, 'CORRUPT', 960 + 16, 480, t, { size: 290, color: 'rgba(90,230,255,0.7)', amount: 0.6, tracking: -8, seed: 5 });
      ctx.restore();

      // subtitle + load bar
      const sp = clamp((t - msgIn - 0.2) / 0.3);
      if (sp > 0) {
        ctx.fillStyle = RED;
        ctx.fillRect(430, 620, 300 * sp, 3);
        microLabel(ctx, 'SIGNAL INTEGRITY 12%  —  RESYNC FAILED', 430, 664, {
          size: 13, color: 'rgba(240,245,248,0.72)', tracking: 5, tick: false,
        });
        microLabel(ctx, 'ERR 0x0F / FRAME DROP', 430, 694, {
          size: 12, color: 'rgba(255,43,61,0.8)', tracking: 5, tick: false,
        });
      }
      // macro text on the right, reversed
      ctx.save();
      ctx.globalAlpha = amp * 0.55;
      ctx.font = `400 15px "${FONT.mono}"`;
      ctx.letterSpacing = '2px';
      ctx.fillStyle = 'rgba(200,235,255,0.6)';
      for (let i = 0; i < 12; i++) {
        const v = hash2(i, Math.floor(t * 12));
        ctx.fillText((v * 99999).toFixed(0).padStart(7, '0'), 1380, 220 + i * 30);
      }
      ctx.restore();
      ctx.restore();
    }

    // ---------- negatived acid moment ----------
    const neg = smoothstep(3.55, 3.68, t) * (1 - smoothstep(3.9, 4.05, t));
    if (neg > 0.01) {
      ctx.save();
      ctx.globalAlpha = neg;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = ACID;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#0a0d05';
      glitchedText(ctx, 'NO SIGNAL', 960, 540, t, { size: 210, color: '#0a0d05', amount: 0.2, tracking: 4, seed: 21 });
      // wipe bands
      ctx.fillStyle = 'rgba(10,13,5,0.9)';
      for (let i = 0; i < 6; i++) {
        const y = ((t * 900 + i * 190) % (h + 200)) - 100;
        ctx.fillRect(0, y, w, 18 + (i % 3) * 12);
      }
      ctx.restore();
    }

    // ---------- search bars: the system scanning for a signal ----------
    const scanP = smoothstep(4.0, 4.3, t);
    if (scanP > 0) {
      ctx.save();
      ctx.globalAlpha = scanP;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 34; i++) {
        const phase = (t * (0.4 + hash1(i * 3.1) * 0.9) + hash1(i * 7.7)) % 1;
        const x = phase * w;
        const a = Math.sin(phase * Math.PI) * 0.35 * (0.3 + hash1(i * 11.3));
        const g = ctx.createLinearGradient(x, 0, x, h);
        g.addColorStop(0, 'rgba(150,235,255,0)');
        g.addColorStop(0.5, `rgba(150,235,255,${a})`);
        g.addColorStop(1, 'rgba(150,235,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 1 + hash1(i * 13.3) * 2, h);
      }
      // a single searching sweep
      const sy = ((t - 4.0) * 620) % (h + 300) - 150;
      const sg = ctx.createLinearGradient(0, sy - 40, 0, sy + 40);
      sg.addColorStop(0, 'rgba(200,250,255,0)');
      sg.addColorStop(0.5, 'rgba(200,250,255,0.22)');
      sg.addColorStop(1, 'rgba(200,250,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, sy - 40, w, 80);
      ctx.restore();

      // scattered mono labels
      ctx.save();
      ctx.globalAlpha = scanP * 0.75;
      ctx.font = `400 12px "${FONT.mono}"`;
      ctx.letterSpacing = '4px';
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = `rgba(180,230,255,${0.25 + hash1(i * 5.5) * 0.5})`;
        ctx.fillText(['NULL', '0x00', '...', 'RETRY', '////', 'LOST', 'ERR', '000', '—'][i], 160 + hash1(i * 9.1) * 1500, 200 + hash1(i * 3.3) * 700);
      }
      ctx.restore();
    }

    // ---------- gated microcopy / margin rail ----------
    if (t > 4.05) {
      const p = smoothstep(4.05, 4.4, t);
      ctx.save();
      ctx.globalAlpha = p * 0.9;
      const label = 'REASSEMBLING';
      ctx.font = `400 15px "${FONT.mono}"`;
      ctx.letterSpacing = '8px';
      ctx.fillStyle = 'rgba(190,235,255,0.7)';
      ctx.fillText(label, 200, 540);
      // progress ticks
      for (let i = 0; i < 24; i++) {
        const on = i < p * 24;
        ctx.fillStyle = on ? ICY : 'rgba(150,200,230,0.18)';
        ctx.fillRect(200 + i * 24, 566, 14, 3);
      }
      ctx.restore();
    }

    // ---------- frame damage overlay ----------
    const dmg = 0.5 + 0.5 * Math.sin(t * 7);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 * dmg;
    for (let i = 0; i < 5; i++) {
      const y = hash1(i * 31 + Math.floor(t * 18)) * h;
      const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
      g.addColorStop(0, 'rgba(160,240,255,0)');
      g.addColorStop(0.5, 'rgba(200,250,255,0.5)');
      g.addColorStop(1, 'rgba(160,240,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 6, w, 12);
    }
    ctx.restore();

    // vignette of noise at edges
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const vg = ctx.createRadialGradient(960, 540, 300, 960, 540, 1100);
    vg.addColorStop(0, 'rgba(255,255,255,1)');
    vg.addColorStop(1, 'rgba(30,40,55,1)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // HUD
    ctx.save();
    ctx.globalAlpha = 0.7;
    microLabel(ctx, '05 — CORRUPT', 112, 126, { size: 12, color: 'rgba(200,240,255,0.55)', tracking: 6 });
    microLabel(ctx, 'DATA LOSS', w - 112, 126, { size: 12, color: 'rgba(200,240,255,0.55)', tracking: 5, align: 'right', tick: false });
    ctx.restore();
  },
};
