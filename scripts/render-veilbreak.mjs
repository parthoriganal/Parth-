#!/usr/bin/env node
/**
 * scripts/render-veilbreak.mjs — the film's camera negative.
 *
 * VEILBREAK is a pure function of story time: `?capture=1` stops the clock and
 * exposes `window.VEILBREAK.paintAt(t)`, which paints exactly that frame and
 * nothing else. So the browser is only ever used as a rasteriser — frame 1200
 * is identical whether it was painted after frame 1199 or on its own.
 *
 *   node scripts/render-veilbreak.mjs --mode stills
 *   node scripts/render-veilbreak.mjs --mode video --fps 24 --width 1600 --height 900
 *   node scripts/render-veilbreak.mjs --mode stills --times 0,23,90
 *
 * Needs Playwright + its Chromium (`npm i --no-save playwright &&
 * npx playwright install --with-deps chromium`) and ffmpeg for --mode video.
 * Chromium renders WebGL on the CPU through SwiftShader, so no GPU is required.
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILM_DIR = path.join(ROOT, 'veilbreak');
const OUT_DIR = path.join(ROOT, 'out');

/* ── args ────────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const MODE = arg('mode', 'stills');
const WIDTH = Number(arg('width', '1920'));
const HEIGHT = Number(arg('height', '1080'));
const FPS = Number(arg('fps', '24'));
const CRF = String(arg('crf', '19'));
const OUT_NAME = arg('name', 'veilbreak');
const TIMES = arg('times', '1,6,12,18,23,28,34,40,46,52,58,61,62.4,64.5,70,78,84,88,92')
  .split(',')
  .map(Number)
  .filter((n) => Number.isFinite(n));

/* ── static server (ES modules need the right content types) ─────────────── */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

function startServer(dir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const file = path.join(dir, urlPath === '/' ? 'index.html' : urlPath);
      if (!file.startsWith(dir)) {
        res.writeHead(403);
        return res.end('forbidden');
      }
      fs.readFile(file, (err, buf) => {
        if (err) {
          res.writeHead(404, { 'content-type': 'text/plain' });
          return res.end('not found');
        }
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(buf);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

/* ── ffmpeg ──────────────────────────────────────────────────────────────── */

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stdout.on('data', (d) => process.stdout.write(`  ${label} ${d}`));
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}\n${err.slice(-1800)}`))));
  });
}

async function hasFfmpeg() {
  return new Promise((resolve) => {
    const c = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    c.on('error', () => resolve(false));
    c.on('close', (code) => resolve(code === 0));
  });
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

const pad = (n) => String(n).padStart(5, '0');

/** Let the compositor present whatever we just painted. */
async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
        setTimeout(resolve, 300);
      })
  );
}

/** Mean/max luminance of the canvas — catches a black or blank frame. */
async function frameStats(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('vb-canvas');
    const probe = document.createElement('canvas');
    probe.width = 64;
    probe.height = 36;
    const ctx = probe.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, 64, 36);
    const data = ctx.getImageData(0, 0, 64, 36).data;
    let sum = 0;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sum += l;
      if (l > max) max = l;
    }
    return { mean: sum / (data.length / 4) / 255, max: max / 255 };
  });
}

/* ── main ────────────────────────────────────────────────────────────────── */

async function main() {
  if (!fs.existsSync(path.join(FILM_DIR, 'index.html'))) {
    console.error('  veilbreak/index.html not found — run from the repository root.');
    process.exit(1);
  }

  const framesDir = path.join(OUT_DIR, 'veilbreak-frames');
  const stillsDir = path.join(OUT_DIR, 'stills');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(MODE === 'video' ? framesDir : stillsDir, { recursive: true });

  const server = await startServer(FILM_DIR);
  const port = server.address().port;

  console.log('\n  VEILBREAK — frame renderer');
  console.log(`  ${WIDTH}×${HEIGHT} · ${MODE}${MODE === 'video' ? ` · ${FPS}fps` : ''} · server :${port}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--force-device-scale-factor=1',
      '--disable-lcd-text',
      '--hide-scrollbars'
    ]
  });

  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });

  const pageErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      pageErrors.push(m.text());
      console.log('  [page error]', m.text());
    }
  });
  page.on('pageerror', (e) => {
    pageErrors.push(e.message);
    console.log('  [page exception]', e.message);
  });

  await page.goto(`http://127.0.0.1:${port}/?capture=1&quality=high`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.VEILBREAK && window.VEILBREAK.ready, null, { timeout: 180000 });

  /* A hidden-attribute bug once left the "needs WebGL" panel covering the
     canvas: the GL buffer was fine and every screenshot was a black page. */
  const stage = await page.evaluate(() => {
    const fallback = document.getElementById('vb-fallback');
    const canvas = document.getElementById('vb-canvas');
    const shown = (node) => !!node && getComputedStyle(node).display !== 'none';
    return {
      fallbackVisible: shown(fallback),
      canvasVisible: shown(canvas),
      unsupported: !!document.querySelector('.vb-root.is-unsupported')
    };
  });
  if (stage.fallbackVisible || stage.unsupported || !stage.canvasVisible) {
    throw new Error(`the stage is obstructed: ${JSON.stringify(stage)}`);
  }

  const duration = await page.evaluate(() => window.VEILBREAK.duration);
  const renderer = await page.evaluate(() => {
    const gl = window.VEILBREAK.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`  story time: ${duration}s · renderer: ${renderer}\n`);

  const paint = (t) => page.evaluate((time) => window.VEILBREAK.paintAt(time).time, t);

  /* ── stills ───────────────────────────────────────────────────────────── */
  if (MODE === 'stills') {
    const samples = [];
    for (const [index, t] of TIMES.entries()) {
      await paint(t);
      await settle(page);
      /* numbered, so a glob sorts them the way the film plays them */
      const file = path.join(stillsDir, `still_${String(index).padStart(2, '0')}_${String(t).replace('.', '_')}s.png`);
      await page.screenshot({ path: file, type: 'png' });
      const stats = await frameStats(page);
      samples.push(stats.max);
      console.log(
        `  t=${String(t).padStart(5)}s  luma mean ${stats.mean.toFixed(3)} max ${stats.max.toFixed(3)}  → ${path.basename(file)}`
      );
    }
    const brightest = Math.max(...samples);

    /* determinism: the same story time must paint byte-identical pixels */
    await paint(23);
    await settle(page);
    const a = await page.screenshot({ type: 'png' });
    await paint(23);
    await settle(page);
    const b = await page.screenshot({ type: 'png' });
    const identical = Buffer.compare(a, b) === 0;
    console.log(`\n  determinism: frame @23s re-painted ${identical ? 'identical' : 'DIFFERENT'}`);

    await browser.close();
    server.close();

    if (pageErrors.length) {
      console.error(`\n  ${pageErrors.length} page error(s) — see above\n`);
      process.exit(1);
    }
    /* The film opens and closes on black on purpose, so darkness is only a
       fault when *nothing* lit up. */
    if (brightest < 0.05) {
      console.error('\n  every frame is black — nothing rendered\n');
      process.exit(1);
    }
    if (!identical) process.exit(1);
    console.log('  stills OK\n');
    return;
  }

  /* ── video ────────────────────────────────────────────────────────────── */
  const total = Math.round(duration * FPS);
  console.log(`  rendering ${total} frames\n`);

  const started = Date.now();
  let brightest = 0;
  let darkSamples = 0;
  let sampleCount = 0;

  for (let frame = 0; frame < total; frame++) {
    await paint(frame / FPS);
    await settle(page);
    await page.screenshot({ path: path.join(framesDir, `frame_${pad(frame)}.png`), type: 'png' });

    if (frame % 48 === 0) {
      const stats = await frameStats(page);
      brightest = Math.max(brightest, stats.max);
      sampleCount++;
      if (stats.max < 0.02) darkSamples++;
      const done = frame + 1;
      const rate = done / ((Date.now() - started) / 1000);
      const eta = Math.round((total - done) / Math.max(rate, 0.01));
      process.stdout.write(
        `\r  frame ${String(done).padStart(5)} / ${total} · ${rate.toFixed(2)} fps · eta ${eta}s · luma ${stats.mean.toFixed(3)}   `
      );
    }
  }
  process.stdout.write('\n');

  await browser.close();
  server.close();

  if (pageErrors.length) {
    console.error(`\n  ${pageErrors.length} page error(s) — see above\n`);
    process.exit(1);
  }
  console.log(
    `\n  ${sampleCount} probes · ${darkSamples} black by design (the film opens and closes on black) · brightest ${brightest.toFixed(3)}`
  );
  if (brightest < 0.05) {
    console.error('  nothing lit up — aborting before encoding\n');
    process.exit(1);
  }

  const mp4 = path.join(OUT_DIR, `${OUT_NAME}_${WIDTH}x${HEIGHT}.mp4`);
  if (!(await hasFfmpeg())) {
    console.log(`\n  ffmpeg not found; ${total} PNGs are in ${path.relative(ROOT, framesDir)}`);
    process.exit(1);
  }

  console.log(`\n  encoding → ${path.relative(ROOT, mp4)}\n`);
  await run(
    'ffmpeg',
    [
      '-y',
      '-framerate', String(FPS),
      '-i', path.join(framesDir, 'frame_%05d.png'),
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
    ],
    'ffmpeg »'
  );

  const size = (fs.statSync(mp4).size / (1024 * 1024)).toFixed(2);
  console.log(`\n  done · ${size} MB · ${((Date.now() - started) / 60000).toFixed(1)} min · ${mp4}\n`);
  fs.rmSync(framesDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('\n  render failed:', err.message, '\n');
  process.exit(1);
});
