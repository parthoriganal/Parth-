/**
 * main.js — AUREUM Atelier, the interactive presentation.
 *
 * Boots the studio, builds Calibre 001, wires the configuration rail and
 * runs the render loop. The piece is modelled in millimetres and displayed
 * at life size (40 mm case) inside a procedural studio.
 */

import * as THREE from 'three';
import { createRenderer, buildStudio } from './environment.js';
import { MaterialLibrary } from './materials.js';
import { buildWatch } from './watch.js';
import { Orbit } from './orbit.js';

const heroPose = { theta: 0.36, phi: 1.13, radius: 118 };
const movementPose = { theta: Math.PI - 0.58, phi: 0.92, radius: 92 };
const MOODS = ['studio', 'soft', 'dramatic'];
const MOOD_LABELS = { studio: 'Studio', soft: 'Soft', dramatic: 'Dramatic' };
let homePose = { ...heroPose };

const canvas = document.getElementById('watch-canvas');
const loader = document.getElementById('loader');
const toast = document.getElementById('toast');
const clockElement = document.getElementById('clock');

let toastTimer = 0;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function fail(message) {
  const fallback = document.getElementById('fallback');
  const text = fallback?.querySelector('p');
  if (text) text.textContent = message;
  fallback?.removeAttribute('hidden');
  loader?.classList.add('is-hidden');
}

/* ------------------------------------------------------------------ *
 * boot
 * ------------------------------------------------------------------ */

let renderer;
try {
  renderer = createRenderer(canvas);
} catch (error) {
  console.error(error);
  fail('This piece needs WebGL 2. Try a recent Chrome, Edge, Firefox or Safari.');
  throw error;
}

const studio = buildStudio(renderer);
const { scene, camera } = studio;

const materials = new MaterialLibrary({ anisotropy: renderer.capabilities.getMaxAnisotropy() });
const watch = buildWatch(materials);
scene.add(watch.root);

const orbit = new Orbit(camera, canvas, {
  target: { x: 0, y: 0, z: -5 },
  radius: 225,
  theta: 0.95,
  phi: 1.34,
  minRadius: 76,
  maxRadius: 300,
});

const reducedMotion = typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reducedMotion) {
  orbit.autoRotate = false;
  document.getElementById('btn-rotate')?.setAttribute('aria-pressed', 'false');
}

/* ------------------------------------------------------------------ *
 * sizing
 * ------------------------------------------------------------------ */

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;
  const dprCap = matchMedia('(pointer: coarse)').matches ? 1.75 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));

  // Portrait screens need a wider lens, and the dock covers the lower third,
  // so the piece is framed a touch above centre.
  const portrait = aspect < 0.85;
  camera.fov = portrait ? 44 : aspect < 1.25 ? 34 : 30;
  camera.updateProjectionMatrix();
  orbit.setTarget(0, portrait ? -6 : 0, -5);

  homePose = portrait
    ? { theta: 0.38, phi: 1.2, radius: 146 }
    : { ...heroPose };
  orbit.homePose = homePose;

  studio.resize(width, height);
}

resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 180));

/* ------------------------------------------------------------------ *
 * presentation state
 * ------------------------------------------------------------------ */

const state = {
  explode: 0,
  explodeTarget: 0,
  strap: 1,
  strapTarget: 1,
  movement: false,
  mood: 0,
};

watch.setTime(new Date());
watch.setStrapOpacity(1);

// A small handle for the curious: inspect or drive the piece from the console.
window.__aureum = { THREE, watch, materials, studio, scene, camera, renderer, orbit, state };

/* ------------------------------------------------------------------ *
 * UI — colourways
 * ------------------------------------------------------------------ */

function bindSwatches(attribute, labelId, apply, describe) {
  const buttons = [...document.querySelectorAll(`[data-${attribute}]`)];
  const label = document.getElementById(labelId);

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((other) => {
        other.classList.toggle('is-active', other === button);
        other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
      });
      const id = button.dataset[attribute];
      const name = apply(id);
      if (label) label.textContent = name;
      showToast(describe(name));
    });
  });

  const initial = buttons.find((button) => button.classList.contains('is-active')) || buttons[0];
  if (initial) {
    const id = initial.dataset[attribute];
    const name = apply(id);
    if (label) label.textContent = name;
  }
}

bindSwatches('case', 'caseName', (id) => {
  const metal = watch.setCaseMetal(id);
  const spec = document.getElementById('spec-case');
  if (spec) spec.textContent = `${metal.label} · 40 mm`;
  return metal.short;
}, (name) => `${name} case · 18k, hand-polished`);

bindSwatches('dial', 'dialName', (id) => {
  const dial = watch.setDial(id);
  const spec = document.getElementById('spec-dial');
  if (spec) spec.textContent = dial.label;
  return dial.label;
}, (name) => `${name} dial · soleillé guilloché`);

bindSwatches('strap', 'strapName', (id) => {
  const strap = watch.setStrap(id);
  const spec = document.getElementById('spec-strap');
  if (spec) spec.textContent = strap.label;
  return strap.label;
}, (name) => `${name} · alligator, saddle-stitched`);

/* ------------------------------------------------------------------ *
 * UI — actions
 * ------------------------------------------------------------------ */

const btnExplode = document.getElementById('btn-explode');
const btnMovement = document.getElementById('btn-movement');
const btnRotate = document.getElementById('btn-rotate');
const btnMood = document.getElementById('btn-mood');
const btnSave = document.getElementById('btn-save');

btnExplode?.addEventListener('click', () => {
  state.explodeTarget = state.explodeTarget > 0.5 ? 0 : 1;
  btnExplode.classList.toggle('is-active', state.explodeTarget > 0.5);
  btnExplode.setAttribute('aria-pressed', state.explodeTarget > 0.5 ? 'true' : 'false');
  showToast(state.explodeTarget > 0.5 ? 'Exploded view · 34 components' : 'Assembled');
});

btnMovement?.addEventListener('click', () => {
  state.movement = !state.movement;
  btnMovement.classList.toggle('is-active', state.movement);
  btnMovement.setAttribute('aria-pressed', state.movement ? 'true' : 'false');

  if (state.movement) {
    if (state.explodeTarget > 0.5) {
      state.explodeTarget = 0;
      btnExplode?.classList.remove('is-active');
      btnExplode?.setAttribute('aria-pressed', 'false');
    }
    state.strapTarget = 0;
    orbit.setPose(movementPose, reducedMotion ? 0 : 1700);
    showToast('Calibre 001 · 25 jewels, 4 Hz');
  } else {
    state.strapTarget = 1;
    orbit.setPose(homePose, reducedMotion ? 0 : 1500);
    showToast('Dial side');
  }
});

btnRotate?.addEventListener('click', () => {
  orbit.autoRotate = !orbit.autoRotate;
  btnRotate.classList.toggle('is-active', orbit.autoRotate);
  btnRotate.setAttribute('aria-pressed', orbit.autoRotate ? 'true' : 'false');
  showToast(orbit.autoRotate ? 'Turntable running' : 'Turntable paused');
});

btnMood?.addEventListener('click', () => {
  state.mood = (state.mood + 1) % MOODS.length;
  const mood = MOODS[state.mood];
  studio.setMood(mood);
  if (btnMood) btnMood.textContent = `Lighting · ${MOOD_LABELS[mood]}`;
  showToast(`${MOOD_LABELS[mood]} light`);
});

function saveFrame() {
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = `aureum-calibre-001-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
  link.click();
  showToast('Frame saved to your downloads');
}
btnSave?.addEventListener('click', saveFrame);

/* init active states */
btnRotate?.classList.toggle('is-active', orbit.autoRotate);
btnRotate?.setAttribute('aria-pressed', orbit.autoRotate ? 'true' : 'false');
if (btnMood) btnMood.textContent = 'Lighting · Studio';

/* ------------------------------------------------------------------ *
 * keyboard
 * ------------------------------------------------------------------ */

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select')) return;
  const key = event.key.toLowerCase();
  if (key === 'e') btnExplode?.click();
  else if (key === 'm') btnMovement?.click();
  else if (key === 'r') orbit.setPose(homePose, reducedMotion ? 0 : 1100);
  else if (key === 'l') btnMood?.click();
  else if (key === 's' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    saveFrame();
  } else if (event.code === 'Space') {
    event.preventDefault();
    btnRotate?.click();
  }
});

/* ------------------------------------------------------------------ *
 * clock readout
 * ------------------------------------------------------------------ */

function tickClock() {
  if (!clockElement) return;
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  clockElement.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
tickClock();
setInterval(tickClock, 250);

/* ------------------------------------------------------------------ *
 * render loop
 * ------------------------------------------------------------------ */

let previous = performance.now();
let frames = 0;

function frame(now) {
  const delta = Math.min(0.05, Math.max(0, (now - previous) / 1000));
  previous = now;

  // Exploded assembly.
  const explodeEase = 1 - Math.exp(-delta * 6);
  state.explode += (state.explodeTarget - state.explode) * explodeEase;
  if (Math.abs(state.explodeTarget - state.explode) < 0.0006) state.explode = state.explodeTarget;
  watch.setExplode(state.explode);

  // Strap dissolve for the movement study.
  const strapEase = 1 - Math.exp(-delta * 5);
  state.strap += (state.strapTarget - state.strap) * strapEase;
  if (Math.abs(state.strapTarget - state.strap) < 0.002) state.strap = state.strapTarget;
  watch.setStrapOpacity(state.strap);

  orbit.update(delta);
  watch.setTime(new Date());
  watch.update(delta);

  renderer.render(scene, camera);

  if (frames === 0) {
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    loader?.classList.add('is-hidden');
    orbit.setPose(homePose, reducedMotion ? 0 : 2400);
    setTimeout(() => loader?.setAttribute('hidden', ''), 900);
  }
  frames += 1;

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Pause the turntable when the tab is hidden so returning is not a jump.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) previous = performance.now();
});
