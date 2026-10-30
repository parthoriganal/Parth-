/**
 * 08 — FINALE (35.5 → 40.0s)
 * The film resolves: a single line of light, then the title, held wide and
 * still. Deep space, one slow orbit, fine dust. Everything decelerates to a
 * button — a dot that breathes once and goes out.
 */
import { TAU, clamp, ease, lerp, smoothstep } from '../core/math.js';
import { drawGlow } from '../core/draw.js';
import { FONT, microLabel, drawString } from '../core/text.js';
import { anamorphicFlare } from '../effects/space.js';
import { dust } from '../effects/particles.js';
import { ringField } from '../effects/patterns.js';

export const s08 = {
  id: 'finale',
  start: 35.5,
  end: 40.0,
  draw(F, lt) {
    const { ctx, w, h } = F;
    const t = lt;

    // ---------- space ----------
    const bg = ctx.createRadialGradient(960, 500, 0, 960, 500, 1250);
    bg.addColorStop(0, '#08111f');
    bg.addColorStop(0.42, '#040810');
    bg.addColorStop(1, '#010102');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // one warm ember low-left for colour temperature
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, 300, 900, 720, '255,140,70', 0.1, 0.6);
    drawGlow(ctx, 1640, 240, 640, '70,160,255', 0.09, 0.6);
    ctx.restore();

    // slow orbital rings, barely there
    ctx.save();
    ctx.globalAlpha = 0.5;
    ringField(ctx, t, { cx: 960, cy: 505, count: 26, r0: 200, r1: 1250, color: '150,220,255', alpha: 0.17, width: 1, squash: 0.3, rot: -0.12, speed: 0.16, wobble: 3 });
    ctx.restore();

    dust(ctx, t, { count: 150, color: '200,235,255', alpha: 0.34, seed: 77, speed: 5, drift: 40, size: 2 });

    // slow light sweep across the frame
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sweepX = ((t * 260) % 2600) - 400;
    const sw = ctx.createLinearGradient(sweepX - 420, 0, sweepX + 420, 0);
    sw.addColorStop(0, 'rgba(120,190,255,0)');
    sw.addColorStop(0.5, `rgba(140,205,255,${0.05 + 0.03 * Math.sin(t * 0.8)})`);
    sw.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = sw;
    ctx.fillRect(sweepX - 420, 0, 840, h);
    ctx.restore();

    // ---------- the light line ----------
    const lineP = ease.outExpo(clamp(t / 1.1));
    ctx.save();
    anamorphicFlare(ctx, 960, 505, {
      length: lerp(60, 1500, lineP),
      thickness: 1.1,
      core: 16 + lineP * 14,
      alpha: 0.35 + lineP * 0.5,
      color: '185,230,255',
    });
    ctx.restore();

    // ---------- title ----------
    const tp = clamp((t - 0.28) / 1.5);
    if (tp > 0) {
      const et = ease.outExpo(clamp(tp * 1.6));
      const size = 190;
      const tr = lerp(150, 22, et);
      ctx.save();
      // soft halo behind the word so it sits in the space
      const halo = ctx.createRadialGradient(960, 505, 0, 960, 505, 720);
      halo.addColorStop(0, `rgba(10,20,36,${0.0})`);
      halo.addColorStop(0.7, `rgba(6,12,24,${0.35 * et})`);
      halo.addColorStop(1, 'rgba(6,12,24,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      drawString(ctx, 'PARALLAX', 960, 505 + 8, {
        size, tracking: tr, align: 'center',
        gradient: (() => {
          const g = ctx.createLinearGradient(0, 505 - 90, 0, 505 + 90);
          g.addColorStop(0, 'rgba(255,255,255,0.98)');
          g.addColorStop(0.5, 'rgba(226,244,255,0.96)');
          g.addColorStop(1, 'rgba(140,200,245,0.9)');
          return g;
        })(),
      });
      // faint chromatic edge, very subtle — cinematic, not glitchy
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18 * (1 - smoothstep(1.2, 2.4, t));
      drawString(ctx, 'PARALLAX', 960 - 3.5, 505 + 8, { size, tracking: tr, align: 'center', color: 'rgba(255,60,90,0.8)' });
      drawString(ctx, 'PARALLAX', 960 + 3.5, 505 + 8, { size, tracking: tr, align: 'center', color: 'rgba(60,220,255,0.8)' });
      ctx.restore();
      ctx.restore();
    }

    // ---------- credit block ----------
    const cp = clamp((t - 1.15) / 1.2);
    if (cp > 0) {
      ctx.save();
      ctx.globalAlpha = cp * 0.95;
      const label = 'A MOTION STUDY IN LIGHT & TIME';
      // letterspace grows as it settles
      ctx.font = `400 15px "${FONT.mono}"`;
      ctx.letterSpacing = `${lerp(3, 13, ease.outCubic(cp))}px`;
      ctx.fillStyle = 'rgba(215,238,255,0.9)';
      const lw = ctx.measureText(label).width;
      ctx.textAlign = 'left';
      ctx.fillText(label, 960 - lw / 2, 612);
      ctx.restore();
    }

    // ---------- third line / index ----------
    const ip = clamp((t - 1.9) / 1.0);
    if (ip > 0) {
      ctx.save();
      ctx.globalAlpha = ip * 0.8;
      ctx.fillStyle = 'rgba(190,225,255,0.62)';
      ctx.fillRect(960 - 190 * ip, 664, 380 * ip, 1);
      microLabel(ctx, 'VOL. 01  —  1920 × 1080  —  60 FPS', 960, 700, {
        size: 11, align: 'center', color: 'rgba(200,230,255,0.85)', tracking: 6, tick: false,
      });
      microLabel(ctx, 'MMXXVI', 960, 728, {
        size: 11, align: 'center', color: 'rgba(200,230,255,0.6)', tracking: 6, tick: false,
      });
      ctx.restore();
    }

    // ---------- corner registration (fades in late) ----------
    const rp = clamp((t - 2.2) / 1.0);
    if (rp > 0) {
      ctx.save();
      ctx.globalAlpha = rp * 0.45;
      ctx.strokeStyle = 'rgba(180,220,255,0.7)';
      ctx.lineWidth = 1;
      const m = 74;
      const k = 22;
      for (const [x, y, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]) {
        ctx.beginPath();
        ctx.moveTo(x + k * sx, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + k * sy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---------- button: a breathing dot ----------
    const bStart = 2.7;
    if (t > bStart) {
      const b = clamp((t - bStart) / 0.5);
      const fade = 1 - smoothstep(3.35, 3.75, t);
      ctx.save();
      ctx.globalAlpha *= b * fade;
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.75 + 0.25 * Math.sin((t - bStart) * 2.6);
      drawGlow(ctx, 960, 505, 40 * pulse, '190,240,255', 0.5 * b * fade, 0.2);
      ctx.fillStyle = 'rgba(230,250,255,0.9)';
      ctx.beginPath();
      ctx.arc(960, 505, 2.6 * pulse, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // ---------- dissolve to black ----------
    const out = smoothstep(3.62, 4.12, t);
    if (out > 0) {
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.globalAlpha = out;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  },
};
