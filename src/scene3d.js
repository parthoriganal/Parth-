/**
 * scene3d.js — the physical layer.
 *
 * 320 machined slabs, 160 hairline rings, 16,000 motes and one light core.
 * Everything lit by an HDRI environment generated in-memory, then bent into
 * seven different formations by the timeline.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mulberry32, lerp, clamp, easeOutCubic, easeOutExpo, smoothstep } from './util.js';
import { bgVert, bgFrag, particleVert, particleFrag } from './shaders.js';

const TAU = Math.PI * 2;

export const PAL = {
	ink: new THREE.Color('#06070a'),
	bone: new THREE.Color('#f4efe6'),
	brass: new THREE.Color('#c2a15c'),
	ember: new THREE.Color('#e0492c'),
	steel: new THREE.Color('#6e7a85')
};

const SLAB_COUNT = 320;
const RING_COUNT = 160;
const PARTICLE_COUNT = 16000;

export function createWorld(renderer) {
	const scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2(0x05060a, 0.028);

	const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 400);
	camera.position.set(0, 1, 10);
	scene.add(camera);

	/* ---------------- environment ---------------- */

	const pmrem = new THREE.PMREMGenerator(renderer);
	pmrem.compileCubemapShader();
	const envRT = pmrem.fromScene(new RoomEnvironment(), 0.05);
	scene.environment = envRT.texture;
	scene.environmentIntensity = 0.85;
	pmrem.dispose();

	/* ---------------- background ---------------- */

	const bgMat = new THREE.ShaderMaterial({
		vertexShader: bgVert,
		fragmentShader: bgFrag,
		depthTest: false,
		depthWrite: false,
		uniforms: {
			uTime: { value: 0 },
			uEnergy: { value: 0.5 },
			uFlash: { value: 0 },
			uInk: { value: PAL.ink.clone().multiplyScalar(1.0) },
			uBrass: { value: PAL.brass.clone() },
			uSteel: { value: PAL.steel.clone() }
		}
	});

	const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
	bg.frustumCulled = false;
	bg.renderOrder = -1000;
	camera.add(bg);

	/* ---------------- lights ---------------- */

	const key = new THREE.PointLight(0xffe6bd, 46, 60, 2);
	key.position.set(0, 2.2, 3.2);
	scene.add(key);

	const rim = new THREE.PointLight(0x8fb6d6, 30, 70, 2);
	rim.position.set(-5, -1.4, -4);
	scene.add(rim);

	const core = new THREE.PointLight(0xffd9a0, 24, 26, 2);
	scene.add(core);

	const glow = new THREE.Mesh(
		new THREE.IcosahedronGeometry(0.34, 4),
		// pushed above 1.0 on purpose: this is the only thing that blooms
		new THREE.MeshBasicMaterial({ color: new THREE.Color(2.1, 1.72, 1.24), toneMapped: false })
	);
	scene.add(glow);

	/* ---------------- machined slabs ---------------- */

	const slabGeo = new THREE.BoxGeometry(1, 0.12, 1);
	const slabMat = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		metalness: 1.0,
		roughness: 0.26,
		envMapIntensity: 1.9
	});

	const slabs = new THREE.InstancedMesh(slabGeo, slabMat, SLAB_COUNT);
	slabs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
	slabs.frustumCulled = false;
	scene.add(slabs);

	const ringGeo = new THREE.TorusGeometry(0.34, 0.0075, 3, 72);
	const ringMat = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		metalness: 1.0,
		roughness: 0.18,
		envMapIntensity: 2.1
	});

	const rings = new THREE.InstancedMesh(ringGeo, ringMat, RING_COUNT);
	rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
	rings.frustumCulled = false;
	scene.add(rings);

	const rnd = mulberry32(0x51a7c0de);
	const seeds = [];

	for (let i = 0; i < SLAB_COUNT + RING_COUNT; i++) {
		seeds.push({
			a: rnd() * TAU,
			r: 0.7 + rnd() * 5.2,
			h: (rnd() - 0.5) * 4.4,
			sp: 0.2 + rnd() * 1.1,
			ph: rnd() * TAU,
			s: 0.5 + rnd() * 1.6,
			spin: (rnd() - 0.5) * 1.4
		});
	}

	// instance colours: brass, steel and bone in a disciplined ratio
	const tmpColor = new THREE.Color();
	for (let i = 0; i < SLAB_COUNT; i++) {
		const r = rnd();
		if (r > 0.82) tmpColor.copy(PAL.bone);
		else if (r > 0.34) tmpColor.copy(PAL.brass);
		else tmpColor.copy(PAL.steel);
		tmpColor.multiplyScalar(0.55 + rnd() * 0.65);
		slabs.setColorAt(i, tmpColor);
	}
	if (slabs.instanceColor) slabs.instanceColor.needsUpdate = true;

	for (let i = 0; i < RING_COUNT; i++) {
		const r = rnd();
		tmpColor.copy(r > 0.55 ? PAL.brass : PAL.steel).multiplyScalar(0.6 + rnd() * 0.7);
		rings.setColorAt(i, tmpColor);
	}
	if (rings.instanceColor) rings.instanceColor.needsUpdate = true;

	/* ---------------- motes ---------------- */

	const pGeo = new THREE.BufferGeometry();
	const pPos = new Float32Array(PARTICLE_COUNT * 3);
	const pSeed = new Float32Array(PARTICLE_COUNT * 4);
	const pr = mulberry32(0x9e3779b9);

	for (let i = 0; i < PARTICLE_COUNT; i++) {
		const a = pr() * TAU;
		const rad = 0.8 + Math.pow(pr(), 0.6) * 9.0;
		pPos[i * 3 + 0] = Math.cos(a) * rad;
		pPos[i * 3 + 1] = (pr() - 0.5) * 7.5;
		pPos[i * 3 + 2] = Math.sin(a) * rad;
		pSeed[i * 4 + 0] = pr();
		pSeed[i * 4 + 1] = pr();
		pSeed[i * 4 + 2] = pr();
		pSeed[i * 4 + 3] = pr();
	}

	pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
	pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 4));

	const pMat = new THREE.ShaderMaterial({
		vertexShader: particleVert,
		fragmentShader: particleFrag,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		uniforms: {
			uTime: { value: 0 },
			uEnergy: { value: 0.3 },
			uSpread: { value: 0.4 },
			uSize: { value: 1.1 },
			uOpacity: { value: 0.5 },
			uBrass: { value: PAL.brass.clone() },
			uBone: { value: PAL.bone.clone() }
		}
	});

	const motes = new THREE.Points(pGeo, pMat);
	motes.frustumCulled = false;
	scene.add(motes);

	/* ---------------- lockup rings ---------------- */

	const halo = new THREE.Group();
	const haloInner = new THREE.Mesh(
		new THREE.TorusGeometry(1.46, 0.0085, 3, 256),
		new THREE.MeshBasicMaterial({ color: 0xc2a15c, transparent: true, opacity: 0, toneMapped: false })
	);
	const haloOuter = new THREE.Mesh(
		new THREE.TorusGeometry(1.92, 0.005, 3, 256),
		new THREE.MeshBasicMaterial({ color: 0xf4efe6, transparent: true, opacity: 0, toneMapped: false })
	);
	halo.add(haloInner, haloOuter);
	scene.add(halo);

	/* ---------------- layout ---------------- */

	const dummy = new THREE.Object3D();
	const tmpV = new THREE.Vector3();

	function layout(mode, i, total, sd, st) {
		const t = st.t;
		const e = st.field;
		const angle = sd.a + t * 0.16 * sd.sp;
		const rad = sd.r;

		let x = 0, y = 0, z = 0, scale = 0.12 * sd.s;

		switch (mode) {
			case 'grid': {
				const cols = 16;
				const row = Math.floor(i / cols);
				const col = i % cols;
				x = (col - cols / 2 + 0.5) * 0.74;
				z = (row - 9.5) * 0.62;
				y = Math.sin(t * 2.1 + col * 0.42 + row * 0.3) * 0.22 * (0.4 + e);
				z += 1.5 * Math.sin(t * 0.5);
				scale = 0.1 * sd.s * (0.8 + e * 0.6);
				break;
			}
			case 'tunnel': {
				const span = 34;
				const zz = ((i / total) * span + t * 4.6) % span;
				const a = angle + zz * 0.35;
				const rr = 1.5 + sd.r * 0.32;
				x = Math.cos(a) * rr;
				y = Math.sin(a) * rr;
				z = -zz + 3;
				scale = 0.09 * sd.s;
				break;
			}
			case 'burst': {
				const push = 0.35 + e * 2.1 * (0.4 + sd.ph / TAU);
				x = Math.cos(angle) * rad * push;
				y = sd.h * 0.55 * (0.5 + e);
				z = Math.sin(angle) * rad * push;
				scale = 0.09 * sd.s * (0.6 + e);
				break;
			}
			case 'vortex': {
				const rise = ((sd.h + t * 1.6 * sd.sp) % 5.4) - 2.7;
				const spin = angle + rise * 0.9;
				x = Math.cos(spin) * rad * 0.75;
				z = Math.sin(spin) * rad * 0.75;
				y = rise;
				scale = 0.1 * sd.s;
				break;
			}
			case 'collapse': {
				const k = 1 - easeOutCubic(clamp(st.local * 1.25));
				x = Math.cos(angle) * rad * (0.12 + 0.88 * k);
				z = Math.sin(angle) * rad * (0.12 + 0.88 * k);
				y = sd.h * (0.05 + 0.95 * k);
				scale = 0.12 * sd.s * (0.2 + k);
				break;
			}
			case 'ring': {
				const a = (i / total) * TAU + t * 0.12;
				const rr = 2.35 + Math.sin(i * 2.3) * 0.18;
				x = Math.cos(a) * rr;
				z = Math.sin(a) * rr;
				y = Math.sin(i * 1.7) * 0.1;
				scale = 0.07 * sd.s;
				break;
			}
			case 'cloud':
			default: {
				x = Math.cos(angle) * rad;
				z = Math.sin(angle) * rad;
				y = sd.h + Math.sin(t * 0.55 + sd.ph) * (0.25 + e * 0.9);
				scale = 0.11 * sd.s * (0.7 + e * 0.5);
				break;
			}
		}

		return { x, y, z, scale };
	}

	/* ---------------- per-frame update ---------------- */

	function update(st) {
		const t = st.t;

		// camera
		const { ang, dist, hi, fov, roll, shakeX, shakeY } = st.cam;
		camera.fov = fov;
		camera.updateProjectionMatrix();
		camera.position.set(
			Math.cos(ang) * dist + shakeX * 0.6,
			hi + shakeY * 0.6,
			Math.sin(ang) * dist
		);
		camera.up.set(0, 1, 0);
		camera.lookAt(0, st.field * 0.35 - 0.1, 0);
		camera.rotateZ(roll);

		// background
		bgMat.uniforms.uTime.value = t;
		bgMat.uniforms.uEnergy.value = st.field;
		bgMat.uniforms.uFlash.value = st.flash;

		// motes
		pMat.uniforms.uTime.value = t;
		pMat.uniforms.uEnergy.value = st.field;
		pMat.uniforms.uSpread.value = 0.25 + st.field * 1.5;
		pMat.uniforms.uOpacity.value = 0.18 + st.field * 0.55;
		pMat.uniforms.uSize.value = 0.6 + st.field * 1.5;

		// formations
		const visible = st.field > 0.02;

		for (let i = 0; i < SLAB_COUNT; i++) {
			const sd = seeds[i];
			const p = layout(st.mode, i, SLAB_COUNT, sd, st);

			dummy.position.set(p.x, p.y, p.z);
			dummy.rotation.set(
				t * sd.spin * 0.5 + sd.ph,
				t * sd.spin * 0.7 + sd.a,
				Math.sin(t * 0.4 + sd.ph) * 0.4
			);
			const sc = Math.max(0.0001, p.scale * (visible ? 1 : 0.01));
			dummy.scale.set(sc * 2.2, sc * 2.2, sc * 0.34);
			dummy.updateMatrix();
			slabs.setMatrixAt(i, dummy.matrix);
		}
		slabs.instanceMatrix.needsUpdate = true;
		slabs.visible = visible;

		for (let i = 0; i < RING_COUNT; i++) {
			const sd = seeds[SLAB_COUNT + i];
			const p = layout(st.mode, i, RING_COUNT, sd, st);

			dummy.position.set(p.x * 1.08, p.y * 1.08, p.z * 1.08);
			dummy.rotation.set(Math.PI / 2 + Math.sin(t + sd.ph) * 0.8, t * 0.4 + sd.a, t * 0.2);
			const sc = Math.max(0.0001, p.scale * 2.4 * (visible ? 1 : 0.01));
			dummy.scale.setScalar(sc);
			dummy.updateMatrix();
			rings.setMatrixAt(i, dummy.matrix);
		}
		rings.instanceMatrix.needsUpdate = true;
		rings.visible = visible;

		// core
		const coreAmp = smoothstep(clamp((st.field - 0.25) * 1.6));
		glow.visible = coreAmp > 0.01;
		const pulse = 1 + Math.sin(t * 2.4) * 0.06;
		glow.scale.setScalar((0.5 + st.field * 1.5) * pulse);
		glow.material.opacity = 1;
		core.intensity = 8 + st.field * 42;

		// halo, only for the lockup
		const isLock = st.shot.kind === 'lockup' || st.shot.kind === 'endcard';
		const lk = isLock ? easeOutExpo(clamp(st.local * 2.0)) : 0;
		halo.visible = lk > 0.001;
		haloInner.material.opacity = lk * 0.55;
		haloOuter.material.opacity = lk * 0.18;
		halo.rotation.z = t * 0.06;
		halo.rotation.x = Math.sin(t * 0.23) * 0.22;
		halo.scale.setScalar(0.86 + lk * 0.14);

		// lights breathe with the cut
		key.intensity = 40 + st.flash * 120 + st.field * 18;
		rim.intensity = 24 + st.field * 30;
	}

	function setSize(w, h) {
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}

	return { scene, camera, update, setSize, bg, slabs, motes };
}
