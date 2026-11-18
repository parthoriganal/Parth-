"""Atlas typography and visual QA on the original production clock and muxer."""

from functools import lru_cache
import hashlib
from math import cos, pi
import re
import shutil
import subprocess
from zipfile import ZIP_STORED, ZipFile

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from blender_pipeline.manifest import PipelineError, digest, frame_name, read_json, write_json
from blender_pipeline.media import ffmpeg_run
from production import delivery
from production.edl import FONT_ROOT, ROOT as SHARED
from .quality import issues, measure, small_luma
from .storyboard import HERE, require

INK = '#0e1a1c'
CREAM = '#eee9d9'
ASH = '#aec1b6'
LINE = '#566d67'
SERIF = 'InstrumentSerif-Regular.ttf'
MONO = 'JetBrainsMono-Regular.ttf'


def scene_report(root, doc):
    report = read_json(root/'bundle/scene-qa.json')
    require(report.get('project_id') == doc['project_id'] and report.get('status') == 'pass', 'Scene QA is missing or stale')
    return report


def stage(root, doc):
    scene = scene_report(root, doc)
    require(not scene['proof_only'], 'Fault-injection bundles are not film inputs')
    # Keep M/01's checksum, RGB decode, dimension and ordered-frame validation.
    delivery.stage(root)
    results = []
    qa = {s['id']: s for s in scene['shots']}
    for shot in doc['shots']:
        sid = shot['id']
        path = root/'public'/sid
        bounds = qa[sid]['visual']['analysis_bounds']
        rows, adjacent = [], []
        first = previous = None
        for f in range(1, shot['frames'] + 1):
            png = path/frame_name(f)
            stat = measure(png, bounds)
            problem = issues(stat)
            require(not problem, f'{sid}/{f}: visual check failed {problem}: {stat}')
            rows.append({'frame': f, 'sha256': digest(png), **stat})
            current = small_luma(png)
            if previous is None:
                first = current
            else:
                adjacent.append(float(np.mean(np.abs(previous-current))))
            previous = current
        span = float(np.mean(np.abs(first-previous)))
        require(span >= .018 and np.median(adjacent) >= .001, f'{sid}: rendered plates have insufficient visible motion')
        results.append({'id': sid, 'checked_frames': len(rows), 'analysis_bounds': bounds,
                        'min_p90': min(s['p90'] for s in rows), 'max_median': max(s['median'] for s in rows),
                        'max_highlight_clip': max(s['highlight_clip'] for s in rows),
                        'min_edge_energy': min(s['edge_energy'] for s in rows),
                        'opening_to_closing_luma_delta': round(span, 5),
                        'adjacent_median_luma_delta': round(float(np.median(adjacent)), 5), 'frames': rows})
    write_json(root/'image-qa.json', {'project_id': doc['project_id'], 'status': 'pass',
                                     'checked_frames': sum(s['checked_frames'] for s in results), 'shots': results})
    print(f"Inspected all {doc['frames']} rendered plates for exposure, detail and image motion.", flush=True)


@lru_cache(maxsize=128)
def font(name, size):
    return ImageFont.truetype(str(FONT_ROOT/name), max(1, size))


def artist(doc):
    """Return a Pillow frame function. The film, not the graphics, owns most of the screen."""
    w,h,fps = (doc['settings'][key] for key in ('width','height','fps'))
    q = w/1920
    px = lambda n: round(n*q)
    matte = Image.new('RGB', (w,h), INK)
    # Only the top/bottom inch carries dark ink. Luminance and all animated elements in the plate remain visible.
    ramp = Image.new('L', (1,h))
    ramp.putdata([round(255*max(.46*max(0,1-y/max(1,px(198)))**1.6,
                                min(1,max(0,(y-px(795))/max(1,px(225))))**1.7)) for y in range(h)])
    ramp = ramp.resize((w,h))
    dest_size = (w,h)

    def draw_frame(plate,shot,index,f):
        raw = plate.convert('RGB').resize(dest_size,Image.Resampling.LANCZOS)
        r = Image.new('RGB', dest_size, INK)
        r.paste(raw,(0,-px(65)))
        r = Image.composite(matte,r,ramp)
        d = ImageDraw.Draw(r)
        color = '#'+shot['accent']

        def text(x,y,value,size,fill=CREAM,face=MONO,anchor=None,limit=None):
            face_font = font(face, px(size))
            if limit is not None:
                available = px(limit)
                while face_font.getlength(value)>available and size>10:
                    size-=1
                    face_font=font(face,px(size))
            d.text((px(x),px(y)),value,font=face_font,fill=fill,anchor=anchor)

        d.rectangle((px(66),px(49),px(77),px(65)),fill=color)
        text(96,46,'MERIDIAN / M.02',24)
        text(1851,45,doc['edition'],24,CREAM,anchor='rt',limit=760)
        d.line((px(66),px(100),px(1853),px(100)),fill=LINE,width=max(1,px(1)))
        # A restrained settling motion instead of a blackout over the actual shot cut.
        u = min(1, f/max(1, round(.39*fps)))
        rise = 1 - .5*(1-cos(pi*u))
        y = 875 + 14*rise
        text(66,y,shot['marker'],19,ASH,limit=650)
        text(64,y+17,shot['title'][0],93,CREAM,SERIF,limit=1170)
        text(1852,954,shot['label'],20,CREAM,anchor='rt',limit=590)
        absolute = shot['start']+f
        text(1852,990,f'{index+1:02} / {len(doc["shots"]):02}     {absolute//fps:02}:{absolute%fps:02}',17,ASH,anchor='rt')
        bar=(66,1853,1042)
        d.line((px(bar[0]),px(bar[2]),px(bar[1]),px(bar[2])),fill=LINE,width=max(1,px(1)))
        d.line((px(bar[0]),px(bar[2]),px(bar[0]+(bar[1]-bar[0])*(absolute+1)/doc['frames']),px(bar[2])),
               fill=color,width=max(1,px(2)))
        return r
    return draw_frame


def compose(root, doc):
    report = read_json(root/'image-qa.json')
    require(report.get('project_id') == doc['project_id'] and report.get('status') == 'pass' and
            report.get('checked_frames') == doc['frames'], 'Run stage and image inspection before composing')
    w,h,fps = (doc['settings'][key] for key in ('width','height','fps'))
    draw=artist(doc)
    by_shot={s['id']: {r['frame']:r['sha256'] for r in s['frames']} for s in report['shots']}
    log=root/'compose.log'
    tmp=root/'.visual.partial.mp4'
    dest=root/'visual.mp4'
    args=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-v','warning','-y','-f','rawvideo','-pixel_format','rgb24',
          '-video_size',f'{w}x{h}','-framerate',str(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast',
          '-crf','17','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart',str(tmp)]
    try:
        with log.open('wb') as stream, subprocess.Popen(args,stdin=subprocess.PIPE,stdout=stream,stderr=stream) as pipe:
            try:
                for i, shot in enumerate(doc['shots']):
                    for f in range(shot['frames']):
                        path=root/'public'/shot['id']/frame_name(f+1)
                        require(digest(path)==by_shot[shot['id']][f+1], f'Plate changed after image inspection: {path}')
                        with Image.open(path) as plate:
                            pipe.stdin.write(draw(plate,shot,i,f).tobytes())
                pipe.stdin.close()
                if pipe.wait(timeout=120):
                    raise PipelineError(f'Atlas encode failed, see {log}')
            except BaseException:
                pipe.kill()
                raise
        tmp.replace(dest)
        write_json(root/'visual-receipt.json', {'project_id': doc['project_id'], 'frames': doc['frames'],
                   'sha256': digest(dest), 'engine': 'Weather Atlas • Pillow / FFmpeg CPU'})
        print(f'Composed {doc["frames"]} frames at {w}×{h}, {fps} fps.', flush=True)
    finally:
        tmp.unlink(missing_ok=True)


def film_sheet(movie, doc, out):
    """A designed contact sheet made from frames decoded from the delivered MP4."""
    exe=imageio_ffmpeg.get_ffmpeg_exe()
    board=Image.new('RGB',(1536,182+((len(doc['shots'])+2)//3)*329),INK)
    d=ImageDraw.Draw(board)
    d.text((36,30),'M.02   /   MERIDIAN STUDIES',font=font(MONO,18),fill=ASH)
    d.text((34,51),doc['title'].partition(' — ')[2] or doc['title'],font=font(SERIF,65),fill=CREAM)
    w,h,fps=(doc['settings'][key] for key in ('width','height','fps'))
    d.text((1499,63),f'{w} × {h}    {fps} FPS    /    {doc["frames"]/fps:.1f} S',
           font=font(MONO,17),fill=ASH,anchor='rt')
    d.line((36,135,1499,135),fill=LINE)
    for i,s in enumerate(doc['shots']):
        f=s['start']+s['frames']//2
        png=out/'atlas-frame.png' if i==0 else out/f'atlas-frame-{i+1:02}.png'
        ffmpeg_run(exe,['-v','error','-y','-threads','2','-i',str(movie),'-map','0:v:0','-vf',f'select=eq(n\\,{f})',
                        '-frames:v','1','-pix_fmt','rgb24','-threads','2',str(png)],out/'ffmpeg.log')
        with Image.open(png) as img:
            require(img.size==(w,h),'Decoded poster is wrong size')
            x,y=36+(i%3)*494,161+(i//3)*329
            board.paste(img.resize((475,267),Image.Resampling.LANCZOS),(x,y))
        d.text((x,y+275),s['marker'],font=font(MONO,15),fill='#'+s['accent'])
        d.text((x+474,y+275),f'FRAME {f+1:03}',font=font(MONO,15),fill=ASH,anchor='rt')
    board.save(out/'contact-sheet.jpg',quality=94,optimize=True)


def export(root, doc):
    image = read_json(root/'image-qa.json')
    require(image['project_id']==doc['project_id'] and image['status']=='pass', 'Stale image QA')
    delivery.export(root)
    out=root/'delivery'
    stem=re.sub(r'[^a-z0-9]+','-',doc['edition'].lower()).strip('-') or 'meridian-m02'
    movie=out/f'{stem}.mp4'
    (out/'meridian.mp4').replace(movie)
    (out/'meridian.srt').replace(out/f'{stem}.srt')
    (out/'meridian-score.wav').replace(out/f'{stem}-score.wav')
    (out/'poster.png').unlink(missing_ok=True)
    film_sheet(movie,doc,out)
    shutil.copyfile(root/'bundle/storyboard.json',out/'storyboard.json')
    shutil.copyfile(root/'image-qa.json',out/'image-qa.json')
    report=read_json(out/'delivery-qa.json')
    require(report['video_sha256']==digest(movie), 'Export changed during collection')
    write_json(out/'delivery-qa.json',{**report,'series':'M/02','video_file':movie.name,
            'inspected_plates':image['checked_frames'],'pixel_inspection_sha256':digest(out/'image-qa.json')})
    (out/'EDITABLE.txt').write_text(
        'MERIDIAN M/02 • WEATHER ATLAS\n\nOpen the .blend files in Blender 5.0.1. Each contains its complete set,\n'
        'target and lens animation, named lights, native materials and packed typography.\n'
        'The exported movie adds editorial graphics and the original 48 kHz stereo\n'
        'score. Select the English subtitle track or use the included SRT.\n\n'
        'The JSON is the editable build input. The rebuild/ folder carries the\n'
        'Python source, pinned requirements, fonts and README. It can be used\n'
        'independently of the checkout.\n',encoding='utf8')
    # The final Actions artifact also exposes the MP4 and contact sheet separately.
    source_suffixes={'.blend','.json','.srt','.wav','.txt'}
    files=[p for p in out.rglob('*') if p.is_file() and p.suffix in source_suffixes and p.name!='checksums.json']
    files += [out/'contact-sheet.jpg']
    repo=HERE.parent
    shared_runtime=repo/'blender_pipeline'
    font_files=(*delivery.FONTS, 'JetBrainsMono-Bold.ttf', *delivery.FONT_LICENSES)
    sources=[*HERE.glob('*.py'),*HERE.glob('*.lock'),*HERE.glob('*.md'),*HERE.glob('*.json'),
             *HERE.glob('examples/*.json'),*HERE.glob('tests/*.py'),*SHARED.glob('*.py'),
             *shared_runtime.glob('*.py'),*shared_runtime.glob('*.lock'),
             *(FONT_ROOT/p for p in font_files)]
    zip_path=out/f'{stem}-editable.zip'
    tmp=out/'.editable.partial.zip'
    try:
        with ZipFile(tmp,'w',compression=ZIP_STORED) as zipf:
            for p in sorted(files):
                zipf.write(p,arcname=p.relative_to(out).as_posix())
            for p in sorted(sources):
                zipf.write(p,arcname='rebuild/'+p.relative_to(repo).as_posix())
        with ZipFile(tmp) as zipf:
            require(zipf.testzip() is None,'Editable ZIP CRC verification failed')
            for path in font_files:
                target='rebuild/'+(FONT_ROOT/path).relative_to(repo).as_posix()
                require(target in zipf.namelist(),f'Missing rebuild font/notice: {path}')
            for name, sha in doc['scene_sha256'].items():
                member=f'blender/{name}.blend'
                require(hashlib.sha256(zipf.read(member)).hexdigest()==sha,f'Editable ZIP scene hash mismatch: {name}')
        tmp.replace(zip_path)
    finally:
        tmp.unlink(missing_ok=True)
    write_json(out/'checksums.json', {p.name:digest(p) for p in (movie,zip_path,out/'contact-sheet.jpg')})
    print(f'Collected M/02: {movie} and {zip_path}.',flush=True)
