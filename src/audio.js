/**
 * audio.js — the score, synthesized in the browser.
 *
 * No audio files. Kick, hat, tick, clap, sub and riser are all built from
 * oscillators and noise buffers, sequenced against the same 120 BPM grid
 * the edit is cut to.
 */

const BPM = 120;
const SPB = 60 / BPM; // 0.5s per beat

export function createAudio() {
	let ctx = null;
	let master = null;
	let comp = null;
	let noise = null;
	let droneNodes = null;
	let enabled = false;
	let cursor = 0; // next eighth-note index to schedule
	let lastFilmTime = 0;

	function makeNoise() {
		const len = Math.floor(ctx.sampleRate * 1.0);
		const buf = ctx.createBuffer(1, len, ctx.sampleRate);
		const d = buf.getChannelData(0);
		// deterministic noise
		let s = 1234567;
		for (let i = 0; i < len; i++) {
			s = (s * 1664525 + 1013904223) >>> 0;
			d[i] = (s / 4294967296) * 2 - 1;
		}
		return buf;
	}

	function init() {
		const AC = window.AudioContext || window.webkitAudioContext;
		ctx = new AC();

		comp = ctx.createDynamicsCompressor();
		comp.threshold.value = -18;
		comp.knee.value = 22;
		comp.ratio.value = 6;
		comp.attack.value = 0.004;
		comp.release.value = 0.22;

		master = ctx.createGain();
		master.gain.value = 0.0;

		master.connect(comp);
		comp.connect(ctx.destination);

		noise = makeNoise();
		buildDrone();
	}

	function buildDrone() {
		const g = ctx.createGain();
		g.gain.value = 0.0;

		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 220;
		lp.Q.value = 0.7;

		const freqs = [55, 82.5, 110];
		const oscs = freqs.map((f, i) => {
			const o = ctx.createOscillator();
			o.type = i === 2 ? 'triangle' : 'sine';
			o.frequency.value = f;
			o.detune.value = i * 4 - 4;
			const og = ctx.createGain();
			og.gain.value = i === 2 ? 0.12 : 0.34;
			o.connect(og);
			og.connect(lp);
			o.start();
			return o;
		});

		lp.connect(g);
		g.connect(master);
		droneNodes = { g, lp, oscs };
	}

	/* ------------------------- voices ------------------------- */

	function env(gain, when, attack, decay, peak = 1) {
		const g = gain.gain;
		g.setValueAtTime(0.0001, when);
		g.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
		g.exponentialRampToValueAtTime(0.0001, when + attack + decay);
	}

	function kick(when, amp = 1) {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = 'sine';
		o.frequency.setValueAtTime(148, when);
		o.frequency.exponentialRampToValueAtTime(42, when + 0.15);
		env(g, when, 0.002, 0.24, 0.9 * amp);
		o.connect(g);
		g.connect(master);
		o.start(when);
		o.stop(when + 0.4);
	}

	function hat(when, amp = 1, open = false) {
		const src = ctx.createBufferSource();
		src.buffer = noise;
		src.playbackRate.value = 1.6;
		const hp = ctx.createBiquadFilter();
		hp.type = 'highpass';
		hp.frequency.value = 7200;
		const g = ctx.createGain();
		env(g, when, 0.001, open ? 0.16 : 0.035, 0.22 * amp);
		src.connect(hp);
		hp.connect(g);
		g.connect(master);
		src.start(when);
		src.stop(when + 0.3);
	}

	function tick(when, amp = 1) {
		const src = ctx.createBufferSource();
		src.buffer = noise;
		src.playbackRate.value = 2.2;
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.value = 3200;
		bp.Q.value = 2.4;
		const g = ctx.createGain();
		env(g, when, 0.001, 0.02, 0.16 * amp);
		src.connect(bp);
		bp.connect(g);
		g.connect(master);
		src.start(when);
		src.stop(when + 0.12);
	}

	function clap(when, amp = 1) {
		const src = ctx.createBufferSource();
		src.buffer = noise;
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.value = 1700;
		bp.Q.value = 1.8;
		const g = ctx.createGain();
		env(g, when, 0.002, 0.11, 0.3 * amp);
		src.connect(bp);
		bp.connect(g);
		g.connect(master);
		src.start(when);
		src.stop(when + 0.2);
	}

	function boom(when) {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = 'sine';
		o.frequency.setValueAtTime(72, when);
		o.frequency.exponentialRampToValueAtTime(28, when + 1.1);
		env(g, when, 0.01, 1.6, 0.85);
		o.connect(g);
		g.connect(master);
		o.start(when);
		o.stop(when + 2.0);

		const src = ctx.createBufferSource();
		src.buffer = noise;
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 320;
		const ng = ctx.createGain();
		env(ng, when, 0.01, 0.7, 0.2);
		src.connect(lp);
		lp.connect(ng);
		ng.connect(master);
		src.start(when);
		src.stop(when + 1.0);
	}

	function riser(when, dur) {
		const src = ctx.createBufferSource();
		src.buffer = noise;
		src.loop = true;
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.Q.value = 3.2;
		bp.frequency.setValueAtTime(400, when);
		bp.frequency.exponentialRampToValueAtTime(9000, when + dur);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, when);
		g.gain.exponentialRampToValueAtTime(0.18, when + dur * 0.9);
		g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.06);
		src.connect(bp);
		bp.connect(g);
		g.connect(master);
		src.start(when);
		src.stop(when + dur + 0.1);
	}

	/* ------------------------- sequencing ------------------------- */

	function sectionOf(t) {
		if (t < 6) return 'overture';
		if (t < 14) return 'grid';
		if (t < 22) return 'slam';
		if (t < 32) return 'field';
		return 'lockup';
	}

	function schedule(eighth, when) {
		const tf = eighth * (SPB / 2);
		const sec = sectionOf(tf);
		const phase = eighth % 8;

		switch (sec) {
			case 'overture':
				if (phase === 0) tick(when, 0.7);
				if (phase === 4 && tf > 3) tick(when, 0.4);
				break;

			case 'grid':
				if (phase % 2 === 0) tick(when, 0.8);
				if (phase === 0 || phase === 4) kick(when, 0.45);
				if (tf > 10 && phase % 2 === 1) hat(when, 0.35);
				break;

			case 'slam':
				if (phase === 0 || phase === 3 || phase === 4) kick(when, 0.7);
				if (phase % 2 === 0) hat(when, 0.55, phase === 6);
				else hat(when, 0.28);
				if (phase === 4) clap(when, 0.8);
				break;

			case 'field':
				if (phase % 2 === 0) kick(when, 0.62);
				if (phase % 4 === 0) clap(when, 0.6);
				hat(when, phase % 2 === 0 ? 0.45 : 0.24, phase === 7);
				break;

			case 'lockup':
				if (tf < 33.2 && phase === 0) tick(when, 0.5);
				break;
		}
	}

	/* ------------------------- public ------------------------- */

	function update(filmTime, playing, state) {
		if (!enabled || !ctx || !playing) {
			lastFilmTime = filmTime;
			return;
		}

		// if the transport jumped, resync without replaying the past
		if (filmTime < lastFilmTime - 0.05 || filmTime > lastFilmTime + 0.5) {
			cursor = Math.ceil(filmTime / (SPB / 2));
		}
		lastFilmTime = filmTime;

		const eighth = SPB / 2;
		const target = filmTime + 0.18; // lookahead

		while (cursor * eighth < target) {
			const tf = cursor * eighth;
			if (tf >= 0 && tf < 36) {
				const when = ctx.currentTime + Math.max(0, tf - filmTime);
				schedule(cursor, when);
			}
			cursor++;
		}

		// drone follows the movement
		if (droneNodes) {
			const sec = sectionOf(filmTime);
			const targetGain = { overture: 0.5, grid: 0.32, slam: 0.22, field: 0.4, lockup: 0.55 }[sec];
			const cutoff = { overture: 180, grid: 240, slam: 300, field: 420, lockup: 160 }[sec];
			const now = ctx.currentTime;
			droneNodes.g.gain.setTargetAtTime(targetGain * (state ? 0.4 + state.post.energy * 0.7 : 1), now, 0.4);
			droneNodes.lp.frequency.setTargetAtTime(cutoff, now, 0.5);
		}
	}

	function cue(kind, filmTime) {
		if (!enabled || !ctx) return;
		const when = ctx.currentTime + 0.02;
		if (kind === 'boom') boom(when);
		if (kind === 'riser') riser(when, 2.0);
		if (kind === 'kick') kick(when, 0.8);
	}

	async function enable() {
		if (!ctx) init();
		enabled = true;
		if (ctx.state === 'suspended') await ctx.resume();
		master.gain.cancelScheduledValues(ctx.currentTime);
		master.gain.setTargetAtTime(0.85, ctx.currentTime, 0.4);
		cursor = Math.ceil(lastFilmTime / (SPB / 2));
	}

	function disable() {
		enabled = false;
		if (master && ctx) {
			master.gain.setTargetAtTime(0.0, ctx.currentTime, 0.15);
		}
	}

	function reset(filmTime = 0) {
		lastFilmTime = filmTime;
		cursor = Math.ceil(filmTime / (SPB / 2));
	}

	return { enable, disable, update, reset, cue, get enabled() { return enabled; } };
}
