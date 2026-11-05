import * as THREE from '../vendor/three.module.min.js';
import { vertex, fragment } from './shaders.js';
import { makeRayExhibit } from './rays.js';
import { DURATION, CHAPTERS, CAPTIONS, chapterAt } from './story.js';
const $=id=>document.getElementById(id), app=$('app');
const gsap=window.gsap;
let renderer, scene, quad, camera, u, exhibit, exhibitScene, exhibitCamera;
let started=false,playing=false,ready=false,time=0,last=performance.now(),wasPlaying=false,captions=true,exporting=false;
const audio=new Audio('./audio/master.mp3');audio.preload='auto';
const state={inclination:.23,distance:22,lensing:1,diskOpacity:1,exposure:1.08,diagram:0,rayReveal:0,fade:1,callout:0};
let chapter=-1;
let rayTarget,displayScene,renderScale=.65;
// GSAP is used as a paused, seekable director's score. Rendering/export never
// depends on wall-clock tween callbacks, so a frame is reproducible at any t.
const edit=gsap.timeline({paused:true});
edit.to(state,{distance:18,inclination:.19,duration:11,ease:'sine.inOut'},0)
 .to(state,{inclination:.92,distance:24,duration:6,ease:'power2.inOut'},12)
 .to(state,{inclination:.27,distance:20,duration:7,ease:'sine.inOut'},19)
 .to(state,{rayReveal:1,duration:1.8,ease:'power2.inOut'},27)
 .to(state,{rayReveal:0,duration:1.4,ease:'sine.inOut'},39.5)
 .to(state,{inclination:.17,distance:20,duration:2,ease:'sine.inOut'},40)
 .to(state,{diagram:1,duration:2,ease:'sine.inOut'},43)
 .to(state,{diagram:0,duration:2,ease:'sine.inOut'},54.5)
 .to(state,{inclination:.33,distance:29,duration:12,ease:'sine.inOut'},57)
 .to(state,{fade:.65,duration:3,ease:'sine.inOut'},71);
const smooth=(a,b,x)=>{const q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q)};
function size(){if(!renderer)return;const w=app.clientWidth,h=app.clientHeight;const ratio=Math.min(devicePixelRatio||1,w<700?1:1.25);renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);if(rayTarget)rayTarget.setSize(Math.max(1,Math.round(w*ratio*renderScale)),Math.max(1,Math.round(h*ratio*renderScale)));u.resolution.value.set(w,h);exhibitCamera.aspect=w/h;exhibitCamera.fov=w<h?64:43;exhibitCamera.updateProjectionMatrix();}
function paint(t){
 edit.seek(t,false);
 u.time.value=t;for(const k of ['inclination','diskOpacity','exposure','diagram','rayReveal','fade'])u[k].value=state[k];u.distanceToHole.value=state.distance;
 if(!started){u.distanceToHole.value=24;u.inclination.value=.23;}
 renderer.setRenderTarget(rayTarget);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.clear();renderer.render(displayScene,camera);
 if(state.rayReveal>.001){renderer.clearDepth();exhibit.update(t,state.rayReveal);renderer.render(exhibitScene,exhibitCamera);}
 const idx=chapterAt(t), ch=CHAPTERS[idx];
 if(idx!==chapter){chapter=idx;$('number').textContent=`0${idx+1} / 05`;$('chapterTitle').textContent=ch.title;$('calloutLabel').textContent=ch.label;$('calloutDetail').textContent=ch.detail;}
 if(idx===1){$('calloutLabel').textContent=t>=20?'EVENT HORIZON':'ACCRETION DISK';$('calloutDetail').textContent=t>=20?'A causal boundary, not a solid surface. No escaping light from inside.':ch.detail;}
 const call=smooth(ch.start+1,ch.start+2,t)*(1-smooth(ch.end-1.6,ch.end-.4,t));
 $('callout').style.opacity=started&&state.diagram<.5&&state.rayReveal<.5?call*.9:0;
 $('diagramLabels').style.opacity=state.diagram;
 const cue=CAPTIONS.find(c=>t>=c.start&&t<c.end);
 $('subtitles').replaceChildren();
 if(captions&&cue&&started){const span=document.createElement('span');span.textContent=cue.text;$('subtitles').append(span);}
 $('clock').textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;$('seek').value=t;
 const ending=smooth(69.5,72,t);$('ending').hidden=ending<=0;$('ending').style.opacity=ending;
 if(started&&t>=DURATION){playing=false;$('play').textContent='▶';}
}
function setPlay(v){playing=v;$('play').textContent=v?'Ⅱ':'▶';if(v){audio.play().catch(()=>{playing=false;$('play').textContent='▶';$('loading').textContent='Tap Play to enable audio.';});}else audio.pause();}
function begin(){if(!ready)return;if(!started){started=true;app.dataset.started='true';$('intro').hidden=true;$('intro').style.display='none';}if(time>=DURATION)time=0;audio.currentTime=time;setPlay(true);last=performance.now();paint(time);}
function seek(t){time=Math.max(0,Math.min(DURATION,t));audio.currentTime=time;paint(time);}
$('begin').onclick=begin;
$('play').onclick=()=>started?setPlay(!playing):begin();
$('restart').onclick=$('replay').onclick=()=>{seek(0);begin();};
$('seek').oninput=e=>seek(Number(e.target.value));
$('sound').onclick=()=>{audio.muted=!audio.muted;$('sound').textContent=audio.muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-pressed',String(!audio.muted));};
$('captions').onclick=()=>{captions=!captions;$('captions').setAttribute('aria-pressed',String(captions));paint(time);};
$('home').onclick=e=>{e.preventDefault();setPlay(false);seek(0);started=false;app.dataset.started='false';$('intro').hidden=false;$('intro').style.display='grid';gsap.set($('intro'),{opacity:1});};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await app.requestFullscreen();}catch{ $('fullscreen').title='Fullscreen unavailable in this embed';}};
document.addEventListener('keydown',e=>{if(e.target.closest('button,input,a'))return;if(e.code==='Space'){e.preventDefault();started?setPlay(!playing):begin();}if(e.key.toLowerCase()==='r'){seek(0);begin();}if(e.key.toLowerCase()==='m')$('sound').click();if(e.key==='ArrowRight')seek(time+5);if(e.key==='ArrowLeft')seek(time-5);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){wasPlaying=playing;setPlay(false);}else if(wasPlaying){setPlay(true);}});
window.addEventListener('resize',size);
async function init(){try{
 renderer=new THREE.WebGLRenderer({canvas:$('film'),antialias:true,powerPreference:'high-performance'});renderer.autoClear=false;renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 u={resolution:{value:new THREE.Vector2(1,1)},time:{value:0},inclination:{value:.23},distanceToHole:{value:22},lensing:{value:1},diskOpacity:{value:1},exposure:{value:1.08},diagram:{value:0},rayReveal:{value:0},fade:{value:1},tint:{value:new THREE.Vector3(1,.99,.96)}};
 const mat=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:u,depthTest:false,depthWrite:false});
 quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);scene.add(quad);
 rayTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
 displayScene=new THREE.Scene();displayScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:rayTarget.texture,depthTest:false,depthWrite:false,toneMapped:false})));
 exhibitScene=new THREE.Scene();exhibit=makeRayExhibit();exhibitScene.add(exhibit.group);exhibitCamera=new THREE.PerspectiveCamera(43,1,.1,100);exhibitCamera.position.set(8,5.2,11);exhibitCamera.lookAt(0,.2,0);
 size();paint(0);ready=true;$('begin').disabled=false;$('loading').textContent='READY · SOUND ON';
 window.lightfall={duration:DURATION,seek,pause:()=>setPlay(false),play:begin,frame(t){started=true;playing=false;audio.pause();app.dataset.started='true';app.classList.add('export');$('intro').style.display='none';time=t;paint(t);},setResolution(w,h){renderer.setPixelRatio(1);renderer.setSize(w,h,false);if(rayTarget)rayTarget.setSize(Math.max(1,Math.round(w*ratio*renderScale)),Math.max(1,Math.round(h*ratio*renderScale)));u.resolution.value.set(w,h);exhibitCamera.aspect=w/h;exhibitCamera.updateProjectionMatrix();},setRenderScale(v){renderScale=Math.max(.2,Math.min(1,v));size();},get time(){return time;},get renderer(){return renderer;}};
 const params=new URLSearchParams(location.search);if(params.has('t')){started=true;app.dataset.started='true';$('intro').style.display='none';seek(Number(params.get('t'))||0);}
 function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;if(playing){time=Math.min(DURATION,audio.currentTime);paint(time);if(time>=DURATION)setPlay(false);}else if(!started){paint(5+Math.sin(now*.00012)*.6);}}
 requestAnimationFrame(frame);
 }catch(e){console.error(e);$('error').hidden=false;}}
audio.addEventListener('ended',()=>{time=DURATION;setPlay(false);paint(time);});
$('film').addEventListener('webglcontextlost',e=>{e.preventDefault();setPlay(false);$('error').hidden=false;});
init();
