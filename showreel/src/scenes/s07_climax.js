/**
 * 07 — CLIMAX (30.0 → 35.5s)
 * Everything the film has established converges: the tunnel, the ribbons, the
 * particle field, the kaleidoscope, the grid and the type. Speed ramps up,
 * the camera pushes through successive rings of light, and the chapter ends on
 * a type-through-lens impact.
 */
import { TAU, clamp, ease, lerp, smoothstep } from '../core/math.js';
import { hash1 } from '../core/noise.js';
import { drawGlow } from '../core/draw.js';
import { microLabel, drawString } from '../core/text.js';
import { scratch, clearScratch } from '../core/pool.js';
import { makeCam, drawTunnel, drawRadialStreaks, anamorphicFlare, shockwave, lightWedges } from '../effects/space.js';
import { ribbon } from '../effects/ribbon.js';
import { tracerStream, swarm, dotWave } from '../effects/particles.js';
import { kaleido, ringField } from '../effects/patterns.js';
import { premiumWord } from '../effects/typefx.js';

export const s07 = {
  id: 'climax',
  start: 30.0,
  end: 35.5,
  draw(F, lt) {
    const { ctx, w, h } = F;
    const t = lt;

    // global speed ramp
    const ramp = Math.pow(clamp(t / 4.4), 1.6);

    // ---------- backdrop ----------
    const bg = ctx.createRadialGradient(960, 540, 0, 960, 540, 1200);
    bg.addColorStop(0, `rgba(${Math.round(10 + ramp * 40)},${Math.round(14 + ramp * 60)},${Math.round(30 + ramp * 90)},1)`);
    bg.addColorStop(0.5, '#04060e');
    bg.addColorStop(1, '#010104');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const cam = makeCam({
      fov: 900 - ramp * 260,
      x: Math.sin(t * 1.4) * 60 * (1 - ramp * 0.6),
      y: Math.cos(t * 1.1) * 40 * (1 - ramp * 0.6),
    });

    // ---------- depth layers ----------
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawRadialStreaks(ctx, F, { t, cam, count: 300, alpha: 0.35 + ramp * 0.3, seed: 7, inner: 80, length: 1 + ramp });
    ctx.restore();

    const tunnelA = smoothstep(0, 0.8, t);
    ctx.save();
    ctx.globalAlpha = tunnelA * 0.85;
    drawTunnel(ctx, F, {
      t, cam, rings: 44, sides: 6, radius: 250, spacing: 30,
      speed: 320 + ramp * 1400, color: '150,235,255', width: 1.4, alpha: 0.9,
      rotation: 0.5, twist: 0.03, glow: 0.7,
    });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.45 * tunnelA;
    drawTunnel(ctx, F, {
      t: t * 1.3 + 1, cam, rings: 30, sides: 3, radius: 340, spacing: 46,
      speed: 180 + ramp * 900, color: '255,170,110', width: 1.1, alpha: 0.7,
      rotation: -0.4, twist: -0.06, glow: 0,
    });
    ctx.restore();

    // ---------- ribbons sweeping the frame ----------
    const rp = smoothstep(0.25, 1.3, t);
    if (rp > 0) {
      const R = scratch('s07rib', w, h);
      clearScratch(R);
      ribbon(R.ctx, t * 1.5, {
        cy: 480 + Math.sin(t) * 60, width: 90 + ramp * 40, amp: 110, freq: 0.9, amp2: 40, freq2: 2.6,
        twist: 9, twistSpeed: 1.6, shade: '20,70,170', mid: '120,230,255', light: '255,255,255',
        alpha: 0.5 * rp, glowAmt: 0.45,
      });
      ribbon(R.ctx, t * 1.1 + 2, {
        cy: 620, width: 30 + ramp * 30, amp: 150, freq: 1.4, amp2: 52, freq2: 3.3,
        twist: 12, twistSpeed: -2.1, shade: '170,70,30', mid: '255,180,100', light: '255,245,225',
        alpha: 0.5 * rp, glowAmt: 0.5,
      });
      ctx.save();
      ctx.globalAlpha = rp;
      ctx.drawImage(R.canvas, 0, 0);
      ctx.globalAlpha = rp * 0.1;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(R.canvas, -14, 6);
      ctx.drawImage(R.canvas, 14, -6);
      ctx.restore();
    }

    // ---------- kaleidoscope bloom ----------
    const kp = smoothstep(1.7, 3.2, t);
    if (kp > 0.01) {
      const K = scratch('s07kal', w, h);
      clearScratch(K);
      const k = K.ctx;
      k.save();
      k.globalCompositeOperation = 'lighter';
      dotWave(k, t, { cx: 960, cy: 540, rings: 26, perRing: 90, r0: 40, r1: 1000, color: '180,240,255', alpha: 0.5, size: 3, squash: 0.7, speed: 1.8 });
      ringField(k, t, { cx: 960, cy: 540, count: 22, r0: 60, r1: 900, color: '255,180,110', alpha: 0.2, width: 2, squash: 0.7, speed: 2.4 });
      drawGlow(k, 960, 540, 420, '120,215,255', 0.26, 0.3);
      k.restore();
      ctx.save();
      ctx.globalAlpha = kp * 0.6;
      kaleido(ctx, K, { cx: 960, cy: 540, segments: 14, radius: 1300, rot: t * 0.22, scale: 0.55 + kp * 0.35 });
      ctx.restore();
    }

    // ---------- particles ----------
    ctx.save();
    ctx.globalAlpha = 0.8;
    sparkLayer(ctx, t, ramp, w, h);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.9;
    swarm(ctx, 960, 540, t, { count: 340, color: '230,250,255', alpha: 0.7, radius: 700 + ramp * 200, size: 2.2, seed: 13 });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.4;
    tracerStream(ctx, t, { count: 140, yBase: 540, spread: 500, amp: 90, speed: 2.4 + ramp * 2, color: '150,230,255', alpha: 0.5, len: 2.4, width: 1.2 });
    ctx.restore();

    // ---------- impact rings ----------
    shockwave(ctx, 960, 540, t, { start: 0.02, count: 5, radius: 1500, life: 1.5, color: '200,245,255', width: 3, squash: 0.7 });

    // ---------- light ----------
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fl = 0.55 + 0.45 * Math.sin(t * 2.4);
    anamorphicFlare(ctx, 960, 540, {
      length: 1200 + fl * 380 + ramp * 260, thickness: 1.2 + ramp * 2.2, core: 18 + ramp * 22,
      alpha: 0.28 + fl * 0.18, color: '170,235,255',
    });
    lightWedges(ctx, 960, 540, t, { count: 11, color: '120,200,255', alpha: 0.06 + ramp * 0.05, rotate: 0.14 });
    ctx.restore();

    // ---------- type ----------
    drawClimaxType(ctx, t, ramp, w, h);

    // HUD
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - smoothstep(4.6, 5.1, t));
    microLabel(ctx, '07 — CLIMAX', 112, 126, { size: 12, color: 'rgba(200,240,255,0.55)', tracking: 6 });
    microLabel(ctx, `VELOCITY ${(1 + ramp * 9).toFixed(1)}×`, w - 112, 126, { size: 12, color: 'rgba(200,240,255,0.5)', tracking: 5, align: 'right', tick: false });
    ctx.restore();
  },
};

function sparkLayer(ctx, t, ramp, w, h) {
  const N = 260;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const ang = hash1(i * 3.3) * TAU;
    const rnd = hash1(i * 7.9);
    const sp = 0.35 + rnd * 1.2;
    const p = ((t * sp * (0.5 + ramp) + rnd) % 1);
    const r = 40 + Math.pow(p, 1.6) * 1400;
    const x = 960 + Math.cos(ang) * r;
    const y = 540 + Math.sin(ang) * r * 0.72;
    const len = 20 + p * 190 * (1 + ramp * 2);
    const x2 = 960 + Math.cos(ang) * (r - len);
    const y2 = 540 + Math.sin(ang) * (r - len) * 0.72;
    const a = Math.sin(p * Math.PI) * (0.25 + rnd * 0.6);
    const g = ctx.createLinearGradient(x2, y2, x, y);
    g.addColorStop(0, `rgba(160,235,255,0)`);
    g.addColorStop(1, `rgba(${i % 7 === 0 ? '255,190,130' : '210,245,255'},${a})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = 0.6 + (1 - p) * 2.2;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawClimaxType(ctx, t, ramp, w, h) {
  // A — converging statement
  if (t > 0.35 && t < 2.0) {
    const p = ease.outExpo(clamp((t - 0.35) / 0.5));
    const ex = smoothstep(1.55, 1.95, t);
    ctx.save();
    ctx.globalAlpha = 1 - ex;
    ctx.translate(0, -ex * 50);
    const scr = ctx.createRadialGradient(960, 520, 0, 960, 520, 900);
    scr.addColorStop(0, 'rgba(3,5,12,0.72)');
    scr.addColorStop(0.6, 'rgba(3,5,12,0.35)');
    scr.addColorStop(1, 'rgba(3,5,12,0)');
    ctx.fillStyle = scr;
    ctx.fillRect(0, 0, w, h);
    premiumWord(ctx, 'CONVERGE', 960, 520, t, {
      size: 250, tracking: lerp(120, -6, p), align: 'center',
      bands: ['#ffffff', '#d8f3ff', '#6fd0ff', '#ffffff'],
      chroma: 10 * (1 - p) + 2, glow: 26,
    });
    const sp = clamp((t - 0.55) / 0.4);
    if (sp > 0) {
      microLabel(ctx, 'EVERY LAYER  ·  EVERY BEAT  ·  ONE FRAME', 960, 650, {
        size: 12, align: 'center', color: 'rgba(200,240,255,0.7)', tracking: 9, tick: false,
      });
    }
    ctx.restore();
  }

  // B — giant kinetic mass
  if (t > 2.0 && t < 3.7) {
    const p = ease.outExpo(clamp((t - 2.0) / 0.42));
    const ex = smoothstep(3.3, 3.68, t);
    const sc = lerp(0.78, 1.08, clamp((t - 2.0) / 1.7));
    ctx.save();
    ctx.globalAlpha = 1 - ex;
    const scr2 = ctx.createRadialGradient(960, 540, 0, 960, 540, 860);
    scr2.addColorStop(0, 'rgba(3,5,12,0.66)');
    scr2.addColorStop(0.62, 'rgba(3,5,12,0.3)');
    scr2.addColorStop(1, 'rgba(3,5,12,0)');
    ctx.fillStyle = scr2;
    ctx.fillRect(0, 0, w, h);
    ctx.translate(960, 540);
    ctx.scale(sc, sc);
    ctx.transform(1, 0, -0.1 + Math.sin(t * 4) * 0.012, 1, 0, 0);
    for (let i = 7; i >= 1; i--) {
      ctx.save();
      ctx.globalAlpha *= 0.11;
      drawString(ctx, 'TOTAL CONTROL', i * 1.5, 0, { size: 190, tracking: -6, align: 'center', color: 'rgb(120,225,255)' });
      ctx.restore();
    }
    drawString(ctx, 'TOTAL CONTROL', 0, 0, {
      size: 190, tracking: -6, align: 'center',
      gradient: (() => {
        const g = ctx.createLinearGradient(0, -80, 0, 80);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.55, '#cdeeff');
        g.addColorStop(1, '#57b8ff');
        return g;
      })(),
    });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = (1 - ex) * p;
    ctx.fillStyle = 'rgba(255,190,130,0.9)';
    ctx.fillRect(960 - 330 * p, 690, 660 * p, 2);
    ctx.restore();
  }

  // C — speed-through type
  if (t > 3.6 && t < 5.1) {
    const words = ['FRAME', 'BY', 'FRAME'];
    words.forEach((word, i) => {
      const st = 3.62 + i * 0.26;
      const p = clamp((t - st) / 0.52);
      if (p <= 0 || p >= 1) return;
      const e = clamp(p);
      const sc = lerp(0.55, 3.4, e);
      const a = Math.sin(Math.min(1, p) * Math.PI) ** 0.6;
      ctx.save();
      ctx.translate(960, 540);
      ctx.scale(sc, sc);
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = i === 1 ? 'source-over' : 'source-over';
      drawString(ctx, word, 0, 0, {
        size: 190, tracking: -4, align: 'center',
        gradient: (() => {
          const g = ctx.createLinearGradient(0, -90, 0, 90);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(1, i === 1 ? '#ffb377' : '#74d4ff');
          return g;
        })(),
      });
      ctx.restore();
      // motion trail — concentric echoes expanding with the word
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k2 = 1; k2 <= 4; k2++) {
        const ee = Math.max(0, e - k2 * 0.055);
        const sc2 = lerp(0.55, 3.4, ee);
        ctx.save();
        ctx.globalAlpha = a * (0.16 / k2);
        ctx.translate(960, 540);
        ctx.scale(sc2, sc2);
        drawString(ctx, word, 0, 0, { size: 190, tracking: -4, align: 'center', color: '#9fe6ff' });
        ctx.restore();
      }
      ctx.restore();
    });
  }
}
