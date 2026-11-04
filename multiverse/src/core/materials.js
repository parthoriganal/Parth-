// AETHERBOUND — the illustrated surface system.
// A hand-written cel shader: banded key light, painterly value noise, ink rim,
// a single hard specular, and distance fog. No textures, no external assets.

import { NOISE } from './glsl.js';

const CEL_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewPos;
  varying vec2 vUv;
  varying vec3 vTint;
  #ifdef USE_TINT
    attribute vec3 aTint;
  #endif

  void main() {
    vUv = uv;
    vec3 pos = position;
    vec3 nrm = normal;

    #ifdef USE_INSTANCING
      pos = (instanceMatrix * vec4(pos, 1.0)).xyz;
      nrm = mat3(instanceMatrix) * nrm;
    #endif

    #ifdef USE_TINT
      vTint = aTint;
    #else
      vTint = vec3(1.0);
    #endif

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * nrm);
    vec4 mv = viewMatrix * world;
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const CEL_FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uShadowColor;
  uniform vec3 uLightColor;
  uniform vec3 uRimColor;
  uniform vec3 uEmissive;
  uniform vec3 uFogColor;
  uniform vec3 uLightDir;
  uniform float uRimStrength;
  uniform float uAmbient;
  uniform float uFogDensity;
  uniform float uEmissiveStrength;
  uniform float uOpacity;
  uniform float uPaint;
  uniform float uPulseSpeed;
  uniform float uSpecStrength;

  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewPos;
  varying vec2 vUv;
  varying vec3 vTint;

  ${NOISE}

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uLightDir);

    float ndl = dot(N, L) * 0.5 + 0.5;

    // Painterly modulation: low-frequency blotches + stretched brush marks.
    float paint = fbm3(vWorldPos * 0.34 + vec3(0.0, uTime * 0.012, 0.0));
    float brush = fbm2(vec2(vWorldPos.x * 0.19 + vWorldPos.z * 0.13, vWorldPos.y * 1.15));

    // Two hard bands, softened only by the paint noise.
    float ramp = smoothstep(0.435, 0.475, ndl) * 0.56
               + smoothstep(0.675, 0.725, ndl) * 0.44;
    ramp = clamp(ramp + (paint - 0.5) * 0.17 * uPaint, 0.0, 1.0);

    vec3 base = mix(uShadowColor, uBaseColor, ramp);
    base *= 0.9 + 0.2 * brush;
    base *= vTint;

    // Cool bounce from below keeps the shadow side from going flat.
    float bounce = clamp(-N.y * 0.5 + 0.5, 0.0, 1.0);
    base += uBaseColor * bounce * 0.055 * uAmbient;

    // Ink rim.
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.35);
    vec3 rim = uRimColor * fres * uRimStrength;

    // One clean specular, only on the lit band.
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 30.0) * smoothstep(0.52, 0.8, ndl) * uSpecStrength;
    vec3 specCol = uLightColor * spec;

    // Emissive energy, breathing slowly.
    float pulse = 0.82 + 0.18 * sin(uTime * uPulseSpeed + vWorldPos.y * 0.6 + vWorldPos.x * 0.21);
    vec3 emis = uEmissive * uEmissiveStrength * pulse;

    // A whisper of comic halftone in the deepest shadow.
    float dots = step(0.55, fract((vWorldPos.x + vWorldPos.y) * 7.0));
    base *= 1.0 - dots * (1.0 - ramp) * 0.06;

    float dist = length(vViewPos);
    float fog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    fog = clamp(fog, 0.0, 0.94);

    vec3 color = base + rim + specCol + emis;
    color = mix(color, uFogColor, fog);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

const OUTLINE_VERT = /* glsl */ `
  uniform float uThickness;
  void main() {
    vec3 pos = position + normal * uThickness;
    #ifdef USE_INSTANCING
      pos = (instanceMatrix * vec4(pos, 1.0)).xyz;
    #endif
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
  }
`;

const OUTLINE_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    gl_FragColor = vec4(uColor, uOpacity);
  }
`;

export function createCelMaterial(THREE, opts = {}) {
  const defines = {};
  if (opts.tint) defines.USE_TINT = '';

  const uniforms = {
    uTime: { value: 0 },
    uBaseColor: { value: new THREE.Color(opts.color ?? '#33405c') },
    uShadowColor: { value: new THREE.Color(opts.shadow ?? '#05070f') },
    uLightColor: { value: new THREE.Color(opts.lightColor ?? '#ffe3b0') },
    uRimColor: { value: new THREE.Color(opts.rim ?? '#8fe9ff') },
    uEmissive: { value: new THREE.Color(opts.emissive ?? '#000000') },
    uFogColor: { value: new THREE.Color(opts.fog ?? '#05060f') },
    uLightDir: { value: new THREE.Vector3(-0.45, 0.72, 0.55).normalize() },
    uRimStrength: { value: opts.rimStrength ?? 0.55 },
    uAmbient: { value: opts.ambient ?? 1.0 },
    uFogDensity: { value: opts.fogDensity ?? 0.0075 },
    uEmissiveStrength: { value: opts.emissiveStrength ?? 0 },
    uOpacity: { value: opts.opacity ?? 1 },
    uPaint: { value: opts.paint ?? 1.0 },
    uPulseSpeed: { value: opts.pulseSpeed ?? 1.0 },
    uSpecStrength: { value: opts.spec ?? 0.35 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: CEL_VERT,
    fragmentShader: CEL_FRAG,
    defines,
    transparent: !!opts.transparent,
    depthWrite: opts.depthWrite !== false,
    side: opts.side ?? THREE.FrontSide,
  });

  material.userData.isCel = true;
  material.userData.baseOpacity = uniforms.uOpacity.value;
  return material;
}

export function createOutlineMaterial(THREE, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uThickness: { value: opts.thickness ?? 0.045 },
      uColor: { value: new THREE.Color(opts.color ?? '#04050a') },
      uOpacity: { value: opts.opacity ?? 0.9 },
    },
    vertexShader: OUTLINE_VERT,
    fragmentShader: OUTLINE_FRAG,
    side: THREE.BackSide,
    transparent: opts.opacity < 1,
    depthWrite: true,
  });
}

const GLOW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GLOW_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uTime;
  uniform float uFlicker;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p) * 2.0;
    float core = pow(max(0.0, 1.0 - d), uPower);
    float halo = pow(max(0.0, 1.0 - d), uPower * 0.32) * 0.28;
    float flicker = 1.0 - uFlicker * 0.5 + uFlicker * 0.5 * sin(uTime * 7.3 + p.x * 12.0);
    float a = (core + halo) * flicker;
    gl_FragColor = vec4(uColor * a * uIntensity, a);
  }
`;

export function createGlowMaterial(THREE, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(opts.color ?? '#ffcf8a') },
      uIntensity: { value: opts.intensity ?? 1.4 },
      uPower: { value: opts.power ?? 2.4 },
      uTime: { value: 0 },
      uFlicker: { value: opts.flicker ?? 0.08 },
    },
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

const NEBULA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEBULA_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSeed;
  uniform float uScale;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;

  ${NOISE}

  void main() {
    vec2 p = vUv * uScale + uSeed;
    float drift = uTime * 0.008;
    float n1 = fbm2(p + vec2(drift, -drift * 0.6));
    float n2 = fbm2(p * 1.9 + vec2(4.2, 1.3) - vec2(drift * 0.7, drift));
    float cloud = smoothstep(0.34, 0.86, n1 * 0.68 + n2 * 0.42);
    float edge = smoothstep(0.0, 0.24, vUv.x) * smoothstep(1.0, 0.76, vUv.x)
               * smoothstep(0.0, 0.24, vUv.y) * smoothstep(1.0, 0.76, vUv.y);
    vec3 col = mix(uColorA, uColorB, smoothstep(0.28, 0.82, n2));
    float a = cloud * edge * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(col, a);
  }
`;

export function createNebulaMaterial(THREE, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: opts.seed ?? 0 },
      uScale: { value: opts.scale ?? 3.2 },
      uOpacity: { value: opts.opacity ?? 0.35 },
      uColorA: { value: new THREE.Color(opts.colorA ?? '#1a3f66') },
      uColorB: { value: new THREE.Color(opts.colorB ?? '#7a3d78') },
    },
    vertexShader: NEBULA_VERT,
    fragmentShader: NEBULA_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = aColor;
    vTwinkle = 0.62 + 0.38 * sin(uTime * 0.55 + aPhase);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uPixelRatio * (330.0 / max(1.0, -mv.z)), 1.0, 7.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_FRAG = /* glsl */ `
  precision mediump float;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.02, d);
    float glow = pow(core, 3.0);
    float a = glow * vTwinkle * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * (0.7 + glow * 1.8), a);
  }
`;

export function createStarMaterial(THREE, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: opts.opacity ?? 1 },
    },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Tracks every cel material so a single lighting cue can move the whole film.
 */
export class MaterialLibrary {
  constructor(THREE) {
    this.THREE = THREE;
    this._cel = [];
    this._glow = [];
    this._nebula = [];
    this._stars = [];
    this.time = 0;
    this.lightDir = new THREE.Vector3(-0.45, 0.72, 0.55).normalize();
    this.lightColor = new THREE.Color('#ffe3b0');
    this.rimColor = new THREE.Color('#8fe9ff');
    this.rimStrength = 0.55;
    this.fogColor = new THREE.Color('#05060f');
    this.fogDensity = 0.0075;
    this.ambient = 1.0;
  }

  cel(opts) {
    const m = createCelMaterial(this.THREE, opts);
    this._cel.push(m);
    return m;
  }

  outline(opts) {
    return createOutlineMaterial(this.THREE, opts);
  }

  glow(opts) {
    const m = createGlowMaterial(this.THREE, opts);
    this._glow.push(m);
    return m;
  }

  nebula(opts) {
    const m = createNebulaMaterial(this.THREE, opts);
    this._nebula.push(m);
    return m;
  }

  stars(opts) {
    const m = createStarMaterial(this.THREE, opts);
    this._stars.push(m);
    return m;
  }

  setLighting(state) {
    if (state.lightDir) this.lightDir.copy(state.lightDir).normalize();
    if (state.lightColor) this.lightColor.copy(state.lightColor);
    if (state.rimColor) this.rimColor.copy(state.rimColor);
    if (state.rimStrength !== undefined) this.rimStrength = state.rimStrength;
    if (state.fogColor) this.fogColor.copy(state.fogColor);
    if (state.fogDensity !== undefined) this.fogDensity = state.fogDensity;
    if (state.ambient !== undefined) this.ambient = state.ambient;
  }

  update(dt, time, pixelRatio = 1) {
    this.time = time;
    for (const m of this._cel) {
      const u = m.uniforms;
      u.uTime.value = time;
      u.uLightDir.value.copy(this.lightDir);
      u.uLightColor.value.copy(this.lightColor);
      u.uRimColor.value.copy(this.rimColor);
      u.uRimStrength.value = this.rimStrength;
      u.uFogColor.value.copy(this.fogColor);
      u.uFogDensity.value = this.fogDensity;
      u.uAmbient.value = this.ambient;
    }
    for (const m of this._glow) m.uniforms.uTime.value = time;
    for (const m of this._nebula) m.uniforms.uTime.value = time;
    for (const m of this._stars) {
      m.uniforms.uTime.value = time;
      m.uniforms.uPixelRatio.value = pixelRatio;
    }
  }
}
