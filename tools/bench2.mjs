import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
for (const f of readdirSync('assets/fonts')) GlobalFonts.registerFromPath(`assets/fonts/${f}`, f.replace('.ttf', ''));

const W = 1920, H = 1080;
const mk = (w, h) => { const c = createCanvas(w, h); return [c, c.getContext('2d')]; };
const [main, ctx] = mk(W, H);
const [bloomA, ba] = mk(480, 270);
const [bloomB, bb] = mk(240, 135);
const [ca, cac] = mk(W, H);
const sp = createCanvas(128, 128);
const spc = sp.getContext('2d');
const g = spc.createRadialGradient(64, 64, 0, 64, 64, 64);
g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
spc.fillStyle = g; spc.fillRect(0, 0, 128, 128);

function scene(i) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#04050a'; ctx.fillRect(0, 0, W, H);
  // tunnel lines
  ctx.strokeStyle = 'rgba(120,240,255,0.35)'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2 + i * 0.01;
    ctx.moveTo(960 + Math.cos(a) * 60, 540 + Math.sin(a) * 34);
    ctx.lineTo(960 + Math.cos(a) * 1600, 540 + Math.sin(a) * 900);
  }
  ctx.stroke();
  // rings
  ctx.lineWidth = 2;
  for (let k = 0; k < 40; k++) {
    const z = ((k / 40) + i * 0.004) % 1;
    const r = 20 + Math.pow(z, 2.5) * 1800;
    ctx.strokeStyle = `rgba(200,255,255,${(1 - z) * 0.5})`;
    ctx.beginPath(); ctx.ellipse(960, 540, r, r * 0.56, 0, 0, 6.2832); ctx.stroke();
  }
  // sprites
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 1500; k++) {
    const x = (k * 137.5 + i * 3) % W, y = (k * 71.3) % H;
    ctx.drawImage(sp, x, y, 40, 40);
  }
  ctx.globalCompositeOperation = 'source-over';
  // text
  ctx.globalCompositeOperation = 'lighter';
  ctx.font = '400 260px Anton'; ctx.fillStyle = '#fff'; ctx.fillText('FORM', 300, 700);
  ctx.globalCompositeOperation = 'source-over';
}

function post() {
  // bloom
  ba.clearRect(0, 0, 480, 270);
  ba.filter = 'blur(6px)';
  ba.drawImage(main, 0, 0, 480, 270);
  ba.filter = 'none';
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5; ctx.drawImage(bloomA, 0, 0, W, H);
  bb.clearRect(0, 0, 240, 135);
  bb.filter = 'blur(10px)'; bb.drawImage(main, 0, 0, 240, 135); bb.filter = 'none';
  ctx.globalAlpha = 0.35; ctx.drawImage(bloomB, 0, 0, W, H);
  // chromatic aberration
  cac.clearRect(0, 0, W, H); cac.drawImage(main, 0, 0);
  cac.globalCompositeOperation = 'multiply'; cac.fillStyle = '#ff0000'; cac.fillRect(0, 0, W, H);
  cac.globalCompositeOperation = 'source-over';
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.6; ctx.drawImage(ca, 8, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

const N = 20;
let total = 0;
for (let i = 0; i < N; i++) {
  const t0 = performance.now();
  scene(i); post();
  const t1 = performance.now();
  const d = main.data(); // raw RGBA?
  const t2 = performance.now();
  total += t1 - t0;
  if (i === 0) console.log('data() type', d.constructor.name, d.length, 'readback ms', (t2 - t1).toFixed(2));
}
console.log('avg draw+post', (total / N).toFixed(2), 'ms/frame  =>', (total / N * 60 / 1000).toFixed(2), 's per 1s of video');

// pipeline encode test
const ff = spawn('node_modules/@ffmpeg-installer/linux-x64/ffmpeg', ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1920x1080', '-r', '60', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '/tmp/test.mp4'], { stdio: ['pipe', 'ignore', 'inherit'] });
const t0 = performance.now();
for (let i = 0; i < 120; i++) {
  scene(i); post();
  const buf = Buffer.from(main.data());
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
console.log('120 frames encoded in', ((performance.now() - t0) / 1000).toFixed(1), 's');
