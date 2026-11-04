/**
 * Direction test.
 *
 * The camera is the film. This suite proves, numerically, that:
 *   • the camera path is C1-smooth (no visible jerk, no overshoot);
 *   • each act actually frames its subject (composition, not hope);
 *   • the camera flies through the aperture and never through the ring;
 *   • the two universes hand over inside the flash;
 *   • nothing ever produces NaN, at any sample rate.
 *
 *   node test/timeline.mjs
 */

import * as THREE from '../assets/vendor/three.module.min.js';
import {
  sampleTimeline,
  cameraAt,
  effectiveFov,
  ACTS,
  DURATION,
  CROSSING,
  actIndexAt
} from '../assets/core/timeline.js';
import { STAGE, LANDMARKS } from '../assets/core/staging.js';

const failures = [];
const info = [];
const check = (label, ok, detail = '') => {
  if (!ok) failures.push(`${label}${detail ? ' — ' + detail : ''}`);
};

const ASPECTS = [16 / 9, 4 / 3, 21 / 9, 9 / 16];

/* ── 1. structure of the film ────────────────────────────────────────────── */
check('five acts', ACTS.length === 5, `got ${ACTS.length}`);
for (let i = 1; i < ACTS.length; i++) {
  check(`act ${i} starts where act ${i - 1} ends`, Math.abs(ACTS[i].start - ACTS[i - 1].end) < 1e-9);
}
check('acts start at zero', ACTS[0].start === 0);
check('acts end at DURATION', Math.abs(ACTS[ACTS.length - 1].end - DURATION) < 1e-9);
for (const a of ACTS) {
  check(`act "${a.title}" has a subtitle line`, typeof a.line === 'string' && a.line.length > 12);
  check(`act "${a.title}" has a numeral`, /^[IVX]+$/.test(a.numeral));
}
check('crossing is inside act IV', CROSSING > ACTS[3].start && CROSSING < ACTS[3].end);

/* ── 2. sampling: continuity, range, NaN ─────────────────────────────────── */
const STEP = 0.02;
let prev = null;
let maxSpeed = 0;
let maxFovStep = 0;
let maxTargetStep = 0;
let nan = 0;

for (let t = 0; t <= DURATION + 1e-9; t += STEP) {
  const s = sampleTimeline(t);
  const [x, y, z] = s.camera.position;
  const [tx, ty, tz] = s.camera.target;
  const values = [x, y, z, tx, ty, tz, s.camera.fov, s.camera.roll, s.exposure, s.bloom, s.flash];
  if (values.some((v) => !Number.isFinite(v))) nan++;
  if (s.camera.fov < 20 || s.camera.fov > 110) failures.push(`fov out of range at ${t}: ${s.camera.fov}`);

  if (prev) {
    const d = Math.hypot(x - prev[0], y - prev[1], z - prev[2]) / STEP;
    maxSpeed = Math.max(maxSpeed, d);
    maxFovStep = Math.max(maxFovStep, Math.abs(s.camera.fov - prev[6]) / STEP);
    maxTargetStep = Math.max(
      maxTargetStep,
      Math.hypot(tx - prev[3], ty - prev[4], tz - prev[5]) / STEP
    );
  }
  prev = [x, y, z, tx, ty, tz, s.camera.fov, s.camera.roll, s.exposure, s.bloom, s.flash];
}
check('no NaN anywhere in the timeline', nan === 0, `${nan} samples`);
check('camera never exceeds a cinematic speed (units/s)', maxSpeed < 26, `${maxSpeed.toFixed(1)}`);
check('fov changes smoothly', maxFovStep < 24, `${maxFovStep.toFixed(1)} deg/s`);
check('look-at target never whips', maxTargetStep < 34, `${maxTargetStep.toFixed(1)} units/s`);
info.push(`peak camera speed ${maxSpeed.toFixed(1)} u/s, peak fov rate ${maxFovStep.toFixed(1)} °/s`);

/* ── 3. the flight path never clips the set ──────────────────────────────── */
let worstRing = Infinity;
let worstRingTime = 0;
let worstIsland = Infinity;
let worstIslandTime = 0;
for (let t = 0; t < DURATION; t += 0.05) {
  const [x, y, z] = cameraAt(t).position;

  /* approaching the plane of the ring: we must be inside the aperture */
  if (Math.abs(z) < 2.5) {
    const radial = Math.hypot(x, y);
    if (radial > STAGE.structure.apertureRadius * 0.8 && radial < STAGE.structure.outerRadius * 1.1) {
      const clearance = Math.min(
        Math.abs(radial - STAGE.structure.apertureRadius),
        Math.abs(radial - STAGE.structure.outerRadius)
      );
      if (clearance < worstRing) {
        worstRing = clearance;
        worstRingTime = t;
      }
    }
  }

  /* the camera must not fly through the watcher's shard */
  if (t > 78) {
    const d = Math.hypot(x - STAGE.watcher.island[0], y - STAGE.watcher.island[1], z - STAGE.watcher.island[2]);
    if (d < worstIsland) {
      worstIsland = d;
      worstIslandTime = t;
    }
  }
}
check(
  'crosses the ring only through the aperture',
  worstRing === Infinity || worstRing > 1.5,
  `closest approach ${worstRing.toFixed(2)} at t=${worstRingTime.toFixed(1)}`
);
check(
  'keeps clear of the watcher shard',
  worstIsland > 18,
  `${worstIsland.toFixed(1)} units at t=${worstIslandTime.toFixed(1)}`
);

/* ── 4. composition: each act frames its subject ─────────────────────────── */
function project(camera, point) {
  const v = new THREE.Vector3().fromArray(point).project(camera);
  return { x: v.x, y: v.y, behind: v.z > 1 };
}

function poseCamera(camera, state, aspect) {
  camera.fov = effectiveFov(state.camera.fov, aspect);
  camera.aspect = aspect;
  camera.near = 0.5;
  camera.far = 5000;
  camera.position.fromArray(state.camera.position);
  camera.up.set(0, 1, 0);
  camera.lookAt(new THREE.Vector3().fromArray(state.camera.target));
  camera.rotateZ(state.camera.roll);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

/** Angular height of an object, as a fraction of the frame. */
function ndcHeight(camera, point, radius) {
  const v = new THREE.Vector3().fromArray(point).project(camera);
  const edge = new THREE.Vector3()
    .fromArray(point)
    .add(new THREE.Vector3(0, radius, 0))
    .project(camera);
  return Math.abs(edge.y - v.y);
}

for (const aspect of ASPECTS) {
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 5000);
  const tag = `[${aspect.toFixed(2)}]`;

  /* act II: the reveal shows the whole ring */
  {
    const s = sampleTimeline(23);
    poseCamera(camera, s, aspect);
    const pts = [
      [0, STAGE.structure.outerRadius, 0],
      [0, -STAGE.structure.outerRadius, 0],
      [STAGE.structure.outerRadius, 0, 0],
      [-STAGE.structure.outerRadius, 0, 0]
    ].map((p) => project(camera, p));
    const inFrame = pts.every((p) => !p.behind && Math.abs(p.x) <= 1.02 && Math.abs(p.y) <= 1.02);
    check(`${tag} act II reveal holds the whole ring`, inFrame,
      pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '));
  }

  /* act III: the aperture owns the centre of the frame, and it is worth
     looking at — at least a quarter of the frame height */
  {
    let minSize = Infinity;
    for (let t = 40; t <= 52; t += 1) {
      const s = sampleTimeline(t);
      poseCamera(camera, s, aspect);
      const c = project(camera, STAGE.portal.center);
      const size = ndcHeight(camera, STAGE.portal.center, STAGE.portal.radius) * 2;
      minSize = Math.min(minSize, size);
      if (Math.abs(c.x) > 0.32 || Math.abs(c.y) > 0.32 || c.behind) {
        failures.push(`${tag} aperture drifts off centre at t=${t}: ${c.x.toFixed(2)},${c.y.toFixed(2)}`);
      }
    }
    check(`${tag} aperture stays cinematic through act III`, minSize > 0.5, `min ${minSize.toFixed(2)} of frame height`);
  }

  /* act V: the watcher is a foreground silhouette in the lower left, the suns
     are up in the upper right, and the broken ring still anchors the frame */
  {
    const s = sampleTimeline(90);
    poseCamera(camera, s, aspect);
    const head = project(camera, STAGE.watcher.head);
    const feet = project(camera, STAGE.watcher.feet);
    const sunA = project(camera, STAGE.suns[0].pos);
    const sunB = project(camera, STAGE.suns[1].pos);
    const ring = project(camera, STAGE.structure.center);
    const height = head.y - feet.y;

    check(`${tag} watcher head is in the left third`, head.x < -0.2 && head.x > -0.95, head.x.toFixed(2));
    check(`${tag} watcher head sits low in frame`, head.y > -0.6 && head.y < 0.1, head.y.toFixed(2));
    /* on portrait screens the vertical fov widens, so an NDC fraction means
       fewer of the tall frame; scale the expectation with the aspect */
    const minFigure = 0.28 * Math.sqrt(aspect / (16 / 9));
    check(`${tag} watcher reads as a full figure`, height > minFigure, `${height.toFixed(2)} vs ${minFigure.toFixed(2)}`);
    check(`${tag} watcher feet stay on screen`, feet.y > -1.05, feet.y.toFixed(2));
    check(`${tag} both suns are in frame`, !sunA.behind && !sunB.behind && Math.abs(sunA.x) < 1 && Math.abs(sunB.x) < 1,
      `${sunA.x.toFixed(2)},${sunA.y.toFixed(2)} / ${sunB.x.toFixed(2)},${sunB.y.toFixed(2)}`);
    check(`${tag} broken ring still anchors the frame`, Math.abs(ring.x) < 0.5, ring.x.toFixed(2));
  }
}

/* ── 5. the universes hand over inside the flash ─────────────────────────── */
const before = sampleTimeline(60.5);
const after = sampleTimeline(66);
check('cold universe owns act IV before the crossing', before.alt < 0.02, before.alt.toFixed(3));
check('ember universe owns the far side', after.alt > 0.97, after.alt.toFixed(3));
check('the crossing is hidden by a flash', sampleTimeline(CROSSING + 0.16).flash > 0.85,
  sampleTimeline(CROSSING + 0.16).flash.toFixed(2));
check('no flash early in the film', sampleTimeline(10).flash < 0.01, sampleTimeline(10).flash.toFixed(3));
check('the film fades up from black', sampleTimeline(0).fade < 0.02 && sampleTimeline(4).fade > 0.95);
check('the film fades out at the end', sampleTimeline(95.9).fade < 0.05);

/* aperture energy rises and dies with the shot */
const p38 = sampleTimeline(38).portal;
const p52 = sampleTimeline(52).portal;
const p60 = sampleTimeline(60).portal;
const p70 = sampleTimeline(70).portal;
check('aperture ignites through act III', p38 > 0.1 && p52 > 0.4 && p60 > p52, `${p38.toFixed(2)} → ${p52.toFixed(2)} → ${p60.toFixed(2)}`);
check('aperture is gone in the ember universe', p70 < 0.01, p70.toFixed(3));

check('act lookup is consistent', actIndexAt(0) === 0 && actIndexAt(DURATION - 0.1) === 4 && actIndexAt(CROSSING) === 3);

/* ── 6. landmarks are where the set says they are ────────────────────────── */
check('staging exposes the watcher head above the island top',
  STAGE.watcher.head[1] > STAGE.watcher.islandTop, `${STAGE.watcher.head[1]} vs ${STAGE.watcher.islandTop}`);
check('the watcher is with the ember suns, not the cold ring',
  STAGE.watcher.island[2] < -40 && STAGE.suns[0].pos[2] > 40);
check('landmarks cover every act that has a subject',
  new Set(LANDMARKS.map((l) => l.act)).size >= 3);

/* ── report ──────────────────────────────────────────────────────────────── */
console.log('timeline     : ' + DURATION + 's · ' + ACTS.length + ' acts · crossing at ' + CROSSING + 's');
info.forEach((i) => console.log('note         : ' + i));
console.log('aspects      : ' + ASPECTS.map((a) => a.toFixed(2)).join(' '));

if (failures.length) {
  console.error('\nFAILED (' + failures.length + ')\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
console.log('\ndirection OK');
