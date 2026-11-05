// LIGHTFALL — light bending around a non-rotating black hole.
// Units: Schwarzschild radius = 1. Rays follow the spatial orbit equation
// r'' = -3/2 Rs L² r / |r|^5, integrated with velocity Verlet.
// Finite integration steps and an artistic, optically thin emission model:
// this is a qualitative educational visualization, not a calibrated GR image.
export const vertex = `varying vec2 vUv;
void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}`;
export const fragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 resolution;
uniform float time, inclination, distanceToHole, lensing, diskOpacity, exposure, diagram, rayReveal, fade;
uniform vec3 tint;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return .55*noise(p)+.28*noise(p*2.07+7.)+.14*noise(p*4.13+13.);}
vec3 stars(vec3 d){
 vec3 p=d*220.;vec3 id=floor(p);vec3 f=fract(p)-.5;
 float h=hash(id);float s=smoothstep(.17,.0,length(f))*step(.994,h);
 vec3 col=mix(vec3(.44,.66,1.),vec3(1.,.77,.46),hash(id+12.));
 float neb=fbm(d*4.+vec3(5.,1.,2.));
 float band=exp(-pow(dot(d,normalize(vec3(.3,.6,-.4))),2.)*14.);
 return col*s*1.5 + mix(vec3(.004,.009,.018),vec3(.028,.018,.045),neb)*(.55+band*neb*2.);
}
vec3 emission(vec3 p,vec3 v){
 float r=length(p.xz);float a=atan(p.z,p.x);
 float hot=pow(3./max(3.,r),.65);
 float swirl=fbm(vec3(r*.8,a*3.+time*.1, time*.025));
 float stream=sin(r*15.+a*8.+time*.8/pow(r*.15,.6)+swirl*5.);
 float filament=noise(vec3(r*4.,a*20.+time*.12,time*.03));
 float detail=.42+.50*swirl+.12*stream+.26*filament;
 float inner=smoothstep(3.,3.4,r);float outer=1.-smoothstep(10.,12.,r);
 vec3 col=mix(vec3(.55,.06,.012),vec3(2.2,.63,.12),hot);
 col=mix(col,vec3(3.8,2.7,1.5),pow(hot,5.)*.55);
 // Qualitative Doppler brightness asymmetry. Not a spectral transfer model.
 vec3 tangent=normalize(vec3(-p.z,0.,p.x));
 float beam=pow(clamp(1.+dot(tangent,-v)*.42,.4,1.6),2.5);
 return col*detail*inner*outer*beam*diskOpacity;
}
vec3 aces(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
void main(){
 vec2 uv=vUv*2.-1.;float aspect=resolution.x/resolution.y;uv.x*=aspect;uv*=max(1.,1./aspect);
 float ang=inclination;
 vec3 ro=vec3(0.,sin(ang)*distanceToHole,cos(ang)*distanceToHole);
 vec3 forward=normalize(-ro), right=vec3(1.,0.,0.), up=normalize(cross(right,forward));
 vec3 rd=normalize(forward*1.85+right*uv.x+up*uv.y);
 // Slow, purposeful roll through the lensing reveal.
 vec3 p=ro,v=rd;
 vec3 L=cross(p,v);float L2=dot(L,L);
 vec3 color=vec3(0.);float trans=1.;bool captured=false;
 if(diagram<.999 && rayReveal<.999){
 for(int i=0;i<144;i++){
  float r=length(p);
  if(r<1.015){captured=true;break;}
  if(r>65.)break;
  float h=clamp(r*.085,.065,2.2);
  vec3 accel=-1.5*L2*p/pow(r,5.)*lensing;
  vec3 q=p+v*h+.5*accel*h*h;
  float qr=length(q);
  vec3 accel2=-1.5*L2*q/pow(max(qr,.7),5.)*lensing;
  v+=.5*(accel+accel2)*h;
  // Intersect the emitting equatorial plane. Multiple crossings are allowed.
  if(p.y*q.y<0.){
   float f=abs(p.y)/(abs(p.y)+abs(q.y));vec3 hit=mix(p,q,f);float dr=length(hit.xz);
   if(dr>3. && dr<12.){
    color+=emission(hit,normalize(v))*trans;
    trans*=.43;
   }
  }
  p=q;
 }
 if(!captured)color+=stars(normalize(v))*trans;
 // Thin glancing light at the critical curve; an illustrative visibility aid.
 float impact=length(cross(ro,rd));
 float critical=exp(-pow((impact-2.598)/.022,2.))*lensing;
 color+=vec3(1.9,.66,.15)*critical*.24*diskOpacity;
 }
 // High-level diagram mode. Cross-section, not a literal observer's image.
 if(diagram>.001){
  vec2 q=uv*4.4;float r=length(q);
  float horizon=1.-smoothstep(.98,1.02,r);
  float shadow=1.-smoothstep(2.57,2.62,r);
  float grid=(1.-smoothstep(.0,.025,abs(fract(q.x*.5)-.5)))+(1.-smoothstep(.0,.025,abs(fract(q.y*.5)-.5)));
  vec3 d=vec3(.006,.012,.02)+grid*vec3(.01,.025,.03);
  d=mix(d,vec3(.025,.065,.075),shadow*.65);
  d=mix(d,vec3(.001,.002,.004),horizon);
  float ring=exp(-pow((r-2.598)/.019,2.));
  float hor=exp(-pow((r-1.)/.018,2.));
  d+=vec3(.36,.8,.92)*ring+vec3(.95,.51,.20)*hor;
  float dash=step(.50,fract(atan(q.y,q.x)*10.));
  d+=vec3(.08,.16,.18)*exp(-pow((r-1.5)/.014,2.))*dash;
  color=mix(color,d,diagram);
 }
 color=aces(color*exposure)*tint;
 color=mix(color,vec3(.002,.004,.007),rayReveal);
 color=pow(max(color,vec3(0.)),vec3(1./2.2));
 float vig=1.-smoothstep(.3,1.5,length(uv));color*=mix(.50,1.,vig);
 float grain=hash(vec3(gl_FragCoord.xy, floor(time*24.)))-.5;
 color+=grain*.022;
 gl_FragColor=vec4(max(color,vec3(0.))*fade,1.);
}`;
