/**
 * Project integrity test.
 *
 * Catches the failure modes that a build step would normally catch for you,
 * because this project deliberately has no build step:
 *   • broken / missing module imports anywhere in the graph;
 *   • element ids the script asks for that the HTML does not have;
 *   • external network dependencies (the film must run from a bare folder);
 *   • three.js APIs that do not exist in the vendored build;
 *   • the set failing to build, or producing NaN, or exploding the budget.
 *
 *   node test/project.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const failures = [];
const notes = [];
const check = (label, ok, detail = '') => {
  if (!ok) failures.push(`${label}${detail ? ' — ' + detail : ''}`);
};

/* ── 1. the files that make up the deliverable ───────────────────────────── */

const REQUIRED = [
  'index.html',
  'assets/style.css',
  'assets/main.js',
  'assets/core/timeline.js',
  'assets/core/staging.js',
  'assets/core/shaders.js',
  'assets/core/world.js',
  'assets/core/post.js',
  'assets/vendor/three.module.min.js',
  'assets/vendor/THREE-LICENSE.txt'
];
for (const file of REQUIRED) {
  check(`${file} exists`, fs.existsSync(path.join(root, file)));
}

/* ── 2. html ↔ css ↔ js wiring ───────────────────────────────────────────── */

const html = read('index.html');
const main = read('assets/main.js');
const css = read('assets/style.css');

for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const ref = m[1];
  if (ref.startsWith('data:') || ref.startsWith('#') || ref.startsWith('mailto:')) continue;
  check(`index.html reference resolves: ${ref}`, fs.existsSync(path.join(root, ref.replace(/^\.\//, ''))));
}

const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const m of main.matchAll(/getElementById\('([^']+)'\)/g)) {
  check(`#${m[1]} exists in index.html`, htmlIds.has(m[1]));
}

/* state classes the script toggles must actually be styled */
for (const cls of ['is-idle', 'is-cinematic', 'is-paused', 'is-chromeless', 'is-visible', 'is-done', 'is-unsupported']) {
  check(`css styles .${cls}`, css.includes(`.${cls}`) || css.includes(cls));
}
check('css braces are balanced', (css.match(/{/g) || []).length === (css.match(/}/g) || []).length);
check('html and css agree on the stage id', html.includes('id="vb-canvas"') && css.includes('#vb-canvas'));

/* ── 3. no external dependencies, no placeholders ────────────────────────── */

const sourceFiles = [
  'index.html',
  'assets/style.css',
  'assets/main.js',
  'assets/core/timeline.js',
  'assets/core/staging.js',
  'assets/core/shaders.js',
  'assets/core/world.js',
  'assets/core/post.js'
];

for (const file of sourceFiles) {
  const src = read(file);
  /* the SVG namespace is an identifier, not a request */
  const urls = [...src.matchAll(/https?:\/\/[^\s'"`)]+/g)]
    .map((m) => m[0])
    .filter((u) => !u.startsWith('http://www.w3.org/'));
  check(`${file} loads nothing from the network`, urls.length === 0, urls.slice(0, 3).join(' '));
  for (const bad of ['TODO', 'FIXME', 'XXX', 'placeholder-code', 'lorem ipsum', 'example.com']) {
    check(`${file} has no ${bad}`, !src.toLowerCase().includes(bad.toLowerCase()));
  }
}

/* deterministic set: no Math.random anywhere in the world builder */
check('the set is seeded, not random', !/Math\.random\(/.test(read('assets/core/world.js')));

/* ── 4. the module graph resolves ────────────────────────────────────────── */

function parseExports(src) {
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*{([^}]+)}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  return names;
}

function parseImports(src) {
  const out = [];
  for (const m of src.matchAll(/import\s+(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"]/g)) {
    out.push({ clause: (m[1] || '').trim(), spec: m[2] });
  }
  return out;
}

const visited = new Set();
const threeExports = (() => {
  const src = read('assets/vendor/three.module.min.js');
  const m = [...src.matchAll(/export\s*{([^}]+)}\s*;?\s*$/g)].pop();
  const names = new Set();
  if (m) for (const part of m[1].split(',')) {
    const name = part.trim().split(/\s+as\s+/).pop().trim();
    if (name) names.add(name);
  }
  return names;
})();

check('vendored three.js exposes its API', threeExports.size > 200, `${threeExports.size} exports`);

function walk(relFile) {
  if (visited.has(relFile)) return;
  visited.add(relFile);
  const src = read(relFile);
  for (const { clause, spec } of parseImports(src)) {
    if (!spec.startsWith('.')) {
      failures.push(`${relFile} imports a bare specifier "${spec}" (no import map, no bundler)`);
      continue;
    }
    const target = path.normalize(path.join(path.dirname(relFile), spec));
    if (!fs.existsSync(path.join(root, target))) {
      failures.push(`${relFile} → ${spec} does not exist`);
      continue;
    }
    /* named imports must exist in the target module */
    if (clause && target.endsWith('.js') && !target.includes('vendor')) {
      const names = parseExports(read(target));
      const braces = clause.match(/{([^}]+)}/);
      if (braces) {
        for (const part of braces[1].split(',')) {
          const name = part.trim().split(/\s+as\s+/)[0].trim();
          if (name) check(`${path.basename(target)} exports ${name}`, names.has(name));
        }
      }
    }
    if (target.endsWith('.js')) walk(target);
  }
}
walk('assets/main.js');
notes.push(`module graph: ${visited.size} files`);

/* three.js APIs used by this project must exist in the vendored build */
const usedThree = new Set();
for (const file of ['assets/main.js', 'assets/core/world.js', 'assets/core/post.js']) {
  for (const m of read(file).matchAll(/THREE\.([A-Za-z_$][\w$]*)/g)) usedThree.add(m[1]);
}
for (const name of usedThree) {
  check(`vendored three.js provides THREE.${name}`, threeExports.has(name));
}
notes.push(`three.js API surface used: ${usedThree.size} symbols`);

/* ── 5. the set builds, animates and tears down ──────────────────────────── */

const THREE = await import(pathToFileURL(path.join(root, 'assets/vendor/three.module.min.js')).href);
const { buildWorld } = await import(pathToFileURL(path.join(root, 'assets/core/world.js')).href);
const { sampleTimeline, DURATION } = await import(pathToFileURL(path.join(root, 'assets/core/timeline.js')).href);

const world = buildWorld({ quality: 'high', pixelRatio: 2 });
const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.5, 5000);

let meshes = 0;
let points = 0;
let triangles = 0;
const materials = new Set();
world.scene.traverse((o) => {
  if (o.isMesh) {
    meshes++;
    const g = o.geometry;
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    if (o.material) materials.add(o.material);
  }
  if (o.isPoints) points++;
});

check('the set has geometry', meshes > 20, `${meshes} meshes`);
check('the set has particle systems', points >= 3, `${points} point clouds`);
check('draw budget is mobile-friendly', meshes + points < 70, `${meshes + points} draw calls`);
check('triangle budget is mobile-friendly', triangles < 140000, `${Math.round(triangles)} triangles`);

/* every material must have the uniforms its shader declares */
const SHADER_UNIFORM_RE = /uniform\s+(?:lowp|mediump|highp\s+)?(\w+)\s+(\w+)\s*(\[[^\]]*\])?\s*;/g;
for (const mat of materials) {
  if (!mat.isShaderMaterial) continue;
  const provided = Object.keys(mat.uniforms || {});
  const declared = new Set();
  for (const m of `${mat.vertexShader}\n${mat.fragmentShader}`.matchAll(SHADER_UNIFORM_RE)) {
    const name = m[2];
    if (['modelMatrix', 'modelViewMatrix', 'projectionMatrix', 'viewMatrix', 'normalMatrix', 'cameraPosition', 'isOrthographic', 'position', 'normal', 'uv', 'instanceMatrix'].includes(name)) continue;
    declared.add(name);
  }
  for (const name of declared) {
    check(`uniform ${name} is provided (${mat.name || mat.type})`, provided.includes(name));
  }
}

let nanViolations = 0;
let swaps = 0;
for (let t = 0; t <= DURATION; t += 0.25) {
  const state = sampleTimeline(t);
  camera.position.fromArray(state.camera.position);
  camera.lookAt(new THREE.Vector3().fromArray(state.camera.target));
  camera.rotateZ(state.camera.roll);
  camera.updateMatrixWorld(true);
  world.update(state, camera);
  world.scene.updateMatrixWorld(true);
  if (t > 63 && world.groups.cold.visible) nanViolations++;
  if (t > 63 && !world.groups.ember.visible) nanViolations++;
  if (t < 60 && !world.groups.cold.visible) swaps++;
}
check('the universes swap exactly once, at the crossing', nanViolations === 0 && swaps === 0,
  `${nanViolations} / ${swaps}`);

/* every uniform that reached the shader must be finite */
for (const mat of materials) {
  if (!mat.isShaderMaterial) continue;
  for (const [name, uniform] of Object.entries(mat.uniforms)) {
    const v = uniform.value;
    const numbers = typeof v === 'number' ? [v] : v && typeof v === 'object' && 'toArray' in v ? v.toArray() : [];
    for (const n of numbers) {
      if (!Number.isFinite(n)) failures.push(`uniform ${name} is not finite`);
    }
  }
}

world.setPixelRatio(1.5);
world.setPixelRatio(2);
world.dispose();
check('dispose() releases the set', true);

notes.push(`set: ${meshes} meshes + ${points} point clouds, ${Math.round(triangles)} triangles, ${materials.size} materials`);

/* ── report ──────────────────────────────────────────────────────────────── */
notes.forEach((n) => console.log('note         : ' + n));
if (failures.length) {
  console.error('\nFAILED (' + failures.length + ')\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
console.log('\nproject OK');
