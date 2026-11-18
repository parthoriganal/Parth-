"""Optional all-free Pillow/FFmpeg compositor for projects not eligible for Remotion."""

from functools import lru_cache
import subprocess

from PIL import Image, ImageDraw, ImageFont

from blender_pipeline.manifest import PipelineError, digest, frame_name, read_json, write_json
from .edl import FONT_ROOT, load_plan


def compose(root):
    import imageio_ffmpeg

    doc = load_plan(root)
    if read_json(root/'stage-qa.json').get('project_id')!=doc['project_id']:
        raise PipelineError('Run stage on this bundle before composition')
    w,h,fps=(doc['settings'][key] for key in ('width','height','fps'))
    q=w/1920
    px=lambda n: round(n*q)
    @lru_cache
    def font(name,size):
        return ImageFont.truetype(str(FONT_ROOT/name),max(1,px(size)))
    mono='JetBrainsMono-Regular.ttf'
    serif='InstrumentSerif-Regular.ttf'
    ramp=Image.new('RGBA',(w,1))
    ramp.putdata([(6,21,25,round(221*(1-x/w)**2)) for x in range(w)])
    matte=ramp.resize((w,h))
    dark=(13,36,41)
    cream=(239,236,216)
    orange=(255,177,121)

    def render(shot,frame,index):
        end=shot['template']=='endcard'
        name=shot['source'] if end else shot['id']
        with Image.open(root/'public'/name/frame_name(shot['hold'] if end else frame+1)) as im:
            r=im.convert('RGBA').resize((w,h),Image.Resampling.LANCZOS)
        r=Image.alpha_composite(r,matte).convert('RGB')
        d=ImageDraw.Draw(r)
        def tag(x,y,text,size,fill=cream,typeface=mono):
            d.text((px(x),px(y)),text,font=font(typeface,size),fill=fill)
        d.rectangle((px(93),px(72),px(163),px(113)),fill=orange)
        tag(105,80,'M/01',22,dark,'Outfit-Bold.ttf')
        tag(187,86,doc['edition'],20)
        tag(1515,86,'STUDIO SERIES 01',20)
        d.line((px(93),px(131),px(1827),px(131)),fill='#79918c')
        u=min(1,frame/max(1,fps*.49))
        y=282+round(45*(1-u)**2)
        tag(102,y,shot['marker'],22,orange)
        for text in filter(None,shot['title']):
            y+=108
            tag(102,y-55,text,144,cream,serif)
        tag(102,y+119,shot['label'],20)
        pos=shot['start']+frame
        d.line((px(93),px(1002),px(1827),px(1002)),fill='#79918c')
        d.line((px(93),px(1002),px(93+(1827-93)*(pos+1)/doc['frames']),px(1002)),fill=orange,width=max(1,px(2)))
        tag(93,960,f'{index+1:02} / {len(doc["shots"]):02}',19)
        tag(1474,960,f'MERIDIAN  ·  {pos//fps:02}:{pos%fps:02}',19)
        ramp_n=max(2,round(fps*.16))
        if frame<ramp_n:
            if index%2:
                r=Image.blend(r,Image.new('RGB',(w,h),dark),1-frame/ramp_n)
            else:
                d.rectangle((round(w*(frame/ramp_n)),0,w,h),fill=dark)
        return r.tobytes()

    log=root/'open-compose.log'
    dest=root/'visual.mp4'
    tmp=root/'.visual.partial.mp4'
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    args=[ffmpeg,'-hide_banner','-v','warning','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{w}x{h}',
          '-framerate',str(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-threads','2',
          '-pix_fmt','yuv420p','-movflags','+faststart',str(tmp)]
    try:
        with log.open('wb') as f, subprocess.Popen(args,stdin=subprocess.PIPE,stdout=f,stderr=f) as pipe:
            try:
                for i,s in enumerate(doc['shots']):
                    for j in range(s['frames']):
                        pipe.stdin.write(render(s,j,i))
                pipe.stdin.close()
                if pipe.wait(timeout=90):
                    raise PipelineError(f'Pillow/FFmpeg encode failed, see {log}')
            except (Exception,KeyboardInterrupt):
                pipe.kill()
                raise
        tmp.replace(dest)
        write_json(root/'visual-receipt.json',{'project_id':doc['project_id'],'frames':doc['frames'],
                   'sha256':digest(dest),'engine':'Pillow / FFmpeg CPU'})
        print(f'Open compositor: {doc["frames"]} frames at {w}x{h}.')
    finally:
        tmp.unlink(missing_ok=True)
