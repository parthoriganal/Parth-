/**
 * overlay.js — the typographic and technical layer.
 *
 * Drawn on a 2D canvas at 1920×1080, uploaded as a texture, and composited
 * *after* tone mapping so type stays razor sharp and pure white stays pure.
 * 17 graphic systems, one design grid, one palette.
 */

import {
	clamp, lerp, smoothstep, easeOutExpo, easeOutCubic, easeInOutCubic,
	easeOutBack, easeInExpo, hash, pad, timecode
} from './util.js';
import { TOTAL_FRAMES, FPS } from './timeline.js';

export const OW = 1920;
export const OH = 1080;

const SERIF = '"Times New Roman", Times, Georgia, serif';
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const MONO = '"SFMono-Regular", "SF Mono", Menlo, Consolas, monospace';

const COL = {
	bone: '#f4efe6',
	ink: '#06070a',
	brass: '#c2a15c',
	ember: '#e0492c',
	steel: '#6e7a85'
};

// the 2.39:1 picture area, inside a 16:9 canvas
const PIC_TOP = 133;
const PIC_BOT = OH - 133;

/* ------------------------------------------------------------------ */
/* text primitives                                                     */
/* ------------------------------------------------------------------ */

function setFont(ctx, size, family, weight = 'normal', style = 'normal') {
	ctx.font = `${style} ${weight} ${size}px ${family}`;
}

function measureTracked(ctx, text, tracking) {
	let w = 0;
	for (const ch of text) w += ctx.measureText(ch).width + tracking;
	return Math.max(0, w - tracking);
}

function drawTracked(ctx, text, x, y, tracking, align = 'left') {
	ctx.textAlign = 'left';
	const total = measureTracked(ctx, text, tracking);
	let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
	for (const ch of text) {
		ctx.fillText(ch, cx, y);
		cx += ctx.measureText(ch).width + tracking;
	}
	return total;
}

function text(ctx, str, x, y, opts = {}) {
	const {
		size = 16,
		family = SANS,
		weight = 'normal',
		style = 'normal',
		tracking = 0,
		align = 'left',
		color = COL.bone,
		alpha = 1
	} = opts;

	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.fillStyle = color;
	setFont(ctx, size, family, weight, style);
	ctx.textBaseline = 'middle';
	let w;
	if (tracking) w = drawTracked(ctx, str, x, y, tracking, align);
	else {
		ctx.textAlign = align;
		ctx.fillText(str, x, y);
		w = ctx.measureText(str).width;
		ctx.textAlign = 'left';
	}
	ctx.restore();
	return w;
}

function line(ctx, x1, y1, x2, y2, color = COL.bone, alpha = 1, width = 1) {
	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.restore();
}

function rect(ctx, x, y, w, h, color, alpha = 1) {
	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.fillStyle = color;
	ctx.fillRect(x, y, w, h);
	ctx.restore();
}

function crosshair(ctx, cx, cy, r, color, alpha) {
	line(ctx, cx - r, cy, cx - r * 0.35, cy, color, alpha);
	line(ctx, cx + r * 0.35, cy, cx + r, cy, color, alpha);
	line(ctx, cx, cy - r, cx, cy - r * 0.35, color, alpha);
	line(ctx, cx, cy + r * 0.35, cx, cy + r, color, alpha);
	line(ctx, cx - 9, cy + 9, cx - 4, cy + 4, color, alpha * 0.6);
}

/* ------------------------------------------------------------------ */
/* persistent film chrome                                              */
/* ------------------------------------------------------------------ */

function chrome(ctx, st, ink) {
	const c = ink ? COL.ink : COL.bone;
	const a = ink ? 0.5 : 0.34;
	const margin = 96;

	// corner registration marks
	const corners = [
		[margin, PIC_TOP + 26, 1, 1],
		[OW - margin, PIC_TOP + 26, -1, 1],
		[margin, PIC_BOT - 26, 1, -1],
		[OW - margin, PIC_BOT - 26, -1, -1]
	];
	for (const [x, y, sx, sy] of corners) {
		line(ctx, x, y, x + 22 * sx, y, c, a);
		line(ctx, x, y, x, y + 22 * sy, c, a);
	}

	// top rail
	text(ctx, 'AUREUM', margin, PIC_TOP + 46, { size: 11, family: MONO, tracking: 5, color: c, alpha: a * 1.2 });
	text(ctx, `TC ${timecode(st.frame)}`, OW - margin, PIC_TOP + 46, { size: 11, family: MONO, tracking: 4, color: c, alpha: a, align: 'right' });

	// bottom rail
	text(ctx, `${st.section.num} — ${st.section.name}`, margin, PIC_BOT - 46, { size: 11, family: MONO, tracking: 4.5, color: c, alpha: a });
	text(ctx, `SC ${pad(st.shotIndex + 1, 3)} / ${pad(TOTAL_FRAMES > 0 ? st.totalShots : 0, 3)}`, OW - margin, PIC_BOT - 46, {
		size: 11, family: MONO, tracking: 4, color: c, alpha: a, align: 'right'
	});

	// centre ticks on the rails
	line(ctx, OW / 2, PIC_TOP + 26, OW / 2, PIC_TOP + 40, c, a * 0.8);
	line(ctx, OW / 2, PIC_BOT - 26, OW / 2, PIC_BOT - 40, c, a * 0.8);
}

/* ------------------------------------------------------------------ */
/* graphic systems                                                     */
/* ------------------------------------------------------------------ */

function sysVoid(ctx, st) {
	const p = easeOutCubic(st.local);
	const cx = OW / 2;
	const cy = OH / 2;

	// breathing dot
	const pulse = 2.2 + Math.sin(st.t * 3.1) * 0.6;
	ctx.save();
	ctx.globalAlpha = 0.9;
	ctx.fillStyle = COL.brass;
	ctx.beginPath();
	ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	// hairline opening up
	const w = lerp(0, 720, easeOutExpo(p));
	line(ctx, cx - w / 2, cy, cx + w / 2, cy, COL.bone, 0.55 * p, 1);
	line(ctx, cx, cy - w * 0.06, cx, cy + w * 0.06, COL.bone, 0.3 * p, 1);

	text(ctx, 'STUDIO OF FORM & MOTION', cx, cy + 72, {
		size: 12, tracking: 9, align: 'center', alpha: 0.5 * p
	});
}

function sysRules(ctx, st) {
	const p = easeOutExpo(st.local);
	const cx = OW / 2;
	const wide = lerp(0, 1180, p);

	line(ctx, cx - wide / 2, 396, cx + wide / 2, 396, COL.bone, 0.28, 1);
	line(ctx, cx - wide / 2, 684, cx + wide / 2, 684, COL.bone, 0.28, 1);
	line(ctx, cx - wide / 2 * 0.62, 420, cx + wide / 2 * 0.62, 420, COL.brass, 0.6 * p, 1);

	text(ctx, 'EST. MMXIX', cx, 348, { size: 11, tracking: 8, align: 'center', alpha: 0.45 });
	text(ctx, st.shot.text || 'AUREUM', cx, 540, {
		size: 74, family: SERIF, tracking: 26, align: 'center', alpha: 0.95 * p
	});
	text(ctx, st.shot.label || '', cx, 738, { size: 13, tracking: 11, align: 'center', alpha: 0.55 * p });

	// measurement ticks crawling along the rules
	const count = 40;
	for (let i = 0; i < count; i++) {
		const x = cx - wide / 2 + (i / (count - 1)) * wide;
		const tall = i % 5 === 0;
		line(ctx, x, 396, x, 396 - (tall ? 9 : 4), COL.bone, 0.2 * p);
		line(ctx, x, 684, x, 684 + (tall ? 9 : 4), COL.bone, 0.2 * p);
	}
}

function sysGrid(ctx, st) {
	const p = easeOutCubic(st.local);
	const cx = OW / 2;
	const cy = OH / 2;

	// technical lattice
	const step = 96;
	const reveal = lerp(0, 1, p);
	for (let x = step; x < OW; x += step) {
		const d = Math.abs(x - cx) / (OW / 2);
		line(ctx, x, PIC_TOP + 30, x, PIC_BOT - 30, COL.bone, 0.05 * reveal * (1 - d * 0.6));
	}
	for (let y = PIC_TOP + 60; y < PIC_BOT - 30; y += step * 0.75) {
		line(ctx, 60, y, OW - 60, y, COL.bone, 0.05 * reveal);
	}

	// brass crosshair with measurements
	const r = 210 * easeOutExpo(p);
	crosshair(ctx, cx, cy, r, COL.brass, 0.75);
	ctx.save();
	ctx.globalAlpha = 0.5 * p;
	ctx.strokeStyle = COL.brass;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
	ctx.stroke();
	ctx.restore();

	text(ctx, st.shot.text || 'INDEX', cx, cy + r + 46, {
		size: 15, tracking: 12, align: 'center', color: COL.brass, alpha: 0.9 * p
	});
	text(ctx, st.shot.label || '', cx, cy - r - 40, { size: 11, tracking: 8, align: 'center', alpha: 0.5 * p });

	// ruler numbers
	for (let i = 0; i < 8; i++) {
		const x = 240 + i * 200;
		text(ctx, pad(i * 120), x, PIC_TOP + 34, { size: 10, family: MONO, tracking: 2, alpha: 0.3 * p });
		line(ctx, x, PIC_TOP + 30, x, PIC_TOP + 44, COL.bone, 0.3 * p);
	}

	// side index column
	for (let i = 0; i < 6; i++) {
		text(ctx, pad(100 + i * 7, 3), OW - 96, 320 + i * 46, {
			size: 10, family: MONO, tracking: 3, alpha: (0.3 - i * 0.03) * p, align: 'right'
		});
	}
}

function sysWordmark(ctx, st) {
	const p = easeOutExpo(st.local);
	const cx = OW / 2;
	const cy = OH / 2;

	const tracking = lerp(64, 30, p);
	const alpha = smoothstep(p * 1.25);
	const rise = lerp(26, 0, p);

	ctx.save();
	ctx.translate(0, rise);
	text(ctx, st.shot.text || 'AUREUM', cx, cy, {
		size: 146, family: SERIF, tracking, align: 'center', alpha: 0.97 * alpha
	});
	ctx.restore();

	// rule that draws outward from the centre
	const rw = lerp(0, 560, easeOutCubic(p));
	line(ctx, cx - rw / 2, cy + 104, cx + rw / 2, cy + 104, COL.brass, 0.55 * alpha);
	text(ctx, st.shot.label || '', cx, cy + 146, { size: 12, tracking: 10, align: 'center', alpha: 0.6 * alpha });
	text(ctx, 'STUDIO OF FORM & MOTION', cx, cy - 132, { size: 11, tracking: 12, align: 'center', alpha: 0.42 * alpha });
}

function sysCounter(ctx, st) {
	const p = st.local;
	const n = Math.floor(easeInOutCubic(p) * TOTAL_FRAMES);
	const cx = OW / 2;
	const cy = OH / 2;

	text(ctx, pad(n), cx, cy - 6, {
		size: 240, family: MONO, weight: '300', align: 'center', alpha: 0.92, tracking: 4
	});
	text(ctx, 'FRAMES OF 0864', cx, cy + 132, { size: 12, tracking: 11, align: 'center', alpha: 0.5, color: COL.brass });

	// progress rail
	const w = 900;
	line(ctx, cx - w / 2, cy + 186, cx + w / 2, cy + 186, COL.bone, 0.16);
	line(ctx, cx - w / 2, cy + 186, cx - w / 2 + w * p, cy + 186, COL.brass, 0.85, 2);

	for (let i = 0; i <= 8; i++) {
		const x = cx - w / 2 + (i / 8) * w;
		line(ctx, x, cy + 178, x, cy + 194, COL.bone, 0.22);
	}
}

function sysFlash(ctx, st) {
	const accent = st.shot.accent === 'ember' ? COL.ember : st.shot.accent === 'brass' ? COL.brass : COL.ink;
	rect(ctx, 0, 0, OW, OH, COL.bone, 0.92 * Math.pow(1 - st.local, 1.6));

	const cx = OW / 2;
	line(ctx, 0, OH / 2, OW, OH / 2, accent, 0.55, 2);
	text(ctx, 'CUT', cx + 8, OH / 2 - 28, {
		size: 13, tracking: 12, align: 'center', color: accent, alpha: 0.8
	});
	text(ctx, pad(st.shotIndex + 1, 3), 96, OH / 2 + 30, {
		size: 11, family: MONO, tracking: 4, color: accent, alpha: 0.7
	});
}

function sysHud(ctx, st) {
	const p = easeOutExpo(st.local);
	const cx = OW / 2;
	const cy = OH / 2;

	// targeting brackets
	const b = lerp(320, 250, p);
	const arm = 56;
	const corners = [
		[cx - b, cy - b, 1, 1], [cx + b, cy - b, -1, 1],
		[cx - b, cy + b, 1, -1], [cx + b, cy + b, -1, -1]
	];
	for (const [x, y, sx, sy] of corners) {
		line(ctx, x, y, x + arm * sx, y, COL.brass, 0.9 * p, 1.5);
		line(ctx, x, y, x, y + arm * sy, COL.brass, 0.9 * p, 1.5);
	}

	// rotating square
	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(st.t * 0.25);
	ctx.globalAlpha = 0.25 * p;
	ctx.strokeStyle = COL.bone;
	ctx.lineWidth = 1;
	ctx.strokeRect(-b * 0.62, -b * 0.62, b * 1.24, b * 1.24);
	ctx.restore();

	text(ctx, st.shot.text || '', cx, cy, {
		size: 58, family: MONO, weight: '300', tracking: 8, align: 'center', alpha: p
	});
	text(ctx, st.shot.label || '', cx, cy + 62, { size: 12, tracking: 9, align: 'center', alpha: 0.55 * p });

	// live data at the frame edges
	const readouts = [
		['AZ', `${pad(Math.round(180 + Math.sin(st.t * 0.7) * 40), 3)}°`],
		['EL', `${pad(Math.round(12 + Math.cos(st.t * 0.5) * 9), 2)}°`],
		['EXP', (st.post.exposure).toFixed(2)],
		['FRM', pad(st.frame)]
	];
	readouts.forEach(([k, v], i) => {
		const x = 96 + i * 170;
		const y = PIC_BOT - 92;
		text(ctx, k, x, y, { size: 9, family: MONO, tracking: 4, alpha: 0.4 * p });
		text(ctx, v, x, y + 20, { size: 13, family: MONO, tracking: 2, alpha: 0.75 * p });
	});

	// travelling tick ruler
	const ry = PIC_TOP + 92;
	const rw = OW - 192;
	const cursor = (st.t * 0.09) % 1;
	line(ctx, 96, ry, 96 + rw, ry, COL.bone, 0.14 * p);
	for (let i = 0; i <= 60; i++) {
		const x = 96 + (i / 60) * rw;
		const tall = i % 5 === 0;
		line(ctx, x, ry - (tall ? 10 : 5), x, ry, COL.bone, 0.22 * p);
	}
	line(ctx, 96 + rw * cursor, ry - 16, 96 + rw * cursor, ry + 6, COL.ember, 0.85, 1.5);
}

function sysBars(ctx, st) {
	const frame = st.frame;
	const code = st.shot.text || 'AU—001';
	const baseY = PIC_TOP + 60;
	const h = PIC_BOT - PIC_TOP - 120;

	// barcode that re-shuffles every frame
	const cols = 46;
	const gap = 8;
	const w = (OW - 192 - gap * (cols - 1)) / cols;
	for (let i = 0; i < cols; i++) {
		const r = hash(i * 7.13 + frame * 0.83);
		const hh = h * (0.08 + r * 0.92) * (0.4 + 0.6 * (i / cols));
		const x = 96 + i * (w + gap);
		const accent = hash(i * 3.7) > 0.86;
		rect(ctx, x, baseY + h - hh, w * (0.35 + 0.65 * hash(i * 1.7 + frame * 0.1)), hh,
			accent ? COL.brass : COL.bone, accent ? 0.55 : 0.14 + r * 0.2);
	}

	// code plate
	ctx.save();
	ctx.globalAlpha = 0.92;
	ctx.fillStyle = COL.ink;
	ctx.fillRect(OW / 2 - 230, OH / 2 - 62, 460, 124);
	ctx.restore();
	line(ctx, OW / 2 - 230, OH / 2 - 62, OW / 2 + 230, OH / 2 - 62, COL.brass, 0.9);
	line(ctx, OW / 2 - 230, OH / 2 + 62, OW / 2 + 230, OH / 2 + 62, COL.brass, 0.9);
	text(ctx, code, OW / 2, OH / 2 + 2, {
		size: 46, family: MONO, weight: '300', tracking: 6, align: 'center'
	});

	// scanning line
	const sy = baseY + ((st.t * 260) % h);
	line(ctx, 96, sy, OW - 96, sy, COL.brass, 0.35, 2);
}

function sysMetric(ctx, st) {
	const p = easeOutExpo(st.local);
	const cx = OW / 2;
	const cy = OH / 2;

	text(ctx, st.shot.text || '24', cx, cy - 40, {
		size: 300, family: SERIF, align: 'center', alpha: 0.95 * p, tracking: -8
	});
	text(ctx, st.shot.label || '', cx, cy + 140, {
		size: 13, tracking: 12, align: 'center', color: COL.brass, alpha: 0.8 * p
	});

	// sparkline
	const sx = cx - 300;
	const sy = cy + 236;
	const sw = 600;
	line(ctx, sx, sy, sx + sw, sy, COL.bone, 0.16 * p);
	ctx.save();
	ctx.globalAlpha = 0.85 * p;
	ctx.strokeStyle = COL.brass;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	for (let i = 0; i <= 90; i++) {
		const u = i / 90;
		const v = 0.5 + 0.5 * Math.sin(u * 9.4 + st.t * 2.2) * (0.25 + u * 0.6);
		const x = sx + u * sw;
		const y = sy - v * 70 * easeInExpo(Math.min(1, p * 1.3));
		i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
	}
	ctx.stroke();
	ctx.restore();

	// vertical rules
	line(ctx, 96, PIC_TOP + 60, 96, PIC_BOT - 60, COL.bone, 0.14 * p);
	line(ctx, OW - 96, PIC_TOP + 60, OW - 96, PIC_BOT - 60, COL.bone, 0.14 * p);
}

/* --- display type systems ------------------------------------------ */

function bigWord(ctx, st, opts = {}) {
	const {
		word,
		size = 300,
		tracking = -4,
		color = COL.bone,
		align = 'center',
		alpha = 1,
		clipOpen = 1,
		offset = 0,
		y = OH / 2
	} = opts;

	const cx = OW / 2;
	const x = align === 'center' ? cx : align === 'left' ? 180 : OW - 180;

	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.beginPath();
	const halfH = size * 0.62;
	ctx.rect(0, y - halfH, OW * clamp(clipOpen), halfH * 2);
	ctx.clip();
	ctx.translate(offset, 0);
	setFont(ctx, size, SANS, '700');
	ctx.fillStyle = color;
	ctx.textBaseline = 'middle';
	drawTracked(ctx, word, x, y, tracking, align);
	ctx.restore();
}

function sysTypeSlam(ctx, st) {
	const p = st.local;
	const e = easeOutBack(clamp(p * 2.4), 2.2);
	const scale = lerp(1.22, 1.0, e);
	const clip = smoothstep(clamp(p * 6));
	const alpha = smoothstep(clamp(p * 8));

	ctx.save();
	ctx.translate(OW / 2, OH / 2);
	ctx.scale(scale, scale);
	ctx.translate(-OW / 2, -OH / 2);
	bigWord(ctx, st, {
		word: st.shot.text,
		size: (st.shot.text.length > 7 ? 190 : 268) * st.shot.size,
		align: st.shot.align,
		clipOpen: clip,
		alpha,
		tracking: -6
	});
	ctx.restore();

	const lx = st.shot.align === 'left' ? 180 : st.shot.align === 'right' ? OW - 180 : OW / 2;
	const align = st.shot.align;
	line(ctx, lx - (align === 'center' ? 140 : 0), OH / 2 + 150, lx + (align === 'center' ? 140 : 0), OH / 2 + 150,
		COL.brass, 0.7 * alpha);
	text(ctx, st.shot.section.name, lx, OH / 2 + 186, {
		size: 11, tracking: 10, align, alpha: 0.5 * alpha, color: COL.brass
	});
	text(ctx, pad(st.shotIndex + 1, 3), align === 'left' ? OW - 180 : 180, OH / 2 + 186, {
		size: 11, family: MONO, tracking: 4, align: align === 'left' ? 'right' : 'left', alpha: 0.4 * alpha
	});
}

function sysTypeSlice(ctx, st) {
	const p = st.local;
	const bands = 7;
	const size = (st.shot.text.length > 6 ? 200 : 260) * st.shot.size;
	const y = OH / 2;
	const align = st.shot.align === 'center' ? 0.5 : st.shot.align === 'left' ? 0 : 1;
	const x = align === 0.5 ? OW / 2 : align === 0 ? 180 : OW - 180;

	ctx.save();
	setFont(ctx, size, SANS, '700');
	const totalW = measureTracked(ctx, st.shot.text, -6);
	const left = align === 0.5 ? x - totalW / 2 : align === 0 ? x : x - totalW;
	const fullH = size * 0.62;
	const bandH = (fullH * 2) / bands;

	for (let i = 0; i < bands; i++) {
		const stagger = clamp(p * 2.2 - i * 0.11);
		const e = easeOutExpo(stagger);
		const dir = i % 2 === 0 ? 1 : -1;
		const dx = (1 - e) * 300 * dir * (0.6 + hash(i * 9.1) * 0.8);

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, y - fullH + i * bandH, OW, bandH + 1);
		ctx.clip();
		ctx.globalAlpha = 0.94 * smoothstep(stagger);
		ctx.fillStyle = st.shot.accent === 'ember' ? COL.ember : st.shot.accent === 'brass' ? COL.brass : COL.bone;
		ctx.textBaseline = 'middle';
		ctx.fillText(st.shot.text, left + dx, y);
		ctx.restore();

		line(ctx, 0, y - fullH + i * bandH, OW, y - fullH + i * bandH, COL.bone, 0.06);
	}

	// accents
	const accent = st.shot.accent === 'ember' ? COL.ember : COL.brass;
	line(ctx, left, y + fullH + 34, left + totalW * easeOutExpo(p), y + fullH + 34, accent, 0.8);
	text(ctx, `${st.section.num} / ${st.section.name}`, align === 1 ? left : left + totalW, y + fullH + 64, {
		size: 11, family: MONO, tracking: 5, align: align === 1 ? 'left' : 'right', alpha: 0.45
	});
}

function sysTypeStack(ctx, st) {
	const words = Array.isArray(st.shot.text) ? st.shot.text : [st.shot.text];
	const p = st.local;

	words.forEach((word, i) => {
		const stagger = clamp(p * 3 - i * 0.45);
		const e = easeOutExpo(stagger);
		const fromLeft = i % 2 === 0;
		const size = word.length > 6 ? 128 : 150;
		const y = OH / 2 - (words.length - 1) * 84 + i * 168;

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, y - 86, OW * e, 172);
		ctx.clip();
		ctx.globalAlpha = 0.95 * smoothstep(stagger);
		ctx.fillStyle = i === 1 && words.length === 3 ? COL.brass : COL.bone;
		setFont(ctx, size, SANS, '700');
		ctx.textBaseline = 'middle';
		ctx.textAlign = fromLeft ? 'left' : 'right';
		ctx.fillText(word, fromLeft ? 180 : OW - 180, y);
		ctx.restore();

		line(ctx, 180, y + 84, OW - 180, y + 84, COL.bone, 0.12 * e);
	});

	// index ticks
	for (let i = 0; i < 12; i++) {
		line(ctx, 180 + i * 140, PIC_TOP + 60, 180 + i * 140, PIC_TOP + 70, COL.bone, 0.15);
	}
	text(ctx, st.section.name, OW / 2, PIC_BOT - 84, { size: 11, tracking: 12, align: 'center', alpha: 0.4 });
}

function sysInvert(ctx, st) {
	const p = easeOutCubic(clamp(st.local * 3));
	rect(ctx, 0, 0, OW, OH, COL.bone, p);

	// inset border + index
	const m = 64;
	ctx.save();
	ctx.globalAlpha = 0.35 * p;
	ctx.strokeStyle = COL.ink;
	ctx.lineWidth = 1;
	ctx.strokeRect(m, PIC_TOP + m * 0.35, OW - m * 2, PIC_BOT - PIC_TOP - m * 0.7);
	ctx.restore();

	const word = st.shot.text || 'MOTION';
	const size = (word.length > 7 ? 132 : 220) * st.shot.size;
	const align = st.shot.align === 'left' ? 'left' : st.shot.align === 'right' ? 'right' : 'center';
	const x = align === 'center' ? OW / 2 : align === 'left' ? 180 : OW - 180;

	ctx.save();
	ctx.globalAlpha = 0.96 * p;
	ctx.fillStyle = COL.ink;
	setFont(ctx, size, SANS, '700');
	ctx.textBaseline = 'middle';
	ctx.textAlign = align;
	ctx.fillText(word, x, OH / 2 - 10);
	ctx.restore();

	text(ctx, 'INVERT · 02 FRAMES', align === 'center' ? OW / 2 : x, OH / 2 + size * 0.62 + 44, {
		size: 11, tracking: 9, align, color: COL.ink, alpha: 0.55 * p
	});
	text(ctx, pad(st.shotIndex + 1, 3), align === 'right' ? 180 : OW - 180, OH / 2 + size * 0.62 + 44, {
		size: 11, family: MONO, tracking: 4, color: COL.ink, alpha: 0.4 * p,
		align: align === 'right' ? 'left' : 'right'
	});
	line(ctx, 180, OH / 2 + size * 0.62 + 20, OW - 180, OH / 2 + size * 0.62 + 20, COL.ink, 0.25 * p);
}

function sysGlitch(ctx, st) {
	const word = st.shot.text || 'SIGNAL';
	const size = word.length > 6 ? 210 : 270;
	const cx = OW / 2;

	// rgb ghost copies
	ctx.save();
	ctx.globalAlpha = 0.55;
	setFont(ctx, size, SANS, '700');
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.fillStyle = COL.ember;
	ctx.fillText(word, cx + 5, OH / 2 - 3);
	ctx.fillStyle = COL.steel;
	ctx.fillText(word, cx - 5, OH / 2 + 3);
	ctx.restore();

	ctx.save();
	ctx.globalAlpha = 0.95;
	setFont(ctx, size, SANS, '700');
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.fillStyle = COL.bone;
	ctx.fillText(word, cx, OH / 2);
	ctx.restore();

	// corrupted blocks, keyed to frame index
	const blocks = 22;
	for (let i = 0; i < blocks; i++) {
		const r = hash(i * 3.31 + st.frame * 1.77);
		if (r < 0.45) continue;
		const by = PIC_TOP + hash(i * 5.1 + st.frame * 0.61) * (PIC_BOT - PIC_TOP - 40);
		const bh = 4 + hash(i * 7.7) * 22;
		const bx = hash(i * 11.3 + st.frame * 0.29) * OW;
		const bw = 40 + hash(i * 2.9 + st.frame) * 320;
		rect(ctx, bx, by, bw, bh, i % 3 === 0 ? COL.ember : COL.bone, 0.12 + hash(i + st.frame) * 0.16);
	}

	text(ctx, 'SIGNAL LOST', cx, OH / 2 + size * 0.6, {
		size: 12, tracking: 14, align: 'center', color: COL.ember, alpha: 0.75
	});
}

function sysField(ctx, st) {
	const p = st.local;

	// whisper-level graphics so the 3D can breathe
	text(ctx, st.shot.label || '', OW / 2, PIC_TOP + 128, {
		size: 11, tracking: 12, align: 'center', alpha: 0.35
	});

	if (st.shot.text) {
		const align = 'left';
		const x = 180;
		ctx.save();
		ctx.globalAlpha = 0.18;
		ctx.fillStyle = COL.bone;
		setFont(ctx, 92, SERIF);
		ctx.textBaseline = 'middle';
		ctx.fillText(st.shot.text, x, PIC_BOT - 150);
		ctx.restore();

		line(ctx, x, PIC_BOT - 96, x + 120, PIC_BOT - 96, COL.brass, 0.6);
	}

	// vertical progress rail on the right
	const rh = PIC_BOT - PIC_TOP - 200;
	const rx = OW - 150;
	line(ctx, rx, PIC_TOP + 120, rx, PIC_TOP + 120 + rh, COL.bone, 0.14);
	line(ctx, rx, PIC_TOP + 120, rx, PIC_TOP + 120 + rh * p, COL.brass, 0.85, 2);
	text(ctx, `${pad(Math.round(p * 100), 2)}%`, rx, PIC_TOP + 104, {
		size: 10, family: MONO, tracking: 3, align: 'center', alpha: 0.45
	});
}

function sysLockup(ctx, st) {
	const p = st.local;
	const e = easeOutExpo(clamp(p * 1.8));
	const cx = OW / 2;
	const cy = OH / 2;

	// ring is drawn in 3D behind; here the type lockup
	const tracking = lerp(52, 34, e);
	const alpha = smoothstep(clamp(p * 2.2));

	text(ctx, 'AUREUM', cx, cy - 16, {
		size: 108, family: SERIF, tracking, align: 'center', alpha: 0.97 * alpha
	});
	line(ctx, cx - 260, cy + 52, cx + 260, cy + 52, COL.brass, 0.5 * alpha);
	text(ctx, st.shot.label || '', cx, cy + 92, {
		size: 11, tracking: 10, align: 'center', alpha: 0.6 * alpha
	});

	// small diamond
	ctx.save();
	ctx.translate(cx, cy + 52);
	ctx.rotate(Math.PI / 4);
	ctx.globalAlpha = 0.9 * alpha;
	ctx.fillStyle = COL.brass;
	ctx.fillRect(-3.2, -3.2, 6.4, 6.4);
	ctx.restore();

	// drifting registration numbers
	for (let i = 0; i < 4; i++) {
		const v = hash(i * 4.4) * 0.5;
		text(ctx, pad(Math.round(1000 + v * 8000)), 180, PIC_TOP + 130 + i * 26, {
			size: 9, family: MONO, tracking: 3, alpha: 0.18 * alpha
		});
	}
}

function sysEndcard(ctx, st) {
	const p = easeOutExpo(st.local);
	const cx = OW / 2;
	const cy = OH / 2;

	text(ctx, 'AUREUM', cx, cy - 26, {
		size: 62, family: SERIF, tracking: 22, align: 'center', alpha: 0.9 * p
	});
	line(ctx, cx - 130, cy + 22, cx + 130, cy + 22, COL.brass, 0.45 * p);

	text(ctx, st.shot.text || 'MMXXVI', cx, cy + 68, {
		size: 13, family: MONO, tracking: 10, align: 'center', alpha: 0.6 * p
	});
	text(ctx, 'A FILM MADE ENTIRELY OF CODE', cx, cy + 108, {
		size: 9.5, tracking: 8, align: 'center', alpha: 0.3 * p
	});
}

/* ------------------------------------------------------------------ */

const SYSTEMS = {
	void: sysVoid,
	rules: sysRules,
	grid: sysGrid,
	wordmark: sysWordmark,
	counter: sysCounter,
	flash: sysFlash,
	hud: sysHud,
	bars: sysBars,
	metric: sysMetric,
	typeSlam: sysTypeSlam,
	typeSlice: sysTypeSlice,
	typeStack: sysTypeStack,
	invert: sysInvert,
	glitch: sysGlitch,
	field: sysField,
	lockup: sysLockup,
	endcard: sysEndcard
};

export function createOverlay() {
	const canvas = document.createElement('canvas');
	canvas.width = OW;
	canvas.height = OH;
	const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

	let lastFrame = -1;

	function draw(st) {
		if (st.frame === lastFrame) return false;
		lastFrame = st.frame;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalAlpha = 1;
		ctx.clearRect(0, 0, OW, OH);

		const ink = st.invert === 1;
		const fn = SYSTEMS[st.shot.kind];

		ctx.save();
		if (fn) fn(ctx, { ...st, totalShots: st.totalShots });
		ctx.restore();

		// chrome sits above every system except full-bleed flashes
		if (st.shot.kind !== 'flash') {
			chrome(ctx, { ...st, totalShots: st.totalShots }, ink);
		}

		return true;
	}

	return { canvas, ctx, draw };
}
