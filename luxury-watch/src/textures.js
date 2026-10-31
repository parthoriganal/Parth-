/**
 * textures.js — every surface in this watch is painted procedurally.
 *
 * No image files, no HDR downloads: the dial's sunburst guilloché, the
 * alligator grain, the Geneva stripes and the studio lighting rig are all
 * generated into <canvas> elements at boot, then uploaded as GPU textures.
 * That keeps the piece self-contained and lets the dial / strap react to the
 * material swatches in the UI.
 *
 * Units: the model is modelled in millimetres.
 */

import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * canvas plumbing
 * ------------------------------------------------------------------ */

const SERIF = '"Didot", "Bodoni MT", "Playfair Display", "Times New Roman", Georgia, serif';
const SANS = '"Helvetica Neue", "Inter", "Segoe UI", Arial, sans-serif';

let MAX_ANISOTROPY = 8;

/** Called once the renderer exists so textures use the hardware maximum. */
export function setMaxAnisotropy(value) {
  MAX_ANISOTROPY = Math.max(1, Math.min(16, value || 8));
}

function makeCanvas(width, height = width) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function makeTexture(canvas, { srgb = true, repeat = null, anisotropy = MAX_ANISOTROPY } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.wrapS = texture.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  if (repeat) texture.repeat.set(repeat[0], repeat[1]);
  texture.needsUpdate = true;
  return texture;
}

/** Draws letter-spaced text, centred on `x`. Canvas has no reliable tracking. */
function trackedText(ctx, text, x, y, spacing) {
  const glyphs = [...text];
  const widths = glyphs.map((glyph) => ctx.measureText(glyph).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + spacing * (glyphs.length - 1);
  let cursor = x - total / 2;
  glyphs.forEach((glyph, i) => {
    ctx.fillText(glyph, cursor, y);
    cursor += widths[i] + spacing;
  });
}

/* ------------------------------------------------------------------ *
 * dial
 * ------------------------------------------------------------------ */

/**
 * Sunburst dial with a printed minute track and maison signature.
 * Rendered per dial colourway and cached by the material library.
 */
export function createDialTexture(spec, size = 1536) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const roughCanvas = makeCanvas(size);
  const roughCtx = roughCanvas.getContext('2d');
  const m = size / 2;
  const r = m * 0.998;
  ctx.translate(m, m);
  roughCtx.translate(m, m);
  roughCtx.fillStyle = '#8f8f8f';
  roughCtx.fillRect(-m, -m, size, size);

  // Base lacquer — a soft off-centre highlight reads as curved enamel.
  const base = ctx.createRadialGradient(-m * 0.28, -m * 0.34, m * 0.04, 0, 0, m * 1.15);
  base.addColorStop(0, spec.light);
  base.addColorStop(0.55, spec.base);
  base.addColorStop(1, spec.rim);
  ctx.fillStyle = base;
  ctx.fillRect(-m, -m, size, size);

  // Côtes de Genève ... no: a sunburst ("soleil") brushing, 900 fine rays.
  const rays = 900;
  for (let i = 0; i < rays; i += 1) {
    const angle = (i / rays) * Math.PI * 2;
    const bright = i % 2 === 0;
    ctx.beginPath();
    ctx.strokeStyle = bright ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.065)';
    ctx.lineWidth = size / 700;
    ctx.moveTo(Math.cos(angle) * r * 0.04, Math.sin(angle) * r * 0.04);
    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    ctx.stroke();

    roughCtx.beginPath();
    roughCtx.strokeStyle = bright ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.2)';
    roughCtx.lineWidth = size / 700;
    roughCtx.moveTo(Math.cos(angle) * r * 0.04, Math.sin(angle) * r * 0.04);
    roughCtx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    roughCtx.stroke();
  }

  // Concentric guilloché rings — 0.5 mm apart at real scale.
  for (let radius = r * 0.04; radius < r; radius += size / 380) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,0.032)';
    ctx.lineWidth = size / 900;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    roughCtx.beginPath();
    roughCtx.strokeStyle = 'rgba(0,0,0,0.09)';
    roughCtx.lineWidth = size / 900;
    roughCtx.arc(0, 0, radius, 0, Math.PI * 2);
    roughCtx.stroke();
  }

  // Outer minute track.
  const trackR = r * 0.925;
  ctx.beginPath();
  ctx.arc(0, 0, trackR, 0, Math.PI * 2);
  ctx.strokeStyle = spec.track;
  ctx.lineWidth = size / 420;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.975, 0, Math.PI * 2);
  ctx.strokeStyle = spec.trackFaint;
  ctx.lineWidth = size / 700;
  ctx.stroke();

  for (let i = 0; i < 60; i += 1) {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    const inner = r * (major ? 0.945 : 0.958);
    const outer = r * 0.992;
    ctx.beginPath();
    ctx.strokeStyle = major ? spec.track : spec.trackFaint;
    ctx.lineWidth = major ? size / 300 : size / 720;
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }

  // Signature.
  ctx.fillStyle = spec.text;
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${size * 0.056}px ${SERIF}`;
  trackedText(ctx, 'AUREUM', 0, -size * 0.335, size * 0.019);
  ctx.font = `400 ${size * 0.021}px ${SANS}`;
  trackedText(ctx, 'GENÈVE', 0, -size * 0.262, size * 0.011);
  ctx.font = `400 ${size * 0.016}px ${SANS}`;
  trackedText(ctx, 'CHRONOMÈTRE', 0, -size * 0.216, size * 0.008);

  // Six o'clock signature.
  ctx.font = `400 ${size * 0.0145}px ${SANS}`;
  trackedText(ctx, 'SWISS MADE', 0, size * 0.462, size * 0.0095);

  // Subtle vignette so the dial reads as dished under the crystal.
  const vignette = ctx.createRadialGradient(0, 0, r * 0.58, 0, 0, r);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vignette;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Redraw the minute track above the vignette so it stays crisp.
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  ctx.strokeStyle = spec.trackFaint;
  ctx.lineWidth = size / 700;
  ctx.stroke();
  for (let i = 0; i < 60; i += 1) {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    const inner = r * (major ? 0.93 : 0.95);
    const outer = r * 0.988;
    ctx.beginPath();
    ctx.strokeStyle = major ? spec.track : spec.trackFaint;
    ctx.lineWidth = major ? size / 240 : size / 600;
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }

  return {
    map: makeTexture(canvas, { srgb: true }),
    roughnessMap: makeTexture(roughCanvas, { srgb: false }),
    normalMap: makeTexture(heightToNormalCanvas(roughCanvas, 0.9), { srgb: false }),
  };
}

/** Snailed small-seconds register, printed with quarter numerals. */
export function createSubdialTexture(spec, size = 768) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const m = size / 2;
  ctx.translate(m, m);
  const r = m * 0.985;

  const base = ctx.createRadialGradient(-m * 0.25, -m * 0.3, m * 0.03, 0, 0, m);
  base.addColorStop(0, spec.light);
  base.addColorStop(1, spec.base);
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Snailing — an Archimedean spiral of faint grooves.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 190; i += 1) {
    const radius = r * (i / 190);
    ctx.beginPath();
    ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = size / 500;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Track + ticks.
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
  ctx.strokeStyle = spec.trackFaint;
  ctx.lineWidth = size / 420;
  ctx.stroke();
  for (let i = 0; i < 60; i += 1) {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    ctx.beginPath();
    ctx.strokeStyle = major ? spec.track : spec.trackFaint;
    ctx.lineWidth = major ? size / 260 : size / 620;
    ctx.moveTo(Math.cos(angle) * r * 0.755, Math.sin(angle) * r * 0.755);
    ctx.lineTo(Math.cos(angle) * r * 0.895, Math.sin(angle) * r * 0.895);
    ctx.stroke();
  }

  ctx.fillStyle = spec.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${size * 0.075}px ${SANS}`;
  const numerals = [
    ['60', 0, -0.47],
    ['15', 0.47, 0],
    ['30', 0, 0.47],
    ['45', -0.47, 0],
  ];
  numerals.forEach(([text, x, y]) => ctx.fillText(text, x * r, y * r));

  return makeTexture(canvas, { srgb: true });
}

/* ------------------------------------------------------------------ *
 * leather
 * ------------------------------------------------------------------ */

function drawScale(ctx, cx, cy, rx, ry, seed) {
  // Alligator belly scutes: broad, flat-topped rectangles with rounded corners.
  const w = rx * 2;
  const h = ry * 2;
  const radius = Math.min(w, h) * (0.22 + (Math.sin(seed * 7.3) * 0.5 + 0.5) * 0.08);
  const x = cx - rx;
  const y = cy - ry;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Alligator leather: neutral albedo (tinted per colourway), a height-derived
 * normal map and a roughness map. One tile corresponds to 20 × 20 mm.
 */
export function createLeatherTextures(size = 1024) {
  const albedo = makeCanvas(size);
  const height = makeCanvas(size);
  const rough = makeCanvas(size);
  const a = albedo.getContext('2d');
  const h = height.getContext('2d');
  const g = rough.getContext('2d');

  a.fillStyle = '#7d6d5a';
  a.fillRect(0, 0, size, size);
  h.fillStyle = '#1a1a1a';
  h.fillRect(0, 0, size, size);
  g.fillStyle = '#9a9a9a';
  g.fillRect(0, 0, size, size);

  const rows = 7;
  const cols = 5;
  const cellW = size / cols;
  const cellH = size / rows;

  let seed = 1;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      seed += 1;
      const random = (k) => Math.sin(seed * k) * 0.5 + 0.5;
      const jitterX = (random(91.7) - 0.5) * cellW * 0.12;
      const jitterY = (random(37.3) - 0.5) * cellH * 0.14;
      const offset = row % 2 ? cellW * 0.5 : 0;
      const cx = ((col * cellW + offset + cellW / 2 + jitterX) % size + size) % size;
      const cy = row * cellH + cellH / 2 + jitterY;
      // Scutes grow larger toward the middle of the strap and tighten at the
      // edges, as on a real alligator hide.
      const edgeT = Math.abs(((cx / size) % 1) - 0.5) * 2;
      const edgeFactor = 1 - Math.pow(edgeT, 1.6) * 0.26;
      const rx = cellW * (0.37 + random(5.1) * 0.09) * edgeFactor;
      const ry = cellH * (0.37 + random(3.7) * 0.09) * edgeFactor;

      // Albedo — pebbled, slightly uneven tan.
      drawScale(a, cx, cy, rx, ry, seed);
      const fill = a.createRadialGradient(cx - rx * 0.25, cy - ry * 0.4, rx * 0.05, cx, cy, rx * 1.1);
      fill.addColorStop(0, '#b1a18f');
      fill.addColorStop(0.55, '#9b8b78');
      fill.addColorStop(1, '#7a6a57');
      a.fillStyle = fill;
      a.fill();
      a.strokeStyle = 'rgba(38,26,18,0.4)';
      a.lineWidth = size / 340;
      a.stroke();

      // Height — rounded bump per scale.
      drawScale(h, cx, cy, rx * 0.97, ry * 0.97, seed);
      const bump = h.createRadialGradient(cx - rx * 0.15, cy - ry * 0.2, rx * 0.04, cx, cy, rx * 1.1);
      bump.addColorStop(0, '#dcdcdc');
      bump.addColorStop(0.72, '#a8a8a8');
      bump.addColorStop(1, '#5a5a5a');
      h.fillStyle = bump;
      h.fill();

      // Roughness — centres are a touch more matte than the glazed valleys.
      drawScale(g, cx, cy, rx, ry, seed);
      const rg = g.createRadialGradient(cx, cy, rx * 0.05, cx, cy, rx);
      rg.addColorStop(0, '#d2d2d2');
      rg.addColorStop(1, '#8e8e8e');
      g.fillStyle = rg;
      g.fill();

      // A soft dorsal keel down each scute — the giveaway of real alligator.
      a.beginPath();
      a.strokeStyle = 'rgba(255,245,228,0.10)';
      a.lineWidth = size / 300;
      a.moveTo(cx, cy - ry * 0.45);
      a.lineTo(cx, cy + ry * 0.8);
      a.stroke();

      h.beginPath();
      h.strokeStyle = 'rgba(255,255,255,0.55)';
      h.lineWidth = size / 260;
      h.moveTo(cx, cy - ry * 0.45);
      h.lineTo(cx + rx * 0.06, cy + ry * 0.8);
      h.stroke();
    }
  }

  // Micro speckle so highlights break up like real grain.
  for (let i = 0; i < 2400; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.6 + 0.3;
    a.beginPath();
    a.fillStyle = Math.random() > 0.5 ? 'rgba(255,238,214,0.05)' : 'rgba(20,12,6,0.06)';
    a.arc(x, y, r, 0, Math.PI * 2);
    a.fill();
  }

  return {
    map: makeTexture(albedo, { srgb: true }),
    normalMap: makeTexture(heightToNormalCanvas(height, 3.4), { srgb: false }),
    roughnessMap: makeTexture(rough, { srgb: false }),
  };
}

/** Sobel-ish normal map from a grayscale height field (OpenGL convention). */
export function heightToNormalCanvas(heightCanvas, strength = 2.4) {
  const w = heightCanvas.width;
  const hgt = heightCanvas.height;
  const src = heightCanvas.getContext('2d').getImageData(0, 0, w, hgt).data;
  const out = makeCanvas(w, hgt);
  const ctx = out.getContext('2d');
  const image = ctx.createImageData(w, hgt);
  const dst = image.data;
  const at = (x, y) => src[((((y + hgt) % hgt) * w + ((x + w) % w)) * 4)] / 255;

  for (let y = 0; y < hgt; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx;
      let ny = dy;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * w + x) * 4;
      dst[i] = (nx * 0.5 + 0.5) * 255;
      dst[i + 1] = (ny * 0.5 + 0.5) * 255;
      dst[i + 2] = (nz * 0.5 + 0.5) * 255;
      dst[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return out;
}

/* ------------------------------------------------------------------ *
 * movement finishes
 * ------------------------------------------------------------------ */

/** Côtes de Genève — broad, softly lit diagonal bands. */
function genevaCanvas(size = 512) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8d8d8d';
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-0.62);
  const band = size / 7;
  for (let x = -size; x < size; x += band) {
    const grad = ctx.createLinearGradient(x, 0, x + band, 0);
    grad.addColorStop(0, '#5f5f5f');
    grad.addColorStop(0.5, '#d8d8d8');
    grad.addColorStop(1, '#5f5f5f');
    ctx.fillStyle = grad;
    ctx.fillRect(x, -size, band, size * 2);
  }
  ctx.restore();
  return canvas;
}

export function createGenevaTexture(size = 512) {
  return makeTexture(genevaCanvas(size), { srgb: false, repeat: [1.4, 1.4] });
}

export function createGenevaNormal(size = 512) {
  return makeTexture(heightToNormalCanvas(genevaCanvas(size), 2.6), { srgb: false, repeat: [1.4, 1.4] });
}

/** Perlage — overlapping circular graining used on the mainplate. */
function perlageCanvas(size = 512) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, size, size);
  const step = size / 11;
  for (let y = 0; y < size + step; y += step) {
    for (let x = 0; x < size + step; x += step) {
      const cx = x + (Math.round(y / step) % 2 ? step / 2 : 0);
      const grad = ctx.createRadialGradient(cx - step * 0.2, y - step * 0.2, 1, cx, y, step * 0.75);
      grad.addColorStop(0, '#dcdcdc');
      grad.addColorStop(0.75, '#8f8f8f');
      grad.addColorStop(1, '#454545');
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(cx, y, step * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return canvas;
}

export function createPerlageTexture(size = 512) {
  return makeTexture(perlageCanvas(size), { srgb: false, repeat: [2, 2] });
}

export function createPerlageNormal(size = 512) {
  return makeTexture(heightToNormalCanvas(perlageCanvas(size), 2.2), { srgb: false, repeat: [2, 2] });
}

/** Fine linear brushing for the case band and clasp. */
export function createBrushedTexture(size = 1024) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5200; i += 1) {
    const y = Math.random() * size;
    const alpha = Math.random() * 0.22;
    ctx.strokeStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.lineWidth = Math.random() * 1.4 + 0.3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }
  return makeTexture(canvas, { srgb: false, repeat: [1, 1] });
}

/** Transparent plaque for the gold rotor engraving. */
export function createRotorEngraving(size = 512) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = 'rgba(60,35,8,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${size * 0.085}px ${SERIF}`;
  trackedText(ctx, 'AUREUM', 0, -size * 0.035, size * 0.022);
  ctx.font = `400 ${size * 0.036}px ${SANS}`;
  trackedText(ctx, 'CAL. 001 · GENÈVE', 0, size * 0.06, size * 0.008);
  ctx.font = `400 ${size * 0.026}px ${SANS}`;
  trackedText(ctx, '25 JEWELS · ADJUSTED', 0, size * 0.125, size * 0.006);
  return makeTexture(canvas, { srgb: true });
}

/* ------------------------------------------------------------------ *
 * studio
 * ------------------------------------------------------------------ */

/**
 * A procedural studio HDRI: dark cyclorama, one huge soft key box, two
 * rim strips and a warm floor bounce. Converted to a PMREM for PBR.
 */
export function createStudioEnvironment(renderer, mood = 'studio') {
  const width = 2048;
  const height = 1024;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const moods = {
    studio: { sky: '#151619', horizon: '#565049', floor: '#09090a', key: 1, warm: 1 },
    soft: { sky: '#25262a', horizon: '#67625b', floor: '#111113', key: 0.78, warm: 1.05 },
    dramatic: { sky: '#08080a', horizon: '#2c2925', floor: '#040405', key: 1.3, warm: 0.7 },
  };
  const tone = moods[mood] || moods.studio;

  // Cyclorama.
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, tone.sky);
  sky.addColorStop(0.4, tone.horizon);
  sky.addColorStop(0.56, tone.horizon);
  sky.addColorStop(1, tone.floor);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  /** Soft-edged area light. */
  const areaLight = (x, y, w, h, color, alpha, feather = 0.55) => {
    const g = ctx.createRadialGradient(
      x + w / 2, y + h / 2, 1,
      x + w / 2, y + h / 2, Math.max(w, h) * (0.5 + feather),
    );
    g.addColorStop(0, color);
    g.addColorStop(0.42, color);
    g.addColorStop(0.72, `rgba(255,255,255,0.18)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(1, h / w);
    ctx.translate(-(x + w / 2), -(y + h / 2));
    ctx.fillStyle = g;
    ctx.fillRect(x - w * 1.6, y - h * 3, w * 4.2, h * 7);
    ctx.restore();
  };

  // Huge key softbox — upper left of the reflection sphere.
  areaLight(210, 90, 560, 330, 'rgba(255,247,233,1)', 0.95 * tone.key, 0.35);

  // Beauty dish in front of the piece: this is what makes gold indices and
  // hands sparkle when you look at the dial.
  areaLight(1360, 250, 300, 340, 'rgba(255,243,222,1)', 0.85 * tone.key, 0.25);

  // Overhead strip — catches bezels, hands and the top of the case.
  areaLight(620, 20, 820, 120, 'rgba(255,252,244,1)', 0.8 * tone.key, 0.2);

  // Cool rim, right rear.
  ctx.save();
  const rim = ctx.createLinearGradient(0, 120, 0, 820);
  rim.addColorStop(0, 'rgba(186,209,255,0)');
  rim.addColorStop(0.45, `rgba(203,222,255,${0.65 * tone.warm})`);
  rim.addColorStop(1, 'rgba(186,209,255,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(1790, 120, 90, 700);
  ctx.restore();

  // Second, taller rim behind the left shoulder.
  ctx.save();
  const rim2 = ctx.createLinearGradient(0, 60, 0, 620);
  rim2.addColorStop(0, 'rgba(255,226,188,0)');
  rim2.addColorStop(0.5, `rgba(255,232,199,${0.4 * tone.warm})`);
  rim2.addColorStop(1, 'rgba(255,226,188,0)');
  ctx.fillStyle = rim2;
  ctx.fillRect(985, 60, 90, 560);
  ctx.restore();

  // Warm floor bounce.
  areaLight(560, 800, 900, 150, 'rgba(255,190,126,1)', 0.3 * tone.warm, 0.5);

  const equirect = new THREE.CanvasTexture(canvas);
  equirect.mapping = THREE.EquirectangularReflectionMapping;
  equirect.colorSpace = THREE.SRGBColorSpace;
  equirect.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(equirect).texture;
  pmrem.dispose();
  equirect.dispose();
  return envMap;
}

/** Deep radial gradient used as the page backdrop (and transmission backdrop). */
export function createBackdropTexture(size = 1024) {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size * 0.5, size * 0.42, size * 0.02, size * 0.5, size * 0.55, size * 0.75);
  g.addColorStop(0, '#3a352d');
  g.addColorStop(0.3, '#201f1c');
  g.addColorStop(0.68, '#0d0d0e');
  g.addColorStop(1, '#060607');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return makeTexture(canvas, { srgb: true });
}

/** Additive pool of light under the piece. */
export function createLightPoolTexture(size = 512) {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,226,186,0.85)');
  g.addColorStop(0.35, 'rgba(255,206,150,0.28)');
  g.addColorStop(1, 'rgba(255,190,130,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return makeTexture(canvas, { srgb: true });
}
