import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const VALUE_DURATION=24;
export const TYPE_EVENTS=[0,.12,.24,.48,.61,.74,1.05,1.18,1.31,4,4.12,4.24,4.55,4.68,4.81,5.18,5.31,5.44,8,8.12,8.24,8.55,8.68,8.81,9.18,9.31,9.44,12,12.12,12.24,12.55,12.68,12.81,13.18,13.31,13.44,16,16.12,16.24,16.55,16.68,16.81,17.18,17.31,17.44,20,20.12,20.24,20.55,20.68,20.81,21.18,21.31,21.44];
const W=720,H=1280,TAU=Math.PI*2;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=n=>1-Math.pow(1-clamp(n),3);

export function createValueFilm(canvas){
 canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(34,W/H,.1,100);camera.position.set(0,0,23);camera.lookAt(0,0,0);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;pmrem.dispose();room.dispose();
 scene.add(new THREE.HemisphereLight(0xfff7e5,0x30363d,2));
 const key=new THREE.DirectionalLight(0xfff2d9,4);key.position.set(-5,8,12);key.castShadow=true;key.shadow.mapSize.set(1536,1536);Object.assign(key.shadow.camera,{left:-8,right:8,top:11,bottom:-11});key.shadow.normalBias=.03;key.shadow.radius=4;scene.add(key);
 const rim=new THREE.DirectionalLight(0xd6e8ff,4);rim.position.set(5,1,-1);scene.add(rim);
 const front=new THREE.DirectionalLight(0xffffff,1.5);front.position.set(2,-3,8);scene.add(front);
 const plane=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.2}));plane.position.z=-3;plane.receiveShadow=true;scene.add(plane);
 const mats={gold:new THREE.MeshStandardMaterial({color:0xaa8040,metalness:1,roughness:.26}),bright:new THREE.MeshStandardMaterial({color:0xd5b87c,metalness:1,roughness:.2}),silver:new THREE.MeshStandardMaterial({color:0xa9adb0,metalness:1,roughness:.27}),black:new THREE.MeshStandardMaterial({color:0x121715,metalness:.45,roughness:.22}),ivory:new THREE.MeshStandardMaterial({color:0xe7e2d2,metalness:.12,roughness:.28})};
 function m(geo,mat,parent,x=0,y=0,z=0){const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function cylinder(rt,rb,h,mat,parent,x=0,y=0,z=0,sides=80){return m(new THREE.CylinderGeometry(rt,rb,h,sides),mat,parent,x,y,z);}
 function torus(r,t,mat,parent,x=0,y=0,z=0){return m(new THREE.TorusGeometry(r,t,16,96),mat,parent,x,y,z);}
 function lathe(points,mat,parent){return m(new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),96),mat,parent);}
 function group(){return new THREE.Group();}
 const registry=[];
 function makeCoin(){
  const g=group();const body=cylinder(1.65,1.65,.17,mats.silver,g);body.rotation.x=Math.PI/2;
  for(let i=0;i<100;i++){const a=i*TAU/100;const line=m(new THREE.BoxGeometry(.026,.075,.2),mats.silver,g,Math.sin(a)*1.644,Math.cos(a)*1.644,0);line.rotation.z=-a;}
  torus(1.59,.037,mats.silver,g,0,0,.112);torus(1.47,.015,mats.bright,g,0,0,.127);
  const c=document.createElement('canvas');c.width=c.height=1024;const d=c.getContext('2d');d.fillStyle='#a7a9a4';d.fillRect(0,0,1024,1024);d.translate(512,512);
  // Original engraved face: guilloche, border lettering, raised crest and laurel.
  for(let i=0;i<260;i++){let a=i*TAU/260;d.strokeStyle=i%2?'#8b8e88':'#bfc1b9';d.lineWidth=1;d.beginPath();d.moveTo(Math.sin(a)*220,Math.cos(a)*220);d.lineTo(Math.sin(a)*425,Math.cos(a)*425);d.stroke();}
  for(let i=0;i<80;i++){let a=i*TAU/80;d.fillStyle='#d5d7ce';d.beginPath();d.arc(Math.sin(a)*463,Math.cos(a)*463,3.2,0,TAU);d.fill();}
  function arcText(text,r,start){d.save();const step=.083;for(let i=0;i<text.length;i++){let a=start+(i-(text.length-1)/2)*step;d.save();d.rotate(a);d.fillStyle='#555d56';d.font='600 31px Cormorant';d.textAlign='center';d.fillText(text[i],0,-r);d.fillStyle='#eff0e4';d.fillText(text[i],-1,-r-1);d.restore();}d.restore();}
  arcText('M A I S O N  •  M M X X V I',386,0);arcText('V A L U E   I S   B U I L T',386,Math.PI);
  for(let side of [-1,1])for(let i=0;i<10;i++){let a=-.15+i*.15,x=side*(160+Math.sin(a)*110),y=230-Math.cos(a)*350;d.save();d.translate(x,y);d.rotate(side*(.2+i*.12));d.fillStyle='#d2d5c8';d.beginPath();d.ellipse(0,0,13,35,side*.6,0,TAU);d.fill();d.strokeStyle='#73796c';d.lineWidth=3;d.beginPath();d.moveTo(0,24);d.lineTo(0,-24);d.stroke();d.restore();}
  d.strokeStyle='#535c50';d.lineWidth=5;d.beginPath();d.moveTo(-130,-185);d.lineTo(130,-185);d.lineTo(120,50);d.quadraticCurveTo(70,155,0,188);d.quadraticCurveTo(-70,155,-120,50);d.closePath();d.stroke();d.fillStyle='#c3c7b8';d.fill();d.fillStyle='#515a4e';d.font='500 200px Cormorant';d.textAlign='center';d.fillText('M',0,40);d.fillStyle='#e5e7da';d.fillText('M',-2,37);d.font='400 26px Manrope';d.fillStyle='#51594d';d.fillText('INTRINSIC • 001',0,280);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const mapMat=new THREE.MeshStandardMaterial({map:tex,bumpMap:tex,bumpScale:.055,metalness:.55,roughness:.38,envMapIntensity:.65});m(new THREE.CircleGeometry(1.53,128),mapMat,g,0,0,.116);m(new THREE.CircleGeometry(1.53,128),mapMat.clone(),g,0,0,-.116).rotation.y=Math.PI;
  return g;
 }
 function makeDiamond(){
  const g=group(),verts=[],N=16,rings=[];
  for(const [r,y,offset] of [[.62,.85,0],[1.48,.05,0],[1.48,-.04,0],[.69,-.9,Math.PI/N],[.02,-1.5,0]]){const row=[];for(let i=0;i<N;i++){let a=i*TAU/N+offset;row.push(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}rings.push(row);}
  const tri=(a,b,c)=>verts.push(...a.toArray(),...b.toArray(),...c.toArray());
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<N;i++){let k=(i+1)%N;tri(rings[j][i],rings[j+1][i],rings[j][k]);tri(rings[j][k],rings[j+1][i],rings[j+1][k]);}for(let i=0;i<N;i++)tri(new THREE.Vector3(0,.85,0),rings[0][(i+1)%N],rings[0][i]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();
  const crystal=new THREE.MeshPhysicalMaterial({color:0xcbdde2,metalness:.28,roughness:.025,transmission:.65,thickness:2.1,ior:2.417,dispersion:.18,clearcoat:1,flatShading:true,side:THREE.DoubleSide,envMapIntensity:2});
  m(geo,crystal,g);const setting=torus(1.45,.038,mats.bright,g,0,.02,0);setting.rotation.x=Math.PI/2;
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo,20),new THREE.LineBasicMaterial({color:0xe8fbff,transparent:true,opacity:.15}));g.add(edges);return g;
 }
 function makeChess(){
  const g=group();lathe([[0,-2.1],[.99,-2.1],[1.06,-1.98],[1.06,-1.82],[.96,-1.68],[.9,-1.56],[.78,-1.48],[.69,-1.35],[.56,-1.05],[.44,-.65],[.36,-.08],[.37,.35],[.53,.68],[.66,.76],[.67,.91],[.46,1.02],[.38,1.1],[.33,1.35],[0,1.35]],mats.black,g);
  for(const [y,r] of [[-1.91,1.06],[-1.66,.95],[.79,.67],[1.02,.45]]){let ring=torus(r,.032,mats.bright,g,0,y,0);ring.rotation.x=Math.PI/2;}
  m(new THREE.BoxGeometry(.16,.95,.2),mats.bright,g,0,1.65,0);m(new THREE.BoxGeometry(.64,.16,.2),mats.bright,g,0,1.85,0);
  return g;
 }
 function makePen(){
  const g=group();lathe([[0,-2.55],[.09,-2.5],[.17,-2.2],[.22,-1.8],[.24,-1.5],[.245,1.7],[.2,2.05],[.1,2.2],[0,2.22]],mats.black,g);
  for(let y of [-1.5,-1.42,1.25,1.33]){const ring=torus(.247,.026,mats.bright,g,0,y,0);ring.rotation.x=Math.PI/2;}
  const cap=group();cylinder(.29,.28,1.12,mats.black,cap,0,.57);const capTop=m(new THREE.SphereGeometry(.29,32,16),mats.black,cap,0,1.13);capTop.scale.y=.5;
  for(let y of [.04,.13]){let r=torus(.289,.02,mats.bright,cap,0,y);r.rotation.x=Math.PI/2;}
  const clip=m(new THREE.BoxGeometry(.075,.85,.06),mats.bright,cap,.08,.66,.29);clip.rotation.z=-.04;m(new THREE.SphereGeometry(.055,16,12),mats.bright,cap,.09,.25,.29);cap.position.set(.9,1,0);cap.rotation.z=-.17;g.add(cap);g.userData.cap=cap;
  const nibShape=new THREE.Shape();nibShape.moveTo(0,-3.25);nibShape.lineTo(-.18,-2.6);nibShape.quadraticCurveTo(-.25,-2.2,-.1,-2.05);nibShape.lineTo(.1,-2.05);nibShape.quadraticCurveTo(.25,-2.2,.18,-2.6);nibShape.closePath();m(new THREE.ExtrudeGeometry(nibShape,{depth:.05,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:2}),mats.bright,g,0,0,.08);
  m(new THREE.BoxGeometry(.012,.8,.008),mats.black,g,0,-2.65,.153);m(new THREE.CircleGeometry(.035,24),mats.black,g,0,-2.26,.155);
  return g;
 }
 function makeHourglass(){
  const g=group();for(let y of [-1.83,1.83]){cylinder(1.12,1.12,.18,mats.black,g,0,y);let ring=torus(1.1,.055,mats.bright,g,0,y);ring.rotation.x=Math.PI/2;}
  for(let i=0;i<4;i++){let a=i*TAU/4+Math.PI/4;cylinder(.045,.045,3.5,mats.bright,g,Math.cos(a)*.9,0,Math.sin(a)*.9);}
  const glass=new THREE.MeshPhysicalMaterial({color:0xd1e5df,metalness:0,roughness:.045,transmission:.9,opacity:.32,transparent:true,thickness:.08,ior:1.45,side:THREE.DoubleSide});
  lathe([[.68,-1.68],[.77,-1.5],[.77,-1.25],[.64,-.92],[.43,-.53],[.17,-.2],[.095,0],[.17,.2],[.43,.53],[.64,.92],[.77,1.25],[.77,1.5],[.68,1.68]],glass,g);
  const sandMat=new THREE.MeshStandardMaterial({color:0xc7a15f,roughness:.95,metalness:.05});cylinder(.01,.59,.7,sandMat,g,0,-1.21,0);cylinder(.54,.19,.53,sandMat,g,0,1.23,0);cylinder(.012,.012,2.1,sandMat,g,0,-.1,0,10);
  for(let i=0;i<14;i++){const p=m(new THREE.IcosahedronGeometry(.018,0),mats.bright,g);p.position.set(Math.sin(i*5)*.035,1.4-i*.19,Math.cos(i*5)*.035);}
  return g;
 }
 const factories=[makeCoin,makeDiamond,makeChess,makePen,makeHourglass];const heroes=factories.map(f=>{let g=f();scene.add(g);registry.push(g);return g;});
 // Persistent rotating corner props are independent, fully modelled objects.
 const cornerCoins=[makeCoin(),makeCoin()];cornerCoins.forEach(g=>scene.add(g));const cornerDiamond=makeDiamond();scene.add(cornerDiamond);const cornerKing=makeChess();scene.add(cornerKing);
 const dust=[];for(let i=0;i<12;i++){const p=m(new THREE.OctahedronGeometry(.025+(i%3)*.012,0),mats.bright,scene);dust.push(p);}
 // These original SVGs are rendered into the exported film, not just page decorations.
 const svgImages=[];
 function svgImage(source){const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);svgImages.push(img);return img;}
 const compass=svgImage(`<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260"><g fill="none" stroke="#8b826a" stroke-width=".8"><circle cx="130" cy="130" r="105"/><circle cx="130" cy="130" r="91" stroke-dasharray="1 7"/><path d="M130 0v38m0 184v38M0 130h38m184 0h38M59 59l23 23m96 96l23 23M59 201l23-23m96-96l23-23"/><path d="m130 43 9 78 78 9-78 9-9 78-9-78-78-9 78-9Z"/></g></svg>`);
 const seal=svgImage(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><g fill="none" stroke="#aaa080" stroke-width="1"><circle cx="100" cy="100" r="86"/><circle cx="100" cy="100" r="77" stroke-dasharray="2 4"/><path d="m100 29 17 49 52 1-42 31 16 50-43-30-43 30 16-50-42-31 52-1Z"/><circle cx="100" cy="100" r="22"/></g></svg>`);
 function text(str,x,y,size=48,opts={}){ctx.save();ctx.font=`${opts.italic?'italic ':''}${opts.weight||800} ${size}px ${opts.serif?'Cormorant':'Manrope'}`;ctx.fillStyle=opts.color||'#20241f';ctx.globalAlpha=opts.alpha??1;ctx.textAlign=opts.align||'center';ctx.textBaseline='middle';if(opts.spacing)ctx.letterSpacing=opts.spacing+'px';ctx.fillText(str,x,y);ctx.restore();}
 function kinetic(str,x,y,size,delay,local,opts={}){ctx.save();ctx.font=`${opts.italic?'italic ':''}${opts.weight||800} ${size}px ${opts.serif?'Cormorant':'Manrope'}`;const widths=[...str].map(c=>ctx.measureText(c).width);let total=widths.reduce((a,b)=>a+b,0),cursor=x-total/2;[...str].forEach((c,i)=>{let p=ease((local-delay-i*.024)/.3);ctx.save();ctx.globalAlpha=p;ctx.fillStyle=opts.color||'#20241f';ctx.textAlign='left';ctx.textBaseline='middle';ctx.translate(cursor,y+(1-p)*25);ctx.rotate((1-p)*-.05);ctx.fillText(c,0,0);ctx.restore();cursor+=widths[i];});ctx.restore();}
 function caption(lines,y,local,color){const alpha=ease((local-1.18)/.5);for(let i=0;i<lines.length;i++){const visible=Math.floor(clamp((local-1.18-i*.15)/.85)*lines[i].length);text(lines[i].slice(0,visible),360,y+i*27,17,{weight:400,color,alpha});}}
 function drawSvg(img,x,y,size,angle,alpha=.5){if(!img.complete||!img.naturalWidth)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;ctx.drawImage(img,-size/2,-size/2,size,size);ctx.restore();}
 function render(t){t=clamp(t,0,VALUE_DURATION);const ch=Math.min(5,Math.floor(t/4)),local=t-ch*4,p=ease(local/.8),exit=ease((local-3.65)/.35);const dark=ch===2||ch===5,ink=dark?'#eae8dc':'#242823',sub=dark?'#bdab83':'#84785f';
  ctx.fillStyle=dark?'#191e1b':'#f2f1ec';ctx.fillRect(0,0,W,H);const bg=ctx.createRadialGradient(300,480,80,360,640,900);bg.addColorStop(0,dark?'#3b493233':'#ffffffcc');bg.addColorStop(1,dark?'#02090599':'#aba99333');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // Localised dotted grids and long, animated SVG-like orbital curves.
  for(const [cx,cy,rad] of [[330,480,330],[590,1150,280]]){for(let x=0;x<=W;x+=34)for(let y=0;y<=H;y+=34){let fade=clamp(1-Math.hypot(x-cx,y-cy)/rad);if(!fade)continue;ctx.fillStyle=dark?`rgba(196,184,147,${fade*.23})`:`rgba(54,66,48,${fade*.2})`;ctx.beginPath();ctx.arc(x,y,1.6,0,TAU);ctx.fill();ctx.strokeStyle=dark?`rgba(196,184,147,${fade*.12})`:`rgba(54,66,48,${fade*.1})`;ctx.lineWidth=.7;ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(x-17,y);ctx.lineTo(x+17,y);ctx.moveTo(x,y-17);ctx.lineTo(x,y+17);ctx.stroke();ctx.setLineDash([]);}}
  ctx.save();ctx.translate(360,640);ctx.rotate(Math.sin(t*.12)*.15);ctx.strokeStyle=dark?'#b2a58033':'#5864534a';ctx.lineWidth=1.1;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(-150+i*110,-220+i*430,760+i*90,270+i*30,-.35+i*.13,0,TAU);ctx.stroke();}ctx.restore();
  drawSvg(compass,92,920,170,t*.17,dark?.3:.25);drawSvg(seal,625,152,110,-t*.3,.45);
  // Independent corner models, rotating for the whole film rather than a static image.
  cornerCoins[0].position.set(3.85,-5.8,.7);cornerCoins[0].scale.setScalar(1.06);cornerCoins[0].rotation.set(.2,Math.sin(t*.5)*.55,-.3+t*.06);
  cornerCoins[1].position.set(-4.65,5.85,-.2);cornerCoins[1].scale.setScalar(.65);cornerCoins[1].rotation.set(t*.15,t*.5,.25);
  cornerDiamond.position.set(-3.2,-5.3,.1);cornerDiamond.scale.setScalar(.47);cornerDiamond.rotation.set(.5,t*.6,-.25);
  cornerKing.position.set(3.18,5.2,-.8);cornerKing.scale.setScalar(.38);cornerKing.rotation.set(.2,t*.55,.25);
  cornerCoins.forEach(g=>{g.visible=true;g.traverse(o=>{if(o.isMesh)o.castShadow=false;});});cornerDiamond.traverse(o=>{if(o.isMesh)o.castShadow=false;});cornerKing.traverse(o=>{if(o.isMesh)o.castShadow=false;});cornerDiamond.visible=true;cornerKing.visible=true;
  heroes.forEach((g,i)=>{g.visible=ch===i||ch===5;g.scale.setScalar(1);g.rotation.set(0,0,0);g.position.set(0,0,0);});
  if(ch===0){const g=heroes[0];g.position.set(-.35,1.3+(1-p)*1.8,0);g.scale.setScalar(1.14);g.rotation.set(.13,Math.sin(local*.9)*.6,-.08+local*.06);}
  if(ch===1){const g=heroes[1];g.position.set(0,1+(1-p)*1.4,0);g.scale.setScalar(1.35);g.rotation.set(.35,local*.53,-.25);}
  if(ch===2){const g=heroes[2];g.position.set(-.2,.6+(1-p)*1.5,0);g.scale.setScalar(.99);g.rotation.set(.1,local*.55,-.08);}
  if(ch===3){const g=heroes[3];g.position.set(-.1,1.05+(1-p)*1.5,0);g.scale.setScalar(.87);g.rotation.set(.08,-.25+local*.18,-.47);g.userData.cap.position.set(.9+p*.4,1.1+p*.25,0);}
  if(ch===4){const g=heroes[4];g.position.set(0,.8+(1-p)*1.5,0);g.scale.setScalar(1.04);g.rotation.set(.1,local*.38,-.13+Math.sin(local*.5)*.1);}
  if(ch===5){heroes.forEach((g,i)=>{const a=i*TAU/5-Math.PI/2+t*.08;g.position.set(Math.cos(a)*2.5,Math.sin(a)*1.85+1.5,Math.sin(a)*.6);g.scale.setScalar(i===3?.40:.50);g.rotation.set(.15,t*.22+i*.4,i===3?-.5:.1*Math.sin(a));});cornerDiamond.visible=false;cornerKing.visible=false;}
  dust.forEach((d,i)=>d.position.set(Math.sin(i*14+t*.11)*4.8,Math.cos(i*19+t*.09)*7.4,-1));plane.material.opacity=dark?.38:.19;renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);
  // An editorial number, measured diagram annotations and animated vector flourishes.
  text('M A I S O N  /  M O T I O N   S T U D Y',44,51,9,{weight:400,color:sub,align:'left'});text('VOL. 002',674,51,9,{weight:400,color:sub,align:'right'});
  ctx.strokeStyle=dark?'#b9ac8b60':'#56624d40';ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(44,78);ctx.lineTo(676,78);ctx.stroke();text(`0${ch+1}`,64,124,40,{serif:true,italic:true,weight:400,color:sub});
  const headings=[['Attention fades.','VALUE IS BUILT.'],['Not the price.','THE PRECISION.'],['Not the noise.','THE NEXT MOVE.'],['Not another promise.','A SIGNATURE.'],['Time is limited.','INTENTION ISN’T.'],['Choose what lasts.','BECOME INVALUABLE.']];
  const h=headings[ch];kinetic(h[0],360,806,42,.12,local,{serif:true,weight:500,italic:true,color:ink});kinetic(h[1],360,868,ch===5?43:ch===4?48:51,.55,local,{weight:800,color:ink});
  const copy=[['Attention is borrowed. Value is earned.','Build something the noise cannot replace.'],['The smallest facets make the difference.','Excellence lives where shortcuts end.'],['Move with purpose, not the crowd.','Strategy is the quietest form of power.'],['Make your work unmistakably yours.','A signature means something was considered.'],['Spend your hours on what compounds.','Less distraction. More intention.'],['Precision. Strategy. Identity. Intention.','Real value is a life, deliberately built.']];caption(copy[ch],968,local,sub);
  // Small technical callout connected to the current object.
  const names=['ENGRAVED SILVER / INTRINSIC VALUE','BRILLIANT CUT / FACET STUDY','LACQUER & GOLD / THE STRATEGIST','GOLD NIB / THE SIGNATURE','BOROSILICATE / FINITE HOURS','THE COLLECTION / FIVE PRINCIPLES'];
  text(names[ch],360,1110,8,{weight:500,color:sub,spacing:1.3,alpha:ease((local-.7)/.4)});
  ctx.save();ctx.strokeStyle=dark?'#c5ae7750':'#81725650';ctx.lineWidth=.8;ctx.setLineDash([2,4]);ctx.beginPath();ctx.moveTo(250,1070);ctx.lineTo(360,1044);ctx.lineTo(470,1070);ctx.stroke();ctx.restore();
  ctx.strokeStyle=dark?'#bdab8330':'#666b4d30';ctx.beginPath();ctx.moveTo(44,1187);ctx.lineTo(676,1187);ctx.stroke();text('CRAFTED IN THREE DIMENSIONS.',44,1223,8,{weight:400,color:sub,align:'left',spacing:1});text('MAISON  /  002',676,1223,8,{weight:400,color:sub,align:'right',spacing:1});
  // SVG-inspired expanding typography marker, timed to each main-line tick reveal.
  const pulse=clamp(1-(local-.55)/.65);if(local>.55&&pulse>0){ctx.save();ctx.globalAlpha=pulse*.6;ctx.strokeStyle=sub;ctx.beginPath();ctx.arc(360,916,(1-pulse)*18+3,0,TAU);ctx.stroke();ctx.restore();}
  ctx.save();ctx.globalAlpha=.025;for(let i=0;i<1000;i++){ctx.fillStyle=i%2?'#fff':'#111';ctx.fillRect((i*173+Math.floor(t*24)*19)%W,(i*359)%H,1,1);}ctx.restore();
  if(exit>0&&ch<5){ctx.fillStyle=`rgba(235,234,225,${exit*.7})`;ctx.fillRect(0,0,W,H);}if(t>23.5){ctx.fillStyle=`rgba(13,20,15,${clamp((t-23.5)/.5)})`;ctx.fillRect(0,0,W,H);}return ch;
 }
 return {render,duration:VALUE_DURATION,renderer,ready:Promise.all(svgImages.map(img=>img.decode().catch(()=>{})))};
}
