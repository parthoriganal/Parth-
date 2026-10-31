import {makeId,sceneStart} from './project.js';

// Approximate a voiceover edit from its length and the scene scripts. This is
// intentionally not speech recognition: word boundaries are not inferred.
export function fitScenesToNarration(project,assets){
  const track=project.audio.narration;
  if(!track)throw new Error('Attach a narration recording first.');
  const recording=assets.find(a=>a.id===track.assetId&&a.kind==='audio');
  const length=Number(recording?.duration),offset=Number(track.offset),fps=project.fps;
  if(!Number.isFinite(length)||length<=0)throw new Error('The narration length could not be read.');
  if(!Number.isFinite(offset)||offset<0)throw new Error('Set a valid narration start time.');
  const target=Math.round((length+offset)*fps);
  if(target>180*fps)throw new Error('The recording would make the project longer than three minutes.');
  const minima=project.scenes.map((_,i)=>i===0?Math.max(fps,Math.round(offset*fps)+fps):fps);
  const maxima=project.scenes.map(scene=>{
    if(scene.type!=='footage')return 30*fps;
    const clip=assets.find(a=>a.id===scene.assetId&&a.kind==='video');
    if(!clip?.duration)throw new Error('A footage scene is missing a readable video clip.');
    return Math.min(30*fps,Math.floor(clip.duration*fps));
  });
  if(minima.some((value,i)=>value>maxima[i])||target<minima.reduce((a,b)=>a+b,0)||target>maxima.reduce((a,b)=>a+b,0))throw new Error('The recording cannot fit within scene duration limits or available footage. Adjust the number of scenes or the recording.');
  const frames=[...minima];let remaining=target-frames.reduce((a,b)=>a+b,0);
  const weights=project.scenes.map(s=>Math.max(1,(String(s.narration||'').trim()||`${s.title} ${s.subtitle}`).split(/\s+/).filter(Boolean).length));
  while(remaining>0){
    const active=frames.map((n,i)=>n<maxima[i]?i:-1).filter(i=>i>=0);
    if(!active.length)throw new Error('The recording cannot fit the current scenes.');
    const totalWeight=active.reduce((n,i)=>n+weights[i],0),round=remaining;let added=0;
    for(const i of active){const count=Math.min(maxima[i]-frames[i],Math.floor(round*weights[i]/totalWeight));frames[i]+=count;remaining-=count;added+=count;}
    if(!added){frames[active[0]]++;remaining--;}
  }
  return {...project,scenes:project.scenes.map((scene,i)=>({...scene,duration:Number((frames[i]/fps).toFixed(3))}))};
}

// Keep the chosen sounds/volumes, align the first effects with scene cuts,
// and use the built-in swish only where additional cues are needed.
export function cueSceneTransitions(project,assets){
  if(project.scenes.length<2)throw new Error('Add at least two scenes to cue transitions.');
  const count=project.scenes.length-1,effects=project.audio.effects;
  if(count>12)throw new Error('A project can contain up to 12 sound effects.');
  if(count>effects.length&&!assets.some(a=>a.id==='demo-swish'))throw new Error('Add a sound effect to the library first.');
  const cues=Array.from({length:count},(_,i)=>({...(effects[i]||{id:makeId(),assetId:'demo-swish',volume:.35}),offset:Number(sceneStart(project,i+1).toFixed(3))}));
  return {...project,audio:{...project.audio,effects:[...cues,...effects.slice(count)]}};
}
