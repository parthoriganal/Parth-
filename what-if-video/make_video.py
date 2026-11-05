"""Render an original captioned What If short using Pillow and FFmpeg.
Requires pillow, numpy and imageio-ffmpeg; no external assets or API keys.
"""
import math, random, wave, subprocess, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg
W,H,FPS,DURATION=960,540,24,16
OUT=Path(__file__).resolve().parent
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def f(s): return ImageFont.truetype(bold,s)
def lerp(a,b,x): return a+(b-a)*max(0,min(1,x))
def smooth(x): x=max(0,min(1,x));return x*x*(3-2*x)
rng=random.Random(77);stars=[(rng.randrange(W),rng.randrange(320),rng.choice([1,1,2]),rng.random()) for _ in range(95)]
# Cached painted sky
sky=Image.new('RGB',(W,H)); pix=sky.load()
for y in range(H):
 for x in range(W):
  a=y/H; glow=math.exp(-(((x-680)/370)**2+((y-300)/220)**2))*22
  pix[x,y]=(int(16+36*a+glow),int(18+10*a+glow*.25),int(45+28*a+glow*.7))
def textcenter(d,y,text,size,color,stroke=0):
 font=f(size); box=d.textbbox((0,0),text,font=font,stroke_width=stroke);d.text(((W-(box[2]-box[0]))/2,y),text,font=font,fill=color,stroke_width=stroke,stroke_fill='#100f25')
def line(d,pts,fill,width=6): d.line(pts,fill=fill,width=width,joint='curve')
def star(d,x,y,r,c):
 d.ellipse((x-r,y-r,x+r,y+r),fill=c)
def person(d,x,y,angle=0,scale=1,arms=0):
 # articulated figure centred on torso
 def p(px,py):
  a=angle;return (x+scale*(px*math.cos(a)-py*math.sin(a)), y+scale*(px*math.sin(a)+py*math.cos(a)))
 ink='#f5d5b8'; white='#f5e4d3'; head=p(0,-40); rr=17*scale
 d.ellipse((head[0]-rr,head[1]-rr,head[0]+rr,head[1]+rr),fill=white,outline=ink,width=max(2,int(4*scale)))
 for ex in (-6,6):
  q=p(ex,-42);d.ellipse((q[0]-1.8*scale,q[1]-2*scale,q[0]+1.8*scale,q[1]+2*scale),fill='#211d32')
 line(d,[p(0,-20),p(0,21)],ink,int(7*scale));line(d,[p(0,-9),p(-27,-12-arms)],ink,int(6*scale));line(d,[p(0,-9),p(27,-12-arms)],ink,int(6*scale));line(d,[p(0,20),p(-18,52)],ink,int(6*scale));line(d,[p(0,20),p(20,50)],ink,int(6*scale))
def draw(t):
 im=sky.copy();d=ImageDraw.Draw(im,'RGBA')
 for i,(x,y,r,b) in enumerate(stars):
  a=int(90+100*(.5+.5*math.sin(t*1.6+b*9)));star(d,x,y,r,(238,223,255,a))
 # moon and distant city
 d.ellipse((846,150,912,216),fill=(255,224,175,220));d.ellipse((862,141,920,203),fill=(39,29,59,255))
 for x in range(0,W,85):
  hh=65+int(38*math.sin(x*.05)**2);d.rectangle((x,390-hh,x+72,430),fill=(31,28,49,255));
  for xx in range(x+12,x+65,20):
   for yy in range(390-hh+14,385,22):
    if (xx+yy)%3: d.rectangle((xx,yy,xx+5,yy+9),fill=(251,179,121,90))
 d.rectangle((0,428,W,H),fill=(25,23,37,255));d.rectangle((0,428,W,435),fill=(236,158,126,135))
 # scene timings
 if t<3.5:
  # peaceful setup
  d.rounded_rectangle((685,365,758,428),4,fill=(79,56,75,255));d.ellipse((700,340,747,383),fill=(196,106,130,255));d.rectangle((720,326,726,346),fill=(218,186,132,255));person(d,335,355,arms=3*math.sin(t*2))
  d.ellipse((430,407,472,426),fill=(235,154,84,255));d.ellipse((439,401,456,417),fill=(245,189,105,255))
  textcenter(d,55,'WHAT IF',28,'#f7c893');textcenter(d,90,'GRAVITY TOOK A BREAK?',44,'#fff8ed',2)
  textcenter(d,477,'ONE ORDINARY EVENING...',19,'#edc8bc')
 elif t<7.8:
  p=smooth((t-3.5)/2.6);y=lerp(355,205,p)+math.sin(t*2)*4;person(d,335,y,angle=-.12*p,arms=18*p)
  ax=lerp(450,523,p);ay=lerp(412,207,p);d.ellipse((ax-18,ay-18,ax+18,ay+18),fill=(244,164,91,255));d.polygon([(ax-4,ay-18),(ax+2,ay-31),(ax+11,ay-22)],fill=(106,190,112,255))
  for i in range(9):
   x=560+i*30;y2=410-smooth((t-3.8-i*.05)/2.5)*(50+i*10);d.rounded_rectangle((x,y2,x+14,y2+18),3,fill=(220,168,130,190))
  textcenter(d,62,'THEN... EVERYTHING LET GO.',35,'#fff8ed',2);textcenter(d,478,'EVEN THE APPLE HAD PLANS.',20,'#edc8bc')
 elif t<12.2:
  p=smooth((t-7.8)/1.4);person(d,330+35*math.sin(t),180+10*math.sin(t*2),angle=lerp(-.2,.6,p)+.2*math.sin(t),arms=22)
  d.ellipse((520,175,557,212),fill=(244,164,91,255));d.polygon([(533,177),(539,160),(548,173)],fill=(106,190,112,255))
  for i in range(5):
   x=100+i*170;y=240+math.sin(t*1.2+i)*28;d.rounded_rectangle((x,y,x+25,y+34),4,fill=(233,187,160,180))
  textcenter(d,58,'AT FIRST, IT FELT LIKE FLYING.',34,'#fff8ed',2);textcenter(d,478,'UNTIL HOME STARTED FLOATING TOO.',19,'#edc8bc')
 else:
  p=smooth((t-12.2)/1.5);person(d,335,lerp(190,355,p),angle=lerp(.35,0,p),arms=lerp(20,0,p))
  ax=lerp(540,453,p);ay=lerp(195,411,p);d.ellipse((ax-18,ay-18,ax+18,ay+18),fill=(244,164,91,255))
  textcenter(d,63,'AND JUST LIKE THAT...',31,'#fff8ed',2);textcenter(d,108,'THE WORLD CAME BACK.',39,'#fff8ed',2)
  textcenter(d,478,'MAYBE ORDINARY IS MAGIC ENOUGH.',18,'#edc8bc')
 # letterbox + label
 d.rectangle((0,0,W,14),fill=(5,5,15,255));d.rectangle((0,H-14,W,H),fill=(5,5,15,255));d.text((25,25),'WHAT IF  /  01',font=f(12),fill=(243,188,163,210))
 return im
# A quiet, original synthesized ambient score; no generated-voice service required.
sr=44100; ts=np.arange(sr*DURATION)/sr; music=np.zeros_like(ts)
for j,note in enumerate([130.81,164.81,196,246.94,174.61,220,261.63,220]):
 start=j*2;u=ts-start;env=np.clip(u/.15,0,1)*np.exp(-np.maximum(u,0)/2.3)*(u>=0);music+=.035*env*(np.sin(2*np.pi*note*u)+.25*np.sin(2*np.pi*note*2*u))
music+=.015*np.sin(2*np.pi*65.4*ts)*np.sin(np.pi*ts/DURATION)**2
music*=np.minimum(1,ts)*np.minimum(1,(DURATION-ts))
with tempfile.TemporaryDirectory() as tmp:
 wav=Path(tmp)/'sound.wav';
 with wave.open(str(wav),'wb') as wf: wf.setnchannels(1);wf.setsampwidth(2);wf.setframerate(sr);wf.writeframes((np.clip(music,-1,1)*32767).astype('<i2').tobytes())
 ff=imageio_ffmpeg.get_ffmpeg_exe();out=OUT/'gravity-break.mp4'
 cmd=[ff,'-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(wav),'-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',str(out)]
 proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.DEVNULL)
 for frame in range(FPS*DURATION):
  im=draw(frame/FPS)
  if frame==FPS*5: im.save(OUT/'preview.png')
  proc.stdin.write(im.tobytes())
 proc.stdin.close()
 if proc.wait(): raise RuntimeError('FFmpeg encoding failed')
 print(f'Created {out}')
