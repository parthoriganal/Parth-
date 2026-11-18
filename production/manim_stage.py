"""Render an actual Manim/Cairo optical plate; no OpenGL, LaTeX, or remote fonts."""

from pathlib import Path
from tempfile import TemporaryDirectory

from blender_pipeline.manifest import PipelineError, digest, frame_name, write_json
from blender_pipeline.media import ffmpeg_run, frame_stats

from .edl import load_plan


def optical_scene(m, seconds):
    class OpticalStudy(m.Scene):
        def construct(self):
            grid = m.VGroup(*(m.Line([i*.45,-3.6,0],[i*.45,3.6,0],stroke_width=.7, color='#294c50')
                              for i in range(-1,16)),
                            *(m.Line([-.45,i*.45,0],[6.72,i*.45,0],stroke_width=.7,color='#294c50')
                              for i in range(-8,9)))
            self.add(grid)
            center = 2.72
            fixture = m.VGroup()
            fixture.add(m.RoundedRectangle(width=2.05,height=3.72,corner_radius=.24, color='#a2c3b6',
                                           stroke_width=2.5,fill_color='#18393d', fill_opacity=1).move_to([center,.05,0]))
            for y in (-1.82, 1.91):
                fixture.add(m.RoundedRectangle(width=2.23,height=.40,corner_radius=.08,color='#70a3a0',
                                               stroke_width=2, fill_color='#224649',fill_opacity=1).move_to([center,y,0]))
            for side in (-1,1):
                fixture.add(m.Line([center+side*.84,-1.43,0],[center+side*.84,1.53,0],
                                   color='#dba16f',stroke_width=2.6))
            fixture.add(m.DashedLine([center,-2.9,0],[center,2.66,0],dash_length=.13,stroke_width=1.4,color='#719e92'))
            source = m.Circle(radius=.19,fill_color='#fff2cb',fill_opacity=1,color='#efae79',stroke_width=3).move_to([center,-1.20,0])
            fixture.add(source)
            self.add(fixture)

            def tag(text, x, y, color='#a2c3b6', size=23):
                return m.Text(text, font='DejaVu Sans Mono', font_size=size, color=color).move_to([x,y,0])

            self.add(tag('SECTION A—A', 4.99, 2.92, '#dbedd6', 25), tag('CONCEPT / NOT MEASURED', 4.59, -2.99, size=19))
            for text, y, start in (('01 / OPAL DIFFUSER',.06,3.64),('02 / REFLECTOR',-1.62,3.54)):
                self.add(m.Line([start,y,0],[5.04,y,0], color='#6d9a91',stroke_width=1.4),
                         m.Dot([start,y,0],radius=.047,color='#d6bd8b'), tag(text,5.42,y+.31,size=20))

            t = m.ValueTracker(0)
            rays = []
            for side in (-1,1):
                for i in range(4):
                    y=.98-i*.40
                    ray = m.CubicBezier([center,-1.2,0],[center+side*.23,y-.19,0],
                                         [center+side*.93,y+.11,0],[center+side*(2.28-i*.16),y+.62,0],
                                         color=('#fec184' if i%2 == 0 else '#82cebc'),stroke_width=2.8)
                    rays.append((ray, i*.066+(.04 if side<0 else 0)))
            for ray,index in rays:
                track = ray.copy()
                trace = ray.copy()
                dot = m.Dot(radius=.056,color='#fff4d1')
                def ray_update(mob, path=ray, offset=index):
                    u = min(1,max(.005,(t.get_value()-offset)*2.05))
                    mob.pointwise_become_partial(path,0,u)
                    mob.set_stroke(opacity=.75)
                def dot_update(mob, path=ray, offset=index):
                    u = ((t.get_value() - offset) * 1.72) % 1
                    mob.move_to(path.point_from_proportion(u))
                    mob.set_opacity(.78 if t.get_value() > offset else 0)
                track.set_stroke(opacity=.18)
                trace.add_updater(ray_update)
                dot.add_updater(dot_update)
                self.add(track, trace, dot)
            meter = m.VGroup(*(m.Line([.32+i*.215,-3.15,0],[.32+i*.215,-3.31,0],
                                      color='#8ab0a6',stroke_width=2) for i in range(10)))
            for i, mark in enumerate(meter):
                mark.add_updater(lambda mob, i=i: mob.set_stroke(opacity=1 if t.get_value() >= i/11 else .23))
            self.add(meter)
            self.play(t.animate.set_value(1),run_time=seconds,rate_func=m.linear)
    return OpticalStudy()


def render_diagrams(root):
    import manim as m
    import imageio_ffmpeg
    from PIL import Image, ImageChops, ImageStat

    doc = load_plan(root)
    config = doc['settings']
    w,h,fps = config['width'],config['height'],config['fps']
    for shot in doc['shots']:
        if shot['template'] != 'diagram':
            continue
        folder = root / 'diagrams' / shot['id']
        folder.mkdir(parents=True,exist_ok=True)
        log = folder / 'manim.log'
        with TemporaryDirectory(dir=folder, prefix='.cairo-') as temp:
            with m.tempconfig({'renderer':'cairo','pixel_width':w,'pixel_height':h,'frame_rate':fps,
                               'background_color':'#0e242a','format':'mp4','background_opacity':1.0,
                               'media_dir':temp,'output_file':shot['id'],
                               'disable_caching':True,'verbosity':'WARNING','progress_bar':'none'}):
                scene = optical_scene(m,shot['frames']/fps)
                scene.render()
                movie = Path(scene.renderer.file_writer.movie_file_path)
                if not movie.is_file():
                    raise PipelineError('Manim did not produce an optical plate')
            # Decode into a fresh directory: a short plate must not accidentally reuse PNGs
            # from a previous attempt. Publish only after all requested frames decode.
            tiles = Path(temp) / 'frames'
            tiles.mkdir()
            ffmpeg_run(imageio_ffmpeg.get_ffmpeg_exe(), ['-hide_banner','-v','error','-xerror','-y',
                       '-threads','2','-i',str(movie),'-frames:v',str(shot['frames']),'-pix_fmt','rgb24',
                       '-threads','2','-start_number','1',str(tiles/'frame-%05d.png')], log)
            hashes = {}
            for i in range(1,shot['frames']+1):
                path = tiles / frame_name(i)
                frame_stats(path,(w,h))
                hashes[str(i)] = digest(path)
            movie.replace(folder/'source.mp4')
            for i in range(1,shot['frames']+1):
                (tiles/frame_name(i)).replace(folder/frame_name(i))
        def sample(i):
            with Image.open(folder/frame_name(i)) as im:
                return im.resize((320,180))
        diff = sum(ImageStat.Stat(ImageChops.difference(sample(1),sample(shot['frames']))).mean)/3
        if diff < .15:
            raise PipelineError(f"Manim {shot['id']} appears static ({diff:.3f})")
        write_json(folder/'receipt.json', {'project_id':doc['project_id'],'shot':shot['id'],'frames':hashes,
                   'motion_delta':round(diff,3), 'manim':m.__version__, 'renderer':'cairo',
                   'source_sha256':digest(folder/'source.mp4')})
        print(f"Manim {m.__version__} / Cairo: {shot['frames']} real frames at {w}x{h}, delta {diff:.2f}.",flush=True)
