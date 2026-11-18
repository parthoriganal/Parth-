"""Controlled comparisons from the reopened project, never written into its .blend files."""

import json
import shutil

import bpy
from mathutils import Vector

from blender_pipeline.manifest import PipelineError, digest, write_json
from blender_pipeline.media import frame_stats
from production.edl import blend_path
from production.studio import collection
from .look import illuminate
from .preflight import probe, repair_exposure
from .quality import pixel_delta
from .rig import animate, attach_objects, audit, validate
from .storyboard import require

# Dedicated inspection cameras. The storyboard camera remains the delivered edit.
VIEWS = {
    'tidal': ((.40,-6.9,3.32),(-1.58,.075,1.43),54),
    'glasshouse': ((-1.93,-4.72,2.08),(-2.46,.35,2.28),61),
    'alpine': ((4.25,-4.83,2.95),(1.27,.52,1.64),51),
}


def open_scene(root, shot, doc):
    path = blend_path(root, shot['id'])
    require(digest(path) == doc['scene_sha256'][shot['id']], 'Saved detail input changed')
    require(bpy.ops.wm.open_mainfile(filepath=str(path.resolve()), load_ui=False, use_scripts=False)=={'FINISHED'},
            'Could not reopen saved detail input')
    return bpy.context.scene


def camera(scene, pose):
    at, target, lens = pose
    data=bpy.data.cameras.new('Temporary fixed diagnostic optics')
    data.lens=lens
    cam=bpy.data.objects.new('Temporary fixed diagnostic view',data)
    scene.collection.objects.link(cam)
    cam.location=at
    cam.rotation_euler=(Vector(target)-Vector(at)).to_track_quat('-Z','Y').to_euler()
    scene.camera=cam


def pair(out, first, second, minimum, crop=(100,45,380,235)):
    a, b=out/first['png'], out/second['png']
    delta=pixel_delta(a,b,crop)
    require(delta>=minimum, f'Diagnostic difference not visible between {a.name} and {b.name}: {delta}')
    return {'a':first,'b':second,'luma_delta':round(delta,5),'crop_px':list(crop)}


def prop(root,shot,doc,kind,out):
    scene=open_scene(root,shot,doc)
    camera(scene,VIEWS[kind])
    # Evaluate the prop separately from the camera. Only this image pair uses a static view.
    bounds=json.loads(scene['m02_focus'])
    a=probe(scene,bounds,out/'prop-start.png',1)
    b=probe(scene,bounds,out/'prop-end.png',shot['frames'])
    return pair(out,a,b,.009)


def look_comparison(root,shot,doc,out):
    scene=open_scene(root,shot,doc)
    camera(scene,VIEWS['tidal'])
    bounds=json.loads(scene['m02_focus'])
    f=1+shot['frames']//2
    a=probe(scene,bounds,out/'layered-materials.png',f)
    for mat in bpy.data.materials:
        if not mat.node_tree:
            continue
        tree=mat.node_tree
        for node in tree.nodes:
            if node.type!='BSDF_PRINCIPLED':
                continue
            for name in ('Roughness','Normal','Coat Normal'):
                for link in list(node.inputs[name].links):
                    tree.links.remove(link)
            for name in ('Coat Weight','Anisotropic'):
                node.inputs[name].default_value=0
    flat=probe(scene,bounds,out/'constant-roughness-uncoated.png',f)
    scene=open_scene(root,shot,doc)
    camera(scene,VIEWS['tidal'])
    for obj in list(scene.objects):
        if obj.type=='LIGHT':
            bpy.data.objects.remove(obj,do_unlink=True)
    other='polar' if shot['take']['light']!='polar' else 'amber'
    illuminate(scene,collection('Temporary alternative sun/sky'),other)
    alternate=probe(scene,bounds,out/'alternate-sun-sky.png',f)
    return {'layers_vs_bypassed':pair(out,a,flat,.008),'lighting_recipe_vs_alternate':pair(out,a,alternate,.013),
            'lighting_recipes':[shot['take']['light'],other]}


def contact_comparison(root,shot,doc,out):
    scene=open_scene(root,shot,doc)
    fps=scene.render.fps; n=shot['frames']; f=1+round(1.14*fps)
    camera(scene,((.86,-4.20,1.17),(-.25,.43,1.05),43))
    bounds=[[-.57,.05,.26],[.19,.78,1.96]]
    walker=attach_objects(scene)
    animate(walker,n,fps,walker.floor_z+.31)
    before=audit(scene,walker,n,fps)
    require(before['stance_sole_z_range'][0]>.30,'Injected foot clearance missing')
    floating=probe(scene,bounds,out/'walker-floating.png',f)
    animate(walker,n,fps,walker.floor_z)
    after=audit(scene,walker,n,fps); validate(after)
    grounded=probe(scene,bounds,out/'walker-contact.png',f)
    return {'pixels':pair(out,floating,grounded,.012),'rig_before':before,'rig_after':after}


def pixel_failures(root,shot,doc,out):
    scene=open_scene(root,shot,doc)
    focus=json.loads(scene['m02_focus']); f=1+shot['frames']//2
    scene.view_settings.exposure=3.55
    a=probe(scene,focus,out/'bright-before.png',f)
    require('overexposed' in a['image_issues'],'Overexposure fault did not trigger')
    after, repair=repair_exposure(scene,focus,out,f,a)
    shutil.copyfile(out/after['png'],out/'bright-after.png')
    after['png']='bright-after.png'
    # This valid Cycles render is black, not absent/truncated. It must be rejected, not brightened into a pass.
    for obj in scene.objects:
        if obj.type not in {'CAMERA','EMPTY'}:
            obj.hide_render=True
    scene.world.node_tree.nodes.get('Background').inputs[1].default_value=0
    bad=probe(scene,focus,out/'unlit.png',f)
    require('low_detail_or_blank' in bad['image_issues'],'Black frame escaped M/02 inspection')
    try:
        frame_stats(out/'unlit.png',(480,270))
    except PipelineError as exc:
        rejected=str(exc)
    else:
        raise PipelineError('Black frame escaped shared plate validator')
    return {'overexposure':{'comparison':pair(out,a,after,.03),'repair':repair},
            'unlit':{'probe':bad,'plate_rejection':rejected,'action':'reject, no automatic repair'}}


def run(root,doc):
    out=root/'details'
    out.mkdir(exist_ok=True)
    reports=[]
    tested=set()
    for shot in doc['shots']:
        kind=doc['sets'][shot['take']['set']]['kind']
        if kind in tested:
            continue
        tested.add(kind)
        folder=out/shot['id']; folder.mkdir(exist_ok=True)
        row={'shot':shot['id'],'template':kind,'locked_prop':prop(root,shot,doc,kind,folder)}
        if kind=='tidal':
            row['look']=look_comparison(root,shot,doc,folder)
        elif kind=='glasshouse':
            row['contact']=contact_comparison(root,shot,doc,folder)
        elif kind=='alpine':
            row['pixel_defects']=pixel_failures(root,shot,doc,folder)
        reports.append(row)
        print(f'M/02 diagnostics: {shot["id"]} passed rendered comparisons.',flush=True)
    write_json(out/'detail-qa.json',{'project_id':doc['project_id'],'status':'pass','shots':reports})
