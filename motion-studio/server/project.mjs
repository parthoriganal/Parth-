import {z} from 'zod';
import {VISUAL_TYPES,DIRECTIONS,totalSeconds,makeId} from '../src/shared/project.js';
import {getAsset} from './assets.mjs';

const id=z.string().regex(/^[a-zA-Z0-9-]{1,80}$/);
const track=z.object({assetId:id,volume:z.number().min(0).max(2),offset:z.number().min(0).max(180)}).strict();
const effect=track.extend({id});
const scene=z.object({id,name:z.string().min(1).max(80),type:z.enum(VISUAL_TYPES.map(v=>v.id)),layout:z.enum(['auto','left','center']).optional(),title:z.string().trim().min(1).max(120),subtitle:z.string().max(260),narration:z.string().max(600),duration:z.number().min(1).max(30),assetId:id.nullable(),labels:z.array(z.string().max(24)).length(3),values:z.array(z.number().min(0).max(100).nullable()).length(3).optional()}).strict();
export const projectSchema=z.object({version:z.literal(1),name:z.string().trim().min(1).max(100),brief:z.string().max(4000),direction:z.enum(DIRECTIONS),format:z.enum(['landscape','vertical']),resolution:z.enum(['1080p','4k']),fps:z.union([z.literal(24),z.literal(30)]),accent:z.string().regex(/^#[a-f0-9]{6}$/i),scenes:z.array(scene).min(1).max(16),audio:z.object({music:track.nullable(),narration:track.nullable(),effects:z.array(effect).max(12)}).strict()}).strict();
export function validateProject(input,{engine='remotion'}={}){
  const result=projectSchema.safeParse(input);const errors=[],warnings=[];
  if(!result.success){for(const issue of result.error.issues.slice(0,20)) errors.push(`${issue.path.join('.')||'Project'}: ${issue.message}`);return {valid:false,errors,warnings};}
  const p=result.data, duration=totalSeconds(p);
  if(duration>180) errors.push('Projects are limited to 3 minutes.');
  if(new Set(p.scenes.map(s=>s.id)).size!==p.scenes.length) errors.push('Scene IDs must be unique.');
  let objects=0;
  p.scenes.forEach((s,i)=>{
    if(s.type.startsWith('object-')) objects++;
    const a=s.assetId?getAsset(s.assetId):null;
    if(s.assetId&&!a) errors.push(`Scene ${i+1}: the selected media is missing.`);
    if(['photo','footage'].includes(s.type)&&!a) errors.push(`Scene ${i+1}: add ${s.type==='photo'?'an image':'a video'} to use ${s.type}.`);
    if(a&&['photo','cinematic'].includes(s.type)&&a.kind!=='image') errors.push(`Scene ${i+1}: select an image for ${s.type}.`);
    if(a&&s.type==='footage'&&a.kind!=='video') errors.push(`Scene ${i+1}: select a video for footage.`);
    if(s.type==='footage'&&a?.duration&&a.duration+0.01<s.duration) errors.push(`Scene ${i+1}: footage is shorter than the scene; shorten the scene or choose a longer clip.`);
    if(s.type==='infographic'&&!(s.values||[]).some(v=>v!==null)) warnings.push(`Scene ${i+1}: add verified percentage values to the infographic.`);
    if(s.title.length>65) warnings.push(`Scene ${i+1}: a long headline may be hard to read or overflow; preview it before exporting.`);
    if(engine==='hyperframes' && (s.type.startsWith('object-')||s.type==='footage')) errors.push(`Scene ${i+1}: HyperFrames export supports 2D, diagrams and images only. Use Remotion for 3D or footage.`);
  });
  const tracks=[p.audio.music,p.audio.narration,...p.audio.effects].filter(Boolean);
  for(const t of tracks){const a=getAsset(t.assetId);if(!a||a.kind!=='audio') errors.push(`Audio asset ${t.assetId} is missing or is not audio.`);if(t.offset>=duration) errors.push(`Audio “${a?.name||t.assetId}” starts outside the video.`);}
  if(!p.audio.narration) warnings.push('No narration is attached. The written narration is not synthesized automatically.');
  if(!tracks.length) warnings.push('No audio tracks are attached; the export will be silent.');
  if(objects>Math.ceil(p.scenes.length/2)) warnings.push('More than half of the scenes use 3D. Consider using it more selectively.');
  if(p.resolution==='4k') warnings.push('4K rendering can be slow and memory intensive on smaller machines.');
  return {valid:errors.length===0,errors,warnings,duration,scenes:p.scenes.length};
}
const compact=(text,max)=>String(text||'').replace(/\s+/g,' ').trim().slice(0,max);
const headline=(text)=>{const words=compact(text,140).split(' ').slice(0,8);return words.join(' ').replace(/[.,;:!?]+$/,'')+(words.length?'.':'');};
const chooseVisual=(text,i,used3d)=>{
  if(/\b(?:100|\d{1,2})(?:\.\d+)?\s*%/.test(text))return 'infographic';
  if(!used3d&&/\b(phone|smartphone|mobile device)\b/i.test(text)) return 'object-phone';
  if(!used3d&&/\b(clock|watch|hours|timepiece)\b/i.test(text)) return 'object-clock';
  if(!used3d&&/\b(globe|global|planet|worldwide|earth)\b/i.test(text)) return 'object-globe';
  if(i>0&&/\b(process|steps|system|connect|how|from|to|works|journey|data)\b/i.test(text))return 'diagram';
  return i===1?'diagram':'kinetic';
};
export function localStoryboard(brief,direction='Futuristic technology',availableAssets=[]){
  const text=compact(brief,4000);if(text.length<8) throw new Error('Write at least a short sentence in the creative brief.');
  let lines=text.match(/[^.!?]+[.!?]?/g)?.map(s=>s.trim()).filter(Boolean)||[text];
  // Keep user-provided facts intact; the local planner adds no invented statistics or claims.
  if(lines.length===1){const parts=lines[0].split(/\s*[,;]\s*/).filter(s=>s.length>12);if(parts.length>1)lines=parts;}
  lines=lines.slice(0,6);
  if(lines.length===1) lines=[lines[0], 'Bring the idea into focus', 'Make the story move'];
  let used=false;
  const scenes=lines.map((line,i)=>{let type=chooseVisual(line,i,used);let assetId=null,duration=5;
    // Match only explicitly available media by descriptive filename. This is a
    // transparent heuristic, not semantic AI or an internet image search.
    const terms=new Set(line.toLowerCase().match(/[a-z0-9]{4,}/g)||[]);
    const match=availableAssets.filter(a=>['image','video'].includes(a.kind)).map(a=>({asset:a,score:(a.name.toLowerCase().match(/[a-z0-9]{4,}/g)||[]).filter(w=>terms.has(w)&&!['image','photo','video','footage','jpeg','webm'].includes(w)).length})).sort((a,b)=>b.score-a.score)[0];
    if(match?.score>0 && type!=='infographic' && !type.startsWith('object-') && (match.asset.kind!=='video'||(match.asset.duration||0)>=1)){assetId=match.asset.id;type=match.asset.kind==='video'?'footage':'photo';if(type==='footage')duration=Math.max(1,Math.min(5,Math.floor(match.asset.duration*2)/2));}
    if(type.startsWith('object-'))used=true;const isOriginal=text.toLowerCase().includes(line.toLowerCase());return {id:makeId(),name:i===0?'The opening':i===lines.length-1?'The close':`Chapter ${i+1}`,type,title:headline(line),subtitle:isOriginal?compact(line,150):'',narration:isOriginal?compact(line,600):'',duration,assetId,labels:type==='infographic'?['VALUE 1','VALUE 2','VALUE 3']:['INSIGHT','STORY','IMPACT'],...(type==='infographic'?{values:[...((line.match(/\b(?:100|\d{1,2})(?:\.\d+)?(?=\s*%)/g)||[]).slice(0,3).map(Number).filter(n=>n<=100)),null,null,null].slice(0,3)}:{})};});
  return {name:headline(lines[0]).replace(/\.$/, '').slice(0,60)||'Untitled film',direction:DIRECTIONS.includes(direction)?direction:DIRECTIONS[0],scenes,source:'local'};
}
export function normalizeAIPlan(plan,direction){
  if(!plan||!Array.isArray(plan.scenes)||plan.scenes.length<1||plan.scenes.length>8) throw new Error('The AI provider returned an invalid storyboard.');
  let used3d=0;const scenes=plan.scenes.map((s,i)=>{
    let type=VISUAL_TYPES.some(v=>v.id===s.type)?s.type:'kinetic';
    if(['photo','footage','cinematic'].includes(type)) type='kinetic'; // no unlicensed assets are invented
    if(type.startsWith('object-')&&++used3d>1) type='diagram';
    const title=compact(s.title,120);if(!title) throw new Error(`AI scene ${i+1} has no title.`);
    const labels=Array.isArray(s.labels)?s.labels.slice(0,3).map(x=>compact(x,24)):[];while(labels.length<3)labels.push(['IDEA','STORY','IMPACT'][labels.length]);
    return {id:makeId(),name:compact(s.name,80)||`Scene ${i+1}`,type,title,subtitle:compact(s.subtitle,260),narration:compact(s.narration,600),duration:Math.max(2,Math.min(15,Number(s.duration)||5)),assetId:null,labels};
  });
  return {name:compact(plan.name,100)||'Untitled film',direction:DIRECTIONS.includes(direction)?direction:DIRECTIONS[0],scenes,source:'ai'};
}
