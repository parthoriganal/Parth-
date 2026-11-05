// THE SIGNAL — deterministic motion-design short, inspired by motion-kit's draw(t) model.
// Uses @napi-rs/canvas and GSAP; FFmpeg turns the generated frames into an MP4.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { gsap } from 'gsap';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';
const W=1280,H=720,FPS=24,DURATION=16, FF=process.env.FFMPEG || 'ffmpeg';
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','Deja');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','DejaBold');
const canvas=createCanvas(W,H),c=canvas.getContext('2d');
const ease=gsap.parseEase('power3.out');
const clamp=x=>Math.max(0,Math.min(1,x));
const ramp=(x,a,b)=>ease(clamp((x-a)/(b-a)));
const lerp=(a,b,x)=>a+(b-a)*x;
const noise=n=>{const x=Math.sin(n*127.17+11.74)*43758.5453;return x-Math.floor(x)};
function line(x1,y1,x2,y2,color,width=1){c.beginPath();c.strokeStyle=color;c.lineWidth=width;c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function txt(s,x,y,size,color,style='Deja',align='left'){c.fillStyle=color;c.textAlign=align;c.font=`${size}px ${style}`;c.fillText(s,x,y)}
function circle(x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}
function bg(t){c.fillStyle='#e8e2d5';c.fillRect(0,0,W,H);for(let i=0;i<180;i++){let x=noise(i*2)*W,y=noise(i*2+1)*H;c.fillStyle='rgba(22,30,27,.065)';c.fillRect(x,y,1.2,1.2)};txt('FIELD NOTES  /  001',72,58,13,'#6b7269','DejaBold');txt('AN ORIGINAL MOTION STUDY',W-72,58,12,'#6b7269','Deja','right');line(72,76,W-72,76,'#a8ada1');}
function draw(t){bg(t);let scene=Math.min(3,Math.floor(t/4)),u=t-scene*4;
if(scene===0){
 txt('A SIGNAL',76,245,84,'#183e37','DejaBold');txt('IN THE',76,338,84,'#183e37','DejaBold');txt('SILENCE.',76,431,84,'#b8442f','DejaBold');
 txt('Every journey begins with a question.',80,490,19,'#5f6f62');
 let x=925,y=360;for(let i=7;i>=1;i--){let r=40+i*38+Math.sin(t*1.2-i*.4)*7;c.beginPath();c.strokeStyle=`rgba(25,66,53,${.055+i*.013})`;c.lineWidth=1.4;c.arc(x,y,r,0,Math.PI*2);c.stroke()};circle(x,y,58,'#bd4c32');circle(x-16,y-17,5,'#f1d9b9');
}
if(scene===1){
 txt('01  /  LISTEN',76,131,14,'#b8442f','DejaBold');txt('THE UNIVERSE',76,210,54,'#183e37','DejaBold');txt('IS NEVER STILL.',76,275,54,'#183e37','DejaBold');txt('A pulse travels across the dark.',78,324,20,'#68776a');
 let x=76,y=430,sw=1128;c.strokeStyle='#8b9c89';c.lineWidth=1.5;c.beginPath();for(let i=0;i<=260;i++){let px=x+i*sw/260;let env=Math.exp(-Math.pow((i/260-(u*.18+.12))*6,2));let py=y+Math.sin(i*.24-t*5)*env*85+Math.sin(i*.6+t)*4;c.lineTo(px,py)}c.stroke();
 line(76,530,1204,530,'#b3b9ac');txt('TRANSMISSION',76,560,12,'#738076','DejaBold');txt('FREQUENCY  /  UNKNOWN',1204,560,12,'#738076','Deja','right');
}
if(scene===2){
 txt('02  /  FOLLOW',76,131,14,'#b8442f','DejaBold');txt('LOOK CLOSER.',76,205,52,'#183e37','DejaBold');txt('A small idea can move a world.',78,250,20,'#68776a');
 let x=820,y=400,r=lerp(112,150,ramp(u,0,3.8));circle(x,y,r,'#244b3d');c.save();c.translate(x,y);c.rotate(-.35);for(let i=0;i<5;i++){c.beginPath();c.ellipse(0,0,r*1.45+i*16,r*.4+i*5,0,0,Math.PI*2);c.strokeStyle=i===2?'#b44d35':'rgba(36,75,61,.35)';c.lineWidth=i===2?3:1;c.stroke()}c.restore();
 let a=t*.65;circle(x+Math.cos(a)*r*1.5,y+Math.sin(a)*r*.6,7,'#bd4c32');
 for(let i=0;i<14;i++)line(76+i*24,580,76+i*24,580-(i%5===0?18:8),'#88998a');txt('DISTANCE IS A BEGINNING.',76,635,14,'#62776b','DejaBold');
}
if(scene===3){
 let p=ramp(u,0,1);c.save();c.globalAlpha=p;txt('THE',W/2,252,38,'#b8442f','DejaBold','center');txt('SIGNAL',W/2,388,135,'#183e37','DejaBold','center');line(430,431,850,431,'#a2aa9d');txt('KEEP LOOKING UP.',W/2,483,19,'#68776a','DejaBold','center');c.restore();
 let x=W/2,y=555;for(let i=0;i<9;i++)circle(x+(i-4)*24,y, i===4?4:2,i===4?'#b8442f':'#a5b2a5');
}
// Editorial frame and scene number remain consistent throughout.
line(72,666,W-72,666,'#a8ada1');txt('A FILM MADE OF CODE',72,694,11,'#758477','DejaBold');txt(`${String(scene+1).padStart(2,'0')} / 04`,W-72,694,11,'#758477','DejaBold','right');
// Four-frame transition: a restrained ink-color shutter.
let local=t%4;if(t>0&&local<.20){c.fillStyle=`rgba(19,45,38,${1-local/.20})`;c.fillRect(0,0,W,H)}
}
const sound=process.argv[2],out=process.argv[3]||'signal-film/the-signal.mp4';if(!sound)throw new Error('Pass WAV path');
const args=['-y','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r',`${FPS}`,'-i','-','-i',sound,'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',out];
const ff=spawn(FF,args,{stdio:['pipe','ignore','inherit']});
for(let i=0;i<DURATION*FPS;i++){draw(i/FPS);if(i===FPS*9)writeFileSync('signal-film/still.png', canvas.toBuffer('image/png'));let pixels=c.getImageData(0,0,W,H).data;if(!ff.stdin.write(Buffer.from(pixels.buffer,pixels.byteOffset,pixels.byteLength)))await once(ff.stdin,'drain')}
ff.stdin.end();const [code]=await once(ff,'close');if(code!==0)process.exit(code);console.log('Rendered',out);
