"""Render candidate images, apply bounded corrections, reopen and validate the editable set."""

from contextlib import contextmanager
from itertools import product
from math import log2
import json
import os
from pathlib import Path
import shutil

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

from blender_pipeline.authoring import blender_toolchain, check_runtime
from blender_pipeline.manifest import PipelineError, digest, write_json
from production.edl import blend_path
from production.studio import collection, configure, empty
from .look import illuminate
from .quality import issues, measure
from .rig import animate, attach_objects, audit as audit_rig, validate as validate_rig
from .sets import FACTORIES
from .storyboard import freeze, load_board, require

SAFE = .048
FAULT_LENS = 1.52
FAULTS = {'tidal':'fit_lens', 'glasshouse':'ground_ik', 'alpine':'correct_exposure'}


def camera_rig(scene, group, take, frames):
    data=bpy.data.cameras.new('Survey camera • animated focal length')
    data.lens=42; data.clip_start=.05; data.clip_end=300
    cam=bpy.data.objects.new('Survey camera • track + dolly',data); group.objects.link(cam)
    target=empty(group,'Camera look + focus target')
    target.empty_display_size=.34
    track=cam.constraints.new('TRACK_TO'); track.name='Tripod tracks keyed aim'; track.target=target
    track.track_axis='TRACK_NEGATIVE_Z';track.up_axis='UP_Y'
    if take['aperture']:
        data.dof.use_dof=True; data.dof.aperture_fstop=take['aperture']; data.dof.focus_object=target
    scene.camera=cam
    for t,pos,aim,_ in take['keys']:
        f=1+round(t*(frames-1))
        cam.location=pos; cam.keyframe_insert(data_path='location',frame=f)
        target.location=aim; target.keyframe_insert(data_path='location',frame=f)
    return cam


def lens_keys(scene,take,frames,mult):
    for t,_,_,focal in take['keys']:
        scene.camera.data.lens=focal*mult
        scene.camera.data.keyframe_insert(data_path='lens',frame=1+round(t*(frames-1)))
    scene.frame_set(1)


def corners(bounds):
    return list(product(*zip(*bounds)))


def fit_points(scene,focus):
    base=scene.objects['Chamfered graphite substrate']
    return corners(focus)+[tuple(base.matrix_world @ v.co) for v in base.data.vertices]


def projection(scene,points):
    cam=scene.camera.evaluated_get(bpy.context.evaluated_depsgraph_get())
    points=[world_to_camera_view(scene,cam,Vector(p)) for p in points]
    if any(p.z<=scene.camera.data.clip_start for p in points):
        raise PipelineError('Camera potential clipping plane intersects the authored hero box')
    return [min(p.x for p in points), min(p.y for p in points), max(p.x for p in points), max(p.y for p in points)]


def framing(scene,focus,frames):
    box=[]
    # All integer delivery frames—not just the three keys—since Bezier curves can overshoot.
    for f in range(1,frames+1):
        scene.frame_set(f)
        box.append(projection(scene,focus))
    return [min(b[0] for b in box),min(b[1] for b in box),max(b[2] for b in box),max(b[3] for b in box)]


def margin(box):
    return min(box[0],box[1],1-box[2],1-box[3])


@contextmanager
def probe_settings(scene):
    r,c=scene.render,scene.cycles
    before=(r.resolution_x,r.resolution_y,r.resolution_percentage,r.threads_mode,r.threads,c.samples,r.filepath)
    r.resolution_x,r.resolution_y,r.resolution_percentage,r.threads_mode,r.threads=480,270,100,'FIXED',2
    c.samples=7
    try:
        yield
    finally:
        r.resolution_x,r.resolution_y,r.resolution_percentage,r.threads_mode,r.threads,c.samples,r.filepath=before


def probe(scene,focus,path,frame):
    with probe_settings(scene):
        scene.frame_set(frame)
        bounds=projection(scene,corners(focus))
        scene.render.filepath=str(path.resolve())
        require(bpy.ops.render.render(write_still=True)=={'FINISHED'},f'No rendered inspection frame at {path}')
        stats=measure(path,bounds)
    return {'frame':frame,'png':path.name,'sha256':digest(path),'hero_box':[round(x,5) for x in bounds],
            'exposure_ev':round(scene.view_settings.exposure,4),'metrics':stats,'image_issues':issues(stats)}


def repair_exposure(scene, focus, out, frame, current):
    """At most three scene-referred EV steps, each followed by a Cycles re-render."""
    initial=current['exposure_ev']
    adjustments=[]
    exposure_samples=[]
    for i in range(3):
        p=current['metrics']
        if 'underexposed' in current['image_issues']:
            ev=max(.43,min(2.55,2.35*log2(.53/max(.055,p['p90']))))
        elif 'overexposed' in current['image_issues']:
            ev=-max(.43,min(2.2,2.2*log2(max(p['median'],.83)/.60)))
        else:
            break
        updated=max(-6.1,min(3.6,scene.view_settings.exposure+ev))
        require(abs(updated-scene.view_settings.exposure)>.001,'Exposure hit repair limits')
        adjustments.append({'from':round(scene.view_settings.exposure,4),'to':round(updated,4),
                            'trigger':current['image_issues']})
        scene.view_settings.exposure=updated
        current=probe(scene,focus,out/f'exposure-{i+1}.png',frame)
        exposure_samples.append(current)
    require(not current['image_issues'], f'Unresolved image defects: {current}')
    return current, ({'rule':'correct_exposure', 'before_ev':initial, 'steps':adjustments,
                      'renders':exposure_samples} if adjustments else None)



def correct(scene, result, shot, out, injected):
    n,fps=shot['frames'],scene.render.fps
    middle=1+n//2
    points=fit_points(scene,result.focus)
    before_box=framing(scene,points,n)
    start=probe(scene,result.focus,out/'before.png',middle)
    repairs=[]
    if margin(before_box)<SAFE:
        spread=max(abs(p-.5) for p in before_box)
        rel=(.5-SAFE-.006)/spread
        factor=(FAULT_LENS if injected=='fit_lens' else 1.)*rel
        lowest=min(k[3] for k in shot['take']['camera']['keys'])*factor
        require(rel>=.43 and lowest>=18,'Required framing change exceeds the safe lens adjustment budget')
        lens_keys(scene,shot['take']['camera'],n,factor)
        repairs.append({'rule':'fit_lens','relative_lens_multiplier':round(rel,5),
                        'before_margin':round(margin(before_box),5)})
    if result.walker:
        walker = result.walker
        before_rig = audit_rig(scene, walker, n, fps)
        deck = walker.floor_z
        old = walker.rig['m02_foot_plane']
        lo, hi = before_rig['stance_sole_z_range']
        if lo < -.024 or hi > .035:
            require(.014 < abs(old-deck) <= .5, 'Contact defect is not a repairable plane offset')
            animate(walker, n, fps, deck)
            after_rig = audit_rig(scene, walker, n, fps)
            validate_rig(after_rig)
            repairs.append({'rule':'ground_ik','previous_plane':round(old,5),'walk_mesh_top':round(deck,5),
                            'delta_z':round(deck-old,5),'before':before_rig,'after':after_rig})
    # If no geometric change occurred, use the real candidate for the first exposure decision.
    current=probe(scene,result.focus,out/'geometry-check.png',middle) if repairs else start
    current, exposure_repair = repair_exposure(scene, result.focus, out, middle, current)
    if exposure_repair:
        repairs.append(exposure_repair)
    after_box=framing(scene,points,n)
    require(margin(after_box)>=SAFE-.001,f"Camera fit did not converge ({shot['id']}): {after_box}")
    if injected:
        require(injected in {r['rule'] for r in repairs},f'Test fault did not exercise {injected}')
    shutil.copyfile(out/current['png'],out/'after.png')
    end_samples=[probe(scene,result.focus,out/'opening.png',1),probe(scene,result.focus,out/'closing.png',n)]
    for sample in end_samples:
        require(not sample['image_issues'],f"Unresolved endpoint defects ({shot['id']}): {sample}")
    scene['m02_fit_points']=json.dumps(points)
    return {'injected_rule':injected,'repairs':repairs,'candidate':start,
            'corrected':{**current,'png':'after.png'},'endpoints':end_samples,
            'min_margin_before':round(margin(before_box),5),'min_margin_after':round(margin(after_box),5),
            'analysis_bounds':[round(x,5) for x in framing(scene,corners(result.focus),n)]}


def authored(shot,spec,settings,inject):
    require(bpy.context.mode=='OBJECT','Factory must run in Object mode')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene
    scene.name='Weather Atlas / '+shot['marker']
    kind=spec['kind']; n=shot['frames']; fps=settings['fps']
    fault=FAULTS[kind] if inject else None
    # Default authored film is not degraded. Fault mode is explicitly a separate proof bundle.
    ev= -5.85 if fault=='correct_exposure' else shot['take']['exposure']
    configure(scene,settings,n,exposure=ev)
    scene.render.use_persistent_data=False
    scene.cycles.transmission_bounces=2
    scene.cycles.transparent_max_bounces=2
    scene.cycles.sample_clamp_indirect=2.5
    scene.cycles.use_light_tree=True
    scene.render.threads_mode='FIXED'; scene.render.threads=min(4,os.cpu_count() or 1)
    lights=collection('01 • Sun-sky and shaped lighting')
    look=illuminate(scene,lights,shot['take']['light'])
    result=FACTORIES[kind](spec,n,fps,.31 if fault=='ground_ik' else 0.)
    tracks=collection('06 • Editable sequence cameras')
    camera_rig(scene,tracks,shot['take']['camera'],n)
    lens_keys(scene,shot['take']['camera'],n,FAULT_LENS if fault=='fit_lens' else 1.)
    scene['m02_focus']=json.dumps(result.focus)
    scene['m02_mover']=result.mover.name
    scene['m02_set']=shot['take']['set'];scene['m02_board_shot']=shot['id']
    scene.frame_set(1)
    return scene,result,look,fault


def reopen_audit(path,shot,settings):
    require(bpy.ops.wm.open_mainfile(filepath=str(path.resolve()),load_ui=False,use_scripts=False)=={'FINISHED'},'Could not reopen Blender shot')
    scene=bpy.context.scene
    require(scene.render.engine=='CYCLES' and scene.cycles.device=='CPU','Saved shot is not Cycles CPU')
    require((scene.render.resolution_x,scene.render.resolution_y,scene.render.fps,scene.frame_end,scene.cycles.samples)==
            (settings['plate_width'],settings['plate_height'],settings['fps'],shot['frames'],settings['samples']),
            'Saved render format differs from board')
    require(not bpy.data.libraries and not any(f.filepath!='<builtin>' and not f.packed_file for f in bpy.data.fonts),
            'Saved file has missing or external fonts/library links')
    require(not any(i.source in {'FILE','TILED','SEQUENCE','MOVIE'} and not i.packed_file for i in bpy.data.images),
            'Saved scene uses external images')
    require(scene.camera and scene.camera.constraints and scene.camera.constraints[0].target is not None,
            'Saved camera lost its aim target')
    obj=scene.objects[scene['m02_mover']]
    positions=[]; rotations=[]; lenses=[]
    for f in (1,shot['frames']):
        scene.frame_set(f)
        positions.append(scene.camera.matrix_world.translation.copy())
        rotations.append(obj.matrix_world.to_quaternion().copy())
        lenses.append(scene.camera.data.lens)
    travel=(positions[0]-positions[1]).length
    angle=rotations[0].rotation_difference(rotations[1]).angle
    require(travel>.50 and angle>.22 and abs(lenses[0]-lenses[1])>.6,'Expected camera/subject movement is missing')
    out={'objects':len(scene.objects),'packed_fonts':sum(bool(f.packed_file) for f in bpy.data.fonts),
         'camera_travel':round(travel,4),'lens_mm':[round(x,3) for x in lenses],'object_rotation_rad':round(angle,4),
         'materials':len(bpy.data.materials),
         'layered_bump_materials':sum(any(n.type=='BUMP' for n in m.node_tree.nodes)
                                    for m in bpy.data.materials if m.node_tree),
         'proof_exposure':round(scene.view_settings.exposure,4)}
    saved_margin=margin(framing(scene,json.loads(scene['m02_fit_points']),shot['frames']))
    require(saved_margin>=SAFE-.001,'Saved camera framing violates margin')
    out['full_set_min_margin']=round(saved_margin,5)
    walker=attach_objects(scene)
    if walker:
        out['rig']=audit_rig(scene,walker,shot['frames'],settings['fps']); validate_rig(out['rig'])
    scene.frame_set(1)
    return out


def build(root, board_file, preset, prove_repairs=False):
    check_runtime(bpy)
    plan=load_board(board_file,preset)
    (root/'bundle').mkdir(parents=True,exist_ok=True)
    (root/'proof').mkdir(exist_ok=True)
    reports=[]
    for shot in plan['shots']:
        name=shot['id']; spec=plan['sets'][shot['take']['set']]
        out=root/'proof'/name; out.mkdir(exist_ok=True)
        scene,result,look,fault=authored(shot,spec,plan['settings'],prove_repairs)
        visual=correct(scene,result,shot,out,fault)
        report={'id':name,'set':spec,'procedural':result.stats,'look':look,'visual':visual}
        scene.render.filepath='//plates/frame-'
        scene.frame_set(1)
        for screen in bpy.data.screens:
            for view in screen.areas:
                if view.type=='VIEW_3D': view.spaces.active.region_3d.view_perspective='CAMERA'
        bpy.context.preferences.filepaths.save_version=0
        path=blend_path(root,name); temp=path.with_name('.'+path.name)
        try:
            require(bpy.ops.wm.save_as_mainfile(filepath=str(temp.resolve()),compress=True,relative_remap=False)=={'FINISHED'},'Save failed')
            report['scene']=reopen_audit(temp,shot,plan['settings'])
            temp.replace(path)
        finally:
            temp.unlink(missing_ok=True)
        write_json(out/'inspection.json',report)
        reports.append(report)
        print(f"M/02 {name}: save/reopen passed; repairs={[r['rule'] for r in visual['repairs']]}; p90={visual['corrected']['metrics']['p90']}",flush=True)
    local_board=root/'bundle/storyboard.json'
    if local_board.resolve() != board_file.resolve():
        shutil.copyfile(board_file,local_board)
    frozen=freeze(root,plan,local_board,bpy.app.build_hash.decode())
    write_json(root/'bundle/scene-qa.json',{'series':'M/02','project_id':frozen['project_id'],'status':'pass',
              'proof_only':prove_repairs,'toolchain':blender_toolchain(bpy),'shots':reports})
    print(f"M/02 {preset}: {len(reports)} checked editable sets, {plan['frames']} frames, {len(plan['shards'])} batches.",flush=True)
