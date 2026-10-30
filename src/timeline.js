/**
 * timeline.js — the edit.
 *
 * The film is a deterministic function of the frame index. Shots, cameras,
 * lens character and grade are all data. Cut the data, you cut the film.
 */

export const FPS = 24;
export const DURATION = 36; // seconds
export const TOTAL_FRAMES = Math.round(FPS * DURATION); // 864

export const PALETTE = {
	ink: '#06070a',
	bone: '#f4efe6',
	brass: '#c2a15c',
	ember: '#e0492c',
	steel: '#6e7a85'
};

/** Per-kind camera and field defaults. Every shot inherits, then overrides. */
const KIND = {
	void: { dist: 10.5, ang: -0.35, hi: 1.30, fov: 27, shake: 0.08, field: 0.02, mode: 'cloud' },
	rules: { dist: 9.4, ang: -0.28, hi: 0.95, fov: 28, shake: 0.10, field: 0.05, mode: 'cloud' },
	grid: { dist: 8.2, ang: -0.15, hi: 0.72, fov: 30, shake: 0.14, field: 0.10, mode: 'grid' },
	wordmark: { dist: 7.0, ang: 0.10, hi: 0.52, fov: 30, shake: 0.12, field: 0.08, mode: 'cloud' },
	counter: { dist: 7.6, ang: 0.22, hi: 0.62, fov: 30, shake: 0.16, field: 0.12, mode: 'cloud' },
	flash: { dist: 6.0, ang: 0.30, hi: 0.40, fov: 32, shake: 0.28, field: 0.35, mode: 'burst' },
	hud: { dist: 7.2, ang: 0.34, hi: 0.50, fov: 30, shake: 0.18, field: 0.18, mode: 'grid' },
	bars: { dist: 6.2, ang: -0.45, hi: 0.30, fov: 32, shake: 0.24, field: 0.22, mode: 'tunnel' },
	metric: { dist: 6.6, ang: 0.55, hi: 0.45, fov: 30, shake: 0.20, field: 0.25, mode: 'grid' },
	typeSlam: { dist: 5.2, ang: 0.00, hi: 0.30, fov: 33, shake: 0.32, field: 0.45, mode: 'burst' },
	typeSlice: { dist: 5.6, ang: 0.80, hi: 0.35, fov: 33, shake: 0.38, field: 0.50, mode: 'vortex' },
	typeStack: { dist: 6.0, ang: -0.70, hi: 0.30, fov: 32, shake: 0.28, field: 0.40, mode: 'vortex' },
	invert: { dist: 5.4, ang: 1.10, hi: 0.20, fov: 34, shake: 0.42, field: 0.30, mode: 'burst' },
	glitch: { dist: 4.6, ang: -1.00, hi: 0.25, fov: 36, shake: 0.66, field: 0.60, mode: 'burst' },
	field: { dist: 9.0, ang: 0.20, hi: 1.00, fov: 30, shake: 0.24, field: 0.88, mode: 'field' },
	lockup: { dist: 7.4, ang: 0.00, hi: 0.35, fov: 27, shake: 0.07, field: 0.22, mode: 'ring' },
	endcard: { dist: 11.0, ang: 0.00, hi: 0.80, fov: 26, shake: 0.04, field: 0.10, mode: 'ring' }
};

/** Grade + energy per movement. */
const SECTION_GRADE = {
	overture: { exposure: 1.02, aberration: 0.45, grain: 0.55, vignette: 0.55, bloom: 0.55, energy: 0.18 },
	grid: { exposure: 1.00, aberration: 1.00, grain: 0.62, vignette: 0.60, bloom: 0.62, energy: 0.45 },
	slam: { exposure: 1.04, aberration: 1.55, grain: 0.74, vignette: 0.64, bloom: 0.80, energy: 0.82 },
	field: { exposure: 1.06, aberration: 2.10, grain: 0.88, vignette: 0.70, bloom: 1.00, energy: 1.00 },
	lockup: { exposure: 1.00, aberration: 0.85, grain: 0.80, vignette: 0.78, bloom: 0.58, energy: 0.34 }
};

export const SECTIONS = [
	{
		id: 'overture',
		num: 'I',
		name: 'OVERTURE',
		t0: 0,
		dur: 6,
		shots: [
			{ w: 1.00, kind: 'void' },
			{ w: 1.10, kind: 'rules', text: 'AUREUM', label: 'STUDIO OF FORM & MOTION' },
			{ w: 1.20, kind: 'grid', text: 'STUDIO OF FORM & MOTION', label: 'INDEX 001' },
			{ w: 1.20, kind: 'wordmark', text: 'AUREUM', label: 'EST. MMXIX' },
			{ w: 0.90, kind: 'counter' },
			{ w: 0.45, kind: 'flash', accent: 'brass' }
		]
	},
	{
		id: 'grid',
		num: 'II',
		name: 'GRID',
		t0: 6,
		dur: 8,
		shots: [
			{ w: 0.55, kind: 'hud', text: 'FMT 2.39:1', label: 'FRAME 0864' },
			{ w: 0.35, kind: 'bars', text: 'AU—001' },
			{ w: 0.45, kind: 'metric', text: '24', label: 'FRAMES / SECOND' },
			{ w: 0.60, kind: 'grid', text: 'INDEX', label: 'SECTOR 02' },
			{ w: 0.40, kind: 'hud', text: 'AU—001', label: 'SOURCE LOCKED' },
			{ w: 0.25, kind: 'flash', accent: 'ember' },
			{ w: 0.75, kind: 'typeStack', text: ['FORM', 'LIGHT', 'MOTION'], accent: 'bone' },
			{ w: 0.35, kind: 'bars', text: 'SEC—004' },
			{ w: 0.45, kind: 'metric', text: '2.39', label: 'ASPECT RATIO', accent: 'brass' },
			{ w: 0.40, kind: 'glitch', text: 'SIGNAL', accent: 'ember' },
			{ w: 0.55, kind: 'grid', text: 'NOISE', label: 'SECTOR 07' },
			{ w: 0.50, kind: 'hud', text: 'TERMINAL', label: 'READY' }
		]
	},
	{
		id: 'slam',
		num: 'III',
		name: 'SLAM',
		t0: 14,
		dur: 8,
		shots: [
			{ w: 0.52, kind: 'typeSlam', text: 'FORM', align: 'center' },
			{ w: 0.42, kind: 'typeSlice', text: 'LIGHT', align: 'left' },
			{ w: 0.48, kind: 'invert', text: 'MOTION', accent: 'ink' },
			{ w: 0.44, kind: 'typeSlam', text: 'PRECISION', align: 'right', size: 0.72 },
			{ w: 0.34, kind: 'glitch', text: 'SIGNAL', accent: 'ember' },
			{ w: 0.50, kind: 'typeStack', text: ['FORM', '&', 'MOTION'], accent: 'brass' },
			{ w: 0.40, kind: 'invert', text: 'INDEX', accent: 'ink', align: 'left' },
			{ w: 0.44, kind: 'typeSlam', text: 'NOISE', align: 'center' },
			{ w: 0.46, kind: 'typeSlice', text: 'AUREUM', align: 'right', accent: 'brass', size: 0.8 },
			{ w: 0.22, kind: 'flash', accent: 'bone' },
			{ w: 0.46, kind: 'typeSlam', text: 'FORM', align: 'left' },
			{ w: 0.50, kind: 'typeStack', text: ['LIGHT', 'MOTION'], accent: 'bone' },
			{ w: 0.40, kind: 'invert', text: 'PRECISION', accent: 'ink', size: 0.6 },
			{ w: 0.44, kind: 'typeSlice', text: 'SIGNAL', align: 'center', accent: 'ember' },
			{ w: 0.52, kind: 'typeSlam', text: 'AUREUM', align: 'center', accent: 'brass' },
			{ w: 0.24, kind: 'flash', accent: 'ember' }
		]
	},
	{
		id: 'field',
		num: 'IV',
		name: 'FIELD',
		t0: 22,
		dur: 10,
		shots: [
			{ w: 0.90, kind: 'field', text: 'FORM', label: 'FIELD / 01', mode: 'cloud' },
			{ w: 0.80, kind: 'field', text: 'LIGHT', label: 'FIELD / 02', mode: 'tunnel' },
			{ w: 0.50, kind: 'glitch', text: 'SIGNAL', accent: 'ember' },
			{ w: 0.85, kind: 'field', text: 'MOTION', label: 'FIELD / 03', mode: 'burst' },
			{ w: 0.60, kind: 'metric', text: '98.4', label: 'ENERGY', accent: 'brass' },
			{ w: 0.90, kind: 'field', text: 'VORTEX', label: 'FIELD / 04', mode: 'vortex' },
			{ w: 0.26, kind: 'flash', accent: 'bone' },
			{ w: 0.80, kind: 'field', text: 'INDEX', label: 'FIELD / 05', mode: 'grid' },
			{ w: 0.40, kind: 'bars', text: 'SEC—009', accent: 'brass' },
			{ w: 0.85, kind: 'field', text: 'TUNNEL', label: 'FIELD / 06', mode: 'tunnel' },
			{ w: 0.45, kind: 'glitch', text: 'NOISE', accent: 'ember' },
			{ w: 0.80, kind: 'field', text: 'BURST', label: 'FIELD / 07', mode: 'burst' },
			{ w: 0.55, kind: 'hud', text: 'TERMINAL', label: 'COLLAPSE' },
			{ w: 0.85, kind: 'field', text: 'AUREUM', label: 'FIELD / 08', mode: 'collapse' }
		]
	},
	{
		id: 'lockup',
		num: 'V',
		name: 'LOCKUP',
		t0: 32,
		dur: 4,
		shots: [
			{ w: 1.00, kind: 'field', text: '', label: '', mode: 'collapse', quiet: true },
			{ w: 1.05, kind: 'lockup', text: 'AUREUM', label: 'STUDIO OF FORM & MOTION' },
			{ w: 0.95, kind: 'lockup', text: 'AUREUM', label: 'A FILM MADE ENTIRELY OF CODE' },
			{ w: 1.00, kind: 'endcard', text: 'MMXXVI' }
		]
	}
];

/** Builds absolute shot timings. Weights are normalised per movement. */
export function buildShots() {
	const shots = [];
	let id = 0;

	for (const section of SECTIONS) {
		const total = section.shots.reduce((a, s) => a + s.w, 0);
		let acc = 0;

		section.shots.forEach((def, i) => {
			const t0 = section.t0 + (acc / total) * section.dur;
			acc += def.w;
			const t1 = section.t0 + (acc / total) * section.dur;
			const base = KIND[def.kind] || KIND.field;

			shots.push({
				id: id++,
				index: i,
				section,
				kind: def.kind,
				t0,
				t1: Math.min(t1, section.t0 + section.dur),
				text: def.text ?? '',
				label: def.label ?? '',
				accent: def.accent ?? 'bone',
				align: def.align ?? 'center',
				size: def.size ?? 1,
				quiet: def.quiet ?? false,
				mode: def.mode ?? base.mode,
				cam: {
					dist: def.dist ?? base.dist,
					ang: def.ang ?? base.ang,
					hi: def.hi ?? base.hi,
					fov: def.fov ?? base.fov,
					shake: def.shake ?? base.shake
				},
				field: def.field ?? base.field
			});
		});
	}

	// snap the final cut to the exact end of the film
	if (shots.length) shots[shots.length - 1].t1 = DURATION;

	return shots;
}

export const SHOTS = buildShots();
export const SHOT_COUNT = SHOTS.length;

export function shotAt(t) {
	const time = Math.min(Math.max(t, 0), DURATION - 1 / FPS);
	for (let i = 0; i < SHOTS.length; i++) {
		if (time < SHOTS[i].t1 || i === SHOTS.length - 1) return SHOTS[i];
	}
	return SHOTS[SHOTS.length - 1];
}

/**
 * Complete visual state for a given time. Pure. Deterministic.
 */
export function getState(t) {
	const shot = shotAt(t);
	const span = Math.max(1e-4, shot.t1 - shot.t0);
	const local = Math.min(1, Math.max(0, (t - shot.t0) / span));
	const grade = SECTION_GRADE[shot.section.id];
	const frame = Math.round(t * FPS);

	// --- camera ------------------------------------------------------------
	const cam = shot.cam;
	const drift = local * 0.55;
	const ang = cam.ang + drift + Math.sin(t * 0.21) * 0.05;
	const dist = cam.dist * (1 - Math.sin(local * Math.PI) * 0.06);
	const hi = cam.hi + Math.sin(t * 0.37 + 1.3) * 0.06;

	// handheld: three incommensurate frequencies, never repeating
	const s = cam.shake * 0.05;
	const shakeX = (Math.sin(t * 17.3) * 0.6 + Math.sin(t * 23.7 + 2.1) * 0.4) * s;
	const shakeY = (Math.sin(t * 19.1 + 0.7) * 0.6 + Math.sin(t * 29.3 + 4.2) * 0.4) * s;
	const roll = (Math.sin(t * 11.7 + 2.4) * 0.5 + Math.sin(t * 7.1) * 0.5) * cam.shake * 0.012;

	// --- field -------------------------------------------------------------
	let field = shot.field;
	// slams hit hard at the cut and settle
	if (shot.kind === 'typeSlam' || shot.kind === 'flash') {
		field *= 0.35 + 1.35 * Math.exp(-local * 5.5);
	} else if (shot.kind === 'lockup' || shot.kind === 'endcard') {
		field *= 1 - Math.min(1, local * 0.9);
	}
	if (shot.quiet) field *= 0.15;

	// --- flashes -----------------------------------------------------------
	let flash = 0;
	if (shot.kind === 'flash') flash = Math.pow(1 - local, 2.4);
	else flash = Math.max(0, Math.exp(-local * 16) * 0.18);

	// --- post --------------------------------------------------------------
	const post = {
		exposure: grade.exposure,
		aberration: grade.aberration * (1 + (shot.kind === 'glitch' ? 1.9 : 0)),
		grain: grade.grain,
		vignette: grade.vignette,
		bloom: grade.bloom * (shot.kind === 'flash' ? 1.4 : 1),
		scan: shot.kind === 'glitch' ? 0.5 : 0.12,
		energy: grade.energy
	};

	return {
		t,
		frame,
		shot,
		shotIndex: shot.id,
		section: shot.section,
		local,
		span,
		cam: { ang, dist, hi, fov: cam.fov, roll, shake: cam.shake, shakeX, shakeY },
		field: Math.max(0, field),
		mode: shot.mode,
		flash,
		invert: shot.kind === 'invert' ? 1 : 0,
		post,
		beat: t * 2 // 120 BPM
	};
}

/** Longest continuous run of a section, used by the HUD. */
export function sectionAt(t) {
	return shotAt(t).section;
}
