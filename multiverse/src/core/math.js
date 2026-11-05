// AETHERBOUND — deterministic math, easing and timing helpers.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const saturate = (v) => clamp(v, 0, 1);

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export const easeInCubic = (t) => t * t * t;
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
export const easeInOutQuint = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutSine = (t) => Math.sin((t * Math.PI) / 2);
export const easeInSine = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutBack = (t, overshoot = 1.70158) => {
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
};

/** A 0..1 window with smooth edges — used for scene and effect envelopes. */
export function windowed(t, start, end, fadeIn = 0.6, fadeOut = 0.6) {
  if (t <= start || t >= end) return 0;
  const inW = fadeIn > 0 ? smoothstep(start, start + fadeIn, t) : 1;
  const outW = fadeOut > 0 ? 1 - smoothstep(end - fadeOut, end, t) : 1;
  return Math.min(inW, outW);
}

/** A smooth 0..1 bump centred on `center`. */
export function pulse(t, center, width) {
  if (width <= 0) return 0;
  const x = (t - center) / width;
  return Math.exp(-x * x * 2.2);
}

export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Deterministic PRNG (mulberry32). Same seed, same universe. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const r = mulberry32(seed);
  return {
    next: r,
    range: (a, b) => a + (b - a) * r(),
    int: (a, b) => Math.floor(a + (b - a + 1) * r()),
    pick: (arr) => arr[Math.floor(r() * arr.length) % arr.length],
    sign: () => (r() < 0.5 ? -1 : 1),
    chance: (p) => r() < p,
  };
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export const DEG = Math.PI / 180;
