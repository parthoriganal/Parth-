"""Native editable joints from anatomy landmarks; two-link IK and world gaze controls."""

from dataclasses import dataclass
from math import pi, tau

import bpy
from mathutils import Matrix, Quaternion, Vector

from production.studio import collection, empty

SIDES=('L','R')


@dataclass
class Controls:
    rig: object
    soles: dict
    knees: dict
    gaze: object
    merge: dict
    world_rest: dict
    hand_axes: dict


def frame_axes(direction, across):
    """Orthonormal frame: Y along the limb, Z toward the named reference vector."""
    y=Vector(direction).normalized()
    z=(Vector(across)-y*Vector(across).dot(y)).normalized()
    if z.length<.99:
        other=Vector((0,0,1)) if abs(y.z)<.9 else Vector((1,0,0))
        z=(other-y*other.dot(y)).normalized()
    return Matrix((y.cross(z),y,z)).transposed().to_quaternion()


def bone_group(data, key, palette):
    group=data.collections.new(key)
    for bone in data.bones:
        name=bone.name
        if (key=='01 • Torso, neck & head' and not name.endswith(('.L','.R')) and name.startswith(('root','spine','neck','head','jaw'))) or (
            key=='02 • Shoulders, arms & palms' and name.startswith(('clavicle','shoulder','upperarm','lowerarm','wrist'))) or (
            key=='03 • Fingers' and name.startswith(('finger','metacarpal'))) or (
            key=='04 • Legs & footwear' and name.startswith(('pelvis','upperleg','lowerleg','foot','toe'))) or (
            key=='05 • Face & eyes' and name.startswith(('eye','special','oculi','oris','temporal','risorius','orbicularis','levator','tongue','breast'))):
            group.assign(bone); bone.color.palette=palette
    return group


def build_rig(model):
    grp=collection('02 • Rig / Arun •  native pose and joint curves')
    data=bpy.data.armatures.new('Arun • skin, phalanges and face joints')
    rig=bpy.data.objects.new('Arun | animation controls',data);grp.objects.link(rig)
    data.display_type='STICK'; rig.show_in_front=True
    bpy.context.view_layer.objects.active=rig; rig.select_set(True)
    spec=model.skeleton['bones']; points=model.joints
    remap={f'{segment}02.{side}':f'{segment}01.{side}' for segment in ('upperleg','lowerleg','upperarm','lowerarm') for side in SIDES}
    bpy.ops.object.mode_set(mode='EDIT')
    for name,item in spec.items():
        if name in remap:
            continue
        b=data.edit_bones.new(name)
        b.head=points[item['head']]; b.tail=points[item['tail']]
        if name.startswith(('upperleg01','lowerleg01','upperarm01','lowerarm01')):
            b.tail=points[name.replace('01.','02.')+'____tail']
        if b.length<.002:
            b.tail=b.head+Vector((0,0,.008))
        roll=model.skeleton['planes'].get(item['rotation_plane'])
        if roll and len(roll)==3:
            q, r, s=(Vector(points[k]) for k in roll)
            direction=(r-q).cross(s-r)
            if direction.length>.000001:
                b.align_roll(direction)
    for name,item in spec.items():
        if name in remap or not item['parent']:
            continue
        node=data.edit_bones[name]; node.parent=data.edit_bones[remap.get(item['parent'],item['parent'])]
        node.use_connect=(node.parent.tail-node.head).length<.0001
        node.inherit_scale='FIX_SHEAR'
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in rig.pose.bones:
        p.rotation_mode='QUATERNION'
    for name,palette in (('01 • Torso, neck & head','THEME04'),('02 • Shoulders, arms & palms','THEME03'),('03 • Fingers','THEME05'),
                         ('04 • Legs & footwear','THEME09'),('05 • Face & eyes','THEME02')):
        group=bone_group(data,name,palette)
        if name.startswith(('03','05')):
            group.is_visible=False  # toggle in the native Bone Collections panel
    control_coll=collection('01 • Edit here / feet, knee poles, gaze')
    soles={}; knees={}; frames={}; axes={}
    for side in SIDES:
        foot=rig.pose.bones['foot.'+side]
        shin=rig.pose.bones['lowerleg01.'+side]
        f=empty(control_coll,'CTRL • shoe roll + plant '+side,foot.head)
        f.empty_display_type='CUBE'; f.empty_display_size=.075; f.rotation_mode='QUATERNION'
        f.rotation_quaternion=foot.bone.matrix_local.to_quaternion()
        q=empty(control_coll,'CTRL • knee direction '+side,shin.head+Vector((0,-.65,0)))
        q.empty_display_type='SPHERE'; q.empty_display_size=.06
        ik=shin.constraints.new('IK'); ik.name='Two-link stance/swing • no stretch'
        ik.target=f; ik.pole_target=q; ik.chain_count=2; ik.iterations=80; ik.use_stretch=False
        copy=foot.constraints.new('COPY_ROTATION'); copy.name='Editable foot pitch in world space'; copy.target=f
        copy.owner_space=copy.target_space='WORLD'
        soles[side]=f;knees[side]=q
        hand=rig.data.bones['wrist.'+side]
        u=rig.data.bones['finger3-1.'+side].head_local-hand.head_local
        across=rig.data.bones['finger1-2.'+side].head_local-rig.data.bones['finger5-1.'+side].head_local
        n=u.cross(across).normalized()*(1 if side=='L' else -1)
        axes[side]=(u.normalized(),n)
        frames[side]=frame_axes(u,n)
    gaze=empty(control_coll,'CTRL • binocular look point',(0,-4.,1.65)); gaze.empty_display_type='CIRCLE'; gaze.empty_display_size=.12
    # Enable after geometry is created in the rest bind; additive meshes stay in bind space.
    for side in SIDES:
        eye=rig.pose.bones['eye.'+side]
        c=eye.constraints.new('DAMPED_TRACK');c.name='Conjugate binocular gaze';c.target=gaze;c.track_axis='TRACK_Y';c.influence=0.
    rig['character']='Arun • original identity, tailored cut and pose; CC0 base subset'
    rig['rig_use']='Root, spine & FK arms in Pose Mode; independent foot, knee and gaze controls in collection 01.'
    for foot in soles.values():
        foot['control_guide']='Translation + quaternion foot roll are keyed. Move the associated knee pole to edit the bend plane.'
    for side in SIDES:
        rig.pose.bones['lowerleg01.'+side].constraints[0].influence=0.
        rig.pose.bones['foot.'+side].constraints[0].influence=0.
    bpy.context.view_layer.update()
    return Controls(rig,soles,knees,gaze,remap,{b.name:b.matrix_local.to_quaternion() for b in data.bones},axes)


def turn_on(ctrl):
    for side in SIDES:
        for name in ('lowerleg01','foot','eye'):
            ctrl.rig.pose.bones[f'{name}.{side}'].constraints[0].influence=1.


def calibrate_knees(scene, ctrl):
    """Calibrate the pole angle in a loaded, grounded pose. Favor forward knee flexion."""
    scene.frame_set(1)
    rig=ctrl.rig
    for side in SIDES:
        c=rig.pose.bones['lowerleg01.'+side].constraints[0]
        def rank(angle):
            c.pole_angle=angle; bpy.context.view_layer.update()
            e=rig.evaluated_get(bpy.context.evaluated_depsgraph_get())
            hip=e.pose.bones['upperleg01.'+side].head
            knee=e.pose.bones['lowerleg01.'+side].head
            ankle=e.pose.bones['lowerleg01.'+side].tail
            line=(ankle-hip).normalized()
            ortho=knee-hip-line*(knee-hip).dot(line)
            return ortho.y+.58*abs(ortho.x)
        angles=[-pi+i*tau/40 for i in range(40)]
        best=min(angles,key=rank)
        fine=[(best-.11+.22*j/24+pi)%tau-pi for j in range(25)]
        c.pole_angle=min(fine,key=rank)
    scene.frame_set(1)


def supported(ctrl, side, angle, yaw):
    return Quaternion((0,0,1),yaw) @ Quaternion((1,0,0),angle)
