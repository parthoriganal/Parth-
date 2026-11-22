/**
 * Visual + behavioural harness for NEON ORBIT.
 *
 * Runs the real page in headless Chromium (SwiftShader WebGL2) and captures
 * screenshots at each station, plus interaction state. Not shipped with the
 * site — dev tooling only.
 *
 *   node neon-orbit/test/visual.mjs            # all stations, desktop
 *   node neon-orbit/test/visual.mjs mobile     # mobile viewport
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../.shots');
mkdirSync(OUT, { recursive: true });

const URL_BASE = process.env.ORBIT_URL || 'http://127.0.0.1:5200/';
const mode = process.argv[2] || 'desktop';

const VIEW = mode === 'mobile'
  ? { width: 412, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { width: 1440, height: 900, deviceScaleFactor: 1 };

const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/tmp/chromium',
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--hide-scrollbars', '--force-device-scale-factor=1',
  ],
  env: { ...process.env, LD_LIBRARY_PATH: '/tmp:/tmp/al2023/lib', FONTCONFIG_PATH: '/tmp/fonts' },
});

const page = await browser.newPage();
await page.setViewport(VIEW);

const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
page.on('requestfailed', r => logs.push(`[REQFAIL] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(URL_BASE, { waitUntil: 'networkidle2', timeout: 60000 });

// wait for the boot element to be removed, not for a guessed duration
await page.waitForFunction(() => !document.getElementById('boot'), { timeout: 30000 });
await new Promise(r => setTimeout(r, 900));

const bootGone = await page.evaluate(() => !document.getElementById('boot'));
console.log('boot removed:', bootGone);

async function shot(name, wait = 900) {
  await new Promise(r => setTimeout(r, wait));
  await page.screenshot({ path: resolve(OUT, `${mode}-${name}.png`) });
}

// ——— station by station
await shot('01-hero', 1200);

const sections = await page.evaluate(() =>
  [...document.querySelectorAll('.station')].map(s => ({
    id: s.id, top: s.offsetTop, h: s.offsetHeight,
  }))
);
console.log('sections:', sections.map(s => `${s.id}@${s.top}+${s.h}`).join(' '));

async function scrollTo(y, wait = 1200) {
  // a jump plus a synthetic scroll event: the world reads scroll on rAF, so
  // this lands exactly and still gives the camera time to settle
  await page.evaluate(v => window.scrollTo(0, v), Math.round(y));
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
  await new Promise(r => setTimeout(r, wait));
}

const byId = Object.fromEntries(sections.map(s => [s.id, s]));

// FIELD: three points through the scroll so we can see the dispersion
await scrollTo(byId.field.top * 1 + 200);
await shot('02-field-early', 700);
await scrollTo(byId.field.top + byId.field.h * 0.62);
await shot('02-field-mid', 700);
await scrollTo(byId.field.top + byId.field.h * 0.95);
await shot('02-field-late', 700);

// LAB
await scrollTo(byId.lab.top + byId.lab.h * 0.30);
await shot('03-lab', 1200);

// the orbs should be on screen and tracking their cells
const labState = await page.evaluate(() => ({
  orbsActive: window.__NEON?.state?.world ? true : false,
  cells: window.__NEON?.state?.cells?.length,
  stats: window.__NEON?.stats,
  labHex: document.getElementById('labHex')?.textContent,
}));
console.log('lab:', JSON.stringify(labState));

// click a swatch and confirm the readout changes + toast appears
await page.evaluate(() => document.querySelectorAll('.orb-cell')[3]?.click());
await new Promise(r => setTimeout(r, 400));
const afterClick = await page.evaluate(() => ({
  hex: document.getElementById('labHex')?.textContent,
  toast: document.getElementById('toast')?.textContent,
  toastOn: document.getElementById('toast')?.classList.contains('is-on'),
}));
console.log('orb click:', JSON.stringify(afterClick));

// SIGNAL — and disturb the field
await scrollTo(byId.signal.top + 60);
await shot('04-signal', 1200);
const rig = await page.$('#wavefield');
const box = await rig.boundingBox();
await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
await page.mouse.down();
for (let i = 0; i < 18; i++) {
  await page.mouse.move(box.x + box.width * (0.3 + i * 0.025), box.y + box.height * (0.5 + Math.sin(i / 2) * 0.18));
  await new Promise(r => setTimeout(r, 26));
}
await page.mouse.up();
await shot('04-signal-disturbed', 380);
const waveEnergy = await page.evaluate(() => window.__NEON?.state?.wave?.energy);
console.log('wave energy after drag:', waveEnergy);

// EXIT
await scrollTo(byId.exit.top + 40);
await shot('05-exit', 1100);

// back to top for the final full-page proof
await scrollTo(0, 900);

// ——— responsive sanity: nothing overflows horizontally
const overflow = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  offenders: [...document.querySelectorAll('body *')]
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > window.innerWidth + 2 || r.left < -2);
    })
    .slice(0, 8)
    .map(el => `${el.tagName}.${(el.className || '').toString().split(' ')[0]} → ${Math.round(el.getBoundingClientRect().left)}..${Math.round(el.getBoundingClientRect().right)}`),
}));
console.log('overflow:', JSON.stringify(overflow));

// ——— reduced motion path
const page2 = await browser.newPage();
await page2.setViewport(VIEW);
await page2.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page2.goto(URL_BASE, { waitUntil: 'networkidle2', timeout: 60000 });
await page2.waitForFunction(() => !document.getElementById('boot'), { timeout: 30000 });
await new Promise(r => setTimeout(r, 600));
const rm = await page2.evaluate(() => ({
  reduced: document.documentElement.dataset.reduced,
  motionState: window.__NEON?.state?.motion,
  btn: document.getElementById('btnMotionLabel')?.textContent,
}));
console.log('reduced-motion:', JSON.stringify(rm));
await page2.screenshot({ path: resolve(OUT, `${mode}-06-reduced.png`) });

console.log('\n--- console ---');
console.log(logs.length ? logs.join('\n') : '(clean)');

await browser.close();
