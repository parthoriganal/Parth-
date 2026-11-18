"""Verify plates, stage editorial inputs, and make a captioned H.264/AAC delivery."""

import os
from pathlib import Path
import re
import shutil
from tempfile import TemporaryDirectory
from types import SimpleNamespace

from PIL import Image, ImageDraw, ImageFont, ImageStat

from blender_pipeline.manifest import PipelineError, digest, frame_ids, frame_name, read_json, write_json
from blender_pipeline.media import check_cached, ffmpeg_run, frame_stats, load_receipt, verify_video

from .audio import score, subtitles, verify_sync
from .edl import BLENDER_TEMPLATES, FONT_ROOT, blend_path, load_plan, project_path

FONTS = ('InstrumentSerif-Regular.ttf','JetBrainsMono-Regular.ttf','Outfit-Bold.ttf')


def link_file(source, target):
    target.parent.mkdir(parents=True,exist_ok=True)
    target.unlink(missing_ok=True)
    try:
        os.link(source,target)
    except OSError:
        shutil.copyfile(source,target)


def stage(root):
    doc = load_plan(root)
    settings = doc['settings']
    size = settings['plate_width'],settings['plate_height']
    public = root/'public'
    counts = {}
    for shard in doc['shards']:
        folder = root/'frames'/shard['id']
        receipt = load_receipt(folder,doc,shard)
        for i in frame_ids(shard):
            check_cached(folder,receipt,i,size)
            name = frame_name(i)
            link_file(folder/name,public/shard['shot']/name)
            counts[shard['shot']] = counts.get(shard['shot'],0)+1
    for shot in doc['shots']:
        if shot['template']=='diagram':
            folder=root/'diagrams'/shot['id']
            receipt=read_json(folder/'receipt.json')
            if receipt.get('project_id')!=doc['project_id'] or receipt.get('shot')!=shot['id']:
                raise PipelineError(f"Stale Manim plate: {shot['id']}")
            for i in range(1,shot['frames']+1):
                name=frame_name(i)
                check_cached(folder,receipt,i,(settings['width'],settings['height']))
                link_file(folder/name,public/shot['id']/name)
                counts[shot['id']]=counts.get(shot['id'],0)+1
        if shot['template']!='endcard' and counts.get(shot['id'])!=shot['frames']:
            raise PipelineError(f"Missing frames for {shot['id']}")
    for font in FONTS:
        link_file(FONT_ROOT/font,public/'fonts'/font)
    write_json(root/'stage-qa.json',{'project_id':doc['project_id'],'verified_frames':counts})
    print(f"Staged {sum(counts.values())} checked Blender/Manim frames and licensed fonts; ready for composition.",flush=True)


def _relative_poster(movie,doc,output,exe,log):
    """Make a board of five *decoded final* video frames, not a mock-up."""
    size=(360,202)
    panel=(1160,532)
    board=Image.new('RGB',panel,'#10262c')
    draw=ImageDraw.Draw(board)
    big=ImageFont.truetype(str(FONT_ROOT/'InstrumentSerif-Regular.ttf'),56)
    mono=ImageFont.truetype(str(FONT_ROOT/'JetBrainsMono-Regular.ttf'),14)
    with TemporaryDirectory(dir=output,prefix='.proof-') as temp:
        for idx,s in enumerate(doc['shots'][:6]):
            frame=s['start']+max(1,round(s['frames']*.50))
            path=Path(temp)/f"{s['id']}.png"
            ffmpeg_run(exe,['-hide_banner','-v','error','-y','-threads','2','-i',str(movie),'-map','0:v:0',
                            '-vf',f'select=eq(n\\,{frame})','-frames:v','1','-pix_fmt','rgb24','-threads','2',str(path)],log)
            frame_stats(path,(doc['settings']['width'],doc['settings']['height']))
            with Image.open(path) as image:
                x=28+(idx%3)*377
                y=18+(idx//3)*254
                board.paste(image.resize(size,Image.Resampling.LANCZOS),(x,y))
                draw.text((x,y+size[1]+7),s['marker'],font=mono,fill='#d1e5c9')
                if idx==0:
                    image.save(output/'poster.png')
    if len(doc['shots'])==5:
        draw.text((782,298),'Meridian.',font=big,fill='#f4edda')
        draw.text((786,378),'M/01  •  PRODUCTION REEL',font=mono,fill='#e9a776')
        draw.text((786,415),f"{doc['settings']['width']} × {doc['settings']['height']} / {doc['settings']['fps']:02} FPS",
                  font=mono,fill='#bcd7c9')
    board.save(output/'contact-sheet.jpg',quality=93,optimize=True)


def export(root):
    import imageio_ffmpeg

    doc=load_plan(root)
    w,h,fps=(doc['settings'][k] for k in ('width','height','fps'))
    clip=SimpleNamespace(width=w,height=h,fps=fps,frames=doc['frames'])
    stage_qa=read_json(root/'stage-qa.json')
    visual_qa=read_json(root/'visual-receipt.json')
    base=root/'visual.mp4'
    if (stage_qa.get('project_id')!=doc['project_id'] or visual_qa.get('project_id')!=doc['project_id']
            or visual_qa.get('sha256')!=digest(base) or visual_qa.get('frames')!=doc['frames']):
        raise PipelineError('Stale/incomplete compositor output or staging receipt')
    out=root/'delivery'
    out.mkdir(parents=True,exist_ok=True)
    log=out/'ffmpeg.log'
    log.write_text('',encoding='utf8')
    audio=out/'meridian-score.wav'
    peak=score(doc,audio)
    verify_sync(doc,audio)
    captions=out/'meridian.srt'
    captions.write_text(subtitles(doc),encoding='utf8')
    exe=imageio_ffmpeg.get_ffmpeg_exe()
    version=ffmpeg_run(exe,['-version'],log).splitlines()[0]
    result=out/'meridian.mp4'
    with TemporaryDirectory(dir=out,prefix='.mux-') as temp:
        draft=Path(temp)/'meridian.mp4'
        ffmpeg_run(exe,['-hide_banner','-v','warning','-y','-i',str(base),'-i',str(audio),'-i',str(captions),
                        '-map','0:v:0','-map','1:a:0','-map','2:s:0','-c:v','copy','-c:a','aac','-b:a','192k',
                        '-c:s','mov_text','-metadata:s:s:0','language=eng','-disposition:s:0','0',
                        '-movflags','+faststart',str(draft)],log)
        verify_video(exe,draft,clip,log)
        decoded=Path(temp)/'decoded.wav'
        ffmpeg_run(exe,['-hide_banner','-v','error','-xerror','-y','-i',str(draft),'-map','0:a:0','-c:a','pcm_s16le',str(decoded)],log)
        audio_qa=verify_sync(doc,decoded,lossy=True)
        text=ffmpeg_run(exe,['-hide_banner','-v','error','-i',str(draft),'-map','0:s:0','-f','srt','-'],log)
        expected=subtitles(doc).strip().splitlines()
        actual=text.strip().splitlines()
        if actual!=expected:
            raise PipelineError(f'Muxed subtitles did not round-trip with their text and timestamps: {actual[:4]}')
        draft.replace(result)
    _relative_poster(result,doc,out,exe,log)
    for shot in doc['shots']:
        if shot['template'] in BLENDER_TEMPLATES:
            part=blend_path(root,shot['id'])
            if digest(part)!=doc['scene_sha256'][shot['id']]:
                raise PipelineError(f"Damaged editable source: {shot['id']}")
            copy=out/'blender'/part.name
            copy.parent.mkdir(exist_ok=True)
            shutil.copyfile(part,copy)
        if shot['template']=='diagram':
            shutil.copyfile(root/'diagrams'/shot['id']/'source.mp4',out/f"{shot['id']}-manim.mp4")
            shutil.copyfile(root/'diagrams'/shot['id']/'receipt.json',out/f"{shot['id']}-qa.json")
    shutil.copyfile(project_path(root),out/'project.json')
    shutil.copyfile(root/'bundle/scene-qa.json',out/'scene-qa.json')
    report={'status':'pass','project_id':doc['project_id'],'preset':doc['preset'],'video':[w,h,fps],
            'decoded_frames':doc['frames'],'seconds':doc['frames']/fps,
            'native_3d_plate_res':[doc['settings']['plate_width'],doc['settings']['plate_height']],
            'visual_engine':visual_qa['engine'],'verified_inputs':stage_qa['verified_frames'],
            'audio_peak_dbfs':peak,'audio':audio_qa,'subtitles':len(doc['shots']),
            'video_sha256':digest(result),'ffmpeg':version}
    write_json(out/'delivery-qa.json',report)
    print(f"{w}x{h} delivery passed full video, audio and subtitle checks: {result}",flush=True)
