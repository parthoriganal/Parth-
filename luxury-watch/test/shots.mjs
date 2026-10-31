import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const PAGE_URL = process.env.WATCH_URL ?? 'http://127.0.0.1:8080/luxury-watch/';
const out = process.env.SHOT_DIR ?? new URL('.', import.meta.url).pathname;
const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage', '--no-sandbox'],
  executablePath: await chromium.executablePath(), headless: true,
  defaultViewport: { width: 1280, height: 820, deviceScaleFactor: 1 },
  env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib:/tmp' },
});
const page = await browser.newPage();
page.on('console', m => { if (m.type() !== 'log') console.log('CONSOLE', m.type(), m.text()); });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto(PAGE_URL, { waitUntil: 'networkidle0', timeout: 90000 });
await new Promise(r => setTimeout(r, 5000));
await page.evaluate(() => { const a = window.__aureum; a.orbit.autoRotate = false; a.orbit.setTarget(0, 0, -5); a.orbit.setPose({ theta: 0.36, phi: 1.13, radius: 118 }, 0); });
await new Promise(r => setTimeout(r, 1600));
await page.screenshot({ path: `${out}/hero.png` });

await page.evaluate(() => {
  const a = window.__aureum;
  a.state.strap = a.state.strapTarget = 0; a.watch.setStrapOpacity(0);
  a.orbit.setTarget(0, 0, -4);
  a.orbit.setPose({ theta: Math.PI - 0.42, phi: 1.02, radius: 72 }, 0);
});
await new Promise(r => setTimeout(r, 1600));
await page.screenshot({ path: `${out}/movement.png` });

await page.evaluate(() => {
  const a = window.__aureum;
  a.state.strap = a.state.strapTarget = 1; a.watch.setStrapOpacity(1);
  a.orbit.setTarget(0, 0, -5);
  a.orbit.setPose({ theta: 0.4, phi: 1.18, radius: 120 }, 0);
});
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await new Promise(r => setTimeout(r, 2200));
await page.screenshot({ path: `${out}/mobile.png` });
console.log('done');
await browser.close();
