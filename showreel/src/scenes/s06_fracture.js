/**
 * 06 — FRACTURE (25.0 → 30.0s)
 * The frame shatters: the image is cut into tiles that explode from the centre,
 * spin in 2.5D, then fold into a kaleidoscope. Built from a single rendered
 * source surface so every shard carries the same "photograph".
 */
import { clamp, ease, lerp, smoothstep } from '../core/math.js';
import { hash2 } from '../core/noise.js';
import { drawGlow } from '../core/draw.js';
import { FONT, microLabel, drawString } from '../core/text.js';
import { scratch, clearScratch } from '../core/pool.js';
import { kaleido, ringField, sunburst } from '../effects/patterns.js';
import { dust } from '../effects/particles.js';
import { ribbon } from '../effects/ribbon.js';
import { drawTunnel, makeCam } from '../effects/space.js';

const COLS = 12;
const ROWS = 7;

export const s06 = {
  id: 'fracture',
  start: 25.0,
  end: 30.0,
  draw(F, lt) {
    const { ctx, w, h } = F;
    const t = lt;

    ctx.fillStyle = '#03040a';
    ctx.fillRect(0, 0, w, h);

    // far field
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, 960, 540, 900, '50,120,255', 0.12 + Math.sin(t * 2) * 0.02, 0.55);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ringField(ctx, t, { cx: 960, cy: 540, count: 30, r0: 40, r1: 1200, color: '120,220,255', alpha: 0.16, width: 1, squash: 0.62, speed: 1.4 });
    ctx.restore();

    // ---------- the source image (a single frame's "photograph") ----------
    const SRC = scratch('s06src', w, h);
    clearScratch(SRC);
    const s = SRC.ctx;

    const bg = s.createRadialGradient(960, 540, 0, 960, 540, 1100);
    bg.addColorStop(0, '#173a6b');
    bg.addColorStop(0.42, '#0d2246');
    bg.addColorStop(0.75, '#081228');
    bg.addColorStop(1, '#03050f');
    s.fillStyle = bg;
    s.fillRect(0, 0, w, h);

    sunburst(s, t, { cx: 960, cy: 540, count: 54, color: '255,200,140', alpha: 0.18, radius: 1500, rot: 0.08 });
    s.save();
    s.globalCompositeOperation = 'lighter';
    drawGlow(s, 960, 540, 620, '90,190,255', 0.55, 0.28);
    drawGlow(s, 960, 540, 210, '255,255,255', 0.5, 0.12);
    s.restore();
    ribbon(s, t * 1.4, {
      cy: 540, width: 70, amp: 90, freq: 1.1, amp2: 30, freq2: 3.1, twist: 8, twistSpeed: 1.1,
      shade: '20,80,170', mid: '110,225,255', light: '255,255,255', alpha: 0.85, glowAmt: 0.6,
    });
    ribbon(s, t * 0.9 + 2, {
      cy: 600, width: 30, amp: 120, freq: 1.7, amp2: 40, freq2: 3.7, twist: 11, twistSpeed: -1.3,
      shade: '170,70,30', mid: '255,170,90', light: '255,240,220', alpha: 0.8, glowAmt: 0.7,
    });
    s.save();
    s.globalCompositeOperation = 'lighter';
    drawTunnel(s, F, {
      t: t * 0.8, cam: makeCam({ fov: 700, cx: 960, cy: 540 }), rings: 22, sides: 6,
      radius: 240, spacing: 40, speed: 220, color: '150,225,255', width: 1.2, alpha: 0.35, rotation: 0.4, glow: 0,
    });
    s.restore();
    s.save();
    const sc = s.createRadialGradient(960, 540, 60, 960, 540, 760);
    sc.addColorStop(0, 'rgba(4,8,18,0.72)');
    sc.addColorStop(0.6, 'rgba(4,8,18,0.4)');
    sc.addColorStop(1, 'rgba(4,8,18,0)');
    s.fillStyle = sc;
    s.fillRect(0, 0, w, h);
    s.restore();

    // ---------- shatter ----------
    const tiles = [];
    const tw = w / COLS;
    const th = h / ROWS;
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const cxT = (i + 0.5) * tw;
        const cyT = (j + 0.5) * th;
        const dx = cxT - 960;
        const dy = cyT - 540;
        const dist = Math.hypot(dx, dy);
        const rnd = hash2(i, j);
        // earthquake-style delay: tiles near the centre move first
        const delay = clamp(dist / 1100) * 0.55 + rnd * 0.15;
        tiles.push({ i, j, cxT, cyT, dx, dy, dist, rnd, delay, r2: hash2(i + 7, j + 3) });
      }
    }

    const shatterStart = 0.42;
    const p = clamp((t - shatterStart) / 1.9);
    const reassemble = smoothstep(2.35, 3.9, t);

    // sort by distance to draw the far tiles first
    tiles.sort((a, b) => b.dist - a.dist);

    // before the break, draw the source once — pixel-perfect, no tile seams
    if (t < shatterStart + 0.02) ctx.drawImage(SRC.canvas, 0, 0);

    for (const tile of tiles) {
      const tp = clamp((t - shatterStart - tile.delay * 0.7) / 1.5);
      const te = ease.outQuart(tp);
      const push = te * (1 - reassemble);
      const dist = Math.hypot(tile.dx, tile.dy) || 1;
      const nx = tile.dx / dist;
      const ny = tile.dy / dist;

      // Tiles near the centre have room to travel; edge tiles barely move, so the
      // frame stays populated instead of emptying out mid-chapter.
      const room = 1 - clamp(tile.dist / 1000);
      const radius = 200 + room * 430;
      // constant orbital drift keeps every shard alive, even when they are "parked"
      const orbit = t * (0.25 + tile.rnd * 0.5);
      const drift = (26 + tile.rnd * 34) * (1 - reassemble * 0.92);
      const tx = nx * radius * push * (0.5 + tile.rnd * 0.5) + Math.cos(orbit + tile.rnd * 6) * drift;
      const ty = ny * radius * push * (0.5 + tile.r2 * 0.5) + Math.sin(orbit + tile.r2 * 6) * drift * 0.8;
      const rot = (tile.rnd - 0.5) * 1.5 * push + Math.sin(orbit) * 0.16;
      const breath = 1 + Math.sin(t * 1.3 + tile.rnd * 8) * 0.04;
      const scale = (1 - 0.42 * push) * breath;
      const alpha = 1 - push * 0.08;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(tile.cxT + tx), Math.round(tile.cyT + ty));
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.rect(-tw / 2 - 1, -th / 2 - 1, tw + 2, th + 2);
      ctx.clip();
      const sx0 = Math.round(tile.i * tw);
      const sy0 = Math.round(tile.j * th);
      const sw = Math.round(tw);
      const shh = Math.round(th);
      ctx.drawImage(SRC.canvas, sx0, sy0, sw, shh, sx0 - Math.round(tile.cxT), sy0 - Math.round(tile.cyT), sw, shh);
      ctx.restore();

      // rim light on shard edges while flying
      if (push > 0.04) {
        ctx.save();
        ctx.globalAlpha = push * 0.75;
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(tile.cxT + tx, tile.cyT + ty);
        ctx.rotate(rot);
        ctx.scale(scale, scale);
        ctx.strokeStyle = `rgba(160,235,255,${0.3 + tile.rnd * 0.5})`;
        ctx.lineWidth = 1.4 / scale;
        ctx.strokeRect(-tw / 2, -th / 2, tw, th);
        ctx.restore();
      }
    }

    // ---------- kaleidoscope bloom at the fold ----------
    const kp = smoothstep(1.05, 2.7, t);
    if (kp > 0.01) {
      ctx.save();
      ctx.globalAlpha = kp * 0.44;
      kaleido(ctx, SRC, {
        cx: 960, cy: 540, segments: 16, radius: 1300, rot: t * 0.14, scale: 0.5 + kp * 0.34, alpha: 0.9, composite: 'lighter',
      });
      ctx.restore();
    }

    // ---------- a ribbon threads through the debris ----------
    const rb = smoothstep(1.2, 2.0, t) * (1 - smoothstep(3.4, 4.0, t));
    if (rb > 0.01) {
      ctx.save();
      ctx.globalAlpha = rb * 0.8;
      ribbon(ctx, t * 1.3 + 5, {
        cy: 540 + Math.sin(t * 0.7) * 60, width: 34, amp: 120, freq: 1.2, amp2: 40, freq2: 3.2,
        twist: 10, twistSpeed: 1.5, shade: '30,80,170', mid: '130,225,255', light: '255,255,255',
        alpha: 0.75, glowAmt: 0.8,
      });
      ctx.restore();
    }

    // ---------- central singularity ----------
    const coreG = Math.sin(clamp(p) * Math.PI) * 0.9;
    if (coreG > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, 960, 540, 60 + 260 * coreG, '200,245,255', 0.85 * coreG, 0.12);
      drawGlow(ctx, 960, 540, 20 + 90 * coreG, '255,255,255', coreG, 0.1);
      ctx.restore();
    }

    // ---------- foreground type over the reassembling field ----------
    const fg = smoothstep(2.15, 2.6, t);
    const fgOut = smoothstep(3.3, 3.62, t);
    if (fg > 0.01 && fgOut < 1) {
      const pIn = ease.outExpo(clamp((t - 2.15) / 0.55));
      ctx.save();
      ctx.globalAlpha = fg * (1 - fgOut);
      // keep the type legible without flattening the debris
      const sc = ctx.createRadialGradient(960, 540, 0, 960, 540, 780);
      sc.addColorStop(0, 'rgba(3,5,12,0.6)');
      sc.addColorStop(0.6, 'rgba(3,5,12,0.28)');
      sc.addColorStop(1, 'rgba(3,5,12,0)');
      ctx.fillStyle = sc;
      ctx.fillRect(0, 0, w, h);
      ctx.translate(0, -fgOut * 40);
      drawString(ctx, 'FRACTURE', 960, 520, {
        size: 210, tracking: lerp(110, 4, pIn), align: 'center',
        gradient: (() => {
          const g = ctx.createLinearGradient(0, 420, 0, 640);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.55, '#d9f2ff');
          g.addColorStop(1, '#6cc6ff');
          return g;
        })(),
      });
      const rp2 = ease.outExpo(clamp((t - 2.35) / 0.5));
      if (rp2 > 0) {
        ctx.fillStyle = 'rgba(170,225,255,0.8)';
        ctx.fillRect(960 - 250 * rp2, 616, 500 * rp2, 1.4);
        microLabel(ctx, 'ONE IMAGE  /  EIGHTY-FOUR SHARDS', 960, 652, {
          size: 12, align: 'center', color: `rgba(195,235,255,${0.75 * rp2})`, tracking: 8, tick: false,
        });
      }
      ctx.restore();
    }

    // ---------- end card beat ----------
    const endP = smoothstep(3.5, 4.0, t);
    if (endP > 0) {
      ctx.save();
      ctx.globalAlpha = endP;
      ctx.fillStyle = 'rgba(3,4,10,0.72)';
      ctx.fillRect(0, 0, w, h);
      drawString(ctx, 'SHATTER', 960, 520, {
        size: 210, tracking: lerp(120, 6, ease.outExpo(clamp((t - 3.5) / 0.6))), align: 'center',
        gradient: (() => {
          const g = ctx.createLinearGradient(0, 400, 0, 640);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(1, '#6fd0ff');
          return g;
        })(),
      });
      microLabel(ctx, 'STATE 06 — REASSEMBLY', 960, 640, {
        size: 12, align: 'center', color: 'rgba(190,235,255,0.7)', tracking: 8, tick: false,
      });
      ctx.restore();
    }

    dust(ctx, t, { count: 130, color: '190,240,255', alpha: 0.45, seed: 66, speed: 30 });

    // HUD
    ctx.save();
    ctx.globalAlpha = 0.6 * (1 - endP * 0.5);
    microLabel(ctx, '06 — FRACTURE', 112, 126, { size: 12, color: 'rgba(200,240,255,0.55)', tracking: 6 });
    microLabel(ctx, `SHARDS ${tiles.length}`, w - 112, 126, { size: 12, color: 'rgba(200,240,255,0.5)', tracking: 5, align: 'right', tick: false });
    ctx.restore();
  },
};
