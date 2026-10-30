#!/usr/bin/env node
/**
 * scripts/verify.mjs — GPU-free verification.
 *
 * Runs the whole film through a mock 2D context, frame by frame, to prove that
 * every graphic system survives every frame without a NaN, an exception or a
 * missing system. Also asserts cut continuity and shot coverage.
 *
 * This is the test that keeps CI honest when there is no display.
 */

import fs from 'node:fs';

/* ---------------------------- mock canvas ---------------------------- */

const NUMERIC = new Set([
	'globalAlpha', 'lineWidth', 'miterLimit', 'shadowBlur', 'shadowOffsetX',
	'shadowOffsetY', 'lineDashOffset', 'letterSpacing', 'wordSpacing'
]);

function makeCtx() {
	const state = { calls: 0 };
	const store = {};

	const ctx = new Proxy(store, {
		get(target, key) {
			if (key === 'measureText') {
				return (s) => ({ width: String(s).length * 11.5, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
			}
			if (key === 'canvas') return { width: 1920, height: 1080 };
			if (key === 'createLinearGradient' || key === 'createRadialGradient') {
				return () => ({ addColorStop() {} });
			}
			if (key === 'getImageData') {
				return () => ({ data: new Uint8ClampedArray(4) });
			}
			if (key in target) {
				const v = target[key];
				if (typeof v === 'function') {
					return (...args) => { state.calls++; return v.apply(target, args); };
				}
				return v;
			}
			if (NUMERIC.has(key)) return 1;
			return () => { state.calls++; };
		},
		set(target, key, value) {
			target[key] = value;
			return true;
		}
	});

	return { ctx, state };
}

globalThis.document = {
	createElement() {
		const { ctx, state } = makeCtx();
		return {
			width: 1920,
			height: 1080,
			getContext: () => ctx,
			__state: state
		};
	}
};

/* ------------------------------- checks ------------------------------ */

const failures = [];
const fail = (msg) => failures.push(msg);

const timeline = await import('../src/timeline.js');
const overlayMod = await import('../src/overlay.js');

const { SHOTS, SHOT_COUNT, getState, TOTAL_FRAMES, FPS, DURATION } = timeline;

/* 1. every shot kind has a graphic system */
const src = fs.readFileSync(new URL('../src/overlay.js', import.meta.url), 'utf8');
const systems = [...src.matchAll(/\n\t(\w+): sys\w+/g)].map((m) => m[1]);
const kinds = [...new Set(SHOTS.map((s) => s.kind))];
for (const k of kinds) {
	if (!systems.includes(k)) fail(`no graphic system for shot kind "${k}"`);
}

/* 2. cut continuity */
for (let i = 1; i < SHOTS.length; i++) {
	if (Math.abs(SHOTS[i].t0 - SHOTS[i - 1].t1) > 1e-6) fail(`gap between shot ${i - 1} and ${i}`);
}
if (Math.abs(SHOTS[0].t0) > 1e-9) fail('film does not start at 0');
if (Math.abs(SHOTS[SHOTS.length - 1].t1 - DURATION) > 1e-9) fail('film does not end at DURATION');

/* 3. state sanity across every frame */
let worst = { field: -1, flash: 0 };
const hit = new Set();

for (let f = 0; f < TOTAL_FRAMES; f++) {
	const st = getState(f / FPS);
	hit.add(st.shot.id);

	const numeric = {
		t: st.t, local: st.local, field: st.field, flash: st.flash,
		ang: st.cam.ang, dist: st.cam.dist, hi: st.cam.hi, roll: st.cam.roll,
		fov: st.cam.fov, shake: st.cam.shake,
		aberration: st.post.aberration, grain: st.post.grain,
		vignette: st.post.vignette, bloom: st.post.bloom, exposure: st.post.exposure
	};

	for (const [k, v] of Object.entries(numeric)) {
		if (!Number.isFinite(v)) fail(`frame ${f}: ${k} is not finite (${v})`);
	}

	if (st.local < 0 || st.local > 1) fail(`frame ${f}: local out of range (${st.local})`);
	if (st.field < 0 || st.field > 3) fail(`frame ${f}: field out of range (${st.field})`);
	if (st.flash < 0 || st.flash > 1.001) fail(`frame ${f}: flash out of range (${st.flash})`);

	worst.field = Math.max(worst.field, st.field);
	worst.flash = Math.max(worst.flash, st.flash);
}

if (hit.size !== SHOT_COUNT) fail(`only ${hit.size} of ${SHOT_COUNT} shots are reachable`);

/* 4. draw every frame through the mock context */
const overlay = overlayMod.createOverlay();
let drawn = 0;

for (let f = 0; f < TOTAL_FRAMES; f++) {
	const st = getState(f / FPS);
	st.totalShots = SHOT_COUNT;
	try {
		if (overlay.draw(st)) drawn++;
	} catch (err) {
		fail(`draw threw at frame ${f} (${st.shot.kind}): ${err.message}`);
		break;
	}
}

if (drawn < TOTAL_FRAMES - 2) fail(`only ${drawn} frames redrew the overlay`);

/* 5. determinism — same frame twice must produce the same state */
const a = JSON.stringify(getState(17.333));
const b = JSON.stringify(getState(17.333));
if (a !== b) fail('getState is not deterministic');

/* ------------------------------- report ------------------------------ */

const line = '─'.repeat(56);
console.log(`\n  AUREUM · verification\n  ${line}`);
console.log(`  shots            ${SHOT_COUNT}`);
console.log(`  frames           ${TOTAL_FRAMES} @ ${FPS}fps (${DURATION}s)`);
console.log(`  graphic systems  ${systems.length}`);
console.log(`  overlay redraws  ${drawn}`);
console.log(`  peak field       ${worst.field.toFixed(3)}`);
console.log(`  peak flash       ${worst.flash.toFixed(3)}`);
console.log(`  ${line}`);

if (failures.length) {
	console.log(`  ✗ ${failures.length} failure(s)\n`);
	for (const f of failures.slice(0, 12)) console.log(`    · ${f}`);
	console.log('');
	process.exit(1);
}

console.log('  ✓ all checks passed\n');
