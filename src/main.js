/**
 * main.js — projection booth.
 *
 * Transport, renderer, the post chain and the capture API. In `?render=1`
 * mode the interface disappears and the film becomes a pure function you
 * can step frame by frame — which is what GitHub Actions uses to encode MP4.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import { FPS, DURATION, TOTAL_FRAMES, SHOT_COUNT, getState } from './timeline.js';
import { createWorld } from './scene3d.js';
import { createOverlay } from './overlay.js';
import { createAudio } from './audio.js';
import { filmShader } from './shaders.js';
import { exportFilm, canExport } from './export.js';
import { timecode, clamp } from './util.js';

function showFatal(message) {
	const card = document.getElementById('fatal');
	const body = card.querySelector('.fatal-body');
	if (body && message) body.textContent = message;
	card.hidden = false;
	const loader = document.getElementById('loader');
	if (loader) loader.classList.add('done');
}

window.addEventListener('error', (e) => showFatal(e.message || 'A runtime error stopped the projector.'));
window.addEventListener('unhandledrejection', (e) => showFatal(String(e.reason || 'A promise rejected.')));

const params = new URLSearchParams(location.search);
const RENDER_MODE = params.get('render') === '1';

/* ------------------------------------------------------------------ */
/* renderer                                                            */
/* ------------------------------------------------------------------ */

const canvas = document.getElementById('film');
let renderer;

try {
	renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: false,
		alpha: false,
		powerPreference: 'high-performance',
		preserveDrawingBuffer: true,
		stencil: false,
		depth: true
	});
} catch (err) {
	document.getElementById('fatal').hidden = false;
	document.getElementById('loader').classList.add('done');
	throw err;
}

if (!renderer.capabilities.isWebGL2) {
	document.getElementById('fatal').hidden = false;
}

renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

let quality = RENDER_MODE ? 1 : Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(quality);

/* ------------------------------------------------------------------ */
/* world                                                               */
/* ------------------------------------------------------------------ */

const world = createWorld(renderer);
const overlay = createOverlay();

const overlayTexture = new THREE.CanvasTexture(overlay.canvas);
overlayTexture.minFilter = THREE.LinearFilter;
overlayTexture.magFilter = THREE.LinearFilter;
overlayTexture.generateMipmaps = false;
overlayTexture.wrapS = THREE.ClampToEdgeWrapping;
overlayTexture.wrapT = THREE.ClampToEdgeWrapping;

/* ------------------------------------------------------------------ */
/* post chain                                                          */
/* ------------------------------------------------------------------ */

const composer = new EffectComposer(renderer);
composer.setPixelRatio(quality);

const renderPass = new RenderPass(world.scene, world.camera);

const bloomPass = new UnrealBloomPass(
	new THREE.Vector2(1920, 1080),
	0.55, // strength
	0.62, // radius
	0.86 // threshold
);

const outputPass = new OutputPass();

const filmPass = new ShaderPass(filmShader);
filmPass.uniforms.uOverlay.value = overlayTexture;

composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(outputPass);
composer.addPass(filmPass);

/* ------------------------------------------------------------------ */
/* sizing                                                              */
/* ------------------------------------------------------------------ */

let viewW = 1920;
let viewH = 1080;

function resize() {
	const rect = canvas.getBoundingClientRect();
	const w = Math.max(2, Math.round(rect.width));
	const h = Math.max(2, Math.round(rect.height));

	viewW = w;
	viewH = h;

	renderer.setPixelRatio(quality);
	renderer.setSize(w, h, false);
	composer.setPixelRatio(quality);
	composer.setSize(w, h);
	world.setSize(w, h);

	if (!filmPass.uniforms.uRes.value.isVector2) {
		filmPass.uniforms.uRes.value = new THREE.Vector2(w * quality, h * quality);
	} else {
		filmPass.uniforms.uRes.value.set(w * quality, h * quality);
	}
}

window.addEventListener('resize', resize);

/* ------------------------------------------------------------------ */
/* the frame                                                           */
/* ------------------------------------------------------------------ */

let currentState = null;

function renderAt(time) {
	const st = getState(time);
	st.totalShots = SHOT_COUNT;
	currentState = st;

	world.update(st);

	if (overlay.draw(st)) overlayTexture.needsUpdate = true;

	const fadeIn = clamp(time / (8 / FPS));
	const fadeOut = clamp((DURATION - time) / (20 / FPS));
	const fade = Math.min(fadeIn, fadeOut);

	filmPass.uniforms.uTime.value = time;
	filmPass.uniforms.uAberr.value = st.post.aberration;
	filmPass.uniforms.uGrain.value = st.post.grain;
	filmPass.uniforms.uVignette.value = st.post.vignette;
	filmPass.uniforms.uFlash.value = st.flash;
	filmPass.uniforms.uGlitch.value = st.shot.kind === 'glitch' ? 0.55 + st.local * 0.45 : 0;
	filmPass.uniforms.uScan.value = st.post.scan;
	filmPass.uniforms.uFade.value = fade;
	filmPass.uniforms.uBar.value = 0.1232;
	filmPass.uniforms.uLetterbox.value = 1;

	bloomPass.strength = 0.42 + st.post.bloom * 0.42;

	composer.render();
}

/* ------------------------------------------------------------------ */
/* transport                                                           */
/* ------------------------------------------------------------------ */

const transport = {
	playing: !RENDER_MODE,
	time: 0
};

let last = performance.now();

function tick(now) {
	requestAnimationFrame(tick);

	const dt = Math.min(0.12, (now - last) / 1000);
	last = now;

	if (transport.playing) {
		transport.time += dt;
		if (transport.time >= DURATION) {
			transport.time = 0;
			audio.reset(0);
		}
	}

	if (!exporting) {
		renderAt(transport.time);
		audio.update(transport.time, transport.playing, currentState);
		updateHud();
	}

	if (!RENDER_MODE) adaptQuality(dt);
}

/* ------------------------------------------------------------------ */
/* hud                                                                 */
/* ------------------------------------------------------------------ */

const el = {
	play: document.getElementById('btn-play'),
	playIcon: document.getElementById('btn-play-icon'),
	scrub: document.getElementById('scrub'),
	tc: document.getElementById('ui-tc'),
	frames: document.getElementById('ui-frames'),
	section: document.getElementById('ui-section'),
	shot: document.getElementById('ui-shot'),
	sound: document.getElementById('btn-sound'),
	quality: document.getElementById('btn-quality'),
	hide: document.getElementById('btn-hide'),
	ui: document.getElementById('ui'),
	loader: document.getElementById('loader'),
	hint: document.querySelector('.hint'),
	exBtn: document.getElementById('btn-export'),
	exPanel: document.getElementById('export-panel'),
	exTitle: document.getElementById('export-title'),
	exFill: document.getElementById('export-fill'),
	exStatus: document.getElementById('export-status'),
	exPct: document.getElementById('export-pct'),
	exLink: document.getElementById('export-link'),
	exClose: document.getElementById('export-close'),
	exNote: document.getElementById('export-note')
};

el.scrub.max = String(TOTAL_FRAMES - 1);

let hudTick = 0;

function updateHud() {
	if (RENDER_MODE) return;
	if (++hudTick % 2 !== 0) return;

	const st = currentState;
	if (!st) return;

	el.tc.textContent = timecode(st.frame);
	el.frames.textContent = `FRAME ${String(st.frame).padStart(4, '0')} / 0864`;
	el.section.textContent = `${st.section.num} · ${st.section.name}`;
	el.shot.textContent = `${String(st.shotIndex + 1).padStart(3, '0')} / ${String(SHOT_COUNT).padStart(3, '0')}`;

	if (document.activeElement !== el.scrub) {
		el.scrub.value = String(st.frame);
	}
}

function setPlaying(v) {
	transport.playing = v;
	el.playIcon.textContent = v ? '❚❚' : '▶';
	if (v) {
		audio.reset(transport.time);
		if (transport.time >= DURATION) transport.time = 0;
	}
}

function seekFrame(frame) {
	const f = clamp(Math.round(frame), 0, TOTAL_FRAMES - 1);
	transport.time = f / FPS;
	audio.reset(transport.time);
}

/* ------------------------------------------------------------------ */
/* controls                                                            */
/* ------------------------------------------------------------------ */

el.play.addEventListener('click', () => setPlaying(!transport.playing));

el.scrub.addEventListener('input', () => {
	setPlaying(false);
	seekFrame(Number(el.scrub.value));
});

el.sound.addEventListener('click', async () => {
	if (audio.enabled) {
		audio.disable();
		el.sound.textContent = 'SOUND OFF';
		el.sound.classList.remove('on');
	} else {
		await audio.enable();
		el.sound.textContent = 'SOUND ON';
		el.sound.classList.add('on');
	}
});

const QUALITY_STEPS = [1, 1.5, 0.75, 0.5];
let qualityIndex = 0;

el.quality.addEventListener('click', () => {
	qualityIndex = (qualityIndex + 1) % QUALITY_STEPS.length;
	quality = clamp(Math.min(window.devicePixelRatio || 1, 2) * QUALITY_STEPS[qualityIndex], 0.5, 3);
	el.quality.textContent = `${QUALITY_STEPS[qualityIndex]}×`;
	resize();
});

let uiHidden = false;

function toggleUi(force) {
	uiHidden = force !== undefined ? force : !uiHidden;
	el.ui.classList.toggle('hidden', uiHidden);
	document.body.classList.toggle('hide-cursor', uiHidden);
}

el.hide.addEventListener('click', () => toggleUi(true));

let idleTimer = 0;

function wake() {
	if (uiHidden) {
		toggleUi(false);
		uiHidden = false;
	}
	clearTimeout(idleTimer);
	el.hint.style.opacity = '1';
	idleTimer = setTimeout(() => {
		el.hint.style.opacity = '0';
	}, 4000);
}

window.addEventListener('mousemove', () => {
	if (!RENDER_MODE) {
		if (uiHidden) toggleUi(false);
		wake();
	}
});

window.addEventListener('keydown', (e) => {
	if (e.code === 'Space') {
		e.preventDefault();
		setPlaying(!transport.playing);
	} else if (e.code === 'ArrowRight') {
		seekFrame(currentState ? currentState.frame + 1 : 0);
	} else if (e.code === 'ArrowLeft') {
		seekFrame(currentState ? currentState.frame - 1 : 0);
	} else if (e.code === 'KeyR') {
		transport.time = 0;
		audio.reset(0);
		setPlaying(true);
	} else if (e.code === 'KeyH') {
		toggleUi();
	} else if (e.code === 'KeyS') {
		el.sound.click();
	}
});

/* ------------------------------------------------------------------ */
/* export — encode the film to MP4 in this browser                     */
/* ------------------------------------------------------------------ */

export let exporting = false;

function setExportProgress({ frame, frames }) {
	const pct = Math.min(100, Math.round((frame / frames) * 100));
	el.exFill.style.width = `${pct}%`;
	el.exStatus.textContent = `frame ${String(frame).padStart(4, '0')} / ${frames}`;
	el.exPct.textContent = `${pct}%`;
}

async function runExport() {
	if (exporting) return;

	el.exPanel.hidden = false;
	el.exLink.hidden = true;

	if (!canExport()) {
		el.exTitle.textContent = 'EXPORT UNAVAILABLE';
		el.exStatus.textContent = 'WebCodecs missing';
		el.exNote.textContent =
			'This browser cannot encode H.264 locally. Open the page in Chrome or Edge — or run the “Render MP4” workflow on GitHub, which produces the same file on a runner.';
		return;
	}

	exporting = true;
	const wasPlaying = transport.playing;
	setPlaying(false);

	el.exTitle.textContent = 'RENDERING MP4';
	el.exNote.textContent = 'Every frame is painted and encoded here. Leave this tab in front.';
	setExportProgress({ frame: 0, frames: TOTAL_FRAMES });

	// a clean 1920×1080 master, independent of the window size
	const W = 1920;
	const H = 1080;
	const prevQuality = quality;

	quality = 1;
	renderer.setPixelRatio(1);
	renderer.setSize(W, H, false);
	composer.setPixelRatio(1);
	composer.setSize(W, H);
	world.setSize(W, H);
	if (filmPass.uniforms.uRes.value.isVector2) filmPass.uniforms.uRes.value.set(W, H);

	try {
		const result = await exportFilm({
			renderFrame: (i) => renderAt(i / FPS),
			frames: TOTAL_FRAMES,
			fps: FPS,
			canvas,
			width: W,
			height: H,
			onProgress: setExportProgress
		});

		const mb = (result.bytes / 1048576).toFixed(1);
		el.exTitle.textContent = 'MP4 READY';
		el.exStatus.textContent = `${mb} MB · ${result.codec}`;
		el.exPct.textContent = '100%';
		el.exFill.style.width = '100%';
		el.exLink.href = result.url;
		el.exLink.hidden = false;
		el.exNote.textContent = 'Download started. If the preview blocked it, use the button above.';

		const a = document.createElement('a');
		a.href = result.url;
		a.download = 'aureum_1920x1080.mp4';
		a.rel = 'noopener';
		document.body.appendChild(a);
		a.click();
		a.remove();
	} catch (err) {
		el.exTitle.textContent = 'EXPORT FAILED';
		el.exStatus.textContent = String(err && err.message ? err.message : err).slice(0, 90);
		el.exNote.textContent = 'Try Chrome or Edge. The GitHub Actions renderer produces the same file without a browser.';
	} finally {
		quality = prevQuality;
		resize();
		exporting = false;
		if (wasPlaying) setPlaying(true);
	}
}

el.exBtn.addEventListener('click', runExport);
el.exClose.addEventListener('click', () => {
	if (!exporting) el.exPanel.hidden = true;
});

/* ------------------------------------------------------------------ */
/* adaptive quality                                                    */
/* ------------------------------------------------------------------ */

let slowFrames = 0;
let fastFrames = 0;

function adaptQuality(dt) {
	if (dt > 0.028) {
		slowFrames++;
		fastFrames = 0;
	} else {
		fastFrames++;
		slowFrames = 0;
	}

	if (slowFrames > 90 && quality > 0.6) {
		quality = Math.max(0.6, quality * 0.85);
		resize();
		slowFrames = 0;
	} else if (fastFrames > 240 && quality < Math.min(window.devicePixelRatio || 1, 2)) {
		quality = Math.min(Math.min(window.devicePixelRatio || 1, 2), quality * 1.08);
		resize();
		fastFrames = 0;
	}
}

/* ------------------------------------------------------------------ */
/* audio                                                               */
/* ------------------------------------------------------------------ */

const audio = createAudio();

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

if (RENDER_MODE) {
	document.body.classList.add('render-mode');
	transport.playing = false;
	document.getElementById('loader').style.display = 'none';
	resize();
	renderAt(0);

	window.__film = {
		ready: true,
		fps: FPS,
		frames: TOTAL_FRAMES,
		duration: DURATION,
		shots: SHOT_COUNT,
		seek(frame) {
			const f = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frame)));
			renderAt(f / FPS);
			return f;
		},
		renderTime(t) {
			renderAt(Math.max(0, Math.min(DURATION - 1 / FPS, t)));
		}
	};
} else {
	resize();
	renderAt(0);

	requestAnimationFrame((t) => {
		last = t;
		requestAnimationFrame(tick);
	});

	setTimeout(() => el.loader.classList.add('done'), 260);
	setTimeout(() => {
		el.hint.style.opacity = '0';
	}, 6000);

	setPlaying(true);
	window.__film = {
		ready: true,
		fps: FPS,
		frames: TOTAL_FRAMES,
		duration: DURATION,
		shots: SHOT_COUNT,
		seek: (f) => seekFrame(f),
		renderTime: (t) => {
			transport.time = t;
			renderAt(t);
		}
	};
}

// expose for debugging / automation
window.__renderer = renderer;
window.__composer = composer;
