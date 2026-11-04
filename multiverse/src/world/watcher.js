// AETHERBOUND — the watcher.
// A small, hand-built silhouette. It exists to give the scale a human measure.

export function createWatcher(THREE, lib, opts = {}) {
  const group = new THREE.Group();
  group.name = 'watcher';

  const scale = opts.scale ?? 1;
  group.scale.setScalar(scale);

  const cloakMat = lib.cel({
    color: '#0b0e18',
    shadow: '#020306',
    rim: '#ffbe78',
    rimStrength: 1.25,
    spec: 0.08,
    paint: 0.5,
    transparent: true,
    opacity: 1,
    fogDensity: 0.0035,
  });
  const rockMat = lib.cel({
    color: '#141824',
    shadow: '#030409',
    rim: '#8fe9ff',
    rimStrength: 0.7,
    spec: 0.2,
    paint: 1.2,
    transparent: true,
    opacity: 1,
    fogDensity: 0.0035,
  });
  const outlineMat = lib.outline({ thickness: 0.018, color: '#020306', opacity: 0.85 });

  // rock
  const rockGeo = new THREE.DodecahedronGeometry(1.7, 0);
  rockGeo.scale(1.35, 0.5, 1.15);
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.position.y = -0.55;
  group.add(rock);
  const rockOutline = new THREE.Mesh(rockGeo, outlineMat);
  rockOutline.renderOrder = -1;
  rock.add(rockOutline);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + i * 0.04, 0), rockMat);
    shard.position.set(Math.cos(a) * 2.1, -0.9 + i * 0.12, Math.sin(a) * 1.8);
    shard.rotation.set(i, i * 2, i * 0.5);
    group.add(shard);
  }

  // figure
  const figure = new THREE.Group();
  figure.position.y = 0.05;

  const cloakGeo = new THREE.ConeGeometry(0.42, 1.25, 9, 3, true);
  const cloak = new THREE.Mesh(cloakGeo, cloakMat);
  cloak.position.y = 0.62;
  figure.add(cloak);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.62, 8), cloakMat);
  torso.position.y = 0.92;
  figure.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 9), cloakMat);
  head.position.y = 1.36;
  figure.add(head);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.36, 9), cloakMat);
  hood.position.y = 1.46;
  figure.add(hood);

  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 1.75, 5), cloakMat);
  staff.position.set(0.34, 0.9, 0.05);
  staff.rotation.z = -0.08;
  figure.add(staff);

  const lanternMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(3.0, 1.9, 0.9),
    toneMapped: false,
  });
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), lanternMat);
  lantern.position.set(0.4, 1.72, 0.05);
  figure.add(lantern);

  const lanternGlowMat = lib.glow({ color: '#ffc27a', intensity: 1.1, power: 2.2, flicker: 0.22 });
  const lanternGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), lanternGlowMat);
  lanternGlow.position.set(0.4, 1.72, 0.06);
  figure.add(lanternGlow);

  const rim = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), lib.glow({
    color: '#ff9d5e',
    intensity: 0.22,
    power: 2.8,
    flicker: 0.05,
  }));
  rim.position.set(0, 0.9, -0.4);
  figure.add(rim);

  group.add(figure);

  let fade = 1;
  function update(dt, t) {
    cloak.rotation.z = Math.sin(t * 0.6) * 0.018;
    cloak.rotation.x = Math.sin(t * 0.45 + 1.2) * 0.012;
    lantern.position.y = 1.72 + Math.sin(t * 1.2) * 0.025;
    lanternGlow.position.y = lantern.position.y;
    lanternGlowMat.uniforms.uIntensity.value = 0.9 + 0.25 * Math.sin(t * 2.1) + 0.1 * Math.sin(t * 5.3);
    lanternMat.color.setRGB(2.8 + 0.3 * Math.sin(t * 2.1), 1.8, 0.85);
    if (fade < 1) {
      cloakMat.uniforms.uOpacity.value = fade;
      rockMat.uniforms.uOpacity.value = fade;
      cloakMat.transparent = true;
      rockMat.transparent = true;
      lanternGlowMat.uniforms.uIntensity.value *= fade;
    }
  }

  function setFade(v) {
    fade = v;
    cloakMat.uniforms.uOpacity.value = v;
    rockMat.uniforms.uOpacity.value = v;
    cloakMat.transparent = v < 0.999;
    rockMat.transparent = v < 0.999;
    cloakMat.depthWrite = v > 0.5;
    rockMat.depthWrite = v > 0.5;
    lanternGlowMat.uniforms.uIntensity.value = v;
  }

  return { group, update, setFade };
}
