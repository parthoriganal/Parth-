/* Headless smoke test: loads index.html in jsdom with a recording 2D context,
   steps animation frames, drives every control and tool, and fails on any
   runtime error or any NaN that reaches the scene.

     npm i -D jsdom          # test-only, not needed to run the app
     node test/smoke.cjs */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: false,
  url: 'http://localhost/?preset=solar&seed=3'
});
const { window } = dom;

/* ── recording canvas 2D context ────────────────────────── */
const calls = Object.create(null);
function bump(name) { calls[name] = (calls[name] || 0) + 1; }

function makeCtx() {
  const gradient = { addColorStop() {} };
  return {
    canvas: null,
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic',
    lineJoin: 'miter', lineCap: 'butt', filter: 'none',
    setTransform() { bump('setTransform'); },
    clearRect() { bump('clearRect'); },
    fillRect() { bump('fillRect'); },
    strokeRect() { bump('strokeRect'); },
    beginPath() { bump('beginPath'); },
    closePath() { bump('closePath'); },
    moveTo() { bump('moveTo'); },
    lineTo() { bump('lineTo'); },
    arc() { bump('arc'); },
    ellipse() { bump('ellipse'); },
    rect() { bump('rect'); },
    roundRect() { bump('roundRect'); },
    fill() { bump('fill'); },
    stroke() { bump('stroke'); },
    save() { bump('save'); },
    restore() { bump('restore'); },
    clip() { bump('clip'); },
    translate() { bump('translate'); },
    scale() { bump('scale'); },
    rotate() { bump('rotate'); },
    setLineDash() { bump('setLineDash'); },
    drawImage(img) {
      bump('drawImage');
      /* real canvas throws on a non-canvas source; catching that here found a
         genuine bug that a permissive stub silently swallowed */
      if (!img || typeof img.width !== 'number') {
        throw new TypeError('drawImage: source is not a canvas (' + img + ')');
      }
    },
    fillText() { bump('fillText'); },
    measureText() { return { width: 24 }; },
    createLinearGradient() { bump('linearGradient'); return gradient; },
    createRadialGradient() { bump('radialGradient'); return gradient; },
    createPattern() { return null; }
  };
}

const contexts = new WeakMap();
window.HTMLCanvasElement.prototype.getContext = function () {
  if (!contexts.has(this)) {
    const c = makeCtx();
    c.canvas = this;
    contexts.set(this, c);
  }
  return contexts.get(this);
};
window.HTMLCanvasElement.prototype.toDataURL = function () { return 'data:image/png;base64,AAAA'; };
window.HTMLAnchorElement.prototype.click = function () { bump('download'); };

const BIG = { x: 0, y: 0, left: 0, top: 0, right: 1000, bottom: 700, width: 1000, height: 700 };
window.HTMLElement.prototype.getBoundingClientRect = function () {
  return (this.id === 'viewport' || this.tagName === 'CANVAS') ? Object.assign({}, BIG)
    : { x: 0, y: 0, left: 0, top: 0, right: 120, bottom: 24, width: 120, height: 24 };
};
window.devicePixelRatio = 2;

/* deterministic frame queue */
const queue = [];
window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
window.cancelAnimationFrame = (id) => { queue[id - 1] = null; };

/* ── load app scripts ───────────────────────────────────── */
const errors = [];
window.addEventListener('error', (e) => errors.push('window.error: ' + e.message));
const origError = console.error;
console.error = function (...a) { errors.push('console.error: ' + a.join(' ')); origError.apply(console, a); };

for (const file of ['assets/physics.js', 'assets/render.js', 'assets/ui.js']) {
  try {
    window.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  } catch (err) {
    errors.push(file + ': ' + ((err && err.stack) || err));
  }
}

let t = 0;
function frames(n, label) {
  for (let i = 0; i < n; i++) {
    const batch = queue.splice(0, queue.length).filter(Boolean);
    t += 16.7;
    for (const cb of batch) {
      try { cb(t); } catch (err) { errors.push((label || 'frame') + ': ' + ((err && err.stack) || err)); }
    }
  }
}
function probe(label, fn) {
  try { fn(); } catch (err) { errors.push(label + ': ' + ((err && err.stack) || err)); }
}
function fire(el, type, props) {
  const ev = new window.Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, props || {});
  el.dispatchEvent(ev);
  return ev;
}
function pointer(type, x, y, extra) {
  return fire(window.document.getElementById('viewport'), type,
    Object.assign({ clientX: x, clientY: y, pointerId: 1, button: 0, buttons: 1 }, extra || {}));
}

const doc = window.document;
const Lab = window.GravityLab;

/* ── 1. boot ────────────────────────────────────────────── */
if (!Lab) errors.push('window.GravityLab was never exposed — ui.js did not finish init()');
frames(8, 'boot');

/* ── 2. every preset ────────────────────────────────────── */
if (Lab) {
  for (const key of Lab.state() && window.SimPhysics.PRESET_ORDER) {
    probe('preset:' + key, () => Lab.choosePreset(key));
    frames(4, 'preset:' + key);
    const st = Lab.state();
    if (!st.bodies.length) errors.push('preset:' + key + ' produced no bodies');
    st.bodies.forEach((b, i) => {
      if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.vx) || !isFinite(b.vy)) {
        errors.push('preset:' + key + ' body ' + i + ' is NaN');
      }
    });
  }
}

/* ── 3. every tool, with a drag ─────────────────────────── */
if (Lab) {
  Lab.choosePreset('solar');
  frames(2, 'reset-solar');
  const before = Lab.state().bodies.length;

  for (const tool of ['camera', 'spawn', 'hole', 'grab']) {
    probe('tool:' + tool, () => Lab.setTool(tool));
    pointer('pointerdown', 400, 300);
    pointer('pointermove', 430, 320);
    pointer('pointermove', 470, 350);
    pointer('pointerup', 470, 350);
    frames(2, 'tool:' + tool);
  }
  Lab.setTool('camera');

  /* assert the spawns BEFORE running erase, which legitimately removes bodies */
  const after = Lab.state().bodies.length;
  if (after !== before + 2) errors.push('spawn tools added ' + (after - before) + ' bodies, expected 2 (one body, one black hole)');
  const spawned = Lab.state().bodies.filter(b => b.kind === 'bh');
  if (spawned.length < 1) errors.push('black hole tool did not create a bh body');

  /* erase should have removed at least the bodies it was aimed at */
  probe('erase-count', () => {
    const n0 = Lab.state().bodies.length;
    Lab.setTool('erase');
    pointer('pointerdown', 500, 350);
    pointer('pointerup', 500, 350);
    if (Lab.state().bodies.length > n0) errors.push('erase increased the body count');
    Lab.setTool('camera');
  });
}

/* ── 4. camera: pan, wheel zoom, two-finger pinch, dblclick ─ */
if (Lab) {
  const R = Lab.renderer;
  probe('pan', () => {
    const c = { x: R.cam.x, y: R.cam.y };
    pointer('pointerdown', 500, 350);
    pointer('pointermove', 560, 380);
    pointer('pointerup', 560, 380);
    if (R.cam.x === c.x && R.cam.y === c.y) errors.push('pan did not move the camera');
  });
  probe('wheel', () => {
    const z = R.cam.zoom;
    fire(doc.getElementById('viewport'), 'wheel', { clientX: 500, clientY: 350, deltaY: -240, deltaMode: 0 });
    if (R.cam.zoom === z) errors.push('wheel did not zoom');
  });
  probe('pinch', () => {
    const z = R.cam.zoom;
    pointer('pointerdown', 400, 300, { pointerId: 1 });
    pointer('pointerdown', 600, 500, { pointerId: 2 });
    pointer('pointermove', 350, 250, { pointerId: 1 });
    pointer('pointermove', 650, 550, { pointerId: 2 });
    pointer('pointerup', 350, 250, { pointerId: 1 });
    pointer('pointerup', 650, 550, { pointerId: 2 });
    if (R.cam.zoom === z) errors.push('pinch did not zoom');
  });
  probe('dblclick-fit', () => fire(doc.getElementById('viewport'), 'dblclick', { clientX: 500, clientY: 350 }));
  frames(2, 'camera');
}

/* ── 5. every control in the sidebar ────────────────────── */
if (Lab) {
  const ranges = ['speed', 'gSlider', 'dtSlider', 'subSlider', 'softSlider', 'thetaSlider',
                  'trailSlider', 'glowSlider', 'sizeSlider', 'newMass', 'bodyCount'];
  for (const id of ranges) {
    probe('range:' + id, () => {
      const el = doc.getElementById(id);
      if (!el) throw new Error('missing #' + id);
      for (const v of [el.min, el.max, el.value]) {
        el.value = v;
        fire(el, 'input');
        fire(el, 'change');
        frames(1, 'range:' + id);
      }
    });
  }
  /* restore a sane particle count before continuing */
  probe('restore-count', () => {
    const el = doc.getElementById('bodyCount');
    el.value = 900; fire(el, 'change');
  });

  for (const id of ['colorMode', 'trailMode']) {
    probe('select:' + id, () => {
      const el = doc.getElementById(id);
      for (const opt of el.options) {
        el.value = opt.value;
        fire(el, 'change');
        frames(1, 'select:' + id);
      }
    });
  }

  for (const id of ['mergeChk', 'starChk']) {
    probe('check:' + id, () => {
      const el = doc.getElementById(id);
      el.checked = !el.checked; fire(el, 'change');
      el.checked = !el.checked; fire(el, 'change');
      frames(1, 'check:' + id);
    });
  }

  for (const id of ['playBtn', 'stepBtn', 'resetBtn', 'fitBtn', 'diceBtn', 'regenBtn',
                    'clearTrails', 'cardClose', 'sidebarBtn']) {
    probe('button:' + id, () => {
      const el = doc.getElementById(id);
      if (!el) throw new Error('missing #' + id);
      fire(el, 'click');
      frames(1, 'button:' + id);
    });
  }

  /* toolbar toggles */
  doc.querySelectorAll('.tool[data-show]').forEach((b) => {
    probe('show:' + b.getAttribute('data-show'), () => { fire(b, 'click'); frames(1, 'show'); fire(b, 'click'); });
  });

  /* collapsible panels */
  doc.querySelectorAll('.panel-head').forEach((h) => {
    probe('collapse', () => { fire(h, 'click'); fire(h, 'click'); });
  });
  frames(2, 'controls');
}

/* ── 6. keyboard ────────────────────────────────────────── */
if (Lab) {
  for (const key of [' ', '.', 'r', 'f', 'v', 'q', 'g', 'c', 's', 'h', 'x', 't',
                     '1', '2', '3', '4', '5', '6', '7', '8', '+', '-', 'Escape', 'F12']) {
    probe('key:' + key, () => {
      fire(window, 'keydown', { key });
      frames(1, 'key:' + key);
    });
  }
}

/* ── 7. right-click menu ────────────────────────────────── */
if (Lab) {
  probe('contextmenu', () => {
    fire(doc.getElementById('viewport'), 'contextmenu', { clientX: 480, clientY: 320 });
    const pop = doc.getElementById('menuPop');
    if (pop.hidden) errors.push('context menu did not open');
    const items = pop.querySelectorAll('button');
    if (items.length < 6) errors.push('context menu has ' + items.length + ' items, expected 6+');
    items.forEach((b) => { fire(b, 'click'); frames(1, 'menu-item'); });
  });
}

/* ── 8. capture ─────────────────────────────────────────── */
if (Lab) {
  probe('capture', () => {
    calls.download = 0;
    Lab.capture();
    if (!calls.download) errors.push('capture did not trigger a download');
  });
}

/* ── 9. resize ──────────────────────────────────────────── */
if (Lab) {
  probe('resize', () => {
    window.HTMLElement.prototype.getBoundingClientRect = function () {
      return (this.id === 'viewport' || this.tagName === 'CANVAS')
        ? { x: 0, y: 0, left: 0, top: 0, right: 420, bottom: 900, width: 420, height: 900 }
        : { x: 0, y: 0, left: 0, top: 0, right: 120, bottom: 24, width: 120, height: 24 };
    };
    fire(window, 'resize');
    frames(3, 'resize');
  });
}

/* ── 10. long run on the heaviest preset ────────────────── */
if (Lab) {
  probe('galaxies-long-run', () => {
    Lab.choosePreset('galaxies');
    frames(30, 'galaxies');
    const st = Lab.state();
    st.bodies.forEach((b, i) => {
      if (!isFinite(b.x) || !isFinite(b.y)) errors.push('galaxies body ' + i + ' went NaN after 30 frames');
    });
  });
}

/* ── report ─────────────────────────────────────────────── */
const st = Lab ? Lab.state() : null;
console.log('draw calls :', JSON.stringify(calls));
console.log('scene      :', st ? st.name + ' · ' + st.bodies.length + ' bodies · t=' + st.time.toFixed(2) : 'none');
console.log('camera     :', st ? JSON.stringify(Lab.renderer.cam) : 'none');
console.log('hud        :', doc.getElementById('statusLeft').textContent.trim());
console.log('errors     :', errors.length ? '\n  - ' + errors.join('\n  - ') : 'none');
process.exit(errors.length ? 1 : 0);
