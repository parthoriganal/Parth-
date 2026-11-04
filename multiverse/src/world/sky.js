// AETHERBOUND — the deep field. A procedural sky dome, two starfields and
// layered painterly nebulae. Everything is generated at runtime.

import { NOISE } from '../core/glsl.js';
import { makeRng } from '../core/math.js';

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uDeep;
  uniform vec3 uHorizon;
  uniform vec3 uNebulaA;
  uniform vec3 uNebulaB;
  uniform vec3 uGlowColor;
  uniform vec3 uGlowDir;
  varying vec3 vDir;

  ${NOISE}

  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uDeep, uHorizon, smoothstep(0.02, 0.92, h));

    // A tilted galactic band.
    float band = exp(-pow(dot(d, normalize(vec3(0.34, 0.42, -0.84))), 2.0) * 5.5);

    float n1 = fbm3(d * 2.35 + vec3(0.0, uTime * 0.0035, 0.0));
    float n2 = fbm3(d * 4.9 + vec3(4.2, 1.3, -uTime * 0.0028));
    float cloud = smoothstep(0.4, 0.8, n1 * 0.72 + n2 * 0.4);

    col = mix(col, uNebulaA, cloud * (0.22 + band * 0.5) * uIntensity);
    col = mix(col, uNebulaB, smoothstep(0.52, 0.92, n2) * band * 0.5 * uIntensity);

    // A distant galactic core.
    float g = pow(max(0.0, dot(d, normalize(uGlowDir))), 9.0);
    col += uGlowColor * g * 0.34 * uIntensity;

    // Fine star dust.
    float dust = pow(vnoise3(d * 190.0), 16.0) * 2.2;
    col += vec3(0.72, 0.82, 1.0) * dust * 0.10;

    // Keep the lower hemisphere from going pure black.
    col += uDeep * 0.18 * (1.0 - h);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const HERO_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = aColor;
    vTwinkle = 0.7 + 0.3 * sin(uTime * 0.4 + aPhase);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uPixelRatio * (330.0 / max(1.0, -mv.z)), 2.0, 22.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const HERO_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.0, d);
    float glow = pow(core, 4.0);
    float cross = smoothstep(0.055, 0.0, abs(c.x)) + smoothstep(0.055, 0.0, abs(c.y));
    float a = (glow + cross * core * 0.4) * vTwinkle;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * (1.1 + glow * 1.4), a);
  }
`;

export function createSky(THREE, lib, opts = {}) {
  const group = new THREE.Group();
  group.name = 'deep-field';

  const skyUniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 1 },
    uDeep: { value: new THREE.Color('#03040c') },
    uHorizon: { value: new THREE.Color('#0a1730') },
    uNebulaA: { value: new THREE.Color('#123a52') },
    uNebulaB: { value: new THREE.Color('#3a1c4e') },
    uGlowColor: { value: new THREE.Color('#ffb45e') },
    uGlowDir: { value: new THREE.Vector3(-0.55, 0.28, -0.78).normalize() },
  };

  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 40, 24), skyMat);
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  group.add(sky);

  // ---- main starfield ------------------------------------------------------
  const rng = makeRng(0x51a7f13);
  const starCount = opts.starCount ?? 1700;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const phases = new Float32Array(starCount);
  const colors = new Float32Array(starCount * 3);
  const palette = [
    new THREE.Color('#dfe9ff'),
    new THREE.Color('#ffffff'),
    new THREE.Color('#bcd4ff'),
    new THREE.Color('#ffe6bd'),
    new THREE.Color('#9fb6e8'),
  ];
  for (let i = 0; i < starCount; i++) {
    const u = rng.range(-1, 1);
    const theta = rng.range(0, Math.PI * 2);
    const r = rng.range(210, 340);
    const s = Math.sqrt(1 - u * u);
    positions[i * 3] = Math.cos(theta) * s * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = Math.sin(theta) * s * r;
    sizes[i] = rng.range(0.7, 2.6) * (rng.chance(0.06) ? 1.8 : 1);
    phases[i] = rng.range(0, Math.PI * 2);
    const c = rng.pick(palette);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  const starMat = lib.stars({ opacity: 0.95 });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -900;
  stars.frustumCulled = false;
  group.add(stars);

  // ---- hero stars with a subtle cross flare --------------------------------
  const heroCount = 16;
  const hPos = new Float32Array(heroCount * 3);
  const hSize = new Float32Array(heroCount);
  const hPhase = new Float32Array(heroCount);
  const hCol = new Float32Array(heroCount * 3);
  for (let i = 0; i < heroCount; i++) {
    const u = rng.range(-0.75, 0.9);
    const theta = rng.range(0, Math.PI * 2);
    const r = rng.range(230, 320);
    const s = Math.sqrt(1 - u * u);
    hPos[i * 3] = Math.cos(theta) * s * r;
    hPos[i * 3 + 1] = u * r;
    hPos[i * 3 + 2] = Math.sin(theta) * s * r;
    hSize[i] = rng.range(3.2, 7.5);
    hPhase[i] = rng.range(0, Math.PI * 2);
    const c = rng.pick([new THREE.Color('#fff4dc'), new THREE.Color('#cfe6ff'), new THREE.Color('#ffd2a1')]);
    hCol[i * 3] = c.r;
    hCol[i * 3 + 1] = c.g;
    hCol[i * 3 + 2] = c.b;
  }
  const heroGeo = new THREE.BufferGeometry();
  heroGeo.setAttribute('position', new THREE.BufferAttribute(hPos, 3));
  heroGeo.setAttribute('aSize', new THREE.BufferAttribute(hSize, 1));
  heroGeo.setAttribute('aPhase', new THREE.BufferAttribute(hPhase, 1));
  heroGeo.setAttribute('aColor', new THREE.BufferAttribute(hCol, 3));
  const heroMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: HERO_VERT,
    fragmentShader: HERO_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const heroStars = new THREE.Points(heroGeo, heroMat);
  heroStars.renderOrder = -890;
  heroStars.frustumCulled = false;
  group.add(heroStars);

  // ---- nebula veils --------------------------------------------------------
  const nebulaGroup = new THREE.Group();
  const nebulaDefs = [
    { p: [-34, 12, -70], s: [110, 70], seed: 1.3, o: 0.3, a: '#123a52', b: '#1d5a63', scale: 3.1 },
    { p: [46, -10, -95], s: [130, 80], seed: 4.7, o: 0.24, a: '#2a1745', b: '#6b2a5e', scale: 2.6 },
    { p: [4, 26, -140], s: [190, 110], seed: 9.2, o: 0.2, a: '#0d2c46', b: '#3a1c4e', scale: 2.2 },
    { p: [-72, -22, -40], s: [90, 55], seed: 2.4, o: 0.22, a: '#0e2a3e', b: '#244a63', scale: 3.6 },
    { p: [24, 34, -50], s: [80, 50], seed: 6.6, o: 0.16, a: '#2c1a3e', b: '#123a52', scale: 4.0 },
    { p: [-20, -6, -180], s: [210, 120], seed: 12.4, o: 0.26, a: '#3a1230', b: '#0e4a52', scale: 2.0 },
    { p: [60, 18, -170], s: [160, 100], seed: 15.1, o: 0.2, a: '#123a52', b: '#4a1a4e', scale: 2.4 },
  ];
  const nebulaMats = [];
  for (const def of nebulaDefs) {
    const mat = lib.nebula({
      seed: def.seed,
      scale: def.scale,
      opacity: def.o,
      colorA: def.a,
      colorB: def.b,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.s[0], def.s[1]), mat);
    mesh.position.set(def.p[0], def.p[1], def.p[2]);
    mesh.renderOrder = -800;
    nebulaGroup.add(mesh);
    nebulaMats.push(mat);
  }
  group.add(nebulaGroup);

  // ---- a far sun -----------------------------------------------------------
  const sunGroup = new THREE.Group();
  const sunMat = lib.glow({ color: '#ffc27a', intensity: 0.85, power: 2.1, flicker: 0.05 });
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), sunMat);
  sun.position.set(-95, 46, -210);
  sun.renderOrder = -790;
  sunGroup.add(sun);
  const sunCoreMat = lib.glow({ color: '#fff2d0', intensity: 1.6, power: 3.2, flicker: 0.02 });
  const sunCore = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), sunCoreMat);
  sunCore.position.set(-95, 46, -209);
  sunCore.renderOrder = -789;
  sunGroup.add(sunCore);
  group.add(sunGroup);

  const state = {
    group,
    skyUniforms,
    heroMat,
    nebulaMats,
    sunMat,
    sunCoreMat,
    setPalette(p) {
      skyUniforms.uDeep.value.copy(p.skyDeep);
      skyUniforms.uHorizon.value.copy(p.skyHorizon);
      skyUniforms.uNebulaA.value.copy(p.skyNebulaA);
      skyUniforms.uNebulaB.value.copy(p.skyNebulaB);
      skyUniforms.uGlowColor.value.copy(p.skyGlow);
      skyUniforms.uIntensity.value = p.skyIntensity ?? 1;
      sunMat.uniforms.uColor.value.copy(p.sunColor ?? p.skyGlow);
    },
    update(time, pixelRatio) {
      skyUniforms.uTime.value = time;
      heroMat.uniforms.uTime.value = time;
      heroMat.uniforms.uPixelRatio.value = pixelRatio;
    },
  };

  return state;
}
