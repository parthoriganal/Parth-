import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { readdirSync } from 'node:fs';

for (const f of readdirSync('assets/fonts')) {
  GlobalFonts.registerFromPath(`assets/fonts/${f}`, f.replace('.ttf', ''));
}
console.log('families:', GlobalFonts.families.map((f) => f.family).join(', '));

const W = 1920, H = 1080;
const c = createCanvas(W, H);
const ctx = c.getContext('2d');
const t = (label, fn, n = 10) => {
  fn();
  const t0 = performance.now();
  for (let i = 0; i < n; i++) fn();
  const ms = (performance.now() - t0) / n;
  console.log(label.padEnd(38), ms.toFixed(2) + 'ms');
};

// glow sprite
const sp = createCanvas(128, 128);
const spc = sp.getContext('2d');
const g = spc.createRadialGradient(64, 64, 0, 64, 64, 64);
g.addColorStop(0, 'rgba(255,255,255,1)');
g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
g.addColorStop(1, 'rgba(255,255,255,0)');
spc.fillStyle = g;
spc.fillRect(0, 0, 128, 128);

t('clear full', () => { ctx.clearRect(0, 0, W, H); });
t('fill full', () => { ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H); });
t('3000 sprites lighter', () => {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3000; i++) {
    const x = (i * 137.5) % W, y = (i * 71.3) % H;
    ctx.drawImage(sp, x - 12, y - 12, 24, 24);
  }
  ctx.globalCompositeOperation = 'source-over';
});
t('2000 sprite 60px', () => {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2000; i++) ctx.drawImage(sp, (i * 137.5) % W, (i * 71.3) % H, 60, 60);
  ctx.globalCompositeOperation = 'source-over';
});
t('5000-segment single path', () => {
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  for (let i = 0; i < 5000; i++) {
    const x = (i * 37.1) % W, y = (i * 91.7) % H;
    ctx.moveTo(x, y); ctx.lineTo(x + 30, y + 10);
  }
  ctx.stroke();
});
t('drawImage self full', () => { ctx.drawImage(c, 0, 0); });
t('drawImage scaled full 960', () => { ctx.drawImage(c, 0, 0, 960, 540); });
const small = createCanvas(480, 270); const sctx = small.getContext('2d');
t('blur small 480', () => { sctx.filter = 'blur(8px)'; sctx.drawImage(c, 0, 0, 480, 270); sctx.filter = 'none'; });
t('blur full 1920', () => { ctx.filter = 'blur(6px)'; ctx.drawImage(c, 0, 0); ctx.filter = 'none'; });
t('text big Anton', () => {
  ctx.font = '400 300px Anton'; ctx.fillStyle = '#fff'; ctx.fillText('SIGNAL', 100, 700);
});
t('text big + glow 60px blur', () => {
  ctx.font = '400 300px Anton'; ctx.fillStyle = '#fff';
  ctx.filter = 'blur(40px)'; ctx.fillText('SIGNAL', 100, 700); ctx.filter = 'none';
});
t('multiply tint full', () => {
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#f00'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
});
t('screen draw full x2', () => {
  ctx.globalCompositeOperation = 'screen'; ctx.drawImage(c, 10, 0); ctx.drawImage(c, -10, 0);
  ctx.globalCompositeOperation = 'source-over';
});
t('getImageData full', () => { c.getContext('2d').getImageData(0, 0, W, H); }, 3);
t('encode png', () => { c.encode('png'); }, 3);

// raw to buffer
const t0 = performance.now();
const id = ctx.getImageData(0, 0, W, H);
console.log('raw copy ms', (performance.now() - t0).toFixed(2), 'bytes', id.data.length);
