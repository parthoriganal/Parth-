/**
 * shaders.js — every pixel in this film is computed. No images, no textures,
 * no footage. These three shaders are the whole surface of the piece.
 */

/* ------------------------------------------------------------------ */
/* Background: deep ink field with slow domain-warped haze              */
/* ------------------------------------------------------------------ */

export const bgVert = /* glsl */ `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = vec4(position.xy, 0.9999, 1.0);
	}
`;

export const bgFrag = /* glsl */ `
	precision highp float;
	varying vec2 vUv;

	uniform float uTime;
	uniform float uEnergy;
	uniform float uFlash;
	uniform vec3 uInk;
	uniform vec3 uBrass;
	uniform vec3 uSteel;

	float hash(vec2 p) {
		return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
	}

	float vnoise(vec2 p) {
		vec2 i = floor(p);
		vec2 f = fract(p);
		vec2 u = f * f * (3.0 - 2.0 * f);
		return mix(
			mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
			mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
			u.y
		);
	}

	float fbm(vec2 p) {
		float v = 0.0;
		float a = 0.5;
		for (int i = 0; i < 5; i++) {
			v += a * vnoise(p);
			p *= 2.02;
			a *= 0.5;
		}
		return v;
	}

	void main() {
		vec2 uv = vUv;
		vec2 p = (uv - 0.5) * vec2(1.7778, 1.0);
		float t = uTime;

		// domain warp — slow, expensive-looking movement
		vec2 q = vec2(fbm(p * 1.4 + vec2(t * 0.045, -t * 0.028)), fbm(p * 1.4 + vec2(5.2, 1.3) - t * 0.03));
		float n = fbm(p * 2.2 + q * 1.6 + vec2(0.0, t * 0.02));
		float n2 = fbm(p * 4.6 - q * 2.0 + vec2(t * 0.09, 0.0));

		vec3 col = uInk;

		// base haze
		col += uSteel * 0.085 * n;
		col += uBrass * 0.030 * smoothstep(0.45, 1.0, n2) * uEnergy;

		// central bloom of light behind the subject
		float glow = smoothstep(0.95, 0.02, length(p * vec2(0.86, 1.12)));
		col += uBrass * 0.085 * pow(glow, 2.6);

		// single soft horizontal band of light
		float band = exp(-pow((uv.y - 0.47 - sin(t * 0.19) * 0.10) * 7.0, 2.0));
		col += (uBrass * 0.5 + vec3(0.02, 0.02, 0.03)) * band * 0.035 * (0.4 + uEnergy);

		// corner fall-off
		float vig = smoothstep(1.15, 0.15, length((uv - 0.5) * vec2(1.35, 1.0)));
		col *= mix(0.55, 1.0, vig);

		col += vec3(0.86, 0.82, 0.74) * uFlash * 0.55;

		gl_FragColor = vec4(col, 1.0);
	}
`;

/* ------------------------------------------------------------------ */
/* Particles: 16k additive motes, all positions solved in the shader   */
/* ------------------------------------------------------------------ */

export const particleVert = /* glsl */ `
	precision highp float;
	attribute vec4 aSeed;
	uniform float uTime;
	uniform float uEnergy;
	uniform float uSpread;
	uniform float uSize;
	uniform float uOpacity;

	varying float vAlpha;
	varying float vWarm;

	void main() {
		vec3 base = position;
		float sp = mix(0.18, 2.4, uEnergy);

		float ang = aSeed.x * 6.28318 + uTime * (0.12 + aSeed.y * 0.55) * sp;
		float rad = length(base.xz) * mix(0.55, 1.15, uEnergy);

		vec3 pos;
		pos.x = cos(ang) * rad;
		pos.z = sin(ang) * rad;
		pos.y = base.y * mix(0.7, 1.0, uEnergy)
			+ sin(uTime * 0.42 + aSeed.z * 6.28318) * (0.15 + uEnergy * 0.55);

		// outward push
		pos += normalize(base + 0.0001) * uSpread * (0.35 + aSeed.w * 0.9);

		vec4 mv = modelViewMatrix * vec4(pos, 1.0);
		gl_Position = projectionMatrix * mv;

		float depthSize = 9.0 / max(0.35, -mv.z);
		gl_PointSize = uSize * (0.45 + aSeed.y * 1.55) * depthSize;

		vAlpha = uOpacity * (0.18 + 0.82 * aSeed.z) * smoothstep(0.0, 0.6, -mv.z);
		vWarm = aSeed.w;
	}
`;

export const particleFrag = /* glsl */ `
	precision highp float;
	uniform vec3 uBrass;
	uniform vec3 uBone;
	varying float vAlpha;
	varying float vWarm;

	void main() {
		vec2 d = gl_PointCoord - 0.5;
		float r = length(d);
		if (r > 0.5) discard;

		float core = smoothstep(0.5, 0.0, r);
		float falloff = pow(core, 2.6);

		vec3 tint = mix(uBrass, uBone, vWarm * 0.85);
		gl_FragColor = vec4(tint * (0.5 + 1.4 * falloff), falloff * vAlpha);
	}
`;

/* ------------------------------------------------------------------ */
/* Film gate: aberration, halation, grain, vignette, letterbox          */
/* Runs after tone mapping, so type stays crisp and values are display  */
/* referred — the way a real grade is done.                             */
/* ------------------------------------------------------------------ */

export const filmShader = {
	uniforms: {
		tDiffuse: { value: null },
		uOverlay: { value: null },
		uTime: { value: 0 },
		uRes: { value: [1920, 1080] },
		uAberr: { value: 1.0 },
		uGrain: { value: 0.7 },
		uVignette: { value: 0.6 },
		uFlash: { value: 0 },
		uGlitch: { value: 0 },
		uFade: { value: 1 },
		uScan: { value: 0.12 },
		uBar: { value: 0.1232 },
		uLetterbox: { value: 1.0 }
	},
	vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: /* glsl */ `
		precision highp float;
		varying vec2 vUv;

		uniform sampler2D tDiffuse;
		uniform sampler2D uOverlay;
		uniform float uTime;
		uniform vec2 uRes;
		uniform float uAberr;
		uniform float uGrain;
		uniform float uVignette;
		uniform float uFlash;
		uniform float uGlitch;
		uniform float uFade;
		uniform float uScan;
		uniform float uBar;
		uniform float uLetterbox;

		float hash(vec2 p) {
			return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
		}

		void main() {
			vec2 uv = vUv;

			// gate weave: the frame is never perfectly still
			uv += vec2(sin(uTime * 1.73) * 0.00035, cos(uTime * 2.31) * 0.00050);

			// glitch: displaced horizontal bands
			if (uGlitch > 0.001) {
				float band = floor(uv.y * 28.0);
				float trigger = hash(vec2(band, floor(uTime * 14.0)));
				if (trigger > 1.0 - uGlitch * 0.34) {
					float shift = (hash(vec2(band, floor(uTime * 9.0))) - 0.5) * 0.09 * uGlitch;
					uv.x += shift;
				}
			}

			vec2 d = uv - 0.5;
			float r2 = dot(d, d);
			float amt = uAberr * 0.0017 * (0.22 + r2 * 1.6);

			vec3 col;
			col.r = texture2D(tDiffuse, uv + d * amt * 3.0).r;
			col.g = texture2D(tDiffuse, uv).g;
			col.b = texture2D(tDiffuse, uv - d * amt * 2.4).b;

			// halation — warm bleed around the hottest part of the frame
			float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
			col += vec3(0.42, 0.14, 0.05) * smoothstep(0.66, 1.0, luma) * 0.16;

			// typography and technical graphics, composited in display space
			vec4 ov = texture2D(uOverlay, vUv);
			col = mix(col, ov.rgb, clamp(ov.a, 0.0, 1.0));

			// film grain, strongest in the shadows
			float g = hash(uv * uRes + uTime * 91.73) - 0.5;
			float weight = 0.35 + 0.9 * (1.0 - luma);
			col += g * uGrain * 0.11 * weight;

			// vignette
			col *= 1.0 - uVignette * 0.72 * pow(length((uv - 0.5) * vec2(1.16, 1.0)) * 1.22, 2.4);

			// scanline texture
			col *= 1.0 - uScan * 0.035 * (0.5 + 0.5 * sin(uv.y * uRes.y * 3.14159));

			// flash frame
			col = mix(col, vec3(0.96, 0.93, 0.85), uFlash);

			// 2.39:1 letterbox
			if (uLetterbox > 0.5) {
				float soft = 0.0012;
				float inTop = smoothstep(uBar - soft, uBar + soft, vUv.y);
				float inBot = smoothstep(uBar - soft, uBar + soft, 1.0 - vUv.y);
				float inside = inTop * inBot;
				// hairline on the bar edge — a projector gate, not a crop
				float edge = exp(-pow((vUv.y - uBar) * 900.0, 2.0)) + exp(-pow((vUv.y - (1.0 - uBar)) * 900.0, 2.0));
				col = mix(vec3(0.0), col, inside);
				col += vec3(0.76, 0.63, 0.36) * edge * 0.10;
			}

			col *= uFade;

			gl_FragColor = vec4(col, 1.0);
		}
	`
};
