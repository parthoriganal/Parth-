/**
 * VEILBREAK — set construction.
 *
 * Two universes occupy the same coordinates. The camera crosses the aperture
 * at story time 62.35 s, and the flash hides the swap: the cold Archive
 * becomes a shattered ember ruin, the nebula turns to burning dust, two suns
 * come up behind the broken ring, and a watcher stands on a drifting shard.
 *
 * Everything is procedural geometry + GLSL. Nothing is loaded from disk, so
 * the film boots from a single static folder with no network requests beyond
 * the three.js module itself.
 *
 * Draw-call budget: ~50 for the whole film (both universes), which is what
 * keeps it at 60fps on a phone. Repeated geometry is merged on the CPU at
 * build time and animated in the vertex shader.
 */

import * as THREE from '../vendor/three.module.min.js';
import { STAGE } from './staging.js';
import {
  SKY_VERT,
  SKY_FRAG,
  CEL_VERT,
  CEL_FRAG,
  SHARD_VERT,
  INK_VERT,
  INK_FRAG,
  PORTAL_VERT,
  PORTAL_FRAG,
  GLOW_VERT,
  GLOW_FRAG,
  SHAFT_VERT,
  SHAFT_FRAG,
  DUST_VERT,
  DUST_FRAG,
  VORTEX_VERT,
  VORTEX_FRAG
} from './shaders.js';

/* ────────────────────────────────────────────────────────────────────────────
   Palette — one identity, two universes
   ──────────────────────────────────────────────────────────────────────────── */

const COLD = {
  skyDeep: 0x04060e,
  skyMid: 0x0a2436,
  skyAccent: 0x1f97ad,
  skyStar: 0xbfe2ff,

  stone: 0x3d5468,
  stoneShade: 0x0a141f,
  key: 0xffe2b8,
  rim: 0x74e6ff,

  metal: 0x2f4457,
  metalShade: 0x061019,
  glyph: 0x9ff4ff,

  slab: 0x2b3f52,
  slabShade: 0x08121c,

  portalInner: 0xf2fbff,
  portalOuter: 0x2f9dff,
  portalAccent: 0x9ff2ff,

  dust: [0.55, 0.78, 1.0],
  dustTintA: 0x8fd4ff,
  dustTintB: 0xbfe6ff
};

const EMBER = {
  skyDeep: 0x090407,
  skyMid: 0x36100f,
  skyAccent: 0xc2471c,
  skyStar: 0xffd2a0,

  stone: 0x6a3a30,
  stoneShade: 0x150607,
  key: 0xffb070,
  rim: 0xff7a3a,

  metal: 0x59302a,
  metalShade: 0x120506,
  glyph: 0xffb066,

  slab: 0x4a2a24,
  slabShade: 0x120606,

  portalInner: 0xfff2d8,
  portalOuter: 0xff7a2a,
  portalAccent: 0xffc46a,

  dust: [1.0, 0.55, 0.28],
  dustTintA: 0xffa055,
  dustTintB: 0xffd08a
};

/* Atmospheric perspective. The cold universe hazes to teal, the ember one to
   a burning brown — distant geometry dissolves into the painted sky instead of
   sitting on top of it. */
const HAZE_COLD = 0x14384e;
const HAZE_EMBER = 0x3d1712;

const LIGHT_COLD = new THREE.Vector3(-0.38, 0.74, 0.56).normalize();
const LIGHT_EMBER = new THREE.Vector3(0.52, 0.44, 0.73).normalize();

/* ────────────────────────────────────────────────────────────────────────────
   Tiny deterministic helpers
   ──────────────────────────────────────────────────────────────────────────── */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0x5e11b4ea);
const rr = (a, b) => a + (b - a) * rand();

/** Concatenate geometries into one buffer — one draw call instead of N. */
function mergeGeometries(geometries) {
  const flat = geometries.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  for (const g of flat) total += g.attributes.position.count;

  const out = new THREE.BufferGeometry();
  for (const [name, itemSize] of [['position', 3], ['normal', 3], ['uv', 2]]) {
    const array = new Float32Array(total * itemSize);
    let offset = 0;
    for (const g of flat) {
      const attr = g.attributes[name];
      if (attr) array.set(attr.array, offset);
      offset += g.attributes.position.count * itemSize;
    }
    out.setAttribute(name, new THREE.BufferAttribute(array, itemSize));
  }
  return out;
}

/** Bake a transform into a copy of a geometry. */
function xform(geometry, { position, rotation, scale } = {}) {
  const g = geometry.clone();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  if (rotation) q.setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));
  m.compose(
    new THREE.Vector3(...(position || [0, 0, 0])),
    q,
    new THREE.Vector3(...(scale || [1, 1, 1]))
  );
  g.applyMatrix4(m);
  return g;
}

/* ────────────────────────────────────────────────────────────────────────────
   Materials
   ──────────────────────────────────────────────────────────────────────────── */

export function buildWorld(options = {}) {
  const quality = options.quality === 'low' ? 'low' : 'high';
  const pixelRatio = options.pixelRatio || 1;
  const low = quality === 'low';

  /* Uniform objects are shared by reference across materials, so one value
     update per frame drives the whole film. */
  const shared = {
    time: { value: 0 },
    alt: { value: 0 },
    power: { value: 0 },   // aperture energy
    structure: { value: 0 } // the Archive waking up
  };

  const scene = new THREE.Scene();
  const coldGroup = new THREE.Group();
  const emberGroup = new THREE.Group();
  scene.add(coldGroup, emberGroup);

  const billboards = [];
  const disposables = [];
  const track = (obj) => {
    disposables.push(obj);
    return obj;
  };

  const celMaterial = (o) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.time,
        uAlt: shared.alt,
        uPower: o.power || { value: 1 },
        uLightDir: { value: (o.lightDir || LIGHT_COLD).clone() },
        uLightDirB: { value: LIGHT_EMBER.clone() },
        uBase: { value: new THREE.Color(o.base) },
        uShade: { value: new THREE.Color(o.shade) },
        uKey: { value: new THREE.Color(o.key || COLD.key) },
        uRimCol: { value: new THREE.Color(o.rim || COLD.rim) },
        uBaseB: { value: new THREE.Color(o.baseB !== undefined ? o.baseB : o.base) },
        uShadeB: { value: new THREE.Color(o.shadeB !== undefined ? o.shadeB : o.shade) },
        uKeyB: { value: new THREE.Color(o.keyB !== undefined ? o.keyB : EMBER.key) },
        uRimColB: { value: new THREE.Color(o.rimB !== undefined ? o.rimB : EMBER.rim) },
        uRim: { value: o.rimStrength !== undefined ? o.rimStrength : 1.0 },
        uGlow: { value: o.glow || 0 },
        uOpacity: { value: o.opacity !== undefined ? o.opacity : 1 },
        uPattern: { value: o.pattern || 0 },
        uPaint: { value: o.paint !== undefined ? o.paint : 1.0 },
        uGlyphs: { value: o.glyphs || 18 },
        uAssemble: { value: o.assemble !== undefined ? o.assemble : 0.55 },
        uHazeColor: { value: new THREE.Color(o.hazeColor !== undefined ? o.hazeColor : HAZE_COLD) },
        uHazeNear: { value: o.hazeNear !== undefined ? o.hazeNear : 115 },
        uHazeFar: { value: o.hazeFar !== undefined ? o.hazeFar : 460 },
        uHazeAmount: { value: o.hazeAmount !== undefined ? o.hazeAmount : 0.92 }
      },
      vertexShader: o.shard ? SHARD_VERT : CEL_VERT,
      fragmentShader: CEL_FRAG,
      transparent: (o.opacity !== undefined && o.opacity < 1) || !!o.additive,
      depthWrite: !(o.opacity !== undefined && o.opacity < 1),
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: o.side || THREE.FrontSide
    });
    track(mat);
    return mat;
  };

  const inkMaterial = (thickness = 1, color = 0x05060d, opacity = 0.92, hazeColor = HAZE_COLD) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uThickness: { value: thickness },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
        uHazeColor: { value: new THREE.Color(hazeColor) },
        uHazeNear: { value: 115 },
        uHazeFar: { value: 460 },
        uHazeAmount: { value: 0.92 }
      },
      vertexShader: INK_VERT,
      fragmentShader: INK_FRAG,
      side: THREE.BackSide,
      transparent: opacity < 1,
      depthWrite: true
    });
    track(mat);
    return mat;
  };

  /** Adds a cel-shaded mesh, optionally with an inverted-hull ink outline. */
  const addCel = (parent, geometry, material, ink) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = true;
    parent.add(mesh);
    if (ink) {
      const hull = new THREE.Mesh(geometry, ink);
      hull.renderOrder = -1;
      parent.add(hull);
    }
    return mesh;
  };

  /* ── the sky: a painted dome that follows the camera ──────────────────── */
  const skyGeometry = track(new THREE.SphereGeometry(900, 40, 24));
  const skyMaterial = track(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.time,
        uAlt: shared.alt,
        uStars: { value: 1 },
        uDeep: { value: new THREE.Color(COLD.skyDeep) },
        uMid: { value: new THREE.Color(COLD.skyMid) },
        uAccent: { value: new THREE.Color(COLD.skyAccent) },
        uStar: { value: new THREE.Color(COLD.skyStar) },
        uDeepB: { value: new THREE.Color(EMBER.skyDeep) },
        uMidB: { value: new THREE.Color(EMBER.skyMid) },
        uAccentB: { value: new THREE.Color(EMBER.skyAccent) },
        uStarB: { value: new THREE.Color(EMBER.skyStar) }
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false
    })
  );
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  /* ── dust: the cold vacuum ────────────────────────────────────────────── */
  function makePoints(count, spread, seed, sizeRange, rise, colors) {
    const rnd = mulberry32(seed);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    const cols = new Float32Array(count * 3);
    const c = new THREE.Color();

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (rnd() - 0.5) * spread[0];
      positions[i * 3 + 1] = (rnd() - 0.5) * spread[1];
      positions[i * 3 + 2] = (rnd() - 0.5) * spread[2] + spread[3];
      seeds[i] = rnd();
      sizes[i] = sizeRange[0] + rnd() * (sizeRange[1] - sizeRange[0]);
      c.setHex(rnd() > 0.72 ? colors[1] : colors[0]);
      cols[i * 3 + 0] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(cols, 3));
    track(g);

    const m = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: shared.time,
          uAlt: shared.alt,
          uScale: { value: pixelRatio },
          uRise: { value: rise },
          uSpread: { value: 1 },
          uOpacity: { value: 1 },
          uTintA: { value: new THREE.Color(0xffffff) },
          uTintB: { value: new THREE.Color(0xffffff) }
        },
        vertexShader: DUST_VERT,
        fragmentShader: DUST_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );

    const points = new THREE.Points(g, m);
    points.frustumCulled = false;
    return { points, material: m };
  }

  const coldDust = makePoints(low ? 1500 : 3600, [520, 380, 640, 60], 1337, [0.5, 2.4], 0.0, [0x9fd4ff, 0xe8f4ff]);
  coldDust.material.uniforms.uOpacity.value = 0.85;
  coldGroup.add(coldDust.points);

  const emberDust = makePoints(low ? 900 : 2100, [420, 300, 460, -40], 90210, [0.7, 3.0], 1.1, [0xff9a4a, 0xffd9a0]);
  emberDust.material.uniforms.uOpacity.value = 0.9;
  emberDust.material.uniforms.uSpread.value = 0.7;
  emberGroup.add(emberDust.points);

  /* ── the Archive: rings, fins, struts, hanging slabs ─────────────────── */

  const archive = new THREE.Group();
  coldGroup.add(archive);

  const stoneMat = celMaterial({
    base: COLD.stone,
    shade: COLD.stoneShade,
    baseB: EMBER.stone,
    shadeB: EMBER.stoneShade,
    rim: COLD.rim,
    rimB: EMBER.rim,
    rimStrength: 1.15,
    glow: 0.02,
    paint: 1.0
  });
  const stoneInk = inkMaterial(0.9, 0x040509, 0.9);

  /* outer and middle rims — the dial */
  const outerRing = track(new THREE.TorusGeometry(STAGE.structure.outerRadius, 0.42, 6, 180));
  const outerRingMesh = addCel(archive, outerRing, stoneMat, stoneInk);

  const midRing = track(new THREE.TorusGeometry(STAGE.structure.midRadius, 0.62, 6, 140));
  const midRingMesh = addCel(archive, midRing, stoneMat, stoneInk);
  midRingMesh.rotation.x = 0.06;

  /* the aperture frame — the one piece with glyphs carved into it */
  const apertureMat = celMaterial({
    base: COLD.metal,
    shade: COLD.metalShade,
    baseB: EMBER.metal,
    shadeB: EMBER.metalShade,
    rim: COLD.glyph,
    rimB: EMBER.glyph,
    rimStrength: 1.5,
    glow: 0.06,
    pattern: 1,
    glyphs: 26,
    power: shared.structure
  });
  const apertureFrame = track(new THREE.TorusGeometry(STAGE.structure.apertureRadius, 1.15, 8, 150));
  const apertureMesh = addCel(archive, apertureFrame, apertureMat, inkMaterial(1.25, 0x03050a, 0.95));

  /* standing stones: the dial's teeth. Deliberately irregular — some tall,
     some snapped short, a few missing altogether — so the ring reads as
     something ancient rather than something machined. */
  const stoneCourses = low
    ? [{ count: 10, radius: STAGE.structure.finRing, scale: 1 }]
    : [
        { count: 14, radius: STAGE.structure.finRing, scale: 1 },
        { count: 9, radius: 27.5, scale: 0.78 }
      ];
  const finGeoms = [];
  for (const course of stoneCourses) {
    for (let i = 0; i < course.count; i++) {
      const slot = (i / course.count) * Math.PI * 2;
      const a = slot + rr(-0.09, 0.09);
      const r = course.radius + rr(-1.6, 1.6);
      const broken = rand() < 0.22;
      const h = (broken ? rr(3.0, 6.5) : rr(11, 22)) * course.scale;
      const w = rr(1.8, 3.8) * course.scale;
      const d = rr(3.6, 7.4) * course.scale;
      const g = new THREE.BoxGeometry(w, h, d);
      finGeoms.push(
        xform(g, {
          position: [Math.cos(a) * r, Math.sin(a) * r, rr(-0.7, 0.7)],
          rotation: [rr(-0.1, 0.1), rr(-0.08, 0.08), a - Math.PI / 2 + rr(-0.12, 0.12)]
        })
      );
      g.dispose();
    }
  }
  const finsGeometry = track(mergeGeometries(finGeoms));
  finGeoms.forEach((g) => g.dispose());
  const finsMesh = addCel(archive, finsGeometry, stoneMat, stoneInk);

  /* long struts binding the aperture to the outer rim */
  const strutGeoms = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.42;
    const g = new THREE.BoxGeometry(1.7, 1.7, 17.6);
    strutGeoms.push(
      xform(g, {
        position: [Math.cos(a) * 21.6, Math.sin(a) * 21.6, 0],
        rotation: [0, 0, a + Math.PI / 2]
      })
    );
    g.dispose();
  }
  const strutsGeometry = track(mergeGeometries(strutGeoms));
  strutGeoms.forEach((g) => g.dispose());
  addCel(archive, strutsGeometry, stoneMat, stoneInk);

  /* slabs hanging in the void around the ring, slowly turning */
  const slabGeoms = [];
  for (let i = 0; i < (low ? 9 : 16); i++) {
    const a = rr(0, Math.PI * 2);
    const r = rr(50, 88);
    const g = new THREE.BoxGeometry(rr(5, 16), rr(5, 18), rr(0.5, 1.3));
    slabGeoms.push(
      xform(g, {
        position: [Math.cos(a) * r, Math.sin(a) * r * 0.9, rr(-26, 26)],
        rotation: [rr(-0.7, 0.7), rr(-0.7, 0.7), rr(0, Math.PI * 2)]
      })
    );
    g.dispose();
  }
  const slabsGeometry = track(mergeGeometries(slabGeoms));
  slabGeoms.forEach((g) => g.dispose());
  const slabMat = celMaterial({
    base: COLD.slab,
    shade: COLD.slabShade,
    baseB: EMBER.slab,
    shadeB: EMBER.slabShade,
    rim: COLD.rim,
    rimB: EMBER.rim,
    rimStrength: 1.0,
    pattern: 2,
    glow: 0.0
  });
  const slabs = addCel(archive, slabsGeometry, slabMat, inkMaterial(0.8, 0x04060c, 0.85));

  /* armillary rims: three slow, tilted rings that give the Archive depth and
     a sense of scale beyond the dial itself */
  const armillary = [];
  const armillarySpecs = [
    { radius: 38, tube: 0.34, tilt: [0.30, 0.12], spin: 0.019 },
    { radius: 44, tube: 0.28, tilt: [0.16, 0.72], spin: -0.014 },
    { radius: 50, tube: 0.22, tilt: [0.42, 1.28], spin: 0.010 }
  ];
  for (const spec of armillarySpecs) {
    const geo = track(new THREE.TorusGeometry(spec.radius, spec.tube, 5, 128));
    const ring = new THREE.Mesh(geo, stoneMat);
    ring.rotation.set(spec.tilt[0], spec.tilt[1], 0);
    archive.add(ring);
    armillary.push({ mesh: ring, spin: spec.spin, tilt: spec.tilt });
  }

  /* shards drifting around the Archive */
  function makeShardField(count, seed, opts) {
    const rnd = mulberry32(seed);
    const geoms = [];
    const centers = [];
    const axes = [];
    const orbits = [];
    const phases = [];
    const scales = [];

    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const r = opts.radius[0] + rnd() * (opts.radius[1] - opts.radius[0]);
      const y = (rnd() - 0.5) * opts.height;
      const z = (rnd() - 0.5) * opts.depth;
      const center = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r * 0.35 + z);

      const w = 0.6 + rnd() * 2.6;
      const h = 0.5 + rnd() * 2.2;
      const d = 0.25 + rnd() * 1.1;
      let g = new THREE.BoxGeometry(w, h, d);
      g = xform(g, { rotation: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28] });
      g.translate(center.x, center.y, center.z);

      geoms.push(g);
      centers.push(center.x, center.y, center.z);
      axes.push(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5);
      orbits.push(opts.orbit[0] + rnd() * opts.orbit[1], rnd() * Math.PI * 2);
      phases.push(rnd());
      scales.push(0.94 + rnd() * 0.12);
    }

    const merged = mergeGeometries(geoms);
    geoms.forEach((g) => g.dispose());
    /* the merge is non-indexed and concatenated in order, so every shard owns
       an equal run of vertices and its per-shard attributes can be repeated */
    const vertexCounts = Math.round(merged.attributes.position.count / count);
    const fill = (arr, itemSize) => {
      const out = new Float32Array(merged.attributes.position.count * itemSize);
      for (let v = 0; v < merged.attributes.position.count; v++) {
        const shard = Math.min(count - 1, Math.floor(v / vertexCounts));
        for (let k = 0; k < itemSize; k++) out[v * itemSize + k] = arr[shard * itemSize + k];
      }
      return new THREE.BufferAttribute(out, itemSize);
    };

    merged.setAttribute('aCenter', fill(centers, 3));
    merged.setAttribute('aAxis', fill(axes, 3));
    merged.setAttribute('aOrbit', fill(orbits, 2));
    merged.setAttribute('aPhase', fill(phases, 1));
    merged.setAttribute('aScale', fill(scales, 1));
    return merged;
  }

  const shardMat = celMaterial({
    base: COLD.slab,
    shade: COLD.slabShade,
    baseB: EMBER.slab,
    shadeB: EMBER.slabShade,
    rim: COLD.rim,
    rimB: EMBER.rim,
    rimStrength: 1.2,
    pattern: 2,
    paint: 1.2,
    shard: true,
    power: shared.structure,
    assemble: 0.55
  });
  const coldShardsGeometry = track(
    makeShardField(low ? 28 : STAGE.shards.coldCount, 4242, {
      radius: [24, 78],
      height: 46,
      depth: 26,
      orbit: [0.5, 2.4]
    })
  );
  addCel(archive, coldShardsGeometry, shardMat, null);

  /* ── the aperture ─────────────────────────────────────────────────────── */
  /* it lives inside the Archive group so ring, stones and aperture all tilt
     as one object — the lens then genuinely flies through a tilted gate */
  const portal = new THREE.Group();
  archive.add(portal);

  const portalMaterial = track(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.time,
        uPower: shared.power,
        uAlt: shared.alt,
        uInner: { value: new THREE.Color(COLD.portalInner) },
        uOuter: { value: new THREE.Color(COLD.portalOuter) },
        uAccent: { value: new THREE.Color(COLD.portalAccent) }
      },
      vertexShader: PORTAL_VERT,
      fragmentShader: PORTAL_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  );
  const portalDisc = track(new THREE.CircleGeometry(STAGE.portal.radius, 72));
  const portalMesh = new THREE.Mesh(portalDisc, portalMaterial);
  portalMesh.position.set(...STAGE.portal.center);
  portal.add(portalMesh);

  const haloMaterial = track(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.time,
        uPower: { value: 0 },
        uFalloff: { value: 2.1 },
        uCore: { value: 0.15 },
        uStreak: { value: 0.10 },
        uColor: { value: new THREE.Color(COLD.portalOuter) },
        uColor2: { value: new THREE.Color(COLD.portalInner) }
      },
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  );
  /* glow cards hang off unrotated groups, so billboarding is exactly
     "copy the camera's orientation" — no parent-space maths, no one-frame lag */
  const portalHalo = new THREE.Mesh(track(new THREE.PlaneGeometry(96, 96)), haloMaterial);
  portalHalo.position.set(...STAGE.portal.center);
  coldGroup.add(portalHalo);
  billboards.push(portalHalo);

  /* spiral infall: matter falling into the aperture */
  function makeVortex(count) {
    const rnd = mulberry32(778899);
    const positions = new Float32Array(count * 3); // unused but required by three
    const seeds = new Float32Array(count);
    const radii = new Float32Array(count);
    const angles = new Float32Array(count);
    const heights = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i] = rnd();
      radii[i] = 15 + rnd() * 32;
      angles[i] = rnd() * Math.PI * 2;
      heights[i] = (rnd() - 0.5) * 16;
      sizes[i] = 0.8 + rnd() * 2.4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    g.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    g.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    g.setAttribute('aHeight', new THREE.BufferAttribute(heights, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    track(g);

    const m = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: shared.time,
          uPower: shared.power,
          uScale: { value: pixelRatio },
          uColorA: { value: new THREE.Color(0x7fe6ff) },
          uColorB: { value: new THREE.Color(0xfff3d0) }
        },
        vertexShader: VORTEX_VERT,
        fragmentShader: VORTEX_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    return p;
  }
  const vortex = makeVortex(low ? 550 : 1400);
  portal.add(vortex);

  /* volumetric shafts raking the Archive */
  function addShafts(parent, count, from, to, colorA, colorB, seed) {
    const rnd = mulberry32(seed);
    const group = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const a = new THREE.Vector3(from[0] + (rnd() - 0.5) * 40, from[1] + (rnd() - 0.5) * 30, from[2] + (rnd() - 0.5) * 40);
      const b = new THREE.Vector3(to[0] + (rnd() - 0.5) * 70, to[1] + (rnd() - 0.5) * 40, to[2] + (rnd() - 0.5) * 40);
      const len = a.distanceTo(b);
      const radius = 18 + rnd() * 26;
      const cone = new THREE.ConeGeometry(radius, len, 18, 1, true);
      cone.translate(0, -len / 2, 0);
      track(cone);
      const mat = track(
        new THREE.ShaderMaterial({
          uniforms: {
            uTime: shared.time,
            uPower: { value: 0.10 + rnd() * 0.10 },
            uColor: { value: new THREE.Color(colorA) },
            uColor2: { value: new THREE.Color(colorB) }
          },
          vertexShader: SHAFT_VERT,
          fragmentShader: SHAFT_FRAG,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        })
      );
      const mesh = new THREE.Mesh(cone, mat);
      mesh.position.copy(a);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), b.clone().sub(a).normalize());
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    parent.add(group);
    return group;
  }

  const coldShafts = addShafts(
    coldGroup,
    low ? 3 : 5,
    [-96, 130, 96],
    [0, -18, 0],
    0x7fd8ff,
    0x2f7fa8,
    6161
  );

  /* ── the ember universe ───────────────────────────────────────────────── */
  const ember = new THREE.Group();
  emberGroup.add(ember);

  /* two suns behind the broken ring */
  for (const sun of STAGE.suns) {
    const geo = track(new THREE.SphereGeometry(sun.radius, 24, 16));
    const mat = track(new THREE.MeshBasicMaterial({ color: sun.color }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...sun.pos);
    ember.add(mesh);

    const haloMat = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: shared.time,
          uPower: { value: 0.75 },
          uFalloff: { value: 1.9 },
          uCore: { value: 0.55 },
          uStreak: { value: 0.22 },
          uColor: { value: new THREE.Color(sun.color) },
          uColor2: { value: new THREE.Color(0xff7a3a) }
        },
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
    );
    const halo = new THREE.Mesh(track(new THREE.PlaneGeometry(sun.halo * 2, sun.halo * 2)), haloMat);
    halo.position.set(...sun.pos);
    ember.add(halo);
    billboards.push(halo);
  }

  /* the ruined skyline */
  const towerGeoms = [];
  for (const t of STAGE.towers) {
    const g = new THREE.BoxGeometry(t.width, t.height, t.width * 0.7);
    towerGeoms.push(
      xform(g, {
        position: [t.top[0], t.top[1] - t.height / 2, t.top[2]],
        rotation: [rr(-0.08, 0.08), rr(0, Math.PI), rr(-0.1, 0.1)]
      })
    );
    g.dispose();
    /* a snapped-off chunk at the top */
    const cap = new THREE.BoxGeometry(t.width * 0.8, t.width * 0.9, t.width * 0.6);
    towerGeoms.push(
      xform(cap, {
        position: [t.top[0] + rr(-3, 3), t.top[1] + rr(2, 8), t.top[2] + rr(-3, 3)],
        rotation: [rr(-0.4, 0.4), rr(0, Math.PI), rr(-0.4, 0.4)]
      })
    );
    cap.dispose();
  }
  const towersGeometry = track(mergeGeometries(towerGeoms));
  towerGeoms.forEach((g) => g.dispose());
  const towerMat = celMaterial({
    base: EMBER.slab,
    shade: EMBER.slabShade,
    baseB: EMBER.slab,
    shadeB: EMBER.slabShade,
    keyB: EMBER.key,
    rim: EMBER.rim,
    rimB: EMBER.rim,
    rimStrength: 1.35,
    pattern: 2,
    lightDir: LIGHT_EMBER,
    glow: 0.03,
    hazeColor: HAZE_EMBER,
    hazeNear: 80,
    hazeFar: 420
  });
  addCel(ember, towersGeometry, towerMat, inkMaterial(1.6, 0x0a0304, 0.9, HAZE_EMBER));

  /* the shattered archive: the ring has broken into four great arcs that
     still trace its circle, plus debris. Read as a broken ring, not as rubble. */
  const arcGeoms = [];
  const ringBands = low
    ? [{ radius: STAGE.structure.outerRadius, tube: 2.4, pieces: [1.5, 1.2, 1.4], gap: 0.3 }]
    : [
        { radius: STAGE.structure.outerRadius, tube: 2.6, pieces: [1.42, 0.94, 1.28, 0.71, 0.52], gap: 0.22 },
        { radius: STAGE.structure.midRadius, tube: 1.75, pieces: [1.1, 0.83, 1.34, 0.62], gap: 0.34 },
        { radius: STAGE.structure.apertureRadius, tube: 2.05, pieces: [0.9, 1.3, 0.74], gap: 0.44 }
      ];

  for (const band of ringBands) {
    let angle = rr(0, Math.PI * 2);
    for (const span of band.pieces) {
      const g = new THREE.TorusGeometry(band.radius, band.tube, 7, 52, span);
      arcGeoms.push(
        xform(g, {
          position: [rr(-1.6, 1.6), rr(-1.6, 1.6), rr(-7, 7)],
          rotation: [rr(-0.16, 0.16), rr(-0.16, 0.16), angle]
        })
      );
      g.dispose();
      angle += span + band.gap + rr(-0.05, 0.05);
    }
  }
  /* rubble still clinging to the fracture lines */
  for (let i = 0; i < (low ? 10 : 22); i++) {
    const band = ringBands[i % ringBands.length];
    const a = rr(0, Math.PI * 2);
    const r = band.radius + rr(-2.4, 2.4);
    const g = new THREE.BoxGeometry(rr(0.8, 3.2), rr(0.8, 3.6), rr(0.8, 3.0));
    arcGeoms.push(
      xform(g, {
        position: [Math.cos(a) * r, Math.sin(a) * r, rr(-4, 4)],
        rotation: [rr(0, 6.28), rr(0, 6.28), rr(0, 6.28)]
      })
    );
    g.dispose();
  }

  const arcsGeometry = track(mergeGeometries(arcGeoms));
  arcGeoms.forEach((g) => g.dispose());
  const arcMat = celMaterial({
    base: EMBER.stone,
    shade: EMBER.stoneShade,
    baseB: EMBER.stone,
    shadeB: EMBER.stoneShade,
    keyB: EMBER.key,
    rim: EMBER.glyph,
    rimB: EMBER.glyph,
    rimStrength: 1.5,
    pattern: 1,
    glyphs: 22,
    lightDir: LIGHT_EMBER,
    glow: 0.08,
    power: { value: 0.8 },
    hazeColor: HAZE_EMBER,
    hazeNear: 90,
    hazeFar: 400
  });
  addCel(ember, arcsGeometry, arcMat, inkMaterial(1.1, 0x0a0304, 0.92, HAZE_EMBER));

  /* the floating shard the watcher stands on */
  const islandGeoms = [];
  const islandRock = new THREE.IcosahedronGeometry(7, 1);
  islandGeoms.push(
    xform(islandRock, { position: STAGE.watcher.island, scale: [1.5, 0.35, 1.2] })
  );
  islandRock.dispose();
  const spike = new THREE.ConeGeometry(4.2, 11, 7);
  islandGeoms.push(
    xform(spike, {
      position: [STAGE.watcher.island[0], STAGE.watcher.island[1] - 7.2, STAGE.watcher.island[2]],
      rotation: [Math.PI, 0.3, 0]
    })
  );
  spike.dispose();
  for (let i = 0; i < 5; i++) {
    const rock = new THREE.IcosahedronGeometry(rr(1.1, 2.6), 0);
    islandGeoms.push(
      xform(rock, {
        position: [
          STAGE.watcher.island[0] + rr(-13, 13),
          STAGE.watcher.island[1] + rr(-7, 3),
          STAGE.watcher.island[2] + rr(-10, 10)
        ],
        rotation: [rr(0, 6.28), rr(0, 6.28), rr(0, 6.28)]
      })
    );
    rock.dispose();
  }
  const islandGeometry = track(mergeGeometries(islandGeoms));
  islandGeoms.forEach((g) => g.dispose());
  const islandMat = celMaterial({
    base: EMBER.slab,
    shade: EMBER.slabShade,
    baseB: EMBER.slab,
    shadeB: EMBER.slabShade,
    keyB: EMBER.key,
    rim: EMBER.rim,
    rimB: EMBER.rim,
    rimStrength: 1.2,
    pattern: 2,
    lightDir: LIGHT_EMBER,
    hazeColor: HAZE_EMBER,
    hazeNear: 80,
    hazeFar: 400
  });
  const island = addCel(ember, islandGeometry, islandMat, inkMaterial(1.3, 0x070203, 0.9, HAZE_EMBER));

  /* the watcher — a silhouetted figure in a hooded cloak with a staff */
  const watcher = new THREE.Group();
  watcher.position.set(STAGE.watcher.island[0], STAGE.watcher.islandTop, STAGE.watcher.island[2]);
  watcher.rotation.y = Math.PI * 0.86;
  ember.add(watcher);

  const cloakProfile = [
    new THREE.Vector2(0.05, 0.0),
    new THREE.Vector2(1.55, 0.18),
    new THREE.Vector2(1.42, 1.3),
    new THREE.Vector2(1.2, 2.5),
    new THREE.Vector2(1.02, 3.5),
    new THREE.Vector2(0.92, 4.15)
  ];
  const cloakGeo = new THREE.LatheGeometry(cloakProfile, 9);
  const cloak = track(cloakGeo.toNonIndexed());
  cloak.computeVertexNormals();
  cloakGeo.dispose();

  const headGeo = track(new THREE.SphereGeometry(0.62, 9, 7));
  const head = headGeo.clone();
  head.translate(0, 4.55, 0);
  const hoodGeo = track(new THREE.ConeGeometry(0.92, 1.55, 9));
  const hood = hoodGeo.clone();
  hood.translate(0, 5.1, 0);
  const staffGeo = track(new THREE.CylinderGeometry(0.075, 0.11, 7.4, 6));
  const staff = staffGeo.clone();
  staff.rotateZ(0.1);
  staff.translate(1.45, 3.6, 0.1);

  const watcherGeometry = track(mergeGeometries([cloak, head, hood, staff]));
  [head, hood, staff].forEach((g) => g.dispose());

  const watcherMat = celMaterial({
    hazeColor: HAZE_EMBER,
    hazeNear: 80,
    hazeFar: 400,
    base: 0x14121e,
    shade: 0x05040a,
    baseB: 0x1a1116,
    shadeB: 0x060304,
    key: 0x2a3a4a,
    keyB: 0xffa060,
    rim: EMBER.rim,
    rimB: EMBER.rim,
    rimStrength: 1.9,
    pattern: 3,
    lightDir: LIGHT_EMBER,
    glow: 0.0
  });
  addCel(watcher, watcherGeometry, watcherMat, inkMaterial(0.85, 0x040205, 0.95));

  /* the staff's ember tip: the only light the figure carries */
  const tipGeo = track(new THREE.SphereGeometry(0.17, 8, 6));
  const tipMat = track(new THREE.MeshBasicMaterial({ color: 0xffc27a }));
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.set(1.85, 7.35, 0.1);
  watcher.add(tip);

  const emberShardsGeometry = track(
    makeShardField(low ? 34 : STAGE.shards.emberCount, 9931, {
      radius: [18, 66],
      height: 40,
      depth: 30,
      orbit: [0.8, 3.6]
    })
  );
  const emberShardMat = celMaterial({
    base: EMBER.slab,
    shade: EMBER.slabShade,
    baseB: EMBER.slab,
    shadeB: EMBER.slabShade,
    keyB: EMBER.key,
    rim: EMBER.rim,
    rimB: EMBER.rim,
    rimStrength: 1.35,
    pattern: 2,
    paint: 1.3,
    lightDir: LIGHT_EMBER,
    shard: true,
    power: { value: 0.8 },
    assemble: 0.75,
    hazeColor: HAZE_EMBER,
    hazeNear: 80,
    hazeFar: 400
  });
  addCel(ember, emberShardsGeometry, emberShardMat, null);

  /* the scar where the door was */
  const scarMat = track(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.time,
        uPower: { value: 0.55 },
        uFalloff: { value: 2.6 },
        uCore: { value: 0.10 },
        uStreak: { value: 0.05 },
        uColor: { value: new THREE.Color(0xff8a3a) },
        uColor2: { value: new THREE.Color(0xffd9a0) }
      },
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  );
  const scarGeo = track(new THREE.PlaneGeometry(46, 64));
  const scar = new THREE.Mesh(scarGeo, scarMat);
  ember.add(scar);

  /* ember god-rays */
  const emberShafts = addShafts(
    emberGroup,
    low ? 3 : 4,
    [40, 120, 140],
    [0, -20, 0],
    0xffb066,
    0x8a2a10,
    2024
  );

  emberGroup.visible = false;

  /* ────────────────────────────────────────────────────────────────────────
     Per-frame update
     ──────────────────────────────────────────────────────────────────────── */


  function update(state, camera) {
    shared.time.value = state.time;
    shared.alt.value = state.alt;
    shared.power.value = state.portal;
    shared.structure.value = state.structure;

    /* the sky rides with the camera: infinite distance, zero parallax */
    sky.position.copy(camera.position);

    /* universe swap, hidden inside the flash */
    const showEmber = state.time > 62.2;
    if (emberGroup.visible !== showEmber) {
      emberGroup.visible = showEmber;
      coldGroup.visible = !showEmber;
    }

    /* the Archive turns like a dial; each rim at its own rate */
    const t = state.time;
    outerRingMesh.rotation.z = t * 0.028;
    midRingMesh.rotation.z = -t * 0.041;
    finsMesh.rotation.z = t * 0.017;
    apertureMesh.rotation.z = -t * 0.012;
    slabs.rotation.z = t * 0.006;
    for (const ring of armillary) {
      ring.mesh.rotation.y = ring.tilt[1] + t * ring.spin;
      ring.mesh.rotation.x = ring.tilt[0] + Math.sin(t * 0.05) * 0.05;
    }
    archive.rotation.x = 0.155 + Math.sin(t * 0.11) * 0.028;
    archive.rotation.y = 0.115 + Math.sin(t * 0.07 + 1.2) * 0.026;

    /* aperture energy */
    const power = state.portal;
    portalMaterial.uniforms.uPower.value = power;
    haloMaterial.uniforms.uPower.value = power * 1.15;
    portalHalo.scale.setScalar(0.7 + power * 0.65);

    /* the aperture only exists before the crossing */
    portal.visible = state.time < 64.5;

    /* the scar in the ember universe breathes */
    scarMat.uniforms.uPower.value = 0.35 + 0.15 * Math.sin(t * 0.7) + state.alt * 0.3;

    /* the watcher's island drifts, the cloak sways */
    island.position.y = Math.sin(t * 0.24) * 0.5;
    island.rotation.y = Math.sin(t * 0.08) * 0.05;
    watcher.position.y = STAGE.watcher.islandTop + island.position.y;
    watcher.rotation.y = Math.PI * 0.86 + Math.sin(t * 0.19) * 0.03;

    /* every glow card is a billboard (they all live on unrotated groups) */
    for (const card of billboards) card.quaternion.copy(camera.quaternion);

    /* dust brightness reacts to the aperture surge */
    coldDust.material.uniforms.uOpacity.value = 0.62 + power * 0.5;
    emberDust.material.uniforms.uOpacity.value = 0.75 + 0.2 * Math.sin(t * 0.4);

    /* shafts breathe rather than flicker */
    coldShafts.children.forEach((m, i) => {
      const u = m.material.uniforms;
      u.uPower.value = (0.055 + 0.05 * Math.sin(t * 0.31 + i * 1.7)) * (0.35 + state.structure * 0.9);
    });
    emberShafts.children.forEach((m, i) => {
      const u = m.material.uniforms;
      u.uPower.value = 0.07 + 0.05 * Math.sin(t * 0.27 + i * 2.1);
    });

    return state;
  }

  function setPixelRatio(ratio) {
    coldDust.material.uniforms.uScale.value = ratio;
    emberDust.material.uniforms.uScale.value = ratio;
    vortex.material.uniforms.uScale.value = ratio;
  }

  function dispose() {
    for (const d of disposables) {
      if (d && typeof d.dispose === 'function') d.dispose();
    }
    disposables.length = 0;
  }

  return {
    scene,
    update,
    dispose,
    setPixelRatio,
    groups: { cold: coldGroup, ember: emberGroup, archive, portal, watcher },
    shared,
    stats: {
      quality,
      coldDust: coldDust.points.geometry.attributes.position.count,
      emberDust: emberDust.points.geometry.attributes.position.count,
      coldShards: STAGE.shards.coldCount,
      emberShards: STAGE.shards.emberCount
    }
  };
}
