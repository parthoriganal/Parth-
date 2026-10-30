/**
 * util.js — deterministic maths. Nothing in this film may call Math.random().
 * Every pixel is a pure function of the frame index.
 */

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => clamp((v - a) / (b - a || 1));
export const smoothstep = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smootherstep = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };

export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const easeInExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * (clamp(t) - 1)));
export const easeOutCubic = (t) => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };
export const easeInCubic = (t) => { t = clamp(t); return t * t * t; };
export const easeInOutCubic = (t) => {
	t = clamp(t);
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeInOutQuint = (t) => {
	t = clamp(t);
	return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
};
export const easeOutBack = (t, s = 1.9) => {
	t = clamp(t);
	const c = s + 1;
	return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
};
export const easeOutElastic = (t) => {
	t = clamp(t);
	if (t === 0 || t === 1) return t;
	const c = (2 * Math.PI) / 3;
	return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1;
};

/** Deterministic PRNG (mulberry32). */
export function mulberry32(seed) {
	let a = seed | 0;
	return function () {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Stateless hash — safe to call any number of times, in any order. */
export function hash(n) {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
	return x - Math.floor(x);
}

export function hash2(x, y) {
	const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
	return s - Math.floor(s);
}

export const pad = (n, len = 4) => String(Math.max(0, Math.round(n))).padStart(len, '0');

/** 00:00:00:00 timecode. */
export function timecode(frame, fps = 24) {
	const f = Math.max(0, Math.round(frame));
	const s = Math.floor(f / fps);
	const ff = f % fps;
	const mm = Math.floor(s / 60);
	const ss = s % 60;
	const hh = Math.floor(mm / 60);
	return `${pad(hh, 2)}:${pad(mm % 60, 2)}:${pad(ss, 2)}:${pad(ff, 2)}`;
}

/** Value noise, used by the background shader on the CPU side for a few accents. */
export function noise1(x) {
	const i = Math.floor(x);
	const f = x - i;
	const a = hash(i);
	const b = hash(i + 1);
	const u = f * f * (3 - 2 * f);
	return lerp(a, b, u);
}

/** Per-frame luminance-independent flicker for film-gate feel. */
export function gateFlicker(frame) {
	return 1 + (hash(frame * 0.371) - 0.5) * 0.012;
}
