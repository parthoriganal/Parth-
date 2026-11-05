"""NOVA: an original, frame-by-frame 2D animation.
Pillow draws each frame; MoviePy creates the clip and encodes the MP4.
Run: pip install -r nova-flight/requirements.txt && python nova-flight/render.py
"""
from pathlib import Path
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import VideoClip, AudioArrayClip

W,H,FPS,DURATION=960,540,60,12
OUT=Path(__file__).resolve().parent
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font_bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
font=lambda n:ImageFont.truetype(font_path,n)
bold=lambda n:ImageFont.truetype(font_bold,n)
rng=random.Random(112)
stars=[(rng.randrange(W),rng.randrange(H),rng.choice([1,1,1,2]),rng.random()*6.28) for _ in range(125)]
# A cached night-sky gradient; all other details are animated by time.
sky=Image.new('RGB',(W,H));pix=sky.load()
for y in range(H):
 for x in range(W):
  u=y/H; neb=math.exp(-(((x-670)/400)**2+((y-280)/260)**2))
  pix[x,y]=(int(12+12*u+35*neb),int(22+12*u+17*neb),int(46+14*u+43*neb))
def clamp(x):return max(0,min(1,x))
def smooth(x):x=clamp(x);return x*x*(3-2*x)
def ellipse(d,box,fill,outline=None,width=1):d.ellipse(box,fill=fill,outline=outline,width=width)
def rounded(d,box,rad,fill,outline=None,width=1):d.rounded_rectangle(box,rad,fill=fill,outline=outline,width=width)
def rocket(d,x,y,s,angle,flame,t):
 # Rocket is one coherent set of hand-designed 2D vector shapes, transformed per frame.
 def P(a,b):
  a*=s;b*=s;return (x+a*math.cos(angle)-b*math.sin(angle),y+a*math.sin(angle)+b*math.cos(angle))
 def poly(points,color):d.polygon([P(*p) for p in points],fill=color)
 # Four flame silhouettes with a smooth flicker behind the ship.
 if flame>0:
  l=(49+10*math.sin(t*23))*flame
  poly([(-15,39),(0,40+l),(15,39)],(246,111,57,210));poly([(-8,39),(0,39+l*.75),(8,39)],(255,213,116,255))
 # swept fins, body and panel contours
 poly([(-17,13),(-37,42),(-33,54),(-12,46)],(222,88,70,255));poly([(17,13),(37,42),(33,54),(12,46)],(222,88,70,255))
 poly([(-22,28),(-20,-20),(-14,-42),(0,-65),(14,-42),(20,-20),(22,28),(15,42),(-15,42)],(246,237,215,255))
 poly([(-20,-19),(-14,-43),(0,-65),(14,-43),(20,-19),(12,-25),(0,-29),(-12,-25)],(228,101,75,255))
 poly([(-20,24),(-15,40),(15,40),(20,24)],(196,195,182,255))
 poly([(-20,-20),(-17,24),(-12,26),(-10,-23)],(255,251,235,115))
 # circular porthole rotates with ship; circles stay circular
 px,py=P(0,-1);rr=12*s;ellipse(d,(px-rr,py-rr,px+rr,py+rr),(42,74,88,255));rr=8*s;ellipse(d,(px-rr,py-rr,px+rr,py+rr),(130,198,199,255));ellipse(d,(px-rr*.6,py-rr*.7,px-rr*.1,py-rr*.2),(226,255,241,230))
def hills(d,t,fade):
 if fade<=0:return
 c1=(30,67,65,int(255*fade));c2=(21,50,51,int(255*fade));
 d.polygon([(0,410),(120,350),(270,405),(435,320),(620,405),(790,345),(960,410),(960,540),(0,540)],fill=c1)
 d.polygon([(0,451),(130,403),(320,452),(490,391),(680,448),(820,400),(960,448),(960,540),(0,540)],fill=c2)
 d.polygon([(0,498),(160,462),(350,490),(550,456),(720,491),(960,455),(960,540),(0,540)],fill=(15,37,39,int(255*fade)))
def draw(t):
 im=sky.copy().convert('RGBA');d=ImageDraw.Draw(im,'RGBA')
 for i,(sx,sy,r,phase) in enumerate(stars):
  z=0.45+0.55*(.5+.5*math.sin(t*1.7+phase));xx=(sx-(t*5 if t>5 else 0))%W;ellipse(d,(xx-r,sy-r,xx+r,sy+r),(225,231,214,int(z*180)))
 # In the later half, the destination grows into view.
 p=smooth((t-6.1)/1.8); px=740;py=205;pr=95*p
 if pr>1:
  ellipse(d,(px-pr,py-pr,px+pr,py+pr),(226,151,109,255));ellipse(d,(px-pr*.78,py-pr*.7,px-pr*.15,py-pr*.07),(241,181,132,120))
  ellipse(d,(px+pr*.18,py+pr*.18,px+pr*.46,py+pr*.46),(179,106,86,85))
  # orbital rings are explicitly drawn, not an image effect
  d.arc((px-pr*1.6,py-pr*.35,px+pr*1.6,py+pr*.35),0,175,fill=(246,205,159,int(210*p)),width=3)
  d.arc((px-pr*1.8,py-pr*.49,px+pr*1.8,py+pr*.49),0,175,fill=(227,171,139,int(150*p)),width=2)
 fade=1-smooth((t-4.2)/2.0);hills(d,t,fade)
 # Launch: settle, lift off, fly past the destination, ease to rest.
 if t<2: x=260;y=405-8*smooth(t/2);a=0;s=1.05;flame=smooth((t-1.1)/.6)
 elif t<5.4:
  q=smooth((t-2)/3.4);x=260+300*q;y=397-270*q;a=.42*q;s=1.05-.25*q;flame=1
 else:
  q=smooth((t-5.4)/3.5);x=560-85*q;y=127+150*q;a=.42+.42*q;s=.80-.27*q;flame=1
 # warm exhaust sparks trailing below the ship
 if 1.4<t<10.5:
  for i in range(22):
   age=((t*2+i*.31)%2);xx=x-math.sin(a)*(44+age*40)*s+(i%5-2)*age*3;yy=y+math.cos(a)*(44+age*40)*s
   r=(1-age/2)*3*s
   if r>0:ellipse(d,(xx-r,yy-r,xx+r,yy+r),(255,180,104,int((1-age/2)*160)))
 rocket(d,x,y,s,a,flame,t)
 # Editorial titles leave the ship unobstructed.
 if t<2.7:
  a=int(255*min(smooth(t/.5),smooth((2.7-t)/.5)))
  d.text((70,68),'N O V A',font=bold(37),fill=(247,236,210,a));d.text((72,116),'A LITTLE JOURNEY BEYOND',font=font(12),fill=(231,210,184,a))
 if t>9:
  a=int(255*smooth((t-9)/1));d.text((65,89),'KEEP GOING.',font=bold(35),fill=(247,236,210,a));d.text((67,134),'There is always more to discover.',font=font(16),fill=(226,209,191,a))
 # restrained letterboxing
 d.rectangle((0,0,W,12),fill=(7,14,23,255));d.rectangle((0,H-12,W,H),fill=(7,14,23,255))
 return np.array(im.convert('RGB'))
# Original locally synthesized score. MoviePy muxes it into the finished clip.
sr=44100;times=np.arange(sr*DURATION)/sr;audio=np.zeros_like(times)
for i,n in enumerate([130.81,164.81,196,261.63,220,196,164.81,196,146.83,185,220,293.66,261.63,220,196,164.81]):
 u=times-i*.66;env=(u>=0)*np.minimum(np.maximum(u,0)*12,1)*np.exp(-np.maximum(u,0)*1.8)
 audio+=.055*env*(np.sin(2*np.pi*n*u)+.2*np.sin(4*np.pi*n*u))
for n in (65.4,98,130.8):audio+=.014*np.sin(2*np.pi*n*times)*np.sin(np.pi*times/DURATION)**2
audio*=np.minimum(1,times*2)*np.minimum(1,(DURATION-times)*1.5)
audio=np.stack([audio,audio],axis=1).astype('float32')
Image.fromarray(draw(7.5)).save(OUT/'still.png')
clip=VideoClip(frame_function=draw,duration=DURATION).with_audio(AudioArrayClip(audio,fps=sr))
clip.write_videofile(str(OUT/'nova-flight.mp4'),fps=FPS,codec='libx264',audio_codec='aac',preset='fast',ffmpeg_params=['-crf','19','-pix_fmt','yuv420p','-movflags','+faststart'],logger=None)
clip.close();print('Created',OUT/'nova-flight.mp4')
