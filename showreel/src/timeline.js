/**
 * THE FILM — single source of truth for the edit.
 *
 * Structure (40s, 60fps, 1920x1080):
 *   I.   IGNITION  0.0 — 3.0   detonation, monolithic type, hyperspace tunnel
 *   II.  FEED      3.0 — 9.0   liquid ink ribbon, editorial warmth
 *   III. GRID      9.0 — 15.0  architectural depth, planes, anamorphic light
 *   IV.  SYNC     15.0 — 20.0  kinetic typography tension
 *   V.   CORRUPT  20.0 — 25.0  signal failure, glitch, glyph rain
 *   VI.  FRACTURE 25.0 — 30.0  mosaic shatter into kaleidoscopic light
 *   VII. CLIMAX   30.0 — 35.5  everything converges, speed ramp
 *   VIII.FINALE   35.5 — 40.0  cinematic resolution
 *
 * Every cut lands on the 0.5s grid (120 BPM) so the edit breathes in time.
 */
import { pulse, track, smoothstep, clamp } from './core/math.js';
import { s01 } from './scenes/s01_ignition.js';
import { s02 } from './scenes/s02_feed.js';
import { s03 } from './scenes/s03_grid.js';
import { s04 } from './scenes/s04_sync.js';
import { s05 } from './scenes/s05_corrupt.js';
import { s06 } from './scenes/s06_fracture.js';
import { s07 } from './scenes/s07_climax.js';
import { s08 } from './scenes/s08_finale.js';

export const SCENES = [s01, s02, s03, s04, s05, s06, s07, s08];

export const TRANSITIONS = [
  { at: 3.0, dur: 0.62, kind: 'zoomThrough', from: s01, to: s02 },
  { at: 9.0, dur: 0.5, kind: 'sliceWipe', from: s02, to: s03 },
  { at: 15.0, dur: 0.44, kind: 'lightRush', from: s03, to: s04 },
  { at: 20.0, dur: 0.4, kind: 'glitchCut', from: s04, to: s05 },
  { at: 25.0, dur: 0.46, kind: 'radialWipe', from: s05, to: s06 },
  { at: 30.0, dur: 0.34, kind: 'glitchCut', from: s06, to: s07 },
  { at: 35.5, dur: 0.5, kind: 'crossfade', from: s07, to: s08 },
];

export const IMPACTS = [
  { t: 0.16, amp: 12, decay: 0.22 },
  { t: 0.42, amp: 24, decay: 0.3 },
  { t: 1.18, amp: 14, decay: 0.35 },
  { t: 3.0, amp: 18, decay: 0.3 },
  { t: 9.0, amp: 12, decay: 0.26 },
  { t: 15.0, amp: 16, decay: 0.28 },
  { t: 20.0, amp: 22, decay: 0.3 },
  { t: 25.0, amp: 20, decay: 0.3 },
  { t: 30.0, amp: 30, decay: 0.42 },
  { t: 33.0, amp: 16, decay: 0.3 },
  { t: 35.5, amp: 26, decay: 0.5 },
  { t: 37.9, amp: 8, decay: 0.4 },
];

const BARS = [
  [0.0, 74],
  [2.6, 74],
  [3.0, 26],
  [8.6, 26],
  [9.0, 0],
  [14.8, 0],
  [15.0, 0],
  [29.9, 0],
  [30.0, 88],
  [35.4, 88],
  [35.6, 60],
  [40.0, 60],
];

export function postTrack(t) {
  const g = (a, b, x) => smoothstep(a, b, t) * (1 - smoothstep(b, x, t));

  let ca = 0;
  ca += pulse(t, 0.16, 0.28) * 0.9;
  ca += pulse(t, 0.42, 0.3) * 1.1;
  ca += pulse(t, 1.18, 0.4) * 0.7;
  ca += pulse(t, 20.0, 0.9) * 1.3;
  ca += pulse(t, 25.0, 0.5) * 1.0;
  ca += pulse(t, 30.0, 0.6) * 1.4;
  ca += pulse(t, 35.5, 0.35) * 0.9;
  // sustained glitchy band inside CORRUPT
  ca += g(20.3, 20.6, 24.6) * 0.5;

  let flash = 0;
  flash += pulse(t, 0.16, 0.22) * 0.85;
  flash += pulse(t, 0.42, 0.16) * 0.5;
  flash += pulse(t, 1.18, 0.18) * 0.6;
  flash += pulse(t, 3.0, 0.2) * 0.55;
  flash += pulse(t, 15.0, 0.14) * 0.4;
  flash += pulse(t, 20.0, 0.1) * 0.7;
  flash += pulse(t, 25.0, 0.12) * 0.5;
  flash += pulse(t, 30.0, 0.16) * 0.8;
  flash += pulse(t, 35.5, 0.1) * 0.95;
  flash = clamp(flash, 0, 1);

  let speed = 0;
  speed += g(2.72, 2.95, 3.25) * 0.9;
  speed += g(14.75, 15.0, 15.22) * 0.7;
  speed += g(29.75, 30.0, 30.2) * 0.8;
  speed += g(31.3, 32.2, 32.85) * 0.3;

  // The brutalist chapter is a daylight scene: pull bloom way down so the paper
  // stays paper, and lift the grain so it reads as stock.
  const lightScene = smoothstep(8.9, 9.02, t) * (1 - smoothstep(14.9, 15.02, t));

  return {
    bloom: (0.5 + pulse(t, 0.17, 0.5) * 0.7 + pulse(t, 30.0, 0.6) * 0.55 + g(30.4, 31.2, 35.3) * 0.12) * (1 - lightScene * 0.82),
    ca,
    flash,
    speedBlur: speed,
    bars: track(t, BARS, (x) => x),
    grain: 0.045 + (g(20, 20.3, 25) * 0.03) + (t < 0.16 ? 0.02 : 0) + lightScene * 0.04,
    vignette: (0.6 - g(3, 4, 9) * 0.14) * (1 - lightScene * 0.75),
  };
}

export const FILM = {
  fps: 60,
  duration: 40,
  scenes: SCENES,
  transitions: TRANSITIONS,
  impacts: IMPACTS,
  postTrack,
};
