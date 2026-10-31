import { chromium } from 'playwright';
import Chromium from '@sparticuz/chromium';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
const ffmpeg=execFileSync('python',['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
// The Chromium npm package includes NSS for Lambda; extract it for Linux runners too.
if(process.platform==='linux' && !existsSync('/tmp/maison-browser/lib/libnss3.so')){mkdirSync('/tmp/maison-browser',{recursive:true});writeFileSync('/tmp/maison-browser/al2023.tar',brotliDecompressSync(readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br')));execFileSync('tar',['xf','/tmp/maison-browser/al2023.tar','-C','/tmp/maison-browser']);}
const browser=await chromium.launch({env:{...process.env,LD_LIBRARY_PATH:`/tmp/maison-browser/lib:${process.env.LD_LIBRARY_PATH||''}`},executablePath:await Chromium.executablePath(),args:[...Chromium.args,'--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],headless:true});
const page=await browser.newPage({viewport:{width:1400,height:1000}});page.on('pageerror',e=>console.error('PAGE ERROR',e));await page.goto('http://localhost:5173/?render');await page.waitForFunction(()=>window.filmReady,null,{timeout:60000});
mkdirSync('public/films',{recursive:true});
const encoder=spawn(ffmpeg,['-y','-f','image2pipe','-vcodec','png','-framerate','24','-i','pipe:0','-i','public/audio/legacy-master.mp3','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t','22','-movflags','+faststart','public/films/maison-legacy.mp4'],{stdio:['pipe','ignore','pipe']});let errors='';encoder.stderr.on('data',d=>errors+=d);encoder.stdin.on('error',e=>console.error(e));
for(let i=0;i<528;i++){
 const data=await page.evaluate(t=>{window.renderFrame(t);return document.querySelector('#film').toDataURL('image/png').split(',')[1];},i/24);
 const buf=Buffer.from(data,'base64');if(i===50)writeFileSync('public/films/maison-poster.png',buf);if(!encoder.stdin.write(buf))await new Promise(r=>encoder.stdin.once('drain',r));if(i%48===0)console.log(`Rendered ${i}/528`);
}
encoder.stdin.end();await new Promise((resolve,reject)=>encoder.on('close',code=>code?reject(new Error(errors)):resolve()));
await page.evaluate(()=>window.renderFrame(2));await browser.close();console.log('Finished: public/films/maison-legacy.mp4');
