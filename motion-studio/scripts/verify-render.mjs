import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {rm} from 'node:fs/promises';
import {unzipSync} from 'fflate';
import {join} from 'node:path';
import {defaultProject} from '../src/shared/project.js';
import {ROOT,STORAGE} from '../server/assets.mjs';
import {exec,ffmpeg} from '../server/environment.mjs';

const wait=ms=>new Promise(r=>setTimeout(r,ms));
const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
const base=`http://127.0.0.1:${port}`;let logs='';const ids=[];
const server=spawn(process.execPath,[join(ROOT,'server/index.mjs')],{cwd:ROOT,env:{...process.env,PORT:String(port),NODE_ENV:'production',HYPERFRAMES_NO_TELEMETRY:'1',DO_NOT_TRACK:'1'},stdio:['ignore','pipe','pipe']});
for(const stream of [server.stdout,server.stderr])stream.on('data',d=>logs=(logs+d.toString()).slice(-12000));
async function json(url,options){const r=await fetch(base+url,options);const body=await r.json();if(!r.ok)throw new Error(`${r.status}: ${body.error||JSON.stringify(body)}`);return body;}
async function ready(){for(let i=0;i<80;i++){if(server.exitCode!==null)throw Error('Server exited during startup.');try{const s=await json('/api/status');if(s.tools.ready)return;if(s.tools.error)throw Error(s.tools.error);}catch(e){if(!e.cause&&e.message!=='fetch failed')throw e;}await wait(250);}throw Error('Timed out waiting for render environment.');}
async function render(project,engine){
  const {job}=await json('/api/renders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project,engine})});ids.push(job.id);let previous='';
  for(let i=0;i<900;i++){await wait(1000);let current;try{current=(await json(`/api/renders/${job.id}`)).job;}catch(e){if(e.cause)continue;throw e;}
    if(current.phase!==previous){console.log(`  ${engine}: ${current.phase}`);previous=current.phase;}
    if(current.status==='failed')throw Error(current.error);if(current.status==='complete')return current;}
  throw Error('Render timed out.');
}
try{
  await ready();console.log('✓ Chromium, FFmpeg and FFprobe ready');
  const p=defaultProject();p.name='Pipeline verification';p.scenes=[p.scenes[0],p.scenes[2],p.scenes[3],{...p.scenes[3],id:'clock',type:'object-clock'},{...p.scenes[3],id:'globe',type:'object-globe'},{...p.scenes[2],id:'data',type:'infographic',values:[42,73,null]}].map(s=>({...s,duration:1.25}));p.audio.effects=[{...p.audio.effects[0],offset:1.25}];
  const r=await render(p,'remotion');assert.deepEqual([r.metadata.width,r.metadata.height,r.metadata.videoCodec,r.metadata.audioCodec],[1920,1080,'h264','aac']);
  const video=join(STORAGE,'renders',r.id,'final.mp4');await exec(ffmpeg,['-v','error','-xerror','-i',video,'-f','null','-'],{timeout:120000});
  const first=await exec(ffmpeg,['-v','error','-ss','0.8','-i',video,'-frames:v','1','-f','md5','-']);const third=await exec(ffmpeg,['-v','error','-ss','3.2','-i',video,'-frames:v','1','-f','md5','-']);assert.notEqual(first.stdout.trim(),third.stdout.trim(),'rendered scenes should not be identical');
  const response=await fetch(base+r.downloadUrl);assert.equal(response.status,200);assert.ok(Number(response.headers.get('content-length'))>10000);await response.arrayBuffer();console.log('✓ Remotion: image, Motion Canvas, infographic, all three 3D objects, audio mix and validated MP4');
  const h=defaultProject();h.fps=30;h.scenes=[{...h.scenes[0],duration:1.25},{...h.scenes[2],type:'infographic',values:[42,73,null],duration:1.25}];h.audio.effects=[{...h.audio.effects[0],offset:1.25}];
  const hf=await render(h,'hyperframes');assert.deepEqual([hf.metadata.width,hf.metadata.height,hf.metadata.videoCodec,hf.metadata.audioCodec,hf.metadata.fps],[1920,1080,'h264','aac',30]);
  const zip=await fetch(base+'/api/hyperframes/export',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project:h})});assert.equal(zip.status,200);const bytes=Buffer.from(await zip.arrayBuffer());assert.equal(bytes.subarray(0,2).toString(),'PK');const files=unzipSync(bytes);assert.ok(files['index.html']&&files['gsap.min.js']&&files['assets/demo-score.mp3']);assert.match(new TextDecoder().decode(files['index.html']),/id="audio-0"/);console.log('✓ HyperFrames: lint, HTML/GSAP infographic, MP4 and packaged audio');
  if(process.argv.includes('--extended')){const q=defaultProject();q.resolution='4k';q.format='vertical';q.scenes=[{...q.scenes[1],duration:1}];q.audio.effects=[];const v=await render(q,'remotion');assert.deepEqual([v.metadata.width,v.metadata.height],[2160,3840]);console.log('✓ 4K vertical render');}
  console.log('Rendering pipeline verification passed.');
}catch(e){console.error('Verification failed:',e.message,'\nServer log:\n',logs);process.exitCode=1;}finally{server.kill('SIGTERM');await new Promise(r=>{server.once('exit',r);setTimeout(r,3000)});for(const id of ids)await rm(join(STORAGE,'renders',id),{recursive:true,force:true});}
