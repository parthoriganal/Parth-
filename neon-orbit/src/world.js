/**
 * NEON ORBIT — world.js
 *
 * One WebGL context holds the entire experience. There is no per-section
 * canvas: the camera flies a choreographed path through a single scene as the
 * page scrolls, so transitions are continuous rather than stitched together.
 *
 * Station 01 CORE    — stellated chrome artefact, glass shell, orbital cage
 * Station 02 FIELD   — the artefact disperses into shards, then reassembles
 * Station 03 LAB     — six glass orbs, each holding a point light in one of
 *                      the Figma palette colours, unprojected to sit exactly
 *                      inside their DOM cells
 * Station 04 SIGNAL  — camera dives, core recedes (DOM wavefield takes over)
 * Station 05 EXIT    — pull back to nothing
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* Figma palette — 91:0 … 91:5 */
export const PALETTE = [
  { name: 'Fuschia/100', hex: '#EF5DA8', node: '91:0' },
  { name: 'Fuschia/80',  hex: '#F178B6', node: '91:1' },
  { name: 'Fuschia/60',  hex: '#FCDDEC', node: '91:2' },
  { name: 'Iris/100',    hex: '#5D5FEF', node: '91:3' },
  { name: 'Iris/80',     hex: '#7879F1', node: '91:4' },
  { name: 'Iris/60',     hex: '#A5A6F6', node: '91:5' },
];

const VOID = 0x04050a;

/* ────────────────────────────────────────────────────── helpers ── */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);           // smoothstep
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));

/**
 * Stellated polyhedron: start from an icosahedron, push a spike out of every
 * triangle. Real geometry, generated at runtime — 320 triangles.
 */
function makeStellated(radius = 1.4, spike = 1.42, detail = 1) {
  const base = new THREE.IcosahedronGeometry(radius, detail);
  const pos = base.getAttribute('position');
  const out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  const apex = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);

    ab.subVectors(b, a); ac.subVectors(c, a);
    n.crossVectors(ab, ac).normalize();
    if (n.dot(a) < 0) n.negate();

    apex.addVectors(a, b).add(c).multiplyScalar(1 / 3);
    const dir = apex.clone().normalize();
    apex.copy(dir).multiplyScalar(radius * spike);

    // three triangles forming the spike
    out.push(a.x, a.y, a.z, b.x, b.y, b.z, apex.x, apex.y, apex.z);
    out.push(b.x, b.y, b.z, c.x, c.y, c.z, apex.x, apex.y, apex.z);
    out.push(c.x, c.y, c.z, a.x, a.y, a.z, apex.x, apex.y, apex.z);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  base.dispose();
  return g;
}

/** Round soft particle sprite, generated in a canvas — no image files. */
function makeSprite(size = 64, hardness = 0.18) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(hardness, 'rgba(255,255,255,.85)');
  g.addColorStop(0.55, 'rgba(255,255,255,.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Neon studio environment. Chrome is only as good as what it reflects, so we
 * build a tiny HDR room of emissive panels in the library palette and bake it
 * once with PMREM. Costs one render at startup; no HDR files, no CDN.
 */
function buildEnvironment(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x05060c);

  /* A studio dome, painted into a canvas and mapped onto an inverted sphere.
     Chrome is a mirror: it needs large, bright, continuous surfaces to read as
     metal. Isolated light panels alone leave it looking like dark clay, so the
     dome carries the exposure and the panels supply the highlights. */
  const DOME_W = 1024;
  const DOME_H = 512;
  const c = document.createElement('canvas');
  c.width = DOME_W;
  c.height = DOME_H;
  const ctx = c.getContext('2d');

  // vertical exposure gradient: bright ceiling → deep floor
  const grad = ctx.createLinearGradient(0, 0, 0, DOME_H);
  grad.addColorStop(0.00, '#ffffff');
  grad.addColorStop(0.18, '#f6f8ff');
  grad.addColorStop(0.38, '#c9d0ee');
  grad.addColorStop(0.52, '#7d84ab');
  grad.addColorStop(0.68, '#2a2e46');
  grad.addColorStop(1.00, '#0a0b14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, DOME_W, DOME_H);

  // colour wedges — these become the tints that travel across the chrome
  const wedge = (x, y, r, hex, alpha) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${hex},${alpha})`);
    g.addColorStop(0.55, `rgba(${hex},${alpha * 0.45})`);
    g.addColorStop(1, `rgba(${hex},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  wedge(190, 250, 300, '93,95,239', 0.95);   // Iris
  wedge(830, 285, 270, '239,93,168', 0.8);   // Fuschia
  wedge(520, 120, 190, '158,235,255', 0.42); // Ice
  wedge(660, 300, 150, '255,138,76', 0.30);  // a single warm accent

  // hard strip lights → the crisp specular streaks along the facets
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.fillRect(0, 58, DOME_W, 12);
  ctx.fillRect(0, 96, DOME_W, 4);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fillRect(300, 150, 6, 210);
  ctx.fillRect(742, 170, 4, 180);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(48, 48, 32),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, toneMapped: false })
  );
  env.add(dome);

  // a couple of physical-ish highlights above the dome floor
  const panel = (hex, intensity, size, position, lookAt) => {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
    mat.color.set(hex).multiplyScalar(intensity);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), mat);
    mesh.position.set(...position);
    if (lookAt) mesh.lookAt(new THREE.Vector3(...lookAt));
    env.add(mesh);
  };
  panel(0xffffff, 9.0, [7, 7], [-6, 9, -7], [0, 0, 0]);
  panel(0xdfe6ff, 5.5, [5, 5], [8, 5, 6], [0, 0, 0]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0);
  pmrem.dispose();
  env.traverse(o => {
    if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); }
  });
  tex.dispose();
  return rt.texture;
}

/* ──────────────────────────────────────────────────── world ── */

export function createWorld(canvas, options = {}) {
  const tier = options.tier || 'high';
  const low = tier === 'low';
  const reduced = !!options.reduced;

  /* ---- renderer ------------------------------------------------ */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !low,
    alpha: false,
    powerPreference: low ? 'default' : 'high-performance',
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.35 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = false; // no shadows: nothing casts onto anything
  renderer.setClearColor(VOID, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.FogExp2(VOID, low ? 0.026 : 0.018);

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 220);
  camera.position.set(0, 0.35, 9);

  /* ---- environment + lights ------------------------------------ */
  scene.environment = buildEnvironment(renderer);
  scene.environmentIntensity = low ? 1.25 : 1.5;

  const keyLight = new THREE.DirectionalLight(0xdfe6ff, 1.15);
  keyLight.position.set(5, 8, 6);
  scene.add(keyLight);

  const rimIris = new THREE.PointLight(0x5d5fef, low ? 26 : 42, 26, 2.1);
  rimIris.position.set(-5.5, 2.2, -3.5);
  scene.add(rimIris);

  const rimFuschia = new THREE.PointLight(0xef5da8, low ? 22 : 36, 24, 2.1);
  rimFuschia.position.set(5.2, -2.4, -3.2);
  scene.add(rimFuschia);

  const coreGlow = new THREE.PointLight(0x8f93ff, 16, 14, 2.4);
  scene.add(coreGlow);

  /* ---- the artefact -------------------------------------------- */
  const coreGroup = new THREE.Group();
  scene.add(coreGroup);

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.055,
    envMapIntensity: 2.35,
    flatShading: true,
  });

  const core = new THREE.Mesh(makeStellated(0.92, 1.52, low ? 0 : 1), chromeMat);
  coreGroup.add(core);

  // inner light — reads as the thing the chrome is wrapped around
  const heartMat = new THREE.MeshBasicMaterial({ color: 0x9aa0ff, toneMapped: false });
  heartMat.color.set(0x7c80ff).multiplyScalar(2.2);
  const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, low ? 1 : 2), heartMat);
  coreGroup.add(heart);

  const heartGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeSprite(128, 0.05),
    color: 0x6f74ff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.9,
  }));
  heartGlow.scale.setScalar(3.6);
  coreGroup.add(heartGlow);

  // iridescent glass shell — thin-film, still real PBR geometry
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.06,
    transparent: true,
    opacity: 0.11,
    envMapIntensity: 2.4,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 1,
    iridescenceIOR: 1.32,
    iridescenceThicknessMinimum: 120,
    iridescenceThicknessMaximum: 480,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.22, low ? 1 : 3), shellMat);
  coreGroup.add(shell);

  /* ---- orbital cage -------------------------------------------- */
  const rings = new THREE.Group();
  coreGroup.add(rings);

  const ringMetal = new THREE.MeshStandardMaterial({
    color: 0xd8dcf0, metalness: 1, roughness: 0.22, envMapIntensity: 1.2,
  });
  const ringNeon = (hex, intensity) => {
    const m = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.95 });
    m.color.set(hex).multiplyScalar(intensity);
    return m;
  };

  const ringDefs = [
    { r: 2.05, tube: 0.011, tilt: [0.42, 0.0, 0.18], hex: 0x5d5fef, spin: 0.22 },
    { r: 2.48, tube: 0.007, tilt: [1.15, 0.5, 0.0], hex: 0xef5da8, spin: -0.16 },
    { r: 2.95, tube: 0.005, tilt: [-0.5, 0.9, 0.35], hex: 0x9eebff, spin: 0.11 },
  ];

  const ringObjs = ringDefs.map(def => {
    const g = new THREE.Group();
    g.rotation.set(...def.tilt);

    const band = new THREE.Mesh(new THREE.TorusGeometry(def.r, def.tube, low ? 5 : 8, low ? 96 : 220), ringMetal);
    g.add(band);

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(def.r, def.tube * 1.7, 4, low ? 72 : 160),
      ringNeon(def.hex, 1.35)
    );
    g.add(glow);

    // a bead riding the ring: gives the eye something to track
    const bead = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.035, def.tube * 6), 10, 10), ringNeon(def.hex, 2.6));
    g.add(bead);

    rings.add(g);
    return { group: g, bead, def, phase: Math.random() * Math.PI * 2 };
  });

  /* ---- shards that disperse on scroll -------------------------- */
  const shardCount = low ? 20 : 46;
  const shards = new THREE.Group();
  coreGroup.add(shards);

  const shardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.12, envMapIntensity: 1.35, flatShading: true,
  });
  const shardMatWarm = new THREE.MeshStandardMaterial({
    color: 0xf178b6, metalness: 0.85, roughness: 0.2, envMapIntensity: 1.1, flatShading: true,
  });

  const shardData = [];
  for (let i = 0; i < shardCount; i++) {
    const geo = new THREE.TetrahedronGeometry(0.085 + Math.random() * 0.20, 0);
    const mesh = new THREE.Mesh(geo, i % 4 === 0 ? shardMatWarm : shardMat);
    const dir = new THREE.Vector3(
      Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1
    ).normalize();
    const base = 0.55 + Math.random() * 0.85;
    mesh.position.copy(dir).multiplyScalar(base);
    mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    mesh.visible = false;
    shards.add(mesh);
    shardData.push({
      mesh, dir, base,
      spin: new THREE.Vector3((Math.random() - .5) * 1.4, (Math.random() - .5) * 1.4, (Math.random() - .5) * 1.4),
      spread: 1.1 + Math.random() * 2.3,
    });
  }

  /* ---- dust ---------------------------------------------------- */
  const dustCount = low ? 320 : 1500;
  const dustGeo = new THREE.BufferGeometry();
  {
    const pos = new Float32Array(dustCount * 3);
    const col = new Float32Array(dustCount * 3);
    const c = new THREE.Color();
    for (let i = 0; i < dustCount; i++) {
      const r = 5 + Math.pow(Math.random(), 0.6) * 26;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.55;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      c.set(i % 5 === 0 ? 0xef5da8 : i % 3 === 0 ? 0x5d5fef : 0xdfe4ff);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: low ? 0.13 : 0.1,
    map: makeSprite(48, 0.1),
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    fog: true,
  }));
  scene.add(dust);

  /* ---- LAB orbs (unprojected onto their DOM cells) -------------- */
  const orbs = PALETTE.map((p, i) => {
    const group = new THREE.Group();
    group.visible = false;

    // Outer glass: thin, near-invisible — it should read as a surface, not a
    // white ball. The colour comes from what's inside, not from the shell.
    const glass = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, low ? 2 : 4),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.02,
        transparent: true,
        opacity: 0.028,
        envMapIntensity: 0.9,
        clearcoat: 1,
        clearcoatRoughness: 0.015,
        iridescence: 1,
        iridescenceIOR: 1.35,
        iridescenceThicknessMinimum: 180,
        iridescenceThicknessMaximum: 620,
        depthWrite: false,
      })
    );
    group.add(glass);

    // Fresnel glass: the surface is nearly clear head-on and picks up the
    // library colour at grazing angles, which is how real glass behaves.
    const fresnel = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(p.hex) },
        uPower: { value: 2.6 },
        uStrength: { value: 1.45 },
      },
      vertexShader: `
        varying vec3 vNormalW;
        varying vec3 vViewDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uPower;
        uniform float uStrength;
        varying vec3 vNormalW;
        varying vec3 vViewDir;
        void main() {
          float facing = abs(dot(normalize(vNormalW), normalize(vViewDir)));
          float rim = pow(1.0 - facing, uPower);
          float glow = rim * uStrength;
          gl_FragColor = vec4(uColor * glow, glow * 0.9);
        }`,
    });
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.94, low ? 3 : 5), fresnel);
    group.add(inner);

    // a small bright heart so the orb has a light source inside it
    const heartMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    heartMat.color.set(p.hex).multiplyScalar(0.9).add(new THREE.Color(0xffffff).multiplyScalar(0.35));
    const orbHeart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.20, 1), heartMat);
    group.add(orbHeart);

    // an inner glow that spills colour onto the glass from inside
    const innerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeSprite(96, 0.06),
      color: new THREE.Color(p.hex),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.55,
    }));
    innerGlow.scale.setScalar(2.3);
    group.add(innerGlow);

    const light = new THREE.PointLight(new THREE.Color(p.hex), low ? 9 : 16, 9, 2);
    group.add(light);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeSprite(96, 0.02),
      color: new THREE.Color(p.hex),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.42,
    }));
    halo.scale.setScalar(2.9);
    group.add(halo);

    scene.add(group);
    return { group, glass, inner, innerGlow, orbHeart, light, halo, hex: p.hex, phase: i * 1.1 };
  });

  /* ---- post-processing (high tier only) ------------------------ */
  let composer = null;
  let bloom = null;
  if (!low) {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.42,   // strength
      0.72,   // radius
      0.82    // threshold
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  /* ---- camera choreography ------------------------------------- */
  // Keys are station coordinates: 0 = CORE, 1 = FIELD … 4 = EXIT.
  // Between keys the camera eases, so the move always feels intentional.
  const CAM = [
    // hero — framed so the artefact sits in the right third, headline left
    { s: 0.00, pos: [1.90, 0.80, 9.60], look: [2.20, 0.35, 0], fov: 46 },
    { s: 0.55, pos: [2.10, 1.40, 7.90], look: [2.60, 0.45, 0], fov: 46 },
    // field — back off while staying right of the copy panel
    { s: 1.00, pos: [0.40, 0.90, 9.00], look: [2.10, 0.05, 0], fov: 46 },
    { s: 1.55, pos: [-0.30, 1.60, 9.60], look: [2.35, 0.10, 0], fov: 45 },
    // lab — palette takes the screen; the camera drifts back and settles
    { s: 2.20, pos: [0.00, 0.40, 10.4], look: [0.00, 0.20, 0], fov: 45 },
    { s: 2.70, pos: [0.00, 0.30, 10.0], look: [0.00, 0.20, 0], fov: 45 },
    // signal — artefact parked high right, wavefield reading underneath
    { s: 3.20, pos: [-0.60, 0.10, 10.2], look: [3.10, 1.10, 0], fov: 47 },
    { s: 3.60, pos: [-0.80, -0.10, 10.6], look: [3.30, 1.20, 0], fov: 48 },
    // exit — pull back until it is a small bright artefact again
    { s: 4.00, pos: [0.00, 0.60, 17.0], look: [0.00, 0.00, 0], fov: 40 },
  ];


  /**
   * Where the artefact sits in frame. The hero pushes it right so the headline
   * owns the left half; the lab pushes it off-stage entirely.
   */
  // a phone has ~400px of width: the composition has to be vertical
  const MOBILE = () => window.innerWidth <= 860;

  const CORE_TRACK = {
    x: s => {
      if (s < 1.0) return MOBILE() ? -0.55 : 4.55;    // hero: right of the type
      if (s < 1.85) return MOBILE() ? -0.2 : lerp(3.75, 2.35, smooth((s - 1) / 0.85));
      if (s < 2.55) return 26.0;                      // lab: off-stage entirely
      if (s < 3.4) return lerp(26.0, 6.2, smooth((s - 2.45) / 0.95));
      if (s < 3.85) return 6.2;   // SIGNAL: parked to the right, clear of the wavefield
      return 0.0;                                     // exit: centred, small
    },
    y: s => {
      if (s > 3.3) return 1.55;              // signal: parked high right
      if (s >= 1.0) return 0;
      if (!MOBILE()) return 0.75;            // hero: lifted into the upper right
      // hero: portrait screens push it below the headline, wide ones centre it
      return MOBILE() ? -1.35 : -0.15;
    },
    scale: s => {
      if (s < 1.0) return 1.08;
      if (s < 2.45) return 0.9;
      if (s < 3.4) return 0.62;
      return 0.5;
    },
  };

  function sampleCam(s) {
    if (s <= CAM[0].s) return CAM[0];
    if (s >= CAM[CAM.length - 1].s) return CAM[CAM.length - 1];
    let i = 0;
    while (i < CAM.length - 1 && s > CAM[i + 1].s) i++;
    const a = CAM[i], b = CAM[i + 1];
    const t = smooth(clamp((s - a.s) / (b.s - a.s), 0, 1));
    return {
      pos: [lerp(a.pos[0], b.pos[0], t), lerp(a.pos[1], b.pos[1], t), lerp(a.pos[2], b.pos[2], t)],
      look: [lerp(a.look[0], b.look[0], t), lerp(a.look[1], b.look[1], t), lerp(a.look[2], b.look[2], t)],
      fov: lerp(a.fov, b.fov, t),
    };
  }

  // seat the artefact at its hero position before the first frame
  coreGroup.position.set(CORE_TRACK.x(0), CORE_TRACK.y(0), 0);
  coreGroup.scale.setScalar(CORE_TRACK.scale(0));

  /* ---- state --------------------------------------------------- */
  const state = {
    station: 0,         // 0 … 4
    dist: 0,            // how far into FIELD, 0…1 (dispersion)
    mouse: new THREE.Vector2(0, 0),
    mouseSmooth: new THREE.Vector2(0, 0),
    spinX: 0, spinY: 0, dragVX: 0, dragVY: 0,
    dragging: false,
    orbsActive: false,
    cells: [],          // DOM rects for lab cells
    paused: false,
    quality: low ? 'low' : 'high',
    fps: 60,
    pulse: 0,
  };

  /* ---- pulse ring (click the core) ------------------------------ */
  const pulseRing = new THREE.Mesh(
    new THREE.RingGeometry(1.9, 2.0, 96),
    new THREE.MeshBasicMaterial({
      color: 0x9eebff, transparent: true, opacity: 0, side: THREE.DoubleSide,
      toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending,
    })
  );
  pulseRing.rotation.x = Math.PI / 2;
  coreGroup.add(pulseRing);

  /* ---- resize --------------------------------------------------- */
  const vp = { w: window.innerWidth, h: window.innerHeight };
  function resize() {
    vp.w = window.innerWidth;
    vp.h = window.innerHeight;
    camera.aspect = vp.w / vp.h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.35 : 1.75));
    renderer.setSize(vp.w, vp.h, false);
    if (composer) {
      composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      composer.setSize(vp.w, vp.h);
      bloom.setSize(vp.w, vp.h);
    }
  }

  /* ---- the lab orbs: place them inside their DOM cells ---------- */
  const tmpV = new THREE.Vector3();
  const camDir = new THREE.Vector3();

  function placeOrbs() {
    if (!state.orbsActive || state.cells.length === 0) return;

    const dist = 7.4;                       // fixed depth in front of the camera
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * dist;
    const pxPerUnit = vp.h / (halfH * 2);   // world → pixel scale at that depth

    camera.getWorldDirection(camDir);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

    for (let i = 0; i < orbs.length; i++) {
      const cell = state.cells[i];
      const orb = orbs[i];
      if (!cell) { orb.group.visible = false; continue; }

      // cell centre in NDC
      const nx = (cell.cx / vp.w) * 2 - 1;
      const ny = -((cell.cy / vp.h) * 2 - 1);

      // nudge up: names + hex sit at the bottom of each cell
      const labelLift = cell.h * 0.16;
      const anchor = new THREE.Vector3()
        .copy(camera.position)
        .addScaledVector(camDir, dist)
        .addScaledVector(right, nx * halfH * camera.aspect)
        .addScaledVector(up, ny * halfH + (labelLift / pxPerUnit));

      orb.group.position.copy(anchor);
      // radius in world units so the orb fills ~86% of the cell's shorter side
      const targetPx = Math.min(cell.w, cell.h) * 0.36;
      orb.group.scale.setScalar(targetPx / pxPerUnit);
      orb.group.visible = cell.visible;
    }
  }

  /* ---- frame ---------------------------------------------------- */
  const timer = new THREE.Timer();
  timer.connect?.(document);
  let raf = 0;
  let fpsAccum = 0, fpsFrames = 0, fpsTimer = 0;
  let degrading = 0;

  function update(dt, t) {
    const s = state.station;
    const cam = sampleCam(s);
    const motion = reduced ? 0.18 : 1;

    /* camera — position, look, fov, plus mouse parallax */
    state.mouseSmooth.x = damp(state.mouseSmooth.x, state.mouse.x, 2.6, dt);
    state.mouseSmooth.y = damp(state.mouseSmooth.y, state.mouse.y, 2.6, dt);

    const px = cam.pos[0] + state.mouseSmooth.x * 0.55 * motion;
    const py = cam.pos[1] - state.mouseSmooth.y * 0.34 * motion;
    const pz = cam.pos[2];

    camera.position.set(px, py, pz);

    // portrait: centre the frame on the artefact instead of the authored target
    const portrait = MOBILE();
    const lookX = portrait && s < 2.1
      ? damp(camera.userData.lookX ?? cam.look[0], coreGroup.position.x * 0.92, 3, dt)
      : cam.look[0];
    camera.userData.lookX = lookX;

    camera.lookAt(lookX, cam.look[1], cam.look[2]);
    // subtle roll keeps the horizon from feeling mechanical
    camera.rotation.z += state.mouseSmooth.x * 0.022 * motion;

    if (Math.abs(camera.fov - cam.fov) > 0.01) {
      camera.fov = damp(camera.fov, cam.fov, 4, dt);
      camera.updateProjectionMatrix();
    }

    /* the artefact: idle rotation + drag inertia */
    if (!state.dragging) {
      state.dragVX = damp(state.dragVX, 0, 2.4, dt);
      state.dragVY = damp(state.dragVY, 0, 2.4, dt);
    }
    state.spinY += state.dragVY * dt;
    state.spinX += state.dragVX * dt;

    coreGroup.rotation.y = t * 0.16 * motion + state.spinY;
    coreGroup.rotation.x = Math.sin(t * 0.24) * 0.14 * motion + state.spinX;
    core.rotation.y = -t * 0.38 * motion;
    core.rotation.x = t * 0.12 * motion;
    shell.rotation.y = t * 0.09 * motion;
    shell.rotation.z = -t * 0.05 * motion;

    /* dispersion driven by FIELD scroll */
    const d = state.dist;
    const dE = easeInOut(d);

    core.scale.setScalar(Math.max(0.05, 1 - dE * 0.92));
    shell.scale.setScalar(1 + dE * 0.42);
    shellMat.opacity = 0.07 + dE * 0.16;
    heart.scale.setScalar(1 + dE * 0.55);
    heartGlow.scale.setScalar(3.6 + dE * 2.4);
    heartMat.color.setHex(0x7c80ff).multiplyScalar(2.2 - dE * 0.7);

    for (const sd of shardData) {
      const r = sd.base + dE * sd.spread * 2.6;
      sd.mesh.position.copy(sd.dir).multiplyScalar(r);
      sd.mesh.rotation.x += sd.spin.x * dt * (1 + dE * 2.2);
      sd.mesh.rotation.y += sd.spin.y * dt * (1 + dE * 2.2);
      sd.mesh.rotation.z += sd.spin.z * dt * (1 + dE * 2.2);
      sd.mesh.scale.setScalar(1 + dE * 1.5);
    }

    /* orbital cage */
    for (let i = 0; i < ringObjs.length; i++) {
      const r = ringObjs[i];
      r.group.rotation.z += r.def.spin * dt * (1 + dE * 1.6);
      r.group.rotation.x = r.def.tilt[0] + Math.sin(t * 0.3 + r.phase) * 0.22;
      const a = t * (0.5 + i * 0.22) + r.phase;
      r.bead.position.set(Math.cos(a) * r.def.r, Math.sin(a) * r.def.r, 0);
      const expand = 1 + dE * 0.55;
      r.group.scale.setScalar(expand);
    }

    /* click pulse */
    if (state.pulse > 0.001) {
      state.pulse = Math.max(0, state.pulse - dt * 1.15);
      const p = 1 - state.pulse;
      pulseRing.scale.setScalar(1 + p * 3.4);
      pulseRing.material.opacity = state.pulse * 0.75;
      pulseRing.rotation.z = p * 0.9;
      pulseRing.visible = true;
    } else {
      pulseRing.visible = false;
    }

    /* dust drifts; parallaxes hardest so depth reads immediately */
    dust.rotation.y = t * 0.014 * motion + state.mouseSmooth.x * 0.06;
    dust.rotation.x = state.mouseSmooth.y * 0.04;
    dust.position.x = state.mouseSmooth.x * 0.7 * motion;
    dust.position.y = -state.mouseSmooth.y * 0.5 * motion;

    /* rim lights breathe */
    rimIris.intensity = (low ? 26 : 42) * (0.85 + Math.sin(t * 0.9) * 0.15);
    rimFuschia.intensity = (low ? 22 : 36) * (0.85 + Math.cos(t * 0.7) * 0.15);
    coreGlow.intensity = (16 + Math.sin(t * 1.6) * 5) * (1 + state.pulse * 1.6);

    /* keep the glow light inside the artefact */
    coreGlow.position.set(
      Math.sin(t * 0.5) * 0.7,
      Math.cos(t * 0.42) * 0.7,
      Math.sin(t * 0.33) * 0.7
    );

    /* lab orbs */
    if (state.orbsActive) {
      for (const o of orbs) {
        o.inner.rotation.y = t * 0.5 + o.phase;
        o.orbHeart.rotation.y = -t * 0.8;
        o.halo.scale.setScalar(2.9 + Math.sin(t * 1.6 + o.phase) * 0.22);
        o.light.intensity = (low ? 9 : 16) * (0.9 + Math.sin(t * 1.3 + o.phase) * 0.1);
      }
      placeOrbs();
    }

    /* the artefact's home in frame, per station.
       Setting the position (not adding to it) is what keeps this stable:
       the previous version multiplied scale every frame and shrank to nothing. */
    const homeX = CORE_TRACK.x(s);
    const homeY = CORE_TRACK.y(s);
    const homeScale = CORE_TRACK.scale(s);

    // the lab owns the frame: hide the artefact rather than park it at an edge
    coreGroup.visible = !(s > 1.92 && s < 2.93);

    coreGroup.position.x = damp(coreGroup.position.x, homeX, 2.4, dt);
    coreGroup.position.y = damp(coreGroup.position.y, homeY, 2.4, dt);
    coreGroup.scale.setScalar(damp(coreGroup.scale.x, homeScale, 2.4, dt));

    // shards only exist once the shell starts coming apart
    const shardVis = d > 0.02;
    shards.visible = shardVis;
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    if (state.paused) return;

    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();

    update(dt, t);

    if (composer) composer.render();
    else renderer.render(scene, camera);

    /* fps meter + one-shot quality degrade for weaker GPUs */
    fpsFrames++; fpsAccum += dt; fpsTimer += dt;
    if (fpsAccum >= 0.5) {
      state.fps = Math.round(fpsFrames / fpsAccum);
      fpsFrames = 0; fpsAccum = 0;

      if (!low && degrading === 0 && state.fps < 34 && fpsTimer > 4) {
        // shed the expensive pass first, then resolution
        composer.removePass(bloom);
        renderer.setPixelRatio(1);
        renderer.setSize(vp.w, vp.h, false);
        state.quality = 'reduced';
        degrading = 1;
        document.documentElement.dataset.quality = 'reduced';
      }
    }
  }

  /* ---- public api ----------------------------------------------- */
  return {
    start() { frame(); },
    stop() { cancelAnimationFrame(raf); },
    pause(v) { state.paused = v; },
    resize,
    setPointer(nx, ny) { state.mouse.set(nx, ny); },
    setStation(s) { state.station = s; },
    setDist(d) { state.dist = d; },
    setOrbsActive(v) {
      state.orbsActive = v;
      if (!v) for (const o of orbs) o.group.visible = false;
    },
    setCells(cells) { state.cells = cells; },
    pulse() { state.pulse = 1; },
    dragDelta(dx, dy) {
      state.dragVY += dx * 0.0075;
      state.dragVX += dy * 0.0075;
      state.dragVY = clamp(state.dragVY, -2.2, 2.2);
      state.dragVX = clamp(state.dragVX, -2.2, 2.2);
    },
    setDragging(v) { state.dragging = v; },
    get fps() { return state.fps; },
    get quality() { return state.quality; },
    get tier() { return tier; },
    // dev hooks: let the visual harness verify materials and env brightness
    _debug: { renderer, scene, camera, core, shell, heart, ringObjs, coreGroup },
    get stats() {
      return {
        tier: state.quality,
        fps: state.fps,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        textures: renderer.info.memory.textures,
        orbsActive: state.orbsActive,
        station: +state.station.toFixed(2),
      };
    },
  };
}
