/**
 * Frame-exact offline renderer.
 *
 *   node showreel/render.mjs [--fps=60] [--scale=1] [--start=0] [--end=40]
 *                            [--out=out/parallax.mp4] [--crf=17] [--workers=1]
 *
 * Frames are rendered deterministically from time, then piped as raw RGBA into
 * ffmpeg/x264. A single encoder process is fed in strict frame order.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { Engine } from './src/engine.js';
import { FILM } from './src/timeline.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);

const fps = Number(args.fps ?? FILM.fps);
const scale = Number(args.scale ?? 1);
const start = Number(args.start ?? 0);
const end = Number(args.end ?? FILM.duration);
const out = args.out ?? 'out/parallax.mp4';
const crf = String(args.crf ?? 17);
const preset = args.preset ?? 'medium';
const W = 1920;
const H = 1080;
const OW = Math.round(W * scale);
const OH = Math.round(H * scale);

mkdirSync(dirname(out), { recursive: true });

const engine = new Engine({ ...FILM, fps });

const ff = spawn(
  ffmpegPath.path,
  [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${W}x${H}`,
    '-r', String(fps),
    '-i', '-',
    ...(scale === 1 ? [] : ['-vf', `scale=${OW}:${OH}:flags=lanczos`]),
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', crf,
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.2',
    '-x264-params', 'aq-mode=3',
    '-movflags', '+faststart',
    out,
  ],
  { stdio: ['pipe', 'ignore', 'pipe'] },
);

let ffErr = '';
ff.stderr.on('data', (d) => {
  ffErr += d.toString();
  if (ffErr.length > 40000) ffErr = ffErr.slice(-20000);
});

const total = Math.round((end - start) * fps);
console.log(`rendering ${total} frames  ${OW}x${OH} @ ${fps}fps -> ${out}`);
const t0 = Date.now();
let written = 0;

for (let i = 0; i < total; i++) {
  const t = start + i / fps;
  engine.render(t);
  const buf = Buffer.from(engine.main.canvas.data());
  if (!ff.stdin.write(buf)) {
    await new Promise((r) => ff.stdin.once('drain', r));
  }
  written++;
  if (i % 30 === 0 || i === total - 1) {
    const el = (Date.now() - t0) / 1000;
    const eta = (el / written) * (total - written);
    process.stdout.write(
      `\r  frame ${String(i + 1).padStart(5)}/${total}  ${(el / written * 1000).toFixed(0)}ms/f  eta ${eta.toFixed(0)}s   `,
    );
  }
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
const secs = (Date.now() - t0) / 1000;
if (!existsSync(out)) {
  console.error('ffmpeg failed:\n' + ffErr.slice(-4000));
  process.exit(1);
}
console.log(`\n  done in ${secs.toFixed(1)}s  ->  ${resolve(out)}`);
