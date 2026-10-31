"""Create restrained original mechanical sound design beneath the selected narration."""
import math, wave, struct, subprocess, tempfile, os
import imageio_ffmpeg
sr=44100;duration=22
with tempfile.TemporaryDirectory() as tmp:
    path=os.path.join(tmp,'mechanical.wav')
    with wave.open(path,'wb') as wav:
        wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(sr)
        out=bytearray()
        for i in range(sr*duration):
            t=i/sr
            fade=min(1,t/1.2,(duration-t)/1.8)
            # A barely audible warm harmonic bed, and crisp escapement ticks.
            bed=(math.sin(2*math.pi*65.406*t)*.012+math.sin(2*math.pi*98*t)*.006+math.sin(2*math.pi*130.813*t)*.004)*(0.8+0.2*math.sin(t*.5))
            ticktime=t%0.5
            tick=math.exp(-ticktime*170)*(math.sin(2*math.pi*2100*t)+.3*math.sin(2*math.pi*3700*t))*.035
            swell=0
            for cut in [4,7.5,11,15,18.5]:
                dt=t-cut
                if -.35<dt<.35:
                    envelope=math.exp(-((dt/.13)**2))
                    swell+=math.sin(2*math.pi*(140*t+20*math.sin(t*5)))*envelope*.018
            value=(bed+tick+swell)*fade
            left=int(max(-1,min(1,value))*32767);right=int(max(-1,min(1,value*.96))*32767)
            out.extend(struct.pack('<hh',left,right))
        wav.writeframes(out)
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-i','public/audio/legacy.mp3','-i',path,'-filter_complex','[0:a]atempo=0.85,adelay=500|500,apad,volume=1.3[vo];[vo][1:a]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]','-map','[a]','-t','22','-c:a','libmp3lame','-b:a','192k','public/audio/legacy-master.mp3'],check=True,capture_output=True)
print('Mixed 22-second narration and original mechanical sound design.')
