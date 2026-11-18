import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill, Composition, Img, Sequence, cancelRender, continueRender, delayRender,
  interpolate, registerRoot, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';

const ink = '#e9efdd';
const paper = '#f3eedb';
const signal = '#ffb883';
const mono = 'Meridian Mono';
const serif = 'Meridian Display';
const sans = 'Meridian Sans';
const face = (family, file) => `@font-face{font-family:'${family}';src:url('${staticFile(`fonts/${file}`)}') format('truetype');font-display:block;}`;
const fonts = [[mono, 'JetBrainsMono-Regular.ttf'],[serif,'InstrumentSerif-Regular.ttf'],[sans,'Outfit-Bold.ttf']];
const clamp = {extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const smooth = (t) => t * t * (3 - 2*t);
const phase = (frame, from, to) => smooth(interpolate(frame,[from,to],[0,1],clamp));
const frameFile = (n) => `frame-${String(n).padStart(5,'0')}.png`;

function TypefaceGate() {
  const [handle] = useState(() => delayRender('Load packaged OFL typefaces'));
  useEffect(() => {
    Promise.all(fonts.map(([name]) => document.fonts.load(`20px "${name}"`))).then((loaded) => {
      if (loaded.some((items) => !items.length)) throw new Error('A packaged typeface did not load');
      continueRender(handle);
    }).catch(cancelRender);
  },[handle]);
  return <style>{fonts.map(([name,file])=>face(name,file)).join('\n')}</style>;
}

export const animationPresets = {
  rise: (t) => ({opacity:t, transform:`translateY(${Math.round((1-t)*44)}px)`}),
  reveal: (t) => ({clipPath:`inset(0 ${100-(t*100)}% 0 0)`}),
  punch: (t) => ({transform:`scale(${1+.045*t})`}),
};

export function Cut({index}) {
  const f=useCurrentFrame();
  const {fps}=useVideoConfig();
  const u=phase(f,0,Math.max(2,Math.round(fps*.17)));
  if (u>=1) return null;
  return index%2 ? <AbsoluteFill style={{pointerEvents:'none', opacity:1-u,background:'#10262c'}}/> :
    <AbsoluteFill style={{pointerEvents:'none',background:'#142b2e',transformOrigin:'right',transform:`scaleX(${1-u})`,
      borderLeft:'5px solid #ffb883'}}/>;
}

export function TimeRail({doc, shot, index}) {
  const f=useCurrentFrame();
  const elapsed=shot.start+f;
  const {fps}=doc.settings;
  const tick=`${String(Math.floor(elapsed/fps)).padStart(2,'0')}:${String(elapsed%fps).padStart(2,'0')}`;
  return <div style={{position:'absolute',left:92,right:92,bottom:60,color:ink,fontFamily:mono}}>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:17,letterSpacing:2,marginBottom:14}}>
      <span>{String(index+1).padStart(2,'0')} / {String(doc.shots.length).padStart(2,'0')}</span>
      <span>◇ &nbsp; MERIDIAN MOTION STUDY &nbsp; {tick}</span>
    </div>
    <div style={{height:2,background:'#d9efd247',position:'relative'}}>
      <div style={{height:2,width:`${100*(elapsed+1)/doc.frames}%`,background:signal}}/>
      {doc.shots.slice(1).map(s=><i key={s.id} style={{height:12,width:2,background:ink,position:'absolute',opacity:.56,
        top:-5,left:`${100*s.start/doc.frames}%`}}/>)}
    </div>
  </div>;
}

export function TitleStack({shot}) {
  const f=useCurrentFrame();
  const {fps}=useVideoConfig();
  const overline=phase(f,Math.round(fps*.06),Math.round(fps*.36));
  return <div style={{position:'absolute',left:102,top:261,width:890,color:paper}}>
    <div style={{...animationPresets.reveal(overline),width:'fit-content',fontFamily:mono,color:signal,
      fontSize:21,letterSpacing:4,borderBottom:'1px solid #e2bb9382',paddingBottom:14}}>{shot.marker}</div>
    <div style={{fontFamily:serif,fontSize:shot.template==='endcard'?185:147,letterSpacing:-3.6,
      lineHeight:.91,marginTop:26,textShadow:'0 5px 46px #00131681'}}>
      {shot.title.filter(Boolean).map((line,i)=><div key={i} style={animationPresets.rise(
        phase(f,Math.round(fps*(.135+i*.065)), Math.round(fps*(.52+i*.09))))}>{line}</div>)}
    </div>
    <div style={{fontFamily:mono,fontSize:18,letterSpacing:2.3,color:ink,marginTop:46,
      ...animationPresets.rise(phase(f,Math.round(fps*.35),Math.round(fps*.78)))}}>
      <span style={{color:signal,marginRight:16}}>●</span>{shot.label}
    </div>
  </div>;
}

function Overlay({doc,shot,index}) {
  return <>
    <div style={{position:'absolute',left:92,top:70,color:ink,display:'flex',alignItems:'center',gap:23}}>
      <span style={{background:signal,color:'#1b292a',fontFamily:sans,fontSize:24,padding:'5px 14px 7px'}}>M/01</span>
      <span style={{fontFamily:mono,fontSize:17,letterSpacing:3.2}}>{doc.edition}</span>
    </div>
    <div style={{position:'absolute',right:92,top:79,color:ink,fontFamily:mono,fontSize:17,letterSpacing:3}}>
      STUDIO SERIES &nbsp; 01
    </div>
    <div style={{position:'absolute',left:92,top:130,right:92,borderTop:'1px solid #d8e8ce76'}}/>
    {shot.template!=='diagram' && <>
      <div style={{position:'absolute',right:127,top:240,width:31,height:31,borderRight:'1px solid #cee6c099',borderTop:'1px solid #cee6c099'}}/>
      <div style={{position:'absolute',right:127,bottom:161,width:31,height:31,borderRight:'1px solid #cee6c099',borderBottom:'1px solid #cee6c099'}}/>
    </>}
    <TitleStack shot={shot}/>
    <TimeRail doc={doc} shot={shot} index={index}/>
  </>;
}

function Chapter({doc,shot,index}) {
  const f=useCurrentFrame();
  const width=useVideoConfig().width;
  const end=shot.template==='endcard';
  const ref=end?shot.source:shot.id;
  const image=end?shot.hold:f+1;
  const push=end?animationPresets.punch(phase(f,0,shot.frames-1)):{};
  return <AbsoluteFill style={{background:'#122a2e',overflow:'hidden'}}>
    <Img src={staticFile(`${ref}/${frameFile(image)}`)} style={{width:'100%',height:'100%',objectFit:'cover', ...push}}/>
    <AbsoluteFill style={{background:'linear-gradient(90deg,rgba(7,26,29,.91) 0%,rgba(7,25,29,.61) 31%,rgba(7,25,29,.09) 66%),linear-gradient(0deg,rgba(8,27,29,.82),transparent 25%)'}}/>
    <AbsoluteFill style={{width:1920,height:1080,transformOrigin:'0 0',transform:`scale(${width/1920})`}}>
      <Overlay doc={doc} shot={shot} index={index}/>
    </AbsoluteFill>
    <Cut index={index}/>
  </AbsoluteFill>;
}

export function Reel({doc}) {
  return <AbsoluteFill style={{background:'#11292a'}}>
    <TypefaceGate/>
    {doc.shots.map((shot,index)=><Sequence key={shot.id} from={shot.start} durationInFrames={shot.frames}>
      <Chapter doc={doc} shot={shot} index={index}/>
    </Sequence>)}
  </AbsoluteFill>;
}

const emptyDoc={frames:1,settings:{width:1920,height:1080,fps:24},shots:[],edition:''};
registerRoot(()=><Composition id="Meridian" component={Reel} width={1920} height={1080} fps={24} durationInFrames={1}
  defaultProps={{doc:emptyDoc}} calculateMetadata={({props})=>({width:props.doc.settings.width,height:props.doc.settings.height,
    fps:props.doc.settings.fps,durationInFrames:props.doc.frames})}/>);
