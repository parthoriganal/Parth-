"""Loaded-scene audit: actual pose and mesh evaluation, not parameter-only assertions."""

from collections import defaultdict
from itertools import groupby
from math import degrees

import bpy
from bpy_extras.object_utils import world_to_camera_view
import numpy as np
from mathutils import Vector

from blender_pipeline.authoring import check
from .performance import foot_clock
from .project import MASTER
from .rig import SIDES

RIG='Arun | animation controls'
SKIN='Arun • face, neck and anatomical hands'
SCORES=(1,27,79,103,122,139,166,190,194,220,238,248,259,271,297,332,360)


def point_arrays(mesh):
    data=np.empty(len(mesh.vertices)*3,np.float32)
    mesh.vertices.foreach_get('co',data)
    return data.reshape(-1,3)


def evaluated_edges(scene,bpydata,rig):
    objects=[bpydata.objects[n] for n in (SKIN,'Tailored chore overshirt','Straight leg canvas trousers')]
    changes=[]
    metrics={}
    for ob in objects:
        rest=point_arrays(ob.data)
        edges=np.empty(len(ob.data.edges)*2,np.int32)
        ob.data.edges.foreach_get('vertices',edges); edges=edges.reshape(-1,2)
        length=np.linalg.norm(rest[edges[:,1]]-rest[edges[:,0]],axis=1)
        relevant=length>.00055
        ee=edges[relevant]
        center=rest[ee].mean(axis=1)
        lid=(ob.name==SKIN) & (abs(center[:,0])>.013) & (abs(center[:,0])<.060) & (center[:,1]<-.101) & (center[:,2]>1.621) & (center[:,2]<1.686)
        metrics[ob.name]=(ob,ee,length[relevant],lid,[],len(rest))
        totals=[]
        for v in ob.data.vertices:
            row=sum(item.weight for item in v.groups if ob.vertex_groups[item.group].name in rig.data.bones)
            totals.append(row)
        check(min(totals)>.998 and max(totals)<1.002,f'{ob.name} has missing or invalid joint weights')
        for mod in ob.modifiers:
            if mod.type!='ARMATURE':
                changes.append((mod,mod.show_viewport)); mod.show_viewport=False
    try:
        for frame in SCORES:
            scene.frame_set(frame); dg=bpy.context.evaluated_depsgraph_get()
            for ob,ee,length,lid,scores,count in metrics.values():
                shape=ob.evaluated_get(dg)
                mesh=shape.to_mesh()
                try:
                    xyz=point_arrays(mesh)
                    check(len(xyz)==count and np.isfinite(xyz).all(),f'{ob.name} invalid evaluated skin at {frame}')
                    measured=np.linalg.norm(xyz[ee[:,1]]-xyz[ee[:,0]],axis=1)
                    r=measured/length
                    scores.append([frame,*np.quantile(r,[.01,.99]),float(r[~lid].max()),
                                   float(r[lid].max()) if lid.any() else 0.,
                                   float(measured[lid & (r>3.65)].max(initial=0.0))])
                finally:
                    shape.to_mesh_clear()
    finally:
        for mod,val in changes:
            mod.show_viewport=val
    results={}
    for name,(_,_,_,_,rows,count) in metrics.items():
        low=min(rows,key=lambda a:a[1]); high=max(rows,key=lambda a:a[2]); maximum=max(rows,key=lambda a:a[3]);
        fabric_bound=1.76 if name=='Straight leg canvas trousers' else 1.72
        check(low[1]>.49 and high[2]<fabric_bound and maximum[3]<3.65,
              f'{name} local deformation extreme: {low}, {high}, {maximum}')
        lid_ratio=max(row[4] for row in rows); lid_length=max(row[5] for row in rows)
        check(lid_ratio<6.3 and lid_length<.0090,
              f'{name}: eyelid unfolding outside measured bound: {lid_ratio:.2f}×, {lid_length*1000:.2f} mm')
        results[name]={'base_vertices':count,'weighted_fraction':1.0,'min_edge_ratio_p01':round(float(low[1]),4),
                       'max_edge_ratio_p99':round(float(high[2]),4),'max_non_lid_edge_ratio':round(float(maximum[3]),4),
                       'max_non_lid_ratio_frame':int(maximum[0]),'eyelid_edge_max_ratio':round(lid_ratio,4),
                       'eyelid_max_length_above_3p65x_mm':round(lid_length*1000,4)}
    return results


def dotangle(a,b):
    return degrees(a.angle(b))


def inspect(scene, original):
    rig=bpy.data.objects[RIG]; skin=bpy.data.objects[SKIN]
    p=MASTER
    check(scene.render.engine=='CYCLES' and scene.cycles.device=='CPU', 'wrong render engine or device')
    check((scene.render.resolution_x,scene.render.resolution_y,scene.render.fps,scene.frame_end,scene.cycles.samples)==
          (p.width,p.height,p.fps,p.frames,p.samples), 'clock or raster changed')
    check(not bpy.data.libraries and all(img.source!='FILE' or img.packed_file for img in bpy.data.images),'unpacked image or library')
    check(all(f.filepath=='<builtin>' or f.packed_file for f in bpy.data.fonts), 'unpacked font')
    check(not any(t.use_module for t in bpy.data.texts), 'source must not require automatic Python execution')
    check(not any(o.animation_data and o.animation_data.drivers for o in scene.objects), 'procedural driver found')
    hand_names={f'finger{i}-{j}.{s}' for i in range(1,6) for j in range(1,4) for s in SIDES}
    check(all(n in rig.pose.bones for n in hand_names), 'finger chain incomplete')
    face=skin.data.shape_keys.key_blocks
    check(set(face.keys())=={'Basis','Blink.L','Blink.R','Smile','Brow.L','Brow.R'}, 'blink/face shape keys missing')
    check(rig.animation_data.action and skin.data.shape_keys.animation_data.action, 'native actions missing')
    points={s:[v.co.copy() for v in list(bpy.data.objects['Leather walking shoe '+s].data.vertices)[:48]] for s in SIDES}
    flat={s:[] for s in SIDES}; feet={s:[] for s in SIDES}; joint={s:defaultdict(list) for s in SIDES}
    closed={s:[] for s in SIDES}; roots=[]; camera=[]; head=[]; framing=[]; shoe_inset=[]; gaze=[]; headrots=[]
    for f in range(1,p.frames+1):
        scene.frame_set(f)
        bone=rig.evaluated_get(bpy.context.evaluated_depsgraph_get()).pose.bones
        t=(f-1)/p.fps
        cam=scene.camera; camera.append(cam.matrix_world.translation.copy())
        roots.append(bone['root'].head.copy()); headrots.append(bone['head'].matrix.to_quaternion())
        h=bone['head'].tail+.027*(bone['head'].tail-bone['head'].head).normalized(); head.append(h)
        frame_point=lambda v:world_to_camera_view(scene,cam,v)
        s=frame_point(h)
        framing.append(min(s.x,1-s.x,s.y,1-s.y))
        gaze.append((bone['eye.R'].tail-bone['eye.R'].head).normalized())
        for s in SIDES:
            mode=foot_clock(t,s)[3]
            pb=bone['foot.'+s]
            mat=pb.matrix@pb.bone.matrix_local.inverted()
            ring=[mat@v for v in points[s]]
            loc=min(v.z for v in ring)
            feet[s].append((f,mode,loc,ring))
            if mode!='swing':
                flat[s].append((f,mode,loc,ring))
            if f<=73:
                for pos in ring:
                    uv=frame_point(pos); shoe_inset.append(min(uv.x,1-uv.x,uv.y,1-uv.y))
            a,b,c=bone['upperleg01.'+s],bone['lowerleg01.'+s],bone['foot.'+s]
            u,v=bone['upperarm01.'+s],bone['lowerarm01.'+s]
            joint[s]['knee_flexion_deg'].append(dotangle(b.head-a.head,c.head-b.head))
            joint[s]['elbow_flexion_deg'].append(dotangle(u.tail-u.head,v.tail-v.head))
            joint[s]['wrist_z_m'].append(bone['wrist.'+s].head.z)
            joint[s]['ankle_control_error_mm'].append(1000*(b.tail-bpy.data.objects['CTRL • shoe roll + plant '+s].location).length)
            axis_x=(b.head-a.head).cross(c.head-b.head).x
            joint[s]['forward_knee_sign'].append(axis_x)
            if face[f'Blink.{s}'].value>.86:
                closed[s].append(f)
    low=min(row[2] for vals in feet.values() for row in vals)
    high=max(row[2] for vals in flat.values() for row in vals)
    drift={}; airborne=[]; roll_edge={}
    for s in SIDES:
        segments=[]; rolling=[]
        for k,items in groupby(enumerate(feet[s]),key=lambda a:a[1][1]):
            seq=[v for _,v in items]
            if k=='flat':
                first=seq[0][-1]
                segments.append(1000*max((a.xy-b.xy).length for _,_,_,row in seq for a,b in zip(first,row)))
            if k in ('toe_roll','heel_roll'):
                first=seq[0][-1]; j=min(range(len(first)),key=lambda i:first[i].z)
                rolling.append(1000*max((first[j].xy-row[j].xy).length for _,_,_,row in seq))
            if k=='swing':
                airborne.append(max(row[2] for row in seq))
        drift[s]=round(max(segments),4)
        roll_edge[s]=round(max(rolling),4)
    print('pose measurements:',{'ground_range_mm':[low*1000,high*1000],'drift_mm':drift,
          'roll_mm':roll_edge,'foot_inset':min(shoe_inset),'head_inset':min(framing),
          'wrist':{s:(min(joint[s]['wrist_z_m']),max(joint[s]['wrist_z_m'])) for s in SIDES},
          'ankle':{s:max(joint[s]['ankle_control_error_mm']) for s in SIDES}},flush=True)
    check(low>=-.003 and high<=.008,'sole contact missed its intended ground plane')
    check(max(drift.values())<3.5 and max(roll_edge.values())<5.0, 'planted feet moved in XY')
    check(len(airborne)==6 and min(airborne)>.085, 'six alternating lifted steps were not evaluated')
    check(all(max(joint[s]['ankle_control_error_mm'])<3.5 for s in SIDES), 'IK misses target')
    check(min(framing)>.025 and min(shoe_inset)>.025, 'opening shoe or head framing clipped')
    check(-2.474 < roots[-1].y-roots[0].y < -2.453, 'root travel or timing changed')
    check(all(max(vals['knee_flexion_deg'])<100 for vals in joint.values()),'hyper-flexed knee')
    check(all(min(vals['forward_knee_sign'])>-.003 for vals in joint.values()),'backward knee axis')
    check(all(max(vals['elbow_flexion_deg'])<126 for vals in joint.values()),'hyper-flexed elbow')
    check(all(len(frames)>=12 for frames in closed.values()), 'blink animation did not evaluate')
    right=joint['R']['wrist_z_m']; left=joint['L']['wrist_z_m']
    check(max(right[216:288])>1.454 and abs(right[0]-right[-1])<.055 and max(left)<1.05,'greeting gesture is missing or does not settle')
    check(dotangle(gaze[144],gaze[178])>12,'directed gaze shift missing')
    deform=evaluated_edges(scene,bpy.data,rig)
    scene.frame_set(1)
    return {'status':'pass',**original,'reopened_scene':True,'render_engine':'Cycles CPU',
            'packed_images':sum(bool(i.packed_file) for i in bpy.data.images), 'unpacked_asset_paths':0,
            'evaluated_pose_frames':p.frames,'weighted_mesh_checks':deform,'evaluated_mesh_sample_frames':list(SCORES),
            'finger_bones':len(hand_names),'face_shapes':list(face.keys())[1:], 'bone_collections': len(rig.data.collections),
            'camera_path_m':round(sum((a-b).length for a,b in zip(camera,camera[1:])),4),
            'opening_foot_screen_inset_pct':round(100*min(shoe_inset),3),'min_head_screen_inset_pct':round(100*min(framing),3),
            'travel_m':round(roots[0].y-roots[-1].y,4),'gaze_turn_deg':round(dotangle(gaze[144],gaze[178]),3),
            'head_max_frame_rotation_deg':round(max(min(degrees(a.rotation_difference(b).angle),360-degrees(a.rotation_difference(b).angle)) for a,b in zip(headrots,headrots[1:])),4),
            'grounded_sole_clearance_mm':[round(v*1000,4) for v in (min(row[2] for vals in flat.values() for row in vals),high)],
            'min_sole_clearance_any_frame_mm':round(low*1000,4),'flat_shoe_max_xy_drift_mm':drift,'rolling_support_max_xy_drift_mm':roll_edge,
            'apex_sole_clearance_mm':[round(v*1000,4) for v in sorted(airborne)],
            'joint_limits':{s:{k:[round(min(vals),4),round(max(vals),4)] for k,vals in v.items() if k!='forward_knee_sign'} for s,v in joint.items()},
            'near_closed_frames':closed}
