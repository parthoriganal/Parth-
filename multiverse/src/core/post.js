// AETHERBOUND — a bespoke post pipeline.
// HDR scene target -> threshold -> two-scale Gaussian bloom -> ACES -> split-tone
// grade -> sRGB -> grain / vignette / speed lines / portal refraction.

import { COLOR, FULLSCREEN_VERT, NOISE } from './glsl.js';

const BRIGHT_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tDiffuse;
  uniform float uThreshold;
  uniform float uKnee;
  varying vec2 vUv;

  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float l = max(c.r, max(c.g, c.b));
    float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-4);
    float contrib = max(soft, l - uThreshold) / max(l, 1e-4);
    gl_FragColor = vec4(c * contrib, 1.0);
  }
`;

const BLUR_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tDiffuse;
  uniform vec2 uDirection;
  uniform vec2 uTexel;
  varying vec2 vUv;

  void main() {
    vec2 step = uDirection * uTexel;
    vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.227027;
    sum += texture2D(tDiffuse, vUv + step * 1.3846).rgb * 0.316216;
    sum += texture2D(tDiffuse, vUv - step * 1.3846).rgb * 0.316216;
    sum += texture2D(tDiffuse, vUv + step * 3.2308).rgb * 0.070270;
    sum += texture2D(tDiffuse, vUv - step * 3.2308).rgb * 0.070270;
    gl_FragColor = vec4(sum, 1.0);
  }
`;

const COPY_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tDiffuse;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D tScene;
  uniform sampler2D tBloomA;
  uniform sampler2D tBloomB;
  uniform vec2 uResolution;
  uniform float uAspect;
  uniform float uTime;
  uniform float uExposure;
  uniform float uBloomStrength;
  uniform float uSaturation;
  uniform float uContrast;
  uniform float uVignette;
  uniform float uGrain;
  uniform float uCA;
  uniform float uFlash;
  uniform float uSpeed;
  uniform float uInvert;
  uniform float uFade;
  uniform vec3 uLift;
  uniform vec3 uGain;
  uniform vec3 uTint;
  uniform vec2 uPortalScreen;
  uniform float uPortalRadius;
  uniform float uPortalStrength;

  varying vec2 vUv;

  ${NOISE}
  ${COLOR}

  vec3 aces(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv;

    // --- refraction around the rift -----------------------------------------
    vec2 pd = uv - uPortalScreen;
    pd.x *= uAspect;
    float pdist = length(pd);
    float pmask = (1.0 - smoothstep(uPortalRadius * 0.15, uPortalRadius, pdist)) * uPortalStrength;
    if (pmask > 0.001) {
      vec2 dir = pd / max(pdist, 1e-4);
      uv += vec2(-dir.y, dir.x) * pmask * 0.055;
      uv += dir * sin(pdist * 42.0 - uTime * 5.0) * 0.0028 * pmask;
      uv = uPortalScreen + (uv - uPortalScreen) * (1.0 - pmask * 0.035);
    }

    // --- radial speed blur ---------------------------------------------------
    vec2 center = uv - 0.5;
    float radius = length(center * vec2(uAspect, 1.0));
    float speedMask = uSpeed * smoothstep(0.04, 0.62, radius);
    vec3 blurCol = vec3(0.0);
    if (speedMask > 0.001) {
      for (int i = 1; i <= 4; i++) {
        float f = float(i) / 4.0;
        blurCol += texture2D(tScene, uv - center * f * 0.055 * speedMask).rgb;
      }
      blurCol *= 0.25;
    }

    // --- chromatic aberration ------------------------------------------------
    vec2 caOff = (uv - 0.5) * (uCA + pmask * 0.006);
    vec3 col;
    col.r = texture2D(tScene, uv + caOff).r;
    col.g = texture2D(tScene, uv).g;
    col.b = texture2D(tScene, uv - caOff).b;
    col = mix(col, blurCol, clamp(speedMask * 0.75, 0.0, 0.85));

    // --- bloom ---------------------------------------------------------------
    vec3 bloom = texture2D(tBloomA, uv).rgb * 0.62
               + texture2D(tBloomB, uv).rgb * 0.95;
    col += bloom * uBloomStrength;

    // --- exposure + filmic tonemap ------------------------------------------
    col *= uExposure;
    col = aces(col);

    // --- split-tone grade ----------------------------------------------------
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, col * uTint, 0.42);
    col += uLift * (1.0 - lum) * 0.55;
    col *= uGain;
    col = mix(vec3(lum), col, uSaturation);
    col = max(col, vec3(0.0));

    // --- to display space ----------------------------------------------------
    col = linearToSrgb(col);
    col = (col - 0.5) * uContrast + 0.5;
    col = clamp(col, 0.0, 1.0);

    // --- speed lines ---------------------------------------------------------
    if (uSpeed > 0.001) {
      float ang = atan(center.y, center.x);
      float streak = pow(max(0.0, sin(ang * 74.0 + hash11(floor(ang * 18.0)) * 6.2831)), 14.0);
      float sl = streak * smoothstep(0.1, 0.72, radius) * uSpeed * 0.16;
      col += vec3(0.62, 0.82, 1.0) * sl;
    }

    // --- vignette ------------------------------------------------------------
    float vig = 1.0 - smoothstep(0.28, 0.92, length((vUv - 0.5) * vec2(uAspect, 1.0)));
    col *= mix(1.0, vig, uVignette);

    // --- grain ---------------------------------------------------------------
    float g = hash21(vUv * uResolution + fract(uTime) * 137.0) - 0.5;
    col += g * uGrain;

    // --- flash / tear / fade -------------------------------------------------
    float flashMask = 1.0 - smoothstep(0.0, 0.85, length(vUv - 0.5));
    col = mix(col, vec3(1.0, 0.965, 0.9), uFlash * (0.55 + 0.45 * flashMask));
    col = mix(col, 1.0 - col, uInvert);
    col *= uFade;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

export class PostPipeline {
  constructor(THREE, renderer, opts = {}) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.quality = opts.quality ?? 'high';
    this.enabled = opts.enabled !== false;
    this.width = 1;
    this.height = 1;
    this.pixelRatio = 1;
    this.renderScale = opts.renderScale ?? 1;

    const halfFloat = renderer.extensions.has('EXT_color_buffer_float')
      || renderer.extensions.has('EXT_color_buffer_half_float');
    this.textureType = halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;

    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, {
      type: this.textureType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      samples: this.quality === 'high' ? 4 : 0,
    });
    this.sceneRT.texture.colorSpace = THREE.LinearSRGBColorSpace;

    const bloomOpts = {
      type: this.textureType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.bloomA = new THREE.WebGLRenderTarget(1, 1, bloomOpts);
    this.bloomB = new THREE.WebGLRenderTarget(1, 1, bloomOpts);
    this.bloomC = new THREE.WebGLRenderTarget(1, 1, bloomOpts);
    this.bloomD = new THREE.WebGLRenderTarget(1, 1, bloomOpts);
    for (const rt of [this.bloomA, this.bloomB, this.bloomC, this.bloomD]) {
      rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
    }

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.brightMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.sceneRT.texture },
        uThreshold: { value: 0.82 },
        uKnee: { value: 0.42 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BRIGHT_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    this.blurMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uDirection: { value: new THREE.Vector2(1, 0) },
        uTexel: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BLUR_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    this.copyMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COPY_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: this.sceneRT.texture },
        tBloomA: { value: this.bloomA.texture },
        tBloomB: { value: this.bloomC.texture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uAspect: { value: 1 },
        uTime: { value: 0 },
        uExposure: { value: 1.08 },
        uBloomStrength: { value: 0.85 },
        uSaturation: { value: 1.06 },
        uContrast: { value: 1.035 },
        uVignette: { value: 0.52 },
        uGrain: { value: 0.032 },
        uCA: { value: 0.0016 },
        uFlash: { value: 0 },
        uSpeed: { value: 0 },
        uInvert: { value: 0 },
        uFade: { value: 1 },
        uLift: { value: new THREE.Color(0.012, 0.02, 0.045) },
        uGain: { value: new THREE.Color(1.03, 1.0, 0.97) },
        uTint: { value: new THREE.Color(1.0, 0.98, 0.95) },
        uPortalScreen: { value: new THREE.Vector2(0.5, 0.5) },
        uPortalRadius: { value: 0.2 },
        uPortalStrength: { value: 0 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
    });
  }

  setSize(width, height, pixelRatio, renderScale = 1) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.pixelRatio = pixelRatio;
    this.renderScale = renderScale;

    const w = Math.max(1, Math.floor(this.width * pixelRatio * renderScale));
    const h = Math.max(1, Math.floor(this.height * pixelRatio * renderScale));
    this.sceneRT.setSize(w, h);

    const bw = Math.max(1, Math.floor(w * 0.5));
    const bh = Math.max(1, Math.floor(h * 0.5));
    this.bloomA.setSize(bw, bh);
    this.bloomB.setSize(bw, bh);

    const cw = Math.max(1, Math.floor(w * 0.25));
    const ch = Math.max(1, Math.floor(h * 0.25));
    this.bloomC.setSize(cw, ch);
    this.bloomD.setSize(cw, ch);

    this.compositeMat.uniforms.uResolution.value.set(w, h);
    this.compositeMat.uniforms.uAspect.value = this.width / this.height;
  }

  setQuality(quality) {
    this.quality = quality;
    this.sceneRT.samples = quality === 'high' ? 4 : 0;
    this.sceneRT.dispose();
    this.sceneRT = new this.THREE.WebGLRenderTarget(1, 1, {
      type: this.textureType,
      format: this.THREE.RGBAFormat,
      minFilter: this.THREE.LinearFilter,
      magFilter: this.THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      samples: this.sceneRT.samples,
    });
    this.sceneRT.texture.colorSpace = this.THREE.LinearSRGBColorSpace;
    this.brightMat.uniforms.tDiffuse.value = this.sceneRT.texture;
    this.compositeMat.uniforms.tScene.value = this.sceneRT.texture;
    this.setSize(this.width, this.height, this.pixelRatio, this.renderScale);
  }

  setGrade(grade) {
    const u = this.compositeMat.uniforms;
    if (grade.exposure !== undefined) u.uExposure.value = grade.exposure;
    if (grade.bloom !== undefined) u.uBloomStrength.value = grade.bloom * 0.65;
    if (grade.saturation !== undefined) u.uSaturation.value = grade.saturation;
    if (grade.contrast !== undefined) u.uContrast.value = grade.contrast;
    if (grade.vignette !== undefined) u.uVignette.value = grade.vignette;
    if (grade.grain !== undefined) u.uGrain.value = grade.grain;
    if (grade.lift) u.uLift.value.copy(grade.lift);
    if (grade.gain) u.uGain.value.copy(grade.gain);
    if (grade.tint) u.uTint.value.copy(grade.tint);
  }

  setPortal(screen, radius, strength) {
    const u = this.compositeMat.uniforms;
    u.uPortalScreen.value.copy(screen);
    u.uPortalRadius.value = radius;
    u.uPortalStrength.value = strength;
  }

  setEffects({ flash = 0, speed = 0, invert = 0, fade = 1, time = 0 }) {
    const u = this.compositeMat.uniforms;
    u.uFlash.value = flash;
    u.uSpeed.value = speed;
    u.uInvert.value = invert;
    u.uFade.value = fade;
    u.uTime.value = time;
  }

  render(scene, camera) {
    const r = this.renderer;
    if (!this.enabled) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }

    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);

    // bright pass -> half res
    this.quad.material = this.brightMat;
    this.brightMat.uniforms.tDiffuse.value = this.sceneRT.texture;
    r.setRenderTarget(this.bloomA);
    r.clear();
    r.render(this.quadScene, this.quadCamera);

    // half-res blur
    this.blurMat.uniforms.tDiffuse.value = this.bloomA.texture;
    this.blurMat.uniforms.uTexel.value.set(1 / this.bloomA.width, 1 / this.bloomA.height);
    this.blurMat.uniforms.uDirection.value.set(1, 0);
    this.quad.material = this.blurMat;
    r.setRenderTarget(this.bloomB);
    r.clear();
    r.render(this.quadScene, this.quadCamera);

    this.blurMat.uniforms.tDiffuse.value = this.bloomB.texture;
    this.blurMat.uniforms.uDirection.value.set(0, 1);
    r.setRenderTarget(this.bloomA);
    r.clear();
    r.render(this.quadScene, this.quadCamera);

    // quarter-res copy + blur for a wide, soft halo
    this.copyMat.uniforms.tDiffuse.value = this.bloomA.texture;
    this.quad.material = this.copyMat;
    r.setRenderTarget(this.bloomC);
    r.clear();
    r.render(this.quadScene, this.quadCamera);

    this.blurMat.uniforms.tDiffuse.value = this.bloomC.texture;
    this.blurMat.uniforms.uTexel.value.set(1 / this.bloomC.width, 1 / this.bloomC.height);
    this.blurMat.uniforms.uDirection.value.set(1, 0);
    this.quad.material = this.blurMat;
    r.setRenderTarget(this.bloomD);
    r.clear();
    r.render(this.quadScene, this.quadCamera);

    this.blurMat.uniforms.tDiffuse.value = this.bloomD.texture;
    this.blurMat.uniforms.uDirection.value.set(0, 1);
    r.setRenderTarget(this.bloomC);
    r.clear();
    r.render(this.quadScene, this.quadCamera);

    // composite
    const u = this.compositeMat.uniforms;
    u.tScene.value = this.sceneRT.texture;
    u.tBloomA.value = this.bloomA.texture;
    u.tBloomB.value = this.bloomC.texture;
    this.quad.material = this.compositeMat;
    r.setRenderTarget(null);
    r.clear();
    r.render(this.quadScene, this.quadCamera);
  }

  dispose() {
    this.sceneRT.dispose();
    this.bloomA.dispose();
    this.bloomB.dispose();
    this.bloomC.dispose();
    this.bloomD.dispose();
    this.quad.geometry.dispose();
    this.brightMat.dispose();
    this.blurMat.dispose();
    this.copyMat.dispose();
    this.compositeMat.dispose();
  }
}
