/**
 * NEON ORBIT — main.js
 *
 * Orchestration only: scroll → station, DOM ↔ 3D registration, HUD, the lab
 * orbs, the wavefield, and the easter eggs. The 3D scene lives in world.js.
 */

import { createWorld, PALETTE } from './world.js';
import { createWavefield } from './wavefield.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const doc = document.documentElement;
const reduced = doc.dataset.reduced === 'true';
const tier = doc.dataset.tier === 'low' ? 'low' : 'high';
const hasWebGL = doc.dataset.webgl === 'yes';

/* ─────────────────────────────────────────────────── boot sequence ── */

const boot = $('#boot');
const bootPct = $('#bootPct');
const bootBar = $('#bootBar');
const bootLog = $('#bootLog');

const BOOT_STEPS = [
  [8, 'reading palette'],
  [26, 'baking environment'],
  [46, 'building artefact'],
  [68, 'calibrating orbit'],
  [86, 'compiling shaders'],
  [100, 'ready'],
];

function runBoot(done) {
  let i = 0;
  let pct = 0;
  const t0 = performance.now();

  const advance = () => {
    if (i >= BOOT_STEPS.length) return;
    const [target, label] = BOOT_STEPS[i];
    bootLog.textContent = label;
    const from = pct;
    const dur = 150 + Math.random() * 110;
    const start = performance.now();

    const step = now => {
      const t = Math.min(1, (now - start) / dur);
      pct = from + (target - from) * (t * t * (3 - 2 * t));
      bootPct.textContent = Math.round(pct);
      bootBar.style.width = pct + '%';
      if (t < 1) requestAnimationFrame(step);
      else {
        i++;
        if (i < BOOT_STEPS.length) advance();
        else {
          // never hold the user: total boot stays well under a second
          const elapsed = performance.now() - t0;
          setTimeout(() => {
            boot.classList.add('is-gone');
            setTimeout(() => boot.remove(), 800);
            done();
          }, Math.max(0, 160 - elapsed));
        }
      }
    };
    requestAnimationFrame(step);
  };

  advance();
}

/* ─────────────────────────────────────────────────────────── state ── */

const state = {
  station: 0,
  fieldProgress: 0,
  motion: !reduced,
  world: null,
  wave: null,
  cells: [],
  activeOrb: 0,
};

const canvas = $('#stage');
const stations = $$('.station');

/**
 * Map a point at the middle of the viewport onto 0…4 station units.
 * Each station owns an equal slice of the scroll, which is what makes the
 * camera arrive at the same moment the section's copy does.
 */
function stationFloat() {
  const y = window.scrollY + window.innerHeight * 0.5;
  const n = stations.length;
  for (let i = 0; i < n; i++) {
    const el = stations[i];
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (y >= top && y < bottom) {
      return i + (y - top) / Math.max(1, bottom - top);
    }
  }
  return y < stations[0].offsetTop ? 0 : n - 1;
}

/* ────────────────────────────────────────────────── lab orb cells ── */

function buildOrbBoard() {
  const board = $('#orbBoard');
  const frag = document.createDocumentFragment();

  PALETTE.forEach((p, i) => {
    const li = document.createElement('li');
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'orb-cell';
    cell.style.setProperty('--c', p.hex);
    cell.dataset.index = String(i);
    cell.dataset.hex = p.hex;
    cell.setAttribute('aria-label', `${p.name}, ${p.hex}. Copy hex value.`);
    cell.innerHTML = `
      <span class="orb-cell-index">${p.node}</span>
      <span class="orb-cell-name">${p.name.replace('/', ' / ')}</span>
      <span class="orb-cell-hex">${p.hex}</span>`;
    li.appendChild(cell);
    frag.appendChild(li);

    cell.addEventListener('pointerenter', () => setActiveOrb(i));
    cell.addEventListener('focus', () => setActiveOrb(i));
    cell.addEventListener('click', () => {
      copy(p.hex, `${p.name} ${p.hex}`);
      state.world?.pulse();
    });
  });

  board.replaceChildren(frag);
}

/* WCAG contrast — same maths as the token sheet */
function srgbToLin(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * srgbToLin((n >> 16) & 255) + 0.7152 * srgbToLin((n >> 8) & 255) + 0.0722 * srgbToLin(n & 255);
}
function contrastOn(hex, other) {
  const a = luminance(hex), b = luminance(other);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function setActiveOrb(i) {
  state.activeOrb = i;
  const p = PALETTE[i];
  $$('.orb-cell').forEach((c, j) => c.classList.toggle('is-live', j === i));

  $('#labName').textContent = p.name;
  $('#labHex').textContent = p.hex;
  $('#labNode').textContent = `node ${p.node}`;

  const onInk = contrastOn(p.hex, '#F4F5FA');
  $('#labContrast').textContent = `${onInk.toFixed(2)}:1 on ink`;

  const bar = $('#labBar');
  bar.style.width = `${Math.min(100, (onInk / 21) * 100)}%`;
  bar.style.background = p.hex;
  $('#labHex').style.color = p.hex;
}

function initOrbVisibility() {
  const board = $('#orbBoard');
  if (!board) return;
  const sync = on => {
    state.orbsActive = on;
    state.world?.setOrbsActive(on);
    if (on) measureCells();
  };
  if (!('IntersectionObserver' in window)) {
    sync(true);
    return;
  }
  new IntersectionObserver(entries => {
    entries.forEach(e => sync(e.isIntersecting));
  }, { rootMargin: '22% 0px 22% 0px', threshold: 0 }).observe(board);
}

function measureCells() {
  state.cells = $$('.orb-cell').map(el => {
    const r = el.getBoundingClientRect();
    return {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      w: r.width,
      h: r.height,
      visible: r.width > 0 && r.bottom > 0 && r.top < window.innerHeight,
    };
  });
  state.world?.setCells(state.cells);
}

/* ────────────────────────────────────────────────────────── toast ── */

let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2000);
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* silent */ }
    ta.remove();
  }
  toast(label || `COPIED ${text}`);
}

/* ─────────────────────────────────────────────────────── HUD sync ── */

const hud = $('#hud');
const railFill = $('#railFill');
const railLabel = $('#railLabel');
const navLinks = $$('.hud-nav a');

const STATION_NAMES = ['CORE', 'FIELD', 'LAB', 'SIGNAL', 'EXIT'];

function syncHud(p) {
  state.station = p;
  railFill.style.height = `${Math.round(Math.min(1, p / 4) * 100)}%`;

  const idx = Math.min(4, Math.round(p));
  const text = `${String(idx + 1).padStart(2, '0')} / ${STATION_NAMES[idx]}`;
  if (railLabel.textContent !== text) railLabel.textContent = text;

  navLinks.forEach((a, i) => a.classList.toggle('is-active', i === idx));
}

/* ─────────────────────────────────────────────────── scroll driver ── */

let rafPending = false;

function computeScroll() {
  rafPending = false;
  const p = stationFloat();

  // FIELD dispersion: swells to 1 through the middle of station 1, then closes
  let dist = 0;
  if (p > 0.95 && p < 2.0) {
    const local = Math.min(1, Math.max(0, (p - 0.95) / 1.05)); // 0…1 through FIELD
    dist = local < 0.55 ? local / 0.55 : (1 - local) / 0.45;    // open, then close
    dist = Math.min(1, Math.max(0, dist));
    dist = dist * dist * (3 - 2 * dist);
  }

  state.fieldProgress = dist;
  state.world?.setStation(p);
  state.world?.setDist(dist);

  // the orbs follow the DOM, not the station curve: if a cell is on screen,
  // its orb exists. (The station curve decides the artefact, not these.)
  if (state.orbsActive && state.world) {
    measureCells();
    state.world.setOrbsActive(true);
  }

  // FIELD readouts
  const pct = Math.round(dist * 100);
  const fill = $('#fieldFill');
  const pctEl = $('#fieldPct');
  if (fill) fill.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;

  const stepIdx = Math.min(3, Math.floor(dist * 4.001));
  $$('.step').forEach((s, i) => s.classList.toggle('is-on', i === stepIdx));

  syncHud(p);
}

function onScroll() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(computeScroll);
}

/* ──────────────────────────────────────────────────── easter eggs ── */

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIdx = 0;

function triggerHyper() {
  doc.classList.add('is-hyper');
  toast('◈ ORBIT DESTABILISED');
  for (let i = 0; i < 26; i++) setTimeout(() => state.world?.dragDelta(34, 18), i * 16);
  setTimeout(() => {
    doc.classList.remove('is-hyper');
    toast('◈ STABLE');
  }, 3400);
}

window.addEventListener('keydown', ev => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
  const want = KONAMI[konamiIdx];

  if (key === want) {
    konamiIdx++;
    if (konamiIdx === KONAMI.length) { konamiIdx = 0; triggerHyper(); }
  } else {
    // a wrong arrow key rewinds; any other key is simply ignored
    konamiIdx = key === KONAMI[0] ? 1 : 0;
  }
});

/* ─────────────────────────────────────────────────────── motion ui ── */

const btnMotion = $('#btnMotion');
const btnMotionLabel = $('#btnMotionLabel');

function setMotion(on, initial = false) {
  state.motion = on;
  if (initial) state.motionLocked = reduced;
  btnMotion.setAttribute('aria-pressed', String(!on));
  btnMotionLabel.textContent = on ? 'Motion on' : 'Motion off';
  doc.classList.toggle('reduced-motion', !on);
  state.world?.pause(!on);
  $('.world')?.classList.toggle('is-paused', !on);
  try { localStorage.setItem('neon-orbit-motion', on ? '1' : '0'); } catch { /* private mode */ }
}

btnMotion.addEventListener('click', () => setMotion(!state.motion));

/* ─────────────────────────────────────────────────── drag the core ── */

function bindDrag() {
  const hero = $('#hero');
  let down = false, lx = 0, ly = 0, moved = 0;

  hero.addEventListener('pointerdown', ev => {
    if (ev.target.closest('a, button')) return;
    down = true; moved = 0;
    lx = ev.clientX; ly = ev.clientY;
    state.world?.setDragging(true);
    hero.setPointerCapture?.(ev.pointerId);
  });

  hero.addEventListener('pointermove', ev => {
    if (!down) return;
    const dx = ev.clientX - lx;
    const dy = ev.clientY - ly;
    moved += Math.abs(dx) + Math.abs(dy);
    lx = ev.clientX; ly = ev.clientY;
    state.world?.dragDelta(dx, dy);
  });

  const up = () => {
    if (!down) return;
    down = false;
    state.world?.setDragging(false);
    if (moved < 6) state.world?.pulse();  // a tap, not a drag
  };
  hero.addEventListener('pointerup', up);
  hero.addEventListener('pointercancel', up);
}

/* ──────────────────────────────────────────────────────── the lab ── */

function initLab() {
  buildOrbBoard();
  setActiveOrb(0);

  $('#orbBoard').addEventListener('keydown', ev => {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const next = (state.activeOrb + (ev.key === 'ArrowRight' ? 1 : -1) + PALETTE.length) % PALETTE.length;
    setActiveOrb(next);
    $$('.orb-cell')[next]?.focus();
  });
}

/* ─────────────────────────────────────────────────────── the exit ── */

function initExit() {
  $('#btnRestart').addEventListener('click', ev => {
    ev.preventDefault();
    window.scrollTo({ top: 0, behavior: 'auto' });
    state.world?.pulse();
    toast('◈ BACK TO ORBIT');
  });
}

/* ───────────────────────────────────────────────── reveal on enter ── */

function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window) || reduced) {
    els.forEach(e => e.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
}

/* ─────────────────────────────────────────────────────── fps meter ── */

function startFpsMeter() {
  const el = $('#hudFps');
  const tierEl = $('#hudTier');
  tierEl.textContent = tier;
  setInterval(() => {
    if (!state.world) return;
    el.textContent = String(state.world.fps);
    if (state.world.quality === 'reduced') tierEl.textContent = 'reduced';
  }, 800);
}

/* ──────────────────────────────────────────────────────────── boot ── */

function initWorld() {
  if (!hasWebGL) {
    $('#fallback').hidden = false;
    doc.dataset.quality = 'fallback';
    return null;
  }
  try {
    const world = createWorld(canvas, { tier, reduced });
    world.start();
    return world;
  } catch (err) {
    console.error('[neon-orbit] world failed to start', err);
    $('#fallback').hidden = false;
    doc.dataset.quality = 'fallback';
    return null;
  }
}

function initWavefield() {
  const el = $('#wavefield');
  if (!el) return null;
  const wave = createWavefield(el, {
    low: tier === 'low',
    reduced,
    onHintUsed: () => $('#signalHint')?.classList.add('is-used'),
  });
  wave.mount();

  const readout = $('#signalEnergy');
  setInterval(() => {
    if (readout) readout.textContent = wave.energy.toFixed(2);
  }, 180);

  return wave;
}

function init() {
  // never restore a mid-page scroll position: the film starts at frame one
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  let motionPref = !reduced;
  try {
    const saved = localStorage.getItem('neon-orbit-motion');
    if (saved === '0') motionPref = false;
    if (saved === '1' && !reduced) motionPref = true;
  } catch { /* private mode */ }

  initLab();
  initOrbVisibility();
  initExit();
  initReveal();
  bindDrag();

  window.scrollTo(0, 0);

  runBoot(() => {
    state.world = initWorld();
    state.wave = initWavefield();

    if (state.world) {
      state.world.resize();
      // `setMotion` owns the button label; pass the resolved preference only
      setMotion(reduced ? false : motionPref, true);

      window.addEventListener('pointermove', ev => {
        const nx = (ev.clientX / window.innerWidth) * 2 - 1;
        const ny = (ev.clientY / window.innerHeight) * 2 - 1;
        state.world.setPointer(nx, ny);
      }, { passive: true });

      measureCells();
    } else {
      setMotion(false);
    }

    startFpsMeter();
    computeScroll();

    const remeasure = () => {
      state.world?.resize();
      if (state.orbsActive) measureCells();
      computeScroll();
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('orientationchange', () => setTimeout(remeasure, 260));
    if (document.fonts?.ready) document.fonts.ready.then(remeasure);

    // stop the GPU when the tab is hidden — battery matters on a phone
    document.addEventListener('visibilitychange', () => {
      state.world?.pause(document.hidden);
    });
  });

  window.addEventListener('scroll', onScroll, { passive: true });

  // expose a small surface for inspection and automated checks
  window.__NEON = {
    get state() { return state; },
    get stats() { return state.world?.stats; },
    setMotion,
    triggerHyper,
    setActiveOrb,
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
