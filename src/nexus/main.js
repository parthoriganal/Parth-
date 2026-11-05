/* Nexus Core — Immersive 3D data cosmos.
 * Three.js particle system with custom GLSL shaders, bloom post-processing,
 * mouse interaction field, and live data streamed from the Flask nexus API.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

/* ── config ── */
const N_PARTICLES = 6000;
const PARTICLE_SIZE = 0.45;
const API_BASE = "/api/nexus";
let mouse = new THREE.Vector2(0, 0);
let targetMouse = new THREE.Vector2(0, 0);
let time = 0;
let autoRotate = true;
let showCore = true;
let showGrid = false;
let colorMode = "spectrum"; // spectrum | thermal | neon
let particles = null;
let particlePositions = null;
let particleColors = null;
let particleSizes = null;
let particleAttributes = null;
let scene, camera, renderer, composer, controls, clock;
let coreMesh, ringMesh, starField;
let uniforms;
let apiMetrics = { particleCount: N_PARTICLES, clock: 0, energy: 0.5, coherence: 0.5 };

/* ── shaders ── */
const vertexShader = `
  attribute float aHue;
  attribute float aEnergy;
  attribute float aDensity;
  attribute float aAge;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;

  // simple 3D noise
  float hash(vec3 p){
    p = vec3(dot(p,vec3(127.1,311.7,74.7)),
             dot(p,vec3(269.5,183.3,246.1)),
             dot(p,vec3(113.5,271.9,124.6)));
    return fract(sin(p)*43758.5453);
  }
  float noise(vec3 p){
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float n = 0.0;
    n += mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                 mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                 mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
    return n;
  }

  void main(){
    vec3 pos = position;
    float t = uTime * 0.5;

    // warp space with noise + time
    float n = noise(pos * 1.8 + vec3(t, t*0.6, t*0.4));
    pos += normal * (n - 0.5) * 0.6 * aEnergy;

    // swirl around Y axis over time
    float swirl = t * 0.35 + aAge * 3.0;
    float s = sin(swirl), c = cos(swirl);
    float xz = pos.x;
    pos.x = pos.x * c - pos.z * s;
    pos.z = xz * s + pos.z * c;

    // pulse radial breathing
    float breath = 1.0 + 0.18 * sin(uTime * 2.0 + aAge * 5.0);
    pos *= breath;

    // mouse interaction field
    vec2 mouseN = uMouse * 2.0 - 1.0;
    vec3 mouseWorld = vec3(mouseN.x * 14.0, mouseN.y * -8.0, -6.0);
    float distToMouse = distance(pos, mouseWorld);
    float repel = 1.0 - smoothstep(0.0, 7.0, distToMouse);
    pos += normalize(pos - mouseWorld) * repel * 2.5 * (1.0 - aDensity);

    // color from hue attribute + time cycling
    float h = mod(aEnergy + uTime * 0.08 + aHue, 1.0);
    if(colorModeInt == 1.0){ // thermal
      h = aDensity;
    } else if(colorModeInt == 2.0){ // neon
      h = step(0.5, aEnergy) ? 0.65 : 0.85;
    }
    vColor = hsv2rgb(vec3(h, 0.75 + aEnergy * 0.25, 0.9 + aDensity * 0.1));
    vAlpha = aEnergy * 0.8 + 0.2;
    vSize = size * (0.7 + aEnergy * 0.6) * breath;

    gl_PointSize = vSize * uPixelRatio;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vAlpha *= 1.0 - min(1.0, -mvPosition.z * 0.03);
  }

  // hsv to rgb
  vec3 hsv2rgb(vec3 c){
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.z), mix(vec4(K.z), vec4(K.y), c.x), c.y + K.x);
    float k = p.x + K.w;
    return p.z + K.x * clamp(p.x - K.y, 0.0, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;

  void main(){
    vec2 uv = gl_PointCoord.xy - 0.5;
    float r = length(uv);
    if(r > 0.5) discard;
    // soft circular falloff with subtle ring
    float alpha = 1.0 - smoothstep(0.0, 0.5, r);
    alpha *= pow(1.0 - r*1.8, 3.0);
    alpha *= vAlpha;
    // add a bright core
    float core = exp(-r*r * 6.0);
    vec3 color = vColor * (0.5 + core * 1.5);
    gl_FragColor = vec4(color, alpha);
  }
`;

const colorCorrectionShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    void main(){
      vec4 tex = texture2D(tDiffuse, vUv);
      // slight vignette + color lift
      vec2 uv = vUv - 0.5;
      float vig = 1.0 - dot(uv, uv) * 0.4;
      tex.rgb *= vig;
      tex.rgb += vec3(0.02, 0.03, 0.06) * 0.3;
      // subtle chromatic drift
      float drift = sin(uTime * 0.5) * 0.005;
      tex.r = texture2D(tDiffuse, vUv + vec2(drift, 0.0)).r;
      tex.b = texture2D(tDiffuse, vUv - vec2(drift, 0.0)).b;
      gl_FragColor = tex;
    }
  `,
};

/* ── init ── */
function init(){
  const container = document.getElementById("nexus");

  // scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070a, 0.18);

  // camera
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 4, 22);

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.5;
  controls.minDistance = 6;
  controls.maxDistance = 45;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 1.2;

  // clock
  clock = new THREE.Clock();

  // ── starfield background ──
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(1500 * 3);
  for(let i=0;i<1500*3;i+=3){
    starPos[i] = (Math.random()-0.5) * 140;
    starPos[i+1] = (Math.random()-0.5) * 140;
    starPos[i+2] = (Math.random()-0.5) * 140 - 30;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0x8899aa, size: 0.08, transparent: true, opacity: 0.6, sizeAttenuation: true });
  starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  // ── particle cosmos (shader) ──
  particlePositions = new Float32Array(N_PARTICLES * 3);
  particleColors = new Float32Array(N_PARTICLES);
  particleSizes = new Float32Array(N_PARTICLES);
  particleAttributes = new Float32Array(N_PARTICLES * 4); // hue, energy, density, age

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  geo.setAttribute("aHue", new THREE.BufferAttribute(particleColors, 1));
  geo.setAttribute("aEnergy", new THREE.BufferAttribute(particleSizes, 1));
  geo.setAttribute("aDensity", new THREE.BufferAttribute(new Float32Array(N_PARTICLES), 1));
  geo.setAttribute("aAge", new THREE.BufferAttribute(new Float32Array(N_PARTICLES), 1));

  uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uPixelRatio: { value: renderer.getPixelRatio() },
    colorModeInt: { value: 0 },
    size: { value: PARTICLE_SIZE },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
  });
  particles = new THREE.Points(geo, mat);
  scene.add(particles);

  // ── core nucleus ──
  const coreGeo = new THREE.IcosahedronGeometry(1.6, 3);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x1a3a5c,
    emissiveIntensity: 2,
    roughness: 0.1,
    metalness: 0.6,
  });
  coreMesh = new THREE.Mesh(coreGeo, coreMat);
  scene.add(coreMesh);

  // core glow
  const glowGeo = new THREE.IcosahedronGeometry(1.9, 2);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
  });
  const coreGlow = new THREE.Mesh(glowGeo, glowMat);
  coreMesh.add(coreGlow);

  // ── orbiting rings ──
  const ringGeo = new THREE.RingGeometry(2.6, 3.0, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
  });
  ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI * 0.45;
  scene.add(ringMesh);

  const ring2Geo = new THREE.RingGeometry(4.2, 4.5, 64);
  const ring2Mat = new THREE.MeshBasicMaterial({
    color: 0x7c3aed,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
  });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.rotation.x = Math.PI * 0.25;
  ring2.rotation.z = Math.PI * 0.3;
  scene.add(ring2);

  // ── post-processing ──
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.0,  // strength
    0.4,  // radius
    0.85  // threshold
  );
  composer.addPass(bloomPass);

  const colorPass = new ShaderPass(colorCorrectionShader);
  composer.addPass(colorPass);

  // ── listeners ──
  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", (e)=>{
    targetMouse.x = (e.clientX / window.innerWidth);
    targetMouse.y = (e.clientY / window.innerHeight);
  });
  window.addEventListener("pointerdown", ()=>{ autoRotate = false; controls.autoRotate = false; });
}

/* ── update particle data from API ── */
async function fetchParticles(){
  try{
    const res = await fetch(`${API_BASE}/particles`);
    const data = await res.json();
    if(!data || !data.particles) return;

    const pts = data.particles;
    apiMetrics = data.metrics || apiMetrics;
    updateUIDom();

    // write into buffer attributes
    const posAttr = particles.geometry.attributes.position;
    const hueAttr = particles.geometry.attributes.aHue;
    const energyAttr = particles.geometry.attributes.aEnergy;
    const densityAttr = particles.geometry.attributes.aDensity;
    const ageAttr = particles.geometry.attributes.aAge;

    for(let i=0;i<pts.length;i++){
      const p = pts[i];
      posAttr.setXYZ(i, p.x, p.y, p.z);
      hueAttr.setX(i, p.hue);
      energyAttr.setX(i, p.energy);
      densityAttr.setX(i, p.density);
      ageAttr.setX(i, p.age);
    }
    posAttr.needsUpdate = true;
    hueAttr.needsUpdate = true;
    energyAttr.needsUpdate = true;
    densityAttr.needsUpdate = true;
    ageAttr.needsUpdate = true;

    // color mode from metrics
    if(data.metrics && data.metrics.coherence > 0.7){
      colorMode = "neon";
    } else if(apiMetrics.energy > 0.7){
      colorMode = "thermal";
    } else {
      colorMode = "spectrum";
    }
    const modeMap = { spectrum: 0, thermal: 1, neon: 2 };
    uniforms.colorModeInt.value = modeMap[colorMode];

  }catch(e){
    console.warn("nexus api fetch failed", e);
  }
}

function updateUIDom(){
  const el = (id, v)=>{ const e=document.getElementById(id); if(e) e.textContent = v; };
  el("metric-particles", apiMetrics.particleCount);
  el("metric-clock", apiMetrics.clock);
  el("metric-energy", (apiMetrics.energy*100).toFixed(0) + "%");
  el("metric-coherence", (apiMetrics.coherence*100).toFixed(0) + "%");
  // colorize metric values by energy
  const ev = document.getElementById("metric-energy");
  if(ev){
    ev.className = "val " + (apiMetrics.energy > 0.7 ? "ok" : apiMetrics.energy > 0.4 ? "warn" : "bad");
  }
  const cv = document.getElementById("metric-coherence");
  if(cv){
    cv.className = "val " + (apiMetrics.coherence > 0.7 ? "ok" : apiMetrics.coherence > 0.4 ? "warn" : "bad");
  }

  // events feed
  const feed = document.getElementById("eventFeed");
  if(feed && window.__nexusEvents){
    const newEvents = window.__nexusEvents.filter(e=> !feed.dataset.seenIds || !feed.dataset.seenIds.split(",").includes(e.id));
    if(newEvents.length){
      const html = newEvents.map(e=>`
        <div class="event"><span class="type">${e.type}</span><span class="t">${new Date(e.ts).toLocaleTimeString()}</span></div>
      `).join("");
      feed.insertAdjacentHTML("afterbegin", html);
      const seen = [...new Set((feed.dataset.seenIds?feed.dataset.seenIds.split(","):[]).concat(newEvents.map(e=>e.id)))].slice(0,40);
      feed.dataset.seenIds = seen.join(",");
    }
  }
}

async function fetchEvents(){
  try{
    const res = await fetch(`${API_BASE}/events`);
    const data = await res.json();
    window.__nexusEvents = data.events || [];
    updateUIDom();
  }catch(e){}
}

/* ── animation ── */
function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  uniforms.uPixelRatio.value = renderer.getPixelRatio();
}

function animate(){
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  time += delta;

  // smooth mouse
  mouse.lerp(targetMouse, 0.1);
  uniforms.uMouse.value.copy(mouse);
  uniforms.uTime.value = time;

  // core pulse
  const pulse = 1 + Math.sin(time * 3) * 0.08;
  coreMesh.scale.setScalar(pulse);
  coreMesh.rotation.y += 0.015;
  coreMesh.rotation.x += 0.01;

  // rings rotate
  if(ringMesh){ ringMesh.rotation.z += 0.008; }
  scene.children.forEach(c=>{
    if(c !== coreMesh && c !== particles && c !== starField && c.type === "Mesh" && c.geometry.type === "RingGeometry"){
      c.rotation.z += 0.005;
    }
  });

  // slow starfield drift
  if(starField){ starField.rotation.y += 0.0005; }

  controls.update();
  composer.render();

  // fetch data periodically
  if(Math.floor(time * 10) % 40 === 0){
    fetchParticles();
  }
}

/* ── UI controls ── */
function setupUI(){
  // mode toggle
  const modeBtn = document.getElementById("btnMode");
  if(modeBtn){
    modeBtn.onclick = ()=>{
      const order = ["spectrum","thermal","neon"];
      const idx = order.indexOf(colorMode);
      colorMode = order[(idx + 1) % order.length];
      uniforms.colorModeInt.value = { spectrum:0, thermal:1, neon:2 }[colorMode];
      toast(`Color mode: ${colorMode}`);
    };
  }

  // autorotate toggle
  const rotBtn = document.getElementById("btnRotate");
  if(rotBtn){
    rotBtn.onclick = ()=>{
      autoRotate = !autoRotate;
      controls.autoRotate = autoRotate;
      rotBtn.classList.toggle("active", autoRotate);
      toast(autoRotate ? "Auto-rotate ON" : "Auto-rotate OFF");
    };
  }

  // core toggle
  const coreBtn = document.getElementById("btnCore");
  if(coreBtn){
    coreBtn.onclick = ()=>{
      showCore = !showCore;
      coreMesh.visible = showCore;
      coreBtn.classList.toggle("active", showCore);
      toast(showCore ? "Core visible" : "Core hidden");
    };
  }

  // fetch now
  const fetchBtn = document.getElementById("btnFetch");
  if(fetchBtn){
    fetchBtn.onclick = ()=>{
      fetchParticles();
      fetchEvents();
      toast("Data refreshed");
    };
  }
}

function toast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2200);
}

/* ── boot ── */
document.addEventListener("DOMContentLoaded", ()=>{
  init();
  fetchParticles();
  fetchEvents();
  setInterval(fetchParticles, 3000);
  setInterval(fetchEvents, 4000);
  setupUI();
  animate();
});
