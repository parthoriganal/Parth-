// Render stills at chosen times: node tools/still.mjs 0.2 0.5 1.2 ...
import { mkdirSync, writeFileSync } from 'node:fs';
import { Engine } from '../showreel/src/engine.js';
import { FILM } from '../showreel/src/timeline.js';

const times = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
const list = times.length ? times : [0.3, 0.6, 1.0, 1.4, 2.2, 2.9];
mkdirSync('out/stills', { recursive: true });

const engine = new Engine(FILM);
for (const t of list) {
  const t0 = performance.now();
  const canvas = engine.render(t).canvas;
  const ms = performance.now() - t0;
  const file = `out/stills/t${t.toFixed(2).padStart(5, '0')}.png`;
  writeFileSync(file, await canvas.encode('png'));
  console.log(`${file}  ${ms.toFixed(0)}ms`);
}
