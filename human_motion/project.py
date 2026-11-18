"""Frozen, content-addressed production plan consumed by the existing plate worker."""

from dataclasses import asdict
from pathlib import Path

from blender_pipeline.manifest import (ROOT, PipelineError, Profile, digest, identity,
                                       ranges, read_json, write_json)

TITLE='A Passing Hello'
BASENAME='a-passing-hello'
BLEND=BASENAME+'.blend'
PLAN='project.json'
SCENE_QA='scene-qa.json'
DURATION=15
FPS=24
FRAMES=FPS*DURATION
MASTER=Profile(1152,648,FRAMES,FPS,12,18)
DELIVERY_SIZE=(1920,1080)
FONT_PATH=Path('.claude/skills/anthropic/canvas-design/canvas-fonts')
FONTS=('InstrumentSerif-Regular.ttf','JetBrainsMono-Regular.ttf','JetBrainsMono-Bold.ttf',
       'InstrumentSerif-OFL.txt','JetBrainsMono-OFL.txt')
SHOTS=((1,'Stand / breathe'),(73,'Walk'),(145,'Stop / look'),(217,'Greet'),(289,'Lower / settle'))


def source_paths():
    return sorted([*ROOT.glob('human_motion/*.py'),ROOT/'meridian_m02/requirements-media.lock',*ROOT.glob('human_motion/assets/*'),
                   *ROOT.glob('human_motion/tests/*.py'),*ROOT.glob('blender_pipeline/*.py'),
                   *ROOT.glob('blender_pipeline/*.lock'),
                   *(ROOT/path for path in ('production/__init__.py','production/studio.py','production/edl.py',
                      'meridian_m02/__init__.py','meridian_m02/look.py','.github/actions/setup-blender-cpu/action.yml')),
                   *(ROOT/FONT_PATH/name for name in FONTS)])


def create_plan(bundle,toolchain):
    doc={'schema':1,'title':TITLE,'profile':'courtyard-master','settings':asdict(MASTER),
         'delivery_resolution':list(DELIVERY_SIZE),'shards':ranges(MASTER),'beats':[list(v) for v in SHOTS],
         'scene_sha256':digest(bundle/BLEND),'toolchain':toolchain,
         'sources_sha256':{p.relative_to(ROOT).as_posix():digest(p) for p in source_paths()
                           if p.parent.name!='tests' and p.name not in {'delivery.py','foley.py','review_relay.py','__main__.py'}}}
    doc['project_id']=identity(doc)
    write_json(bundle/PLAN,doc)
    return doc


def load_plan(bundle):
    bundle=Path(bundle)
    doc=read_json(bundle/PLAN)
    if (doc.get('schema')!=1 or doc.get('title')!=TITLE or doc.get('profile')!='courtyard-master' or
            doc.get('settings')!=asdict(MASTER) or doc.get('delivery_resolution')!=list(DELIVERY_SIZE) or
            doc.get('shards')!=ranges(MASTER) or identity(doc)!=doc.get('project_id')):
        raise PipelineError('A Passing Hello manifest invalid: '+str(bundle/PLAN))
    if not (bundle/BLEND).is_file() or doc.get('scene_sha256')!=digest(bundle/BLEND):
        raise PipelineError(f'Changed or missing scene: {bundle/BLEND}')
    return doc,MASTER


def render(root, shard=None, threads=None):
    from blender_pipeline.worker import render as worker
    bundle=Path(root)/'bundle'
    plan,_=load_plan(bundle)
    for part in [shard] if shard else [s['id'] for s in plan['shards']]:
        worker(bundle,Path(root)/'frames',part,threads=threads or 4,manifest_loader=load_plan,
               blend_name=BLEND,persistent_data=True)
