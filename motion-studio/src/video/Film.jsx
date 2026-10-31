import React from 'react';
import {AbsoluteFill,Sequence,Audio,Img,OffthreadVideo,useCurrentFrame,useVideoConfig} from 'remotion';
import {gsap} from 'gsap';
import {sceneFrames} from '../shared/project.js';
import {MotionDiagram} from './MotionDiagram.jsx';
import {ThreeObject} from './ThreeObject.jsx';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';

const clamp=v=>Math.max(0,Math.min(1,v));
const ease=gsap.parseEase('power3.out');
function Scene({scene,index,total,accent,assetUrls}){
  const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig();const vertical=height>width;
  const t=frame/fps,d=scene.duration; const enter=ease(clamp(t/.75)); const exit=clamp((d-t)/.35);const op=Math.min(enter,exit);
  const isMedia=['cinematic','photo','footage'].includes(scene.type),is3d=scene.type.startsWith('object-'),isDiagram=scene.type==='diagram',isInfographic=scene.type==='infographic';
  const src=scene.assetId?assetUrls?.[scene.assetId]:null;const title=scene.title.split('\n');
  const centered=(scene.layout==='center'||(!scene.layout||scene.layout==='auto')&&scene.type==='kinetic'&&index===total-1);
  const longest=Math.max(...title.map(line=>line.length));
  const titleSize=(vertical?95:102)*Math.max(.58,Math.min(1,(is3d||isDiagram||isInfographic?23:30)/Math.max(1,longest))); 
  const scale=width/(vertical?1080:1920);
  const textWidth=centered?'84%':vertical?'82%':(isDiagram||isInfographic||is3d?'50%':'75%');
  return <AbsoluteFill style={{overflow:'hidden',fontFamily:'Space Grotesk, sans-serif',color:'#f8f7ff',background:'#0d0d17',opacity:op}}>
    <AbsoluteFill style={{background:`radial-gradient(ellipse at 78% 38%, ${accent}42 0%, #151321 37%, #0b0b13 78%)`}}/>
    {isMedia&&src&&(scene.type==='footage'?<OffthreadVideo src={src} muted style={{width:'100%',height:'100%',objectFit:'cover',opacity:.77,transform:`scale(${1.02+t*.004})`}}/>:<Img src={src} style={{width:'100%',height:'100%',objectFit:'cover',opacity:.83,transform:`scale(${1.025+t*.004})`}}/>)}
    <AbsoluteFill style={{background:isMedia?'linear-gradient(90deg, rgba(7,8,17,.89) 0%,rgba(9,8,20,.49) 55%,rgba(10,9,21,.13) 100%), linear-gradient(0deg,rgba(7,8,17,.70),transparent 38%)':'linear-gradient(120deg, rgba(8,8,17,.24),transparent 75%)'}}/>
    {!isMedia&&<AbsoluteFill style={{opacity:.16,backgroundImage:'linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)',backgroundSize:`${80*scale}px ${80*scale}px`,maskImage:'linear-gradient(90deg, transparent, black)'}}/>}
    {!isMedia&&<div style={{position:'absolute',width:'55%',height:'65%',right:'-8%',top:'5%',borderRadius:'50%',background:`radial-gradient(ellipse, ${accent}35, transparent 68%)`,filter:`blur(${38*scale}px)`}}/>}
    {!isMedia&&<svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.36,pointerEvents:'none'}} viewBox="0 0 1920 1080" preserveAspectRatio="none">{Array.from({length:32},(_,i)=>{const x=(i*173+67)%1920,y=(i*293+91)%1080;return <circle key={i} cx={x+Math.sin(t*.25+i)*9} cy={y-Math.cos(t*.22+i)*8} r={i%6===0?2:1} fill={accent} opacity={.2+(i%4)*.1}/>})}</svg>}
    {isInfographic&&<div style={{position:'absolute',left:vertical?'9%':'54%',top:vertical?'49%':'27%',width:vertical?'82%':'38%',height:vertical?'28%':'48%',display:'flex',alignItems:'flex-end',gap:'9%',borderBottom:'1px solid #ffffff35',padding:'0 4%'}}>{(scene.values||[null,null,null]).map((value,i)=><div key={i} style={{flex:1,height:'100%',display:'flex',alignItems:'center',justifyContent:'flex-end',flexDirection:'column',gap:12*scale}}><span style={{fontFamily:'Space Grotesk',fontSize:25*scale,color:'#f0ecff',opacity:ease(clamp((t-.3-i*.15)/.7))}}>{value===null?'—':`${value}%`}</span><div style={{width:'100%',height:`${value===null?1:Math.max(2,value)*.78*ease(clamp((t-.15-i*.12)/1.2))}%`,background:`linear-gradient(180deg,${accent},${accent}44)`,borderRadius:`${6*scale}px ${6*scale}px 0 0`,boxShadow:`0 0 ${35*scale}px ${accent}25`}}/><span style={{position:'absolute',bottom:-36*scale,fontFamily:'Inter',fontSize:14*scale,letterSpacing:'.1em',color:'#c7bed8'}}>{scene.labels[i]}</span></div>)}</div>}
    {isDiagram&&<div style={{position:'absolute',left:vertical?'7%':'48%',top:vertical?'45%':'25%',width:vertical?'86%':'48%',height:vertical?'27%':'48%'}}><MotionDiagram key={`${scene.id}-${scene.labels.join('-')}-${accent}`} labels={scene.labels} accent={accent}/></div>}
    {is3d&&<div style={{position:'absolute',left:vertical?'13%':'53%',top:vertical?'40%':'6%',width:vertical?'74%':'43%',height:vertical?'43%':'84%'}}><div style={{position:'absolute',left:'18%',right:'18%',bottom:'8%',height:'10%',borderRadius:'50%',background:'radial-gradient(ellipse,rgba(0,0,0,.72),transparent 70%)',filter:'blur(12px)'}}/><ThreeObject type={scene.type}/></div>}
    {!isMedia&&!isDiagram&&!isInfographic&&!is3d&&!centered&&<div style={{position:'absolute',right:'7%',top:'14%',width:'29%',height:'64%',opacity:.75}}>
      <svg viewBox="0 0 500 500" style={{width:'100%',height:'100%'}}><defs><linearGradient id={`line-${index}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={accent}/><stop offset="1" stopColor="#fff" stopOpacity=".2"/></linearGradient></defs><path d="M30 370 C125 100 250 425 470 85" fill="none" stroke={`url(#line-${index})`} strokeWidth="2" strokeDasharray="700" strokeDashoffset={700*(1-ease(clamp(t/2)))}/><circle cx="30" cy="370" r="5" fill={accent}/><circle cx="470" cy="85" r="5" fill={accent}/><circle cx="250" cy="250" r="170" fill="none" stroke="#ffffff" strokeOpacity=".08" strokeWidth="1"/></svg>
    </div>}
    <div style={{position:'absolute',left:vertical?'9%':'7.3%',top:vertical?'10%':'12%',fontFamily:'Inter,sans-serif',fontSize:16*scale,letterSpacing:'.25em',textTransform:'uppercase',fontWeight:500,color:'#d8d1ed',display:'flex',alignItems:'center',gap:14*scale}}><span style={{display:'inline-block',width:30*scale,height:2*scale,background:accent}}/> A VISUAL STORY</div>
    <div style={{position:'absolute',left:centered?'8%':vertical?'9%':'7.3%',top:vertical?'20%':(isMedia?'34%':centered?'32%':'31%'),width:textWidth,textAlign:centered?'center':'left'}}>
      <div style={{fontFamily:'Inter,sans-serif',fontSize:15*scale,letterSpacing:'.2em',fontWeight:600,color:accent,marginBottom:24*scale,opacity:ease(clamp((t-.1)/.6)),textTransform:'uppercase'}}>{String(index+1).padStart(2,'0')} / {String(total).padStart(2,'0')} &nbsp; · &nbsp; {scene.name}</div>
      <div style={{fontSize:titleSize*scale,lineHeight:1.03,letterSpacing:'-.058em',fontWeight:600}}>{title.map((line,i)=><div key={i} style={{overflow:'hidden',paddingBottom:5*scale}}><div style={{transform:`translateY(${(1-ease(clamp((t-.12-i*.10)/.75)))*108}%)`}}>{line||'\u00a0'}</div></div>)}</div>
      {scene.subtitle&&<div style={{fontFamily:'Inter,sans-serif',fontSize:(vertical?26:25)*scale,lineHeight:1.55,letterSpacing:'-.01em',maxWidth:(vertical?760:680)*scale,marginLeft:centered?'auto':undefined,marginRight:centered?'auto':undefined,color:'rgba(238,235,249,.72)',marginTop:30*scale,opacity:ease(clamp((t-.45)/.8)),transform:`translateY(${(1-ease(clamp((t-.45)/.8)))*20*scale}px)`}}>{scene.subtitle}</div>}
    </div>
    <div style={{position:'absolute',bottom:vertical?'6%':'8%',left:vertical?'9%':'7.3%',right:vertical?'9%':'7.3%',display:'flex',alignItems:'center',justifyContent:'space-between',color:'rgba(236,232,251,.55)',fontFamily:'Inter,sans-serif',fontSize:14*scale,letterSpacing:'.16em',textTransform:'uppercase'}}><span>IDEAS, IN MOTION</span><span style={{display:'flex',alignItems:'center',gap:10*scale}}><span style={{width:6*scale,height:6*scale,borderRadius:'50%',background:accent}}/> {String(index+1).padStart(2,'0')} — {String(total).padStart(2,'0')}</span></div>
  </AbsoluteFill>;
}
export function Film({project,assetUrls={},includeAudio=true}){
  let cursor=0;const sections=project.scenes.map((s,i)=>{const from=cursor,frames=sceneFrames(s,project.fps);cursor+=frames;return <Sequence key={s.id} from={from} durationInFrames={frames} layout="none"><Scene scene={s} index={i} total={project.scenes.length} accent={project.accent} assetUrls={assetUrls}/></Sequence>});
  const tracks=includeAudio?[project.audio.music,project.audio.narration,...project.audio.effects].filter(Boolean):[];
  return <AbsoluteFill style={{background:'#0b0b13'}}>{sections}{tracks.map((t,i)=>assetUrls[t.assetId]?<Sequence key={`${t.assetId}-${i}`} from={Math.round(t.offset*project.fps)} layout="none"><Audio src={assetUrls[t.assetId]} volume={t.volume}/></Sequence>:null)}</AbsoluteFill>;
}
