/* Headless smoke test: loads index.html in jsdom with a recording 2D context,
   runs several animation frames, and reports runtime errors + scene stats. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: false,
  url: 'http://localhost/'
});

const { window } = dom;

/* ── recording canvas 2d context ────────────────────────── */
const calls = Object.create(null);
function bump(name) { calls[name] = (calls[name] || 0) + 1; }

function makeCtx() {
  const gradient = { addColorStop() {} };
  const ctx = {
    canvas: null,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    setTransform() { bump('setTransform'); },
    clearRect() { bump('clearRect'); },
    fillRect() { bump('fillRect'); },
    strokeRect() { bump('strokeRect'); },
    beginPath() { bump('beginPath'); },
    closePath() { bump('closePath'); },
    moveTo() { bump('moveTo'); },
    lineTo() { bump('lineTo'); },
    arc() { bump('arc'); },
    fill() { bump('fill'); },
    stroke() { bump('stroke'); },
    save() { bump('save'); },
    restore() { bump('restore'); },
    clip() { bump('clip'); },
    drawImage() { bump('drawImage'); },
    fillText() { bump('fillText'); },
    measureText() { return { width: 20 }; },
    createLinearGradient() { bump('linearGradient'); return gradient; },
    createRadialGradient() { bump('radialGradient'); return gradient; },
    set fillStyle2(v) {}
  };
  return ctx;
}

const contexts = new WeakMap();

window.HTMLCanvasElement.prototype.getContext = function (type) {
  if (!contexts.has(this)) {
    const c = makeCtx();
    c.canvas = this;
    contexts.set(this, c);
  }
  return contexts.get(this);
};
window.HTMLCanvasElement.prototype.toDataURL = function () {
  return 'data:image/png;base64,AAAA';
};
window.HTMLElement.prototype.getBoundingClientRect = function () {
  if (this.id === 'scene' || this.id === 'viewport') {
    return { x: 0, y: 0, left: 0, top: 0, right: 1000, bottom: 700, width: 1000, height: 700 };
  }
  return { x: 0, y: 0, left: 0, top: 0, right: 120, bottom: 24, width: 120, height: 24 };
};
window.devicePixelRatio = 2;

/* capture rAF callbacks so we can step frames deterministically */
const queue = [];
window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
window.cancelAnimationFrame = (id) => { queue[id - 1] = null; };
window.performance = window.performance || { now: () => Date.now() };

/* ── load the app scripts ───────────────────────────────── */
const errors = [];
window.addEventListener('error', (e) => errors.push(e.message));

for (const file of ['assets/data.js', 'assets/render.js', 'assets/ui.js']) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  try {
    window.eval(code);
  } catch (err) {
    errors.push(file + ': ' + (err && err.stack || err));
  }
}

/* ── step frames ────────────────────────────────────────── */
let t = 0;
for (let frame = 0; frame < 6; frame++) {
  const batch = queue.splice(0, queue.length).filter(Boolean);
  t += 16.7;
  for (const cb of batch) {
    try { cb(t); } catch (err) { errors.push('frame: ' + (err && err.stack || err)); }
  }
}

/* interaction probes */
try {
  window.city.view.setMouse(500, 380, true);
  window.city.view.setPalette('ice');
  window.city.view.setParam('engine', 'cycles');
  window.city.view.setParam('wire', true);
  window.city.view.preset('top');
  window.city.view.zoom(0.8);
  window.city.view.pan(30, -12);
  window.city.view.orbit(0.4, -0.2);
  window.city.view.setParam('wire', false);
  window.city.view.preset('iso');
  const batch = queue.splice(0, queue.length).filter(Boolean);
  for (const cb of batch) cb(t + 200);
} catch (err) {
  errors.push('interaction: ' + (err && err.stack || err));
}

const stats = window.city.view.getStats();
const data = window.city.view.getData();

console.log('calls:', JSON.stringify(calls));
console.log('stats:', JSON.stringify(stats));
if (data) {
  console.log('data:', JSON.stringify({
    user: data.username, year: data.year, total: data.total,
    activeDays: data.activeDays, longest: data.longestStreak,
    best: data.best && data.best.count, cells: data.cells.length,
    months: data.monthMarks.length
  }));
}
const status = window.document.getElementById('statusLeft').textContent;
console.log('status:', status);
console.log('errors:', errors.length ? errors : 'none');
process.exit(errors.length ? 1 : 0);
