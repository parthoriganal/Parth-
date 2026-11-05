"""An original 60 fps 2D short. Each frame is drawn independently with Pillow."""
import math,random,subprocess,wave,tempfile
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import imageio_ffmpeg
W,H,FPS,DURATION=960,540,60,12
OUT=Path(__file__).resolve().parent
regular='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
font=lambda s:ImageFont.truetype(regular,s)
fontb=lambda s:ImageFont.truetype(bold,s)
random.seed(42)
# Hand-designed layered scenery; each frame is independently posed.
sky=Image.new('RGB',(W,H));p=sky.load()
for y in range(H):
 q=y/H
 for x in range(W):
  glow=math.exp(-(((x-700)/420)**2+((y-250)/210)**2))
  p[x,y]=(int(44+105*q+92*glow),int(48+60*q+70*glow),int(84+40*q+30*glow))
def ease(a):a=max(0,min(1,a));return a*a*(3-2*a)
def text(d,xy,s,f,fill,anchor=None):d.text(xy,s,font=f,fill=fill,anchor=anchor,stroke_width=0)
def mountains(d,off,y,color,step,amp):
 points=[(-step,y+200)]
 for x in range(-step*2,W+step*2,step):
  xx=x-(off%step);points.extend([(xx,y+25),(xx+step*.48,y-amp*(.55+.45*math.sin(x*.008)**2)),(xx+step,y+25)])
 points.extend([(W+step,y+200)]);d.polygon(points,fill=color)
def tree(d,x,y,s,c):
 d.polygon([(x-4*s,y),(x+4*s,y),(x+3*s,y-70*s),(x-3*s,y-70*s)],fill=c)
 for j in range(3):
  yy=y-(34+j*28)*s;d.polygon([(x-28*s+j*3*s,yy),(x,yy-58*s),(x+28*s-j*3*s,yy)],fill=c)
def fox(d,x,y,t,scale=1):
 # Bounding coordinates anchored at paw contact. Body shape, face and tail are redrawn every frame.
 run=math.sin(t*math.pi*4);bounce=abs(math.sin(t*math.pi*4))*3; y-=bounce
 def pt(a,b):return (x+a*scale,y+b*scale)
 orange=(218,100,53); shadow=(164,64,46); cream=(251,216,167); outline=(76,49,48)
 # Animated plume tail, drawn behind the torso.
 tail=run*7;d.polygon([pt(-40,-39),pt(-72,-44+tail),pt(-101,-79+tail),pt(-96,-43+tail),pt(-70,-18+tail),pt(-38,-26)],fill=orange)
 d.polygon([pt(-101,-79+tail),pt(-96,-43+tail),pt(-83,-31+tail),pt(-77,-44+tail),pt(-87,-59+tail)],fill=cream)
 # Four alternating running legs
 for idx,(px,phase,col) in enumerate([(-27,1,shadow),(28,-1,shadow),(-17,-1,orange),(34,1,orange)]):
  dx=phase*run*13; d.line([pt(px,-25),pt(px+dx*.6,-11),pt(px+dx,0)],fill=outline,width=max(2,int(7*scale)),joint='curve');d.line([pt(px,-25),pt(px+dx*.6,-11),pt(px+dx,0)],fill=col,width=max(2,int(4*scale)),joint='curve')
 d.ellipse((x-52*scale,y-56*scale,x+51*scale,y-16*scale),fill=orange,outline=outline,width=max(1,int(2*scale)))
 d.ellipse((x-15*scale,y-35*scale,x+38*scale,y-16*scale),fill=cream)
 # Neck, angular head and ears
 d.polygon([pt(25,-47),pt(36,-70),pt(50,-64),pt(62,-56),pt(77,-48),pt(66,-37),pt(44,-35),pt(30,-26)],fill=orange,outline=outline)
 d.polygon([pt(35,-63),pt(38,-88),pt(49,-68)],fill=outline);d.polygon([pt(39,-68),pt(40,-82),pt(45,-68)],fill=(245,179,137))
 d.polygon([pt(49,-65),pt(53,-84),pt(60,-59)],fill=outline);d.polygon([pt(53,-64),pt(54,-78),pt(57,-61)],fill=(245,179,137))
 d.polygon([pt(44,-47),pt(77,-48),pt(66,-37),pt(49,-37)],fill=cream)
 d.ellipse((x+73*scale,y-51*scale,x+78*scale,y-46*scale),fill=outline)
 d.ellipse((x+53*scale,y-59*scale,x+58*scale,y-54*scale),fill=outline)
 # coat accents
 d.arc((x-32*scale,y-48*scale,x+18*scale,y-21*scale),10,155,fill=(238,135,77),width=max(1,int(2*scale)))
def frame(t):
 im=sky.copy();d=ImageDraw.Draw(im,'RGBA')
 # atmospheric sun
 for r in range(105,24,-5):
  a=int((1-r/110)*3);d.ellipse((700-r,190-r,700+r,190+r),fill=(255,209,143,a))
 d.ellipse((655,145,745,235),fill=(255,221,169,230))
 # Clouds drift at a different speed from background
 for i in range(5):
  x=((i*250-t*8+80)%1250)-160;y=100+(i%3)*29
  d.ellipse((x,y,x+180,y+22),fill=(255,226,201,20));d.ellipse((x+42,y-13,x+126,y+20),fill=(255,226,201,20))
 mountains(d,t*10,305,(129,107,120,255),200,110);mountains(d,t*25,345,(90,104,105,255),165,90)
 # back forest
 for i in range(13):tree(d,((i*105-t*35)%1260)-140,403,.65+(i%3)*.08,(53,76,71,255))
 d.polygon([(0,397),(140,385),(310,405),(500,390),(720,403),(960,386),(960,540),(0,540)],fill=(65,92,72,255))
 # winding path: perspective sweeps to one side, hue shifts with light
 d.polygon([(0,494),(330,430),(475,423),(750,475),(960,540),(0,540)],fill=(193,147,111,255))
 d.line([(0,494),(330,430),(475,423),(750,475)],fill=(222,175,129,160),width=3)
 # blades, stones and flowers pass underfoot
 for i in range(45):
  x=(i*61-t*140)%1120-80; yy=466+(i*37%63); s=.5+(yy-450)/110
  d.line([(x,yy),(x-4*s,yy-9*s)],fill=(34,73,55,220),width=2);d.line([(x,yy),(x+5*s,yy-7*s)],fill=(34,73,55,220),width=2)
  if i%5==0:d.ellipse((x-2,yy-10,x+3,yy-5),fill=(255,220,163,220))
 # Fox runs in place while depth layers move, then follows its firefly upward.
 x=295+24*math.sin(t*.7);y=441
 fox(d,x,y,t,1.15)
 # The firefly leads, pauses, then meets the fox at the end.
 fx=520+90*math.sin(t*.55);fy=285+32*math.sin(t*1.4)
 if t>9:
  q=ease((t-9)/2);fx=fx*(1-q)+(x+95)*q;fy=fy*(1-q)+(y-100)*q
 for r in [36,25,15,9]:d.ellipse((fx-r,fy-r,fx+r,fy+r),fill=(255,219,113,int(10+80/(r/6))))
 d.ellipse((fx-3,fy-3,fx+3,fy+3),fill=(255,247,199,255))
 # tiny trailing lights
 for i in range(11):
  px=fx-i*14;py=fy+math.sin(t*2-i*.4)*9;rr=max(1,3-i*.22);d.ellipse((px-rr,py-rr,px+rr,py+rr),fill=(255,225,152,int(100*(1-i/12))))
 # foreground silhouettes make the scene feel deep
 for i in range(6):
  xx=(i*240-t*85)%1440-200
  if xx < x-150 or xx > x+180: tree(d,xx,570,1.30,(31,55,47,235))
 # soft film framing and title cards
 d.rectangle((0,0,W,17),fill=(20,24,30,255));d.rectangle((0,H-17,W,H),fill=(20,24,30,255))
 if t<3:
  alpha=int(255*min(ease(t/.7),ease((3-t)/.8)));text(d,(W//2,56),'THE LITTLE LIGHT',fontb(30),(255,239,214,alpha),'ma');text(d,(W//2,93),'A STORY ABOUT FOLLOWING WONDER',font(12),(255,228,203,alpha),'ma')
 if t>9.5:
  a=int(255*ease((t-9.5)/1));text(d,(W//2,55),'SOME THINGS ARE WORTH FOLLOWING.',fontb(20),(255,239,214,a),'ma')
 return im
# An original gentle melody with a pulse; generated locally, no API or external media.
sr=44100;t=np.arange(sr*DURATION)/sr;music=np.zeros_like(t)
for j,n in enumerate([261.63,329.63,392,493.88,440,392,329.63,293.66,349.23,440,523.25,440,392,329.63,293.66]):
 u=t-j*.7;env=(u>=0)*np.minimum(np.maximum(u,0)*12,1)*np.exp(-np.maximum(u,0)*1.8);music+=.055*env*(np.sin(2*np.pi*n*u)+.24*np.sin(4*np.pi*n*u))
for n in (130.81,164.81,196):music+=.017*np.sin(2*np.pi*n*t)*np.sin(np.pi*t/DURATION)**2
music*=np.minimum(1,t*2)*np.minimum(1,(DURATION-t)*1.2)
with tempfile.TemporaryDirectory() as tmp:
 wav=Path(tmp)/'music.wav'
 with wave.open(str(wav),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes((np.clip(music,-1,1)*32767).astype('<i2').tobytes())
 ff=imageio_ffmpeg.get_ffmpeg_exe();out=OUT/'the-little-light.mp4';cmd=[ff,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(wav),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',str(out)]
 proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
 for i in range(FPS*DURATION):
  im=frame(i/FPS)
  if i==FPS*5:im.save(OUT/'still.png')
  proc.stdin.write(im.tobytes())
 proc.stdin.close()
 if proc.wait():raise RuntimeError('video encoding failed')
 print('Saved',out)
