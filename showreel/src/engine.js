/**
 * The film engine: renders any moment of the timeline into a 1920x1080 frame.
 * Scene draws are pure functions of time so the film is scrubbable and every
 * frame is reproducible.
 *
 * Pipeline per frame:
 *   scenes -> transition composite -> bloom -> chromatic aberration / motion blur
 *   -> letterbox -> vignette -> grain -> overlay HUD
 */
import { surface } from './core/platform.js';
import { scratch, clearScratch } from './core/pool.js';
import { clamp, ease, smoothstep } from './core/math.js';
import { hash2 } from './core/noise.js';
import { vignette, grain, drawGlow } from './core/draw.js';

export const W = 1920;
export const H = 1080;

export class Engine {
  constructor(film) {
    this.film = film;
    this.w = W;
    this.h = H;
    this.fps = film.fps ?? 60;
    this.main = surface(W, H);
    this.mainUpscaled = false;
    this.frameIndex = 0;
  }

  /** Render the film at global time `t` (seconds) and return the main canvas. */
  render(t) {
    const { scenes, transitions = [], impacts = [], postTrack, duration } = this.film;
    const main = this.main;
    const ctx = main.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const active = scenes.filter((s) => t >= s.start - 1e-6 && t < s.end + 1e-6);
    const shake = this.shakeOffset(t, impacts);
    const trans = transitions.find((tr) => Math.abs(t - tr.at) < tr.dur / 2);

    if (active.length >= 2 && trans) {
      const p = clamp((t - (trans.at - trans.dur / 2)) / trans.dur);
      const eased = (trans.ease ?? ease.inOutCubic)(p);
      const [a, b] = this.orderScenes(active, trans);
      this.compositeTransition(ctx, a, b, t, eased, trans, shake);
    } else if (active.length >= 1) {
      this.drawScene(ctx, active[active.length - 1], t, shake);
    } else {
      // Safety: hold the nearest scene rather than show a black gap.
      const near = scenes.reduce((a, b) =>
        Math.abs(t - (a.start + a.end) / 2) < Math.abs(t - (b.start + b.end) / 2) ? a : b,
      );
      this.drawScene(ctx, near, t, shake);
    }

    this.post(ctx, t);

    const post = postTrack ? postTrack(t) : {};
    if (post.flash > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${clamp(post.flash, 0, 1)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    return main;
  }

  orderScenes(active, trans) {
    const a = active.find((s) => s === trans.from) ?? active[0];
    const b = active.find((s) => s !== a) ?? active[1];
    return [a, b];
  }

  shakeOffset(t, impacts) {
    let amp = 0;
    let drift = 0;
    for (const im of impacts) {
      if (t < im.t) continue;
      const d = t - im.t;
      const decay = im.decay ?? 0.5;
      if (d > decay * 4) continue;
      amp += (im.amp ?? 10) * Math.exp(-d / decay);
      drift += (im.spin ?? 0) * Math.exp(-d / (decay * 1.4));
    }
    amp = Math.min(amp, 70);
    if (amp < 0.05) return { x: 0, y: 0, rot: 0, zoom: 1 };
    const n1 = Math.sin(t * 61.7) * Math.cos(t * 38.1);
    const n2 = Math.sin(t * 53.3 + 1.7) * Math.cos(t * 44.9);
    return { x: n1 * amp, y: n2 * amp * 0.72, rot: drift * 0.0008, zoom: 1 + amp * 0.0009 };
  }

  drawScene(ctx, scene, t, shake) {
    const lt = t - scene.start;
    ctx.save();
    // slight overscan + shake keeps edges covered
    if (shake.zoom !== 1 || shake.x || shake.y) {
      ctx.translate(W / 2 + shake.x, H / 2 + shake.y);
      ctx.rotate(shake.rot);
      ctx.scale(shake.zoom, shake.zoom);
      ctx.translate(-W / 2, -H / 2);
    }
    const F = {
      ctx,
      w: W,
      h: H,
      t,
      lt,
      frame: Math.round(t * this.fps),
      fps: this.fps,
      scene,
      W,
      H,
    };
    scene.draw(F, lt);
    ctx.restore();
  }

  compositeTransition(ctx, a, b, t, p, trans, shake) {
    const A = scratch('trA', W, H);
    const B = scratch('trB', W, H);
    clearScratch(A);
    clearScratch(B);
    A.ctx.save();
    A.ctx.scale(W / 1920, H / 1080);
    a.draw({ ctx: A.ctx, w: 1920, h: 1080, t, lt: t - a.start, frame: Math.round(t * this.fps), fps: this.fps, scene: a, W: 1920, H: 1080 }, t - a.start);
    A.ctx.restore();
    B.ctx.save();
    B.ctx.scale(W / 1920, H / 1080);
    b.draw({ ctx: B.ctx, w: 1920, h: 1080, t, lt: t - b.start, frame: Math.round(t * this.fps), fps: this.fps, scene: b, W: 1920, H: 1080 }, t - b.start);
    B.ctx.restore();

    ctx.save();
    if (shake.x || shake.y) {
      ctx.translate(W / 2 + shake.x, H / 2 + shake.y);
      ctx.scale(shake.zoom, shake.zoom);
      ctx.translate(-W / 2, -H / 2);
    }
    (TRANSITIONS[trans.kind] ?? TRANSITIONS.crossfade)(ctx, A, B, p, t, trans);
    ctx.restore();
  }

  post(ctx, t) {
    const post = this.film.postTrack ? this.film.postTrack(t) : {};
    const bloom = post.bloom ?? 0.5;
    const ca = post.ca ?? 0;
    const blurAmt = post.speedBlur ?? 0;
    const bars = post.bars ?? 0;

    if (blurAmt > 0.01) {
      const S = scratch('speedA', W, H);
      clearScratch(S);
      S.ctx.drawImage(this.main.canvas, 0, 0);
      const steps = Math.min(14, Math.round(6 + blurAmt * 10));
      ctx.save();
      ctx.globalAlpha = Math.min(0.92, 0.55 + blurAmt * 0.35);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1 / steps + 0.05;
      for (let i = 0; i < steps; i++) {
        const s = 1 + (i / steps) * (0.035 + blurAmt * 0.22);
        ctx.drawImage(S.canvas, (W - W * s) / 2, (H - H * s) / 2, W * s, H * s);
      }
      ctx.restore();
    }

    if (bloom > 0.01) {
      const b1 = scratch('bloom1', 480, 270);
      const b2 = scratch('bloom2', 240, 135);
      clearScratch(b1);
      b1.ctx.filter = 'blur(3px) saturate(1.35) brightness(1.12)';
      b1.ctx.drawImage(this.main.canvas, 0, 0, 480, 270);
      b1.ctx.filter = 'none';
      clearScratch(b2);
      b2.ctx.filter = 'blur(5px) saturate(1.2)';
      b2.ctx.drawImage(this.main.canvas, 0, 0, 240, 135);
      b2.ctx.filter = 'none';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.34 * bloom;
      ctx.drawImage(b1.canvas, 0, 0, W, H);
      ctx.globalAlpha = 0.4 * bloom;
      ctx.drawImage(b2.canvas, 0, 0, W, H);
      ctx.restore();
    }

    if (ca > 0.05) {
      this.chromatic(ctx, ca);
    }

    if (bars > 0.001) {
      const bh = bars;
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, bh);
      ctx.fillRect(0, H - bh, W, bh);
      ctx.restore();
    }

    vignette(ctx, W, H, post.vignette ?? 0.55);
    const g = post.grain ?? 0.05;
    if (g > 0.001) grain(ctx, W, H, t, g);
    if (this.film.overlay) this.film.overlay(ctx, t);
  }

  chromatic(ctx, strength) {
    const S = scratch('caSrc', W, H);
    clearScratch(S);
    S.ctx.drawImage(this.main.canvas, 0, 0);
    const tint = scratch('caTint', W, H);
    const off = 2 + strength * 16;
    const chans = [
      ['#ff2d55', -off, 0, 0.42],
      ['#22ffd5', off, 0, 0.42],
      ['#2d6cff', 0, off * 0.6, 0.3],
    ];
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const [color, dx, dy, a] of chans) {
      clearScratch(tint);
      tint.ctx.drawImage(S.canvas, 0, 0);
      tint.ctx.globalCompositeOperation = 'multiply';
      tint.ctx.fillStyle = color;
      tint.ctx.fillRect(0, 0, W, H);
      tint.ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a * clamp(strength, 0, 1.4);
      ctx.drawImage(tint.canvas, dx, dy);
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* Transition library. Each gets (ctx, A, B, p, t) and composites A->B  */
/* ------------------------------------------------------------------ */
export const TRANSITIONS = {
  crossfade(ctx, A, B, p) {
    ctx.globalAlpha = 1;
    ctx.drawImage(A.canvas, 0, 0);
    ctx.globalAlpha = p;
    ctx.drawImage(B.canvas, 0, 0);
    ctx.globalAlpha = 1;
  },

  /** Vertical slices flip from A to B in a staggered diagonal wave. */
  sliceWipe(ctx, A, B, p) {
    const cols = 14;
    ctx.drawImage(A.canvas, 0, 0);
    for (let i = 0; i < cols; i++) {
      const x = (i / cols) * W;
      const local = clamp((p - (i / cols) * 0.35) / 0.65);
      if (local <= 0) continue;
      const arrive = smoothstep(0, 0.22, local);
      const w = W / cols + 1;
      const slide = (1 - ease.outQuart(local)) * 90;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, 0, w, H);
      ctx.clip();
      ctx.globalAlpha = arrive;
      ctx.drawImage(B.canvas, slide, 0);
      ctx.restore();
      // scanning light edge
      if (local < 0.99) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gx = ctx.createLinearGradient(x - w, 0, x + w, 0);
        gx.addColorStop(0, 'rgba(120,220,255,0)');
        gx.addColorStop(0.5, `rgba(180,240,255,${0.6 * (1 - arrive)})`);
        gx.addColorStop(1, 'rgba(120,220,255,0)');
        ctx.fillStyle = gx;
        ctx.fillRect(x - w, 0, w * 2, H);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  },

  /** A zooms through the lens, B arrives from depth. */
  zoomThrough(ctx, A, B, p) {
    const e = ease.inOutExpo(p);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const sa = 1 + e * 0.55;
    ctx.globalAlpha = 1 - e * 0.25;
    ctx.drawImage(A.canvas, (W - W * sa) / 2, (H - H * sa) / 2, W * sa, H * sa);
    const sb = 0.72 + ease.outCubic(p) * 0.28;
    ctx.globalAlpha = clamp((p - 0.12) / 0.78);
    ctx.drawImage(B.canvas, (W - W * sb) / 2, (H - H * sb) / 2, W * sb, H * sb);
    ctx.restore();
  },

  /** Angular sweep like a lighthouse blade. */
  radialWipe(ctx, A, B, p, t) {
    ctx.drawImage(A.canvas, 0, 0);
    const a0 = -Math.PI / 2;
    const a1 = a0 + TAU_ * ease.inOutCubic(p);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(W / 2, H / 2);
    ctx.arc(W / 2, H / 2, W, a0, a1);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(B.canvas, 0, 0);
    ctx.restore();
    // blade
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(W / 2, H / 2);
    ctx.rotate(a1);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.25, 'rgba(140,240,255,0.25)');
    g.addColorStop(1, 'rgba(140,240,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, W, -0.02, 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  /** Digital block displacement. */
  glitchCut(ctx, A, B, p, t) {
    const rows = 22;
    ctx.drawImage(p < 0.5 ? A.canvas : B.canvas, 0, 0);
    const blend = smoothstep(0.25, 0.75, p);
    for (let i = 0; i < rows; i++) {
      const y = (i / rows) * H;
      const h = H / rows + 1;
      const r = hash2(i, Math.floor(t * 60));
      const useB = r < blend;
      const src = useB ? B : A;
      const shift = (r - 0.5) * 220 * Math.sin(p * Math.PI) * (0.4 + hash2(i, 7) * 0.6);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, W, h);
      ctx.clip();
      ctx.drawImage(src.canvas, shift, 0);
      ctx.restore();
    }
    if (p > 0.35 && p < 0.85) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.sin((p - 0.35) / 0.5 * Math.PI) * 0.5;
      ctx.fillStyle = '#7cf9ff';
      for (let i = 0; i < N_GLITCH; i++) {
        const y = hash2(i, 3) * H;
        ctx.fillRect(0, y, W, 1 + hash2(i, 9) * 9);
      }
      ctx.restore();
    }
  },

  /** Light-speed streak wipe along a diagonal. */
  lightRush(ctx, A, B, p, t) {
    ctx.drawImage(B.canvas, 0, 0);
    const band = ease.inOutQuart(p);
    const x = -W * 0.5 + band * W * 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, Math.max(0, x), H);
    ctx.clip();
    ctx.drawImage(A.canvas, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, H / 2);
    ctx.rotate(-0.22);
    const g = ctx.createLinearGradient(-W * 0.5, 0, W * 0.06, 0);
    g.addColorStop(0, 'rgba(90,200,255,0)');
    g.addColorStop(0.85, 'rgba(180,240,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(-W * 0.5, -H, W * 0.56, H * 2);
    ctx.restore();
  },

  /** Iris from a bright core. */
  iris(ctx, A, B, p, t) {
    ctx.drawImage(A.canvas, 0, 0);
    const r = ease.inOutQuart(p) * Math.hypot(W, H) * 0.62;
    ctx.save();
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.5, Math.max(0, r), 0, TAU_);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(B.canvas, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, W * 0.5, H * 0.5, r * 0.55 + 40, '190,250,255', 0.5 * (1 - p) + 0.1);
    ctx.restore();
  },
};

const TAU_ = Math.PI * 2;
const N_GLITCH = 26;
