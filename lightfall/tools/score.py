"""Original synthesized underscore, atmospheric air and timed transition cues.
No samples. Stdlib only. Writes a 74-second mono PCM WAV for the mixer.
"""
import array, math, random, wave, sys
from pathlib import Path
rate=24000; duration=74; rng=random.Random(137)
chords=[(0,[55,82.407,110,164.814]),(12,[46.249,69.296,110,138.591]),(27,[61.735,92.499,123.471,184.997]),(41,[51.913,77.782,103.826,155.563]),(57,[55,82.407,123.471,164.814])]
phase=[0.0]*4; air=0.;data=array.array('h')
for i in range(rate*duration):
 t=i/rate;idx=max(j for j,(at,_) in enumerate(chords) if t>=at)
 at,notes=chords[idx];old=chords[max(0,idx-1)][1];blend=min(1,(t-at)/2.5) if idx else 1
 v=0
 for j,note in enumerate(notes):
  f=old[j]*(1-blend)+note*blend;phase[j]+=2*math.pi*f/rate
  v+=math.sin(phase[j])*[.05,.026,.019,.012][j]*(.85+.15*math.sin(t*.4+j))
 air=air*.93+(rng.random()*2-1)*.07
 v+=air*.032
 # Very quiet shimmering overtone, never competing with speech.
 v+=math.sin(phase[2]*4)*.003*(.5+.5*math.sin(t*.35))
 for cue in [12,27,41,57]:
  q=t-cue
  if 0<=q<2.5:v+=.085*math.sin(2*math.pi*(42*q-3*q*q))*math.exp(-q*3.5)
  if -1.2<q<.3:
   env=math.sin((q+1.2)/1.5*math.pi)**2
   v+=air*.16*env
 env=min(1,t/2.5,(duration-t)/4)
 data.append(int(max(-1,min(1,v*env))*32767))
out=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]/'audio/underscore.wav'
with wave.open(str(out),'wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(data.tobytes())
print(out)
