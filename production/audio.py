"""A small original stereo score and accessible captions driven by one edit clock."""

from array import array
from math import cos, exp, sin, sqrt, tau
import sys
import wave

from blender_pipeline.manifest import PipelineError


def timestamp(frame,fps):
    ms = (1000*frame + fps//2)//fps
    s,millis = divmod(ms,1000)
    m,sec = divmod(s,60)
    h,minute = divmod(m,60)
    return f'{h:02}:{minute:02}:{sec:02},{millis:03}'


def subtitles(doc):
    fps = doc['settings']['fps']
    return '\n\n'.join(f"{i}\n{timestamp(s['start'],fps)} --> {timestamp(s['start']+s['frames'],fps)}\n{s['audio']}"
                       for i,s in enumerate(doc['shots'],1))+'\n'


def score(doc,path):
    rate,fps = doc['sample_rate'],doc['settings']['fps']
    count=doc['frames']*(rate//fps)
    a=array('f',[0.0])*count
    b=array('f',[0.0])*count
    for n in range(count):
        t=n/rate
        amp=min(1,t/.10,(count-n)/rate/.36)
        stereo=(.5+.5*sin(tau*.19*t))
        root=.054*sin(tau*55*t)+.043*sin(tau*82.407*t)
        shimmer=.018*sin(tau*110.14*t+.6*sin(tau*.44*t))
        a[n]=amp*(root+shimmer*(.45+.55*stereo))
        b[n]=amp*(root+shimmer*(1-.44*stereo))
    for index,s in enumerate(doc['shots']):
        start=s['audio_sample']
        f=s['note']
        this_len=s['frames']*(rate//fps)
        # A short chime is deliberately keyed to each edit cut, independent of AAC priming.
        for n in range(min(this_len,int(.82*rate))):
            t=n/rate
            atk=min(1,t/.0025)
            marker=.205*atk*exp(-t*32)*sin(tau*1147*t)
            melodic=(.137*sin(tau*f*t)+.048*sin(tau*2.004*f*t))*min(1,t/.019)*exp(-t*5.9)
            a[start+n]+=marker+melodic*(.81 if index%2 else 1)
            b[start+n]+=marker+melodic*(1 if index%2 else .81)
        beats=(.33,.66) if s['template']!='endcard' else (.38,)
        for j,beat in enumerate(beats):
            at=start+round(beat*this_len)
            pitch=f*(1.5 if j%2==0 else 2)
            for n in range(min(start+this_len-at, int(rate*.29))):
                t=n/rate
                tone=.088*min(1,t/.013)*exp(-t*12)*(sin(tau*pitch*t)+.2*sin(tau*3*pitch*t))
                a[at+n]+=tone*(.6 if j%2 else 1)
                b[at+n]+=tone*(1 if j%2 else .6)
    pcm=array('h')
    peak=0
    for i in range(count):
        fade=min(1,(count-i)/(rate*.23))
        left,right=round(a[i]*fade*32767),round(b[i]*fade*32767)
        peak=max(peak,abs(left),abs(right))
        pcm.extend((left,right))
    if sys.byteorder!='little':
        pcm.byteswap()
    with wave.open(str(path),'wb') as f:
        f.setparams((2,2,rate,count,'NONE','not compressed'))
        f.writeframes(pcm.tobytes())
    return round(20*__import__('math').log10(peak/32767),2)


def verify_sync(doc,path,*,lossy=False):
    """Check full track length and that the keyed chime is present at each edit start."""
    with wave.open(str(path),'rb') as f:
        if (f.getsampwidth(),f.getnchannels(),f.getframerate())!=(2,2,doc['sample_rate']):
            raise PipelineError('Audio must decode as 48 kHz stereo PCM')
        length=f.getnframes()
        expected=doc['frames']*(doc['sample_rate']//doc['settings']['fps'])
        if not expected <= length <= expected+(1024 if lossy else 0):
            raise PipelineError(f'Audio sample count mismatch: {length} vs {expected}')
        marks=[]
        # Lock to the synthesized 1147 Hz onset in the first 14 ms of each shot.
        # Two quadratures are insensitive to small codec phase shifts.
        n=672
        for shot in doc['shots']:
            f.setpos(shot['audio_sample'])
            buf=array('h')
            buf.frombytes(f.readframes(n))
            if sys.byteorder!='little':
                buf.byteswap()
            x = sum(sin(tau*1147*i/doc['sample_rate'])*buf[i*2]/32767 for i in range(n))
            y = sum(cos(tau*1147*i/doc['sample_rate'])*buf[i*2]/32767 for i in range(n))
            amp=2*sqrt(x*x+y*y)/n
            if amp < .062:
                raise PipelineError(f"Audio cue missing at {shot['id']} / sample {shot['audio_sample']}: {amp:.3f}")
            marks.append({'shot':shot['id'],'sample':shot['audio_sample'],'verified_amplitude':round(amp,3)})
    return {'decoded_samples':length,'expected_samples':expected,'cue_alignment':marks}
