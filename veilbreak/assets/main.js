/**
 * VEILBREAK — the projectionist.
 *
 * Boots WebGL, builds the set, drives story time, and wires the small amount
 * of chrome the film needs: play/pause, chapter seek, scrub, fullscreen,
 * an idle-hiding UI and an adaptive resolution guard for weaker phones.
 *
 * URL parameters (all optional):
 *   ?t=42         start at a given second
 *   ?act=3        start at the beginning of an act (1…5)
 *   ?embed=1      chrome-free, autoplaying, looping — for Google Sites iframes
 *   ?ui=0         keep the captions, drop the controls
 *   ?quality=low  force the mobile pipeline
 *   ?loop=0       stop on the final card
 *   ?speed=0.75   play slower (0.25 – 3)
 */

import * as THREE from './vendor/three.module.min.js';
import { buildWorld } from './core/world.js';
import { FilmPipeline } from './core/post.js';
import { sampleTimeline, effectiveFov, ACTS, DURATION, actStartTime } from './core/timeline.js';

const params = new URLSearchParams(location.search);
const embed = params.get('embed') === '1';
const showUi = !embed && params.get('ui') !== '0';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const root = document.getElementById('vb');
const canvas = document.getElementById('vb-canvas');
const loading = document.getElementById('vb-loading');
const fallback = document.getElementById('vb-fallback');

const el = {
  actBadge: document.getElementById('vb-act'),
  chapter: document.getElementById('vb-chapter'),
  chapterNum: document.getElementById('vb-chapter-num'),
  chapterTitle: document.getElementById('vb-chapter-title'),
  chapterLine: document.getElementById('vb-chapter-line'),
  card: document.getElementById('vb-card'),
  replay: document.getElementById('vb-replay'),
  controls: document.getElementById('vb-controls'),
  play: document.getElementById('vb-play'),
  restart: document.getElementById('vb-restart'),
  fullscreen: document.getElementById('vb-fs'),
  hide: document.getElementById('vb-hide'),
  scrub: document.getElementById('vb-scrub'),
  time: document.getElementById('vb-time'),
  ticks: document.getElementById('vb-ticks'),
  progress: document.getElementById('vb-progress')
};

/* ────────────────────────────────────────────────────────────────────────────
   Boot
   ──────────────────────────────────────────────────────────────────────────── */

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance'
  });
} catch (err) {
  showFallback();
  throw err;
}

if (!renderer.getContext()) {
  showFallback();
  throw new Error('WebGL context unavailable');
}

function showFallback() {
  if (fallback) fallback.hidden = false;
  if (loading) loading.hidden = true;
  if (root) root.classList.add('is-unsupported');
}

/* All colour is authored and graded by hand; three.js is not allowed to
   quietly convert or tone-map anything. */
THREE.ColorManagement.enabled = false;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(0x000000, 1);

const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 720;
let quality = params.get('quality') === 'low' || params.get('quality') === 'high'
  ? params.get('quality')
  : coarsePointer || smallScreen
    ? 'low'
    : 'high';

let maxPixelRatio = Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.5 : 1.15);
let pixelRatio = maxPixelRatio;

const world = buildWorld({ quality, pixelRatio });
const pipeline = new FilmPipeline(renderer, { pixelRatio, quality, reducedMotion });
pipeline.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, pixelRatio);

const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.5, 5000);
camera.up.set(0, 1, 0);

/* ────────────────────────────────────────────────────────────────────────────
   Playback state
   ──────────────────────────────────────────────────────────────────────────── */

let storyTime = (() => {
  const t = parseFloat(params.get('t'));
  if (Number.isFinite(t)) return Math.min(DURATION, Math.max(0, t));
  const act = parseInt(params.get('act'), 10);
  if (Number.isFinite(act)) return actStartTime(act - 1);
  return 0;
})();

const speed = (() => {
  const s = parseFloat(params.get('speed'));
  return Number.isFinite(s) ? Math.min(3, Math.max(0.25, s)) : 1;
})();

let looping = params.get('loop') !== '0';
let playing = true;
let endHold = 0;
let lastFrame = performance.now();
let currentAct = -1;
let chapterTimer = 0;
let idleTimer = 0;

/* ────────────────────────────────────────────────────────────────────────────
   Chapter chrome
   ──────────────────────────────────────────────────────────────────────────── */

if (el.ticks) {
  ACTS.forEach((act, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vb-tick';
    button.style.left = `${(act.start / DURATION) * 100}%`;
    button.innerHTML = `<span>${act.numeral}</span>`;
    button.title = `${act.numeral}. ${act.title}`;
    button.setAttribute('aria-label', `Seek to act ${act.numeral}, ${act.title}`);
    button.addEventListener('click', () => seek(actStartTime(i)));
    el.ticks.appendChild(button);
  });
}

function showChapter(act) {
  if (!el.chapter) return;
  el.chapterNum.textContent = act.numeral;
  el.chapterTitle.textContent = act.title;
  el.chapterLine.textContent = act.line;
  if (el.actBadge) el.actBadge.textContent = `ACT ${act.numeral}`;
  el.chapter.classList.add('is-visible');
  chapterTimer = 5.4;
}

/* ────────────────────────────────────────────────────────────────────────────
   Controls
   ──────────────────────────────────────────────────────────────────────────── */

function setPlaying(next) {
  playing = next;
  if (el.play) {
    el.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    el.play.dataset.state = playing ? 'playing' : 'paused';
  }
  if (root) root.classList.toggle('is-paused', !playing);
}

function seek(t) {
  storyTime = Math.min(DURATION - 0.001, Math.max(0, t));
  endHold = 0;
  const idx = ACTS.findIndex((a) => storyTime >= a.start && storyTime < a.end);
  if (idx !== currentAct) {
    currentAct = idx;
    showChapter(ACTS[Math.max(0, idx)]);
  }
}

function restart() {
  seek(0);
  setPlaying(true);
  if (el.card) el.card.classList.remove('is-visible');
}

el.play?.addEventListener('click', () => {
  if (storyTime >= DURATION - 0.05) {
    restart();
    return;
  }
  setPlaying(!playing);
});

el.restart?.addEventListener('click', restart);
el.replay?.addEventListener('click', restart);

el.fullscreen?.addEventListener('click', () => {
  const target = root || document.documentElement;
  if (!document.fullscreenElement) {
    target.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});

el.hide?.addEventListener('click', () => {
  root?.classList.toggle('is-cinematic');
  pokeUi();
});

if (el.scrub) {
  el.scrub.max = String(DURATION);
  el.scrub.addEventListener('input', () => seek(parseFloat(el.scrub.value)));
}

/* click the frame to play/pause, but never when the chrome is the target */
canvas.addEventListener('click', () => {
  if (storyTime >= DURATION - 0.05) restart();
  else setPlaying(!playing);
  pokeUi();
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  const key = event.key;
  if (key === ' ' || key === 'k') {
    event.preventDefault();
    if (storyTime >= DURATION - 0.05) restart();
    else setPlaying(!playing);
  } else if (key === 'ArrowRight') {
    seek(storyTime + 5);
  } else if (key === 'ArrowLeft') {
    seek(storyTime - 5);
  } else if (key === 'r' || key === 'R') {
    restart();
  } else if (key === 'h' || key === 'H') {
    root?.classList.toggle('is-cinematic');
  } else if (key === 'f' || key === 'F') {
    el.fullscreen?.click();
  } else if (/^[1-5]$/.test(key)) {
    seek(actStartTime(parseInt(key, 10) - 1));
  }
});

/* ────────────────────────────────────────────────────────────────────────────
   Idle UI
   ──────────────────────────────────────────────────────────────────────────── */

function pokeUi() {
  if (!showUi) return;
  root?.classList.remove('is-idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (playing) root?.classList.add('is-idle');
  }, 2600);
}
['pointermove', 'pointerdown', 'touchstart', 'focusin'].forEach((type) => {
  window.addEventListener(type, pokeUi, { passive: true });
});
pokeUi();

if (!showUi) {
  root?.classList.add('is-chromeless');
}

/* ────────────────────────────────────────────────────────────────────────────
   Resize & visibility
   ──────────────────────────────────────────────────────────────────────────── */

function resize() {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  pipeline.setSize(width, height, pixelRatio);
  world.setPixelRatio(pixelRatio);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
if ('ResizeObserver' in window) {
  new ResizeObserver(resize).observe(canvas);
}

/* a lost GPU context is recoverable in every modern browser, but only if the
   default behaviour is prevented; if it never comes back, say so */
canvas.addEventListener(
  'webglcontextlost',
  (event) => {
    event.preventDefault();
    if (loading) {
      loading.hidden = false;
      loading.classList.remove('is-done');
      const mark = loading.querySelector('.vb-loading-mark');
      if (mark) mark.textContent = 'RESTORING THE PROJECTION';
    }
  },
  false
);
canvas.addEventListener('webglcontextrestored', () => window.location.reload(), false);

let tabVisible = !document.hidden;
document.addEventListener('visibilitychange', () => {
  tabVisible = !document.hidden;
  lastFrame = performance.now();
});

/* pause when scrolled out of view (embeds are often off-screen) */
let onScreen = true;
if ('IntersectionObserver' in window) {
  new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
    },
    { threshold: 0.05 }
  ).observe(root || canvas);
}

/* ────────────────────────────────────────────────────────────────────────────
   Adaptive resolution — protect the frame rate before it protects the pixels
   ──────────────────────────────────────────────────────────────────────────── */

let frameSamples = 0;
let frameTimeSum = 0;
let adapted = false;

function adapt(dt) {
  if (adapted) return;
  frameSamples++;
  frameTimeSum += dt;
  if (frameSamples < 60) return;
  const avg = frameTimeSum / frameSamples;
  frameSamples = 0;
  frameTimeSum = 0;
  if (avg > 0.026 && pixelRatio > 1) {
    pixelRatio = Math.max(1, pixelRatio - 0.25);
    resize();
  } else if (avg > 0.03 && quality === 'high') {
    quality = 'low';
    pipeline.setQuality('low');
    adapted = true;
  } else if (avg <= 0.022) {
    adapted = true;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   The loop
   ──────────────────────────────────────────────────────────────────────────── */

const target = new THREE.Vector3();
let firstFrame = true;
let lastUiWrite = -1;

function frame(now) {
  requestAnimationFrame(frame);

  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!tabVisible || !onScreen) return;
  if (dt <= 0) return;

  adapt(dt);

  if (playing) {
    storyTime += dt * speed;
    if (storyTime >= DURATION) {
      if (looping) {
        endHold += dt;
        storyTime = DURATION;
        if (endHold > 2.4) {
          storyTime = 0;
          endHold = 0;
          if (el.card) el.card.classList.remove('is-visible');
        }
      } else {
        storyTime = DURATION;
        setPlaying(false);
      }
    }
  }
  const state = sampleTimeline(storyTime);

  /* ── camera ─────────────────────────────────────────────────────────── */
  camera.position.fromArray(state.camera.position);
  target.fromArray(state.camera.target);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.rotateZ(state.camera.roll);
  /* the lens opens up on portrait screens so the framing survives the crop */
  const fov = effectiveFov(state.camera.fov, camera.aspect);
  if (Math.abs(camera.fov - fov) > 1e-4) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld(true);

  /* ── world ──────────────────────────────────────────────────────────── */
  world.update(state, camera);

  /* ── grade & present ────────────────────────────────────────────────── */
  pipeline.render(world.scene, camera, state);

  /* ── chrome ─────────────────────────────────────────────────────────── */
  if (state.actIndex !== currentAct) {
    currentAct = state.actIndex;
    showChapter(state.act);
  }
  if (chapterTimer > 0) {
    chapterTimer -= dt;
    if (chapterTimer <= 0 && el.chapter) el.chapter.classList.remove('is-visible');
  }

  if (el.card) {
    el.card.classList.toggle('is-visible', state.titleCard > 0.55 && storyTime > 87);
  }

  const rounded = Math.round(storyTime * 10) / 10;
  if (rounded !== lastUiWrite) {
    lastUiWrite = rounded;
    if (el.scrub && document.activeElement !== el.scrub) el.scrub.value = String(storyTime);
    if (el.progress) el.progress.style.transform = `scaleX(${storyTime / DURATION})`;
    if (el.time) el.time.textContent = `${timecode(storyTime)} / ${timecode(DURATION)}`;
  }

  if (firstFrame) {
    firstFrame = false;
    if (loading) {
      loading.classList.add('is-done');
      setTimeout(() => {
        if (loading) loading.hidden = true;
      }, 700);
    }
  }
}

function timecode(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/* ────────────────────────────────────────────────────────────────────────────
   Go
   ──────────────────────────────────────────────────────────────────────────── */

resize();
setPlaying(true);
showChapter(ACTS[0]);
requestAnimationFrame(frame);

/* expose a tiny handle for the tests and for curious visitors */
window.VEILBREAK = {
  seek,
  play: () => setPlaying(true),
  pause: () => setPlaying(false),
  state: () => sampleTimeline(storyTime),
  world,
  pipeline,
  renderer,
  camera
};
