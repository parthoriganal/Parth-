import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const PAGE_URL = process.env.WATCH_URL ?? 'http://127.0.0.1:8080/luxury-watch/';
const out = process.env.SHOT_DIR ?? new URL('.', import.meta.url).pathname;

const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage', '--no-sandbox'],
  executablePath: await chromium.executablePath(), headless: true,
  defaultViewport: { width: 960, height: 700, deviceScaleFactor: 1 },
  env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib:/tmp' },
});
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(PAGE_URL, { waitUntil: 'networkidle0', timeout: 90000 });
await new Promise(r => setTimeout(r, 4000));

const click = async (sel) => { await page.click(sel); await new Promise(r => setTimeout(r, 900)); };
for (const id of ['rose', 'white', 'platinum', 'yellow']) await click(`[data-case="${id}"]`);
for (const id of ['salmon', 'midnight', 'champagne', 'obsidian']) await click(`[data-dial="${id}"]`);
for (const id of ['black', 'navy', 'oxblood', 'cognac']) await click(`[data-strap="${id}"]`);
await click('#btn-explode');
await click('#btn-explode');
await click('#btn-movement');
await click('#btn-movement');
await click('#btn-rotate');
await click('#btn-rotate');
await click('#btn-mood');
await click('#btn-mood');
await click('#btn-mood');

const state = await page.evaluate(() => {
  const a = window.__aureum;
  return {
    body: document.body.className,
    caseLabel: document.getElementById('caseName').textContent,
    dialLabel: document.getElementById('dialName').textContent,
    strapLabel: document.getElementById('strapName').textContent,
    specCase: document.getElementById('spec-case').textContent,
    moodBtn: document.getElementById('btn-mood').textContent,
    fragmentCount: a.renderer.info.render.calls,
    triangles: a.renderer.info.render.triangles,
    strapsVisible: a.watch.parts.strapGroup.visible,
    strapOpacity: a.materials.leather.opacity,
    explode: a.state.explode,
  };
});
console.log('STATE', JSON.stringify(state, null, 2));
console.log('ERRORS', errors.length ? errors : 'none');

// mobile layout screenshot
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.evaluate(() => { const a = window.__aureum; a.orbit.setTarget(0, 0, -3); a.orbit.setPose({ theta: 0.36, phi: 1.2, radius: 105 }, 0); });
await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: `${out}/mobile.png` });
await browser.close();
if (errors.length) process.exit(1);
