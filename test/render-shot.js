/* Rasterise the actual viewport with node canvas so we can eyeball the render. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createCanvas } = require('@napi-rs/canvas');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const W = Number(process.argv[2] || 1180);
const H = Number(process.argv[3] || 720);
const OUT = process.argv[4] || path.join(root, 'test', 'shot.png');

const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });
const { window } = dom;

const backing = new Map();

function ctxFor(el) {
  const w = Math.max(1, el.width | 0);
  const h = Math.max(1, el.height | 0);
  let entry = backing.get(el);
  if (!entry || entry.canvas.width !== w || entry.canvas.height !== h) {
    entry = { canvas: createCanvas(w, h) };
    backing.set(el, entry);
  }
  return entry.canvas.getContext('2d');
}

window.HTMLCanvasElement.prototype.getContext = function () {
  const el = this;
  const handler = {
    get(target, prop) {
      const ctx = ctxFor(el);
      if (prop === 'drawImage') {
        return (img, ...rest) => {
          const mapped = backing.get(img);
          return ctxFor(el).drawImage(mapped ? mapped.canvas : img, ...rest);
        };
      }
      const value = ctx[prop];
      if (typeof value === 'function') return value.bind(ctx);
      return value;
    },
    set(target, prop, value) {
      ctxFor(el)[prop] = value;
      return true;
    }
  };
  if (!el.__proxy) el.__proxy = new Proxy({}, handler);
  /* make sure a backing canvas exists right away */
  ctxFor(el);
  return el.__proxy;
};
window.HTMLCanvasElement.prototype.toDataURL = function () {
  const entry = backing.get(this);
  return entry ? entry.canvas.toDataURL('image/png') : 'data:image/png;base64,';
};

window.HTMLElement.prototype.getBoundingClientRect = function () {
  if (this.id === 'scene' || this.id === 'viewport') {
    return { x: 0, y: 0, left: 0, top: 0, right: W, bottom: H, width: W, height: H };
  }
  return { x: 0, y: 0, left: 0, top: 0, right: 120, bottom: 24, width: 120, height: 24 };
};
window.devicePixelRatio = Number(process.env.DPR || 1);

const queue = [];
window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
window.cancelAnimationFrame = (id) => { queue[id - 1] = null; };

for (const file of ['assets/data.js', 'assets/render.js', 'assets/ui.js']) {
  window.eval(fs.readFileSync(path.join(root, file), 'utf8'));
}

let t = 0;
function step(frames) {
  for (let i = 0; i < frames; i++) {
    const batch = queue.splice(0, queue.length).filter(Boolean);
    t += 16.7;
    for (const cb of batch) cb(t);
  }
}

step(90); // let the intro camera settle

if (process.env.SETUP) {
  // eslint-disable-next-line no-eval
  window.eval(process.env.SETUP);
  step(30);
}

const canvasEl = window.document.getElementById('scene');
const entry = backing.get(canvasEl);
fs.writeFileSync(OUT, entry.canvas.toBuffer('image/png'));
console.log('wrote', OUT, entry.canvas.width + 'x' + entry.canvas.height, 'frames', 90);
console.log('stats', JSON.stringify(window.city.view.getStats()));

process.exit(0);
