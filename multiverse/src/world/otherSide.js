// AETHERBOUND — the other side.
// A shattered archipelago hanging in a magenta sky: an inverted city, a ringed
// giant, aurora curtains and a luminous sea of cloud. Built to be seen through
// the rift, then lived in.

import { NOISE } from '../core/glsl.js';
import { makeRng } from '../core/math.js';

const PLANET_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const PLANET_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform vec3 uLightDir;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;

  ${NOISE}

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float ndl = dot(N, L) * 0.5 + 0.5;

    float swirl = fbm3(vWorldPos * 0.075 + vec3(uTime * 0.006, 0.0, uTime * 0.004));
    float bands = sin(vWorldPos.y * 0.62 + swirl * 5.0 + vWorldPos.x * 0.04);
    float fine = sin(vWorldPos.y * 2.1 + swirl * 9.0);

    vec3 col = mix(uColorA, uColorB, smoothstep(-0.55, 0.85, bands));
    col = mix(col, uColorC, smoothstep(0.52, 0.95, swirl) * 0.55);
    col *= 0.92 + 0.08 * fine;

    float light = smoothstep(0.18, 0.82, ndl);
    col *= 0.16 + light * 1.05;

    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col += uColorC * rim * 0.55;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const RING_VERT = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAG = /* glsl */ `
  precision highp float;
  uniform float uInner;
  uniform float uOuter;
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec3 vLocal;

  ${NOISE}

  void main() {
    float r = length(vLocal.xy);
    float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
    float n = fbm2(vec2(t * 9.0, 2.3));
    float bands = sin(t * 92.0 + n * 7.0) * 0.5 + 0.5;
    float gaps = smoothstep(0.18, 0.55, abs(sin(t * 21.0 + 1.4)));
    float edge = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.93, t);
    float a = edge * (0.28 + 0.72 * bands) * gaps * uOpacity;
    vec3 col = mix(uColorA, uColorB, smoothstep(0.1, 0.9, t));
    col *= 0.85 + 0.3 * n;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  }
`;

const CLOUD_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const CLOUD_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec3 vWorldPos;

  ${NOISE}

  void main() {
    vec2 p = vWorldPos.xz * 0.018 + vec2(uTime * 0.004, uTime * 0.0025);
    float n1 = fbm2(p * 2.1);
    float n2 = fbm2(p * 4.3 + 3.7);
    float cloud = smoothstep(0.32, 0.82, n1 * 0.7 + n2 * 0.42);
    float a = cloud * uOpacity;
    if (a < 0.004) discard;
    vec3 col = mix(uColorA, uColorB, smoothstep(0.25, 0.85, n2));
    col += uColorB * pow(cloud, 3.0) * 0.35;
    gl_FragColor = vec4(col, a);
  }
`;

const AURORA_VERT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.y += sin(uv.x * 6.0 + uTime * 0.12) * 2.6;
    p.z += cos(uv.x * 4.0 + uTime * 0.09) * 2.2;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const AURORA_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;

  ${NOISE}

  void main() {
    float curtain = fbm2(vec2(vUv.x * 4.2 + uTime * 0.018, vUv.y * 1.4 - uTime * 0.01));
    float bands = smoothstep(0.32, 0.82, curtain);
    float vert = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.52, vUv.y);
    float a = bands * vert * uOpacity;
    if (a < 0.004) discard;
    vec3 col = mix(uColorA, uColorB, smoothstep(0.1, 0.9, vUv.y + curtain * 0.2));
    gl_FragColor = vec4(col, a);
  }
`;

export function createOtherSide(THREE, lib) {
  const group = new THREE.Group();
  group.name = 'other-side';

  const rng = makeRng(0x2b9e71c);
  const animated = [];
  const bobbing = [];

  // ---- materials -----------------------------------------------------------
  const rockMat = lib.cel({
    color: '#2a2f42',
    shadow: '#070510',
    rim: '#ff7fc4',
    rimStrength: 0.72,
    spec: 0.3,
    paint: 1.2,
    fogDensity: 0.0042,
  });
  const rockMatWarm = lib.cel({
    color: '#3a2f42',
    shadow: '#0a0610',
    rim: '#7fe7ff',
    rimStrength: 0.66,
    spec: 0.32,
    paint: 1.15,
    fogDensity: 0.0042,
  });
  const mossMat = lib.cel({
    color: '#2f5a58',
    shadow: '#050a0e',
    rim: '#9ffff0',
    rimStrength: 0.6,
    spec: 0.4,
    emissive: '#1a6a62',
    emissiveStrength: 0.08,
    paint: 1.0,
    fogDensity: 0.0042,
  });
  const towerMat = lib.cel({
    color: '#333a52',
    shadow: '#06060f',
    rim: '#ffb0d8',
    rimStrength: 0.55,
    spec: 0.4,
    paint: 0.8,
    fogDensity: 0.0042,
  });
  const monolithMat = lib.cel({
    color: '#262b3e',
    shadow: '#05050c',
    rim: '#7fe7ff',
    rimStrength: 0.7,
    spec: 0.35,
    paint: 0.9,
    fogDensity: 0.0042,
  });

  const crystalMat = (hex, intensity = 1.4) => new THREE.MeshBasicMaterial({
    color: new THREE.Color(hex).multiplyScalar(intensity),
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const outline = lib.outline({ thickness: 0.05, color: '#05030a', opacity: 0.9 });

  // ---- island factory ------------------------------------------------------
  function makeIsland({ x, y, z, radius, height, seed, hero = false, warm = false }) {
    const island = new THREE.Group();
    island.position.set(x, y, z);

    const rockGeo = new THREE.ConeGeometry(radius, height, 9, 4);
    rockGeo.rotateZ(Math.PI);
    rockGeo.translate(0, -height / 2, 0);
    const pos = rockGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      const n = Math.sin(px * 1.7 + seed) * Math.cos(pz * 1.9 - seed) * 0.5
        + Math.sin(py * 2.3 + seed * 2.0) * 0.5;
      const scale = 1 + n * 0.16;
      pos.setXYZ(i, px * scale, py + n * 0.22, pz * scale);
    }
    rockGeo.computeVertexNormals();
    const rock = new THREE.Mesh(rockGeo, warm ? rockMatWarm : rockMat);
    const rockOutline = new THREE.Mesh(rockGeo, outline);
    rockOutline.renderOrder = -1;
    rock.add(rockOutline);
    island.add(rock);

    const topGeo = new THREE.CircleGeometry(radius * 0.94, 26);
    topGeo.rotateX(-Math.PI / 2);
    const top = new THREE.Mesh(topGeo, mossMat);
    top.position.y = 0.03;
    island.add(top);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.94, 0.055, 4, 40),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.5, 1.8, 1.6),
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.05;
    island.add(rim);

    // crystals
    const crystalCount = hero ? 9 : 5;
    for (let i = 0; i < crystalCount; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(radius * 0.2, radius * 0.8);
      const h = rng.range(0.5, 1.9) * (hero ? 1.3 : 1);
      const geo = new THREE.OctahedronGeometry(rng.range(0.16, 0.34), 0);
      const mesh = new THREE.Mesh(geo, crystalMat(rng.chance(0.55) ? '#ff7fc4' : '#7fe7ff', rng.range(1.0, 2.0)));
      mesh.position.set(Math.cos(a) * r, h * 0.55, Math.sin(a) * r);
      mesh.scale.set(1, h * 2.2, 1);
      mesh.rotation.y = rng.range(0, 3.14);
      island.add(mesh);
    }

    // ruins / towers on top
    const towerCount = hero ? 4 : 2;
    for (let i = 0; i < towerCount; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(radius * 0.15, radius * 0.62);
      const h = rng.range(1.2, hero ? 4.2 : 2.6);
      const w = rng.range(0.35, 0.8);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), towerMat);
      tower.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      tower.rotation.y = rng.range(0, 3.14);
      island.add(tower);
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.18, h * 0.7, 0.03),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(1.8, 1.1, 0.5),
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      strip.position.set(tower.position.x, h * 0.5, tower.position.z + w * 0.52);
      island.add(strip);
    }

    // a hero spire
    if (hero) {
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.55, 6.2, 6), towerMat);
      spire.position.set(radius * 0.18, 3.1, -radius * 0.1);
      island.add(spire);
      const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), crystalMat('#ffd08a', 2.2));
      tip.position.set(radius * 0.18, 6.4, -radius * 0.1);
      island.add(tip);
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 5),
        lib.glow({ color: '#ffb45e', intensity: 0.8, power: 2.4, flicker: 0.1 })
      );
      glow.position.set(radius * 0.18, 6.4, -radius * 0.1);
      island.add(glow);
    }

    // inverted city under the hero island
    if (hero) {
      const city = new THREE.Group();
      const towerCount2 = 11;
      for (let i = 0; i < towerCount2; i++) {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(0.5, radius * 0.72);
        const h = rng.range(2.2, 7.5);
        const w = rng.range(0.22, 0.55);
        const t = new THREE.Mesh(new THREE.CylinderGeometry(w, w * 0.45, h, 5), towerMat);
        t.position.set(Math.cos(a) * r, -h / 2 - 0.4, Math.sin(a) * r);
        city.add(t);
        const cap = new THREE.Mesh(new THREE.OctahedronGeometry(w * 0.7, 0), crystalMat('#7fe7ff', 1.6));
        cap.position.set(t.position.x, -h - 0.4, t.position.z);
        city.add(cap);
      }
      island.add(city);
      animated.push({ type: 'city', group: city, phase: 0.4 });
    }

    // a few orbiting shards
    const shardCount = hero ? 8 : 4;
    for (let i = 0; i < shardCount; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = radius * rng.range(1.15, 1.7);
      const s = rng.range(0.12, 0.42);
      const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
      shard.position.set(Math.cos(a) * r, rng.range(-2.5, 1.5), Math.sin(a) * r);
      shard.rotation.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
      island.add(shard);
      animated.push({ type: 'shard', mesh: shard, radius: r, angle: a, speed: rng.range(0.02, 0.06), y: shard.position.y, phase: rng.range(0, 6.28) });
    }

    group.add(island);
    bobbing.push({ group: island, baseY: y, phase: rng.range(0, 6.28), amp: rng.range(0.15, 0.4) });
    return { island, top: new THREE.Vector3(x, y + 0.1, z) };
  }

  const hero = makeIsland({ x: -12, y: -3, z: -48, radius: 7.2, height: 10, seed: 1.7, hero: true });
  makeIsland({ x: 14, y: 2, z: -58, radius: 5.4, height: 7.5, seed: 4.2, warm: true });
  makeIsland({ x: -27, y: 7, z: -70, radius: 8.8, height: 12, seed: 8.1 });
  makeIsland({ x: 2, y: -11, z: -78, radius: 6.2, height: 8.5, seed: 2.9, warm: true });
  makeIsland({ x: 29, y: -4, z: -88, radius: 4.4, height: 6, seed: 6.3 });
  makeIsland({ x: -9, y: 17, z: -96, radius: 5.0, height: 7, seed: 3.3 });
  makeIsland({ x: 19, y: 13, z: -106, radius: 3.4, height: 5, seed: 9.7, warm: true });
  // a small island visible through the rift from the engine side
  makeIsland({ x: -4.5, y: -7, z: -27, radius: 3.4, height: 5.5, seed: 5.5, warm: true });

  // ---- giant ringed planet -------------------------------------------------
  const planetGroup = new THREE.Group();
  planetGroup.position.set(-48, 32, -122);
  planetGroup.rotation.set(0.18, 0.2, -0.32);
  const planetUniforms = {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color('#1b3a4a') },
    uColorB: { value: new THREE.Color('#7a3a62') },
    uColorC: { value: new THREE.Color('#ffd0a0') },
    uLightDir: { value: new THREE.Vector3(-0.4, 0.6, 0.7).normalize() },
  };
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(20, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: planetUniforms,
      vertexShader: PLANET_VERT,
      fragmentShader: PLANET_FRAG,
    })
  );
  planetGroup.add(planet);

  const ringUniforms = {
    uInner: { value: 24 },
    uOuter: { value: 35 },
    uOpacity: { value: 0.8 },
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color('#c9a878') },
    uColorB: { value: new THREE.Color('#7fe7ff') },
  };
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(24, 35, 128, 1),
    new THREE.ShaderMaterial({
      uniforms: ringUniforms,
      vertexShader: RING_VERT,
      fragmentShader: RING_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = Math.PI / 2.25;
  ring.rotation.y = 0.1;
  planetGroup.add(ring);
  group.add(planetGroup);
  animated.push({ type: 'planet', uniforms: planetUniforms, ringUniforms });

  // a small moon
  const moon = new THREE.Mesh(
    new THREE.IcosahedronGeometry(4.2, 2),
    lib.cel({ color: '#6a6a7a', shadow: '#0a0a12', rim: '#ffd0a0', rimStrength: 0.7, spec: 0.2, paint: 1.4, fogDensity: 0.0035 })
  );
  moon.position.set(38, 25, -104);
  group.add(moon);
  animated.push({ type: 'moon', mesh: moon, base: moon.position.clone(), phase: 1.2 });

  // ---- cloud sea -----------------------------------------------------------
  const cloudUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0.4 },
    uColorA: { value: new THREE.Color('#3a1230') },
    uColorB: { value: new THREE.Color('#1a5a62') },
  };
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: cloudUniforms,
    vertexShader: CLOUD_VERT,
    fragmentShader: CLOUD_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const cloudGeo = new THREE.PlaneGeometry(420, 420, 1, 1);
  cloudGeo.rotateX(-Math.PI / 2);
  const clouds = new THREE.Mesh(cloudGeo, cloudMat);
  clouds.position.set(0, -23, -80);
  group.add(clouds);
  animated.push({ type: 'clouds', uniforms: cloudUniforms });

  // ---- aurora curtains -----------------------------------------------------
  const auroraMats = [];
  const auroraDefs = [
    { p: [-30, 34, -150], s: [280, 54], r: 0.1, o: 0.3, a: '#1a6a7a', b: '#a02a6a' },
    { p: [40, 26, -165], s: [240, 44], r: -0.16, o: 0.22, a: '#2a3a8a', b: '#7fe7ff' },
    { p: [-4, 44, -180], s: [320, 60], r: 0.04, o: 0.18, a: '#6a1a5a', b: '#2a8a8a' },
  ];
  for (const def of auroraDefs) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: def.o },
        uColorA: { value: new THREE.Color(def.a) },
        uColorB: { value: new THREE.Color(def.b) },
      },
      vertexShader: AURORA_VERT,
      fragmentShader: AURORA_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.s[0], def.s[1], 40, 1), mat);
    mesh.position.set(def.p[0], def.p[1], def.p[2]);
    mesh.rotation.z = def.r;
    group.add(mesh);
    auroraMats.push(mat);
  }

  // ---- echo of the rift ----------------------------------------------------
  const echoGroup = new THREE.Group();
  echoGroup.position.set(-24, 42, -168);
  echoGroup.rotation.z = 0.2;
  const echoMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.2, 0.4, 1.4),
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const echoRing = new THREE.Mesh(new THREE.TorusGeometry(26, 0.12, 6, 160), echoMat);
  echoGroup.add(echoRing);
  const echoGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    lib.glow({ color: '#a03a8a', intensity: 0.35, power: 2.8, flicker: 0.04 })
  );
  echoGlow.position.z = -1;
  echoGroup.add(echoGlow);
  group.add(echoGroup);
  animated.push({ type: 'echo', group: echoGroup, mat: echoMat });

  // ---- floating monoliths --------------------------------------------------
  const monoliths = [];
  const monolithDefs = [
    [-20, 4, -40, 0.3],
    [22, 8, -50, -0.5],
    [-34, 12, -62, 0.8],
    [8, 18, -88, 0.2],
    [34, 2, -76, -0.3],
  ];
  for (let i = 0; i < monolithDefs.length; i++) {
    const [x, y, z, rot] = monolithDefs[i];
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.z = rot;
    const mono = new THREE.Mesh(new THREE.BoxGeometry(1.7, 7.5, 0.9), monolithMat);
    g.add(mono);
    const rune = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 5.2, 0.04),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.6, 1.8, 2.2),
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    rune.position.z = 0.48;
    g.add(rune);
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), crystalMat('#7fe7ff', 1.8));
    cap.position.y = 4.0;
    g.add(cap);
    group.add(g);
    monoliths.push({ group: g, baseY: y, phase: i * 1.3, speed: 0.1 + i * 0.02 });
  }

  // ---- drifting embers -----------------------------------------------------
  const dustCount = 700;
  const dPos = new Float32Array(dustCount * 3);
  const dSize = new Float32Array(dustCount);
  const dPhase = new Float32Array(dustCount);
  const dCol = new Float32Array(dustCount * 3);
  const dustPalette = [new THREE.Color('#ff9fd0'), new THREE.Color('#7fe7ff'), new THREE.Color('#ffd0a0')];
  for (let i = 0; i < dustCount; i++) {
    dPos[i * 3] = rng.range(-55, 55);
    dPos[i * 3 + 1] = rng.range(-18, 30);
    dPos[i * 3 + 2] = rng.range(-115, -25);
    dSize[i] = rng.range(0.5, 1.8);
    dPhase[i] = rng.range(0, 6.28);
    const c = rng.pick(dustPalette);
    dCol[i * 3] = c.r;
    dCol[i * 3 + 1] = c.g;
    dCol[i * 3 + 2] = c.b;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1));
  dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(dPhase, 1));
  dustGeo.setAttribute('aColor', new THREE.BufferAttribute(dCol, 3));
  const dustMat = lib.stars({ opacity: 0.8 });
  const dust = new THREE.Points(dustGeo, dustMat);
  group.add(dust);

  // ---- animation -----------------------------------------------------------
  function update(dt, t) {
    for (const b of bobbing) {
      b.group.position.y = b.baseY + Math.sin(t * 0.24 + b.phase) * b.amp;
    }
    for (const a of animated) {
      if (a.type === 'shard') {
        const ang = a.angle + t * a.speed;
        a.mesh.position.x = Math.cos(ang) * a.radius;
        a.mesh.position.z = Math.sin(ang) * a.radius;
        a.mesh.position.y = a.y + Math.sin(t * 0.3 + a.phase) * 0.3;
        a.mesh.rotation.y += dt * 0.12;
        a.mesh.rotation.x += dt * 0.06;
      } else if (a.type === 'planet') {
        a.uniforms.uTime.value = t;
        a.ringUniforms.uTime.value = t;
        planetGroup.rotation.y = 0.2 + t * 0.004;
      } else if (a.type === 'moon') {
        a.mesh.position.y = a.base.y + Math.sin(t * 0.2 + a.phase) * 0.5;
        a.mesh.rotation.y = t * 0.02;
      } else if (a.type === 'clouds') {
        a.uniforms.uTime.value = t;
      } else if (a.type === 'echo') {
        a.group.rotation.z = 0.2 + t * 0.008;
        a.mat.opacity = 0.16 + 0.08 * Math.sin(t * 0.5);
      } else if (a.type === 'city') {
        a.group.rotation.y = Math.sin(t * 0.1 + a.phase) * 0.03;
      }
    }
    for (let i = 0; i < auroraMats.length; i++) {
      auroraMats[i].uniforms.uTime.value = t + i * 3.0;
    }
    for (const m of monoliths) {
      m.group.position.y = m.baseY + Math.sin(t * m.speed + m.phase) * 0.5;
      m.group.rotation.y = Math.sin(t * 0.08 + m.phase) * 0.15;
    }
    dust.rotation.y = t * 0.004;
    cloudUniforms.uOpacity.value = 0.34 + 0.06 * Math.sin(t * 0.2);
  }

  return {
    group,
    update,
    heroTop: hero.top,
    planetUniforms,
  };
}
