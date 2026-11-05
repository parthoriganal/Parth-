import numpy as np,wave
sr=44100; t=np.arange(sr*16)/sr; y=np.zeros_like(t)
# sparse piano-like motif at 90 bpm, warm pad, low pulse on edit points
for i,n in enumerate([146.83,220,293.66,261.63,196,246.94,329.63,293.66,146.83,220,293.66,369.99,329.63,293.66,220,146.83]):
 start=i*.8; u=t-start; e=(u>=0)*np.exp(-np.maximum(u,0)*1.3)*np.minimum(np.maximum(u,0)*18,1); y+=.047*e*(np.sin(2*np.pi*n*u)+.22*np.sin(2*np.pi*n*2*u))
for n in [73.42,110,146.83]: y+=.018*np.sin(2*np.pi*n*t)*np.sin(np.pi*t/16)**2
for sec in [0,4,8,12]:
 u=t-sec;e=(u>=0)*np.exp(-np.maximum(u,0)*5);y+=.055*e*np.sin(2*np.pi*(55*u-8*u*u))
y*=np.minimum(t*2,1)*np.minimum((16-t)/1.5,1)
with wave.open('/tmp/signal.wav','wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(y,-1,1)*32767).astype('<i2').tobytes())
