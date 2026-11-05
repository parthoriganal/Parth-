// AETHERBOUND — the Rift.
// A living aperture: vortex shader, crackling arcs, infalling matter, shock
// rings and soft volumetric shafts. It is the hinge of the entire film.

import { NOISE } from '../core/glsl.js';
import { makeRng } from '../core/math.js';

const PORTAL_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PORTAL_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uForm;
  uniform float uIntensity;
  uniform vec3 uColorCore;
  uniform vec3 uColorMid;
  uniform vec3 uColorEdge;
  uniform vec3 uColorHot;
  varying vec2 vUv;

  ${NOISE}

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    float a = atan(p.y, p.x);
    float swirl = a + uTime * 0.5 + (1.0 - r) * 2.8;
    vec2 sp = vec2(cos(swirl), sin(swirl)) * r;

    float n1 = fbm3(vec3(sp * 2.4, uTime * 0.2));
    float n2 = fbm3(vec3(sp * 5.1 + 3.7, uTime * 0.34));
    float vortex = smoothstep(0.24, 0.86, n1 * 0.66 + n2 * 0.44);

    float streak = pow(max(0.0, sin(a * 19.0 + n1 * 9.0 + uTime * 1.2)), 9.0);
    float rim = smoothstep(0.7, 0.985, r) * (1.0 - smoothstep(0.985, 1.0, r));
    float core = smoothstep(0.5, 0.0, r);

    vec3 col = mix(uColorCore, uColorMid, smoothstep(0.0, 0.58, r));
    col = mix(col, uColorEdge, smoothstep(0.55, 0.98, r));
    col += uColorHot * (vortex * 0.6 + streak * 0.4) * (0.35 + r * 0.9);
    col += uColorHot * rim * 0.65;

    // The heart of the rift is a dark, absolute calm.
    col = mix(col, uColorCore * 0.08, smoothstep(0.34, 0.0, r) * 0.9);

    float ripple = sin(r * 27.0 - uTime * 4.2) * 0.5 + 0.5;
    col += uColorHot * ripple * 0.07 * smoothstep(0.18, 0.92, r);

    float alpha = smoothstep(1.0, 0.9, r);
    alpha = max(alpha, rim);
    alpha *= uForm;

    gl_FragColor = vec4(col * uIntensity, alpha);
  }
`;

const SHAFT_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHAFT_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;

  ${NOISE}

  void main() {
    float edge = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
    float n = fbm2(vec2(vUv.x * 7.0, vUv.y * 2.6 - uTime * 0.16));
    float streak = 0.45 + 0.55 * n;
    vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.9, vUv.y));
    float a = edge * streak * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(col, a);
  }
`;

const PARTICLE_VERT = /* glsl */ `
  attribute float aRadius;
  attribute float aAngle;
  attribute float aSpeed;
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uForm;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = mod(aRadius - uTime * aSpeed, 23.0);
    float norm = clamp(r / 23.0, 0.0, 1.0);
    float angle = aAngle + uTime * (0.32 + aSpeed * 0.055) + (1.0 - norm) * 2.6;
    float z = sin(uTime * 0.7 + aPhase) * 1.8 * norm;
    vec3 pos = vec3(cos(angle) * r, sin(angle) * r, z);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = clamp(aSize * uPixelRatio * (250.0 / max(1.0, -mv.z)), 1.0, 6.5);
    gl_Position = projectionMatrix * mv;

    vColor = aColor;
    float edge = smoothstep(0.0, 0.1, norm) * (1.0 - smoothstep(0.72, 1.0, norm));
    vAlpha = edge * smoothstep(0.14, 0.3, norm) * uForm;
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float glow = pow(max(0.0, 1.0 - d * 2.0), 2.2);
    float a = glow * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * (1.2 + glow), a);
  }
`;

export function createPortal(THREE, lib) {
  const group = new THREE.Group();
  group.name = 'rift';
  group.visible = false;

  const rng = makeRng(0x9f13c7);

  // ---- main vortex ---------------------------------------------------------
  const portalUniforms = {
    uTime: { value: 0 },
    uForm: { value: 0 },
    uIntensity: { value: 1 },
    uColorCore: { value: new THREE.Color('#05010c') },
    uColorMid: { value: new THREE.Color('#3a0f5e') },
    uColorEdge: { value: new THREE.Color('#b02a7a') },
    uColorHot: { value: new THREE.Color('#7fe7ff') },
  };
  const portalMat = new THREE.ShaderMaterial({
    uniforms: portalUniforms,
    vertexShader: PORTAL_VERT,
    fragmentShader: PORTAL_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(6.45, 96), portalMat);
  disc.position.z = 0.02;
  disc.renderOrder = 4;
  group.add(disc);

  // ---- halo ---------------------------------------------------------------
  const haloMat = lib.glow({ color: '#b04cff', intensity: 0.9, power: 2.6, flicker: 0.1 });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), haloMat);
  halo.position.z = -0.25;
  halo.renderOrder = 3;
  group.add(halo);

  const hotHaloMat = lib.glow({ color: '#7fe7ff', intensity: 0.7, power: 3.4, flicker: 0.16 });
  const hotHalo = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), hotHaloMat);
  hotHalo.position.z = -0.1;
  hotHalo.renderOrder = 3;
  group.add(hotHalo);

  // ---- rings --------------------------------------------------------------
  const ringMatA = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 0.8, 2.0),
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const ringMatB = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.5, 1.9, 2.6),
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.075, 8, 140), ringMatA);
  ringA.position.z = 0.1;
  group.add(ringA);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(6.85, 0.035, 6, 140), ringMatB);
  ringB.position.z = 0.06;
  group.add(ringB);
  const ringC = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.02, 5, 140), ringMatB);
  ringC.position.z = 0.02;
  group.add(ringC);

  // ---- shock rings --------------------------------------------------------
  const shockMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.4, 0.7, 2.2),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const shocks = [];
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.0, 96), shockMat.clone());
    mesh.position.z = 0.15 + i * 0.02;
    mesh.renderOrder = 5;
    group.add(mesh);
    shocks.push({ mesh, phase: i / 3 });
  }

  // ---- crackling arcs -----------------------------------------------------
  const arcCount = 14;
  const segments = 10;
  const arcPositions = new Float32Array(arcCount * segments * 2 * 3);
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPositions, 3));
  const arcMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(1.6, 1.1, 2.6),
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const arcs = new THREE.LineSegments(arcGeo, arcMat);
  arcs.frustumCulled = false;
  arcs.renderOrder = 6;
  group.add(arcs);
  const arcSeeds = [];
  for (let i = 0; i < arcCount; i++) {
    arcSeeds.push({
      angle: rng.range(0, Math.PI * 2),
      length: rng.range(1.2, 4.2),
      speed: rng.range(0.6, 1.8),
      phase: rng.range(0, 6.28),
      z: rng.range(-0.3, 0.6),
    });
  }

  // ---- infalling matter ---------------------------------------------------
  const count = 1500;
  const pPos = new Float32Array(count * 3);
  const pRad = new Float32Array(count);
  const pAng = new Float32Array(count);
  const pSpd = new Float32Array(count);
  const pSize = new Float32Array(count);
  const pPhase = new Float32Array(count);
  const pCol = new Float32Array(count * 3);
  const palette = [
    new THREE.Color('#7fe7ff'),
    new THREE.Color('#ff6fae'),
    new THREE.Color('#ffd08a'),
    new THREE.Color('#b98cff'),
    new THREE.Color('#ffffff'),
  ];
  for (let i = 0; i < count; i++) {
    pRad[i] = rng.range(6.6, 23.0);
    pAng[i] = rng.range(0, Math.PI * 2);
    pSpd[i] = rng.range(0.35, 1.8);
    pSize[i] = rng.range(0.5, 2.0);
    pPhase[i] = rng.range(0, 6.28);
    const c = rng.pick(palette);
    pCol[i * 3] = c.r;
    pCol[i * 3 + 1] = c.g;
    pCol[i * 3 + 2] = c.b;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aRadius', new THREE.BufferAttribute(pRad, 1));
  pGeo.setAttribute('aAngle', new THREE.BufferAttribute(pAng, 1));
  pGeo.setAttribute('aSpeed', new THREE.BufferAttribute(pSpd, 1));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
  pGeo.setAttribute('aPhase', new THREE.BufferAttribute(pPhase, 1));
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 3));
  const pMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uForm: { value: 0 },
      uPixelRatio: { value: 1 },
    },
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(pGeo, pMat);
  particles.frustumCulled = false;
  particles.renderOrder = 7;
  group.add(particles);

  // ---- volumetric shafts --------------------------------------------------
  const shaftMats = [];
  const shaftDefs = [
    { r: 4.6, h: 22, z: 11, rot: Math.PI / 2, o: 0.1, a: '#2a6a8a', b: '#a03a7a' },
    { r: 6.8, h: 30, z: 15, rot: Math.PI / 2, o: 0.055, a: '#1a3a5a', b: '#6a2a6a' },
    { r: 4.2, h: 20, z: -10, rot: -Math.PI / 2, o: 0.09, a: '#2a6a8a', b: '#a03a7a' },
    { r: 6.2, h: 26, z: -13, rot: -Math.PI / 2, o: 0.05, a: '#1a3a5a', b: '#6a2a6a' },
  ];
  for (const def of shaftDefs) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uColorA: { value: new THREE.Color(def.a) },
        uColorB: { value: new THREE.Color(def.b) },
      },
      vertexShader: SHAFT_VERT,
      fragmentShader: SHAFT_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(def.r, def.h, 24, 1, true), mat);
    mesh.rotation.x = def.rot;
    mesh.position.z = def.z;
    mesh.renderOrder = 2;
    group.add(mesh);
    shaftMats.push({ mat, base: def.o });
  }

  // ---- animation ----------------------------------------------------------
  let form = 0;
  let intensity = 1;

  function update(dt, t, state = {}) {
    const targetForm = state.form ?? 0;
    form += (targetForm - form) * Math.min(1, dt * 3.2);
    const targetIntensity = state.intensity ?? 1;
    intensity += (targetIntensity - intensity) * Math.min(1, dt * 2.5);

    group.visible = form > 0.002;
    const s = 0.02 + 0.98 * (1 - Math.pow(1 - form, 3));
    group.scale.setScalar(s);

    portalUniforms.uTime.value = t;
    portalUniforms.uForm.value = Math.min(1, form * 1.15);
    portalUniforms.uIntensity.value = 0.45 + intensity * 0.3;

    haloMat.uniforms.uIntensity.value = (0.15 + form * 0.3) * (0.85 + 0.15 * Math.sin(t * 1.7));
    hotHaloMat.uniforms.uIntensity.value = (0.1 + form * 0.25) * (0.8 + 0.2 * Math.sin(t * 2.3 + 1.0));
    halo.scale.setScalar(0.6 + form * 0.55 + Math.sin(t * 0.9) * 0.02);
    hotHalo.scale.setScalar(0.5 + form * 0.6);

    ringA.rotation.z = t * 0.22;
    ringB.rotation.z = -t * 0.16;
    ringC.rotation.z = t * 0.1;
    ringMatA.opacity = (0.35 + form * 0.6) * (0.8 + 0.2 * Math.sin(t * 2.1));
    ringMatB.opacity = (0.2 + form * 0.4) * (0.8 + 0.2 * Math.sin(t * 1.6 + 2.0));

    for (let i = 0; i < shocks.length; i++) {
      const s2 = shocks[i];
      const phase = (t * 0.28 + s2.phase) % 1;
      const scale = 0.4 + phase * 4.6;
      s2.mesh.scale.setScalar(scale);
      s2.mesh.material.opacity = (1 - phase) * (1 - phase) * 0.5 * form;
      s2.mesh.rotation.z = t * 0.05 + i;
    }

    // arcs
    const pos = arcGeo.attributes.position.array;
    let ptr = 0;
    for (let i = 0; i < arcCount; i++) {
      const seed = arcSeeds[i];
      let prevX = 0;
      let prevY = 0;
      let prevZ = 0;
      for (let j = 0; j < segments; j++) {
        const f = j / segments;
        const r = 6.5 + f * seed.length;
        const wobble = Math.sin(t * seed.speed + seed.phase + j * 1.7) * 0.16 * (0.3 + f);
        const a = seed.angle + wobble + f * 0.35;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        const z = seed.z + Math.sin(t * seed.speed * 1.3 + j * 2.1 + seed.phase) * 0.35 * f;
        if (j > 0) {
          pos[ptr++] = prevX;
          pos[ptr++] = prevY;
          pos[ptr++] = prevZ;
          pos[ptr++] = x;
          pos[ptr++] = y;
          pos[ptr++] = z;
        }
        prevX = x;
        prevY = y;
        prevZ = z;
      }
    }
    arcGeo.setDrawRange(0, ptr / 3);
    arcGeo.attributes.position.needsUpdate = true;
    arcMat.opacity = (0.15 + form * 0.6) * (0.65 + 0.35 * Math.sin(t * 7.0));

    pMat.uniforms.uTime.value = t;
    pMat.uniforms.uForm.value = form;
    pMat.uniforms.uPixelRatio.value = state.pixelRatio ?? 1;

    for (const s2 of shaftMats) {
      s2.mat.uniforms.uTime.value = t;
      s2.mat.uniforms.uOpacity.value = s2.base * form * (0.75 + 0.25 * Math.sin(t * 1.2));
    }
  }

  return {
    group,
    update,
    get form() { return form; },
    get intensity() { return intensity; },
    radius: 6.45,
  };
}
