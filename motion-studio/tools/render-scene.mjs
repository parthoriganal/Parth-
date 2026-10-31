/**
 * Motion Studio OS — vector renderer
 *
 *   node tools/render-scene.mjs --svg scenes/scene-10-fortune-in-shares.svg \
 *        --out renders/scene-10 --fps 30 --end 7
 *
 * The SVG is the source of truth: it carries a SMIL timeline, so we seek the
 * animation clock (svg.setCurrentTime) and capture exact frames instead of
 * screen-recording. Deterministic, re-renderable, frame-accurate.
 */
import chromium, { inflate } from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : argv[i + 1];
};

const SVG = path.resolve(arg('svg', 'scenes/scene-10-fortune-in-shares.svg'));
const OUT = path.resolve(arg('out', 'renders/out'));
const FPS = parseInt(arg('fps', '30'), 10);
const END = parseFloat(arg('end', '7'));
const START = parseFloat(arg('start', '0'));
const W = parseInt(arg('w', '1920'), 10);
const H = parseInt(arg('h', '1080'), 10);
const STILL_AT = arg('still', null); // e.g. --still 6.5 → single PNG

// only the frame sequence is disposable — stills and sibling renders survive a re-run
await mkdir(OUT, { recursive: true });
if (STILL_AT === null) {
  await rm(join(OUT, 'frames'), { recursive: true, force: true });
  await mkdir(join(OUT, 'frames'), { recursive: true });
}

chromium.setGraphicsMode = false;

// We are not on Amazon Linux 2023, so @sparticuz/chromium skips its shared-lib
// bundle. Unpack it ourselves and point the loader at it.
const AL_LIB = join(tmpdir(), 'al2023', 'lib');
if (!existsSync(AL_LIB)) {
  const { createRequire } = await import('node:module');
  const req = createRequire(import.meta.url);
  const entry = req.resolve('@sparticuz/chromium'); // .../build/index.js
  const pkgRoot = path.dirname(path.dirname(entry));
  await inflate(join(pkgRoot, 'bin', 'al2023.tar.br'));
}
process.env.LD_LIBRARY_PATH = [AL_LIB, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
process.env.FONTCONFIG_PATH ??= join(tmpdir(), 'fonts');

const browser = await puppeteer.launch({
  args: [...chromium.args, `--window-size=${W},${H}`],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.error('  [page error]', m.text()));
await page.goto(pathToFileURL(SVG).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts?.ready);

const seek = (t) =>
  page.evaluate((time) => {
    const svg = document.documentElement;
    svg.pauseAnimations();
    svg.setCurrentTime(time);
  }, t);

if (STILL_AT !== null) {
  const t = parseFloat(STILL_AT);
  await seek(t);
  const file = path.join(OUT, `still_${String(t).replace('.', 'p')}.png`);
  await page.screenshot({ path: file, type: 'png' });
  console.log(`still → ${file}`);
} else {
  const total = Math.max(1, Math.round((END - START) * FPS));
  for (let i = 0; i <= total; i++) {
    const t = START + i / FPS;
    await seek(t);
    const file = path.join(OUT, 'frames', `f${String(i).padStart(5, '0')}.png`);
    await page.screenshot({ path: file, type: 'png' });
    if (i % 30 === 0) process.stdout.write(`\r  frame ${i}/${total}  t=${t.toFixed(2)}s`);
  }
  process.stdout.write(`\r  frame ${total}/${total} done\n`);
}

await browser.close();
