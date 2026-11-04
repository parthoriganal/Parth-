/**
 * VEILBREAK — the film pipeline.
 *
 * Seven full-screen passes, no post-processing dependency:
 *
 *   scene ─► bright ─► blur H/V (½ res)              ─┐
 *                     └► downsample ─► blur H/V (¼ res, wide) ─┴─► composite
 *
 * The composite is where the film is *graded*: ACES tone mapping, per-universe
 * split toning, radial chromatic aberration, aperture lens distortion, vignette,
 * animated grain, the threshold flash and the fade. Everything upstream stays
 * in linear light with HDR values (half-float) so the aperture can genuinely
 * blow out.
 */

import * as THREE from '../vendor/three.module.min.js';
import { FS_VERT, BRIGHT_FRAG, BLUR_FRAG, COMPOSITE_FRAG } from './shaders.js';

export class FilmPipeline {
  constructor(renderer, { pixelRatio = 1, quality = 'high', reducedMotion = false } = {}) {
    this.renderer = renderer;
    this.quality = quality;
    this.reducedMotion = reducedMotion;
    this.pixelRatio = pixelRatio;
    this.width = 1;
    this.height = 1;

    const canHalfFloat =
      renderer.extensions.has('EXT_color_buffer_half_float') ||
      renderer.extensions.has('EXT_color_buffer_float');
    this.bufferType = canHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;

    this.sceneTarget = this.makeTarget(1, 1, true);
    this.halfA = this.makeTarget(1, 1, false);
    this.halfB = this.makeTarget(1, 1, false);
    this.quarterA = this.makeTarget(1, 1, false);
    this.quarterB = this.makeTarget(1, 1, false);

    /* full-screen triangle-pair */
    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.brightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: 0.72 },
        uKnee: { value: 0.28 }
      },
      vertexShader: FS_VERT,
      fragmentShader: BRIGHT_FRAG,
      depthTest: false,
      depthWrite: false
    });

    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uDirection: { value: new THREE.Vector2(1, 0) },
        uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) }
      },
      vertexShader: FS_VERT,
      fragmentShader: BLUR_FRAG,
      depthTest: false,
      depthWrite: false
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: this.sceneTarget.texture },
        tBloomA: { value: this.halfA.texture },
        tBloomB: { value: this.quarterA.texture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uExposure: { value: 1 },
        uBloom: { value: 0.5 },
        uBloomWide: { value: 0.35 },
        uChromatic: { value: 0.0015 },
        uDistortion: { value: 0 },
        uVignette: { value: 0.42 },
        uGrain: { value: 0.05 },
        uFlash: { value: 0 },
        uFade: { value: 1 },
        uAlt: { value: 0 },
        uGradeShadow: { value: new THREE.Color(0.92, 0.98, 1.12) },
        uGradeHighlight: { value: new THREE.Color(1.06, 1.0, 0.94) },
        uLensCenter: { value: new THREE.Vector2(0.5, 0.5) }
      },
      vertexShader: FS_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false
    });

    this.lensWorld = new THREE.Vector3(0, 0, 0);
    this._tmp = new THREE.Vector3();
    this._gradeShadowCold = new THREE.Color(0.88, 0.97, 1.14);
    this._gradeShadowWarm = new THREE.Color(1.10, 0.92, 0.90);
    this._gradeHighCold = new THREE.Color(1.02, 1.02, 1.02);
    this._gradeHighWarm = new THREE.Color(1.10, 1.0, 0.86);
  }

  makeTarget(width, height, depth) {
    const options = {
      type: this.bufferType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: depth,
      stencilBuffer: false,
      generateMipmaps: false
    };
    if (this.quality === 'high' && this.renderer.capabilities.isWebGL2 && depth) {
      options.samples = 2;
    }
    const target = new THREE.WebGLRenderTarget(Math.max(1, width), Math.max(1, height), options);
    target.texture.wrapS = THREE.ClampToEdgeWrapping;
    target.texture.wrapT = THREE.ClampToEdgeWrapping;
    target.texture.generateMipmaps = false;
    target.texture.colorSpace = THREE.NoColorSpace;
    return target;
  }

  setSize(cssWidth, cssHeight, pixelRatio) {
    this.pixelRatio = pixelRatio;
    const w = Math.max(2, Math.round(cssWidth * pixelRatio));
    const h = Math.max(2, Math.round(cssHeight * pixelRatio));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;

    this.sceneTarget.setSize(w, h);
    this.halfA.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
    this.halfB.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
    this.quarterA.setSize(Math.ceil(w / 4), Math.ceil(h / 4));
    this.quarterB.setSize(Math.ceil(w / 4), Math.ceil(h / 4));
    this.compositeMaterial.uniforms.uResolution.value.set(w, h);
  }

  blit(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  blurPass(from, to, dirX, dirY, texelScale = 1) {
    const texel = this.blurMaterial.uniforms.uTexel.value;
    texel.set(texelScale / to.width, texelScale / to.height);
    this.blurMaterial.uniforms.tDiffuse.value = from.texture;
    this.blurMaterial.uniforms.uDirection.value.set(dirX, dirY);
    this.blit(this.blurMaterial, to);
  }

  render(scene, camera, state) {
    const r = this.renderer;

    /* ── 1. the scene, in HDR ─────────────────────────────────────────── */
    r.setRenderTarget(this.sceneTarget);
    r.clear();
    r.render(scene, camera);

    /* ── 2. bright pass at half resolution ────────────────────────────── */
    const brightUniforms = this.brightMaterial.uniforms;
    brightUniforms.tDiffuse.value = this.sceneTarget.texture;
    brightUniforms.uThreshold.value = 0.62;
    this.blit(this.brightMaterial, this.halfA);

    /* ── 3. separable blur at half resolution ─────────────────────────── */
    this.blurPass(this.halfA, this.halfB, 1, 0, 1.5);
    this.blurPass(this.halfB, this.halfA, 0, 1, 1.5);

    /* ── 4. a wide, anamorphic second level at quarter resolution ─────── */
    if (this.quality === 'high') {
      this.blurPass(this.halfA, this.quarterA, 0, 0, 1); // clean downsample
      this.blurPass(this.quarterA, this.quarterB, 1, 0, 3.2);
      this.blurPass(this.quarterB, this.quarterA, 0, 1, 2.2);
    }

    /* ── 5. the grade ─────────────────────────────────────────────────── */
    const u = this.compositeMaterial.uniforms;
    u.tScene.value = this.sceneTarget.texture;
    u.tBloomA.value = this.halfA.texture;
    u.tBloomB.value = this.quality === 'high' ? this.quarterA.texture : this.halfA.texture;
    u.uBloomWide.value = this.quality === 'high' ? 0.34 : 0.0;

    u.uTime.value = state.time;
    u.uExposure.value = state.exposure;
    u.uBloom.value = state.bloom;
    u.uChromatic.value = state.chromatic * (this.reducedMotion ? 0.35 : 1);
    u.uDistortion.value = state.distortion * (this.reducedMotion ? 0.25 : 1);
    u.uVignette.value = state.vignette;
    u.uGrain.value = state.grain * (this.reducedMotion ? 0.25 : 1);
    u.uFlash.value = state.flash * (this.reducedMotion ? 0.22 : 1);
    u.uFade.value = state.fade;
    u.uAlt.value = state.alt;

    u.uGradeShadow.value.copy(this._gradeShadowCold).lerp(this._gradeShadowWarm, state.alt);
    u.uGradeHighlight.value.copy(this._gradeHighCold).lerp(this._gradeHighWarm, state.alt);

    /* the lens distortion must be centred on the aperture, wherever it is */
    this._tmp.copy(this.lensWorld).project(camera);
    u.uLensCenter.value.set(this._tmp.x * 0.5 + 0.5, this._tmp.y * 0.5 + 0.5);

    this.blit(this.compositeMaterial, null);
  }

  setQuality(quality) {
    this.quality = quality;
  }

  dispose() {
    for (const t of [this.sceneTarget, this.halfA, this.halfB, this.quarterA, this.quarterB]) t.dispose();
    this.brightMaterial.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.quad.geometry.dispose();
  }
}
