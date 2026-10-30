/**
 * Platform abstraction: the exact same scene code runs in Node (Skia canvas, for
 * frame-exact offline rendering) and in the browser (for live preview).
 */

export const IS_BROWSER = typeof document !== 'undefined';

export const FONTS = [
  { family: 'Anton', file: 'Anton' },
  { family: 'SpaceGrotesk-Light', file: 'SpaceGrotesk-Light' },
  { family: 'SpaceGrotesk-Regular', file: 'SpaceGrotesk-Regular' },
  { family: 'SpaceGrotesk-Medium', file: 'SpaceGrotesk-Medium' },
  { family: 'SpaceGrotesk-SemiBold', file: 'SpaceGrotesk-SemiBold' },
  { family: 'SpaceGrotesk-Bold', file: 'SpaceGrotesk-Bold' },
  { family: 'InstrumentSerif-Regular', file: 'InstrumentSerif-Regular' },
  { family: 'InstrumentSerif-Italic', file: 'InstrumentSerif-Italic' },
  { family: 'JetBrainsMono-Light', file: 'JetBrainsMono-Light' },
  { family: 'JetBrainsMono-Regular', file: 'JetBrainsMono-Regular' },
  { family: 'JetBrainsMono-Medium', file: 'JetBrainsMono-Medium' },
  { family: 'JetBrainsMono-Bold', file: 'JetBrainsMono-Bold' },
];

let makeCanvas;

if (IS_BROWSER) {
  makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };
  const base = new URL('./fonts/', import.meta.url).href;
  await Promise.all(
    FONTS.map(async (f) => {
      try {
        const face = new FontFace(f.family, `url(${base}${f.file}.woff2)`, { weight: '400' });
        await face.load();
        document.fonts.add(face);
      } catch (err) {
        // A missing face must never take the whole reel down — fall back to the
        // browser's default stack and keep rendering.
        console.warn('[parallax] font failed:', f.family, err);
      }
    }),
  );
} else {
  const { createCanvas, GlobalFonts } = await import('@napi-rs/canvas');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const fontDir = join(here, '../../../assets/fonts');
  for (const f of FONTS) {
    const ok = GlobalFonts.registerFromPath(join(fontDir, `${f.file}.ttf`), f.family);
    if (!ok) throw new Error(`font registration failed: ${f.family}`);
  }
  makeCanvas = (w, h) => createCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

/** Create an offscreen surface. `ctx` is a plain CanvasRenderingContext2D. */
export function surface(w, h) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  return { canvas, ctx, w: Math.round(w), h: Math.round(h) };
}

/** Raw RGBA pixels as a Buffer/Uint8ClampedArray (both platforms). */
export function pixels(canvas, ctx, w, h) {
  if (IS_BROWSER) return ctx.getImageData(0, 0, w, h).data;
  return canvas.data();
}
