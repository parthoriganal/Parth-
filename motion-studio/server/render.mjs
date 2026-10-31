import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia} from '@remotion/renderer';
import {spawn} from 'node:child_process';
import {mkdir,copyFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ROOT,STORAGE,getAsset} from './assets.mjs';
import {prepareEnvironment,ffmpeg,probe,exec} from './environment.mjs';
import {writeHyperframes} from './hyperframes.mjs';
import {dimensions,totalSeconds,totalFrames,trackList} from '../src/shared/project.js';

const jobs=new Map();let active=null;let bundlePromise=null;
export const getJob=id=>jobs.get(id)||null;
export function publicJob(job){return {id:job.id,status:job.status,phase:job.phase,progress:job.progress,error:job.error||null,engine:job.engine,metadata:job.metadata||null,downloadUrl:job.status==='complete'?`/api/renders/${job.id}/download`:null};}
function set(job,phase,progress){job.phase=phase;job.progress=Math.max(job.progress,Math.min(99,Math.floor(progress)));}
function run(cmd,args,{env,onLine}={}){return new Promise((resolve,reject)=>{const child=spawn(cmd,args,{env,stdio:['ignore','pipe','pipe']});let stderr='',stdout='';child.stdout.on('data',buf=>{const text=buf.toString();stdout+=text;onLine?.(text);});child.stderr.on('data',buf=>{stderr=(stderr+buf.toString()).slice(-12000);onLine?.(buf.toString());});child.on('error',reject);child.on('close',code=>code===0?resolve({stdout,stderr}):reject(new Error(`${cmd.split('/').pop()} exited with code ${code}: ${stderr.slice(-1600)}`)));});}
async function mixAudio(project,input,output){
  const tracks=trackList(project);if(!tracks.length){await copyFile(input,output);return;}
  const duration=totalSeconds(project),args=['-y','-loglevel','error','-i',input];
  for(const t of tracks)args.push('-i',getAsset(t.assetId).path);
  // The bundled FFmpeg predates amix's normalize option. Pad every input with
  // silence to the film length and compensate for its fixed 1/N normalization.
  const filters=tracks.map((t,i)=>{const ms=Math.round(t.offset*1000),vol=(t.volume*tracks.length).toFixed(4);return `[${i+1}:a]aformat=sample_fmts=fltp:channel_layouts=stereo,aresample=44100,volume=${vol},adelay=${ms}|${ms},apad,atrim=duration=${duration.toFixed(6)}[a${i}]`;});
  filters.push(`${tracks.map((_,i)=>`[a${i}]`).join('')}amix=inputs=${tracks.length}:duration=longest:dropout_transition=0,alimiter=limit=0.9[mix]`);
  args.push('-filter_complex',filters.join(';'),'-map','0:v:0','-map','[mix]','-c:v','copy','-c:a','aac','-b:a','192k','-t',duration.toFixed(6),'-movflags','+faststart',output);
  await run(ffmpeg,args);
}
async function verifyOutput(project,output,hasAudio){
  const info=await probe(output);const vid=info.streams?.find(s=>s.codec_type==='video'),audio=info.streams?.find(s=>s.codec_type==='audio');const expected=dimensions(project),duration=Number(info.format?.duration||0),target=totalSeconds(project);
  if(!vid||vid.codec_name!=='h264'||vid.width!==expected.width||vid.height!==expected.height) throw new Error('The finished video failed codec or resolution validation.');
  if(Math.abs(duration-target)>Math.max(.15,2/project.fps)) throw new Error(`The finished video duration ${duration.toFixed(2)}s does not match the ${target.toFixed(2)}s timeline.`);
  if(hasAudio&&audio?.codec_name!=='aac') throw new Error('The finished video is missing the expected AAC audio track.');
  const [num,den]=String(vid.r_frame_rate||'0/1').split('/').map(Number);if(!den||Math.abs(num/den-project.fps)>.001) throw new Error('The finished video frame rate does not match the project.');
  if(vid.nb_frames&&Number(vid.nb_frames)!==totalFrames(project)) throw new Error('The finished video frame count does not match the timeline.');
  await run(ffmpeg,['-v','error','-xerror','-i',output,'-f','null','-']);
  return {width:vid.width,height:vid.height,fps:project.fps,duration,videoCodec:vid.codec_name,audioCodec:audio?.codec_name||null,frames:totalFrames(project)};
}
async function remotion(job,project,port,env){
  set(job,'Bundling composition',3);
  bundlePromise ||= bundle({entryPoint:join(ROOT,'src/video/entry.jsx'),rootDir:ROOT,publicDir:join(ROOT,'public')}).catch(e=>{bundlePromise=null;throw e;});
  const serveUrl=await bundlePromise;const ids=new Set(project.scenes.map(s=>s.assetId).filter(Boolean));
  const assetUrls=Object.fromEntries([...ids].map(id=>[id,`http://127.0.0.1:${port}/api/assets/${id}`]));
  const inputProps={project,assetUrls,includeAudio:false};const opts={serveUrl,browserExecutable:env.browser,chromiumOptions:{gl:'swangle'},inputProps};
  const composition=await selectComposition({...opts,id:'Film',logLevel:'error'});
  set(job,'Rendering frames',7);
  await renderMedia({...opts,composition,codec:'h264',outputLocation:join(job.dir,'video-only.mp4'),concurrency:1,x264Preset:'veryfast',crf:19,imageFormat:'jpeg',jpegQuality:90,logLevel:'error',onProgress:({progress})=>set(job,'Rendering frames',7+progress*78)});
}
async function hyperframes(job,project,env){
  const folder=join(job.dir,'hyperframes');await writeHyperframes(project,folder);const cli=join(ROOT,'node_modules/hyperframes/bin/hyperframes.mjs');
  set(job,'Validating HTML composition',3);
  await exec(process.execPath,[cli,'lint',folder,'--json'],{env:env.env,timeout:30000,maxBuffer:2_000_000});
  set(job,'Rendering HyperFrames',7);
  let buffer='';await run(process.execPath,[cli,'render',folder,'-o',join(job.dir,'video-only.mp4'),'--fps',String(project.fps),'--quality','draft','--workers','1','--low-memory-mode'],{env:env.env,onLine:text=>{buffer+=text;let lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){let m=line.match(/@hf-progress\s+(\{.*\})/);if(m){try{const info=JSON.parse(m[1]);set(job,'Rendering HyperFrames',7+Number(info.pct||0)*.78);}catch{}}}}});
}
export function startRender(project,engine,port){
  if(active) throw new Error('A render is already running. Wait for it to finish.');
  const id=randomUUID(),dir=join(STORAGE,'renders',id);const job={id,dir,project,engine,status:'queued',phase:'Preparing renderer',progress:0};jobs.set(id,job);active=id;
  (async()=>{try{
    await mkdir(dir,{recursive:true});job.status='rendering';const env=await prepareEnvironment();
    if(engine==='hyperframes') await hyperframes(job,project,env);else await remotion(job,project,port,env);
    set(job,'Mixing audio with FFmpeg',88);await mixAudio(project,join(dir,'video-only.mp4'),join(dir,'final.mp4'));
    set(job,'Validating MP4',96);job.metadata=await verifyOutput(project,join(dir,'final.mp4'),trackList(project).length>0);
    await rm(join(dir,'video-only.mp4'),{force:true});job.status='complete';job.phase='Ready to download';job.progress=100;
  }catch(e){job.status='failed';job.phase='Render failed';job.error=e.message;console.error('Render failed:',e);}finally{active=null;}})();
  return job;
}
