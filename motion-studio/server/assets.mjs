import {mkdir,readFile,writeFile,rename,unlink,stat} from 'node:fs/promises';
import {existsSync,createWriteStream} from 'node:fs';
import {join,extname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import multer from 'multer';
import {ffmpeg,exec,probe} from './environment.mjs';

export const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
export const STORAGE=join(ROOT,'storage');
const ASSET_DIR=join(STORAGE,'assets');
const META=join(STORAGE,'assets.json');
let assets={};
const demo={
  'demo-earth':{id:'demo-earth',name:'Earth at night',kind:'image',mime:'image/jpeg',path:join(ROOT,'public/demo/earth-horizon.jpg'),demo:true},
  'demo-score':{id:'demo-score',name:'Original ambient score',kind:'audio',mime:'audio/mpeg',path:join(ASSET_DIR,'demo-score.mp3'),demo:true},
  'demo-swish':{id:'demo-swish',name:'Soft transition',kind:'audio',mime:'audio/mpeg',path:join(ASSET_DIR,'demo-swish.mp3'),demo:true},
};
const allowed={
 'image/jpeg':['image','.jpg'], 'image/png':['image','.png'], 'image/webp':['image','.webp'],
 'video/mp4':['video','.mp4'], 'video/webm':['video','.webm'], 'video/quicktime':['video','.mov'],
 'audio/mpeg':['audio','.mp3'], 'audio/mp3':['audio','.mp3'], 'audio/wav':['audio','.wav'], 'audio/x-wav':['audio','.wav'], 'audio/wave':['audio','.wav'], 'audio/mp4':['audio','.m4a'], 'audio/x-m4a':['audio','.m4a'], 'audio/ogg':['audio','.ogg'], 'audio/webm':['audio','.webm'], 'audio/aac':['audio','.aac'], 'audio/flac':['audio','.flac'], 'audio/x-flac':['audio','.flac'],
};
const cleanName=name=>String(name||'Uploaded media').replace(/[\x00-\x1f\x7f/\\]/g,'').slice(0,120);
const publicAsset=a=>({id:a.id,name:a.name,kind:a.kind,mime:a.mime,duration:a.duration??null,width:a.width??null,height:a.height??null,demo:!!a.demo,url:`/api/assets/${a.id}`});
async function save(){const tmp=META+'.tmp';await writeFile(tmp,JSON.stringify(assets,null,2));await rename(tmp,META);}
function wavBuffer(seconds,makeSample){
  const rate=44100,frames=Math.floor(rate*seconds),b=Buffer.alloc(44+frames*2);
  b.write('RIFF',0);b.writeUInt32LE(36+frames*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*2,40);
  for(let i=0;i<frames;i++){const x=Math.max(-1,Math.min(1,makeSample(i/rate,i,rate)));b.writeInt16LE(Math.round(x*32767),44+i*2);}return b;
}
async function generateDemoAudio(){
  if(!existsSync(demo['demo-score'].path)){
    const chords=[[130.81,155.56,196],[103.83,130.81,155.56],[116.54,146.83,174.61],[98,123.47,146.83]];
    const audio=wavBuffer(32,(t)=>{
      const chord=chords[Math.floor(t/8)%4], fade=Math.min(1,t/2,(32-t)/2);let pad=0;
      for(let i=0;i<chord.length;i++){let f=chord[i];pad+=Math.sin(2*Math.PI*f*t+i)*0.055+Math.sin(2*Math.PI*f*2*t+i)*0.008;}
      const step=Math.floor(t*2),phase=t*2-step,f=chord[step%3]*2;
      const bell=Math.sin(2*Math.PI*f*t)*Math.exp(-phase*4.5)*0.035;
      return (pad*(0.72+0.12*Math.sin(t*0.4))+bell)*fade;
    });
    const wav=join(ASSET_DIR,'score.tmp.wav');await writeFile(wav,audio);await exec(ffmpeg,['-y','-loglevel','error','-i',wav,'-codec:a','libmp3lame','-b:a','128k',demo['demo-score'].path],{timeout:30000});await unlink(wav);
  }
  if(!existsSync(demo['demo-swish'].path)){
    let seed=987654321,filtered=0;
    const audio=wavBuffer(0.9,(t)=>{seed=(1664525*seed+1013904223)>>>0;const noise=(seed/2147483648)-1;filtered=filtered*0.78+noise*0.22;const envelope=Math.pow(Math.sin(Math.PI*t/0.9),2);return filtered*envelope*0.36;});
    const wav=join(ASSET_DIR,'swish.tmp.wav');await writeFile(wav,audio);await exec(ffmpeg,['-y','-loglevel','error','-i',wav,'-codec:a','libmp3lame','-b:a','128k',demo['demo-swish'].path],{timeout:30000});await unlink(wav);
  }
}
// Metadata may be restored under a different workspace path. Uploads are
// always stored as <id><extension>, so rebase them into the current asset dir.
export function restoreAssetPaths(records,assetDir=ASSET_DIR){
  if(!records||typeof records!=='object'||Array.isArray(records))return {};
  const restored={};
  for(const [id,asset] of Object.entries(records)){
    if(!/^[a-zA-Z0-9-]{1,80}$/.test(id)||!asset||typeof asset.path!=='string')continue;
    const ext=extname(asset.path);if(!/^\.[a-z0-9]{1,8}$/i.test(ext))continue;
    restored[id]={...asset,id,path:join(assetDir,`${id}${ext}`)};
  }
  return restored;
}
export async function initAssets(){
  await mkdir(ASSET_DIR,{recursive:true});
  try{assets=restoreAssetPaths(JSON.parse(await readFile(META,'utf8')));}catch(error){if(error.code!=='ENOENT') throw error;assets={};}
  await generateDemoAudio();
  for(const a of Object.values(demo)){if(a.kind==='audio'){try{a.duration=Number((await probe(a.path)).format?.duration)||null;}catch{a.duration=null;}}}
}
export function getAsset(id){const a=demo[id]||assets[id];if(!a || !existsSync(a.path)) return null;return a;}
export function listAssets(){return [...Object.values(demo),...Object.values(assets)].filter(a=>existsSync(a.path)).map(publicAsset);}
export function assetPublic(id){const a=getAsset(id);return a?publicAsset(a):null;}
export const upload=multer({dest:ASSET_DIR,limits:{fileSize:150*1024*1024,files:1}});
export async function acceptUpload(file){
  if(!file) throw new Error('Choose a file to upload.');
  const type=allowed[file.mimetype];
  if(!type){await unlink(file.path).catch(()=>{});throw new Error('Unsupported file type. Use JPG, PNG, WebP, MP4, WebM, MOV, MP3, WAV, M4A, OGG, AAC or FLAC.');}
  try{
    const info=await probe(file.path); const streams=info.streams||[];
    if(type[0]==='audio'&&!streams.some(s=>s.codec_type==='audio')) throw new Error('The file does not contain a readable audio stream.');
    if((type[0]==='image'||type[0]==='video')&&!streams.some(s=>s.codec_type==='video')) throw new Error('The file does not contain a readable image or video stream.');
    // Image MIME is additionally checked against decoder output. This prevents serving HTML or a video as an image.
    const video=streams.find(s=>s.codec_type==='video');
    if(type[0]==='image'&&!['mjpeg','png','webp'].includes(video?.codec_name)) throw new Error('The image content does not match an accepted image format.');
    const id=randomUUID();const path=join(ASSET_DIR,`${id}${type[1]}`);await rename(file.path,path);
    const a={id,name:cleanName(file.originalname),kind:type[0],mime:file.mimetype,path,duration:Number(info.format?.duration)||null,width:video?.width||null,height:video?.height||null};
    assets[id]=a;await save();return publicAsset(a);
  }catch(error){await unlink(file.path).catch(()=>{});throw error;}
}
