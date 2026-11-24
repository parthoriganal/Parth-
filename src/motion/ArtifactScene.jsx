import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  AmbientLight,
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Scene,
  TorusGeometry,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { signals } from './signals.js';

const bookTitles = ['A QUIET KIND OF MURDER', 'FIELD NOTES FOR ELSEWHERE', 'THE BONE ORCHARD'];
const bookColors = ['#33211f', '#20352f', '#28223a'];
const gold = '#e8c29b';

function makeCoverTexture(signal, index, anisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  const base = bookColors[index];
  const tint = signal.tint;
  const wash = ctx.createLinearGradient(0, 0, 512, 720);
  wash.addColorStop(0, base);
  wash.addColorStop(0.58, base);
  wash.addColorStop(1, '#11131a');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 512, 720);

  const light = ctx.createRadialGradient(256, 312, 8, 256, 312, 255);
  light.addColorStop(0, `${tint}48`);
  light.addColorStop(1, `${tint}00`);
  ctx.fillStyle = light;
  ctx.fillRect(0, 80, 512, 480);

  ctx.strokeStyle = `${gold}b8`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(29, 28, 454, 664);
  ctx.strokeStyle = `${gold}55`;
  ctx.lineWidth = 1;
  ctx.strokeRect(39, 38, 434, 644);

  ctx.textAlign = 'center';
  ctx.fillStyle = gold;
  ctx.font = '500 17px "JetBrains Mono", monospace';
  ctx.letterSpacing = '3px';
  ctx.fillText(`ORBITAL   /   FIELD NOTE 0${index + 1}`, 256, 88);

  ctx.save();
  ctx.translate(256, 286);
  ctx.rotate(-0.28 + index * 0.19);
  ctx.strokeStyle = `${tint}db`;
  ctx.lineWidth = 1.4;
  for (let ring = 0; ring < 6; ring++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 40 + ring * 15, 90 + ring * 11, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fillStyle = tint;
  ctx.globalAlpha = 0.76;
  ctx.fill();
  ctx.restore();

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f5efe4';
  ctx.font = 'italic 38px Georgia, serif';
  const words = bookTitles[index].split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > 402 && line) {
      lines.push(line);
      line = word;
    } else line = next;
  });
  if (line) lines.push(line);
  const titleY = 456 - (lines.length - 1) * 23;
  lines.forEach((titleLine, row) => ctx.fillText(titleLine, 256, titleY + row * 48));

  ctx.fillStyle = '#d7cbbb';
  ctx.globalAlpha = 0.78;
  ctx.font = '500 13px "JetBrains Mono", monospace';
  ctx.letterSpacing = '2px';
  ctx.fillText(signal.genre.replace(' / ', '   /   '), 256, 604);
  ctx.globalAlpha = 1;
  ctx.fillStyle = gold;
  ctx.fillRect(233, 632, 46, 1);
  ctx.fillStyle = '#ded3c5';
  ctx.font = 'italic 16px Georgia, serif';
  ctx.fillText('A story with gravity', 256, 662);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

function addMesh(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createBook(signal, index, anisotropy) {
  const group = new Group();
  const coverColor = new Color(bookColors[index]);
  const shell = new MeshPhysicalMaterial({ color: coverColor, roughness: 0.34, metalness: 0.08, clearcoat: 0.38, clearcoatRoughness: 0.28 });
  const pages = new MeshStandardMaterial({ color: '#e6ddcf', roughness: 0.88, metalness: 0.01 });
  const coverTexture = makeCoverTexture(signal, index, anisotropy);
  const printedCover = new MeshPhysicalMaterial({ map: coverTexture, roughness: 0.39, metalness: 0.035, clearcoat: 0.3, clearcoatRoughness: 0.3 });
  const foil = new MeshStandardMaterial({ color: gold, metalness: 0.72, roughness: 0.29, emissive: gold, emissiveIntensity: 0.04 });

  addMesh(group, new RoundedBoxGeometry(0.79, 1.08, 0.125, 4, 0.035), shell);
  addMesh(group, new RoundedBoxGeometry(0.7, 0.96, 0.074, 3, 0.018), pages, [0.032, 0, 0.006]);
  addMesh(group, new RoundedBoxGeometry(0.78, 1.07, 0.026, 4, 0.025), shell, [0, 0, 0.058]);
  addMesh(group, new RoundedBoxGeometry(0.718, 1.008, 0.006, 4, 0.026), printedCover, [0, 0, 0.075]);
  addMesh(group, new RoundedBoxGeometry(0.086, 1.07, 0.126, 4, 0.027), shell, [-0.353, 0, 0]);
  addMesh(group, new RoundedBoxGeometry(0.004, 0.82, 0.002, 2, 0.001), foil, [-0.35, 0, 0.065]);
  addMesh(group, new RoundedBoxGeometry(0.002, 0.8, 0.002, 2, 0.001), foil, [0.386, 0, 0.012]);

  group.userData.coverMaterials = [shell, printedCover];
  group.userData.coverTexture = coverTexture;
  group.userData.baseScale = index === 0 ? 0.84 : index === 1 ? 0.74 : 0.63;
  group.userData.basePosition = [
    [-1.92, 0.72, -0.52],
    [1.9, 0.54, -0.48],
    [1.15, -1.23, 0.25],
  ][index];
  group.userData.baseRotation = [
    [0.19, -0.44, -0.3],
    [-0.13, 0.42, 0.24],
    [0.11, -0.2, -0.43],
  ][index];
  group.userData.phase = 0.85 * index + 0.8;
  group.position.set(...group.userData.basePosition);
  group.rotation.set(...group.userData.baseRotation);
  group.scale.setScalar(group.userData.baseScale);
  return group;
}

function createStarfield() {
  const positions = new Float32Array(260 * 3);
  const seeded = (value) => {
    const wave = Math.sin(value * 127.1 + 311.7) * 43758.5453;
    return wave - Math.floor(wave);
  };
  for (let i = 0; i < 260; i++) {
    positions[i * 3] = (seeded(i + 1) - 0.5) * 15;
    positions[i * 3 + 1] = (seeded(i + 311) - 0.5) * 10;
    positions[i * 3 + 2] = -3.2 - seeded(i + 931) * 10;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  return new Points(geometry, new PointsMaterial({ color: '#c7c9d7', size: 0.017, transparent: true, opacity: 0.52, sizeAttenuation: true, depthWrite: false }));
}

function createSoftShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(5,6,10,.43)');
  gradient.addColorStop(0.45, 'rgba(5,6,10,.2)');
  gradient.addColorStop(1, 'rgba(5,6,10,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  const material = new MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.72, depthWrite: false, toneMapped: false });
  const geometry = new PlaneGeometry(1.55, 0.74);
  return { texture, material, geometry };
}

export default function ArtifactScene({ activeIndex }) {
  const hostRef = useRef(null);
  const sceneObjects = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer;
    let state;
    try {
      const compact = window.matchMedia('(max-width: 700px)').matches;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      renderer = new WebGLRenderer({ alpha: true, antialias: !compact, powerPreference: 'low-power', preserveDrawingBuffer: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.6));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      host.appendChild(renderer.domElement);

      const scene = new Scene();
      scene.fog = new FogExp2('#10121a', 0.018);
      const camera = new PerspectiveCamera(37, 1, 0.1, 60);
      camera.position.set(0, 0, compact ? 6.05 : 5.55);
      camera.lookAt(0, 0, 0);

      scene.add(new HemisphereLight('#e8edff', '#29222a', 1.72));
      scene.add(new AmbientLight('#f4ebdb', 0.55));
      const keyLight = new DirectionalLight('#fff0db', 3.1);
      keyLight.position.set(-2.6, 4.2, 5);
      scene.add(keyLight);
      const rimLight = new PointLight('#9ca9df', 23, 10, 1.8);
      rimLight.position.set(2.7, -1.2, -1.5);
      scene.add(rimLight);
      const accentLight = new PointLight(signals[activeIndex].tint, 18, 7, 1.7);
      accentLight.position.set(-2.2, 0.8, 2.4);
      scene.add(accentLight);

      const rig = new Group();
      rig.scale.setScalar(compact ? 0.82 : 1);
      scene.add(rig);

      const core = new Group();
      rig.add(core);
      const coreGeometry = new IcosahedronGeometry(1.16, 4);
      const corePositions = coreGeometry.getAttribute('position');
      for (let i = 0; i < corePositions.count; i++) {
        const x = corePositions.getX(i);
        const y = corePositions.getY(i);
        const z = corePositions.getZ(i);
        const radius = 1 + Math.sin(x * 4.7 + y * 2.3) * Math.cos(z * 4.1 - x * 1.8) * 0.012;
        corePositions.setXYZ(i, x * radius, y * radius, z * radius);
      }
      corePositions.needsUpdate = true;
      coreGeometry.computeVertexNormals();
      const coreMaterial = new MeshPhysicalMaterial({
        color: signals[activeIndex].tint,
        emissive: signals[activeIndex].tint,
        emissiveIntensity: 0.105,
        roughness: 0.21,
        metalness: 0.21,
        clearcoat: 0.92,
        clearcoatRoughness: 0.14,
        sheen: 0.16,
        sheenColor: '#f5d5b9',
      });
      const coreShell = new Mesh(coreGeometry, coreMaterial);
      coreShell.castShadow = true;
      core.add(coreShell);
      const wireMaterial = new MeshBasicMaterial({ color: '#fff0d7', wireframe: true, transparent: true, opacity: 0.12, depthWrite: false });
      const wire = new Mesh(new IcosahedronGeometry(1.125, 2), wireMaterial);
      wire.scale.setScalar(0.78);
      core.add(wire);

      const rings = new Group();
      rig.add(rings);
      const ringMaterial = new MeshBasicMaterial({ color: signals[activeIndex].tint, transparent: true, opacity: 0.45, depthWrite: false });
      const paleRing = new MeshBasicMaterial({ color: '#e4d5c6', transparent: true, opacity: 0.23, depthWrite: false });
      const ringOne = new Mesh(new TorusGeometry(1.55, 0.009, 6, 128), ringMaterial);
      ringOne.rotation.set(0.38, 0.26, -0.48);
      const ringTwo = new Mesh(new TorusGeometry(1.84, 0.005, 6, 112), paleRing);
      ringTwo.rotation.set(1.16, -0.45, 0.22);
      rings.add(ringOne, ringTwo);

      const pinLight = new Mesh(new IcosahedronGeometry(0.064, 1), new MeshPhysicalMaterial({ color: '#ffe7c8', emissive: '#e7a879', emissiveIntensity: 0.35, metalness: 0.45, roughness: 0.18, clearcoat: 0.7 }));
      pinLight.position.set(-0.91, 0.94, 0.3);
      rig.add(pinLight);
      const satellite = new Mesh(new IcosahedronGeometry(0.052, 1), new MeshPhysicalMaterial({ color: signals[activeIndex].tint, emissive: signals[activeIndex].tint, emissiveIntensity: 0.32, metalness: 0.35, roughness: 0.2, clearcoat: 0.8 }));
      satellite.position.set(1.23, -0.57, -0.14);
      rig.add(satellite);

      const shadow = createSoftShadow();
      const books = signals.map((entry, index) => {
        const book = createBook(entry, index, renderer.capabilities.getMaxAnisotropy());
        rig.add(book);
        const contact = new Mesh(shadow.geometry, shadow.material);
        contact.position.set(book.position.x + 0.12, book.position.y - 0.58, book.position.z - 0.12);
        contact.scale.set(index === 0 ? 0.9 : 0.78, 0.82, 1);
        rig.add(contact);
        book.userData.contactShadow = contact;
        return book;
      });

      const stars = createStarfield();
      scene.add(stars);
      const view = { x: 0, y: 0, z: compact ? 6.05 : 5.55 };
      const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
      const targetColor = new Color();
      const pulse = { value: 1 };
      const colorMaterials = [coreMaterial, ringMaterial, satellite.material];
      state = { scene, camera, renderer, rig, core, coreMaterial, rings, ringMaterial, accentLight, colorMaterials, books, stars, view, pointer, targetColor, pulse, compact, reducedMotion, shadow, active: true };
      sceneObjects.current = state;

      const fit = () => {
        if (!host.clientWidth || !host.clientHeight) return;
        const width = host.clientWidth;
        const height = host.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        renderer.render(scene, camera);
      };
      fit();

      const pointerMove = (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.targetX = MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
        pointer.targetY = MathUtils.clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      };
      const pointerLeave = () => { pointer.targetX = 0; pointer.targetY = 0; };
      renderer.domElement.addEventListener('pointermove', pointerMove, { passive: true });
      renderer.domElement.addEventListener('pointerleave', pointerLeave, { passive: true });

      let frame = 0;
      let timer = 0;
      let previousTime = 0;
      let elapsed = 0;
      const frameBudget = compact ? 1000 / 40 : 1000 / 60;
      const schedule = () => {
        if (compact) timer = window.setTimeout(() => { timer = 0; frame = requestAnimationFrame(draw); }, frameBudget);
        else frame = requestAnimationFrame(draw);
      };
      const draw = (now) => {
        frame = 0;
        if (!state.active || document.hidden || state.reducedMotion) return;
        const delta = Math.min(previousTime ? (now - previousTime) / 1000 : 0.016, 0.04);
        previousTime = now;
        elapsed += delta;
        const follow = 1 - Math.exp(-delta * 3.4);
        pointer.x += (pointer.targetX - pointer.x) * follow;
        pointer.y += (pointer.targetY - pointer.y) * follow;

        camera.position.x += (view.x + pointer.x * 0.13 - camera.position.x) * follow;
        camera.position.y += (view.y - pointer.y * 0.1 - camera.position.y) * follow;
        camera.position.z += (view.z - camera.position.z) * follow;
        camera.lookAt(0, 0, 0);

        rig.rotation.y = Math.sin(elapsed * 0.12) * 0.028 + pointer.x * 0.042;
        rig.rotation.x = -pointer.y * 0.025;
        core.rotation.y += delta * 0.115;
        core.rotation.x = Math.sin(elapsed * 0.24) * 0.028;
        core.position.y = Math.sin(elapsed * 0.62) * 0.075;
        const breathe = 1 + Math.sin(elapsed * 0.78) * 0.009;
        core.scale.setScalar(breathe * pulse.value);
        rings.rotation.z += delta * 0.036;
        stars.rotation.y += delta * 0.0028;

        books.forEach((book) => {
          const phase = elapsed * 0.68 + book.userData.phase;
          book.position.y += (book.userData.basePosition[1] + Math.sin(phase) * 0.082 - book.position.y) * follow;
          book.rotation.x = book.userData.baseRotation[0] + Math.sin(phase * 0.58) * 0.025 - pointer.y * 0.018;
          book.rotation.y = book.userData.baseRotation[1] + Math.sin(phase * 0.42) * 0.052 + pointer.x * 0.018;
          book.rotation.z = book.userData.baseRotation[2] + Math.sin(phase * 0.5) * 0.018;
          book.userData.contactShadow.position.y = book.position.y - 0.58;
          book.userData.contactShadow.position.x = book.position.x + 0.12;
        });
        renderer.render(scene, camera);
        schedule();
      };
      const resume = () => {
        state.active = true;
        if (state.reducedMotion) { renderer.render(scene, camera); return; }
        previousTime = 0;
        if (!frame && !timer && !document.hidden) schedule();
      };
      const suspend = () => {
        state.active = false;
        if (frame) cancelAnimationFrame(frame);
        if (timer) window.clearTimeout(timer);
        frame = 0;
        timer = 0;
      };
      let inView = typeof IntersectionObserver === 'undefined' || host.getBoundingClientRect().bottom > 0;
      const visibility = () => document.hidden || !inView ? suspend() : resume();
      document.addEventListener('visibilitychange', visibility);
      const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
      observer?.observe(host);
      const intersection = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) resume();
        else suspend();
      }, { threshold: 0.02 }) : null;
      intersection?.observe(host);
      if (inView && !document.hidden) resume();

      state.cleanup = () => {
        suspend();
        observer?.disconnect();
        intersection?.disconnect();
        document.removeEventListener('visibilitychange', visibility);
        renderer.domElement.removeEventListener('pointermove', pointerMove);
        renderer.domElement.removeEventListener('pointerleave', pointerLeave);
      };
    } catch (error) {
      console.warn('ORBITAL 3D scene unavailable; the story atlas remains usable.', error);
      renderer?.dispose();
      renderer?.domElement.remove();
      sceneObjects.current = null;
    }

    return () => {
      const current = sceneObjects.current;
      if (current?.cleanup) current.cleanup();
      gsap.killTweensOf(current?.pulse);
      gsap.killTweensOf(current?.view);
      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      current?.scene?.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        const ownedMaterials = Array.isArray(object.material) ? object.material : [object.material];
        ownedMaterials.filter(Boolean).forEach((material) => {
          materials.add(material);
          Object.values(material).forEach((value) => { if (value?.isTexture) textures.add(value); });
        });
      });
      current?.books?.forEach((book) => textures.add(book.userData.coverTexture));
      if (current?.shadow?.texture) textures.add(current.shadow.texture);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      current?.renderer?.dispose();
      current?.renderer?.domElement.remove();
      current?.renderer?.forceContextLoss();
      sceneObjects.current = null;
    };
  }, []);

  useEffect(() => {
    const state = sceneObjects.current;
    if (!state) return undefined;
    const signal = signals[activeIndex];
    state.targetColor.set(signal.tint);
    if (state.reducedMotion) {
      state.colorMaterials.forEach((material) => material.color.copy(state.targetColor));
      state.accentLight.color.copy(state.targetColor);
      state.coreMaterial.emissive.copy(state.targetColor);
      state.books.forEach((book, index) => {
        const focused = index === activeIndex;
        book.position.z = book.userData.basePosition[2] + (focused ? 0.3 : 0);
        book.scale.setScalar(book.userData.baseScale * (focused ? 1.055 : 1));
      });
      state.view.x = [0, -0.07, 0.08][activeIndex];
      state.view.y = [0.015, -0.025, 0.02][activeIndex];
      state.camera.position.set(state.view.x, state.view.y, state.view.z);
      state.camera.lookAt(0, 0, 0);
      state.ringMaterial.opacity = activeIndex === 0 ? 0.5 : 0.42;
      state.renderer.render(state.scene, state.camera);
      return undefined;
    }
    const color = { r: state.targetColor.r, g: state.targetColor.g, b: state.targetColor.b };
    state.colorMaterials.forEach((material) => gsap.to(material.color, { ...color, duration: 1.05, ease: 'power2.inOut', overwrite: 'auto' }));
    gsap.to(state.accentLight.color, { ...color, duration: 1.1, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(state.coreMaterial.emissive, { ...color, duration: 1.05, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.timeline({ defaults: { overwrite: 'auto' } })
      .fromTo(state.pulse, { value: 0.96 }, { value: 1.055, duration: 0.43, ease: 'power3.out' })
      .to(state.pulse, { value: 1, duration: 0.72, ease: 'power2.inOut' });
    gsap.to(state.view, { x: [0, -0.07, 0.08][activeIndex], y: [0.015, -0.025, 0.02][activeIndex], z: state.compact ? 6.05 : 5.55, duration: 1.05, ease: 'power3.inOut', overwrite: 'auto' });
    state.books.forEach((book, index) => {
      const focused = index === activeIndex;
      gsap.to(book.position, { z: book.userData.basePosition[2] + (focused ? 0.3 : 0), duration: 0.9, ease: 'power3.inOut', overwrite: 'auto' });
      gsap.to(book.scale, { x: book.userData.baseScale * (focused ? 1.055 : 1), y: book.userData.baseScale * (focused ? 1.055 : 1), z: book.userData.baseScale * (focused ? 1.055 : 1), duration: 0.9, ease: 'power3.inOut', overwrite: 'auto' });
    });
    gsap.to(state.ringMaterial, { opacity: activeIndex === 0 ? 0.5 : 0.42, duration: 0.8, ease: 'sine.out', overwrite: 'auto' });
    return () => {
      state.colorMaterials.forEach((material) => gsap.killTweensOf(material.color));
      gsap.killTweensOf(state.accentLight.color);
      gsap.killTweensOf(state.coreMaterial.emissive);
      gsap.killTweensOf(state.pulse);
      gsap.killTweensOf(state.view);
      state.books.forEach((book) => {
        gsap.killTweensOf(book.position);
        gsap.killTweensOf(book.scale);
      });
      gsap.killTweensOf(state.ringMaterial);
    };
  }, [activeIndex]);

  return <div ref={hostRef} className="artifact-viewport" aria-hidden="true" />;
}
