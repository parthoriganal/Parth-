import React, {useLayoutEffect,useRef,useState} from 'react';
import {useCurrentFrame, useVideoConfig, getRemotionEnvironment, cancelRender} from 'remotion';
import * as THREE from 'three';

function rounded(width,height,r,depth,material){
  const x=-width/2,y=-height/2,s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);s.lineTo(x+width,y+height-r);s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);s.lineTo(x+r,y+height);s.quadraticCurveTo(x,y+height,x,y+height-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  return new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:0.035,bevelSize:0.035,bevelSegments:3,curveSegments:12}),material);
}
function phone(){
  const group=new THREE.Group();
  const edge=new THREE.MeshStandardMaterial({color:'#8c89a2',metalness:.86,roughness:.24});
  const body=rounded(1.43,2.65,.23,.15,edge);group.add(body);
  const black=rounded(1.34,2.55,.20,.015,new THREE.MeshStandardMaterial({color:'#10101a',metalness:.45,roughness:.2}));black.position.z=.19;group.add(black);
  const screen=document.createElement('canvas');screen.width=512;screen.height=960;const c=screen.getContext('2d');
  let gradient=c.createLinearGradient(0,0,512,960);gradient.addColorStop(0,'#292548');gradient.addColorStop(.42,'#53478c');gradient.addColorStop(.7,'#17162d');gradient.addColorStop(1,'#0e101a');c.fillStyle=gradient;c.fillRect(0,0,512,960);
  const glow=c.createRadialGradient(400,240,0,400,240,340);glow.addColorStop(0,'rgba(214,192,255,.75)');glow.addColorStop(.3,'rgba(128,109,230,.32)');glow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=glow;c.fillRect(0,0,512,960);
  c.fillStyle='rgba(255,255,255,.86)';c.font='500 72px sans-serif';c.fillText('09:41',52,170);c.font='22px sans-serif';c.fillStyle='rgba(255,255,255,.57)';c.fillText('A WORLD OF IDEAS',55,210);
  c.fillStyle='rgba(255,255,255,.10)';for(let i=0;i<4;i++){c.beginPath();c.roundRect(52+i*102,782,75,75,22);c.fill();}
  const tex=new THREE.CanvasTexture(screen);tex.colorSpace=THREE.SRGBColorSpace;
  const face=rounded(1.23,2.42,.16,.004,new THREE.MeshBasicMaterial({map:tex}));face.position.z=.235;group.add(face);
  const notch=rounded(.4,.09,.045,.005,new THREE.MeshBasicMaterial({color:'#09090c'}));notch.position.set(0,1.07,.255);group.add(notch);
  const side=new THREE.Mesh(new THREE.BoxGeometry(.035,.36,.06),edge);side.position.set(.752,.45,.05);group.add(side);
  return group;
}
function clock(){
  const g=new THREE.Group();const metal=new THREE.MeshStandardMaterial({color:'#bcb8c8',metalness:.85,roughness:.26});const face=new THREE.MeshStandardMaterial({color:'#171625',metalness:.18,roughness:.48});
  const cylinder=(r,d,mat,z)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d,64),mat);m.rotation.x=Math.PI/2;m.position.z=z;g.add(m);return m;};
  cylinder(1.18,.22,metal,0);cylinder(1.08,.04,face,.15);
  for(let i=0;i<12;i++){let tick=new THREE.Mesh(new THREE.BoxGeometry(.035,i%3===0?.16:.09,.025),new THREE.MeshBasicMaterial({color:'#ded9ef'}));tick.position.set(Math.sin(i*Math.PI/6)*.92,Math.cos(i*Math.PI/6)*.92,.19);tick.rotation.z=-i*Math.PI/6;g.add(tick);}
  const hand=(w,h,angle,color)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.025),new THREE.MeshBasicMaterial({color}));m.position.set(Math.sin(angle)*h*.33,Math.cos(angle)*h*.33,.23);m.rotation.z=-angle;g.add(m);};hand(.055,.65,Math.PI*.25,'#f0ecff');hand(.035,.85,Math.PI*1.2,'#ae97ff');cylinder(.06,.03,new THREE.MeshBasicMaterial({color:'#ffffff'}),.26);return g;
}
function globe(){
  const g=new THREE.Group();const sphere=new THREE.Mesh(new THREE.SphereGeometry(1.08,48,32),new THREE.MeshStandardMaterial({color:'#343167',metalness:.38,roughness:.34}));g.add(sphere);
  const mat=new THREE.LineBasicMaterial({color:'#c3b5ff',transparent:true,opacity:.52});
  for(let j=-3;j<=3;j++){const lat=j*Math.PI/9,points=[];for(let i=0;i<=96;i++){const a=i*Math.PI*2/96;points.push(new THREE.Vector3(Math.cos(lat)*Math.sin(a)*1.086,Math.sin(lat)*1.086,Math.cos(lat)*Math.cos(a)*1.086));}g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),mat));}
  for(let j=0;j<8;j++){const lon=j*Math.PI/8,points=[];for(let i=0;i<=96;i++){const a=i*Math.PI*2/96;points.push(new THREE.Vector3(Math.sin(lon)*Math.cos(a)*1.088,Math.sin(a)*1.088,Math.cos(lon)*Math.cos(a)*1.088));}g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),mat));}
  return g;
}
export function ThreeObject({type}){
  const ref=useRef(null), state=useRef(null), frame=useCurrentFrame(),{fps}=useVideoConfig();const [failed,setFailed]=useState(false);
  useLayoutEffect(()=>{
    try{
      const renderer=new THREE.WebGLRenderer({canvas:ref.current,alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(800,800,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(33,1,.1,100);camera.position.set(0,0,6.4);
      scene.add(new THREE.AmbientLight(0xc3bfff,1.5));const key=new THREE.DirectionalLight(0xffffff,3.5);key.position.set(-3,5,6);key.castShadow=true;key.shadow.mapSize.set(512,512);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.camera.near=.5;key.shadow.camera.far=20;scene.add(key);const rim=new THREE.DirectionalLight(0x8b70ff,4);rim.position.set(4,-2,-1);scene.add(rim);
      const object=type==='object-clock'?clock():type==='object-globe'?globe():phone();object.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(object);const ground=new THREE.Mesh(new THREE.PlaneGeometry(7,7),new THREE.ShadowMaterial({opacity:.35}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.55;ground.receiveShadow=true;scene.add(ground);state.current={renderer,scene,camera,object};
      return()=>{scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose?.();m.dispose?.();}}});renderer.dispose();state.current=null;};
    }catch(error){console.error('3D preview unavailable:',error);if(getRemotionEnvironment().isRendering)cancelRender(error);else setFailed(true);}
  },[type]);
  useLayoutEffect(()=>{const s=state.current;if(!s)return;const t=frame/fps;s.object.rotation.set(type==='object-phone'?.09:.06, type==='object-phone'?-.30+Math.sin(t*.45)*.09:.14+Math.sin(t*.3)*.13, type==='object-phone'?.10:0);s.object.position.y=Math.sin(t*.8)*.025;s.camera.position.set(Math.sin(t*.31)*.12,Math.sin(t*.24)*.07,6.4+Math.cos(t*.2)*.1);s.camera.lookAt(0,0,0);s.renderer.render(s.scene,s.camera);},[frame,fps,type]);
  return failed?<div style={{color:'#c2b7e8',fontSize:22}}>3D preview requires WebGL</div>:<canvas ref={ref} width="800" height="800" style={{width:'100%',height:'100%',objectFit:'contain'}} aria-label="Lit three-dimensional object"/>;
}
