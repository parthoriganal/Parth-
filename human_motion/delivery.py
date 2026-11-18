"""Pillow review plates plus a full H.264/AAC decode on Blender-free runners."""

from datetime import datetime
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
from types import SimpleNamespace
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile
import wave

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from blender_pipeline.manifest import ROOT, PipelineError, digest, frame_name, read_json, shard_dir, write_json
from blender_pipeline.media import ffmpeg_run, verified_frames, verify_video
from .foley import soundtrack
from .project import BASENAME, BLEND, DELIVERY_SIZE, FONT_PATH, PLAN, SCENE_QA, load_plan, source_paths

REVIEW=((1,'01 / Stillness'),(84,'02 / First transfer'),(103,'02 / Passing step'),
        (140,'02 / Decelerate'),(167,'03 / Attention shifts'),(190,'03 / Turn in close-up'),
        (238,'04 / Open-hand greeting'),(270,'04 / Hand starts to fall'),(349,'05 / Quiet again'))


def check(ok,message):
    if not ok:
        raise PipelineError(message)


def clock(frames_root,plan):
    values=[]; firsts=[]; ends=[]; workers=[]
    for shard in plan['shards']:
        folder=shard_dir(frames_root,shard)
        logs=[json.loads(line) for line in (folder/'events.jsonl').read_text().splitlines() if line.strip()]
        starts=[datetime.fromisoformat(r['utc']) for r in logs if r['event']=='shard_started']
        done=[r for r in logs if r['event']=='shard_complete']
        check(starts and done,f'Incomplete CPU timing log: {folder.name}')
        firsts.append(min(starts)); ends.append(max(datetime.fromisoformat(x['utc']) for x in done))
        fresh={r['frame']:r['seconds'] for r in logs if r['event']=='rendered_frame'}
        check(set(fresh)==set(range(shard['first'],shard['last']+1)),f'Missing recorded times in {folder.name}')
        values.extend(fresh.values())
        for row in done:
            if row.get('new_frames'):
                workers.append(row)
    return {'frames_with_recorded_time':len(values),'render_wall_clock_span_s':(max(ends)-min(firsts)).total_seconds(),
            'wall_span_first_started_to_last_finished_utc':[min(firsts).isoformat(),max(ends).isoformat()],
            'wall_span_precision':'UTC event timestamps, 1 second; includes overlaps and any waits within span',
            'sum_completed_frame_seconds':round(sum(values),2),'median_frame_seconds':round(float(np.median(values)),2),
            'min_frame_seconds':min(values),'max_frame_seconds':max(values),
            'max_worker_rss_mib':max(a['peak_rss_mib'] for a in workers),
            'worker_thread_counts':sorted({a['cpu_threads'] for a in workers})}


def entries(root,bundle,out,plan,qa,paths):
    sources=out/(BASENAME+'-source.zip')
    temp=sources.with_suffix('.partial.zip')
    with ZipFile(temp,'w',compression=ZIP_DEFLATED,compresslevel=5) as arc:
        for name in (BLEND,PLAN,SCENE_QA):
            arc.write(bundle/name,'blender/'+name)
        extra=['production/models.py','human_motion/README.md','singularity-bloom/setup_bpy_headless.sh']
        for path in [*source_paths(),*(ROOT/p for p in extra)]:
            item=path.relative_to(ROOT).as_posix()
            check(path.is_file(),f'Missing rebuild asset: {item}')
            if item in plan['sources_sha256']:
                check(digest(path)==plan['sources_sha256'][item],f'Stale build source: {item}')
            arc.write(path,'rebuild/'+item)
        arc.write(out/'foley.wav','audio/foley.wav')
        arc.write(out/'README.txt','DELIVERY.txt')
    with ZipFile(temp) as arc:
        check(arc.testzip() is None,'Source ZIP CRC validation failed')
        check(digest(bundle/BLEND)==plan['scene_sha256'],'Packed source scene changed')
    temp.replace(sources)
    frames=root/(BASENAME+'-frames.zip')
    temp=frames.with_suffix('.partial.zip')
    with ZipFile(temp,'w',compression=ZIP_STORED) as arc:
        for path in paths:
            arc.write(path,'frames/'+path.name)
        arc.writestr('FRAME-SHA256SUMS.txt',''.join(f'{digest(path)}  frames/{path.name}\n' for path in paths))
        arc.writestr(PLAN,json.dumps(plan,indent=2,sort_keys=True)+'\n')
    with ZipFile(temp) as arc:
        check(arc.testzip() is None and len(arc.namelist())==len(paths)+2, 'Frame ZIP CRC or count failed')
    temp.replace(frames)
    return {'source_package':{'bytes':sources.stat().st_size,'sha256':digest(sources)},
            'frame_sequence':{'bytes':frames.stat().st_size,'sha256':digest(frames),'count':len(paths)}}


def strip_from_decode(exe,video,which,folder,log):
    folder.mkdir(parents=True,exist_ok=True)
    seq=folder/'decoded-%03d.png'
    select='+'.join(f'eq(n\\,{f-1})' for f,_ in which)
    ffmpeg_run(exe,['-hide_banner','-v','error','-xerror','-y','-i',str(video),'-an','-vf',
                    f'select={select},scale=512:288:flags=lanczos','-fps_mode','passthrough',
                    '-frames:v',str(len(which)),'-threads','2',str(seq)],log)
    images=[folder/f'decoded-{i:03d}.png' for i in range(1,len(which)+1)]
    check(all(i.is_file() for i in images),'Decoded contact sheet extraction did not return all frames')
    return images


def contact_sheet(images,which,dest,*,title='A Passing Hello',subtitle='DECODED MASTER  /  PERFORMANCE REVIEW'):
    canvas=Image.new('RGB',(1632,1129),'#141e20'); d=ImageDraw.Draw(canvas)
    def face(name,size): return ImageFont.truetype(str(ROOT/FONT_PATH/name),size)
    serif=face('InstrumentSerif-Regular.ttf',65); mono=face('JetBrainsMono-Regular.ttf',16); small=face('JetBrainsMono-Regular.ttf',13)
    cream='#f4e9d3'; moss='#b5c1ae'
    d.text((30,6),title,font=serif,fill=cream)
    d.text((1602,29),subtitle,font=mono,fill=moss,anchor='rt')
    d.text((1602,57),'24 FPS  /  ONE CONTINUOUS TAKE  /  15 SECONDS',font=small,fill=moss,anchor='rt')
    d.line((30,86,1602,86), fill='#60746f',width=1)
    for i,(path,(frame,label)) in enumerate(zip(images,which)):
        x=30+(i%3)*530; y=106+(i//3)*332
        with Image.open(path) as im:
            canvas.paste(im.convert('RGB').resize((512,288),Image.Resampling.LANCZOS),(x,y))
        d.text((x,y+296),label,font=mono,fill=cream)
        d.text((x+512,y+301),f'{(frame-1)/24:05.2f} S  ·  F{frame:03}',font=small,fill=moss,anchor='rt')
    canvas.save(dest,quality=93,optimize=True,subsampling=1)


def motion_probe(exe,video,frames,log):
    with log.open('ab') as stream:
        result=subprocess.run([exe,'-v','error','-xerror','-threads','2','-i',str(video),'-an',
                               '-vf','scale=160:90:flags=area,format=gray','-f','rawvideo','-threads','2','pipe:1'],
                              stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=stream,check=True,timeout=120)
    plane=np.frombuffer(result.stdout,dtype=np.uint8).reshape((-1,90,160)); check(len(plane)==frames,'Visual motion decode count mismatch')
    delta=np.abs(np.diff(plane.astype(np.int16),axis=0)).mean(axis=(1,2))
    duplicates=sum(np.array_equal(a,b) for a,b in zip(plane,plane[1:]))
    check(duplicates==0 and float(np.max(delta))<14. and float(np.median(delta))>.35,
          f'Unexpected low-res decoded motion delta: {duplicates} adjacent repeats, p50 {np.median(delta)}, max {np.max(delta)}')
    return {'adjacent_identical_downsampled_frames':int(duplicates),'adjacent_delta_mean_luma_0_255':
            {k:round(float(fn(delta)),4) for k,fn in [('min',np.min),('median',np.median),('max',np.max)]}}


def deliver(root):
    started=time.monotonic()
    bundle=root/'bundle'; frames_root=root/'frames'; out=root/'delivery'; out.mkdir(parents=True,exist_ok=True)
    plan,p=load_plan(bundle)
    scene=read_json(bundle/SCENE_QA)
    check(scene.get('project_id')==plan['project_id'] and scene.get('status')=='pass','Missing or stale loaded-scene QA')
    paths,stats=verified_frames(frames_root,plan,p)
    timing=clock(frames_root,plan)
    print(f"Verified {len(paths)} ordered PNGs: {timing}",flush=True)
    log=out/'encode.log'; log.write_text('',encoding='utf8')
    wav=out/'foley.wav'; audio=soundtrack(wav,p.frames/p.fps)
    exe=imageio_ffmpeg.get_ffmpeg_exe()
    encoder=ffmpeg_run(exe,['-version'],log).splitlines()[0]
    sequence=root/'verified-sequence'; sequence.mkdir(exist_ok=True)
    for path in paths:
        target=sequence/path.name; target.unlink(missing_ok=True)
        try: os.link(path,target)
        except OSError: shutil.copyfile(path,target)
    result=out/(BASENAME+'.mp4'); tmp=out/'.master.partial.mp4'
    w,h=DELIVERY_SIZE
    ffmpeg_run(exe,['-hide_banner','-v','warning','-xerror','-y','-f','image2','-framerate',str(p.fps),
                    '-start_number','1','-i',str(sequence/'frame-%05d.png'),'-i',str(wav),'-map','0:v:0','-map','1:a:0',
                    '-sws_flags','lanczos+accurate_rnd','-vf',f'scale={w}:{h}:flags=lanczos:out_color_matrix=bt709,format=yuv420p',
                    '-frames:v',str(p.frames),'-c:v','libx264','-crf','17','-preset','fast','-threads','4','-filter_threads','2',
                    '-c:a','aac','-b:a','160k','-ar','48000','-t','15.0','-colorspace','bt709','-color_trc','bt709',
                    '-color_primaries','bt709','-movflags','+faststart','-metadata','title=A Passing Hello',str(tmp)],log)
    verify_video(exe,tmp,SimpleNamespace(width=w,height=h,fps=p.fps,frames=p.frames),log)
    wav_out=root/'decoded-audio.wav'
    ffmpeg_run(exe,['-hide_banner','-v','error','-xerror','-y','-i',str(tmp),'-map','0:a:0','-c:a','pcm_s16le',str(wav_out)],log)
    with wave.open(str(wav_out),'rb') as wfile:
        audio['decoded_samples']=wfile.getnframes()
        check(wfile.getframerate()==audio['sample_rate'] and wfile.getnchannels()==2 and
              abs(wfile.getnframes()-audio['source_samples'])<=1024,'Decoded audio clock mismatch')
    motion=motion_probe(exe,tmp,p.frames,log)
    images=strip_from_decode(exe,tmp,REVIEW,root/'decoded-review',log)
    contact_sheet(images,REVIEW,out/'contact-sheet.jpg')
    with Image.open(images[6]) as poster:
        poster.save(out/'poster.jpg',quality=94,subsampling=0)
    tmp.replace(result)
    shutil.copyfile(bundle/BLEND,out/BLEND)
    shutil.copyfile(bundle/SCENE_QA,out/SCENE_QA)
    (out/'README.txt').write_text(f'A PASSING HELLO\n\n360 frames / 24 fps / exactly 15 seconds\n'
        f'1920 x 1080 MP4 / Lanczos upscale of {p.width} x {p.height} native Cycles CPU PNGs\n'
        'No dialogue. Original ambient tone and timed shoe cues.\n\n'
        'Open a-passing-hello.blend in Blender 5.0.1. Read START HERE in its Text Editor and human_motion/README.md in the source ZIP.\n'
        'The complete native PNG sequence and per-frame hashes are in the separate frames ZIP.\n'
        'See delivery-qa.json and scene-qa.json for timings, payload hashes, pose and media checks.\n',encoding='utf8')
    packages=entries(root,bundle,out,plan,scene,paths)
    report={'status':'pass','title':plan['title'],'project_id':plan['project_id'],'scene_sha256':plan['scene_sha256'],
            'native_resolution':[p.width,p.height],'delivery_resolution':[w,h],'upscale':'Lanczos; no interpolated video frames',
            'fps':p.fps,'decoded_frames':p.frames,'duration_s':p.frames/p.fps,'render_engine':'Blender 5.0.1 / Cycles CPU + OIDN',
            'samples_per_pixel_max':p.samples,'checked_pngs':len(paths),'minimum_plate_luma_sd':min(s['luma_stddev'] for s in stats),
            'minimum_plate_luma_mean':min(s['luma_mean'] for s in stats),'maximum_plate_luma_mean':max(s['luma_mean'] for s in stats),
            'render_timing':timing,'decode_motion':motion,'review_frames':[f for f,_ in REVIEW], 'audio':audio,
            'ffmpeg':encoder,'mp4_sha256':digest(result),'mp4_bytes':result.stat().st_size,
            'encode_decode_package_s':round(time.monotonic()-started,2),**packages}
    write_json(out/'delivery-qa.json',report)
    (out/'SHA256SUMS.txt').write_text(''.join(f'{digest(path)}  {path.name}\n' for path in (
        result, out/BLEND,out/(BASENAME+'-source.zip'),root/(BASENAME+'-frames.zip'),out/'contact-sheet.jpg',out/'delivery-qa.json')),encoding='ascii')
    print(f"Delivered {len(paths)} actual animated and verified frames: {result}",flush=True)
