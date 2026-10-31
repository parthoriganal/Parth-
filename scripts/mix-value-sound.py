"""Original, precisely timed key ticks, transition swishes and six voiceover cues."""
import math, random, wave, struct, subprocess, tempfile, os, re
import imageio_ffmpeg
random.seed(2)
SR=44100;DURATION=24
# Match the reveal delays and glyph intervals in value-film.js, not a free-running clock.
headings=[('Attention fades.','VALUE IS BUILT.'),('Not the price.','THE PRECISION.'),('Not the noise.','THE NEXT MOVE.'),('Not another promise.','A SIGNATURE.'),('Time is limited.','INTENTION ISN’T.'),('Choose what lasts.','BECOME INVALUABLE.')]
clicks=[]
for chapter,(upper,lower) in enumerate(headings):
    for phrase,delay in [(upper,.12),(lower,.55)]:
        for i,letter in enumerate(phrase):
            if letter!=' ' and i%2==0: clicks.append((chapter*4+delay+i*.024,.026 if delay==.12 else .045))
    clicks.append((chapter*4+1.18,.025))
with tempfile.TemporaryDirectory() as tmp:
    fx=os.path.join(tmp,'typography.wav')
    with wave.open(fx,'wb') as wav:
        wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(SR)
        out=bytearray()
        for i in range(SR*DURATION):
            t=i/SR;fade=min(1,t/.5,(DURATION-t)/.6)
            # Dark, barely audible original harmonic atmosphere, kept beneath speech.
            bed=.009*math.sin(2*math.pi*55*t)+.004*math.sin(2*math.pi*82.4069*t)+.003*math.sin(2*math.pi*110*t)
            tick=0
            for start,amp in clicks:
                dt=t-start
                if 0<=dt<.065:tick+=amp*math.exp(-dt*140)*(math.sin(2*math.pi*2700*dt)+.32*math.sin(2*math.pi*4200*dt))
            hit=0
            for c in range(6):
                dt=t-c*4
                if 0<=dt<.28:hit+=.065*math.exp(-dt*19)*math.sin(2*math.pi*(76*dt-25*dt*dt))
                if -.32<dt<.12:hit+=(random.random()-.5)*.028*math.exp(-((dt+.04)/.15)**2)
            value=(bed+tick+hit)*fade
            left=int(max(-1,min(1,value))*32767);right=int(max(-1,min(1,value*.95))*32767);out.extend(struct.pack('<hh',left,right))
        wav.writeframes(out)
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-y']
    for n in range(1,7):cmd+=['-i',f'public/audio/value-{n:02d}.mp3']
    cmd+=['-i',fx]
    filters=[]
    for n in range(6):
        # Each sentence begins after its object arrives and before the next cut.
        delay=int((n*4+.4)*1000)
        filters.append(f'[{n}:a]atrim=duration=3.5,afade=t=out:st=3.4:d=0.1,adelay={delay}|{delay},volume=1.35[v{n}]')
    filters.append(''.join(f'[v{n}]' for n in range(6))+'[6:a]amix=inputs=7:normalize=0,alimiter=limit=0.95[a]')
    cmd+=['-filter_complex',';'.join(filters),'-map','[a]','-t',str(DURATION),'-ar','44100','-ac','2','-c:a','libmp3lame','-b:a','192k','public/audio/value-master.mp3']
    subprocess.run(cmd,check=True,capture_output=True)
print('Mixed 24-second film: six narration cues + letter-synchronised typography ticks + transitions.')
