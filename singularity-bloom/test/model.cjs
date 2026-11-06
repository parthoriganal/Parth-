#!/usr/bin/env node
/**
 * Smoke test for the exported model — no three.js, no browser.
 * Parses the GLB container + JSON chunk and asserts the sculpture is intact.
 *
 *   node singularity-bloom/test/model.cjs [path/to/model.glb]
 */
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '..', 'viewer', 'assets', 'model.glb');

function readGlb(buf) {
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67) throw new Error('not a GLB (bad magic)');
  const version = buf.readUInt32LE(4);
  const length = buf.readUInt32LE(8);
  if (length !== buf.length) throw new Error(`declared length ${length} != file ${buf.length}`);

  let off = 12;
  let json = null;
  let binBytes = 0;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
    if (type === 0x004e4942) binBytes = len;
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  if (!json) throw new Error('no JSON chunk');
  return { version, json, binBytes };
}

const buf = fs.readFileSync(file);
const { version, json, binBytes } = readGlb(buf);

const meshes = json.meshes || [];
const materials = json.materials || [];
const nodes = json.nodes || [];
const accessors = json.accessors || [];

let triangles = 0;
let vertices = 0;
for (const mesh of meshes) {
  for (const prim of mesh.primitives || []) {
    const posAcc = accessors[prim.attributes.POSITION];
    vertices += posAcc ? posAcc.count : 0;
    if (prim.indices !== undefined) triangles += accessors[prim.indices].count / 3;
    else if (posAcc) triangles += posAcc.count / 3;
  }
}

const names = nodes.map((n) => n.name).filter(Boolean);
const has = (re) => names.some((n) => re.test(n));

const checks = [
  ['glTF version 2', version === 2],
  ['binary payload present', binBytes > 0],
  ['nav default scene', json.scenes && json.scenes.length >= 1],
  ['the core survived', has(/Singularity/i)],
  ['the lotus petals survived', has(/Petal/i)],
  ['torus knots survived', has(/Knot/i)],
  ['the shard swarm survived', has(/Shard/i)],
  ['the dust belt survived', has(/Dust/i)],
  ['at least 8 materials', materials.length >= 8],
  ['at least 20k triangles', triangles >= 20000],
  ['set dressing excluded (no floor/haze)', !has(/Floor|Haze|Halo/i)],
  ['model is web-sized (< 6 MB)', buf.length < 6e6],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}`);
}

console.log(
  `\n${path.relative(process.cwd(), file)} — ${(buf.length / 1e6).toFixed(2)} MB · ` +
  `${meshes.length} meshes · ${nodes.length} nodes · ${materials.length} materials · ` +
  `${Math.round(triangles).toLocaleString()} tris · ${vertices.toLocaleString()} verts`
);

// ------------------------------------------------------------------ OBJ twin
const objPath = path.join(__dirname, '..', 'docs', 'singularity_bloom.obj');
if (fs.existsSync(objPath)) {
  const lines = fs.readFileSync(objPath, 'utf8').split('\n');
  let v = 0, f = 0;
  const mats = new Set();
  for (const line of lines) {
    if (line.startsWith('v ')) v++;
    else if (line.startsWith('f ')) f++;
    else if (line.startsWith('usemtl ')) mats.add(line.slice(7).trim());
  }
  const objChecks = [
    ['obj: vertices present', v > 40000],
    ['obj: triangles match glb (~92k)', Math.abs(f - Math.round(triangles)) < 2000],
    ['obj: all 10 materials referenced', mats.size >= 10],
  ];
  for (const [label, ok] of objChecks) {
    if (!ok) failed++;
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}`);
  }
  console.log(`\n${path.basename(objPath)} — ${(fs.statSync(objPath).size / 1e6).toFixed(2)} MB · ` +
    `${v.toLocaleString()} verts · ${f.toLocaleString()} tris · ${mats.size} materials`);
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
