// Converts the latin subsets we use from @fontsource WOFF into TTF (for Skia in Node)
// and copies WOFF2 into the preview folder (for the browser build). Same typefaces both sides.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { woffToTtf } from './woff2ttf.mjs';

const FONTS = [
  ['anton', 'anton-latin-400-normal', 'Anton'],
  ['space-grotesk', 'space-grotesk-latin-300-normal', 'SpaceGrotesk-Light'],
  ['space-grotesk', 'space-grotesk-latin-400-normal', 'SpaceGrotesk-Regular'],
  ['space-grotesk', 'space-grotesk-latin-500-normal', 'SpaceGrotesk-Medium'],
  ['space-grotesk', 'space-grotesk-latin-600-normal', 'SpaceGrotesk-SemiBold'],
  ['space-grotesk', 'space-grotesk-latin-700-normal', 'SpaceGrotesk-Bold'],
  ['instrument-serif', 'instrument-serif-latin-400-normal', 'InstrumentSerif-Regular'],
  ['instrument-serif', 'instrument-serif-latin-400-italic', 'InstrumentSerif-Italic'],
  ['jetbrains-mono', 'jetbrains-mono-latin-300-normal', 'JetBrainsMono-Light'],
  ['jetbrains-mono', 'jetbrains-mono-latin-400-normal', 'JetBrainsMono-Regular'],
  ['jetbrains-mono', 'jetbrains-mono-latin-500-normal', 'JetBrainsMono-Medium'],
  ['jetbrains-mono', 'jetbrains-mono-latin-700-normal', 'JetBrainsMono-Bold'],
];

const ttfDir = 'assets/fonts';
const webDir = 'showreel/web/fonts';
mkdirSync(ttfDir, { recursive: true });
mkdirSync(webDir, { recursive: true });

for (const [pkg, base, name] of FONTS) {
  const src = `node_modules/@fontsource/${pkg}/files/${base}.woff`;
  const ttf = woffToTtf(readFileSync(src));
  writeFileSync(join(ttfDir, `${name}.ttf`), ttf);
  copyFileSync(
    `node_modules/@fontsource/${pkg}/files/${base}.woff2`,
    join(webDir, `${name}.woff2`),
  );
  console.log(`${name.padEnd(26)} ${(ttf.length / 1024).toFixed(0)}kb`);
}
