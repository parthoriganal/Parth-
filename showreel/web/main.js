/**
 * Live player. Runs the exact same scene code as the offline renderer, in
 * real time, on a single 1920x1080 canvas that the page scales to fit.
 */
import { Engine } from '../src/engine.js';
import { FILM } from '../src/timeline.js';

const CHAPTERS = [
  { id: 'ignition', n: '01', t: 'IGNITION', at: 0.0 },
  { id: 'feed', n: '02', t: 'FEED', at: 3.0 },
  { id: 'form', n: '03', t: 'FORM', at: 9.0 },
  { id: 'sync', n: '04', t: 'SYNC', at: 15.0 },
  { id: 'corrupt', n: '05', t: 'CORRUPT', at: 20.0 },
  { id: 'fracture', n: '06', t: 'FRACTURE', at: 25.0 },
  { id: 'climax', n: '07', t: 'CLIMAX', at: 30.0 },
  { id: 'finale', n: '08', t: 'FINALE', at: 35.5 },
];

const engine = new Engine(FILM);
const stage = document.getElementById('stage');
const hint = document.getElementById('hint');
const range = document.getElementById('range');
const fill = document.getElementById('fill');
const tc = document.getElementById('tc');
const playBtn = document.getElementById('play');
const restartBtn = document.getElementById('restart');
const chaptersEl = document.getElementById('chapters');

stage.insertBefore(engine.main.canvas, stage.querySelector('.corner'));

let t = 0;
let playing = false;
let last = 0;
let started = false;

// ---------------------------------------------------------------- chapters
const chips = CHAPTERS.map((c, i) => {
  const el = document.createElement('button');
  el.className = 'ch';
  el.innerHTML = `<div class="n">${c.n}</div><div class="t">${c.t}</div>
    <div class="d">${String(Math.floor(c.at / 60)).padStart(2, '0')}:${(c.at % 60).toFixed(1).padStart(4, '0')}</div>
    <div class="bar" style="width:0"></div>`;
  el.addEventListener('click', () => {
    seek(c.at + 0.001);
    if (!playing) setPlaying(true);
  });
  chaptersEl.appendChild(el);
  return { el, bar: el.querySelector('.bar'), at: c.at, next: CHAPTERS[i + 1]?.at ?? FILM.duration };
});

// ---------------------------------------------------------------- transport
function fmt(x) {
  const m = Math.floor(x / 60);
  const s = x % 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

function seek(v) {
  t = Math.max(0, Math.min(FILM.duration - 0.001, v));
  drawUI();
}

function setPlaying(p) {
  playing = p;
  playBtn.textContent = p ? '❚❚' : '▶';
  hint.classList.toggle('hidden', p || t > 0.05);
  last = performance.now();
}

hint.addEventListener('click', () => setPlaying(true));
playBtn.addEventListener('click', () => {
  if (!playing && t >= FILM.duration - 0.05) t = 0;
  setPlaying(!playing);
});
restartBtn.addEventListener('click', () => {
  seek(0);
  setPlaying(true);
});
range.addEventListener('input', () => {
  seek(parseFloat(range.value));
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    setPlaying(!playing);
  }
  if (e.code === 'ArrowRight') seek(t + 1);
  if (e.code === 'ArrowLeft') seek(t - 1);
  if (e.code === 'KeyR') { seek(0); setPlaying(true); }
});

// ticks on the scrub rail
const scrubEl = document.getElementById('scrub');
for (const c of CHAPTERS) {
  if (c.at === 0) continue;
  const tk = document.createElement('div');
  tk.className = 'tick';
  tk.style.left = `${(c.at / FILM.duration) * 100}%`;
  tk.innerHTML = `<b>${c.t}</b>`;
  scrubEl.appendChild(tk);
}

function drawUI() {
  const p = t / FILM.duration;
  fill.style.width = `${p * 100}%`;
  range.value = String(t);
  tc.textContent = `${fmt(t)} / ${fmt(FILM.duration)}`;
  chips.forEach((c) => {
    const active = t >= c.at && t < c.next;
    c.el.classList.toggle('active', active);
    const local = active ? (t - c.at) / (c.next - c.at) : t >= c.next ? 1 : 0;
    c.bar.style.width = `${local * 100}%`;
  });
}

// ---------------------------------------------------------------- main loop
let frames = 0;
let fpsT = performance.now();
let fps = 60;

function tick(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (playing) {
    t += dt;
    if (t >= FILM.duration) {
      t = FILM.duration - 0.001;
      setPlaying(false);
    }
  }
  engine.render(t);
  drawUI();
  frames++;
  if (now - fpsT > 1000) {
    fps = (frames * 1000) / (now - fpsT);
    frames = 0;
    fpsT = now;
  }
  requestAnimationFrame(tick);
}

// first paint: a poster frame so the stage is never empty
engine.render(0.62);
drawUI();
last = performance.now();
requestAnimationFrame(tick);

// expose for debugging / automation
window.__reel = { engine, seek, play: () => setPlaying(true), get t() { return t; }, get fps() { return fps; } };
