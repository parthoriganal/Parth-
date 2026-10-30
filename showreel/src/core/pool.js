/** Reusable offscreen surfaces — never allocate inside a render loop. */
import { surface } from './platform.js';

const pool = new Map();

export function scratch(key, w, h) {
  const k = `${key}:${w}x${h}`;
  let s = pool.get(k);
  if (!s) {
    s = surface(w, h);
    s.ctx.imageSmoothingEnabled = true;
    s.ctx.imageSmoothingQuality = 'high';
    pool.set(k, s);
  }
  return s;
}

export function clearScratch(s) {
  s.ctx.setTransform(1, 0, 0, 1, 0, 0);
  s.ctx.globalAlpha = 1;
  s.ctx.globalCompositeOperation = 'source-over';
  s.ctx.filter = 'none';
  s.ctx.clearRect(0, 0, s.w, s.h);
}

/** Draw into a scratch surface in the 1920x1080 design space, return the surface. */
export function drawToScratch(key, w, h, fn) {
  const s = scratch(key, w, h);
  clearScratch(s);
  const k = w / 1920;
  s.ctx.save();
  s.ctx.scale(k, k);
  fn(s.ctx, s);
  s.ctx.restore();
  return s;
}
