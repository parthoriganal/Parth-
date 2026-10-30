#!/usr/bin/env node
/**
 * scripts/render.mjs — turns the deterministic timeline into an actual MP4.
 *
 * The browser is only used as a rasteriser: it seeks to frame N, paints it,
 * and hands back a PNG. Because nothing in the film depends on elapsed time,
 * frame 517 is identical whether it was rendered in sequence or on its own.
 *
 *   node scripts/render.mjs                 # full 864 frames → out/aureum.mp4
 *   node scripts/render.mjs --scale 0.5     # half-res draft
 *   node scripts/render.mjs --from 300 --to 420
 *   node scripts/render.mjs --still 512     # single frame PNG
 */

import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

/* ------------------------------ args ------------------------------ */

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const SCALE = Number(arg('scale', '1'));
const CRF = String(arg('crf', '17'));
const FROM = Number(arg('from', '0'));
const TO = Number(arg('to', '-1'));
const STILL = arg('still', null);
const OUT_DIR = path.resolve(ROOT, arg('out', 'out'));
const FRAMES_DIR = path.join(OUT_DIR, 'frames');
const FPS = 24;

/* --------------------------- static server -------------------------- */

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2'
};

function startServer(dir, port = 0) {
	return new Promise((resolve, reject) => {
		const server = http.createServer((req, res) => {
			const url = decodeURIComponent((req.url || '/').split('?')[0]);
			let file = path.join(dir, url === '/' ? 'index.html' : url);
			if (!file.startsWith(dir)) {
				res.writeHead(403);
				return res.end('forbidden');
			}
			fs.readFile(file, (err, buf) => {
				if (err) {
					// SPA fallback
					fs.readFile(path.join(dir, 'index.html'), (e2, html) => {
						if (e2) {
							res.writeHead(404);
							return res.end('not found');
						}
						res.writeHead(200, { 'content-type': MIME['.html'] });
						res.end(html);
					});
					return;
				}
				res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
				res.end(buf);
			});
		});
		server.on('error', reject);
		server.listen(port, '127.0.0.1', () => resolve(server));
	});
}

/* ------------------------------ ffmpeg ------------------------------ */

function run(cmd, args, label) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let err = '';
		child.stdout.on('data', (d) => process.stdout.write(`  ${label} ${d}`));
		child.stderr.on('data', (d) => { err += d.toString(); });
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${cmd} exited ${code}\n${err.slice(-1600)}`));
		});
	});
}

function hasFfmpeg() {
	return new Promise((resolve) => {
		const c = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
		c.on('error', () => resolve(false));
		c.on('close', (code) => resolve(code === 0));
	});
}

/* ------------------------------- main ------------------------------- */

async function main() {
	if (!fs.existsSync(path.join(DIST, 'index.html'))) {
		console.error('  dist/ not found — run `npm run build` first.');
		process.exit(1);
	}

	fs.mkdirSync(FRAMES_DIR, { recursive: true });

	const width = Math.round(1920 * SCALE);
	const height = Math.round(1080 * SCALE);

	const server = await startServer(DIST);
	const port = server.address().port;
	console.log(`\n  AUREUM — frame renderer`);
	console.log(`  ${width}×${height} @ ${FPS}fps · server :${port}\n`);

	const launchArgs = [
			'--use-gl=angle',
			'--use-angle=swiftshader',
			'--enable-unsafe-swiftshader',
			'--no-sandbox',
			'--disable-dev-shm-usage',
		'--force-device-scale-factor=1',
		'--disable-lcd-text',
		'--ignore-gpu-blocklist',
		'--enable-webgl',
		'--disable-gpu-sandbox'
	];

	let browser;
	try {
		// full Chromium in new headless mode gives the most reliable SwiftShader WebGL2
		browser = await chromium.launch({ headless: true, channel: 'chromium', args: launchArgs });
	} catch {
		browser = await chromium.launch({ headless: true, args: launchArgs });
	}

	const page = await browser.newPage({
		viewport: { width, height },
		deviceScaleFactor: 1
	});

	page.on('console', (m) => {
		if (m.type() === 'error') console.log('  [page error]', m.text());
	});
	page.on('pageerror', (e) => console.log('  [page exception]', e.message));

	await page.goto(`http://127.0.0.1:${port}/?render=1`, { waitUntil: 'load' });
	await page.waitForFunction(() => window.__film && window.__film.ready, null, { timeout: 120000 });

	const total = await page.evaluate(() => window.__film.frames);
	const shots = await page.evaluate(() => window.__film.shots);
	console.log(`  timeline: ${total} frames · ${shots} shots\n`);

	// --- runtime diagnostics, written to out/diag.txt ------------------
	await page.evaluate((i) => window.__film.seek(i), 96);
	const stats = await page.evaluate(() => {
		const c = document.querySelector('#film');
		const gl = c.getContext('webgl2') || c.getContext('webgl');
		let renderer = null, version = null, mean = -1, max = -1;
		if (gl) {
			const dbg = gl.getExtension('WEBGL_debug_renderer_info');
			renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
			version = gl.getParameter(gl.VERSION);
			try {
				const w = c.width, h = c.height;
				const px = new Uint8Array(w * h * 4);
				gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
				let sum = 0, n = 0, m = 0;
				for (let i = 0; i < px.length; i += 4 * 101) {
					const v = (px[i] + px[i + 1] + px[i + 2]) / 3;
					sum += v; n++; if (v > m) m = v;
				}
				mean = +(sum / n).toFixed(2);
				max = m;
			} catch (e) {
				mean = -2;
			}
		}
		return { hasWebGL: !!gl, renderer, version, meanLuma: mean, maxLuma: max, canvas: [c.width, c.height] };
	});

	const diag = {
		at: new Date().toISOString(),
		context: stats,
		frames: total,
		shots,
		ffmpeg: (() => {
			const r = spawnSync('bash', ['-lc', 'command -v ffmpeg || echo missing'], { encoding: 'utf8' });
			return (r.stdout || 'missing').trim();
		})()
	};
	fs.mkdirSync(OUT_DIR, { recursive: true });
	fs.writeFileSync(path.join(OUT_DIR, 'diag.txt'), JSON.stringify(diag, null, 2));
	console.log('  diagnostics:', JSON.stringify(diag.context));

	const canvas = page.locator('#film');

	/* --- single still --- */
	if (STILL !== null) {
		const f = Math.max(0, Math.min(total - 1, Number(STILL)));
		await page.evaluate((i) => window.__film.seek(i), f);
		await page.waitForTimeout(120);
		const out = path.join(OUT_DIR, `still_${String(f).padStart(5, '0')}.png`);
		await canvas.screenshot({ path: out });
		console.log(`  wrote ${path.relative(ROOT, out)}\n`);
		await browser.close();
		server.close();
		return;
	}

	/* --- sequence --- */
	const last = TO > 0 ? Math.min(TO, total - 1) : total - 1;
	const first = Math.max(0, Math.min(FROM, last));
	const started = Date.now();

	for (let frame = first; frame <= last; frame++) {
		await page.evaluate((i) => window.__film.seek(i), frame);
		const out = path.join(FRAMES_DIR, `frame_${String(frame).padStart(5, '0')}.png`);
		await canvas.screenshot({ path: out });

		const done = frame - first + 1;
		const span = last - first + 1;

		if (done % 24 === 0 || done === span) {
			const elapsed = (Date.now() - started) / 1000;
			const rate = done / elapsed;
			const eta = Math.round((span - done) / Math.max(rate, 0.01));
			process.stdout.write(
				`\r  frame ${String(frame).padStart(4, ' ')} / ${last}  ·  ${rate.toFixed(2)} fps render  ·  eta ${eta}s    `
			);
		}
	}
	process.stdout.write('\n');

	await browser.close();
	server.close();

	/* --- encode --- */
	const mp4 = path.join(OUT_DIR, `aureum_${width}x${height}.mp4`);

	if (!(await hasFfmpeg())) {
		console.log(`\n  ffmpeg not found. ${last - first + 1} PNGs are in ${path.relative(ROOT, FRAMES_DIR)}`);
		console.log(`  encode with:\n  ffmpeg -framerate ${FPS} -start_number ${first} -i ${path.relative(ROOT, FRAMES_DIR)}/frame_%05d.png -c:v libx264 -preset slow -crf ${CRF} -pix_fmt yuv420p -movflags +faststart ${path.relative(ROOT, mp4)}\n`);
		return;
	}

	console.log(`\n  encoding → ${path.relative(ROOT, mp4)}\n`);

	await run('ffmpeg', [
		'-y',
		'-framerate', String(FPS),
		'-start_number', String(first),
		'-i', path.join(FRAMES_DIR, 'frame_%05d.png'),
		'-c:v', 'libx264',
		'-preset', 'slow',
		'-crf', CRF,
		'-pix_fmt', 'yuv420p',
		'-tune', 'film',
		'-color_primaries', 'bt709',
		'-color_trc', 'bt709',
		'-colorspace', 'bt709',
		'-movflags', '+faststart',
		'-an',
		mp4
	], 'ffmpeg »');

	const size = (fs.statSync(mp4).size / (1024 * 1024)).toFixed(2);
	console.log(`\n  done · ${size} MB · ${((Date.now() - started) / 60000).toFixed(1)} min\n`);

	if (!flag('keep-frames')) {
		fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
		console.log('  frames cleaned (pass --keep-frames to keep them)\n');
	}
}

main().catch((err) => {
	console.error('\n  render failed:', err.message, '\n');
	process.exit(1);
});
