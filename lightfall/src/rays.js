// A separate spatial explanation: deliberately schematic curves, not solved
// photon tracks. The main screen-space lensing view uses numerical ray orbits.
import * as THREE from '../vendor/three.module.min.js';
export function makeRayExhibit(){
 const group=new THREE.Group();
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(1.05,48,32),new THREE.MeshBasicMaterial({color:0x010204}));group.add(sphere);
 const shell=new THREE.Mesh(new THREE.SphereGeometry(1.07,32,20),new THREE.MeshBasicMaterial({color:0x29616a,wireframe:true,transparent:true,opacity:.13}));group.add(shell);
 const disk=new THREE.Mesh(new THREE.RingGeometry(2.1,4.5,120,12),new THREE.MeshBasicMaterial({color:0xe1a665,side:THREE.DoubleSide,transparent:true,opacity:.13}));disk.rotation.x=-Math.PI/2;group.add(disk);
 for(const r of [2.1,2.8,3.6,4.5]){const curve=new THREE.EllipseCurve(0,0,r,r,0,Math.PI*2);const g=new THREE.BufferGeometry().setFromPoints(curve.getPoints(160));const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xb57d4c,transparent:true,opacity:.35}));l.rotation.x=-Math.PI/2;group.add(l);}
 const rays=[];
 for(let i=0;i<19;i++){
  const f=(i-9)/9;
  const path=new THREE.CatmullRomCurve3([
   new THREE.Vector3(-3.6,f*.12,-2.2),new THREE.Vector3(-1.9,1.35+f*.3,-1.15),
   new THREE.Vector3(.2,1.6+f*.40,.0),new THREE.Vector3(2.,1.3+f*.60,1.6),new THREE.Vector3(5.8,.5+f*.8,4.)]);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.getPoints(160)),new THREE.LineBasicMaterial({color:i%3===0?0xffc788:0x8acdd9,transparent:true,opacity:i===9?.95:.18}));group.add(line);
  const photon=new THREE.Mesh(new THREE.SphereGeometry(i===9?.065:.026,8,6),new THREE.MeshBasicMaterial({color:i%3===0?0xffdc9f:0xb9f2ff}));group.add(photon);rays.push({path,line,photon,phase:i/19});
 }
 // Captured paths stop at the boundary; no escaping trajectories from inside.
 for(let i=0;i<6;i++){
  const f=(i-2.5)*.1;const path=new THREE.CatmullRomCurve3([new THREE.Vector3(-4.6,.1+f,0),new THREE.Vector3(-2.5,.4+f,0),new THREE.Vector3(-1.04,.10,0)]);
  const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.getPoints(60)),new THREE.LineBasicMaterial({color:0xe99d63,transparent:true,opacity:.3}));group.add(l);
 }
 const receiver=new THREE.Mesh(new THREE.OctahedronGeometry(.15),new THREE.MeshBasicMaterial({color:0x9de0e8}));receiver.position.set(5.8,.5,4);group.add(receiver);
 function update(t,amount){group.visible=amount>.001;for(const r of rays){r.photon.position.copy(r.path.getPoint((t*.14+r.phase)%1));r.line.material.opacity=(r===rays[9]?.95:.18)*amount;}group.rotation.y=-.2+Math.sin(t*.08)*.18;group.rotation.z=.06;}
 return {group,update};
}
