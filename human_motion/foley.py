"""Original, dialogue-free courtyard tone and soft shoe cues at the authored strikes."""

import wave

import numpy as np

RATE=48000
STRIKES=(3.46,3.98,4.50,5.01,5.51,5.98)


def soundtrack(path,seconds):
    n=round(seconds*RATE)
    rng=np.random.default_rng(173)
    t=np.arange(n)/RATE
    shared=np.convolve(rng.normal(size=n),np.hanning(361),mode='same')/13
    stereo=[]
    for i in range(2):
        air=np.convolve(rng.normal(size=n),np.hanning(67),mode='same')/6
        stereo.append(.0090*shared*(.78+.22*np.sin(2*np.pi*.11*t+i*.4)**2)+.0041*air)
    out=np.column_stack(stereo)
    length=round(.19*RATE); tt=np.arange(length)/RATE
    for i,start in enumerate(STRIKES):
        v=rng.normal(size=length)
        heel=np.convolve(v,np.hanning(29),mode='same')/3.3
        toe=np.convolve(v,np.hanning(7),mode='same')/1.5
        heel*=np.minimum(tt/.004,1.)*np.exp(-tt/0.023)
        toe*=np.exp(-((tt-.065)/.026)**2)
        thud=np.sin(2*np.pi*(87*tt-112*tt**2))*np.minimum(tt/.007,1.)*np.exp(-tt/.03)
        step=(.125*heel+.023*toe+.044*thud)*(.67 if i in (0,5) else .95)
        at=round(start*RATE)
        out[at:at+length] += step[:,None]*np.array([.90,1.06] if i%2 else [1.06,.90])
    fade=round(.23*RATE); out[:fade]*=np.linspace(0.,1.,fade)[:,None]; out[-fade:]*=np.linspace(1.,0.,fade)[:,None]
    signal=np.asarray(np.clip(out,-.98,.98)*32767,dtype='<i2')
    with wave.open(str(path),'wb') as wav:
        wav.setparams((2,2,RATE,n,'NONE','not compressed')); wav.writeframes(signal.tobytes())
    return {'sample_rate':RATE,'source_samples':n,'channels':2,'shoe_cues_s':list(STRIKES),
            'source_peak_dbfs':round(float(20*np.log10(np.max(abs(out)))),2),'dialogue':False}
