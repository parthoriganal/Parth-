import chromium, {inflate, setupLambdaEnvironment} from '@sparticuz/chromium';
import {createRequire} from 'node:module';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {existsSync} from 'node:fs';
import {mkdir, symlink} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const require=createRequire(import.meta.url);
export const ffmpeg=require('@ffmpeg-installer/ffmpeg').path;
export const ffprobe=require('@ffprobe-installer/ffprobe').path;
export const exec=promisify(execFile);
let preparePromise;
export function prepareEnvironment(){
  if(preparePromise) return preparePromise;
  preparePromise=(async()=>{
    const browser=process.env.CHROME_PATH || await chromium.executablePath();
    // The Lambda Chromium package contains its NSS libraries, but only unpacks
    // them automatically on Lambda. Unpack them for minimal Linux containers too.
    if(process.platform==='linux' && !process.env.CHROME_PATH){
      const pkg=dirname(dirname(require.resolve('@sparticuz/chromium')));
      const lib=join(tmpdir(),'al2023','lib');
      if(!existsSync(join(lib,'libnss3.so'))) await inflate(join(pkg,'bin','al2023.tar.br'));
      setupLambdaEnvironment(lib);
    }
    const bin=join(tmpdir(),'frame-studio-bin');
    await mkdir(bin,{recursive:true});
    for(const [name,target] of [['ffmpeg',ffmpeg],['ffprobe',ffprobe]]){
      try{await symlink(target,join(bin,name));}catch(error){if(error.code!=='EEXIST') throw error;}
    }
    await exec(browser,['--version'],{timeout:15000});
    await exec(ffmpeg,['-version'],{timeout:15000});
    await exec(ffprobe,['-version'],{timeout:15000});
    return {browser,bin,env:{...process.env,PATH:`${bin}:${process.env.PATH||''}`,HYPERFRAMES_BROWSER_PATH:browser,HYPERFRAMES_NO_TELEMETRY:'1',DO_NOT_TRACK:'1'}};
  })().catch(e=>{preparePromise=null;throw e;});
  return preparePromise;
}
export async function probe(path){
  const {stdout}=await exec(ffprobe,['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames','-of','json',path],{timeout:30000,maxBuffer:2_000_000});
  return JSON.parse(stdout);
}
