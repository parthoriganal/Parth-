/**
 * Shader compile test.
 *
 * Every shader in the film is compiled here by the real Khronos reference
 * compiler (glslangValidator) using the exact prefix three.js injects for a
 * ShaderMaterial. A typo, a missing varying, an uninitialised variable or a
 * driver-hostile construct fails the test instead of failing silently in the
 * browser as a black screen.
 *
 *   node test/shaders.mjs
 *   GLSLANG=/path/to/glslangValidator node test/shaders.mjs
 *
 * The validator is a test-only tool: the project itself ships no dependencies.
 * If it is not installed the test reports SKIP and still checks the static
 * properties of every shader (balanced braces, no banned built-ins).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as S from '../assets/core/shaders.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/* three.js WebGLProgram prefixes, reduced to what a ShaderMaterial receives
   (no instancing, no shadows, no fog — this project uses none of them). */
const VERT_PREFIX = `#version 100
precision highp float;
precision highp int;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
`;

const FRAG_PREFIX = `#version 100
precision highp float;
precision highp int;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
`;

const PAIRS = [
  ['sky', S.SKY_VERT, S.SKY_FRAG],
  ['cel', S.CEL_VERT, S.CEL_FRAG],
  ['shard', S.SHARD_VERT, S.CEL_FRAG],
  ['ink', S.INK_VERT, S.INK_FRAG],
  ['portal', S.PORTAL_VERT, S.PORTAL_FRAG],
  ['glow', S.GLOW_VERT, S.GLOW_FRAG],
  ['shaft', S.SHAFT_VERT, S.SHAFT_FRAG],
  ['dust', S.DUST_VERT, S.DUST_FRAG],
  ['vortex', S.VORTEX_VERT, S.VORTEX_FRAG],
  ['fullscreen-bright', S.FS_VERT, S.BRIGHT_FRAG],
  ['fullscreen-blur', S.FS_VERT, S.BLUR_FRAG],
  ['fullscreen-composite', S.FS_VERT, S.COMPOSITE_FRAG]
];

/* ── locate the validator ─────────────────────────────────────────────────── */

function findValidator() {
  const candidates = [
    process.env.GLSLANG,
    path.join(here, '../node_modules/glslang-validator-prebuilt-predownloaded/bin/glslangValidator.linux'),
    '/tmp/glslv/node_modules/glslang-validator-prebuilt-predownloaded/bin/glslangValidator.linux'
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        fs.accessSync(c, fs.constants.X_OK);
        return c;
      }
    } catch {
      /* keep looking */
    }
  }
  for (const name of ['glslangValidator', 'glslang']) {
    try {
      const found = execFileSync('which', [name], { encoding: 'utf8' }).trim();
      if (found) return found;
    } catch {
      /* not in PATH */
    }
  }
  return null;
}

/* ── static checks that run even without the validator ───────────────────── */

const errors = [];
const notes = [];

function staticCheck(name, stage, src) {
  if (!src || typeof src !== 'string' || src.trim().length < 40) {
    errors.push(`${name}.${stage}: shader source is empty`);
    return;
  }
  let depth = 0;
  for (const ch of src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth < 0) break;
  }
  if (depth !== 0) errors.push(`${name}.${stage}: unbalanced braces (${depth})`);

  /* derivatives and dynamic loops are the two things that reliably break on
     old mobile GLES2 drivers — this project promises neither */
  for (const banned of ['dFdx(', 'dFdy(', 'fwidth(']) {
    if (src.includes(banned)) errors.push(`${name}.${stage}: uses ${banned} (not portable to GLES2 mobile)`);
  }
  const frag = stage === 'frag';
  if (frag && !/gl_FragColor|gl_FragData/.test(src)) {
    errors.push(`${name}.${stage}: never writes gl_FragColor`);
  }
  if (!frag && !/gl_Position/.test(src)) {
    errors.push(`${name}.${stage}: never writes gl_Position`);
  }
  if (/__LIB__/.test(src)) errors.push(`${name}.${stage}: library placeholder was not substituted`);

  /* every uniform sampled as a texture must be declared sampler2D */
  const used = new Set();
  const declaredTex = new Set();
  for (const m of src.matchAll(/texture2D\s*\(\s*([A-Za-z_]\w*)/g)) used.add(m[1]);
  for (const m of src.matchAll(/uniform\s+sampler2D\s+([A-Za-z_]\w*)/g)) declaredTex.add(m[1]);
  for (const u of used) {
    if (!declaredTex.has(u)) errors.push(`${name}.${stage}: texture2D(${u}) without a sampler2D declaration`);
  }
}

/* ── compile with glslang ────────────────────────────────────────────────── */

function tmpWrite(dir, file, contents) {
  const p = path.join(dir, file);
  fs.writeFileSync(p, contents);
  return p;
}

const validator = findValidator();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'veilbreak-glsl-'));

let compiled = 0;
for (const [name, vert, frag] of PAIRS) {
  staticCheck(name, 'vert', vert);
  staticCheck(name, 'frag', frag);

  if (!validator) continue;

  const vp = tmpWrite(tmp, `${name}.vert`, VERT_PREFIX + vert);
  const fp = tmpWrite(tmp, `${name}.frag`, FRAG_PREFIX + frag);
  for (const [stage, file] of [['vert', vp], ['frag', fp]]) {
    try {
      execFileSync(validator, ['-S', stage, file], { encoding: 'utf8', stdio: 'pipe' });
      compiled++;
    } catch (err) {
      const out = `${err.stdout || ''}${err.stderr || ''}`.trim() || String(err.message);
      errors.push(`${name}.${stage}: GLSL compile failed\n${out.split('\n').map((l) => '      ' + l).join('\n')}`);
    }
  }
}

fs.rmSync(tmp, { recursive: true, force: true });

/* ── report ──────────────────────────────────────────────────────────────── */

const pairs = PAIRS.length;
console.log(`shader pairs : ${pairs}`);
console.log(`validator    : ${validator || 'not installed'}`);
console.log(`compiled     : ${validator ? compiled + ' / ' + pairs * 2 : 'skipped (static checks only)'}`);
if (!validator) notes.push('install glslangValidator to compile-check the shaders');
if (notes.length) notes.forEach((n) => console.log('note         : ' + n));

if (errors.length) {
  console.error('\nFAILED\n  - ' + errors.join('\n  - '));
  process.exit(1);
}
console.log('\nall shaders OK');
