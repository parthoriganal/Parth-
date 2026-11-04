/**
 * Geometry proxy renderer.
 *
 * There is no GPU in a CI container, so this walks the *real* three.js scene
 * graph built by world.js, projects it through the *real* camera pose from
 * timeline.js and rasterises a flat, cel-shaded approximation on the CPU. It
 * is not the film: there is no GLSL, no bloom, no grain, no noise. What it
 * does prove is staging — scale, silhouette, framing, overlap, whether an act
 * actually shows what the storyboard claims it shows.
 *
 *   node test/preview.mjs                 # one frame per act → docs/proxy-*.png
 *   node test/preview.mjs 23 62.4 90      # specific story times
 *
 * The PNG encoder is written here rather than imported, for the same reason
 * the film has no dependencies: it is forty lines and one zlib call.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

const THREE = await import(pathToFileURL(path.join(root, 'assets/vendor/three.module.min.js')).href);
const { buildWorld } = await import(pathToFileURL(path.join(root, 'assets/core/world.js')).href);
const { sampleTimeline, effectiveFov } = await import(pathToFileURL(path.join(root, 'assets/core/timeline.js')).href);

/* ── a very small PNG writer ─────────────────────────────────────────────── */

function png(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

/* ── shading helpers (the same curves the GLSL uses) ─────────────────────── */

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6)));
  return t * t * (3 - 2 * t);
};
const aces = (x) => Math.max(0, Math.min(1, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)));

function isShown(object) {
  let o = object;
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

/* ── the rasteriser ──────────────────────────────────────────────────────── */

const W = Number(process.env.W || 640);
const H = Number(process.env.H || 360);
const times = process.argv.slice(2).filter((a) => !a.startsWith('-')).map(Number);
const shots = times.length ? times : [6, 23, 44, 60, 64.5, 90];

const world = buildWorld({ quality: 'high', pixelRatio: 1 });
const camera = new THREE.PerspectiveCamera(45, W / H, 0.5, 5000);

const color = new THREE.Color();

function materialLook(mat) {
  if (!mat) return null;
  if (mat.uniforms) {
    const u = mat.uniforms;
    /* the ink hulls are a rendering trick, not geometry: skip them */
    if (u.uThickness) return null;
    /* the sky dome is replaced by the background gradient below */
    if (u.uDeep) return null;
    const additive = mat.blending === THREE.AdditiveBlending;
    if (additive) {
      /* light cards and vortex points are pure glow; the CPU proxy cannot
         represent them honestly, so they are left out of the staging check */
      return null;
    }
    if (false) {
      return {
        base: u.uInner ? u.uInner.value : u.uColor ? u.uColor.value : new THREE.Color(0.4, 0.7, 1),
        shade: new THREE.Color(0, 0, 0),
        rimCol: u.uAccent ? u.uAccent.value : u.uColor ? u.uColor.value : new THREE.Color(0.4, 0.7, 1),
        rim: 0,
        light: new THREE.Vector3(0, 1, 0),
        additive: true,
        opacity: u.uPower ? Math.min(1, u.uPower.value) : 1
      };
    }
    return {
      base: u.uBase ? u.uBase.value : u.uInner ? u.uInner.value : new THREE.Color(0.5, 0.5, 0.5),
      shade: u.uShade ? u.uShade.value : new THREE.Color(0.03, 0.03, 0.05),
      rimCol: u.uRimCol ? u.uRimCol.value : u.uColor ? u.uColor.value : new THREE.Color(0.5, 0.7, 1),
      rim: u.uRim ? u.uRim.value : 0.2,
      light: (u.uLightDir ? u.uLightDir.value : new THREE.Vector3(-0.4, 0.7, 0.6)).clone().normalize(),
      additive: false,
      opacity: u.uOpacity ? u.uOpacity.value : 1
    };
  }
  if (mat.color) {
    return {
      base: mat.color,
      shade: mat.color,
      rimCol: mat.color,
      rim: 0,
      light: new THREE.Vector3(-0.4, 0.7, 0.6).normalize(),
      additive: true,
      opacity: 1,
      flat: true
    };
  }
  return null;
}

function renderFrame(t) {
  const state = sampleTimeline(t);
  camera.fov = effectiveFov(state.camera.fov, W / H);
  camera.aspect = W / H;
  camera.position.fromArray(state.camera.position);
  camera.up.set(0, 1, 0);
  camera.lookAt(new THREE.Vector3().fromArray(state.camera.target));
  camera.rotateZ(state.camera.roll);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  world.update(state, camera);
  world.scene.updateMatrixWorld(true);

  const colorBuf = new Float32Array(W * H * 3);
  const depth = new Float32Array(W * H).fill(Infinity);

  /* background: an approximation of the painted sky */
  const alt = state.alt;
  const skyDeep = [0.016, 0.024, 0.055].map((c, i) => c * (1 - alt) + [0.035, 0.016, 0.02][i] * alt);
  const skyMid = [0.04, 0.14, 0.21].map((c, i) => c * (1 - alt) + [0.21, 0.06, 0.05][i] * alt);
  for (let y = 0; y < H; y++) {
    const v = y / H;
    const band = smoothstep(0.05, 0.55, Math.abs(v - 0.46) * 1.6);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      for (let c = 0; c < 3; c++) colorBuf[i + c] = skyDeep[c] + (skyMid[c] - skyDeep[c]) * (1 - band) * 0.9;
    }
  }

  const verts = [];
  const camPos = camera.position;

  world.scene.traverse((object) => {
    if (!isShown(object)) return;
    if (object.isMesh) {
      const geo = object.geometry;
      const pos = geo.attributes.position;
      const index = geo.index;
      const look = materialLook(object.material);
      if (!look) return;
      const m = object.matrixWorld;
      const count = index ? index.count : pos.count;
      const triCount = Math.floor(count / 3);

      for (let tri = 0; tri < triCount; tri++) {
        let anyFront = false;
        const pts = [];
        for (let k = 0; k < 3; k++) {
          const vi = index ? index.getX(tri * 3 + k) : tri * 3 + k;
          const v = verts[vi] || (verts[vi] = new THREE.Vector3());
          v.fromBufferAttribute(pos, vi).applyMatrix4(m);
          const camSpace = v.clone().applyMatrix4(camera.matrixWorldInverse);
          if (camSpace.z > -camera.near) { pts.push(null); continue; }
          const ndc = v.clone().project(camera);
          pts.push({ x: (ndc.x * 0.5 + 0.5) * W, y: (1 - (ndc.y * 0.5 + 0.5)) * H, z: ndc.z, world: v.clone() });
        }
        if (pts.some((p) => !p)) continue;

        const e1 = pts[1].world.clone().sub(pts[0].world);
        const e2 = pts[2].world.clone().sub(pts[0].world);
        const normal = e1.cross(e2).normalize();
        const view = camPos.clone().sub(pts[0].world).normalize();
        const facing = normal.dot(view);
        if (facing < 0 && !look.additive) {
          /* back face — the double-sided glow cards and the sky are exempt */
          if (!object.material.side || object.material.side === THREE.FrontSide) continue;
          normal.negate();
        } else {
          anyFront = true;
        }
        const toCam = normal.dot(view) < 0 ? -1 : 1;
        const n = normal.clone().multiplyScalar(toCam);

        const lit = n.dot(look.light) * 0.5 + 0.5;
        const ramp =
          smoothstep(0.3, 0.38, lit) * 0.26 + smoothstep(0.52, 0.6, lit) * 0.34 + smoothstep(0.72, 0.8, lit) * 0.4;
        const fres = Math.pow(1 - Math.min(1, Math.abs(n.dot(view))), 2.4);
        const shade = [look.shade.r, look.shade.g, look.shade.b];
        const base = [look.base.r * 1.18, look.base.g * 1.18, look.base.b * 1.18];
        const rimC = [look.rimCol.r, look.rimCol.g, look.rimCol.b];
        const rgb = [0, 0, 0];
        if (look.additive) {
          const k = 0.55 * look.opacity;
          for (let c = 0; c < 3; c++) rgb[c] = base[c] * k;
        } else {
          for (let c = 0; c < 3; c++) {
            rgb[c] = shade[c] + (base[c] - shade[c]) * ramp + rimC[c] * fres * look.rim * 0.9;
          }
        }

        /* rasterise */
        const minX = Math.max(0, Math.floor(Math.min(pts[0].x, pts[1].x, pts[2].x)));
        const maxX = Math.min(W - 1, Math.ceil(Math.max(pts[0].x, pts[1].x, pts[2].x)));
        const minY = Math.max(0, Math.floor(Math.min(pts[0].y, pts[1].y, pts[2].y)));
        const maxY = Math.min(H - 1, Math.ceil(Math.max(pts[0].y, pts[1].y, pts[2].y)));
        if (maxX < minX || maxY < minY) continue;
        const ax = pts[0].x, ay = pts[0].y, bx = pts[1].x, by = pts[1].y, cx = pts[2].x, cy = pts[2].y;
        const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
        if (Math.abs(area) < 1e-6) continue;

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const px = x + 0.5;
            const py = y + 0.5;
            const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area;
            const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area;
            const w2 = 1 - w0 - w1;
            if (w0 < 0 || w1 < 0 || w2 < 0) continue;
            const z = w0 * pts[0].z + w1 * pts[1].z + w2 * pts[2].z;
            const idx = y * W + x;
            if (z >= depth[idx] && !look.additive) continue;
            if (!look.additive) depth[idx] = z;
            const o = idx * 3;
            for (let c = 0; c < 3; c++) {
              colorBuf[o + c] = look.additive ? colorBuf[o + c] + rgb[c] : rgb[c];
            }
          }
        }
      }
    } else if (object.isPoints) {
      const look = materialLook(object.material);
      const pos = object.geometry.attributes.position;
      const m = object.matrixWorld;
      const v = new THREE.Vector3();
      const count = Math.min(pos.count, 2600);
      for (let i = 0; i < count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m);
        const camSpace = v.clone().applyMatrix4(camera.matrixWorldInverse);
        if (camSpace.z > -camera.near) continue;
        const ndc = v.clone().project(camera);
        const x = Math.round((ndc.x * 0.5 + 0.5) * W);
        const y = Math.round((1 - (ndc.y * 0.5 + 0.5)) * H);
        if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
        const idx = y * W + x;
        if (ndc.z > 1) continue;
        const bright = 0.10 * (0.4 + state.portal * 0.8);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const falloff = dx === 0 && dy === 0 ? 1 : 0.35;
            const o = ((y + dy) * W + (x + dx)) * 3;
            for (let c = 0; c < 3; c++) {
              const tint = look ? [look.base.r, 0.8, 1.0][c] : 0.8;
              colorBuf[o + c] += bright * falloff * tint;
            }
          }
        }
      }
    }
  });

  /* tone map + present */
  const out = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    for (let c = 0; c < 3; c++) {
      let v = colorBuf[i * 3 + c] * state.exposure;
      v = aces(v);
      v = Math.pow(v, 1 / 2.2) * state.fade;
      if (state.flash > 0.01) v = v * (1 - state.flash) + state.flash;
      out[i * 3 + c] = Math.max(0, Math.min(255, Math.round(v * 255)));
    }
  }
  return { png: png(W, H, out), state };
}

const outDir = path.join(root, 'docs');
fs.mkdirSync(outDir, { recursive: true });
for (const t of shots) {
  const { png: buffer, state } = renderFrame(t);
  const name = `proxy-t${String(t).replace('.', '_')}.png`;
  fs.writeFileSync(path.join(outDir, name), buffer);
  console.log(
    `${name.padEnd(22)} act ${state.act.numeral.padEnd(3)} ${state.act.title.padEnd(14)} ` +
      `t=${t}s fov=${effectiveFov(state.camera.fov, W / H).toFixed(0)}° alt=${state.alt.toFixed(2)}`
  );
}
world.dispose();
console.log(`wrote ${shots.length} proxy frames to ${path.join(root, 'docs')}`);
