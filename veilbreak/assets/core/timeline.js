/**
 * VEILBREAK — direction, timing and camera choreography.
 *
 * This module is deliberately pure: no DOM, no three.js, no side effects.
 * Every camera move, every lighting beat and every post-processing impulse in
 * the film is derived from a single scalar — story time — so the whole
 * sequence can be sampled, unit-tested and re-timed from node.
 *
 * Story time runs 0 → 96 seconds in five acts. A shot is never cut in the
 * middle of a camera move: positions are interpolated with monotone cubic
 * Hermite splines (Fritsch–Carlson tangent limiting), which are C1-continuous
 * and cannot overshoot the authored keys — the camera will never clip through
 * the monolith ring because a spline swung wide.
 */

export const DURATION = 96;

/* ────────────────────────────────────────────────────────────────────────────
   Acts
   ──────────────────────────────────────────────────────────────────────────── */

export const ACTS = [
  {
    id: 'void',
    numeral: 'I',
    title: 'The Long Dark',
    line: 'Before the door, there was only distance.',
    start: 0,
    end: 15.5
  },
  {
    id: 'archive',
    numeral: 'II',
    title: 'The Archive',
    line: 'A structure older than the sky it hangs in.',
    start: 15.5,
    end: 34
  },
  {
    id: 'door',
    numeral: 'III',
    title: 'The Door',
    line: 'Something on the far side has begun to answer.',
    start: 34,
    end: 54
  },
  {
    id: 'inversion',
    numeral: 'IV',
    title: 'Inversion',
    line: 'Every law, rewritten in a single step.',
    start: 54,
    end: 72
  },
  {
    id: 'ember',
    numeral: 'V',
    title: 'Ember World',
    line: 'And on the far side — someone was already watching.',
    start: 72,
    end: DURATION
  }
];

/** The instant the camera crosses the threshold (hidden inside the flash). */
export const CROSSING = 62.35;

/* ────────────────────────────────────────────────────────────────────────────
   Small math helpers (exported: the test suite uses them too)
   ──────────────────────────────────────────────────────────────────────────── */

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Hermite ramp, C1 at both ends. */
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
}

/** Ken Perlin's improved quintic ramp — used where a softer shoulder reads better. */
export function smootherstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export const easeInOutCubic = (t) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/** Normalised gaussian bump — the workhorse for one-shot cinematic impulses. */
export function gaussian(x, center, width) {
  const d = (x - center) / (width || 1e-6);
  return Math.exp(-d * d);
}

/* ────────────────────────────────────────────────────────────────────────────
   Monotone cubic interpolation
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Builds a C1-continuous, non-overshooting sampler over irregularly spaced
 * keys. `xs` must be strictly increasing.
 *
 * @param {number[]} xs key times
 * @param {number[]} ys key values
 * @returns {(x:number)=>number}
 */
export function monotoneCubic(xs, ys) {
  const n = xs.length;
  if (n === 0) return () => 0;
  if (n === 1) return () => ys[0];

  const dx = new Array(n - 1);
  const slope = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    slope[i] = (ys[i + 1] - ys[i]) / (dx[i] || 1e-6);
  }

  /* Fritsch–Carlson tangents. */
  const m = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }
  /* Enforce the monotonicity region. */
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      m[i] = (3 * a / h) * slope[i];
      m[i + 1] = (3 * b / h) * slope[i];
    }
  }

  return function sample(x) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];

    /* binary search for the interval */
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    const h = dx[lo];
    const s = (x - xs[lo]) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    /* Hermite basis */
    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;
    return h00 * ys[lo] + h10 * h * m[lo] + h01 * ys[lo + 1] + h11 * h * m[lo + 1];
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   Camera keys — the shot list
   ────────────────────────────────────────────────────────────────────────────

   pos  : camera position in world space
   tgt  : what the lens is pointed at (the optical axis, not a lookAt helper)
   fov  : vertical field of view in degrees
   roll : camera roll in radians (a few degrees of Dutch angle go a long way)

   The structure (the Archive ring) sits at the origin, radius ~30 units.
   The camera crosses the portal at CROSSING and continues to negative Z, so
   the final reveal looks *back* at the transformed world.
   ──────────────────────────────────────────────────────────────────────────── */

export const CAMERA_KEYS = [
  /* — I. THE LONG DARK — a slow drift out of nothing toward a dormant glow */
  { t: 0.0, pos: [0, 6, 238], tgt: [0, -2, 0], fov: 44, roll: 0.016, label: 'void / establishing' },
  { t: 7.0, pos: [-9, 10, 198], tgt: [0, -1, 0], fov: 44, roll: 0.011 },
  { t: 14.0, pos: [-18, 16, 140], tgt: [0, 0, 0], fov: 43, roll: 0.004 },

  /* — II. THE ARCHIVE — the crane up and around the monolith ring */
  { t: 18.0, pos: [-8, 27, 106], tgt: [0, 3, 0], fov: 42, roll: 0.0, label: 'archive / reveal' },
  { t: 23.0, pos: [26, 41, 88], tgt: [0, 3, 0], fov: 38, roll: -0.010 },
  { t: 28.0, pos: [52, 24, 64], tgt: [0, 0, 0], fov: 38, roll: -0.013, label: 'archive / profile' },
  { t: 32.0, pos: [46, 11, 53], tgt: [0, 1, 0], fov: 39, roll: -0.008 },

  /* — III. THE DOOR — ignition, then the lens opens up as we close in */
  { t: 38.0, pos: [30, 4, 50], tgt: [0, 0, 0], fov: 42, roll: -0.004, label: 'door / ignition' },
  { t: 44.0, pos: [6, 3, 46], tgt: [0, 0, 0], fov: 46, roll: 0.0 },
  { t: 49.0, pos: [-20, 5, 42], tgt: [0, 0, 0], fov: 50, roll: 0.005 },
  { t: 54.0, pos: [-26, 4, 34], tgt: [0, 0, 0], fov: 55, roll: 0.007, label: 'door / surge' },

  /* — IV. INVERSION — through the aperture */
  { t: 58.0, pos: [-16, 2, 22], tgt: [0, 0, 0], fov: 63, roll: 0.009 },
  { t: 61.0, pos: [-6, 1, 12], tgt: [0, 0, 0], fov: 76, roll: 0.011 },
  { t: 62.35, pos: [0, 0, 2], tgt: [0, 0, -1], fov: 96, roll: 0.02, label: 'crossing' },
  { t: 64.5, pos: [0, 3, -22], tgt: [0, 1, 0], fov: 72, roll: 0.004, label: 'ember / arrival' },
  { t: 68.0, pos: [-12, 9, -38], tgt: [0, 3, 0], fov: 60, roll: -0.006 },

  /* — V. EMBER WORLD — the wide reveal, the watcher, the title */
  { t: 74.0, pos: [-28, 17, -58], tgt: [-2, 6, 2], fov: 50, roll: -0.008, label: 'ember / wide' },
  { t: 82.0, pos: [-42, 25, -78], tgt: [2, 10, 4], fov: 42, roll: -0.006 },
  { t: 90.0, pos: [-48, 30, -90], tgt: [4, 12, 6], fov: 36, roll: -0.004, label: 'ember / final' },
  { t: 96.0, pos: [-52, 33, -96], tgt: [4, 12, 6], fov: 36, roll: -0.004 }
];

/* Compile the keys into per-channel samplers. */
const _times = CAMERA_KEYS.map((k) => k.t);
const _channels = {
  px: monotoneCubic(_times, CAMERA_KEYS.map((k) => k.pos[0])),
  py: monotoneCubic(_times, CAMERA_KEYS.map((k) => k.pos[1])),
  pz: monotoneCubic(_times, CAMERA_KEYS.map((k) => k.pos[2])),
  tx: monotoneCubic(_times, CAMERA_KEYS.map((k) => k.tgt[0])),
  ty: monotoneCubic(_times, CAMERA_KEYS.map((k) => k.tgt[1])),
  tz: monotoneCubic(_times, CAMERA_KEYS.map((k) => k.tgt[2])),
  fov: monotoneCubic(_times, CAMERA_KEYS.map((k) => k.fov)),
  roll: monotoneCubic(_times, CAMERA_KEYS.map((k) => k.roll))
};

/** How much the lens breathes. Deliberately tiny: handheld, not shaky-cam. */
const breath = (t) => ({
  x: Math.sin(t * 0.36) * 0.09 + Math.sin(t * 0.91 + 1.7) * 0.035,
  y: Math.sin(t * 0.29 + 2.2) * 0.07 + Math.sin(t * 1.13) * 0.028
});

export function cameraAt(t) {
  const b = breath(t);
  return {
    position: [
      _channels.px(t) + b.x,
      _channels.py(t) + b.y,
      _channels.pz(t)
    ],
    target: [_channels.tx(t), _channels.ty(t), _channels.tz(t)],
    fov: _channels.fov(t),
    roll: _channels.roll(t) + Math.sin(t * 0.21) * 0.0016
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   Light, energy and post-processing beats
   ──────────────────────────────────────────────────────────────────────────── */

/** Aperture energy: dormant → ignition → violent surge through the crossing. */
function portalPower(t) {
  const ignition = smoothstep(35.0, 45.5, t);
  const surge = smoothstep(52.0, 61.6, t);
  const gone = smoothstep(CROSSING - 0.2, CROSSING + 3.0, t);
  return clamp(ignition * 0.72 + surge * 0.85) * (1 - gone);
}

/** The Archive waking up: glyph bands, rim lights, rotating fins. */
function structurePower(t) {
  return smoothstep(16.0, 24.5, t);
}

/** 0 in the cold universe, 1 in the ember universe. Snaps inside the flash. */
function alternateMix(t) {
  return smootherstep(CROSSING - 0.55, CROSSING + 1.9, t);
}

/** The threshold flash — the cut we are allowed to make. */
function flash(t) {
  return (
    gaussian(t, CROSSING + 0.16, 0.42) * 1.0 +
    gaussian(t, CROSSING - 0.85, 0.34) * 0.30
  );
}

/** Fade from / to black, plus the final card hold. */
function fadeLevel(t) {
  const intro = smoothstep(0.0, 2.6, t);
  const outro = 1 - smoothstep(93.2, 95.9, t);
  return intro * outro;
}

/** How far the two universes' emissive accents are cross-faded. */
export function sampleTimeline(t) {
  const time = clamp(t, 0, DURATION);
  const cam = cameraAt(time);

  let act = ACTS[ACTS.length - 1];
  for (const a of ACTS) {
    if (time >= a.start && time < a.end) {
      act = a;
      break;
    }
  }
  const actIndex = ACTS.indexOf(act);
  const actProgress = clamp((time - act.start) / (act.end - act.start || 1));

  const portal = portalPower(time);
  const alt = alternateMix(time);
  const structure = structurePower(time);
  const altTime = Math.max(0, time - CROSSING);

  return {
    time,
    act,
    actIndex,
    actProgress,
    progress: time / DURATION,
    camera: cam,
    /* world-side energy levels */
    portal,
    structure,
    alt,
    altTime,
    /* the two universes: 0 = the cold one, 1 = the ember one */
    oldWorld: 1 - smoothstep(CROSSING - 0.3, CROSSING + 0.25, time),
    newWorld: smoothstep(CROSSING - 0.3, CROSSING + 0.25, time),
    /* driving uniforms */
    exposure: lerp(1.0, 1.12, alt) + portal * 0.05,
    bloom: 0.42 + portal * 0.5 + flash(time) * 0.9 + alt * 0.14,
    grain: 0.052,
    vignette: 0.44 - alt * 0.05,
    chromatic: 0.0011 + portal * 0.0032 + flash(time) * 0.007,
    distortion: portal * portal * 0.055 * (1 - alt),
    flash: flash(time),
    fade: fadeLevel(time),
    /* UI beats */
    titleCard: smootherstep(88.0, 90.6, time),
    chapterCard: 1 - smoothstep(0, 1, actProgress * 6) * 0 + 1,
    replayPrompt: smoothstep(93.5, 95.5, time),
    /* convenient for the renderer: the aperture's world-space normal */
    apertureNormal: [0, 0, 1]
  };
}

/** Index of the act that contains `t`. */
export function actIndexAt(t) {
  for (let i = 0; i < ACTS.length; i++) {
    if (t >= ACTS[i].start && t < ACTS[i].end) return i;
  }
  return ACTS.length - 1;
}

/**
 * Lens adaptation.
 *
 * The shot list is authored for a 16:9 frame. On a portrait phone we cannot
 * simply keep the vertical fov: the horizontal field would collapse and the
 * film would be cropped to a letterbox slot. Instead the vertical fov opens up
 * until the *horizontal* field matches the authored one (clamped, so a phone
 * never turns into a fisheye). Wide screens keep the authored vertical fov.
 */
export const REFERENCE_ASPECT = 16 / 9;

export function effectiveFov(baseFov, aspect, maxFov = 82) {
  if (!(aspect > 0.01)) return baseFov;
  if (aspect >= REFERENCE_ASPECT) return baseFov;
  const tanHalfBase = Math.tan((baseFov * Math.PI) / 360);
  const horizontal = 2 * Math.atan(tanHalfBase * REFERENCE_ASPECT);
  const widened = (2 * Math.atan(Math.tan(horizontal / 2) / aspect) * 180) / Math.PI;
  return Math.min(maxFov, Math.max(baseFov, widened));
}

/** Seek table for the chapter buttons. */
export function actStartTime(index) {
  const a = ACTS[clamp(index, 0, ACTS.length - 1)];
  return a.start + 0.001;
}
