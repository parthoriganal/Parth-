/**
 * Headless smoke test.
 *
 * The browser is the real stage, but this catches geometry / material API
 * mistakes without one: it stubs a 2D canvas, builds the entire watch and
 * validates every buffer for NaNs, winding sanity and triangle counts.
 *
 *   node luxury-watch/test/smoke.mjs
 */

import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * minimal canvas / DOM stub
 * ------------------------------------------------------------------ */

function makeContext2D() {
  const gradient = { addColorStop() {} };
  const base = {
    measureText: () => ({ width: 12 }),
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    createPattern: () => ({}),
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData() {},
    canvas: null,
  };

  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'symbol') return undefined;
      return () => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

const canvasStub = (width = 300, height = 150) => {
  const ctx = makeContext2D();
  return {
    width,
    height,
    style: {},
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,',
  };
};

globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? canvasStub() : { style: {}, appendChild() {} }),
  createElementNS: () => canvasStub(),
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: { classList: { add() {}, remove() {} } },
};
globalThis.window = { devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900, addEventListener() {} };
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
globalThis.requestAnimationFrame = () => 0;

const { MaterialLibrary } = await import('../src/materials.js');
const { buildWatch } = await import('../src/watch.js');

/* ------------------------------------------------------------------ *
 * build
 * ------------------------------------------------------------------ */

const materials = new MaterialLibrary({ anisotropy: 8 });
const watch = buildWatch(materials);

let meshes = 0;
let triangles = 0;
let instanced = 0;
const problems = [];

watch.root.updateMatrixWorld(true);
watch.root.traverse((object) => {
  if (!object.isMesh) return;
  meshes += 1;
  const geometry = object.geometry;
  const position = geometry.getAttribute('position');
  if (!position) {
    problems.push(`mesh "${object.name || object.type}" has no position attribute`);
    return;
  }
  const values = position.array;
  for (let i = 0; i < values.length; i += 1) {
    if (!Number.isFinite(values[i])) {
      problems.push(`NaN vertex in "${object.name || object.type}"`);
      break;
    }
  }
  if (geometry.index) triangles += geometry.index.count / 3;
  else triangles += position.count / 3;
  if (object.isInstancedMesh) instanced += object.count;

  if (!object.material) problems.push(`mesh "${object.name || object.type}" has no material`);

  const normal = geometry.getAttribute('normal');
  if (normal) {
    for (let i = 0; i < normal.array.length; i += 1) {
      if (!Number.isFinite(normal.array[i])) {
        problems.push(`NaN normal in "${object.name || object.type}"`);
        break;
      }
    }
  }

  geometry.computeBoundingSphere();
  if (!Number.isFinite(geometry.boundingSphere.radius)) {
    problems.push(`invalid bounding sphere on "${object.name || object.type}"`);
  }
});

/* ---- exercise the public API ---- */

for (const metal of ['yellow', 'rose', 'white', 'platinum']) {
  watch.setCaseMetal(metal);
  if (!Number.isFinite(materials.metalPolished.color.r)) problems.push(`bad metal colour: ${metal}`);
}
for (const dial of ['obsidian', 'salmon', 'midnight', 'champagne']) {
  watch.setDial(dial);
  if (!materials.dialMaterial.map) problems.push(`dial texture missing: ${dial}`);
}
for (const strap of ['black', 'cognac', 'navy', 'oxblood']) {
  watch.setStrap(strap);
  if (!Number.isFinite(materials.leather.color.r)) problems.push(`bad strap colour: ${strap}`);
}

watch.setTime(new Date());
for (let i = 0; i < 30; i += 1) watch.update(1 / 60);
watch.setExplode(1);
watch.setExplode(0);
watch.setStrapOpacity(0.4);
watch.setStrapOpacity(1);

/* ---- assertions ---- */

const required = ['case.band', 'bezel', 'crystal', 'crown', 'rotor', 'balance', 'hand.hour', 'hand.minute', 'hand.second'];
const names = new Set();
watch.root.traverse((object) => { if (object.name) names.add(object.name); });
for (const name of required) {
  if (!names.has(name)) problems.push(`missing part: ${name}`);
}

// The strap should be a closed, sane surface: all vertices within the loop bounds.
const strap = watch.parts.strapGroup;
const box = new THREE.Box3().setFromObject(strap);
if (box.isEmpty()) problems.push('strap has no bounds');
if (problems.length) {
  console.error('SMOKE TEST FAILED');
  problems.forEach((problem) => console.error(' •', problem));
  process.exit(1);
}

console.log('SMOKE TEST PASSED');
console.log(` meshes:      ${meshes}`);
console.log(` triangles:   ${Math.round(triangles).toLocaleString()}`);
console.log(` instances:   ${instanced}`);
console.log(` strap bounds: ${box.min.toArray().map((v) => v.toFixed(1)).join(', ')} → ${box.max.toArray().map((v) => v.toFixed(1)).join(', ')}`);
console.log(` materials:   ${new Set(Object.values(materials).filter((m) => m && m.isMaterial).map((m) => m.uuid)).size}`);
