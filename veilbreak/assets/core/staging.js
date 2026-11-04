/**
 * VEILBREAK — the set.
 *
 * World-space positions of everything the camera is meant to look at. The
 * renderer builds geometry from these numbers and the composition test
 * (test/framing.mjs) projects the same numbers through the same camera to
 * prove the shots actually frame their subject. One source of truth, so a
 * camera tweak and a set tweak can never quietly disagree.
 *
 * Axes: the Archive ring stands in the XY plane at the origin, its aperture
 * facing ±Z. The film opens at +Z (172 units out) and crosses the aperture at
 * story time 62.35 s, ending at −Z looking back at the transformed universe.
 */

export const STAGE = {
  /* The Archive — the colossal ring the film is built around. */
  structure: {
    center: [0, 0, 0],
    outerRadius: 30,
    midRadius: 21,
    apertureRadius: 13.2,
    finRing: 22.6,
    fins: 28
  },

  /* The aperture, dead centre of the ring. */
  portal: {
    center: [0, 0, 0],
    radius: 13.2
  },

  /* The watcher and the shard it stands on — the final-shot foreground. */
  watcher: {
    island: [-18.5, 10.5, -62.5],
    islandTop: 13.0,
    head: [-18.5, 20.0, -62.5],
    feet: [-18.5, 13.0, -62.5],
    height: 7.0
  },

  /* Twin suns of the ember universe — the light source of act V. */
  suns: [
    { pos: [22.6, 36.1, 118.3], radius: 12.0, halo: 64, color: 0xfff0d0 },
    { pos: [-7.1, 23.2, 105.7], radius: 7.4, halo: 40, color: 0xffb877 }
  ],

  /* Ruined spires on the far side of the ring — the ember skyline. Kept well
     behind the ring (z > 120) and slim, so they read as a horizon rather than
     a fence in front of the shot. */
  towers: [
    { top: [203, 6, 72], height: 132, width: 8.0 },
    { top: [201, 26, 126], height: 108, width: 6.5 },
    { top: [-20, 11, 208], height: 150, width: 9.0 },
    { top: [-48, 3, 179], height: 100, width: 6.0 },
    { top: [2, 58, 326], height: 176, width: 11.0 }
  ],

  /* Where the shard fields live. */
  shards: {
    ringRadius: 46,
    coldCount: 64,
    emberCount: 78
  }
};

/** Named points the tests assert against, with the act they belong to. */
export const LANDMARKS = [
  { name: 'structure', point: STAGE.structure.center, act: 1 },
  { name: 'structure top', point: [0, STAGE.structure.outerRadius, 0], act: 1 },
  { name: 'structure left', point: [-STAGE.structure.outerRadius, 0, 0], act: 1 },
  { name: 'structure right', point: [STAGE.structure.outerRadius, 0, 0], act: 1 },
  { name: 'aperture', point: STAGE.portal.center, act: 2 },
  { name: 'watcher head', point: STAGE.watcher.head, act: 4 },
  { name: 'watcher feet', point: STAGE.watcher.feet, act: 4 },
  { name: 'sun A', point: STAGE.suns[0].pos, act: 4 },
  { name: 'sun B', point: STAGE.suns[1].pos, act: 4 }
];
