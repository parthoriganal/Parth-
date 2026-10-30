// Renders a single hero frame as a poster still: node tools/poster.mjs [time] [out]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Engine } from '../showreel/src/engine.js';
import { FILM } from '../showreel/src/timeline.js';

const t = Number(process.argv[2] ?? 31.2);
const out = process.argv[3] ?? 'out/poster.png';
mkdirSync(dirname(out), { recursive: true });
const engine = new Engine(FILM);
const canvas = engine.render(t).canvas;
writeFileSync(out, await canvas.encode('png'));
console.log(`poster @ ${t}s -> ${out}`);
