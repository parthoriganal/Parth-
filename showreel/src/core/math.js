/** Easing + interpolation + math helpers. All pure. */

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (a, b, v) => {
  const t = clamp(inv(a, b, v));
  return t * t * (3 - 2 * t);
};
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inQuart: (t) => t ** 4,
  outQuart: (t) => 1 - (1 - t) ** 4,
  inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  inQuint: (t) => t ** 5,
  outQuint: (t) => 1 - (1 - t) ** 5,
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
  inExpo: (t) => (t === 0 ? 0 : 2 ** (10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
  inCirc: (t) => 1 - Math.sqrt(1 - t * t),
  outCirc: (t) => Math.sqrt(1 - (t - 1) ** 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  outElastic: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  /** Sharp impact curve: rises in a few frames, then settles with a small bounce. */
  snap: (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return 1 - Math.exp(-7 * t) * Math.cos(9 * t);
  },
};

/** Piecewise keyframe interpolation over time. keys: [[t, value], ...] */
export function track(t, keys, easing = ease.inOutCubic) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t >= t0 && t <= t1) return lerp(v0, v1, easing(inv(t0, t1, t)));
  }
  return last[1];
}

/** Impulse envelope: 0 before `start`, spikes to 1, decays over `decay` seconds. */
export function pulse(t, start, decay = 0.35, rise = 0.02) {
  if (t < start || t > start + decay + rise) return 0;
  if (t < start + rise) return smoothstep(start, start + rise, t);
  return Math.exp(-((t - start - rise) / decay) * 4.5);
}

/** Smooth, seamless oscillation around a value. */
export const wob = (t, speed, amp, phase = 0) => Math.sin(t * speed + phase) * amp;
