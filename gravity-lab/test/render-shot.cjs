/* Rasterises the real viewport to a PNG so the output can be looked at, not
   just asserted about. Uses @napi-rs/canvas for actual rasterisation — the
   smoke test's recording stub only proves the calls happen.

     npm i -D jsdom @napi-rs/canvas
     node test/render-shot.cjs [preset] [frames] [outfile]
     node test/render-shot.cjs galaxies 220 shot.png */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createCanvas } = require('@napi-rs/canvas');

const root = path.join(__dirname, '..');
const preset = process.argv[2] || 'galaxies';
const FRAMES = Number(process.argv[3] || 200);
const OUT = path.resolve(process.argv[4] || path.join(__dirname, 'shot-' + preset + '.png'));
const W = 1280, H = 760;

const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
  runScripts: 'outside-only',
  url: 'http://localhost/?preset=' + preset + '&seed=4'
});
const { window } = dom;
const doc = window.document;

/* Offscreen sprites become real napi canvases, so drawImage() can consume them. */
const origCreate = doc.createElement.bind(doc);
window.document.createElement = function (tag) {
  if (String(tag).toLowerCase() === 'canvas') return createCanvas(1, 1);
  return origCreate(tag);
};

/* The three on-screen canvases are real DOM elements; back each with napi. */
const backing = new WeakMap();
window.HTMLCanvasElement.prototype.getContext = function (type) {
  let c = backing.get(this);
  if (!c) { c = createCanvas(this.width || 300, this.height || 150); backing.set(this, c); }
  if (c.width !== this.width || c.height !== this.height) { c.width = this.width; c.height = this.height; }
  return c.getContext(type || '2d');
};
window.HTMLCanvasElement.prototype.toDataURL = function () { return 'data:image/png;base64,'; };

window.HTMLElement.prototype.getBoundingClientRect = function () {
  return (this.id === 'viewport' || this.tagName === 'CANVAS')
    ? { x: 0, y: 0, left: 0, top: 0, right: W, bottom: H, width: W, height: H }
    : { x: 0, y: 0, left: 0, top: 0, right: 120, bottom: 24, width: 120, height: 24 };
};
window.devicePixelRatio = 1;

const queue = [];
window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
window.cancelAnimationFrame = (id) => { queue[id - 1] = null; };

for (const f of ['assets/physics.js', 'assets/render.js', 'assets/ui.js']) {
  window.eval(fs.readFileSync(path.join(root, f), 'utf8'));
}

/* hide the DOM chrome that jsdom would otherwise leave unstyled in the corner */
doc.getElementById('sceneCard').hidden = true;

const Lab = window.GravityLab;
if (!Lab) { console.error('ui.js did not boot'); process.exit(1); }

let t = 0;
for (let i = 0; i < FRAMES; i++) {
  const batch = queue.splice(0, queue.length).filter(Boolean);
  t += 16.7;
  for (const cb of batch) cb(t);
}

const st = Lab.state();
const R = Lab.renderer;

/* flatten bg + scene + overlay, the way capture() does */
const out = createCanvas(W, H);
const g = out.getContext('2d');
g.fillStyle = R.style.bg;
g.fillRect(0, 0, W, H);
for (const cv of [doc.getElementById('bg'), doc.getElementById('scene'), doc.getElementById('overlay')]) {
  g.drawImage(backing.get(cv), 0, 0, W, H);
}
g.font = '600 13px sans-serif';
g.fillStyle = 'rgba(255,255,255,0.62)';
g.fillText(st.name + ' · seed 4 · t=' + st.time.toFixed(1) + ' · ' + st.bodies.length + ' bodies · Gravity Lab', 14, H - 14);

fs.writeFileSync(OUT, out.toBuffer('image/png'));

const ke = window.SimPhysics.kineticEnergy(st.bodies);
console.log('preset   :', st.name);
console.log('frames   :', FRAMES, '· sim t =', st.time.toFixed(2), '· steps', st.steps);
console.log('bodies   :', st.bodies.length, '· tree nodes', window.SimPhysics.nodeCount());
console.log('KE       :', ke.toExponential(4));
console.log('camera   :', JSON.stringify(R.cam));
console.log('wrote    :', OUT, '(' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB)');
