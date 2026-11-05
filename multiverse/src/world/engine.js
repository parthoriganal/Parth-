// AETHERBOUND — the Engine of Worlds.
// A colossal ringed machine suspended at the origin. Its iris opens onto the
// rift. Built entirely from procedural primitives and instanced detail.

import { makeRng } from '../core/math.js';

export function createEngine(THREE, lib) {
  const group = new THREE.Group();
  group.name = 'engine';

  const rng = makeRng(0xa37e2f1);
  const dummy = new THREE.Object3D();
  const animated = [];

  // ---- materials -----------------------------------------------------------
  const hull = lib.cel({
    color: '#2b3448',
    shadow: '#05070d',
    rim: '#9fe8ff',
    rimStrength: 0.62,
    spec: 0.42,
    paint: 0.8,
    fogDensity: 0.0062,
  });
  const hullDark = lib.cel({
    color: '#1a2130',
    shadow: '#03050a',
    rim: '#ffb45e',
    rimStrength: 0.4,
    spec: 0.25,
    paint: 0.7,
    fogDensity: 0.0062,
  });
  const bronze = lib.cel({
    color: '#5a4630',
    shadow: '#0a0705',
    rim: '#ffd08a',
    rimStrength: 0.7,
    spec: 0.5,
    paint: 1.0,
    fogDensity: 0.0062,
  });
  const plateMat = lib.cel({
    color: '#39435a',
    shadow: '#060810',
    rim: '#ffcf8a',
    rimStrength: 0.55,
    spec: 0.45,
    paint: 0.9,
    tint: true,
    fogDensity: 0.0062,
  });
  const debrisMat = lib.cel({
    color: '#2a3040',
    shadow: '#04060b',
    rim: '#8fe9ff',
    rimStrength: 0.5,
    spec: 0.3,
    paint: 1.1,
    tint: true,
    fogDensity: 0.0055,
  });
  const bladeMat = lib.cel({
    color: '#333a4c',
    shadow: '#05070c',
    rim: '#ffb45e',
    rimStrength: 0.55,
    spec: 0.55,
    emissive: '#ff7a22',
    emissiveStrength: 0.06,
    paint: 0.7,
    fogDensity: 0.0062,
  });

  const warmGlow = (opacity = 1, color = [2.6, 1.25, 0.42]) => new THREE.MeshBasicMaterial({
    color: new THREE.Color(color[0], color[1], color[2]),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const coolGlow = (opacity = 1, color = [0.45, 1.7, 2.4]) => new THREE.MeshBasicMaterial({
    color: new THREE.Color(color[0], color[1], color[2]),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

  const outlineDark = lib.outline({ thickness: 0.055, color: '#03050a', opacity: 0.92 });
  const outlineSoft = lib.outline({ thickness: 0.035, color: '#070a12', opacity: 0.75 });

  function addOutline(mesh, material = outlineDark) {
    const o = new THREE.Mesh(mesh.geometry, material);
    o.renderOrder = -1;
    mesh.add(o);
    return o;
  }

  // ---- main structural rings ----------------------------------------------
  const mainRing = new THREE.Mesh(new THREE.TorusGeometry(15, 0.58, 14, 200), hull);
  addOutline(mainRing);
  group.add(mainRing);

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(12.55, 0.17, 8, 180), warmGlow(0.95));
  innerRing.position.z = 0.16;
  group.add(innerRing);

  const innerRingHalo = new THREE.Mesh(new THREE.TorusGeometry(12.55, 0.5, 6, 180), warmGlow(0.12));
  innerRingHalo.position.z = 0.16;
  group.add(innerRingHalo);

  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(17.9, 0.1, 6, 200), coolGlow(0.75));
  outerRing.position.z = -0.1;
  group.add(outerRing);

  const outerRingHalo = new THREE.Mesh(new THREE.TorusGeometry(17.9, 0.34, 6, 200), coolGlow(0.1));
  outerRingHalo.position.z = -0.1;
  group.add(outerRingHalo);

  // ---- armour plates -------------------------------------------------------
  const plateCount = 58;
  const plateGeo = new THREE.BoxGeometry(1.55, 0.74, 0.66);
  const plateMesh = new THREE.InstancedMesh(plateGeo, plateMat, plateCount);
  const tints = new Float32Array(plateCount * 3);
  const platePalette = [
    new THREE.Color('#4b5872'),
    new THREE.Color('#6a563c'),
    new THREE.Color('#333d52'),
    new THREE.Color('#7a6244'),
    new THREE.Color('#2b3448'),
  ];
  for (let i = 0; i < plateCount; i++) {
    const a = (i / plateCount) * Math.PI * 2 + rng.range(-0.018, 0.018);
    const r = 15.05 + rng.range(-0.1, 0.1);
    dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, rng.range(-0.18, 0.18));
    dummy.rotation.set(rng.range(-0.08, 0.08), rng.range(-0.08, 0.08), a + Math.PI / 2);
    dummy.scale.set(rng.range(0.78, 1.18), rng.range(0.78, 1.18), rng.range(0.8, 1.25));
    dummy.updateMatrix();
    plateMesh.setMatrixAt(i, dummy.matrix);
    const c = rng.pick(platePalette);
    tints[i * 3] = c.r;
    tints[i * 3 + 1] = c.g;
    tints[i * 3 + 2] = c.b;
  }
  plateGeo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3));
  plateMesh.instanceMatrix.needsUpdate = true;
  group.add(plateMesh);

  const plateOutline = new THREE.InstancedMesh(plateGeo, outlineSoft, plateCount);
  plateOutline.instanceMatrix = plateMesh.instanceMatrix;
  group.add(plateOutline);

  // ---- radial spokes -------------------------------------------------------
  const spokeCount = 12;
  const spokeGeo = new THREE.BoxGeometry(6.4, 0.24, 0.46);
  const spokes = new THREE.InstancedMesh(spokeGeo, hullDark, spokeCount);
  const spokeGlowGeo = new THREE.BoxGeometry(5.9, 0.055, 0.075);
  const spokeGlowMat = warmGlow(0.85);
  const spokeGlow = new THREE.InstancedMesh(spokeGlowGeo, spokeGlowMat, spokeCount);
  for (let i = 0; i < spokeCount; i++) {
    const a = (i / spokeCount) * Math.PI * 2 + Math.PI / spokeCount;
    dummy.position.set(Math.cos(a) * 11.5, Math.sin(a) * 11.5, 0.05);
    dummy.rotation.set(0, 0, a);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    spokes.setMatrixAt(i, dummy.matrix);
    dummy.position.z = 0.3;
    dummy.updateMatrix();
    spokeGlow.setMatrixAt(i, dummy.matrix);
  }
  spokes.instanceMatrix.needsUpdate = true;
  spokeGlow.instanceMatrix.needsUpdate = true;
  group.add(spokes);
  group.add(spokeGlow);

  // ---- cathedral spires ----------------------------------------------------
  const spireGroup = new THREE.Group();
  const spireCount = 8;
  for (let i = 0; i < spireCount; i++) {
    const a = (i / spireCount) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.rotation.z = a;

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.15), hullDark);
    base.position.set(17.2, 0, 0);
    addOutline(base, outlineSoft);
    pivot.add(base);

    const pylon = new THREE.Mesh(new THREE.ConeGeometry(0.62, 5.4, 6), hull);
    pylon.position.set(19.9, 0, 0);
    pylon.rotation.z = -Math.PI / 2;
    addOutline(pylon);
    pivot.add(pylon);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.09, 5, 18), warmGlow(0.9));
    collar.position.set(19.2, 0, 0);
    collar.rotation.y = Math.PI / 2;
    pivot.add(collar);

    const collar2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 5, 18), coolGlow(0.7));
    collar2.position.set(21.2, 0, 0);
    collar2.rotation.y = Math.PI / 2;
    pivot.add(collar2);

    const tipMat = lib.glow({ color: '#ffd08a', intensity: 1.1, power: 2.6, flicker: 0.16 });
    const tip = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), tipMat);
    tip.position.set(22.7, 0, 0);
    pivot.add(tip);

    const tipCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 8, 6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 1.1), toneMapped: false })
    );
    tipCore.position.set(22.7, 0, 0);
    pivot.add(tipCore);

    spireGroup.add(pivot);
    animated.push({ type: 'tip', mat: tipMat, phase: i * 1.7 });
  }
  group.add(spireGroup);

  // ---- energy arcs ---------------------------------------------------------
  const arcGroup = new THREE.Group();
  const arcMatWarm = warmGlow(0.5);
  const arcMatCool = coolGlow(0.32);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(20.6, 0.09, 5, 40, Math.PI * 0.52), arcMatWarm);
    arc.rotation.z = a;
    arcGroup.add(arc);
    const arc2 = new THREE.Mesh(new THREE.TorusGeometry(22.4, 0.055, 4, 40, Math.PI * 0.4), arcMatCool);
    arc2.rotation.z = a + 0.4;
    arcGroup.add(arc2);
  }
  group.add(arcGroup);

  // ---- gyroscope rings -----------------------------------------------------
  const gyroGroup = new THREE.Group();
  const gyroA = new THREE.Mesh(new THREE.TorusGeometry(21.5, 0.07, 5, 180), coolGlow(0.4));
  gyroA.rotation.x = Math.PI / 2.6;
  gyroA.rotation.y = 0.35;
  gyroGroup.add(gyroA);
  const gyroB = new THREE.Mesh(new THREE.TorusGeometry(23.8, 0.05, 4, 180), warmGlow(0.26));
  gyroB.rotation.x = -Math.PI / 3.1;
  gyroB.rotation.y = -0.5;
  gyroGroup.add(gyroB);
  group.add(gyroGroup);

  // ---- halo ---------------------------------------------------------------
  const haloA = new THREE.Mesh(new THREE.TorusGeometry(27.5, 0.035, 4, 220), warmGlow(0.2));
  haloA.position.z = -2;
  group.add(haloA);
  const haloB = new THREE.Mesh(new THREE.TorusGeometry(31.5, 0.025, 4, 220), coolGlow(0.14));
  haloB.position.z = -4;
  haloB.rotation.x = 0.08;
  group.add(haloB);

  // ---- iris blades ---------------------------------------------------------
  const irisGroup = new THREE.Group();
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(-6.15, 1.08);
  bladeShape.lineTo(-6.15, -1.08);
  bladeShape.lineTo(0, 0);
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 1,
    steps: 1,
  });
  bladeGeo.translate(0, 0, -0.11);
  const bladeCount = 14;
  const blades = [];
  const bladeEdgeMat = warmGlow(0.9);
  for (let i = 0; i < bladeCount; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / bladeCount) * Math.PI * 2;
    const blade = new THREE.Group();
    blade.position.set(6.55, 0, -0.42);
    const mesh = new THREE.Mesh(bladeGeo, bladeMat);
    blade.add(mesh);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.95, 0.07), bladeEdgeMat);
    edge.position.set(0.02, 0, 0.16);
    blade.add(edge);
    pivot.add(blade);
    irisGroup.add(pivot);
    blades.push({ pivot, blade, phase: i * 0.7 });
  }
  group.add(irisGroup);

  // ---- core seed -----------------------------------------------------------
  const coreGroup = new THREE.Group();
  const coreMat = lib.glow({ color: '#ffd9a0', intensity: 1.8, power: 2.2, flicker: 0.12 });
  const coreGlow = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), coreMat);
  coreGlow.position.z = -0.2;
  coreGroup.add(coreGlow);
  const coreBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 18, 12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.4, 1.35), toneMapped: false })
  );
  coreGroup.add(coreBall);
  group.add(coreGroup);

  // ---- city lights ---------------------------------------------------------
  const windowCount = 340;
  const wPos = new Float32Array(windowCount * 3);
  const wSize = new Float32Array(windowCount);
  const wPhase = new Float32Array(windowCount);
  const wCol = new Float32Array(windowCount * 3);
  const warm = new THREE.Color('#ffc27a');
  const cool = new THREE.Color('#9fe8ff');
  for (let i = 0; i < windowCount; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.chance(0.72) ? 15.05 + rng.range(-0.2, 0.2) : 12.55 + rng.range(-0.1, 0.1);
    wPos[i * 3] = Math.cos(a) * r;
    wPos[i * 3 + 1] = Math.sin(a) * r;
    wPos[i * 3 + 2] = rng.range(-0.28, 0.34);
    wSize[i] = rng.range(0.5, 1.5);
    wPhase[i] = rng.range(0, Math.PI * 2);
    const c = rng.chance(0.7) ? warm : cool;
    wCol[i * 3] = c.r;
    wCol[i * 3 + 1] = c.g;
    wCol[i * 3 + 2] = c.b;
  }
  const windowGeo = new THREE.BufferGeometry();
  windowGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  windowGeo.setAttribute('aSize', new THREE.BufferAttribute(wSize, 1));
  windowGeo.setAttribute('aPhase', new THREE.BufferAttribute(wPhase, 1));
  windowGeo.setAttribute('aColor', new THREE.BufferAttribute(wCol, 3));
  const windowMat = lib.stars({ opacity: 0.9 });
  const windows = new THREE.Points(windowGeo, windowMat);
  group.add(windows);

  // ---- orbital debris ------------------------------------------------------
  const debrisCount = 44;
  const debrisGeo = new THREE.DodecahedronGeometry(1, 0);
  const debris = new THREE.InstancedMesh(debrisGeo, debrisMat, debrisCount);
  const debrisTints = new Float32Array(debrisCount * 3);
  const debrisPalette = [
    new THREE.Color('#3a4356'),
    new THREE.Color('#5a4a36'),
    new THREE.Color('#252c3c'),
    new THREE.Color('#6a5a44'),
  ];
  const debrisData = [];
  for (let i = 0; i < debrisCount; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(20, 33);
    const y = rng.range(-7, 7);
    const s = rng.range(0.12, 0.72);
    debrisData.push({ a, r, y, s, spin: rng.range(-0.2, 0.2), phase: rng.range(0, 6.28) });
    dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r * 0.6);
    dummy.rotation.set(rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28));
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    debris.setMatrixAt(i, dummy.matrix);
    const c = rng.pick(debrisPalette);
    debrisTints[i * 3] = c.r;
    debrisTints[i * 3 + 1] = c.g;
    debrisTints[i * 3 + 2] = c.b;
  }
  debrisGeo.setAttribute('aTint', new THREE.InstancedBufferAttribute(debrisTints, 3));
  debris.instanceMatrix.needsUpdate = true;
  group.add(debris);

  // ---- animation -----------------------------------------------------------
  let irisOpen = 0;
  let portalIntensity = 0;
  let time = 0;

  function update(dt, t, state = {}) {
    time = t;
    group.rotation.z = t * 0.011;
    innerRing.rotation.z = -t * 0.045;
    innerRingHalo.rotation.z = -t * 0.045;
    outerRing.rotation.z = t * 0.026;
    outerRingHalo.rotation.z = t * 0.026;
    gyroGroup.rotation.z = t * 0.035;
    gyroGroup.rotation.y = Math.sin(t * 0.08) * 0.16;
    arcGroup.rotation.z = -t * 0.018;
    debris.rotation.y = t * 0.012;
    debris.rotation.x = Math.sin(t * 0.05) * 0.05;

    const targetOpen = state.irisOpen ?? 0;
    irisOpen += (targetOpen - irisOpen) * Math.min(1, dt * 2.4);
    for (let i = 0; i < blades.length; i++) {
      const b = blades[i];
      const stagger = Math.min(1, Math.max(0, irisOpen * 1.35 - (i / bladeCount) * 0.35));
      b.blade.position.x = 6.55 + stagger * 1.35;
      b.blade.scale.x = 1 - stagger * 0.9;
      b.blade.rotation.z = stagger * 0.16 * (i % 2 === 0 ? 1 : -1);
    }

    const targetIntensity = state.portalIntensity ?? 0;
    portalIntensity += (targetIntensity - portalIntensity) * Math.min(1, dt * 3.0);

    coreGroup.visible = irisOpen < 0.85;
    coreGroup.scale.setScalar(0.8 + portalIntensity * 0.9 + Math.sin(t * 2.1) * 0.04);
    coreMat.uniforms.uIntensity.value = 1.2 + portalIntensity * 2.4;
    coreBall.material.color.setRGB(3.0 + portalIntensity * 1.5, 2.1 + portalIntensity, 1.1 + portalIntensity * 0.6);

    const pulse = 0.72 + 0.28 * Math.sin(t * 1.35);
    warmGlowPulse(innerRingHalo, 0.08 + pulse * 0.07 + portalIntensity * 0.1);
    warmGlowPulse(outerRingHalo, 0.06 + (1 - pulse) * 0.06 + portalIntensity * 0.08);
    warmGlowPulse(haloA, 0.14 + pulse * 0.08);
    warmGlowPulse(haloB, 0.08 + (1 - pulse) * 0.06);
    arcMatWarm.opacity = 0.36 + pulse * 0.2;
    arcMatCool.opacity = 0.22 + (1 - pulse) * 0.14;
    spokeGlowMat.opacity = 0.6 + pulse * 0.3;
    bladeEdgeMat.opacity = 0.55 + portalIntensity * 0.4;

    for (const a of animated) {
      if (a.type === 'tip') {
        a.mat.uniforms.uIntensity.value = 0.85 + 0.35 * Math.sin(t * 1.7 + a.phase) + portalIntensity * 0.6;
      }
    }

    for (let i = 0; i < debrisData.length; i++) {
      const d = debrisData[i];
      const a = d.a + t * 0.018 * (0.5 + d.s);
      dummy.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 0.2 + d.phase) * 0.4, Math.sin(a) * d.r * 0.6);
      dummy.rotation.set(t * d.spin + d.phase, t * d.spin * 0.7, d.phase);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      debris.setMatrixAt(i, dummy.matrix);
    }
    debris.instanceMatrix.needsUpdate = true;
  }

  function warmGlowPulse(mat, value) {
    mat.material.opacity = value;
  }

  return {
    group,
    update,
    get irisOpen() { return irisOpen; },
    get portalIntensity() { return portalIntensity; },
  };
}
