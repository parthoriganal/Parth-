import React, {useEffect, useRef, useState} from 'react';
import {delayRender, continueRender, cancelRender, useCurrentFrame, useVideoConfig} from 'remotion';
import {Renderer, Vector2, Logger, all, waitFor, easeOutCubic} from '@motion-canvas/core';
import {makeScene2D, Circle, Line, Txt} from '@motion-canvas/2d';

// A real Motion Canvas 2D scene, deterministically sought for each Remotion frame.
// It is rendered to a transparent canvas so it can sit inside the HTML composition.
function createRenderer(labels,accent){
  const logger=new Logger();
  const desc=makeScene2D(function* (view){
    const line=new Line({points:[[-305,0],[0,0],[305,0]],stroke:accent,lineWidth:3,end:0,opacity:0.9});
    const halos=[-305,0,305].map((x)=>new Circle({x,y:0,size:132,stroke:accent,lineWidth:1,opacity:0.24,scale:0.6}));
    const dots=[-305,0,305].map((x)=>new Circle({x,y:0,size:72,fill:'#171529',stroke:accent,lineWidth:3,scale:0.4,opacity:0}));
    const core=[-305,0,305].map((x)=>new Circle({x,y:0,size:12,fill:accent,scale:0}));
    const texts=labels.map((label,i)=>new Txt({x:[-305,0,305][i],y:112,text:label.toUpperCase(),fontFamily:'Space Grotesk',fontWeight:600,fontSize:20,fill:'#d3cdec',letterSpacing:2,opacity:0}));
    view.add(line);halos.forEach(n=>view.add(n));dots.forEach(n=>view.add(n));core.forEach(n=>view.add(n));texts.forEach(n=>view.add(n));
    yield* all(line.end(1,1.4,easeOutCubic),...halos.map(n=>n.scale(1,1.1,easeOutCubic)),...dots.map(n=>n.scale(1,0.9,easeOutCubic)),...dots.map(n=>n.opacity(1,0.5)),...core.map(n=>n.scale(1,1.0,easeOutCubic)),...texts.map(n=>n.opacity(1,1)));
    yield* waitFor(180);
  });
  desc.name='explainer';desc.onReplaced={current:desc};
  return {renderer:new Renderer({name:'explainer',scenes:[desc],logger,variables:{},experimentalFeatures:false}),logger};
}
export function MotionDiagram({labels,accent}){
  const frame=useCurrentFrame(), {fps}=useVideoConfig();
  const canvas=useRef(null);
  const [{renderer,logger}]=useState(()=>createRenderer(labels,accent));
  useEffect(()=>{
    let alive=true;
    const handle=delayRender('Render Motion Canvas diagram');
    renderer.renderFrame({size:new Vector2(900,420),fps,resolutionScale:1,background:null,colorSpace:'srgb'},frame/fps).then(()=>{
      const failure=logger.history.find(x=>x.level==='error');
      if(failure) throw new Error(failure.message||'Motion Canvas failed');
      if(alive&&canvas.current){const ctx=canvas.current.getContext('2d');ctx.clearRect(0,0,900,420);ctx.drawImage(renderer.stage.finalBuffer,0,0);}
      continueRender(handle);
    }).catch(error=>{console.error(error);cancelRender(error);});
    return()=>{alive=false;};
  },[frame,fps,renderer,logger]);
  return <canvas ref={canvas} width="900" height="420" style={{width:'100%',height:'100%',objectFit:'contain'}} aria-label="Animated vector diagram"/>;
}
