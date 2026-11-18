"""Small reusable data-API primitives, PBR recipes and camera/lighting presets."""

from math import cos, pi, sin, tau

import bpy
from mathutils import Vector

from .edl import FONT_ROOT


def rgb(value):
    s = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in s)


def collection(name):
    group = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(group)
    return group


def mesh(group, name, verts, faces, materials=(), face_materials=None, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    for mat in materials:
        data.materials.append(mat)
    for i, poly in enumerate(data.polygons):
        if face_materials is not None:
            poly.material_index = face_materials[i]
        poly.use_smooth = smooth
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    return obj


def bevel(obj, width):
    if width:
        mod = obj.modifiers.new('Radius • editable', 'BEVEL')
        mod.width, mod.segments = width, 3
        mod.harden_normals = True
        obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return obj


def box(group, name, location, size, mat, radius=0, yaw=0):
    x, y, z = [v / 2 for v in size]
    vertices = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
                (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    obj = mesh(group, name, vertices, [(3, 2, 1, 0), (0, 1, 5, 4), (1, 2, 6, 5),
                                      (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)], [mat])
    obj.location = location
    obj.rotation_euler.z = yaw
    return bevel(obj, radius)


def lathe(group, name, location, section, materials, bands=None, sides=72):
    points = [(r * cos(tau * j / sides), r * sin(tau * j / sides), z) for r, z in section for j in range(sides)]
    faces, indices = [], []
    for k in range(len(section) - 1):
        for j in range(sides):
            a, b = k * sides + j, k * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))
            indices.append(bands[k] if bands else 0)
    faces.extend((tuple(reversed(range(sides))), tuple(range(len(points) - sides, len(points)))))
    indices.extend((indices[0], indices[-1]))
    obj = mesh(group, name, points, faces, materials, indices, smooth=True)
    obj.location = location
    for face in obj.data.polygons[-2:]:
        face.use_smooth = False
    return obj


def curve(group, name, coords, width, mat, closed=False):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions, data.bevel_depth, data.bevel_resolution = '3D', width, 2
    spline = data.splines.new('POLY')
    spline.points.add(len(coords) - 1)
    for point, item in zip(spline.points, coords):
        point.co = (*item, 1)
    spline.use_cyclic_u = closed
    data.materials.append(mat)
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    return obj


def ring(group, name, position, radius, width, mat, sides=96):
    x, y, z = position
    return curve(group, name, [(x + radius * cos(tau * i / sides), y + radius * sin(tau * i / sides), z)
                                for i in range(sides)], width, mat, closed=True)


def empty(group, name, at=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    group.objects.link(obj)
    obj.location = at
    return obj


def material(name, hex_color, roughness=.45, metal=0, *, grit=0, glow=0, anisotropy=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*rgb(hex_color), 1)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    for socket, value in {'Base Color':mat.diffuse_color, 'Roughness':roughness, 'Metallic':metal,
                          'Anisotropic':anisotropy}.items():
        bsdf.inputs[socket].default_value = value
    if glow:
        bsdf.inputs['Emission Color'].default_value = mat.diffuse_color
        bsdf.inputs['Emission Strength'].default_value = glow
    if grit:
        noise = nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value, noise.inputs['Detail'].default_value = 46, 2
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value, bump.inputs['Distance'].default_value = .24, grit
        links.new(noise.outputs['Fac'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def label(group, name, body, location, size, mat, *, vertical=True):
    path = FONT_ROOT / 'JetBrainsMono-Bold.ttf'
    font = bpy.data.fonts.load(str(path), check_existing=True)
    if not font.packed_file:
        font.pack()
    data = bpy.data.curves.new(name, 'FONT')
    data.body, data.font, data.size = body, font, size
    data.align_x, data.space_character = 'CENTER', 1.09
    data.materials.append(mat)
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    obj.location = location
    if vertical:
        obj.rotation_euler.x = pi / 2
    return obj


def area(group, name, at, target, energy, size, color, *, height=None):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.size, data.color = energy, size, color
    if height:
        data.shape, data.size_y = 'RECTANGLE', height
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    obj.location = at
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    return obj


def camera_move(scene, group, frames, poses, *, aperture=None):
    """Pose tuples are (normalized time, position, look-at, focal length in mm)."""
    data = bpy.data.cameras.new('Camera • editorial keyframes')
    data.clip_end = 200
    cam = bpy.data.objects.new(data.name, data)
    group.objects.link(cam)
    target = empty(group, 'Focus target • editable')
    cam.rotation_mode = 'QUATERNION'
    scene.camera = cam
    if aperture is not None:
        data.dof.use_dof, data.dof.aperture_fstop, data.dof.focus_object = True, aperture, target
    for t, position, aim, lens in poses:
        frame = 1 + round(t * (frames - 1))
        cam.location, target.location, data.lens = position, aim, lens
        cam.rotation_quaternion = (Vector(aim) - Vector(position)).to_track_quat('-Z', 'Y')
        for prop in ('location', 'rotation_quaternion'):
            cam.keyframe_insert(data_path=prop, frame=frame)
        data.keyframe_insert(data_path='lens', frame=frame)
        target.keyframe_insert(data_path='location', frame=frame)
    scene.frame_set(1)
    return cam


def configure(scene, plan, frames, *, exposure=0):
    scene.unit_settings.system = 'METRIC'
    scene.frame_start, scene.frame_end = 1, frames
    r, c = scene.render, scene.cycles
    r.engine = 'CYCLES'
    r.fps = plan['fps']
    r.resolution_x, r.resolution_y, r.resolution_percentage = plan['plate_width'], plan['plate_height'], 100
    r.image_settings.file_format, r.image_settings.color_mode = 'PNG', 'RGB'
    r.image_settings.compression = 25
    r.filepath = '//plates/frame-'
    c.device, c.samples, c.seed = 'CPU', plan['samples'], 17
    c.use_denoising, c.denoiser = True, 'OPENIMAGEDENOISE'
    c.use_adaptive_sampling, c.adaptive_threshold = True, .063
    c.max_bounces, c.diffuse_bounces, c.glossy_bounces = 4, 2, 2
    c.caustics_reflective = c.caustics_refractive = False
    c.use_auto_tile, c.tile_size = True, 768
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = exposure


def atmosphere(scene, color, strength):
    world = bpy.data.worlds.new('Ambient • studio base')
    world.use_nodes = True
    n = world.node_tree.nodes.get('Background')
    n.inputs['Color'].default_value = (color[0], color[1], color[2], 1)
    n.inputs['Strength'].default_value = strength
    scene.world = world
