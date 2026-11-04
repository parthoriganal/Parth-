// AETHERBOUND — the edit.
// Five movements, one continuous camera move, and a palette that changes with
// the story. Everything is a pure function of time, so the film is deterministic
// and can be scrubbed, paused or replayed frame-accurately.

import {
  clamp, lerp, smoothstep, pulse, easeInOutSine, easeInCubic, easeOutCubic,
  easeOutSine, easeInOutCubic,
} from '../core/math.js';

export const FILM_DURATION = 78;

export const CHAPTERS = [
  {
    id: 'quiet',
    num: 'I',
    title: 'The Quiet Between',
    desc: 'A lone observer waits at the edge of the known.',
    start: 0,
    end: 13,
    accent: '#e8b46a',
    accentRgb: '232, 180, 106',
  },
  {
    id: 'engine',
    num: 'II',
    title: 'The Engine of Worlds',
    desc: 'A machine the size of a moon turns in the dark, keeping a promise.',
    start: 13,
    end: 29,
    accent: '#e8b46a',
    accentRgb: '232, 180, 106',
  },
  {
    id: 'rift',
    num: 'III',
    title: 'The Rift',
    desc: 'The iris opens. Something on the other side opens with it.',
    start: 29,
    end: 47,
    accent: '#ff6fae',
    accentRgb: '255, 111, 174',
  },
  {
    id: 'other',
    num: 'IV',
    title: 'The Other Side',
    desc: 'A city hangs beneath its own island, and the sky is a different colour.',
    start: 47,
    end: 62,
    accent: '#7fe7ff',
    accentRgb: '127, 231, 255',
  },
  {
    id: 'bound',
    num: 'V',
    title: 'Aetherbound',
    desc: 'Every universe is a door. Every door remembers.',
    start: 62,
    end: 78,
    accent: '#ffd08a',
    accentRgb: '255, 208, 138',
  },
];

const PALETTES = [
  {
    skyDeep: '#03040c',
    skyHorizon: '#0a1730',
    skyNebulaA: '#123a52',
    skyNebulaB: '#3a1c4e',
    skyGlow: '#ffb45e',
    sunColor: '#ffc27a',
    skyIntensity: 1.0,
    fogColor: '#05060f',
    fogDensity: 0.0075,
    lightDir: [-0.45, 0.72, 0.55],
    lightColor: '#ffe3b0',
    rimColor: '#8fe9ff',
    rimStrength: 0.55,
    ambient: 1.0,
    exposure: 1.05,
    bloom: 0.82,
    saturation: 1.02,
    contrast: 1.04,
    vignette: 0.55,
    grain: 0.03,
    lift: [0.008, 0.014, 0.03],
    gain: [1.02, 1.0, 0.98],
    tint: [0.95, 0.98, 1.05],
  },
  {
    skyDeep: '#05040c',
    skyHorizon: '#1a1424',
    skyNebulaA: '#3a2a1a',
    skyNebulaB: '#123a52',
    skyGlow: '#ffb45e',
    sunColor: '#ffd08a',
    skyIntensity: 1.1,
    fogColor: '#07060d',
    fogDensity: 0.0062,
    lightDir: [-0.55, 0.65, 0.5],
    lightColor: '#ffe0b0',
    rimColor: '#ffcf8a',
    rimStrength: 0.7,
    ambient: 1.05,
    exposure: 1.1,
    bloom: 0.95,
    saturation: 1.06,
    contrast: 1.05,
    vignette: 0.5,
    grain: 0.03,
    lift: [0.014, 0.01, 0.006],
    gain: [1.04, 1.0, 0.95],
    tint: [1.05, 1.0, 0.94],
  },
  {
    skyDeep: '#06030c',
    skyHorizon: '#1a0a2a',
    skyNebulaA: '#3a0f4e',
    skyNebulaB: '#0e3a4a',
    skyGlow: '#ff6fae',
    sunColor: '#ff9fd0',
    skyIntensity: 1.2,
    fogColor: '#0a0512',
    fogDensity: 0.0055,
    lightDir: [-0.2, 0.5, 0.85],
    lightColor: '#ffd6e8',
    rimColor: '#ff6fae',
    rimStrength: 0.85,
    ambient: 1.0,
    exposure: 1.12,
    bloom: 1.15,
    saturation: 1.12,
    contrast: 1.07,
    vignette: 0.58,
    grain: 0.035,
    lift: [0.02, 0.006, 0.03],
    gain: [1.02, 0.96, 1.05],
    tint: [1.05, 0.95, 1.05],
  },
  {
    skyDeep: '#0a0410',
    skyHorizon: '#2a0a2a',
    skyNebulaA: '#4a1230',
    skyNebulaB: '#0e4a52',
    skyGlow: '#7fe7ff',
    sunColor: '#7fe7ff',
    skyIntensity: 1.25,
    fogColor: '#120818',
    fogDensity: 0.0042,
    lightDir: [0.4, 0.6, 0.6],
    lightColor: '#d8f6ff',
    rimColor: '#7fe7ff',
    rimStrength: 0.8,
    ambient: 1.1,
    exposure: 1.15,
    bloom: 1.05,
    saturation: 1.1,
    contrast: 1.04,
    vignette: 0.5,
    grain: 0.03,
    lift: [0.006, 0.016, 0.026],
    gain: [0.98, 1.02, 1.04],
    tint: [0.96, 1.02, 1.06],
  },
  {
    skyDeep: '#080410',
    skyHorizon: '#1a0a2a',
    skyNebulaA: '#3a1230',
    skyNebulaB: '#0e4a52',
    skyGlow: '#ffd08a',
    sunColor: '#ffd08a',
    skyIntensity: 1.2,
    fogColor: '#0c0714',
    fogDensity: 0.0038,
    lightDir: [-0.5, 0.7, 0.45],
    lightColor: '#ffe6c4',
    rimColor: '#ffb0d8',
    rimStrength: 0.85,
    ambient: 1.1,
    exposure: 1.18,
    bloom: 1.1,
    saturation: 1.08,
    contrast: 1.03,
    vignette: 0.48,
    grain: 0.028,
    lift: [0.012, 0.012, 0.02],
    gain: [1.03, 1.0, 1.0],
    tint: [1.02, 1.0, 1.0],
  },
];

const CAMERA_KEYS = [
  { t: 0, pos: [2.5, 3.2, 48], target: [0, 1.0, 0], fov: 42, roll: -0.4, ease: 'easeInOutSine' },
  { t: 6, pos: [1.0, 2.7, 43], target: [0, 1.0, 0], fov: 42, roll: 0.1, ease: 'easeInOutSine' },
  { t: 13, pos: [-3.5, 3.0, 36], target: [0, 0.6, 0], fov: 44, roll: 0.7, ease: 'easeInOutSine' },
  { t: 19, pos: [-12, 5.5, 30], target: [0, 0, 0], fov: 46, roll: 1.4, ease: 'easeInOutSine' },
  { t: 24, pos: [-16, 7.5, 22], target: [0, 0, 0], fov: 48, roll: 1.8, ease: 'easeInOutSine' },
  { t: 29, pos: [-10, 4.5, 20], target: [0, 0, 0], fov: 46, roll: 0.5, ease: 'easeInOutSine' },
  { t: 34, pos: [-4, 2.0, 22], target: [0, 0, 0], fov: 44, roll: 0, ease: 'easeInOutSine' },
  { t: 40, pos: [0, 0.8, 19], target: [0, 0, 0], fov: 42, roll: 0, ease: 'easeInOutSine' },
  { t: 47, pos: [0, 0.4, 15.5], target: [0, 0, 0], fov: 48, roll: 0, ease: 'easeInCubic' },
  { t: 50, pos: [0, 0.2, 9], target: [0, 0, -20], fov: 55, roll: 1.5, ease: 'easeOutCubic' },
  { t: 53, pos: [0, 1.5, -8], target: [-2, 2, -35], fov: 52, roll: -1, ease: 'easeInOutSine' },
  { t: 57, pos: [4, 3.5, -20], target: [-6, 2, -45], fov: 50, roll: -2, ease: 'easeInOutSine' },
  { t: 62, pos: [10, 5.5, -30], target: [-6, 2, -50], fov: 52, roll: -1, ease: 'easeInOutSine' },
  { t: 68, pos: [16, 9, -33], target: [-6, 1, -55], fov: 55, roll: 0, ease: 'easeInOutSine' },
  { t: 74, pos: [22, 14, -36], target: [-8, 0, -60], fov: 58, roll: 0, ease: 'easeOutSine' },
  { t: 78, pos: [24, 15, -37], target: [-8, 0, -60], fov: 58, roll: 0, ease: 'easeOutSine' },
];

const EASES = {
  easeInOutSine,
  easeInCubic,
  easeOutCubic,
  easeOutSine,
  easeInOutCubic,
};

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1
    + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

export class CameraTrack {
  constructor(keys = CAMERA_KEYS) {
    this.keys = keys;
    this.out = {
      pos: { x: 0, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      fov: 45,
      roll: 0,
    };
  }

  sample(t) {
    const keys = this.keys;
    const time = clamp(t, 0, keys[keys.length - 1].t);
    let i = 0;
    while (i < keys.length - 2 && time > keys[i + 1].t) i++;
    const k0 = keys[Math.max(0, i - 1)];
    const k1 = keys[i];
    const k2 = keys[i + 1];
    const k3 = keys[Math.min(keys.length - 1, i + 2)];
    const span = Math.max(1e-5, k2.t - k1.t);
    const raw = clamp((time - k1.t) / span, 0, 1);
    const ease = EASES[k1.ease] || easeInOutSine;
    const u = ease(raw);
    const out = this.out;
    out.pos.x = catmull(k0.pos[0], k1.pos[0], k2.pos[0], k3.pos[0], u);
    out.pos.y = catmull(k0.pos[1], k1.pos[1], k2.pos[1], k3.pos[1], u);
    out.pos.z = catmull(k0.pos[2], k1.pos[2], k2.pos[2], k3.pos[2], u);
    out.target.x = catmull(k0.target[0], k1.target[0], k2.target[0], k3.target[0], u);
    out.target.y = catmull(k0.target[1], k1.target[1], k2.target[1], k3.target[1], u);
    out.target.z = catmull(k0.target[2], k1.target[2], k2.target[2], k3.target[2], u);
    out.fov = lerp(k1.fov, k2.fov, u);
    out.roll = lerp(k1.roll, k2.roll, u);

    // A breath of drift keeps the frame alive without ever feeling like shake.
    out.pos.x += Math.sin(time * 0.13) * 0.12;
    out.pos.y += Math.sin(time * 0.17 + 1.2) * 0.09;
    out.pos.z += Math.cos(time * 0.11 + 0.4) * 0.08;
    out.target.x += Math.sin(time * 0.11 + 0.5) * 0.08;
    out.target.y += Math.cos(time * 0.09) * 0.06;
    out.roll += Math.sin(time * 0.07) * 0.12;
    return out;
  }
}

function lerpColor(out, a, b, t) {
  out.setRGB(
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t)
  );
  return out;
}

function paletteAt(t) {
  const idx = chapterIndexAt(t);
  const base = PALETTES[idx];
  const next = PALETTES[Math.min(PALETTES.length - 1, idx + 1)];
  const prev = PALETTES[Math.max(0, idx - 1)];
  const start = CHAPTERS[idx].start;

  // Blend into the new palette just before a movement boundary, and finish
  // the blend just after it — the light change lands on the cut.
  if (idx > 0 && t < start + 0.9) {
    const k = smoothstep(start - 2.4, start + 0.9, t);
    return { a: prev, b: base, k };
  }
  if (idx < PALETTES.length - 1 && t > CHAPTERS[idx].end - 2.4) {
    const k = smoothstep(CHAPTERS[idx].end - 2.4, CHAPTERS[idx].end + 0.9, t);
    return { a: base, b: next, k };
  }
  return { a: base, b: base, k: 0 };
}

export function chapterIndexAt(t) {
  for (let i = CHAPTERS.length - 1; i >= 0; i--) {
    if (t >= CHAPTERS[i].start) return i;
  }
  return 0;
}

export class Timeline {
  constructor(THREE) {
    this.THREE = THREE;
    this.cameraTrack = new CameraTrack();
    this.duration = FILM_DURATION;
    this.chapters = CHAPTERS;

    const c = (hex) => new THREE.Color(hex);
    this._colorCache = PALETTES.map((p) => ({
      skyDeep: c(p.skyDeep),
      skyHorizon: c(p.skyHorizon),
      skyNebulaA: c(p.skyNebulaA),
      skyNebulaB: c(p.skyNebulaB),
      skyGlow: c(p.skyGlow),
      sunColor: c(p.sunColor),
      fogColor: c(p.fogColor),
      lightColor: c(p.lightColor),
      rimColor: c(p.rimColor),
      lightDir: new THREE.Vector3(...p.lightDir).normalize(),
      lift: new THREE.Color(...p.lift),
      gain: new THREE.Color(...p.gain),
      tint: new THREE.Color(...p.tint),
    }));

    this.state = {
      time: 0,
      chapterIndex: 0,
      chapter: CHAPTERS[0],
      chapterProgress: 0,
      palette: {
        skyDeep: new THREE.Color(),
        skyHorizon: new THREE.Color(),
        skyNebulaA: new THREE.Color(),
        skyNebulaB: new THREE.Color(),
        skyGlow: new THREE.Color(),
        sunColor: new THREE.Color(),
        fogColor: new THREE.Color(),
        lightColor: new THREE.Color(),
        rimColor: new THREE.Color(),
        lightDir: new THREE.Vector3(),
        skyIntensity: 1,
        fogDensity: 0.006,
        rimStrength: 0.6,
        ambient: 1,
        exposure: 1.1,
        bloom: 0.9,
        saturation: 1.05,
        contrast: 1.04,
        vignette: 0.52,
        grain: 0.03,
        lift: new THREE.Color(),
        gain: new THREE.Color(),
        tint: new THREE.Color(),
      },
      camera: { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 45, roll: 0 },
      effects: {
        portalForm: 0,
        portalIntensity: 0,
        irisOpen: 0,
        flash: 0,
        speed: 0,
        invert: 0,
        fade: 1,
        endCard: false,
      },
    };
  }

  sample(t) {
    const time = clamp(t, 0, this.duration);
    const idx = chapterIndexAt(time);
    const chapter = CHAPTERS[idx];
    const st = this.state;
    st.time = time;
    st.chapterIndex = idx;
    st.chapter = chapter;
    st.chapterProgress = clamp((time - chapter.start) / (chapter.end - chapter.start), 0, 1);

    // palette blend
    const blend = paletteAt(time);
    const A = this._colorCache[PALETTES.indexOf(blend.a)];
    const B = this._colorCache[PALETTES.indexOf(blend.b)];
    const k = blend.k;
    const p = st.palette;
    p.skyDeep.lerpColors(A.skyDeep, B.skyDeep, k);
    p.skyHorizon.lerpColors(A.skyHorizon, B.skyHorizon, k);
    p.skyNebulaA.lerpColors(A.skyNebulaA, B.skyNebulaA, k);
    p.skyNebulaB.lerpColors(A.skyNebulaB, B.skyNebulaB, k);
    p.skyGlow.lerpColors(A.skyGlow, B.skyGlow, k);
    p.sunColor.lerpColors(A.sunColor, B.sunColor, k);
    p.fogColor.lerpColors(A.fogColor, B.fogColor, k);
    p.lightColor.lerpColors(A.lightColor, B.lightColor, k);
    p.rimColor.lerpColors(A.rimColor, B.rimColor, k);
    p.lightDir.lerpVectors(A.lightDir, B.lightDir, k).normalize();
    p.lift.lerpColors(A.lift, B.lift, k);
    p.gain.lerpColors(A.gain, B.gain, k);
    p.tint.lerpColors(A.tint, B.tint, k);
    const pa = PALETTES[PALETTES.indexOf(blend.a)];
    const pb = PALETTES[PALETTES.indexOf(blend.b)];
    p.skyIntensity = lerp(pa.skyIntensity, pb.skyIntensity, k);
    p.fogDensity = lerp(pa.fogDensity, pb.fogDensity, k);
    p.rimStrength = lerp(pa.rimStrength, pb.rimStrength, k);
    p.ambient = lerp(pa.ambient, pb.ambient, k);
    p.exposure = lerp(pa.exposure, pb.exposure, k);
    p.bloom = lerp(pa.bloom, pb.bloom, k);
    p.saturation = lerp(pa.saturation, pb.saturation, k);
    p.contrast = lerp(pa.contrast, pb.contrast, k);
    p.vignette = lerp(pa.vignette, pb.vignette, k);
    p.grain = lerp(pa.grain, pb.grain, k);

    // camera
    const cam = this.cameraTrack.sample(time);
    st.camera.pos.set(cam.pos.x, cam.pos.y, cam.pos.z);
    st.camera.target.set(cam.target.x, cam.target.y, cam.target.z);
    st.camera.fov = cam.fov + Math.sin(time * 0.2) * 0.12;
    st.camera.roll = cam.roll;

    // effects
    const e = st.effects;
    e.portalForm = clamp(smoothstep(28, 39, time) + pulse(time, 33.5, 1.8) * 0.08, 0, 1);
    e.irisOpen = smoothstep(28.5, 36, time);
    e.portalIntensity = clamp(
      0.55 + 0.55 * smoothstep(30, 40, time) + 0.35 * pulse(time, 51.2, 2.6),
      0,
      1.5
    );
    e.flash = Math.pow(pulse(time, 51.2, 0.42), 1.4) * 1.25;
    e.speed = smoothstep(46, 50, time) * (1 - smoothstep(51.5, 55, time));
    e.invert = Math.max(0, (pulse(time, 51.2, 0.15) - 0.55) / 0.45) * 0.8;
    e.fade = smoothstep(0, 0.9, time);
    e.endCard = time >= 76.2;

    return st;
  }
}
