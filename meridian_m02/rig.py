"""Editable two-link leg IK, pole controls, stance windows and mesh-derived grounding."""

from dataclasses import dataclass
from math import cos, floor, pi, sin, tau

import bpy
from mathutils import Vector

from blender_pipeline.manifest import PipelineError
from production.character import field_guide
from production.studio import collection, empty, rgb

SCALE = .88
PERIOD = .88
STANCE = .63
SPEED = .91
ANKLE = .105
START = (-.21,1.50)


@dataclass
class Walker:
    rig: object
    skin: object
    feet: dict
    poles: dict
    sole: dict
    deck: object

    @property
    def floor_z(self):
        return max((self.deck.matrix_world @ Vector(p)).z for p in self.deck.bound_box)


def phase(t, side):
    elapsed = t/PERIOD + (.0 if side=='L' else .5)
    return floor(elapsed), elapsed%1.


def pose_foot(t, side):
    cycle,u = phase(t,side)
    shift = 0. if side=='L' else .5
    y = START[1] - SPEED*PERIOD*(cycle-shift+STANCE*.5)
    if u < STANCE:
        return y, 0., True
    s = (u-STANCE)/(1-STANCE)
    return y - SPEED*PERIOD*(s*s*(3-2*s)), .125*sin(pi*s)**1.26, False


def animate(walker, frames, fps, foot_plane):
    rig, feet, poles = walker.rig,walker.feet,walker.poles
    rig['m02_foot_plane']=foot_plane
    for f in range(1,frames+1):
        t = (f-1)/fps
        swing = tau*t/PERIOD
        y = START[1] - SPEED*t
        rig.location = (START[0]+.022*sin(swing),y,foot_plane-.089 + .013*cos(2*swing))
        rig.keyframe_insert(data_path='location',frame=f)
        for side,sign in (('L',1),('R',-1)):
            x = START[0]+sign*.119
            pos,h,_ = pose_foot(t,side)
            target = feet[side]
            target.location=(x,pos,foot_plane+walker.sole[side]+h)
            target.keyframe_insert(data_path='location',frame=f)
            pole = poles[side]
            pole.location=(x,y-1.15,foot_plane+.52)
            pole.keyframe_insert(data_path='location',frame=f)
            u = swing if side=='L' else swing+pi
            for bone,angle in ((f'upperarm.{side}',.37*cos(u)), (f'forearm.{side}',.28+.08*sin(u))):
                rig.pose.bones[bone].rotation_euler=(angle,0,0)
                rig.pose.bones[bone].keyframe_insert(data_path='rotation_euler',frame=f)
        rig.pose.bones['spine'].rotation_euler=(.045,.06*sin(swing),.055*cos(swing))
        rig.pose.bones['spine'].keyframe_insert(data_path='rotation_euler',frame=f)
        rig.pose.bones['head'].rotation_euler=(0,.10*cos(swing*.43),0)
        rig.pose.bones['head'].keyframe_insert(data_path='rotation_euler',frame=f)
    rig.animation_data.action.name='Survey walk • authored pelvis & counter-swing'


def build_walker(deck,frames,fps,offset=0.):
    rig,skin = field_guide()
    rig.name='Surveyor • editable foot IK'; rig.scale=(SCALE,)*3
    rig.data.name='Surveyor skeleton • IK legs, FK torso'
    skin.name='Surveyor • armature-weighted weather suit'
    skin.modifiers[0].name='Skin • weighted survey suit'
    for material,col in (
        ('Guide • ivory technical textile','E6E3C4'),('Guide • rust shoulder panels','AECF81'),
        ('Guide • slate gloves and boots','1D4043'),('Guide • safety band','ECD897')):
        mat = bpy.data.materials.get(material)
        if mat:
            bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
            mat.diffuse_color=(*rgb(col),1.); bsdf.inputs['Base Color'].default_value=mat.diffuse_color
            bsdf.inputs['Emission Color'].default_value=mat.diffuse_color
    ctrls = collection('05 • Gait / edit these world targets')
    feet,poles,sole = {},{},{}
    for side in ('L','R'):
        name=f'boot.{side}'
        group=skin.vertex_groups[name].index
        min_z=min(v.co.z for v in skin.data.vertices if any(g.group==group for g in v.groups))
        sole[side]=(ANKLE-min_z)*SCALE+.006
        feet[side]=empty(ctrls,'Gait foot '+side); feet[side].empty_display_type='CIRCLE'; feet[side].empty_display_size=.18
        feet[side].rotation_mode='QUATERNION'
        feet[side].rotation_quaternion=rig.data.bones[name].matrix_local.to_quaternion()
        poles[side]=empty(ctrls,'Gait knee '+side); poles[side].empty_display_size=.14
        ik=rig.pose.bones[f'shin.{side}'].constraints.new('IK')
        ik.name='Two-bone planted-foot IK'
        ik.target=feet[side]; ik.pole_target=poles[side]; ik.chain_count=2; ik.use_stretch=False; ik.iterations=64
        level=rig.pose.bones[name].constraints.new('COPY_ROTATION')
        level.name='Sole level • world orientation'; level.owner_space=level.target_space='WORLD'; level.target=feet[side]
    bpy.context.view_layer.update()
    walker=Walker(rig,skin,feet,poles,sole,deck)
    animate(walker,frames,fps,walker.floor_z+offset)
    # Derive pole alignment from the evaluated rig. Select the plane that bends the knee toward forward (-Y).
    scene=bpy.context.scene
    scene.frame_set(1)
    for side in feet:
        ik=rig.pose.bones[f'shin.{side}'].constraints[0]
        best=(1e9,0.)
        for i in range(24):
            a = -pi + tau*i/24
            ik.pole_angle=a; bpy.context.view_layer.update()
            e=rig.evaluated_get(bpy.context.evaluated_depsgraph_get())
            thigh=e.pose.bones[f'thigh.{side}']; shin=e.pose.bones[f'shin.{side}']
            offset_k=e.matrix_world @ shin.head - (e.matrix_world @ thigh.head + e.matrix_world @ shin.tail)/2
            rank=offset_k.y+.45*abs(offset_k.x)
            if rank<best[0]: best=(rank,a)
        ik.pole_angle=best[1]
    scene.frame_set(1)
    return walker


def attach_objects(scene):
    rig=scene.objects.get('Surveyor • editable foot IK')
    if rig is None:
        return None
    skin=scene.objects['Surveyor • armature-weighted weather suit']
    feet={s:scene.objects['Gait foot '+s] for s in ('L','R')}
    poles={s:scene.objects['Gait knee '+s] for s in ('L','R')}
    sole={}
    for side in feet:
        group=skin.vertex_groups[f'boot.{side}'].index
        sole[side]=(ANKLE-min(v.co.z for v in skin.data.vertices if any(g.group==group for g in v.groups)))*SCALE+.006
    return Walker(rig,skin,feet,poles,sole,scene.objects['Walkable floor • survey path'])


def audit(scene,walker,frames,fps):
    bound={s:[v.index for v in walker.skin.data.vertices
             if any(g.group==walker.skin.vertex_groups[f'boot.{s}'].index for g in v.groups)] for s in walker.feet}
    floor_z=walker.floor_z
    planted={}; error=[]; clearance=[]; swing=[]; rest=[]
    for frame in range(1,frames+1):
        scene.frame_set(frame)
        graph=bpy.context.evaluated_depsgraph_get()
        rig=walker.rig.evaluated_get(graph); mesh=walker.skin.evaluated_get(graph)
        rest.append(rig.matrix_world.translation.copy())
        for side, foot in walker.feet.items():
            target=foot.matrix_world.translation.copy()
            ankle=rig.matrix_world @ rig.pose.bones[f'shin.{side}'].tail
            error.append((ankle-target).length)
            t=(frame-1)/fps; _,_,is_stance=pose_foot(t,side)
            sole_z=min((mesh.matrix_world @ mesh.data.vertices[i].co).z for i in bound[side])-floor_z
            if is_stance:
                planted.setdefault((side,phase(t,side)[0]),[]).append(ankle.xy.copy())
                clearance.append(sole_z)
            else:
                swing.append(sole_z)
    drift=max((max((p-group[0]).length for p in group) for group in planted.values()),default=0.)
    out={'bones':len(walker.rig.data.bones),'skin_vertices':len(walker.skin.data.vertices),
         'ik_chains':sum(c.type=='IK' for b in walker.rig.pose.bones for c in b.constraints),
         'floor_height':round(floor_z,5),'stance_samples':len(clearance),
         'stance_sole_z_range':[round(min(clearance),5),round(max(clearance),5)],
         'stance_xy_drift_max':round(drift,5),'ik_target_error_max':round(max(error),5),
         'swing_sole_z_max':round(max(swing),5),'root_travel':round((rest[-1]-rest[0]).length,5)}
    scene.frame_set(1)
    return out


def validate(report):
    lo,hi=report['stance_sole_z_range']
    if (report['ik_chains'] != 2 or report['ik_target_error_max'] > .04 or report['stance_xy_drift_max'] > .04
        or lo < -.024 or hi > .035 or report['swing_sole_z_max'] < .085 or report['root_travel'] < 1.):
        raise PipelineError(f'IK/ground contact outside tolerance: {report}')
