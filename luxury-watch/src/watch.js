/**
 * watch.js — AUREUM Calibre 001.
 *
 * A 40 mm, 18k gold, sapphire-front-and-back wristwatch with a guilloché
 * dial, applied faceted indices, small seconds and a visible automatic
 * calibre. Everything is assembled from procedural geometry; no assets.
 *
 * Orientation: dial +Z, 12 o'clock +Y, 3 o'clock +X. Millimetres.
 */

import * as THREE from 'three';
import {
  lathe,
  extrudeShape,
  roundedRectShape,
  batonGeometry,
  buildHand,
  buildNeedle,
  buildStrapGeometry,
  buildStitching,
  flutedCylinderGeometry,
  gearGeometry,
  hairspringGeometry,
} from './geometry.js';
import { createRotorEngraving } from './textures.js';

const DIAL_Z = 1.92;
const SUBDIAL_CENTER = new THREE.Vector2(0, -9.35);
const TAU = Math.PI * 2;

export function buildWatch(materials) {
  const lib = materials;
  const root = new THREE.Group();
  root.name = 'AUREUM Calibre 001';

  const explode = [];
  const registerExplode = (object, offset) => {
    explode.push({ object, origin: object.position.clone(), offset });
  };

  /* ================================================================ *
   * case
   * ================================================================ */

  const caseGroup = new THREE.Group();
  caseGroup.name = 'case';
  root.add(caseGroup);
  registerExplode(caseGroup, new THREE.Vector3(0, 0, 0));

  const bandProfile = [
    [13.8, -4.85],
    [16.9, -5.05],
    [18.5, -4.5],
    [19.35, -3.1],
    [19.7, -1.2],
    [19.7, 1.55],
    [19.25, 2.6],
    [18.2, 3.1],
    [16.2, 3.32],
    [15.42, 3.25],
    [15.42, 2.05],
    [15.42, -2.2],
    [14.4, -4.4],
  ];
  const band = lathe(bandProfile, lib.metalBrushed, { segments: 256 });
  band.name = 'case.band';
  caseGroup.add(band);

  // Polished bevelled ring between the brushed band and the bezel.
  const collar = lathe(
    [
      [19.66, 2.55],
      [19.26, 2.68],
      [18.24, 3.12],
      [18.24, 3.3],
      [19.3, 3.3],
      [19.86, 2.7],
    ],
    lib.metalPolished,
    { segments: 256 },
  );
  caseGroup.add(collar);

  /* ---- lugs ---- */
  const lugShape = new THREE.Shape();
  lugShape.moveTo(-2.3, 14.2);
  lugShape.lineTo(2.45, 14.2);
  lugShape.bezierCurveTo(2.9, 15.4, 2.75, 16.8, 2.25, 18.2);
  lugShape.bezierCurveTo(1.85, 19.6, 1.2, 20.7, 0.35, 21.2);
  lugShape.bezierCurveTo(-0.5, 20.9, -1.35, 19.8, -1.75, 18.4);
  lugShape.bezierCurveTo(-2.2, 16.9, -2.55, 15.4, -2.3, 14.2);
  lugShape.closePath();

  const lugGeometry = new THREE.ExtrudeGeometry(lugShape, {
    depth: 2.1,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.48,
    bevelSize: 0.44,
    bevelSegments: 4,
    curveSegments: 14,
  });

  // Four lugs: plates whose faces are normal to X, joining the case at
  // 12 and 6 and curling over the spring bars.
  const lugInnerX = 9.05;
  const lugOuterX = 11.75;
  const lugThickness = 2.35;
  for (const sideX of [-1, 1]) {
    for (const sideY of [-1, 1]) {
      const geometry = lugGeometry.clone();
      geometry.rotateY(sideX > 0 ? -Math.PI / 2 : Math.PI / 2);
      if (sideY < 0) geometry.rotateX(Math.PI);
      geometry.translate(sideX * (lugInnerX + lugThickness), 0, 0);
      const mesh = new THREE.Mesh(geometry, lib.metalPolished);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      caseGroup.add(mesh);
    }
  }
  void lugOuterX;


  /* ---- crown ---- */
  const crownGroup = new THREE.Group();
  crownGroup.name = 'crown';
  crownGroup.position.set(20.6, 0, -0.25);
  caseGroup.add(crownGroup);

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 1.9, 32), lib.metalPolished);
  tube.rotation.z = Math.PI / 2;
  tube.position.x = -0.7;
  tube.castShadow = true;
  crownGroup.add(tube);

  const crownBody = new THREE.Mesh(flutedCylinderGeometry(2.5, 2.75, { flutes: 24, depth: 0.2 }), lib.metalPolished);
  crownBody.rotation.z = -Math.PI / 2;
  crownBody.position.x = 1.35;
  crownBody.castShadow = true;
  crownGroup.add(crownBody);

  const crownCap = new THREE.Mesh(new THREE.CylinderGeometry(2.02, 2.2, 0.42, 48), lib.metalPolished);
  crownCap.rotation.z = -Math.PI / 2;
  crownCap.position.x = 2.85;
  crownCap.castShadow = true;
  crownGroup.add(crownCap);

  const crownDome = new THREE.Mesh(new THREE.SphereGeometry(1.85, 32, 16, 0, TAU, 0, Math.PI / 2), lib.metalPolished);
  crownDome.rotation.z = -Math.PI / 2;
  crownDome.scale.set(1, 0.28, 1);
  crownDome.position.x = 3.05;
  crownGroup.add(crownDome);

  /* ---- bezel ---- */
  const bezel = lathe(
    [
      [15.18, 3.28],
      [15.16, 4.28],
      [15.34, 4.94],
      [16.05, 5.24],
      [17.9, 5.3],
      [19.05, 5.02],
      [19.72, 4.32],
      [19.96, 3.7],
      [19.9, 3.42],
      [18.4, 3.24],
    ],
    lib.metalPolished,
    { segments: 256 },
  );
  bezel.name = 'bezel';
  root.add(bezel);
  registerExplode(bezel, new THREE.Vector3(0, 0, 9));

  // Inner flange (rehaut) from the dial up to the crystal.
  const rehaut = lathe(
    [
      [15.4, DIAL_Z - 0.02],
      [15.36, 2.7],
      [15.28, 3.5],
      [15.2, 4.34],
      [15.18, 4.55],
    ],
    lib.metalPolished,
    { segments: 192 },
  );
  rehaut.name = 'rehaut';
  root.add(rehaut);
  registerExplode(rehaut, new THREE.Vector3(0, 0, 4));

  /* ---- crystal (closed sapphire lens) ---- */
  const crystal = lathe(
    [
      [0, 4.28],
      [6, 4.29],
      [11, 4.3],
      [14.35, 4.34],
      [15.17, 4.42],
      [15.18, 4.6],
      [15.0, 4.86],
      [13.9, 5.12],
      [12.0, 5.4],
      [9.2, 5.66],
      [5.4, 5.84],
      [0, 5.91],
    ],
    lib.sapphire,
    { segments: 192 },
  );
  crystal.name = 'crystal';
  crystal.castShadow = false;
  crystal.receiveShadow = false;
  crystal.renderOrder = 4;
  root.add(crystal);
  registerExplode(crystal, new THREE.Vector3(0, 0, 17));

  /* ================================================================ *
   * dial
   * ================================================================ */

  const dialGroup = new THREE.Group();
  dialGroup.name = 'dial';
  root.add(dialGroup);
  registerExplode(dialGroup, new THREE.Vector3(0, 0, 4.5));

  const dial = new THREE.Mesh(new THREE.CircleGeometry(15.36, 192), lib.dialMaterial);
  dial.position.z = DIAL_Z;
  dial.receiveShadow = true;
  dialGroup.add(dial);

  const dialBack = new THREE.Mesh(new THREE.CylinderGeometry(15.3, 15.3, 0.7, 96), lib.perlage);
  dialBack.rotation.x = Math.PI / 2;
  dialBack.position.z = DIAL_Z - 0.4;
  dialGroup.add(dialBack);

  /* ---- small seconds register ---- */
  const subdial = new THREE.Mesh(new THREE.CircleGeometry(4.28, 128), lib.subdialMaterial);
  subdial.position.set(SUBDIAL_CENTER.x, SUBDIAL_CENTER.y, DIAL_Z + 0.035);
  subdial.receiveShadow = true;
  dialGroup.add(subdial);

  const subdialRing = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.055, 10, 128), lib.metalPolished);
  subdialRing.position.set(SUBDIAL_CENTER.x, SUBDIAL_CENTER.y, DIAL_Z + 0.055);
  dialGroup.add(subdialRing);

  const subdialShadow = new THREE.Mesh(
    new THREE.RingGeometry(4.28, 4.62, 96),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24, depthWrite: false }),
  );
  subdialShadow.position.set(SUBDIAL_CENTER.x, SUBDIAL_CENTER.y, DIAL_Z + 0.012);
  dialGroup.add(subdialShadow);

  /* ---- applied indices ---- */
  const indices = new THREE.Group();
  indices.name = 'indices';
  dialGroup.add(indices);

  const addBaton = (angle, radius, length, width, { height = 0.42, offset = 0 } = {}) => {
    const geometry = batonGeometry(length, width, height, 0.04);
    const mesh = new THREE.Mesh(geometry, lib.metalPolished);
    mesh.castShadow = true;
    const localX = Math.cos(angle) * offset;
    const localY = Math.sin(angle) * offset;
    mesh.position.set(
      Math.sin(angle) * radius + localX,
      Math.cos(angle) * radius + localY,
      DIAL_Z + 0.045,
    );
    mesh.rotation.z = -angle;
    indices.add(mesh);
    return mesh;
  };

  for (let hour = 1; hour < 12; hour += 1) {
    if (hour === 6) continue;
    const angle = (hour / 12) * TAU;
    const length = 3.1;
    const width = hour % 3 === 0 ? 1.12 : 0.94;
    addBaton(angle, 12.45, length, width);
  }

  // Double baton at XII.
  addBaton(0, 12.55, 3.2, 0.8, { offset: 1.02 });
  addBaton(0, 12.55, 3.2, 0.8, { offset: -1.02 });

  /* ---- hands ---- */
  const handsGroup = new THREE.Group();
  handsGroup.name = 'hands';
  root.add(handsGroup);
  registerExplode(handsGroup, new THREE.Vector3(0, 0, 8.5));

  const hourHand = buildHand(lib.metalPolished, {
    length: 10.1,
    width: 2.45,
    tail: 1.9,
    thickness: 0.46,
    ridge: 0.26,
    bodyMaterial: lib.metalBrushed,
    ridgeMaterial: lib.metalPolished,
  });
  hourHand.position.z = DIAL_Z + 0.38;
  hourHand.name = 'hand.hour';
  handsGroup.add(hourHand);

  const minuteHand = buildHand(lib.metalPolished, {
    length: 13.55,
    width: 2.15,
    tail: 2.1,
    thickness: 0.44,
    ridge: 0.24,
    bodyMaterial: lib.metalBrushed,
    ridgeMaterial: lib.metalPolished,
  });
  minuteHand.position.z = DIAL_Z + 0.7;
  minuteHand.name = 'hand.minute';
  handsGroup.add(minuteHand);

  const secondHand = buildNeedle(lib.bluedSteel, {
    length: 14.25,
    width: 0.34,
    tail: 3.2,
    thickness: 0.15,
  });
  secondHand.position.z = DIAL_Z + 1.02;
  secondHand.name = 'hand.second';
  handsGroup.add(secondHand);

  const counterweight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.16, 32),
    lib.bluedSteel,
  );
  counterweight.rotation.x = Math.PI / 2;
  counterweight.position.set(0, -2.4, DIAL_Z + 1.02);
  handsGroup.add(counterweight);

  const smallSeconds = buildNeedle(lib.bluedSteel, {
    length: 3.5,
    width: 0.2,
    tail: 0.7,
    thickness: 0.1,
  });
  smallSeconds.position.set(SUBDIAL_CENTER.x, SUBDIAL_CENTER.y, DIAL_Z + 0.19);
  smallSeconds.name = 'hand.smallSeconds';
  handsGroup.add(smallSeconds);

  // Centre stack + cap.
  const handStack = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.45, 24), lib.metalPolished);
  handStack.rotation.x = Math.PI / 2;
  handStack.position.z = DIAL_Z + 0.9;
  handsGroup.add(handStack);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.0, 40, 20), lib.metalPolished);
  cap.scale.set(1, 1, 0.42);
  cap.position.z = DIAL_Z + 1.5;
  cap.castShadow = true;
  handsGroup.add(cap);

  const subdialCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 20, 10),
    lib.metalPolished,
  );
  subdialCap.scale.set(1, 1, 0.6);
  subdialCap.position.set(SUBDIAL_CENTER.x, SUBDIAL_CENTER.y, DIAL_Z + 0.22);
  handsGroup.add(subdialCap);

  /* ================================================================ *
   * movement — visible through the display back
   * ================================================================ */

  const movement = new THREE.Group();
  movement.name = 'movement';
  root.add(movement);
  registerExplode(movement, new THREE.Vector3(0, 0, -7));

  const mainplate = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, 1.4, 128), lib.perlage);
  mainplate.rotation.x = Math.PI / 2;
  mainplate.position.z = -1.85;
  movement.add(mainplate);

  const mainplateRing = lathe(
    [
      [15.0, -2.7],
      [15.5, -2.55],
      [15.5, -1.2],
      [15.0, -1.0],
    ],
    lib.metalBrushed,
    { segments: 128 },
  );
  movement.add(mainplateRing);

  // Three-quarter bridge plate, openworked with circular apertures so the
  // wheels and the balance read through it. Geneva stripes + chamfered holes.
  const plateOutline = new THREE.Shape();
  plateOutline.absarc(0, 0, 13.35, 0, Math.PI * 2, false);

  const apertures = [
    { x: -1.8, y: -5.9, r: 4.45 }, // great wheel
    { x: 3.7, y: 3.3, r: 3.05 }, // centre wheel
    { x: 8.8, y: -2.3, r: 2.15 }, // third wheel
    { x: -7.9, y: 5.9, r: 3.15 }, // balance
    { x: 7.4, y: 7.6, r: 1.35 }, // train jewel
  ];
  for (const aperture of apertures) {
    const hole = new THREE.Path();
    hole.absarc(aperture.x, aperture.y, aperture.r, 0, Math.PI * 2, true);
    plateOutline.holes.push(hole);
  }

  const bridgePlate = extrudeShape(plateOutline, lib.bridgeMetal, {
    depth: 0.95,
    bevel: 0.2,
    bevelSegments: 3,
    curveSegments: 36,
  });
  bridgePlate.position.z = -3.22;
  movement.add(bridgePlate);

  // Wheels, sitting just under the plate and visible through the apertures.
  const gears = [];
  const gearSpecs = [
    { r: 4.35, teeth: 34, x: -1.8, y: -5.9, z: -2.98, speed: 0.16, material: lib.metalBrushed },
    { r: 3.0, teeth: 24, x: 3.7, y: 3.3, z: -2.96, speed: -0.3, material: lib.metalBrushed },
    { r: 2.1, teeth: 18, x: 8.8, y: -2.3, z: -2.94, speed: 0.44, material: lib.steel },
    { r: 2.8, teeth: 26, x: 2.6, y: -8.8, z: -2.94, speed: -0.2, material: lib.steel },
  ];
  for (const spec of gearSpecs) {
    const gear = new THREE.Mesh(gearGeometry(spec.r, spec.teeth, 0.42), spec.material);
    gear.position.set(spec.x, spec.y, spec.z);
    gear.userData.speed = spec.speed;
    gears.push(gear);
    movement.add(gear);
  }

  // Ratchet wheel and crown wheel, mounted on the back of the plate.
  const ratchet = new THREE.Mesh(gearGeometry(3.35, 34, 0.42), lib.metalPolished);
  ratchet.position.set(-4.6, -7.6, -3.52);
  movement.add(ratchet);

  const crownWheel = new THREE.Mesh(gearGeometry(1.55, 18, 0.38), lib.metalBrushed);
  crownWheel.position.set(-9.2, -3.9, -3.5);
  movement.add(crownWheel);

  const ratchetScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.3, 24), lib.bluedSteel);
  ratchetScrew.rotation.x = Math.PI / 2;
  ratchetScrew.position.set(-4.6, -7.6, -3.75);
  movement.add(ratchetScrew);

  // Engraved plate, facing the display back.
  const barrelPlaque = new THREE.Mesh(
    new THREE.CircleGeometry(3.3, 48),
    new THREE.MeshStandardMaterial({
      map: createRotorEngraving(),
      transparent: true,
      roughness: 0.5,
      metalness: 0.2,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  barrelPlaque.position.set(0, 8.8, -3.26);
  barrelPlaque.rotation.set(0, Math.PI, 0);
  movement.add(barrelPlaque);

  // Jewels with gold chatons, set into the plate.
  const jewelPositions = [
    [4.9, 5.4], [-10.8, 1.6], [10.2, 3.6], [-2.6, 10.2], [5.2, -6.0], [-11.4, -3.4],
  ];
  for (const [x, y] of jewelPositions) {
    const jewel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.3, 20), lib.ruby);
    jewel.rotation.x = Math.PI / 2;
    jewel.position.set(x, y, -3.32);
    movement.add(jewel);
    const chaton = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.11, 8, 24), lib.metalPolished);
    chaton.position.set(x, y, -3.3);
    movement.add(chaton);
  }

  // Blued screws.
  const screwPositions = [
    [1.4, 9.7, 0.5], [-9.4, 8.4, 1.9], [7.0, -8.4, -0.4], [-12.2, -0.2, 0.9], [10.6, -5.4, -1.2], [0.8, -11.0, 2.2],
  ];
  for (const [x, y, rot] of screwPositions) {
    const group = new THREE.Group();
    group.position.set(x, y, -3.34);
    group.rotation.z = rot;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.28, 24), lib.bluedSteel);
    head.rotation.x = Math.PI / 2;
    group.add(head);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.09, 0.05), lib.engraving);
    slot.position.z = 0.16;
    group.add(slot);
    movement.add(group);
  }

  // Balance wheel + blued hairspring, beneath a narrow balance cock.
  const balance = new THREE.Group();
  balance.name = 'balance';
  balance.position.set(-7.9, 5.9, -2.95);
  movement.add(balance);

  const balanceRim = new THREE.Mesh(new THREE.TorusGeometry(2.82, 0.2, 12, 80), lib.steel);
  balance.add(balanceRim);
  for (let i = 0; i < 3; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.16, 0.16), lib.steel);
    spoke.rotation.z = (i / 3) * Math.PI;
    balance.add(spoke);
  }
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * TAU;
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 12), lib.metalPolished);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(Math.cos(angle) * 2.82, Math.sin(angle) * 2.82, 0);
    balance.add(screw);
  }

  const hairspring = new THREE.Mesh(hairspringGeometry(5, 0.7, 2.6, 0.05), lib.bluedSteel);
  hairspring.position.set(-7.9, 5.9, -3.16);
  movement.add(hairspring);

  const balanceCock = extrudeShape(roundedRectShape(2.2, 8.4, 1.1), lib.geneva, {
    depth: 0.55,
    bevel: 0.16,
    bevelSegments: 3,
    curveSegments: 18,
  });
  balanceCock.position.set(-9.1, 6.7, -3.55);
  balanceCock.rotation.z = 0.46;
  movement.add(balanceCock);

  const cockJewel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.28, 24), lib.ruby);
  cockJewel.rotation.x = Math.PI / 2;
  cockJewel.position.set(-7.9, 5.9, -3.85);
  movement.add(cockJewel);

  const cockScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.3, 24), lib.bluedSteel);
  cockScrew.rotation.x = Math.PI / 2;
  cockScrew.position.set(-10.4, 8.0, -3.85);
  movement.add(cockScrew);

  // Automatic rotor — a skeletonised gold half-disc.
  const rotor = new THREE.Group();
  rotor.name = 'rotor';
  rotor.position.set(0, 0, -4.55);
  movement.add(rotor);

  const rotorShape = new THREE.Shape();
  rotorShape.absarc(0, 0, 12.7, Math.PI * 0.1, Math.PI * 0.9, false);
  rotorShape.absarc(0, 0, 8.7, Math.PI * 0.9, Math.PI * 0.1, true);
  rotorShape.closePath();
  const rotorBody = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rotorShape, {
      depth: 0.55,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.12,
      bevelSegments: 2,
      curveSegments: 24,
    }),
    lib.rotorMetal,
  );
  rotorBody.castShadow = true;
  rotor.add(rotorBody);

  const rotorHub = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.7, 48), lib.metalPolished);
  rotorHub.rotation.x = Math.PI / 2;
  rotor.add(rotorHub);
  const rotorScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.4, 32), lib.bluedSteel);
  rotorScrew.rotation.x = Math.PI / 2;
  rotorScrew.position.z = -0.15;
  rotor.add(rotorScrew);

  const rotorText = new THREE.Mesh(
    new THREE.CircleGeometry(2.7, 48),
    new THREE.MeshStandardMaterial({
      map: createRotorEngraving(),
      transparent: true,
      roughness: 0.5,
      metalness: 0.2,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  rotorText.position.set(0, -10.7, -0.02);
  rotorText.rotation.y = Math.PI;
  rotorText.rotation.z = Math.PI - 0.1;
  rotor.add(rotorText);

  // A soft light inside the display back, so the calibre reads clearly
  // without spilling onto the dial side.
  const calibreLight = new THREE.PointLight(0xfff1d9, 150, 70, 2);
  calibreLight.position.set(0, 0, -16);
  movement.add(calibreLight);

  /* ---- case back ring + sapphire display back ---- */
  const caseback = new THREE.Group();
  caseback.name = 'caseback';
  root.add(caseback);
  registerExplode(caseback, new THREE.Vector3(0, 0, -15));

  const casebackRing = lathe(
    [
      [14.4, -6.35],
      [16.9, -6.35],
      [18.15, -5.82],
      [18.35, -4.95],
      [17.05, -4.5],
      [14.4, -4.5],
      [14.4, -5.35],
    ],
    lib.metalBrushed,
    { segments: 192 },
  );
  caseback.add(casebackRing);

  const backGlass = new THREE.Mesh(new THREE.CylinderGeometry(14.45, 14.45, 0.72, 128), lib.backSapphire);
  backGlass.rotation.x = Math.PI / 2;
  backGlass.position.z = -5.75;
  backGlass.renderOrder = 3;
  caseback.add(backGlass);

  // Fine engraved ring inside the display back.
  const backRing = new THREE.Mesh(new THREE.TorusGeometry(13.95, 0.16, 8, 128), lib.metalPolished);
  backRing.position.z = -4.62;
  caseback.add(backRing);

  /* ================================================================ *
   * strap
   * ================================================================ */

  const strapGroup = new THREE.Group();
  strapGroup.name = 'strap';
  root.add(strapGroup);

  const upperCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 17.0, -1.9),
    new THREE.Vector3(0, 22.8, -3.4),
    new THREE.Vector3(0, 27.3, -9.5),
    new THREE.Vector3(0, 27.1, -18.5),
    new THREE.Vector3(0, 22.2, -26.2),
    new THREE.Vector3(0, 14.4, -31.4),
    new THREE.Vector3(0, 6.4, -33.0),
    new THREE.Vector3(0, -2.0, -33.6),
  ], false, 'catmullrom', 0.4);

  const lowerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -17.0, -1.9),
    new THREE.Vector3(0, -22.8, -3.4),
    new THREE.Vector3(0, -27.3, -9.5),
    new THREE.Vector3(0, -27.1, -18.5),
    new THREE.Vector3(0, -22.2, -26.2),
    new THREE.Vector3(0, -14.4, -31.4),
    new THREE.Vector3(0, -6.4, -33.0),
    new THREE.Vector3(0, 2.0, -33.6),
  ], false, 'catmullrom', 0.4);

  const strapOptions = { widthStart: 17.6, widthEnd: 15.4, thickness: 2.1, samples: 190 };

  const upperStrap = new THREE.Mesh(buildStrapGeometry(upperCurve, strapOptions), lib.leather);
  upperStrap.castShadow = true;
  upperStrap.receiveShadow = true;
  strapGroup.add(upperStrap);
  const upperStitching = buildStitching(upperCurve, lib.stitching, {
    widthStart: strapOptions.widthStart,
    widthEnd: strapOptions.widthEnd,
    thickness: strapOptions.thickness,
    spacing: 3.0,
  });
  strapGroup.add(upperStitching);

  const lowerStrap = new THREE.Mesh(buildStrapGeometry(lowerCurve, strapOptions), lib.leather);
  lowerStrap.castShadow = true;
  lowerStrap.receiveShadow = true;
  strapGroup.add(lowerStrap);
  const lowerStitching = buildStitching(lowerCurve, lib.stitching, {
    widthStart: strapOptions.widthStart,
    widthEnd: strapOptions.widthEnd,
    thickness: strapOptions.thickness,
    spacing: 3.0,
  });
  strapGroup.add(lowerStitching);

  registerExplode(strapGroup, new THREE.Vector3(0, 0, -3));

  /* ---- deployant clasp closing the bracelet ---- */
  const clasp = new THREE.Group();
  clasp.name = 'clasp';
  clasp.position.set(0, 0, -35.1);
  strapGroup.add(clasp);

  const claspPlate = extrudeShape(roundedRectShape(17.2, 11.6, 3.2), lib.strapMetal, {
    depth: 1.5,
    bevel: 0.28,
    bevelSegments: 3,
    curveSegments: 18,
  });
  claspPlate.position.z = -0.9;
  clasp.add(claspPlate);

  const claspInner = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.22, 48),
    lib.strapMetal,
  );
  claspInner.rotation.x = Math.PI / 2;
  claspInner.position.z = 0.78;
  clasp.add(claspInner);

  const claspLogo = new THREE.Mesh(
    new THREE.CircleGeometry(2.9, 48),
    new THREE.MeshStandardMaterial({
      map: createRotorEngraving(),
      transparent: true,
      roughness: 0.55,
      metalness: 0.2,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  claspLogo.position.z = -1.02;
  claspLogo.rotation.y = Math.PI;
  clasp.add(claspLogo);

  for (const side of [-1, 1]) {
    const pusher = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.5, 20), lib.strapMetal);
    pusher.rotation.z = Math.PI / 2;
    pusher.position.set(side * 8.9, 0, 0);
    clasp.add(pusher);
  }

  registerExplode(clasp, new THREE.Vector3(0, 0, -3));

  /* ================================================================ *
   * animation + colourway API
   * ================================================================ */

  const state = { explode: 0 };

  /**
   * Movement study: the strap dissolves so the display back is unobstructed.
   * Strap-only materials fade, the case stays solid.
   */
  let lastStrapOpacity = -1;
  function setStrapOpacity(value) {
    const opacity = Math.max(0, Math.min(1, value));
    if (Math.abs(opacity - lastStrapOpacity) < 0.002) return;
    lastStrapOpacity = opacity;
    const fading = opacity < 0.999;
    for (const material of [lib.leather, lib.stitching, lib.strapMetal, claspLogo.material]) {
      material.transparent = fading;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.6;
      material.needsUpdate = true;
    }
    strapGroup.visible = opacity > 0.01;
    upperStrap.castShadow = opacity > 0.5;
    lowerStrap.castShadow = opacity > 0.5;
  }

  function setExplode(value) {
    state.explode = value;
    for (const item of explode) {
      item.object.position.copy(item.origin).addScaledVector(item.offset, value);
    }
  }

  function setTime(date) {
    const seconds = date.getSeconds() + date.getMilliseconds() / 1000;
    const minutes = date.getMinutes() + seconds / 60;
    const hours = (date.getHours() % 12) + minutes / 60;
    hourHand.rotation.z = -(hours / 12) * TAU;
    minuteHand.rotation.z = -(minutes / 60) * TAU;
    secondHand.rotation.z = -(seconds / 60) * TAU;
    smallSeconds.rotation.z = -(seconds / 60) * TAU;
  }

  let elapsed = 0;
  function update(delta) {
    elapsed += delta;
    rotor.rotation.z = Math.sin(elapsed * 0.42) * 0.85 + Math.sin(elapsed * 0.17) * 0.35;
    balance.rotation.z = Math.sin(elapsed * TAU * 2.5) * 0.85;
    hairspring.rotation.z = balance.rotation.z * 0.45;
    for (const gear of gears) {
      gear.rotation.z += delta * gear.userData.speed;
    }
  }

  setExplode(0);

  return {
    root,
    setTime,
    update,
    setExplode,
    setStrapOpacity,
    setCaseMetal: (id) => lib.setCaseMetal(id),
    setDial: (id) => lib.setDial(id),
    setStrap: (id) => lib.setStrap(id),
    parts: {
      caseGroup,
      bezel,
      crystal,
      dialGroup,
      handsGroup,
      movement,
      caseback,
      strapGroup,
      rotor,
      balance,
    },
    materials: lib,
  };
}
