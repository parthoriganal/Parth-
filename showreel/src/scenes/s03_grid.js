/**
 * 03 — FORM (9.0 → 15.0s)
 * A hard cut into daylight: brutalist print design in motion. Bone paper,
 * black Anton type, one red accent. Everything is layered at different parallax
 * depths, with halftone, print misregistration and a ticker band. The light
 * inversion is the editor's beat-change after two dark chapters.
 */
import { TAU, clamp, ease, lerp, smoothstep } from '../core/math.js';
import { FONT, microLabel, drawString, stringWidth } from '../core/text.js';
import { halftone } from '../effects/patterns.js';

const PAPER = '#ece7db';
const INK = '#0d0d0f';
const RED = '#e5331f';

const P = {
  ease: (t, d = 0) => ease.outExpo(clamp(t / d)),
};

export const s03 = {
  id: 'form',
  start: 9.0,
  end: 15.0,
  draw(F, lt) {
    const { ctx, w, h } = F;
    const t = lt;
    const out = smoothstep(5.6, 6.0, t);

    // ---------- paper ----------
    const bg = ctx.createLinearGradient(0, 0, w * 0.3, h);
    bg.addColorStop(0, '#f3eee2');
    bg.addColorStop(0.55, '#e9e3d5');
    bg.addColorStop(1, '#ded7c6');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // faint large grid, print registration feel
    ctx.save();
    ctx.strokeStyle = 'rgba(20,20,24,0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 96; x < w; x += 96) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 72; y < h; y += 96) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.restore();

    // =====================================================================
    // BEAT A — the black mass + FORM  (0 → 1.75)
    // =====================================================================
    const aOut = smoothstep(1.62, 1.9, t);

    // black mass slides in from the right, then becomes full-bleed
    const massP = clamp((t + 0.42) / 0.5);
    const massFull = ease.inOutCubic(clamp((t - 1.55) / 0.42));
    if (massP > 0) {
      const mw = lerp(0, 760, massP) + massFull * 1400;
      const mx = lerp(1990, 1250, massP) - massFull * 1250;
      ctx.save();
      ctx.fillStyle = INK;
      ctx.fillRect(mx, -1, mw, h + 2);
      ctx.restore();

      // reversed mono column inside the mass
      if (massP > 0.6 && massFull < 0.4) {
        ctx.save();
        ctx.globalAlpha = (1 - massFull) * clamp((t - 0.24) / 0.3);
        ctx.fillStyle = PAPER;
        ctx.font = `400 13px "${FONT.mono}"`;
        ctx.letterSpacing = '3px';
        const lines = ['FORM', 'FOLLOWS', 'FRICTION', '—', 'N° 01'];
        lines.forEach((ln, i) => ctx.fillText(ln, 1290, 150 + i * 78));
        ctx.strokeStyle = 'rgba(236,231,219,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(1290, 546);
        ctx.lineTo(1720, 546);
        ctx.stroke();
        ctx.restore();
      }
    }

    // halftone black disc (paper beat only)
    const disc = 1 - smoothstep(1.3, 1.75, t);
    if (disc > 0.01) {
      ctx.save();
      ctx.globalAlpha = disc;
      ctx.beginPath();
      ctx.arc(960, 250, 250, 0, TAU);
      ctx.clip();
      halftone(ctx, {
        x0: 700, x1: 1220, y0: 0, y1: 510, step: 11, maxR: 4.6,
        color: '18,18,22', alpha: 0.5, angle: 0.6,
        field: (x, y) => clamp(0.35 + Math.hypot(x - 960, y - 250) / 520),
      });
      ctx.restore();
    }

    // the word
    if (aOut < 1) {
      const p = P.ease(t + 0.26, 0.5);
      const size = 300;
      const tr = lerp(-16, -4, p);
      const wid = stringWidth(ctx, 'FORM', size, FONT.display, tr);
      ctx.save();
      ctx.globalAlpha = 1 - aOut;
      ctx.translate(0, -aOut * 40);
      // red block behind, offset in depth
      const rp = ease.outExpo(clamp((t + 0.18) / 0.45));
      ctx.fillStyle = RED;
      ctx.globalAlpha = (1 - aOut) * 0.95 * rp;
      ctx.fillRect(148 + 14, 486 + 12, (wid + 26) * rp, size * 0.42);
      ctx.globalAlpha = 1 - aOut;

      // mask reveal
      ctx.save();
      ctx.beginPath();
      ctx.rect(120, 300, (wid + 80) * p, 420);
      ctx.clip();
      // misregistration prints
      drawString(ctx, 'FORM', 152 - 5, 600, { size, tracking: tr, align: 'left', color: 'rgba(229,51,31,0.5)' });
      drawString(ctx, 'FORM', 152 + 5, 604, { size, tracking: tr, align: 'left', color: 'rgba(20,60,160,0.35)' });
      drawString(ctx, 'FORM', 152, 600, { size, tracking: tr, align: 'left', color: INK });
      ctx.restore();

      // rules + mono
      const rl = ease.outExpo(clamp((t + 0.1) / 0.5));
      if (rl > 0) {
        ctx.fillStyle = INK;
        ctx.fillRect(152, 668, 470 * rl, 2);
        ctx.fillStyle = RED;
        ctx.fillRect(152, 682, 120 * rl, 6);
        microLabel(ctx, 'VOLUME 01  /  GEOMETRY OF MOTION', 152, 726, {
          size: 13, color: 'rgba(13,13,15,0.72)', tracking: 5, tick: false,
        });
      }
      ctx.restore();
    }

    // left vertical rule + index
    if (t > 0.3 && aOut < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - aOut) * ease.outExpo(clamp((t - 0.3) / 0.5));
      ctx.fillStyle = 'rgba(13,13,15,0.25)';
      ctx.fillRect(96, 132, 1, 300);
      microLabel(ctx, '03', 96, 118, { size: 12, color: 'rgba(13,13,15,0.6)', tracking: 3, tick: false });
      microLabel(ctx, 'FORM', w - 78, 118, { size: 12, color: 'rgba(13,13,15,0.6)', tracking: 4, align: 'right', tick: false });
      ctx.restore();
    }

    // =====================================================================
    // BEAT B — inverted: bone on ink, giant numeral, ticker  (1.75 → 3.5)
    // =====================================================================
    const bin = smoothstep(1.6, 1.95, t);
    const bout = smoothstep(3.25, 3.65, t);
    if (bin > 0.02 && bout < 0.99) {
      ctx.save();
      ctx.globalAlpha = bin * (1 - bout);
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, w, h);

      // halftone orb — bone dots fading out of the ink
      const zp = ease.outExpo(clamp((t - 1.78) / 0.7));
      const ox = 1460;
      const oy = 330;
      const orad = lerp(30, 305, zp);
      ctx.save();
      ctx.globalAlpha *= 0.85;
      ctx.beginPath();
      ctx.arc(ox, oy, orad, 0, TAU);
      ctx.clip();
      halftone(ctx, {
        x0: ox - orad, x1: ox + orad, y0: oy - orad, y1: oy + orad,
        step: 13, maxR: 5.6, color: '236,231,219', alpha: 0.62, angle: 0.42,
        field: (x, y) => clamp(1.15 - Math.hypot(x - ox, y - oy) / orad * 1.2),
      });
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= 0.4;
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(ox, oy, orad * (1.1 + i * 0.12), 0, TAU);
        ctx.stroke();
      }
      ctx.restore();

      // solid red circle crop on the left edge
      const cp = ease.outQuart(clamp((t - 1.9) / 0.6));
      ctx.save();
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(136, 612, 158 * cp, 0, TAU);
      ctx.fill();
      ctx.restore();

      // headline
      const hp = P.ease(t - 1.95, 0.55);
      if (hp > 0) {
        const size = 168;
        const tr = lerp(90, -2, hp);
        ctx.save();
        ctx.translate(0, (1 - hp) * 30);
        drawString(ctx, 'STRUCTURE', 262, 380, {
          size, tracking: tr, align: 'left', color: PAPER,
        });
        ctx.fillStyle = PAPER;
        ctx.fillRect(262, 470, 640 * ease.outExpo(clamp((t - 2.1) / 0.5)), 1.4);
        microLabel(ctx, 'LESS BUT BETTER — 1968', 262, 512, {
          size: 12, color: 'rgba(236,231,219,0.6)', tracking: 5, tick: false,
        });
        ctx.restore();
      }

      // ticker band
      const tp = ease.outExpo(clamp((t - 2.05) / 0.55));
      if (tp > 0) {
        const bh = 64;
        const by = 812;
        ctx.save();
        ctx.globalAlpha *= tp;
        ctx.fillStyle = RED;
        ctx.fillRect(0, by + (1 - tp) * 80, w, bh);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, by + (1 - tp) * 80, w, bh);
        ctx.clip();
        const msg = 'MOTION   ·   RHYTHM   ·   FORM   ·   TENSION   ·   MASS   ·   ';
        ctx.font = `400 22px "${FONT.mono}"`;
        ctx.letterSpacing = '4px';
        ctx.fillStyle = PAPER;
        ctx.textBaseline = 'middle';
        const unit = ctx.measureText(msg).width;
        const scroll = (t * 220) % unit;
        for (let i = -1; i < Math.ceil(w / unit) + 1; i++) {
          ctx.fillText(msg, i * unit - scroll, by + (1 - tp) * 80 + bh / 2 + 1);
        }
        ctx.restore();
        ctx.restore();
      }

      // registration crosses
      ctx.save();
      ctx.globalAlpha *= 0.5;
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 1;
      for (const [x, y] of [[96, 96], [w - 96, 96], [96, h - 96], [w - 96, h - 96]]) {
        ctx.beginPath();
        ctx.moveTo(x - 7, y);
        ctx.lineTo(x + 7, y);
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x, y + 7);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }

    // =====================================================================
    // BEAT C — parallax type bands  (3.5 → 5.2)
    // =====================================================================
    const cin = smoothstep(3.3, 3.62, t);
    if (cin > 0.02) {
      ctx.save();
      ctx.globalAlpha = cin;
      // paper ground for the second print beat
      const pg = ctx.createLinearGradient(0, 0, w, h);
      pg.addColorStop(0, '#f2ecdf');
      pg.addColorStop(0.6, '#e8e1d2');
      pg.addColorStop(1, '#dcd4c2');
      ctx.fillStyle = pg;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(20,20,24,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 96; x < w; x += 96) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 60; y < h; y += 96) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();

      // header strip
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, w, 58);
      ctx.font = `400 13px "${FONT.mono}"`;
      ctx.letterSpacing = '6px';
      ctx.fillStyle = PAPER;
      ctx.textBaseline = 'middle';
      ctx.fillText('FORM  /  RHYTHM  /  TENSION  /  MASS', 56, 30);
      ctx.textAlign = 'right';
      ctx.fillStyle = RED;
      ctx.fillText('PLATE 03', w - 56, 30);
      ctx.textAlign = 'left';

      const letters = ['RHYTHM', 'TENSION', 'MASS'];
      const heights = [225, 205, 250];
      const yBase = [268, 520, 770];
      const speeds = [-160, 230, -120];
      letters.forEach((word, i) => {
        const st = 3.4 + i * 0.085;
        const p = ease.outExpo(clamp((t - st) / 0.5));
        if (p <= 0) return;
        const size = heights[i];
        const wid = stringWidth(ctx, word, size, FONT.display, -6);
        const tileW = wid + 110;
        const offset = (t - 3.4) * speeds[i] + (1 - p) * (i % 2 === 0 ? -720 : 720);
        const bob = Math.sin(t * 1.5 + i * 1.4) * 6;
        ctx.save();
        ctx.globalAlpha = cin * p;
        ctx.translate(0, bob);
        // inverted band for the middle line
        if (i === 1) {
          ctx.fillStyle = RED;
          ctx.fillRect(-40, yBase[i] - size * 0.68, w + 80, size * 0.94);
        }
        const start2 = ((offset % tileW) + tileW) % tileW - tileW;
        for (let x = start2; x < w + tileW; x += tileW) {
          drawString(ctx, word, x, yBase[i], {
            size, tracking: -6, align: 'left', color: i === 1 ? PAPER : INK,
          });
        }
        ctx.restore();
      });

      // halftone band along the bottom, moving
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 946, w, h - 946);
      ctx.clip();
      halftone(ctx, {
        x0: 0, x1: w, y0: 946, y1: h, step: 15, maxR: 5.4,
        color: '18,18,22', alpha: 0.55, angle: 0.45,
        field: (x, y) => clamp(0.1 + 0.9 * Math.abs(Math.sin(x * 0.0035 + t * 1.1))),
      });
      ctx.restore();

      // editorial column
      const ep = clamp((t - 3.9) / 0.5);
      if (ep > 0) {
        ctx.save();
        ctx.globalAlpha = cin * ep;
        const bx = 1170;
        const by = 872;
        ctx.strokeStyle = 'rgba(13,13,15,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, by - 22);
        ctx.lineTo(bx + 470, by - 22);
        ctx.stroke();
        microLabel(ctx, 'FIG. 03 — TYPOGRAPHIC MASS', bx, by - 4, { size: 10, color: 'rgba(13,13,15,0.65)', tracking: 3, tick: false });
        ctx.font = `400 15px "${FONT.sans}"`;
        ctx.letterSpacing = '0px';
        ctx.fillStyle = 'rgba(13,13,15,0.66)';
        ['Type is architecture.', 'Weight carries gravity.'].forEach((ln, i) => ctx.fillText(ln, bx, by + 24 + i * 22));
        ctx.restore();
      }

      // red plumb line sweeping
      ctx.save();
      ctx.globalAlpha = cin * 0.85;
      const sx = ((t - 3.4) * 940) % (w + 400) - 200;
      ctx.fillStyle = 'rgba(229,51,31,0.55)';
      ctx.fillRect(sx, 58, 1.4, h - 58);
      ctx.restore();

      // rotating index disc, top left over the header
      ctx.save();
      ctx.globalAlpha = cin * 0.8;
      ctx.translate(w - 150, 300);
      ctx.rotate(t * 0.5);
      ctx.strokeStyle = 'rgba(13,13,15,0.45)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * TAU;
        const r1 = 60 + (i % 4 === 0 ? 13 : 5);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.restore();

      // corner registration
      ctx.save();
      ctx.globalAlpha = cin * 0.4;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      for (const [x, y] of [[96, 96], [w - 96, 96], [96, h - 96], [w - 96, h - 96]]) {
        ctx.beginPath();
        ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
        ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
        ctx.stroke();
      }
      ctx.restore();

      ctx.restore();
    }

    // =====================================================================
    // OUT — compress to a bar
    // =====================================================================
    if (out > 0) {
      ctx.save();
      ctx.globalAlpha = 1;
      const bh = h * 0.5 * ease.inQuart(clamp(out));
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, w, bh);
      ctx.fillRect(0, h - bh, w, bh);
      // red hairline at the closing edge
      ctx.fillStyle = RED;
      ctx.fillRect(0, bh - 2, w, 2);
      ctx.fillRect(0, h - bh, w, 2);
      ctx.restore();
    }
  },
};
