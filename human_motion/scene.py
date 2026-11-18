"""Scene build and representative render sampling under the locked bpy runtime."""

from pathlib import Path
import time

import bpy

from blender_pipeline.authoring import check_runtime, save_blend
from blender_pipeline.manifest import write_json
from production.studio import configure
from .assets import load
from .character import create
from .courtyard import courtyard, camera
from .performance import animate
from .project import MASTER
from .rig import build_rig

WIDTH, HEIGHT, FRAMES, FPS, SAMPLES = MASTER.width, MASTER.height, MASTER.frames, MASTER.fps, MASTER.samples
SHOTS=((1,'01 • Standing / breath'),(73,'02 • Set out'),(145,'03 • Stop / glance'),
       (217,'04 • Greet'),(289,'05 • Lower / settle'),(360,'END / 15 s'))


def build(path):
    started=time.monotonic(); check_runtime(bpy)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene; scene.name='A Passing Hello | courtyard continuous take'
    configure(scene,{'fps':FPS,'plate_width':WIDTH,'plate_height':HEIGHT,'samples':SAMPLES},FRAMES,exposure=-.39)
    scene.render.threads_mode='FIXED'; scene.render.threads=2
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.cycles.adaptive_threshold=.060
    scene.cycles.diffuse_bounces=2
    scene.cycles.transparent_max_bounces=3
    scene.render.use_motion_blur=False
    scene.render.filepath='//plates/frame-'
    model=load(); ctrl=build_rig(model); person=create(model,ctrl.rig,ctrl.merge)
    animate(scene,ctrl,person,FRAMES,FPS)
    courtyard(scene); camera(scene,FRAMES,FPS)
    guide=bpy.data.texts.new('START HERE • edit the performance')
    guide.write('A PASSING HELLO / 360 frames at 24 fps\n\n'
                'Arun | animation controls: root, spine, head and FK arms in Pose Mode.\n'
                'In Bone Collections show 03 for fingers or 05 for facial joints.\n'
                'Collection 01 contains world-space sole, knee direction, and binocular gaze controls.\n'
                'Select the face mesh for Smile, Brow and Blink shape keys.\n'
                'Timeline markers show the five story beats. The camera and focus have their own keys.\n'
                'Images and font are packed. The scene has no dependencies on add-ons, drivers or auto-run Python.\n')
    for f,label in SHOTS:
        scene.timeline_markers.new(label,frame=f)
    for o in bpy.context.selected_objects: o.select_set(False)
    bpy.context.view_layer.objects.active=ctrl.rig
    # A camera view and selected actor are practical editor defaults; helper bones remain toggleable.
    for scr in bpy.data.screens:
        for area in scr.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_perspective='CAMERA'
                area.spaces.active.overlay.show_extras=False
                area.spaces.active.overlay.show_bones=False
                area.spaces.active.shading.color_type='MATERIAL'
    scene.frame_set(1)
    path.parent.mkdir(parents=True,exist_ok=True)
    save_blend(bpy,scene,path.resolve())
    record={**person.counts,'frames':FRAMES,'fps':FPS,'native_resolution':[WIDTH,HEIGHT],
            'bones':len(ctrl.rig.data.bones),'objects':len(scene.objects),'build_seconds':round(time.monotonic()-started,3)}
    write_json(path.parent/'build.json',record)
    print(record,flush=True)
    return scene,ctrl,person


def samples(path,folder,frames,res=None,quality=None):
    from blender_pipeline.worker import load_scene
    check_runtime(bpy)
    scene=load_scene(bpy,path.resolve(),2)
    if res:
        scene.render.resolution_x,scene.render.resolution_y=res
    if quality:
        scene.cycles.samples=quality
    folder.mkdir(parents=True,exist_ok=True)
    for frame in frames:
        start=time.monotonic()
        scene.frame_set(frame); scene.render.filepath=str(folder/f'frame-{frame:05d}.png')
        if bpy.ops.render.render(write_still=True)!={'FINISHED'}:
            raise RuntimeError(f'Frame {frame} did not render')
        print(f'sample {frame}: {time.monotonic()-start:.3f} s',flush=True)


def prepare(root):
    from blender_pipeline.authoring import blender_toolchain
    from blender_pipeline.manifest import read_json
    from blender_pipeline.worker import load_scene
    from .project import BLEND, SCENE_QA, create_plan
    from .quality import inspect
    bundle=root/'bundle'
    path=bundle/BLEND
    build(path)
    scene=load_scene(bpy,path.resolve(),2)
    qa=inspect(scene,read_json(bundle/'build.json'))
    toolchain=blender_toolchain(bpy)
    doc=create_plan(bundle,toolchain)
    write_json(bundle/SCENE_QA,{**qa,'project_id':doc['project_id'],'toolchain':toolchain})
    print(f"Prepared {path}, {len(doc['shards'])} batches; loaded-scene QA passed",flush=True)
