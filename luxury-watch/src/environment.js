/**
 * environment.js — the photo studio.
 *
 * A dark cyclorama, a procedural HDRI that gives the gold something to
 * reflect, three shaped lights and a shadow pool far below the piece.
 */

import * as THREE from 'three';
import { createStudioEnvironment, createBackdropTexture, createLightPoolTexture } from './textures.js';

const MOODS = {
  studio: {
    key: 3.1,
    rim: 2.0,
    fill: 0.7,
    exposure: 1.12,
    keyColor: 0xfff2df,
    rimColor: 0xbdd4ff,
    fillColor: 0xffd9b4,
  },
  soft: {
    key: 2.1,
    rim: 1.4,
    fill: 1.0,
    exposure: 1.16,
    keyColor: 0xfff6ea,
    rimColor: 0xd7e4ff,
    fillColor: 0xffe4c6,
  },
  dramatic: {
    key: 3.8,
    rim: 2.6,
    fill: 0.2,
    exposure: 1.02,
    keyColor: 0xffe9cf,
    rimColor: 0x9fc0ff,
    fillColor: 0xffcf9e,
  },
};

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });

  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const dprCap = coarse ? 1.75 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

export function buildStudio(renderer) {
  const scene = new THREE.Scene();
  scene.background = createBackdropTexture();
  scene.backgroundIntensity = 1;

  let envMap = createStudioEnvironment(renderer, 'studio');
  scene.environment = envMap;
  scene.environmentIntensity = 1.12;

  const camera = new THREE.PerspectiveCamera(30, 1, 5, 1400);
  camera.position.set(48, 42, 132);

  /* ---- lights ---- */
  const key = new THREE.DirectionalLight(0xfff2df, 2.6);
  key.position.set(44, 66, 62);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 20;
  key.shadow.camera.far = 260;
  key.shadow.camera.left = -52;
  key.shadow.camera.right = 52;
  key.shadow.camera.top = 52;
  key.shadow.camera.bottom = -52;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.06;
  key.shadow.radius = 3.5;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xbdd4ff, 1.7);
  rim.position.set(-58, 24, -74);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffd9b4, 0.55);
  fill.position.set(-44, -52, 58);
  scene.add(fill);

  const halo = new THREE.PointLight(0xffcf9a, 260, 260, 2);
  halo.position.set(0, -8, -46);
  scene.add(halo);

  /* ---- floor + light pool ---- */
  const floorGroup = new THREE.Group();
  floorGroup.position.y = -40;
  scene.add(floorGroup);

  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(230, 230),
    new THREE.MeshBasicMaterial({
      map: createLightPoolTexture(),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -0.6;
  floorGroup.add(pool);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(180, 96),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.5, transparent: true }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floorGroup.add(floor);

  function setMood(name) {
    const mood = MOODS[name] || MOODS.studio;
    const nextEnv = createStudioEnvironment(renderer, name);
    scene.environment = nextEnv;
    if (envMap) envMap.dispose();
    envMap = nextEnv;

    key.intensity = mood.key;
    key.color.setHex(mood.keyColor);
    rim.intensity = mood.rim;
    rim.color.setHex(mood.rimColor);
    fill.intensity = mood.fill;
    fill.color.setHex(mood.fillColor);
    renderer.toneMappingExposure = mood.exposure;
  }

  function resize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  return { scene, camera, key, rim, fill, setMood, resize, floorGroup };
}
