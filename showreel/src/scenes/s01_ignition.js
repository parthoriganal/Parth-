/**
 * 01 — IGNITION (0.0 → 3.0s)
 * A hard black hold, a single point of light detonates into a crosshair, a
 * monolithic word slams in and is then sucked back into the singularity, which
 * opens into a hyperspace tunnel. First two seconds: three distinct beats of
 * scale, light and typography.
 */
import { TAU, clamp, ease, lerp, smoothstep } from '../core/math.js';
import { hash1, hash2 } from '../core/noise.js';
import { drawGlow } from '../core/draw.js';
import { FONT, drawText, microLabel, setFont } from '../core/text.js';
import { drawTunnel, drawRadialStreaks, anamorphicFlare, shockwave, makeCam, lightWedges } from '../effects/space.js';

export const s01 = {
  id: 'ignition',
  start: 0,
  end: 3.0,
  draw(F, lt) {
    const { ctx, w, h } = F;
    const t = lt;
    const cx = w / 2;
    const cy = h / 2;

    // ---- backdrop ----------------------------------------------------------
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1150);
    bg.addColorStop(0, '#0b1018');
    bg.addColorStop(0.45, '#05070c');
    bg.addColorStop(1, '#010103');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // fine technical grid, barely there
    const gridA = 0.028 * smoothstep(0.05, 0.6, t);
    if (gridA > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(120,190,255,${gridA})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 80) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += 80) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    const ignite = 0.16;

    // ---- ignition crosshair ------------------------------------------------
    const crossP = ease.outExpo(clamp((t - ignite) / 0.55));
    const crossOut = 1 - smoothstep(0.55, 0.95, t);
    if (t > ignite && crossOut > 0) {
      const lenX = 1180 * crossP;
      const lenY = 420 * crossP;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = crossOut;
      const gx = ctx.createLinearGradient(cx - lenX, 0, cx + lenX, 0);
      gx.addColorStop(0, 'rgba(90,200,255,0)');
      gx.addColorStop(0.5, 'rgba(235,255,255,1)');
      gx.addColorStop(1, 'rgba(90,200,255,0)');
      ctx.fillStyle = gx;
      ctx.fillRect(cx - lenX, cy - 1.1, lenX * 2, 2.2);
      const gy = ctx.createLinearGradient(0, cy - lenY, 0, cy + lenY);
      gy.addColorStop(0, 'rgba(90,200,255,0)');
      gy.addColorStop(0.5, 'rgba(235,255,255,1)');
      gy.addColorStop(1, 'rgba(90,200,255,0)');
      ctx.fillStyle = gy;
      ctx.fillRect(cx - 1, cy - lenY, 2, lenY * 2);
      ctx.restore();
    }

    // core singularity
    const core = Math.max(0, 1 - smoothstep(1.15, 1.75, t));
    if (t > ignite) {
      const cp = clamp((t - ignite) / 0.2);
      const rad = 26 + 90 * cp + Math.sin(t * 24) * 3;
      drawGlow(ctx, cx, cy, rad * 5.2, '90,190,255', 0.55 * core, 0.35);
      drawGlow(ctx, cx, cy, rad * 1.9, '255,255,255', 1 * core, 0.12);
      anamorphicFlare(ctx, cx, cy, {
        length: 1750 * ease.outExpo(clamp((t - ignite) / 0.5)),
        thickness: 1.8,
        core: 26,
        alpha: 0.85 * crossOut,
        color: '180,235,255',
      });
    }

    // ---- shockwaves + particle burst --------------------------------------
    if (t > ignite) {
      shockwave(ctx, cx, cy, t, { start: ignite, count: 4, radius: 1500, life: 0.95, color: '170,235,255', width: 3.2, squash: 0.5 });
    }

    const burstT = t - ignite;
    if (burstT > 0 && burstT < 1.35) {
      const N = 620;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = 0; i < N; i++) {
        const ang = hash1(i * 3.11) * TAU;
        const spd = 340 + hash2(i, 5) * 1750;
        const r0 = 18 + hash2(i, 2) * 30;
        const life = 0.55 + hash2(i, 8) * 0.75;
        const p = clamp(burstT / life);
        if (p >= 1) continue;
        const r = r0 + spd * Math.pow(p, 1.55);
        const a = (1 - p) ** 1.7 * (0.35 + hash2(i, 4) * 0.65);
        const x0 = cx + Math.cos(ang) * r;
        const y0 = cy + Math.sin(ang) * r * 0.72;
        const x1 = cx + Math.cos(ang) * (r - (18 + spd * 0.035) * (1 - p));
        const y1 = cy + Math.sin(ang) * (r - (18 + spd * 0.035) * (1 - p)) * 0.72;
        const c = hash2(i, 12) < 0.22 ? '255,214,170' : '180,238,255';
        ctx.strokeStyle = `rgba(${c},${a})`;
        ctx.lineWidth = 0.7 + hash2(i, 6) * 2.1;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---- the word ----------------------------------------------------------
    const WORD = 'SIGNAL';
    const inT = 0.42;
    const outT = 1.02;
    if (t > inT && t < outT + 0.75) {
      const land = ease.outExpo(clamp((t - inT) / 0.26));
      const collapse = clamp((t - outT) / 0.32);
      const ce = ease.inExpo(collapse);
      const scale = (1.42 - 0.42 * land) * (1 - ce) + 0.001;
      const rot = -0.02 * (1 - land) + ce * 0.06;
      const alpha = smoothstep(inT, inT + 0.06, t) * (1 - smoothstep(0.85, 1, collapse));
      const tracking = lerp(96, 4, ease.outExpo(clamp((t - inT) / 0.5))) + ce * 40;
      const size = 330;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      // motion-blur ghosts
      if (collapse < 1) {
        const ghosts = collapse > 0 ? 4 : 2;
        for (let g = ghosts; g >= 1; g--) {
          const gs = 1 + g * 0.008 + collapse * g * 0.02;
          ctx.save();
          ctx.globalAlpha = alpha * (0.16 / g);
          ctx.scale(gs, gs);
          drawText(ctx, WORD, 0, 0, {
            size,
            tracking,
            composite: 'lighter',
            color: 'rgba(150,225,255,1)',
            baseline: 'middle',
          });
          ctx.restore();
        }
      }

      // chromatic ghost passes at the impact
      const chroma = (1 - clamp((t - inT) / 0.3)) * 26;
      if (chroma > 1) {
        drawText(ctx, WORD, -chroma, 0, { size, tracking, color: 'rgba(255,60,90,0.75)', composite: 'lighter', baseline: 'middle' });
        drawText(ctx, WORD, chroma * 0.8, 0, { size, tracking, color: 'rgba(40,220,255,0.75)', composite: 'lighter', baseline: 'middle' });
      }

      // main fill: vertical metal gradient + hot edge
      const grad = ctx.createLinearGradient(0, -size * 0.42, 0, size * 0.42);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.42, '#eaf7ff');
      grad.addColorStop(0.52, '#bfe4ff');
      grad.addColorStop(0.78, '#ffffff');
      grad.addColorStop(1, '#d8ecff');
      drawText(ctx, WORD, 0, 0, {
        size,
        tracking,
        gradient: grad,
        baseline: 'middle',
        perChar: (i, n) => {
          const shear = Math.sin(t * 3 + i * 1.7) * 2.2 * (1 - collapse);
          return { dx: shear, skewX: Math.sin(t * 2 + i) * 0.004 };
        },
      });

      // horizontal slice glitch on the word, only mid-hold
      const sliceAmt = smoothstep(inT + 0.1, inT + 0.3, t) * (1 - smoothstep(0.8, outT, t));
      if (sliceAmt > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.5 * sliceAmt;
        ctx.beginPath();
        ctx.rect(-900, -size * 0.6, 1800, size * 1.2);
        ctx.clip();
        drawText(ctx, WORD, Math.sin(t * 24) * 14 * sliceAmt, 0, {
          size,
          tracking,
          color: 'rgba(120,220,255,0.6)',
          baseline: 'middle',
        });
        ctx.restore();
      }

      ctx.restore();

      // underline rule that draws out from the centre
      const ruleP = ease.outExpo(clamp((t - inT - 0.1) / 0.4));
      if (ruleP > 0 && collapse < 0.9) {
        const rw = 620 * ruleP;
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = 'rgba(190,240,255,0.9)';
        ctx.fillRect(cx - rw, cy + 196, rw * 2, 1.6);
        microLabel(ctx, 'MOTION STUDY  /  VOL. 01', cx, cy + 236, {
          size: 15,
          align: 'center',
          color: `rgba(190,230,255,${0.75 * ruleP})`,
          tick: false,
          tracking: 7,
        });
        ctx.restore();
      }
    }

    // ---- hyperspace tunnel -------------------------------------------------
    const tun = smoothstep(1.18, 1.55, t);
    if (tun > 0) {
      const p = clamp((t - 1.18) / 1.82);
      const cam = makeCam({
        fov: 900,
        x: Math.sin(t * 2.1) * 26 + Math.sin(t * 0.7) * 40,
        y: Math.cos(t * 1.7) * 18,
      });
      ctx.save();
      ctx.globalAlpha = tun;

      ctx.globalCompositeOperation = 'lighter';
      drawRadialStreaks(ctx, F, { t, cam, count: 260, alpha: 0.55, seed: 3, inner: 60 });
      ctx.globalCompositeOperation = 'source-over';

      drawTunnel(ctx, F, {
        t,
        cam,
        rings: 40,
        sides: 6,
        radius: 235,
        spacing: 30,
        speed: 300 + p * 900,
        color: '150,230,255',
        width: 1.5,
        alpha: 0.95,
        rotation: 0.5,
        twist: 0.035,
        glow: 0.9,
      });
      drawTunnel(ctx, F, {
        t: t * 1.0 + 0.4,
        cam,
        rings: 26,
        sides: 3,
        radius: 330,
        spacing: 52,
        speed: 180 + p * 500,
        color: '255,190,140',
        width: 1.1,
        alpha: 0.45,
        rotation: -0.3,
        twist: -0.05,
        glow: 0,
      });

      lightWedges(ctx, cx - cam.x, cy - cam.y, t, { count: 9, color: '120,200,255', alpha: 0.07, rotate: 0.09 });

      // rotating mono type ring
      const rr = 505 - p * 60;
      const rot = t * 0.55;
      const label = 'PARALLAX   ·   A MOTION STUDY   ·   VOL. 01   ·   MMXXVI   ·   ';
      ctx.save();
      setFont(ctx, 15, FONT.mono);
      ctx.fillStyle = `rgba(170,220,255,${0.5 * tun})`;
      const chars = [...label];
      const step = TAU / chars.length;
      for (let i = 0; i < chars.length; i++) {
        const a = rot + i * step;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92);
        ctx.rotate(a + Math.PI / 2);
        ctx.globalAlpha = tun * 0.6;
        ctx.fillText(chars[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();

      // dust motes rushing past
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 240; i++) {
        const a = hash1(i * 5.7) * TAU;
        const rad = 120 + hash1(i * 9.1) * 900;
        const z = ((hash1(i * 3.3) * 40 - t * 34) % 40 + 40) % 40;
        const s = 0.4 + (40 - z) / 18;
        const x = cx + Math.cos(a) * rad * (1 + s * 0.4);
        const y = cy + Math.sin(a) * rad * 0.8 * (1 + s * 0.4);
        const al = clamp((40 - z) / 40) * 0.5 * tun;
        drawGlow(ctx, x, y, 4 + s * 7, '200,245,255', al, 0.2);
      }
      ctx.restore();
      ctx.restore();
    }

    // ---- corner HUD --------------------------------------------------------
    const hudA = smoothstep(0.5, 0.9, t) * (1 - smoothstep(1.6, 1.9, t));
    if (hudA > 0) {
      ctx.save();
      ctx.globalAlpha = hudA;
      const m = 74;
      ctx.strokeStyle = 'rgba(180,225,255,0.35)';
      ctx.lineWidth = 1;
      const k = 26;
      const corners = [
        [m, m, 1, 1],
        [w - m, m, -1, 1],
        [m, h - m, 1, -1],
        [w - m, h - m, -1, -1],
      ];
      for (const [x, y, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x + k * sx, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + k * sy);
        ctx.stroke();
      }
      microLabel(ctx, 'PARALLAX', m + 14, m + 40, { size: 16, color: 'rgba(220,240,255,0.8)', tracking: 8 });
      microLabel(ctx, 'FRAME 0001 — 0003', w - m - 14, h - m - 16, { size: 13, align: 'right', color: 'rgba(190,225,255,0.55)', tick: false });
      ctx.restore();
    }
  },
};
