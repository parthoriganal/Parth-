"""CPU mannequin factory: skinned bones plus an editable procedural FK walk."""

from math import cos, pi, sin, tau

import bpy
from mathutils import Vector

from .studio import collection, material, mesh


def _suit_skin(group, rig, segments):
    verts, faces, face_mats, bindings = [], [], [], {}
    palette = list(dict.fromkeys(piece[4] for piece in segments))
    for bone, center, scale, direction, mat in segments:
        first = len(verts)
        center, direction = Vector(center), Vector(direction)
        rot = direction.to_track_quat('Z', 'Y')
        nx, ny, nz = scale
        n, rows = 16, 9
        for row in range(1, rows):
            phi = pi * row / rows
            for j in range(n):
                a = tau * j / n
                verts.append(center + rot @ Vector((nx * sin(phi) * cos(a), ny * sin(phi) * sin(a), nz * cos(phi))))
        for row in range(rows - 2):
            for j in range(n):
                a, b = first + row * n + j, first + row * n + (j + 1) % n
                faces.append((a, a + n, b + n, b))
        north, south = len(verts), len(verts) + 1
        verts.extend((center + rot @ Vector((0, 0, nz)), center + rot @ Vector((0, 0, -nz))))
        last = first + (rows - 2) * n
        for j in range(n):
            faces.extend(((north, first + j, first + (j + 1) % n), (south, last + (j + 1) % n, last + j)))
        face_mats.extend([palette.index(mat)] * ((rows - 2) * n + 2 * n))
        bindings.setdefault(bone, []).extend(range(first, len(verts)))
    suit = mesh(group, 'Field guide • weighted suit mesh', verts, faces, palette, face_mats, smooth=True)
    for bone, indices in bindings.items():
        suit.vertex_groups.new(name=bone).add(indices, 1.0, 'REPLACE')
    suit.modifiers.new('Skin • FK guide', 'ARMATURE').object = rig
    suit.parent = rig
    return suit


def field_guide():
    group = collection('04 • Field guide / character rig')
    skeleton = bpy.data.armatures.new('Guide skeleton • FK')
    rig = bpy.data.objects.new('Field guide • FK rig', skeleton)
    group.objects.link(rig)
    rig.show_in_front = True
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    definitions = [
        ('pelvis', (0, 0, .94), (0, 0, 1.10), None),
        ('spine', (0, 0, 1.10), (0, 0, 1.44), 'pelvis'),
        ('head', (0, 0, 1.44), (0, 0, 1.69), 'spine'),
    ]
    for side, s in (('L', 1), ('R', -1)):
        h, k, a = (s * .113, 0, .97), (s * .113, -.025, .54), (s * .116, .012, .105)
        shoulder, elbow, wrist = (s * .212, 0, 1.37), (s * .257, 0, 1.12), (s * .274, -.029, .91)
        definitions += [(f'thigh.{side}', h, k, 'pelvis'), (f'shin.{side}', k, a, f'thigh.{side}'),
                        (f'boot.{side}', a, (s * .116, -.17, .075), f'shin.{side}'),
                        (f'upperarm.{side}', shoulder, elbow, 'spine'),
                        (f'forearm.{side}', elbow, wrist, f'upperarm.{side}')]
    bpy.ops.object.mode_set(mode='EDIT')
    for name, head, tail, parent in definitions:
        bone = skeleton.edit_bones.new(name)
        bone.head, bone.tail = head, tail
        if parent:
            bone.parent = skeleton.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for bone in rig.pose.bones:
        bone.rotation_mode = 'XYZ'
    suit_mat = material('Guide • ivory technical textile', 'D0BC98', .8, grit=.012)
    shell = material('Guide • rust shoulder panels', 'B45B3C', .57, grit=.012)
    black = material('Guide • slate gloves and boots', '203D45', .51)
    visor = material('Guide • petrol face shield', '1D343B', .21, .6)
    reflective = material('Guide • safety band', 'F4BE79', .45, glow=.36)
    z = (0, 0, 1)
    pieces = [('pelvis', (0, .014, 1.012), (.182, .109, .14), z, black),
              ('spine', (0, .011, 1.26), (.211, .135, .242), z, suit_mat),
              ('spine', (0, .129, 1.251), (.161, .102, .172), z, shell),
              ('head', (0, -.003, 1.572), (.137, .135, .161), z, suit_mat),
              ('head', (0, -.098, 1.576), (.125, .067, .086), z, visor),
              ('head', (0, -.145, 1.600), (.095, .018, .015), z, reflective)]
    for name, h, t, _ in definitions[3:]:
        a, b = Vector(h), Vector(t)
        width = .086 if name.startswith('thigh') else .072 if name.startswith('shin') else .061
        mat = (black if name.startswith(('shin', 'boot')) else shell if name.startswith('upperarm') else suit_mat)
        pieces.append((name, a.lerp(b, .49), (width, width * .93, (b - a).length * .61), b - a, mat))
        if name.startswith('forearm'):
            pieces.append((name, b, (.048, .048, .063), b - a, black))
    return rig, _suit_skin(group, rig, pieces)


def fk_walk(rig, frames, fps, *, start=(.75, .70, .36), travel=2.05, period=.94):
    """Author forward travel and counter-swing as Blender action keys (not mocap/IK)."""
    for f in sorted(set(range(1, frames + 1, 2)) | {frames}):
        t = (f - 1) / fps
        phase = tau * t / period
        u = (f - 1) / max(1, frames - 1)
        rig.location = (start[0], start[1] - u * travel, start[2] + .021 * (1 - cos(phase * 2)))
        rig.keyframe_insert(data_path='location', frame=f)
        rig.pose.bones['spine'].rotation_euler = (.075, .08 * cos(phase), .042 * sin(phase))
        rig.pose.bones['head'].rotation_euler.y = -.047 * cos(phase)
        for side, offset in (('L', 0), ('R', pi)):
            p = phase + offset
            pose = {f'thigh.{side}': -.47 * cos(p), f'shin.{side}': .10 + .56 * max(0, sin(p)),
                    f'boot.{side}': -.13 * max(0, sin(p)), f'upperarm.{side}': .40 * cos(p),
                    f'forearm.{side}': .23 + .12 * cos(p)}
            for bone, x in pose.items():
                rig.pose.bones[bone].rotation_euler.x = x
        for bone in rig.pose.bones:
            bone.keyframe_insert(data_path='rotation_euler', frame=f)
    if rig.animation_data and rig.animation_data.action:
        rig.animation_data.action.name = 'Field pace • editable FK walk'
