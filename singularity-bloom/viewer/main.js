/**
 * SINGULARITY BLOOM — real-time viewer
 *
 * Loads out/singularity_bloom.glb (exported straight from Blender by
 * build_scene.py) and lights it with a procedural studio environment so the
 * metal reads the same way it does in the Cycles still.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('stage');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04070c);
scene.fog = new THREE.FogExp2(0x04070c, 0.012);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 400);
const HOME = new THREE.Vector3(4.6, 3.4, 8.4);
camera.position.copy(HOME);

// studio environment for PBR reflections (no HDR files needed)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
scene.environmentIntensity = 0.35;

// ---------------------------------------------------------------- starfield
function makeStars(count = 1400, inner = 26, outer = 95) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = inner + Math.random() * (outer - inner);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) * 0.75;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    c.setHSL(0.52 + Math.random() * 0.16, 0.55, 0.5 + Math.random() * 0.45);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.34,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}
const stars = makeStars();
scene.add(stars);

// ---------------------------------------------------------------- lights
const key = new THREE.DirectionalLight(0xffe6c4, 2.4);
key.position.set(-6, 7, 6);
scene.add(key);

const rim = new THREE.PointLight(0xa06bff, 90, 40, 2);
rim.position.set(4, 3, -6);
scene.add(rim);

const under = new THREE.PointLight(0x35e6ff, 55, 26, 2);
under.position.set(0, -3.2, 2.5);
scene.add(under);

scene.add(new THREE.AmbientLight(0x22384d, 0.9));

// ---------------------------------------------------------------- controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 4;
controls.maxDistance = 26;
controls.target.set(0, 0.4, 0);
controls.autoRotate = false;
controls.zoomSpeed = 0.8;
controls.rotateSpeed = 0.75;

// ---------------------------------------------------------------- post FX
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.85, // strength
  0.55, // radius
  0.52 // threshold
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- model
const hud = {
  meshes: document.getElementById('s-meshes'),
  tris: document.getElementById('s-tris'),
  mats: document.getElementById('s-mats'),
  size: document.getElementById('s-size'),
};
const loaderEl = document.getElementById('loader');
const barEl = document.getElementById('bar');
const pctEl = document.getElementById('pct');

let model = null;
let baseY = 0;
let spin = true;
let bloomOn = true;
let wire = false;
const clock = new THREE.Clock();

const gltfLoader = new GLTFLoader();
gltfLoader.load(
  './model.glb',
  (gltf) => {
    model = gltf.scene;

    // centre + normalise so any export lands framed
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    model.position.sub(centre);
    baseY = model.position.y;

    let meshes = 0;
    let tris = 0;
    const mats = new Set();
    model.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      const g = o.geometry;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      const m = o.material;
      (Array.isArray(m) ? m : [m]).forEach((mm) => {
        mats.add(mm.uuid);
        mm.envMapIntensity = 0.9;
        // keep emissive parts hot enough for the bloom, but don't let the
        // 26x Cycles emission strength blow out the WebGL frame
        if (mm.emissive && mm.emissiveIntensity !== undefined) {
          mm.emissiveIntensity = THREE.MathUtils.clamp(mm.emissiveIntensity, 0.8, 3.2);
        }
      });
    });

    scene.add(model);

    // frame the sculpture
    const radius = Math.max(size.x, size.y, size.z) * 0.5;
    controls.target.set(0, 0, 0);
    camera.position.copy(HOME).multiplyScalar(radius / 3.4);
    camera.near = radius * 0.05;
    camera.far = radius * 40;
    camera.updateProjectionMatrix();
    controls.minDistance = radius * 0.9;
    controls.maxDistance = radius * 5.5;

    hud.meshes.textContent = meshes.toLocaleString();
    hud.tris.textContent = Math.round(tris).toLocaleString();
    hud.mats.textContent = mats.size;

    loaderEl.classList.add('is-done');
    document.body.classList.add('is-ready');
  },
  (evt) => {
    if (!evt.total) return;
    const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
    barEl.style.width = pct + '%';
    pctEl.textContent = pct + '%';
  },
  (err) => {
    console.error(err);
    pctEl.textContent = 'model not found — run ./render.sh first';
    barEl.style.background = '#ff5d6c';
  }
);

// ---------------------------------------------------------------- UI
function wireAll(on) {
  if (!model) return;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    list.forEach((m) => { m.wireframe = on; });
  });
}

function toggle(btn, state) {
  btn.classList.toggle('chip--on', state);
  btn.setAttribute('aria-pressed', String(state));
}

const btnSpin = document.getElementById('btn-spin');
const btnBloom = document.getElementById('btn-bloom');
const btnWire = document.getElementById('btn-wire');
const btnReset = document.getElementById('btn-reset');

btnSpin.addEventListener('click', () => {
  spin = !spin;
  toggle(btnSpin, spin);
});

btnBloom.addEventListener('click', () => {
  bloomOn = !bloomOn;
  bloom.enabled = bloomOn;
  toggle(btnBloom, bloomOn);
});

btnWire.addEventListener('click', () => {
  wire = !wire;
  wireAll(wire);
  toggle(btnWire, wire);
});

btnReset.addEventListener('click', () => {
  if (!model) return;
  const box = new THREE.Box3().setFromObject(model);
  const radius = Math.max(...box.getSize(new THREE.Vector3()).toArray()) * 0.5;
  camera.position.copy(HOME).multiplyScalar(radius / 3.4);
  controls.target.set(0, 0, 0);
  controls.update();
});

// ---------------------------------------------------------------- loop
let t = 0;
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;

  if (model) {
    if (spin) model.rotation.y += dt * 0.22;
    model.position.y = baseY + Math.sin(t * 0.8) * 0.045;
  }
  stars.rotation.y += dt * 0.008;

  // breathing bloom
  bloom.strength = (bloomOn ? 0.85 : 0) + Math.sin(t * 1.4) * 0.09;

  rim.intensity = 90 + Math.sin(t * 1.9) * 14;
  under.intensity = 55 + Math.sin(t * 2.6 + 1.2) * 9;
  key.intensity = 2.4 + Math.sin(t * 0.7) * 0.18;

  controls.update();
  composer.render();
  requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
});
