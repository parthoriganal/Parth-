/**
 * 02 — FEED (3.0 → 9.0s)
 * Warm editorial world: liquid ribbons twisting through depth with a mirrored
 * floor, a halftone sun, contour fields and cream-on-black type. A deliberate
 * temperature shift after the cold ignition.
 */
import { TAU, clamp, ease, lerp, smoothstep } from '../core/math.js';
import { drawGlow } from '../core/draw.js';
import { scratch, clearScratch } from '../core/pool.js';
import { FONT, microLabel, fitSize, drawString, stringWidth, scrim } from '../core/text.js';
import { ribbon, contourLines } from '../effects/ribbon.js';
import { dust, tracerStream } from '../effects/particles.js';
import { halftone, ringField } from '../effects/patterns.js';
import { stackedWords, typedLine } from '../effects/typefx.js';

const REFLECT_Y = 604;

export const s02 = {
  id: 'feed',
  start: 3.0,
  end: 9.0,
  draw(F, lt) {
    const { ctx, w, h } = F;
    const t = lt;
    const cx = w / 2;

    const camX = Math.sin(t * 0.55) * 22;
    const camY = Math.cos(t * 0.42) * 12;
    const camZoom = 1 + t * 0.005;
    const outP = smoothstep(5.62, 6.0, t);

    // ---------- backdrop ----------
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0a0705');
    bg.addColorStop(0.45, '#0a0709');
    bg.addColorStop(1, '#040406');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    drawGlow(ctx, 300, 700, 1000, '255,130,50', 0.14, 0.5);
    drawGlow(ctx, 1580, 200, 820, '60,140,255', 0.11, 0.5);

    ctx.save();
    ctx.translate(cx + camX, 540 + camY);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-cx, -540);

    // ---------- halftone sun ----------
    const sunP = ease.outCubic(clamp(t / 1.5));
    const sx = 1520;
    const sy = 300;
    if (sunP > 0.01) {
      const sr = 232 * sunP;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.8 * (1 - outP);
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 1.15);
      g.addColorStop(0, 'rgba(255,180,110,0.9)');
      g.addColorStop(0.6, 'rgba(255,120,55,0.4)');
      g.addColorStop(1, 'rgba(255,80,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, sr * 1.15, 0, TAU);
      ctx.fill();
      ctx.restore();

      if (sunP > 0.45) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, sr * 0.9, 0, TAU);
        ctx.clip();
        halftone(ctx, {
          x0: sx - sr, x1: sx + sr, y0: sy - sr, y1: sy + sr,
          step: 12, maxR: 5.2, color: '24,10,6', alpha: 0.92,
          field: (x, y) => clamp(0.18 + (Math.hypot(x - sx, y - sy) / (sr * 0.9)) * 1.1),
          angle: 0.5,
        });
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = 'rgba(255,200,150,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, sr * 0.9, 0, TAU);
        ctx.stroke();
        // orbit tick ring
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * TAU + t * 0.1;
          const r0 = sr * 1.02;
          const r1 = r0 + (i % 4 === 0 ? 12 : 6);
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0);
          ctx.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // ---------- contour field ----------
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - outP * 0.7);
    contourLines(ctx, t, {
      count: 20, cy: 640, spread: 380, amp: 40, amp2: 16, freq: 0.72, freq2: 2.1,
      color: '255,150,80', alpha: 0.12, width: 1, speed: 0.35,
    });
    ctx.restore();

    // ---------- ribbons into a scratch layer (so they can be mirrored) -------
    const R = scratch('s02rib', w, h);
    clearScratch(R);
    const rc = R.ctx;
    const rP = smoothstep(0.02, 0.75, t) * (1 - smoothstep(5.8, 6.0, t));
    const rP2 = smoothstep(0.35, 1.15, t) * (1 - smoothstep(5.82, 6.0, t));
    const rP3 = smoothstep(0.95, 1.7, t) * (1 - smoothstep(5.84, 6.0, t));

    if (rP2 > 0) {
      // the primary ribbon physically evolves: it widens, rises and twists harder
      const evo = smoothstep(0.6, 5.2, t);
      ribbon(rc, t * 1.12, {
        cy: 560 - evo * 70 + Math.sin(t * 0.9 + 1) * 40,
        width: 70 + evo * 90,
        amp: 66 + evo * 34,
        freq: 1.05 + evo * 0.35,
        amp2: 30, freq2: 2.9, phase: 1.9,
        twist: 9 + evo * 7, twistSpeed: -0.65 - evo * 0.7,
        shade: '110,44,16', mid: '255,140,60', light: '255,238,215',
        alpha: rP2 * 0.95, glowAmt: 0.6, depth: 0.8,
      });
    }
    if (rP > 0) {
      ribbon(rc, t, {
        cy: 552 + Math.sin(t * 0.7) * 34,
        width: 44, amp: 108, freq: 0.85, amp2: 36, freq2: 2.4, phase: 0.4,
        twist: 7, twistSpeed: 0.8, shade: '26,78,160', mid: '120,205,255', light: '200,245,255',
        alpha: rP * 0.6, glowAmt: 0.45, depth: 0.7,
      });
    }
    if (rP3 > 0) {
      ribbon(rc, t * 0.85 + 2, {
        cy: 596 + Math.sin(t * 1.1 + 2) * 48,
        width: 16, amp: 124, freq: 1.5, amp2: 44, freq2: 3.4, phase: 3.2,
        twist: 12, twistSpeed: 1.25, shade: '190,84,36', mid: '255,220,190', light: '255,255,255',
        alpha: rP3 * 0.92, glowAmt: 0.85, depth: 1,
      });
    }

    // composite ribbon + its floor reflection
    ctx.save();
    ctx.drawImage(R.canvas, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, REFLECT_Y, w, h - REFLECT_Y);
    ctx.clip();
    ctx.globalAlpha = 0.24;
    ctx.translate(0, REFLECT_Y * 2);
    ctx.scale(1, -1);
    ctx.drawImage(R.canvas, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // fade the reflection away
    const fade = ctx.createLinearGradient(0, REFLECT_Y, 0, h);
    fade.addColorStop(0, 'rgba(6,5,7,0)');
    fade.addColorStop(0.45, 'rgba(6,5,7,0.72)');
    fade.addColorStop(1, 'rgba(6,5,7,1)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = fade;
    ctx.fillRect(0, REFLECT_Y, w, h - REFLECT_Y);
    ctx.restore();

    // a second sweep crosses the frame in the second half — a new silhouette
    const sweepP = smoothstep(3.3, 4.1, t);
    if (sweepP > 0) {
      ctx.save();
      ctx.globalAlpha = sweepP;
      ctx.translate(960, 540);
      ctx.rotate(-0.42 + Math.sin(t * 0.6) * 0.05);
      ribbon(ctx, t * 1.6 + 4, {
        x0: -1400, x1: 1400, cy: 0, width: 26 + Math.sin(t) * 6,
        amp: 40, freq: 2.2, amp2: 16, freq2: 4.1, phase: 1,
        twist: 14, twistSpeed: 2.2, shade: '150,70,30', mid: '255,205,160', light: '255,255,255',
        alpha: 0.75, glowAmt: 0.9, depth: 1,
      });
      ctx.restore();
    }

    // horizon hairline
    const hz = ctx.createLinearGradient(300, 0, 1620, 0);
    hz.addColorStop(0, 'rgba(255,190,140,0)');
    hz.addColorStop(0.5, 'rgba(255,205,160,0.5)');
    hz.addColorStop(1, 'rgba(255,190,140,0)');
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - outP);
    ctx.fillStyle = hz;
    ctx.fillRect(300, REFLECT_Y, 1320, 1);
    ctx.restore();

    // ---------- flowing tracers ----------
    ctx.save();
    ctx.globalAlpha = 0.65 * (1 - outP);
    tracerStream(ctx, t, {
      count: 80, yBase: 600, spread: 150, amp: 40, speed: 0.85,
      color: '255,205,155', alpha: 0.45, len: 1.5, width: 1.1,
    });
    ctx.restore();

    dust(ctx, t, { count: 110, color: '255,215,185', alpha: 0.35, seed: 21, speed: 7 });

    // ---------- editorial chrome ----------
    const chrome = smoothstep(0.4, 1.0, t) * (1 - smoothstep(5.7, 5.98, t));
    if (chrome > 0) {
      ctx.save();
      ctx.globalAlpha = chrome;
      ctx.strokeStyle = 'rgba(255,235,215,0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(86, 96, w - 172, h - 192);
      microLabel(ctx, '02 — FEED', 112, 132, { size: 13, color: 'rgba(255,225,200,0.62)', tracking: 6 });
      microLabel(ctx, 'LIQUID GEOMETRY', w - 112, 132, { size: 13, color: 'rgba(255,225,200,0.62)', tracking: 6, align: 'right', tick: false });
      microLabel(ctx, 'PARALLAX / VOL 01', 112, h - 108, { size: 12, color: 'rgba(255,220,190,0.4)', tracking: 4, tick: false });
      microLabel(ctx, `TC ${(3 + t).toFixed(2)}s`, w - 112, h - 108, { size: 12, color: 'rgba(255,220,190,0.4)', tracking: 4, align: 'right', tick: false });
      // bottom mono ticker — keeps the lower third alive
      ctx.save();
      ctx.beginPath();
      ctx.rect(86, h - 174, w - 172, 36);
      ctx.clip();
      ctx.font = `400 15px "${FONT.mono}"`;
      ctx.letterSpacing = '6px';
      ctx.fillStyle = 'rgba(255,225,200,0.5)';
      const msg = 'FLUID DYNAMICS  ·  SOFT MACHINES  ·  LIQUID GEOMETRY  ·  SURFACE TENSION  ·  ';
      const unit = ctx.measureText(msg).width;
      const sc = (t * 130) % unit;
      for (let i = -1; i < Math.ceil(w / unit) + 1; i++) ctx.fillText(msg, i * unit - sc, h - 150);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,230,205,0.14)';
      ctx.beginPath();
      ctx.moveTo(86, h - 180);
      ctx.lineTo(w - 86, h - 180);
      ctx.moveTo(86, h - 132);
      ctx.lineTo(w - 86, h - 132);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,230,205,0.18)';
      ctx.beginPath();
      ctx.moveTo(112, 200);
      ctx.lineTo(112, 470);
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = 'rgba(255,230,205,0.32)';
        ctx.fillRect(112, 200 + i * 40, i % 3 === 0 ? 10 : 5, 1);
      }
      ctx.restore();
    }

    // ---------- beat A — FLUID ----------
    const aOut = smoothstep(1.5, 1.95, t);
    if (t > 0.05 && aOut < 1) {
      const p = ease.outExpo(clamp((t - 0.05) / 0.62));
      const size = fitSize(ctx, 'FLUID', FONT.display, 900, 330, 0);
      const tr = lerp(size * 0.2, size * 0.01, p);
      const tw = stringWidth(ctx, 'FLUID', size, FONT.display, tr);
      const bx = 500;
      const by = 452;
      ctx.save();
      ctx.globalAlpha = 1 - aOut;
      scrim(ctx, bx, by, 620, 300, 0.5);
      ctx.beginPath();
      ctx.rect(bx - tw / 2 - 10, by - size, (tw + 20) * p + 2, size * 2);
      ctx.clip();
      const grad = ctx.createLinearGradient(0, by - size * 0.45, 0, by + size * 0.45);
      grad.addColorStop(0, '#fffaf3');
      grad.addColorStop(0.55, '#ffe0bd');
      grad.addColorStop(1, '#ff9a52');
      drawString(ctx, 'FLUID', bx, by, {
        size, tracking: tr, align: 'center', gradient: grad,
      });
      ctx.restore();

      const ep = clamp((t - 0.4) / 0.5);
      ctx.save();
      ctx.globalAlpha = ep * (1 - aOut);
      ctx.fillStyle = 'rgba(255,220,185,0.7)';
      ctx.fillRect(bx - 150, by + size * 0.62, 300 * ep, 1.2);
      microLabel(ctx, 'IN MOTION SINCE 1998', bx, by + size * 0.62 + 34, {
        size: 14, align: 'center', color: 'rgba(255,228,205,0.8)', tracking: 9, tick: false,
      });
      ctx.restore();
    }

    // ---------- beat B — SOFT MACHINES ----------
    const bIn = 1.8;
    const bOut = 3.6;
    if (t > bIn && t < bOut + 0.6) {
      const w1 = fitSize(ctx, 'SOFT', FONT.display, 700, 200, 0);
      const w2 = fitSize(ctx, 'MACHINES', FONT.display, 900, 200, 0);
      const size = Math.min(w1, w2);
      stackedWords(ctx, ['SOFT', 'MACHINES'], t, {
        cx: 500, y0: 300, size, tracking: -size * 0.02, lineH: 0.92,
        inAt: bIn, stagger: 0.09, dur: 0.55, align: 'center',
        direction: 1, exitAt: bOut, exitDur: 0.28, color: '#fff6ec',
      });
      const rp = ease.outExpo(clamp((t - bIn - 0.3) / 0.5));
      if (rp > 0) {
        ctx.save();
        ctx.globalAlpha = (1 - smoothstep(bOut, bOut + 0.35, t)) * rp;
        ctx.fillStyle = 'rgba(255,220,190,0.7)';
        ctx.fillRect(330, 636, 340 * rp, 1.2);
        typedLine(ctx, 'flow · fold · resolve', 330, 672, t, {
          start: bIn + 0.42, size: 15, color: 'rgba(255,228,205,0.75)', tracking: 4, cps: 30,
        });
        ctx.restore();
      }
    }

    // ---------- beat C — liquid ----------
    const cIn = 3.72;
    if (t > cIn) {
      const cOut = smoothstep(5.6, 5.98, t);
      ctx.save();
      ctx.globalAlpha = 1 - cOut;
      const p = ease.outExpo(clamp((t - cIn) / 0.55));
      const size = 330;
      ctx.save();
      ctx.translate(0, (1 - p) * 36);
      ctx.scale(1, lerp(1.18, 1, p));
      scrim(ctx, 960, 520, 760, 300, 0.5);
      drawString(ctx, 'liquid', 960, 520, {
        size, family: FONT.serifIt, tracking: lerp(90, -4, p), align: 'center',
        color: 'rgba(255,247,238,0.98)',
      });
      ctx.restore();
      const lp = clamp((t - cIn - 0.3) / 0.4);
      if (lp > 0) {
        ctx.fillStyle = 'rgba(255,220,190,0.55)';
        ctx.fillRect(960 - 260 * lp, 690, 520 * lp, 1);
        microLabel(ctx, 'COMPOSITION  /  VOLUME 02', 960, 726, {
          size: 13, align: 'center', color: `rgba(255,228,205,${0.72 * lp})`, tracking: 8, tick: false,
        });
      }
      ctx.restore();
    }

    if (t > 4.4) {
      ctx.save();
      ctx.globalAlpha = smoothstep(4.4, 5.1, t) * 0.45 * (1 - outP);
      ringField(ctx, t, { cx: 1490, cy: 640, count: 24, r0: 40, r1: 400, color: '255,180,110', alpha: 0.22, width: 1, squash: 1, speed: 0.6 });
      ctx.restore();
    }

    ctx.restore();

    // ---------- exit: the world dims into the cut ----------
    if (outP > 0) {
      ctx.save();
      ctx.globalAlpha = outP * 0.6;
      const eg = ctx.createRadialGradient(960, 540, 0, 960, 540, 1150);
      eg.addColorStop(0, 'rgba(4,4,6,0)');
      eg.addColorStop(1, 'rgba(4,4,6,1)');
      ctx.fillStyle = eg;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  },
};
