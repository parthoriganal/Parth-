/**
 * VEILBREAK — the look.
 *
 * Every surface in the film is procedural. There are no textures, no image
 * files and no 3D assets: the painterly nebula, the cel-lit monoliths, the
 * ink outlines, the aperture energy and the ember particles are all GLSL.
 *
 * Design rules that hold across every shader here:
 *   • light is quantised into 3–4 tonal steps so surfaces read as painted
 *     illustration rather than photoreal 3D;
 *   • a low-frequency value-noise layer jitters those steps so the bands look
 *     brushed, not computed;
 *   • ink lines are geometry (inverted hull), never screen-space derivatives,
 *     so the silhouette stays crisp at any resolution and cost stays flat;
 *   • no `dFdx`/`dFdy`, no dynamic-length loops: these compile everywhere,
 *     from desktop WebGL2 down to an old mobile GPU.
 *
 * All shaders here are GLSL ES 1.00 (WebGL1 syntax) on purpose: three.js emits
 * them unchanged inside a WebGL2 context, which keeps the project portable.
 */

/* ────────────────────────────────────────────────────────────────────────────
   Shared GLSL library
   ──────────────────────────────────────────────────────────────────────────── */

export const GLSL_LIB = /* glsl */ `
#ifndef VEIL_LIB
#define VEIL_LIB

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

/* 4 octaves — the cheap default. */
float fbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec3(1.7, -3.1, 2.5);
    a *= 0.5;
  }
  return s;
}

/* 3 octaves — the workhorse for secondary detail. */
float fbm3(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * vnoise(p);
    p = p * 2.11 + vec3(-1.9, 2.7, 1.3);
    a *= 0.5;
  }
  return s;
}

/* 6 octaves — reserved for the sky's main cloud mass, where detail is the point. */
float fbm6(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    s += a * vnoise(p);
    p = p * 2.07 + vec3(2.3, 1.7, -3.1);
    a *= 0.5;
  }
  return s;
}

/* Soft quantiser: posterised, but never aliased. */
float banded(float x, float steps, float smoothness) {
  float q = floor(x * steps + 0.5) / steps;
  return mix(x, q, smoothness);
}

/* A smooth pulse that repeats, for shockwaves and glyph runners. */
float pulse(float x, float w) {
  float d = abs(fract(x) - 0.5);
  return smoothstep(0.5, 0.5 - w, d);
}

#endif
`;

/* ────────────────────────────────────────────────────────────────────────────
   1. The sky — a painted, banded nebula with procedural stars
   ──────────────────────────────────────────────────────────────────────────── */

export const SKY_VERT = /* glsl */ `
varying vec3 vWorld;

void main() {
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SKY_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAlt;        // 0 = the cold universe, 1 = the ember universe
uniform float uStars;

uniform vec3 uDeep;        // cold palette
uniform vec3 uMid;
uniform vec3 uAccent;
uniform vec3 uStar;

uniform vec3 uDeepB;       // ember palette
uniform vec3 uMidB;
uniform vec3 uAccentB;
uniform vec3 uStarB;

varying vec3 vWorld;

__LIB__

void main() {
  vec3 dir = normalize(vWorld - cameraPosition);

  vec3 deep = mix(uDeep, uDeepB, uAlt);
  vec3 mid = mix(uMid, uMidB, uAlt);
  vec3 accent = mix(uAccent, uAccentB, uAlt);
  vec3 starCol = mix(uStar, uStarB, uAlt);

  /* ── the galactic band: a twisted, tilted ribbon of dust ───────────────── */
  float twist = dot(dir.xz, vec2(0.82, 0.57));
  float gy = dir.y * 1.15 + 0.34 * sin(twist * 2.3 + 1.1) + 0.12 * cos(dir.x * 3.1);
  float ribbon = exp(-gy * gy * 6.5);

  /* ── painted clouds ────────────────────────────────────────────────────── */
  vec3 flow = vec3(uTime * 0.0045, uTime * 0.0021, -uTime * 0.0032);
  float cloudA = fbm6(dir * 2.4 + flow + 4.0);
  float cloudB = fbm3(dir * 6.1 - flow * 1.7 + 11.0);
  float cloudC = vnoise(dir * 17.0 + flow * 3.0);

  /* keep the sky readable behind the structure: denser high and low */
  float density = smoothstep(0.32, 0.86, cloudA * 0.72 + cloudB * 0.42);

  /* dust lanes eat into the ribbon */
  float lanes = smoothstep(0.46, 0.78, cloudB * 0.8 + cloudC * 0.35);
  float glow = ribbon * (0.26 + 0.80 * density) * (1.0 - lanes * 0.55);

  /* the ember universe: the ribbon becomes a slow burning storm */
  float storm = smoothstep(0.40, 0.88, fbm(dir * 1.7 + flow * 2.4 + 23.0));
  glow = mix(glow, max(glow * 0.50, storm * 0.78), uAlt);

  /* ── tone it like paint, not like physics ──────────────────────────────── */
  float tone = banded(clamp(glow, 0.0, 1.0), 5.0, 0.72);
  tone = mix(tone, tone * tone, 0.35);

  vec3 col = deep;
  col = mix(col, mid, clamp(tone * 1.55, 0.0, 1.0));
  col += accent * pow(clamp(tone, 0.0, 1.0), 2.2) * 0.62;

  /* a warm horizon behind the structure in the ember universe */
  float horizon = exp(-abs(dir.y - 0.02) * 5.5) * uAlt;
  col += mix(uAccentB, vec3(1.0, 0.72, 0.42), 0.35) * horizon * 0.35;

  /* faint violet lift where the clouds thin out — keeps blacks from going flat */
  col += mix(vec3(0.009, 0.015, 0.036), vec3(0.030, 0.009, 0.007), uAlt) * (1.0 - tone);

  /* ── stars ─────────────────────────────────────────────────────────────── */
  float stars = 0.0;
  vec3 starTint = vec3(0.0);

  vec3 cellA = floor(dir * 420.0);
  float hA = hash13(cellA);
  if (hA > 0.9755) {
    vec3 f = fract(dir * 420.0) - 0.5;
    float size = mix(0.10, 0.30, hash13(cellA + 7.3));
    float s = smoothstep(size, 0.0, length(f));
    float tw = 0.55 + 0.45 * sin(uTime * (1.1 + hA * 2.0) + hA * 41.0);
    stars += s * tw * 1.0;
    starTint += mix(vec3(0.72, 0.86, 1.0), vec3(1.0, 0.88, 0.70), hash13(cellA + 3.1)) * s * tw;
  }

  vec3 cellB = floor(dir * 168.0 + 5.0);
  float hB = hash13(cellB);
  if (hB > 0.9915) {
    vec3 f = fract(dir * 168.0 + 5.0) - 0.5;
    float size = mix(0.16, 0.34, hash13(cellB + 1.9));
    float s = smoothstep(size, 0.0, length(f));
    float tw = 0.65 + 0.35 * sin(uTime * (0.7 + hB) + hB * 17.0);
    stars += s * tw * 2.2;
    starTint += vec3(1.0, 0.93, 0.82) * s * tw * 2.2;
  }

  col += stars * uStars * starCol;
  col += starTint * stars * uStars * 0.35;

  gl_FragColor = vec4(col * 0.86, 1.0);
}
`.replace('__LIB__', GLSL_LIB);

/* ────────────────────────────────────────────────────────────────────────────
   2. Cel-shaded solid — monoliths, slabs, the watcher
   ──────────────────────────────────────────────────────────────────────────── */

export const CEL_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec2 vUv;

void main() {
  vLocal = position;
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/** Vertex shader for geometry that animates per-fragment-shard in the GPU. */
export const SHARD_VERT = /* glsl */ `
attribute vec3 aCenter;    // the shard's pivot in object space
attribute vec3 aAxis;      // its spin axis
attribute vec2 aOrbit;     // orbit radius, orbit phase
attribute float aPhase;    // drift phase / speed
attribute float aScale;    // per-shard size jitter

uniform float uTime;
uniform float uAlt;
uniform float uAssemble;   // 0 = scattered, 1 = closed into the ring

varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec2 vUv;

vec3 rotateAxis(vec3 v, vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

void main() {
  vUv = uv;
  vLocal = position;

  vec3 local = (position - aCenter) * aScale;

  /* slow tumble plus a drift that opens up as the universe inverts */
  float spin = uTime * (0.06 + aPhase * 0.22);
  local = rotateAxis(local, normalize(aAxis), spin);

  float orbitAngle = aOrbit.y + uTime * (0.02 + aPhase * 0.045);
  float spread = mix(1.0, 0.16, clamp(uAssemble, 0.0, 1.0));
  vec3 orbit = vec3(
    cos(orbitAngle) * aOrbit.x,
    sin(orbitAngle * 0.83 + aPhase * 6.28) * aOrbit.x * 0.30,
    sin(orbitAngle) * aOrbit.x
  ) * spread;
  vec3 bob = vec3(0.0, sin(uTime * 0.35 + aPhase * 12.0) * 0.9, 0.0);

  vec3 pos = aCenter + local + orbit + bob;
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * rotateAxis(normal, normalize(aAxis), spin));
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const CEL_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAlt;
uniform float uPower;      // energy running through this object
uniform float uRim;        // rim-light strength
uniform float uGlow;       // emissive amount
uniform float uOpacity;
uniform float uPattern;    // 0 plain · 1 glyph bands · 2 panel seams · 3 cloth
uniform float uPaint;      // painterly jitter amount
uniform float uGlyphs;
uniform float uAssemble;
uniform vec3 uLightDir;
uniform vec3 uLightDirB;

/* atmospheric perspective: the painted nebula swallows distance */
uniform vec3 uHazeColor;
uniform float uHazeNear;
uniform float uHazeFar;
uniform float uHazeAmount;

uniform vec3 uBase;        // cold palette
uniform vec3 uShade;
uniform vec3 uKey;
uniform vec3 uRimCol;

uniform vec3 uBaseB;       // ember palette
uniform vec3 uShadeB;
uniform vec3 uKeyB;
uniform vec3 uRimColB;

varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec2 vUv;

__LIB__

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(mix(uLightDir, uLightDirB, uAlt));

  vec3 base = mix(uBase, uBaseB, uAlt);
  vec3 shade = mix(uShade, uShadeB, uAlt);
  vec3 keyCol = mix(uKey, uKeyB, uAlt);
  vec3 rimCol = mix(uRimCol, uRimColB, uAlt);

  /* ── the cel ramp: four tonal steps with soft shoulders ────────────────── */
  float lit = dot(N, L) * 0.5 + 0.5;
  float ramp = smoothstep(0.30, 0.38, lit) * 0.26
             + smoothstep(0.52, 0.60, lit) * 0.34
             + smoothstep(0.72, 0.80, lit) * 0.40;

  /* ── brushed paint: the ramp never lands on a clean machine edge ──────── */
  float brush = vnoise(vWorld * 0.16 + 2.7) * 0.62 + vnoise(vWorld * 0.55) * 0.38;
  ramp = clamp(ramp + (brush - 0.5) * 0.24 * uPaint, 0.0, 1.0);

  vec3 shadowTint = mix(shade, base * 0.55, 0.30);
  vec3 litTint = base * mix(vec3(1.0), keyCol, 0.70) * 1.18;
  vec3 col = mix(shadowTint, litTint, ramp);

  /* cool bounce from the nebula underneath — kills flat black undersides */
  float bounce = smoothstep(0.25, -0.75, N.y);
  col += mix(uShade, uShadeB, uAlt) * bounce * 0.55;

  /* ── rim light: the single biggest contributor to the illustrated look ── */
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);
  float fresSoft = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 1.1);
  col += rimCol * (fres * 1.35 + fresSoft * 0.22) * uRim * (0.30 + 0.85 * ramp);

  /* ── surface language ─────────────────────────────────────────────────── */
  if (uPattern > 0.5 && uPattern < 1.5) {
    /* glyph bands: a rotating ring of carved, glowing script */
    float ang = atan(vLocal.z, vLocal.x);
    float u = (ang / 6.2831853) + 0.5;
    float bandA = pulse(u * uGlyphs + vLocal.y * 0.03, 0.34);
    float bandB = pulse(u * uGlyphs * 0.5 + 0.25 + vLocal.y * 0.06, 0.22);
    float gate = smoothstep(0.15, 0.32, fract(u * uGlyphs)) * smoothstep(0.85, 0.68, fract(u * uGlyphs));
    float runner = smoothstep(0.55, 1.0, sin(u * 6.2831853 * 3.0 - uTime * 1.6) * 0.5 + 0.5);
    float glyph = max(bandA * 0.75, bandB) * (0.35 + 0.65 * gate);
    col += rimCol * glyph * (0.55 + 0.45 * runner) * (0.25 + uPower * 1.5);
    /* ink between the bands */
    col *= 1.0 - 0.35 * smoothstep(0.42, 0.5, abs(fract(u * uGlyphs) - 0.5));
  } else if (uPattern > 1.5 && uPattern < 2.5) {
    /* panel seams on the slabs: drawn lines, slightly irregular */
    vec3 p = vLocal * 0.55;
    float seam = 0.0;
    seam += smoothstep(0.48, 0.5, abs(fract(p.y * 1.0 + vnoise(p * 0.7) * 0.06) - 0.5) + 0.02);
    seam += smoothstep(0.48, 0.5, abs(fract(p.x * 0.8 + p.z * 0.4) - 0.5) + 0.02);
    col *= 1.0 - clamp(seam, 0.0, 1.0) * 0.30;
    /* one lit conduit per panel */
    float conduit = pulse(p.y * 0.6 + uTime * 0.03, 0.06) * pulse(p.x * 0.8, 0.10);
    col += rimCol * conduit * (0.15 + uPower * 0.9);
  } else if (uPattern > 2.5) {
    /* cloth: soft directional weave, no seams */
    float weave = vnoise(vec3(vLocal.x * 3.2, vLocal.y * 0.9, vLocal.z * 3.2));
    col *= 0.86 + weave * 0.28;
    col += rimCol * fres * 0.35 * uRim;
  }

  /* ── emissive breathing ────────────────────────────────────────────────── */
  float breath = 0.82 + 0.18 * sin(uTime * 1.35 + vWorld.y * 0.05);
  col += mix(base, rimCol, 0.35) * uGlow * breath * (0.45 + uPower * 0.9);

  /* ink-dark caps keep the silhouette readable against the nebula */
  col *= mix(0.82, 1.0, clamp(ramp * 1.4, 0.0, 1.0));

  /* distance haze — air is not empty, even out here */
  float viewDistance = length(cameraPosition - vWorld);
  float haze = smoothstep(uHazeNear, uHazeFar, viewDistance) * uHazeAmount;
  col = mix(col, uHazeColor, haze);

  gl_FragColor = vec4(col, uOpacity);
}
`.replace('__LIB__', GLSL_LIB);

/* ────────────────────────────────────────────────────────────────────────────
   3. Ink outlines — inverted hull, constant screen width
   ──────────────────────────────────────────────────────────────────────────── */

export const INK_VERT = /* glsl */ `
uniform float uThickness;

varying float vDepth;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  vec3 n = normalize(normalMatrix * normal);

  /* Inverted hull. The offset grows with view depth so the stroke keeps an
     approximately constant width on screen (≈2–3 px at 1080p for a thickness
     of 1.0), then is clamped so a distant 200-unit spire cannot sprout a
     half-metre of black. */
  float depth = max(-mv.z, 0.0);
  float width = uThickness * 0.0016 * depth;
  mv.xyz += n * clamp(width, 0.0, 0.55);

  gl_Position = projectionMatrix * mv;
}
`;

export const INK_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform vec3 uHazeColor;
uniform float uHazeNear;
uniform float uHazeFar;
uniform float uHazeAmount;

varying float vDepth;

void main() {
  float haze = smoothstep(uHazeNear, uHazeFar, vDepth) * uHazeAmount;
  vec3 col = mix(uColor, uHazeColor, haze);
  float alpha = uOpacity * (1.0 - haze * 0.75);
  gl_FragColor = vec4(col, alpha);
}
`;

/* ────────────────────────────────────────────────────────────────────────────
   4. The aperture — swirling portal energy
   ──────────────────────────────────────────────────────────────────────────── */

export const PORTAL_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const PORTAL_FRAG = /* glsl */ `
uniform float uTime;
uniform float uPower;      // 0 dormant → 1 roaring
uniform float uAlt;
uniform vec3 uInner;       // hot core
uniform vec3 uOuter;       // vortex body
uniform vec3 uAccent;      // shockwave tint

varying vec2 vUv;
varying vec3 vWorld;

__LIB__

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.02) discard;

  float a = atan(p.y, p.x);
  float t = uTime;

  /* ── the vortex: arms wound tighter toward the centre ─────────────────── */
  float wound = a * 2.0 + r * 6.5 - t * 1.5;
  float swirlNoise = fbm(vec3(cos(a) * r * 2.2, sin(a) * r * 2.2, t * 0.42 + r * 0.9));
  float arms = 0.5 + 0.5 * sin(wound + swirlNoise * 4.6 - r * 7.0);
  float body = pow(clamp(1.0 - r, 0.0, 1.0), 1.15);
  float filaments = smoothstep(0.35, 0.95, arms) * body;

  /* ── three shockwaves, always travelling outward ──────────────────────── */
  float waves = 0.0;
  for (int i = 0; i < 3; i++) {
    float ph = fract(t * 0.34 + float(i) * 0.3333);
    float radius = ph * 1.12;
    float w = smoothstep(0.055, 0.0, abs(r - radius));
    waves += w * pow(1.0 - ph, 1.6);
  }

  /* ── hot core & aperture rim ──────────────────────────────────────────── */
  float core = exp(-r * r * 10.0);
  float rim = smoothstep(0.60, 0.90, r) * smoothstep(1.0, 0.90, r);
  float innerGlow = exp(-r * r * 2.4) * 0.55;

  float intensity = body * (0.30 + 0.70 * arms) * 0.75
                  + filaments * 0.45
                  + waves * 1.15
                  + core * 2.6
                  + rim * 0.55
                  + innerGlow;

  vec3 col = mix(uOuter, uInner, clamp(body * 1.25 + core * 1.4, 0.0, 1.0));
  col += uAccent * (waves * 1.1 + filaments * 0.55);
  col += vec3(1.0, 0.97, 0.92) * core * 1.8;
  col = mix(col, col * vec3(1.05, 0.96, 1.15), uAlt * 0.45);

  float alpha = clamp(intensity, 0.0, 1.0) * smoothstep(1.0, 0.86, r);
  gl_FragColor = vec4(col * uPower * 1.35, alpha * uPower);
}
`.replace('__LIB__', GLSL_LIB);

/* ────────────────────────────────────────────────────────────────────────────
   5. Radial glow billboard (halos, suns, the ember scar)
   ──────────────────────────────────────────────────────────────────────────── */

export const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const GLOW_FRAG = /* glsl */ `
uniform float uTime;
uniform float uPower;
uniform float uFalloff;
uniform float uCore;
uniform float uStreak;
uniform vec3 uColor;
uniform vec3 uColor2;

varying vec2 vUv;
varying vec3 vWorld;

__LIB__

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;

  float falloff = pow(max(0.0, 1.0 - r), uFalloff);
  float core = exp(-r * r * 12.0) * uCore;

  /* a soft anamorphic streak, the cheapest lens artefact there is */
  float streak = exp(-abs(p.y) * 18.0) * exp(-abs(p.x) * 2.4) * uStreak;

  /* painted grain inside the glow so it never looks like a radial gradient */
  float grain = 0.86 + 0.14 * vnoise(vec3(p * 7.0, uTime * 0.22));

  vec3 col = mix(uColor, uColor2, clamp(r * 1.35, 0.0, 1.0));
  float a = (falloff + core + streak) * uPower * grain;
  gl_FragColor = vec4(col * a, clamp(a, 0.0, 1.0));
}
`.replace('__LIB__', GLSL_LIB);

/* ────────────────────────────────────────────────────────────────────────────
   6. Volumetric light shafts (open cones, fresnel-soft)
   ──────────────────────────────────────────────────────────────────────────── */

export const SHAFT_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const SHAFT_FRAG = /* glsl */ `
uniform float uTime;
uniform float uPower;
uniform vec3 uColor;
uniform vec3 uColor2;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorld;

__LIB__

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(N, V)), 1.35);

  float along = smoothstep(0.0, 0.85, vUv.y);
  along = along * along * (1.0 - 0.25 * vUv.y);

  float flow = 0.72 + 0.28 * vnoise(vec3(vUv.x * 9.0, vUv.y * 3.0 - uTime * 0.25, uTime * 0.06));

  float a = fres * along * flow * uPower;
  vec3 col = mix(uColor, uColor2, vUv.y);
  gl_FragColor = vec4(col * a, a);
}
`.replace('__LIB__', GLSL_LIB);

/* ────────────────────────────────────────────────────────────────────────────
   7. Particles — dust, embers and the infall vortex
   ──────────────────────────────────────────────────────────────────────────── */

export const DUST_VERT = /* glsl */ `
attribute float aSeed;
attribute float aSize;
attribute vec3 aColor;

uniform float uTime;
uniform float uAlt;
uniform float uScale;
uniform float uRise;
uniform float uSpread;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vec3 p = position;

  /* lazy three-axis drift, no two motes on the same path */
  float s = aSeed * 6.2831853;
  p.x += sin(uTime * (0.11 + aSeed * 0.09) + s) * (1.4 + aSeed * 2.6) * uSpread;
  p.y += cos(uTime * (0.09 + aSeed * 0.07) + s * 1.7) * (1.1 + aSeed * 2.0) * uSpread;
  p.z += sin(uTime * (0.07 + aSeed * 0.05) + s * 2.3) * (1.6 + aSeed * 2.2) * uSpread;
  p.y += uTime * uRise * (0.25 + aSeed * 0.75);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float dist = max(-mv.z, 0.1);
  gl_PointSize = aSize * uScale * (300.0 / dist);
  gl_PointSize = clamp(gl_PointSize, 0.6, 46.0);

  /* fade the very near and the very far so nothing pops at the edges */
  vAlpha = smoothstep(3.0, 16.0, dist) * (1.0 - smoothstep(180.0, 420.0, dist));
  vAlpha *= 0.55 + 0.45 * sin(uTime * (0.5 + aSeed) + s * 3.0) * 0.5 + 0.22;
  vColor = aColor;
}
`;

export const DUST_FRAG = /* glsl */ `
uniform float uOpacity;
uniform float uAlt;
uniform vec3 uTintA;
uniform vec3 uTintB;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  /* a painted mote: soft falloff with a hot centre */
  float a = smoothstep(0.5, 0.06, d);
  a = a * a * 0.85 + smoothstep(0.16, 0.0, d) * 0.5;

  vec3 col = mix(uTintA, uTintB, uAlt) * vColor;
  gl_FragColor = vec4(col * a * vAlpha * uOpacity, a * vAlpha * uOpacity);
}
`;

export const VORTEX_VERT = /* glsl */ `
attribute float aSeed;
attribute float aRadius;
attribute float aAngle;
attribute float aHeight;
attribute float aSize;

uniform float uTime;
uniform float uPower;
uniform float uScale;

varying float vAlpha;
varying float vSeed;

void main() {
  float t = uTime;

  /* matter spirals in: angle winds up, radius decays */
  float life = fract(aSeed * 3.17 + t * (0.06 + aSeed * 0.05));
  float ang = aAngle + t * (0.55 + aSeed * 0.7) + life * 6.2831853;
  float radius = mix(aRadius, aRadius * 0.12, life);
  float y = aHeight * (1.0 - life * 0.85);

  vec3 p = vec3(cos(ang) * radius, y, sin(ang) * radius);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float dist = max(-mv.z, 0.1);
  gl_PointSize = clamp(aSize * uScale * (300.0 / dist), 0.5, 30.0);

  float fadeIn = smoothstep(0.0, 0.12, life);
  float fadeOut = 1.0 - smoothstep(0.72, 1.0, life);
  vAlpha = fadeIn * fadeOut * smoothstep(2.0, 8.0, dist) * uPower;
  vSeed = aSeed;
}
`;

export const VORTEX_FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;

varying float vAlpha;
varying float vSeed;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  float a = smoothstep(0.5, 0.05, d);
  a = a * a;
  vec3 col = mix(uColorA, uColorB, fract(vSeed * 7.31));
  gl_FragColor = vec4(col * a * vAlpha * 1.6, a * vAlpha);
}
`;

/* ────────────────────────────────────────────────────────────────────────────
   8. Post-processing: bright pass, separable blur, film composite
   ──────────────────────────────────────────────────────────────────────────── */

export const FS_VERT = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uKnee;

varying vec2 vUv;

void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float soft = clamp(luma - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  float w = max(soft, luma - uThreshold) / max(luma, 1e-4);
  gl_FragColor = vec4(c * w, 1.0);
}
`;

export const BLUR_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uDirection;   // in texel units
uniform vec2 uTexel;

varying vec2 vUv;

void main() {
  /* 9-tap gaussian folded into 5 samples with linear filtering */
  vec2 off1 = uDirection * uTexel * 1.3846153846;
  vec2 off2 = uDirection * uTexel * 3.2307692308;
  vec3 col = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
  col += texture2D(tDiffuse, vUv + off1).rgb * 0.3162162162;
  col += texture2D(tDiffuse, vUv - off1).rgb * 0.3162162162;
  col += texture2D(tDiffuse, vUv + off2).rgb * 0.0702702703;
  col += texture2D(tDiffuse, vUv - off2).rgb * 0.0702702703;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloomA;
uniform sampler2D tBloomB;

uniform vec2 uResolution;
uniform float uTime;
uniform float uExposure;
uniform float uBloom;
uniform float uBloomWide;
uniform float uChromatic;
uniform float uDistortion;
uniform float uVignette;
uniform float uGrain;
uniform float uFlash;
uniform float uFade;
uniform float uAlt;
uniform vec3 uGradeShadow;
uniform vec3 uGradeHighlight;
uniform vec2 uLensCenter;

varying vec2 vUv;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

/* ACES filmic curve — the reason highlights roll off instead of clipping */
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

  /* ── lens distortion: the aperture bends the frame as we approach it ──── */
  vec2 toLens = uv - uLensCenter;
  float lensDist = length(toLens);
  float bend = uDistortion * (0.25 + lensDist * 1.4);
  vec2 warped = uv + normalize(toLens + 1e-5) * bend * sin(lensDist * 9.0 - uTime * 1.2) * 0.5;

  /* ── chromatic aberration, strongest at the edges ────────────────────── */
  vec2 dir = warped - 0.5;
  float ca = uChromatic * (0.35 + dot(dir, dir) * 2.2);
  vec3 scene;
  scene.r = texture2D(tScene, warped + dir * ca).r;
  scene.g = texture2D(tScene, warped).g;
  scene.b = texture2D(tScene, warped - dir * ca).b;

  /* ── bloom, two radii: soft halation plus a wide anamorphic smear ────── */
  vec3 bloomA = texture2D(tBloomA, warped).rgb;
  vec3 bloomB = texture2D(tBloomB, warped).rgb;
  scene += bloomA * uBloom + bloomB * uBloomWide;

  /* ── exposure, filmic tone map ───────────────────────────────────────── */
  scene *= uExposure;
  scene = aces(scene);

  /* ── grade: cool shadows, warm highlights, per universe ──────────────── */
  float luma = dot(scene, vec3(0.2126, 0.7152, 0.0722));
  vec3 shadowTint = uGradeShadow;
  vec3 highTint = uGradeHighlight;
  scene *= mix(shadowTint, highTint, smoothstep(0.05, 0.75, luma));
  /* gentle S-curve */
  scene = mix(scene, scene * scene * (3.0 - 2.0 * scene), 0.22);
  scene = max(scene, 0.0);

  /* ── vignette ────────────────────────────────────────────────────────── */
  float vig = 1.0 - uVignette * pow(clamp(length(dir) * 1.35, 0.0, 1.0), 2.4);
  scene *= vig;

  /* ── sRGB encode (the whole pipeline works in linear light) ──────────── */
  scene = pow(scene, vec3(1.0 / 2.2));

  /* ── the threshold flash ─────────────────────────────────────────────── */
  scene = mix(scene, vec3(1.0, 0.97, 0.94), clamp(uFlash, 0.0, 1.0));

  /* ── film grain, slightly stronger in the shadows ────────────────────── */
  float grain = hash12(uv * uResolution + fract(uTime) * 733.0) - 0.5;
  scene += grain * uGrain * (1.15 - luma * 0.65);

  /* ── fade to black ───────────────────────────────────────────────────── */
  scene *= uFade;

  gl_FragColor = vec4(scene, 1.0);
}
`;
