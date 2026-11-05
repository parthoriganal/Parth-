/** Deterministic Chromium → ffmpeg MP4 export. See README for setup.
 * Usage: node tools/render.cjs --url http://127.0.0.1:8090 --output /path/film.mp4
 * Env: FFMPEG=/path/ffmpeg, CHROMIUM_PATH=/path/chrome (or @sparticuz/chromium).
 * Defaults 960x540, 24fps, 74 sec. WIDTH HEIGHT FPS override these.
 */
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const path=require('node:path');
const fs=require('node:fs');
const argv=process.argv.slice(2);const arg=(n,d)=>argv.includes(n)?argv[argv.indexOf(n)+1]:d;
const width=Number(process.env.WIDTH||960),height=Number(process.env.HEIGHT||540),fps=Number(process.env.FPS||24);
const output=path.resolve(arg('--output','LIGHTFALL.mp4'));
const url=arg('--url','http://127.0.0.1:8090');
async function main(){
 const puppeteer=require('puppeteer-core');let executablePath=process.env.CHROMIUM_PATH,args=['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
 if(!executablePath){let c=require('@sparticuz/chromium');c=c.default||c;executablePath=await c.executablePath();args=c.args;}
 const browser=await puppeteer.launch({executablePath,args,headless:true});
 let encoder;
 try{
 const page=await browser.newPage();await page.setViewport({width,height,deviceScaleFactor:1});
 page.on('pageerror',e=>console.error('BROWSER ERROR',e.message));
 await page.goto(url,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.lightfall,{timeout:120000});
 await page.evaluate(scale=>window.lightfall.setRenderScale(scale),Number(process.env.RAY_SCALE||.4));
 const duration=await page.evaluate(()=>window.lightfall.duration);
 const master=path.resolve(__dirname,'../audio/master.m4a');
 if(!fs.existsSync(master))throw new Error('Missing audio/master.m4a; run tools/mix.sh first.');
 encoder=spawn(process.env.FFMPEG||'ffmpeg',['-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',master,'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','copy','-t',String(duration),'-movflags','+faststart',output]);
 let encodingError='';encoder.stderr.on('data',d=>encodingError=(encodingError+d).slice(-4000));
 encoder.on('error',e=>console.error(e));
 const exit=once(encoder,'exit');
 const frames=Math.round(duration*fps);
 for(let i=0;i<frames;i++){
 await page.evaluate(t=>window.lightfall.frame(t),i/fps);
 const frame=await page.screenshot({type:'jpeg',quality:93});
 if(!encoder.stdin.write(frame))await once(encoder.stdin,'drain');
 if(i%(fps*2)===0)console.log(`${i}/${frames} frames (${Math.round(i/frames*100)}%)`);
 }
 encoder.stdin.end();const [code]=await exit;
 if(code!==0)throw Error(encodingError);
 console.log('COMPLETE:',output);
 }finally{await browser.close();if(encoder&&encoder.exitCode===null)encoder.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
