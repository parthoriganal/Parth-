"""Lantern Tide: a procedural coastal miniature for Blender 5 and Cycles."""

import argparse
import math
from pathlib import Path
import random
import sys

import bpy
from mathutils import Matrix, Vector

TAU = math.tau
SEA = 0.62
BASE_RADIUS = 4.85
COAST = Vector((-0.16, 0.23))
COAST_RX, COAST_RY = 3.06, 2.22
# Radius, elevation: ledges alternate with sloping courses below the turf.
STRATA = (
    (0.00, 1.69), (0.22, 1.68), (0.43, 1.66), (0.58, 1.58),
    (0.70, 1.49), (0.79, 1.38), (0.84, 1.34), (0.86, 1.18),
    (0.90, 1.15), (0.92, 0.99), (0.96, 0.94), (0.98, 0.79),
    (1.03, 0.74), (1.06, 0.58), (1.11, 0.52),
)
CAMERA = (10.0, -15.7, 12.9)


def rgb(hex_color):
    """Convert an sRGB art-direction swatch to Blender's scene-linear RGB."""
    srgb = (int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)


def surface(name, color, roughness=0.5, metal=0, *, flecks=None, emission=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb(color), 1)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = mat.diffuse_color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metal
    if flecks:
        light, scale, bump_distance = flecks
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = scale
        noise.inputs["Detail"].default_value = 2.7
        links.new(nodes.new("ShaderNodeTexCoord").outputs["Object"], noise.inputs["Vector"])
        ramp = nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = mat.diffuse_color
        ramp.color_ramp.elements[1].color = (*rgb(light), 1)
        links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
        links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.26
        bump.inputs["Distance"].default_value = bump_distance
        links.new(noise.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    if emission:
        bsdf.inputs["Emission Color"].default_value = mat.diffuse_color
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


def water_material():
    mat = surface("Resin tide • turquoise shallows, ink-blue depths", "22606D", 0.36, 0.08)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Specular IOR Level"].default_value = 0.27
    bsdf.inputs["Coat Weight"].default_value = 0.13
    bsdf.inputs["Coat Roughness"].default_value = 0.33
    coords = nodes.new("ShaderNodeTexCoord").outputs["Object"]
    offset = nodes.new("ShaderNodeVectorMath")
    offset.operation = "SUBTRACT"
    offset.inputs[1].default_value = (*COAST, 0)
    links.new(coords, offset.inputs[0])
    stretch = nodes.new("ShaderNodeVectorMath")
    stretch.operation = "MULTIPLY"
    stretch.inputs[1].default_value = (1 / COAST_RX, 1 / COAST_RY, 0)
    links.new(offset.outputs[0], stretch.inputs[0])
    distance = nodes.new("ShaderNodeVectorMath")
    distance.operation = "LENGTH"
    links.new(stretch.outputs[0], distance.inputs[0])
    remap = nodes.new("ShaderNodeMapRange")
    remap.inputs["From Min"].default_value = 0.88
    remap.inputs["From Max"].default_value = 2.06
    links.new(distance.outputs["Value"], remap.inputs["Value"])
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*rgb("44B6A5"), 1)
    ramp.color_ramp.elements.new(0.38).color = (*rgb("217B88"), 1)
    ramp.color_ramp.elements[2].color = (*rgb("154A60"), 1)
    links.new(remap.outputs[0], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    ripple = nodes.new("ShaderNodeTexWave")
    ripple.bands_direction = "DIAGONAL"
    ripple.inputs["Scale"].default_value = 1.75
    ripple.inputs["Distortion"].default_value = 7
    ripple.inputs["Detail Scale"].default_value = 0.72
    links.new(coords, ripple.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.17
    bump.inputs["Distance"].default_value = 0.017
    links.new(ripple.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def palette():
    return {
        "plinth": surface("Enameled naval blue", "16373E", 0.35, 0.42),
        "brass": surface("Brushed brass hardware", "C59252", 0.32, 0.67),
        "letter": surface("Ivory lettering", "FFF0CF", 0.52),
        "sea": water_material(),
        "mist": surface("Sea lace", "C8F3DF", 0.64),
        "wave": surface("Glancing tide", "63BAB2", 0.46, 0.08),
        "sand": surface("Crushed shell trail", "CAAE78", flecks=("ECD4A4", 48, 0.018)),
        "sod": [surface(f"Salt meadow {i + 1}", color, 0.88, flecks=(light, 14, 0.036))
                for i, (color, light) in enumerate((("627750", "95A976"), ("7D864E", "AEB47A"),
                                                  ("486952", "819766")))],
        "strata": [surface(f"Sandstone course {i + 1}", color, 0.86,
                            flecks=(light, 24, 0.033)) for i, (color, light) in enumerate((
            ("596B60", "88907B"), ("85715B", "A9926F"), ("98694F", "C49871"),
            ("9B6B51", "D0A27C"), ("BB8F68", "DFC59A"), ("635F51", "A89376")))],
        "cream": surface("Weathered ivory limewash", "E4C5A0", 0.7,
                         flecks=("FFF2D6", 20, 0.018)),
        "red": surface("Oxide-red marine paint", "AD3930", 0.51, flecks=("DE633E", 25, 0.014)),
        "shutter": surface("Petrol-blue joinery", "275A59", 0.62, flecks=("387A77", 40, 0.012)),
        "iron": surface("Blue-black iron", "172E31", 0.43, 0.53),
        "roof": surface("Verdigris standing-seam roof", "326761", 0.44, 0.27,
                        flecks=("548480", 18, 0.012)),
        "glass": surface("Saffron window light", "FFB34F", 0.26, emission=1.8),
        "lens": surface("Fresnel lamp", "FFC579", 0.22, emission=7.0),
        "trunk": surface("Salt-silvered bark", "66573E", 0.8),
        "foliage": [surface(f"Coastal pine {i + 1}", color, 0.83, flecks=(light, 18, 0.045))
                    for i, (color, light) in enumerate((("214E43", "457459"), ("3F684C", "6C8E5C"),
                                                       ("698250", "8AA762")))],
        "grass": [surface(f"Dune grass {i + 1}", color, 0.78) for i, color in
                  enumerate(("A1A16A", "BEAF6D", "5F824D", "82945D"))],
        "wood": [surface(f"Harbor timber {i + 1}", color, 0.72,
                          flecks=(light, 23, 0.014)) for i, (color, light) in enumerate((
            ("795741", "A67B54"), ("967352", "C19468"), ("A47E5B", "D2A982")))],
    }


def group(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children[name]


def mesh(name, verts, faces, mats, indices=None, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    for material in mats:
        data.materials.append(material)
    for i, face in enumerate(data.polygons):
        if indices is not None:
            face.material_index = indices[i]
        face.use_smooth = smooth
    return obj


def box(name, location, size, mat, angle=0, bevel=0):
    x, y, z = (n / 2 for n in size)
    verts = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
             (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    faces = [(3, 2, 1, 0), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)]
    obj = mesh(name, verts, faces, [mat])
    obj.location = location
    obj.rotation_euler.z = angle
    if bevel:
        edge = obj.modifiers.new("Soft edges", "BEVEL")
        edge.width, edge.segments = bevel, 2
        edge.harden_normals = True
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def lathe(name, center, profile, mats, bands=None, sides=64, smooth=True, cap=True, phase=0):
    verts = [(r * math.cos(TAU * j / sides + phase), r * math.sin(TAU * j / sides + phase), z)
             for r, z in profile for j in range(sides)]
    faces, indices = [], []
    for i in range(len(profile) - 1):
        for j in range(sides):
            a, b = i * sides + j, i * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))
            indices.append(bands[i] if bands is not None else 0)
    if cap:
        faces.extend((tuple(reversed(range(sides))), tuple(range(len(verts) - sides, len(verts)))))
        indices.extend((indices[0], indices[-1]))
    obj = mesh(name, verts, faces, mats, indices, smooth=smooth)
    obj.location = center
    if cap:
        obj.data.polygons[-1].use_smooth = False
        obj.data.polygons[-2].use_smooth = False
    return obj


def tower_uv(obj, profile, sides):
    """Pack the tapered shell strip and the two endcaps into three UV islands."""
    data = obj.data
    uv = data.uv_layers.new(name="Lighthouse atlas")
    lengths = [0.0]
    for a, b in zip(profile, profile[1:]):
        lengths.append(lengths[-1] + math.dist(a, b))
    seam = {(i * sides, (i + 1) * sides) for i in range(len(profile) - 1)}
    for edge in data.edges:
        a, b = sorted(edge.vertices)
        if (a, b) in seam or (a // sides == b // sides and a // sides in (0, len(profile) - 1)):
            edge.use_seam = True
    for poly in data.polygons:
        if poly.index < (len(profile) - 1) * sides:
            ring, segment = divmod(poly.index, sides)
            u0, u1 = (0.035 + 0.69 * i / sides for i in (segment, segment + 1))
            v0, v1 = (0.04 + 0.92 * lengths[i] / lengths[-1] for i in (ring, ring + 1))
            coords = ((u0, v0), (u1, v0), (u1, v1), (u0, v1))
        else:
            ring = data.loops[poly.loop_start].vertex_index // sides
            v = 0.27 if ring == 0 else 0.73
            scale = 0.10 / profile[ring][0]
            coords = [(0.86 + data.vertices[i].co.x * scale, v + data.vertices[i].co.y * scale)
                      for i in poly.vertices]
        for loop_index, xy in zip(poly.loop_indices, coords):
            uv.uv[loop_index].vector = xy


def trail_pebbles(points, material):
    """Instance one low-poly pebble on the trail points rather than duplicating meshes."""
    obj = mesh("Shell trail • instanced pebbles", points, [], [])
    tree = bpy.data.node_groups.new("Coastal scatter • editable pebble instances", "GeometryNodeTree")
    tree.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    tree.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nodes, links = tree.nodes, tree.links
    pin, pout = nodes.new("NodeGroupInput"), nodes.new("NodeGroupOutput")
    ico = nodes.new("GeometryNodeMeshIcoSphere")
    ico.inputs["Radius"].default_value = 0.044
    ico.inputs["Subdivisions"].default_value = 1
    transform = nodes.new("GeometryNodeTransform")
    transform.inputs["Scale"].default_value = (1, 0.72, 0.40)
    set_material = nodes.new("GeometryNodeSetMaterial")
    set_material.inputs["Material"].default_value = material
    instance = nodes.new("GeometryNodeInstanceOnPoints")
    variation = nodes.new("FunctionNodeRandomValue")
    variation.data_type = "FLOAT_VECTOR"
    next(sock for sock in variation.inputs if sock.name == "Min" and sock.enabled).default_value = (0.3, 0.4, 0.35)
    next(sock for sock in variation.inputs if sock.name == "Max" and sock.enabled).default_value = (1.0, 0.95, 0.95)
    variation.inputs["Seed"].default_value = 41
    links.new(pin.outputs["Geometry"], instance.inputs["Points"])
    links.new(ico.outputs["Mesh"], transform.inputs["Geometry"])
    links.new(transform.outputs["Geometry"], set_material.inputs["Geometry"])
    links.new(set_material.outputs["Geometry"], instance.inputs["Instance"])
    links.new(next(sock for sock in variation.outputs if sock.enabled), instance.inputs["Scale"])
    links.new(instance.outputs["Instances"], pout.inputs["Geometry"])
    pin.location, ico.location, transform.location = (-560, 160), (-560, -30), (-350, -30)
    set_material.location, variation.location = (-140, -30), (-140, -225)
    instance.location, pout.location = (80, 160), (300, 160)
    obj.modifiers.new("Memory-light coastal scatter", "NODES").node_group = tree


def sculpt_erosion(obj):
    """An editable, bounded sculpt-style detail stack, no viewport or brush operators."""
    subdivide = obj.modifiers.new("Erosion sampling", "SUBSURF")
    subdivide.subdivision_type = "SIMPLE"
    subdivide.levels = subdivide.render_levels = 2
    # Object-space Clouds displacement adapted from EL4CTEO/blender-skills
    # blender-sculpting/scripts/sculpt_ops.py (MIT; see blender_pipeline/licenses).
    texture = bpy.data.textures.new("Salt & weather erosion", "CLOUDS")
    texture.noise_scale, texture.noise_depth = 0.16, 4
    detail = obj.modifiers.new("Weathered face detail", "DISPLACE")
    detail.texture, detail.strength, detail.texture_coords = texture, 0.075, "LOCAL"


def rod(name, start, end, radius, mat, tip=None, sides=10):
    a, b = Vector(start), Vector(end)
    d = b - a
    obj = lathe(name, (a + b) / 2,
                [(radius, -d.length / 2), (radius if tip is None else tip, d.length / 2)],
                [mat], sides=sides)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = d.to_track_quat("Z", "Y")
    return obj


def line(name, points, radius, mat, cyclic=False):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth, curve.bevel_resolution = radius, 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, xyz in zip(spline.points, points):
        point.co = (*xyz, 1)
    spline.use_cyclic_u = cyclic
    curve.materials.append(mat)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return obj


def circle(x, y, z, r, sides=72):
    return [(x + r * math.cos(TAU * i / sides), y + r * math.sin(TAU * i / sides), z)
            for i in range(sides)]


def coast_shape(a):
    return 1 + 0.074 * math.sin(3 * a + 0.9) + 0.062 * math.cos(5 * a - 0.5) + 0.023 * math.sin(9 * a)


def coast_xy(a, radius):
    r = radius * coast_shape(a)
    return COAST.x + COAST_RX * r * math.cos(a), COAST.y + COAST_RY * r * math.sin(a)


def terrain_z(x, y):
    dx, dy = (x - COAST.x) / COAST_RX, (y - COAST.y) / COAST_RY
    a = math.atan2(dy, dx)
    r = math.hypot(dx, dy) / coast_shape(a)
    for (r0, z0), (r1, z1) in zip(STRATA, STRATA[1:]):
        if r <= r1:
            h = z0 + (z1 - z0) * (r - r0) / (r1 - r0)
            break
    else:
        return STRATA[-1][1]
    hill = 0.47 * math.exp(-((x + 1.28) / 1.22) ** 2 - ((y - 0.56) / 1.13) ** 2)
    hill += 0.15 * math.exp(-((x - 0.25) / 1.8) ** 2 - ((y - 1.0) / 0.7) ** 2)
    wear = (0.024 * (math.sin(11 * a + r * 12) + math.cos(17 * a - r * 13))
            + 0.029 * math.sin(4 * a + 3 * r)) * min(1, r * 2)
    return h + hill * min(1, max(0, (1.06 - r) / 0.30)) + wear


def boulder(name, location, scale, mats, rng, *, sides=7, smooth=False):
    sx, sy, sz = scale
    verts, faces = [], []
    phi = rng.uniform(0, TAU)
    for i, (rad, z) in enumerate(((0.72, -0.60), (1, -0.13), (0.72, 0.58), (0.23, 0.88))):
        for j in range(sides):
            a = TAU * j / sides + phi + (i % 2) * 0.17
            f = rad * rng.uniform(0.80, 1.19)
            verts.append((math.cos(a) * f * sx + i * 0.10 * sx,
                          math.sin(a) * f * sy, (z + rng.uniform(-0.14, 0.14)) * sz))
    for i in range(3):
        for j in range(sides):
            a, b = i * sides + j, i * sides + (j + 1) % sides
            faces.extend(((a, b, b + sides), (a, b + sides, a + sides)))
    faces.extend((tuple(reversed(range(sides))), tuple(range(3 * sides, 4 * sides))))
    weights = [rng.randrange(len(mats)) if rng.random() < 0.35 else 0 for _ in faces]
    obj = mesh(name, verts, faces, mats, weights, smooth)
    obj.location = location
    return obj


def ground(m, rng):
    group("03 • Landform / salt meadow")
    n = 112
    verts = [(COAST.x, COAST.y, terrain_z(*COAST))]
    for r, _ in STRATA[1:]:
        for i in range(n):
            x, y = coast_xy(TAU * i / n, r)
            verts.append((x, y, terrain_z(x, y)))
    faces = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    indices = [0] * n
    courses = (0, 0, 0, 0, 3 + 4, 3 + 3, 3 + 5, 3 + 2, 3 + 3, 3 + 2, 3 + 4, 3 + 1, 3)
    for k, course in enumerate(courses[:len(STRATA) - 2]):
        for i in range(n):
            a = 1 + k * n + i
            b = 1 + k * n + (i + 1) % n
            faces.extend(((a, a + n, b), (b, a + n, b + n)))
            if course == 0:
                meadow = round(1 + math.sin(i * 0.141 + k * 0.8))
                indices.extend((meadow, meadow))
            else:
                indices.extend((course, course if rng.random() < 0.89 else max(3, course - 1)))
    obj = mesh("Tide-cut island • terraced sandstone", verts, faces, m["sod"] + m["strata"], indices)
    for i, face in enumerate(obj.data.polygons):
        face.use_smooth = indices[i] < 3

    for a0, r0, count, span in ((-2.25, 1.08, 17, 0.53), (-0.04, 1.01, 15, 0.46),
                                 (0.95, 1.00, 11, 0.39), (-3.04, 1.02, 9, 0.30),
                                 (-1.47, 1.01, 10, 0.29)):
        for _ in range(count):
            a, r = a0 + rng.uniform(-span, span), r0 + rng.uniform(-0.045, 0.12)
            x, y = coast_xy(a, r)
            z = max(SEA - 0.07, terrain_z(x, y) - 0.06)
            s = rng.uniform(0.11, 0.31)
            boulder("Fallen ledge", (x, y, z), (s * 1.55, s, s * rng.uniform(0.37, 0.83)),
                    [rng.choice(m["strata"][1:5]), m["strata"][5]], rng)
    for i in range(15):
        x = -3.56 + rng.uniform(-0.32, 0.36)
        y = -0.86 + rng.uniform(-0.52, 0.32)
        s = rng.uniform(0.11, 0.31)
        boulder("Offshore skerry", (x, y, SEA + rng.uniform(0, 0.14)), (1.4 * s, s, s * 0.84),
                [m["strata"][1], m["strata"][0], m["strata"][4]], rng)
    for a, r, sx, sy, sz in ((-2.30, 0.955, 0.21, 0.24, 0.29), (-2.19, 0.949, 0.17, 0.18, 0.24),
                              (-1.71, 0.956, 0.22, 0.20, 0.30), (-1.59, 0.98, 0.28, 0.21, 0.19),
                              (-0.19, 0.95, 0.21, 0.16, 0.26), (0.01, 0.922, 0.23, 0.22, 0.27)):
        x, y = coast_xy(a, r)
        obj = boulder("Fractured cliff spall", (x, y, terrain_z(x, y) - 0.02), (sx, sy, sz),
                      [m["strata"][3], m["strata"][4], m["strata"][5]], rng)
        if a == -1.71:
            obj.name = "Eroded cliff study"
            sculpt_erosion(obj)


def ribbon(name, points, widths, mat, follow_terrain=False):
    verts = []
    for i, ((x, y, z), w) in enumerate(zip(points, widths)):
        a, b = points[max(0, i - 1)], points[min(i + 1, len(points) - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        s = w / (2 * math.hypot(dx, dy))
        for px, py in ((x + dy * s, y - dx * s), (x - dy * s, y + dx * s)):
            verts.append((px, py, terrain_z(px, py) + 0.038 if follow_terrain else z))
    faces = [(i, i + 2, i + 3, i + 1) for i in range(0, len(verts) - 2, 2)]
    return mesh(name, verts, faces, [mat], smooth=True)


def tides(m, rng):
    group("02 • Tide lines and foam")
    for band in range(3):
        a = -math.pi
        while a < math.pi - 0.25:
            span = min(math.pi - a, rng.uniform(0.15, 0.96))
            points, widths = [], []
            for i in range(31):
                t = i / 30
                angle = a + t * span
                r = 1.073 + band * 0.062 + 0.012 * math.sin(angle * 15 + 3 * band)
                x, y = coast_xy(angle, r)
                points.append((x, y, SEA + 0.005 + band * 0.002))
                widths.append(0.002 + (0.043 - band * 0.007) * math.sin(t * math.pi) ** 0.72
                              * (0.72 + 0.28 * math.sin(5 * t + angle)))
            ribbon("Broken surf contour", points, widths, m["mist"] if band < 2 else m["wave"])
            a += span + rng.uniform(0.05, 0.23)
    for dx, dy, sx, sy in ((-3.53, -0.96, 0.67, 0.59), (-3.60, -0.99, 0.82, 0.69)):
        for start, end in ((0.4, 2.8), (3.2, 5.5), (5.8, 6.65)):
            points = [(dx + sx * math.cos(a), dy + sy * math.sin(a), SEA + 0.008)
                      for a in (start + (end - start) * i / 32 for i in range(33))]
            ribbon("Skerry wash", points, [0.005 + 0.025 * math.sin(math.pi * i / 32)
                                            for i in range(33)], m["mist"])
    for _ in range(121):
        x, y = rng.uniform(-4.5, 4.5), rng.uniform(-4.5, 4.5)
        if math.hypot(x, y) > 4.55 or terrain_z(x, y) > SEA - 0.02:
            continue
        length = rng.uniform(0.036, 0.30)
        points = [(x + length * i / 10, y + 0.018 * math.sin(i / 5) - 0.021 * i / 10, SEA + 0.005)
                  for i in range(-5, 6)]
        ribbon("Water glint", points, [0.003 + 0.011 * math.cos(i * math.pi / 10)
                                       for i in range(-5, 6)], m["wave"])


def text(name, body, size, location, tangent, normal, mat, spacing=1):
    data = bpy.data.curves.new(name, "FONT")
    data.body, data.size, data.space_character = body, size, spacing
    data.align_x = "CENTER"
    data.materials.append(mat)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = Matrix((tangent, (0, 0, 1), normal)).transposed().to_euler()
    return obj


def display(m):
    group("01 • Tidal specimen plinth")
    lathe("Enameled plinth", (0, 0, 0), [(4.60, 0.044), (4.73, 0.044), (4.80, 0.088),
          (4.83, 0.131), (4.83, 0.184), (4.80, 0.211), (4.75, 0.225),
          (4.75, 0.270), (4.82, 0.304), (BASE_RADIUS, 0.357), (BASE_RADIUS, 0.560)],
          [m["plinth"], m["brass"]], [0, 0, 0, 0, 1, 0, 0, 0, 0, 0], sides=192)
    lathe("Cast resin water", (0, 0, 0), [(BASE_RADIUS, 0.559), (BASE_RADIUS, 0.585), (4.82, SEA)],
          [m["sea"]], sides=192)
    n = Vector((CAMERA[0], CAMERA[1], 0)).normalized()
    t = Vector((-n.y, n.x, 0))
    theta = math.atan2(t.y, t.x)
    center = n * 4.74 + Vector((0, 0, 0.354))
    box("Solid brass badge", center, (1.94, 0.23, 0.355), m["brass"], theta, 0.028)
    box("Inset enamel face", center + n * 0.119, (1.86, 0.022, 0.290), m["plinth"], theta, 0.014)
    text("Title engraving", "LANTERN TIDE", 0.148, center + n * 0.135 + Vector((0, 0, 0.019)),
         t, n, m["letter"], 1.13)
    text("Specimen engraving", "C O A S T A L   S T A T I O N   /   0 1", 0.056,
         center + n * 0.135 - Vector((0, 0, 0.086)), t, n, m["letter"])
    for side in (-1, 1):
        p = center + t * (0.835 * side) + n * 0.127
        rod("Badge rivet", p, p + n * 0.019, 0.020, m["brass"], sides=16)


def arch(name, center, normal, width, height, depth, mat):
    # The origin is the sill. Outline traces the straight sides and semicircular head.
    t = Vector((-normal.y, normal.x, 0))
    up = Vector((0, 0, 1))
    base = Vector(center)
    r = width / 2
    profile = [(-r, 0), (r, 0)] + [(r * math.cos(a), height - r + r * math.sin(a))
                                   for a in (math.pi * i / 14 for i in range(15))]
    verts = [base + t * x + up * z + normal * d for d in (0, depth) for x, z in profile]
    n = len(profile)
    faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
    faces.extend((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))
    return mesh(name, verts, faces, [mat])


def lighthouse(m):
    group("04 • Lighthouse and Fresnel lantern")
    x, y = -1.40, 0.53
    z = terrain_z(x, y) - 0.10
    p = (x, y, z)
    lathe("Octagonal masonry footing", p, [(0.55, -0.16), (0.55, 0.14), (0.50, 0.22)],
          [m["strata"][5]], sides=8, smooth=False, phase=math.pi / 8)
    profile = [(0.50, 0.16), (0.50, 0.22), (0.459, 0.26), (0.441, 0.35), (0.414, 0.80),
               (0.392, 1.16), (0.368, 1.56), (0.351, 1.85), (0.338, 2.04), (0.365, 2.084)]
    tower = lathe("Tapered striped lighthouse", p, profile, [m["cream"], m["red"]],
                  [0, 0, 0, 0, 1, 0, 1, 0, 0], sides=88)
    tower_uv(tower, profile, 88)
    n = Vector((0.49, -0.872, 0)).normalized()
    t = Vector((-n.y, n.x, 0))
    angle = math.atan2(t.y, t.x)
    door = Vector(p) + n * 0.411 + Vector((0, 0, 0.213))
    arch("Carved door surround", door, n, 0.269, 0.437, 0.072, m["strata"][4])
    arch("Blue arched hatch", door + n * 0.074 + Vector((0, 0, 0.023)), n,
         0.196, 0.357, 0.018, m["shutter"])
    for side in (-1, 0, 1):
        box("Door planking", door + n * 0.094 + t * (side * 0.039) + Vector((0, 0, 0.174)),
            (0.008, 0.008, 0.25), m["roof"], angle, 0.002)
    k = door + n * 0.10 + t * 0.056 + Vector((0, 0, 0.169))
    rod("Brass latch", k, k + n * 0.026, 0.016, m["brass"], sides=12)
    for i in range(2):
        box("Granite doorstep", door + n * (0.145 + 0.088 * i) + Vector((0, 0, -0.055 * i)),
            (0.35 - 0.025 * i, 0.23, 0.104), m["strata"][4 - i], angle, 0.015)
    for h, dx, radius in ((0.883, -0.12, 0.409), (1.365, 0.17, 0.376), (1.898, -0.10, 0.349)):
        v = Vector((math.cos(dx) * n.x - math.sin(dx) * n.y,
                    math.sin(dx) * n.x + math.cos(dx) * n.y, 0))
        base = Vector(p) + v * (radius - 0.011) + Vector((0, 0, h))
        arch("Arched slit frame", base, v, 0.131, 0.223, 0.043, m["iron"])
        arch("Lamplit slit", base + v * 0.044 + Vector((0, 0, 0.023)), v,
             0.084, 0.164, 0.006, m["glass"])
        box("Window sill", base + v * 0.030, (0.167, 0.080, 0.036), m["cream"], angle, 0.006)
    lathe("Corbel and balcony deck", p, [(0.341, 2.022), (0.430, 2.086), (0.558, 2.116),
          (0.567, 2.145), (0.567, 2.193), (0.548, 2.208)], [m["iron"], m["brass"]], [0, 0, 1, 0, 0])
    for i, (px, py, _) in enumerate(circle(x, y, z, 0.523, 16)):
        rod(f"Balcony baluster {i + 1:02}", (px, py, z + 2.177), (px, py, z + 2.455),
            0.016, m["iron"])
    for h, radius, mat in ((2.293, 0.524, m["iron"]), (2.444, 0.526, m["iron"]),
                           (2.458, 0.527, m["brass"])):
        line("Circular gallery rail", circle(x, y, z + h, radius), 0.015, mat, cyclic=True)
    lathe("Lantern mounting", p, [(0.352, 2.194), (0.352, 2.254), (0.320, 2.272), (0.320, 2.333)],
          [m["iron"], m["red"]], [0, 0, 1], sides=10, smooth=False)
    glazing = surface("Lantern glazing", "DFF4D8", 0.16)
    glass = glazing.node_tree.nodes.get("Principled BSDF")
    glass.inputs["Transmission Weight"].default_value = 1.0
    glass.inputs["IOR"].default_value = 1.12
    # One thin pane per bay; no coincident surfaces or sealed volume.
    lathe("Glazed lantern bays", p, [(0.316, 2.323), (0.316, 2.816)], [glazing],
          sides=10, smooth=False, cap=False)
    for px, py, _ in circle(x, y, z, 0.323, 10):
        rod("Cast lantern mullion", (px, py, z + 2.306), (px, py, z + 2.838), 0.021, m["iron"])
    lathe("Lamp base and Fresnel lens", p, [(0.173, 2.312), (0.173, 2.388), (0.123, 2.423),
          (0.152, 2.478), (0.161, 2.551), (0.151, 2.635), (0.107, 2.694), (0.108, 2.725)],
          [m["brass"], m["lens"]], [0, 0, 1, 1, 1, 1, 0], sides=40)
    for h, r in ((2.467, 0.151), (2.505, 0.16), (2.550, 0.166), (2.598, 0.161), (2.643, 0.15)):
        line("Fresnel lens rib", circle(x, y, z + h, r, 48), 0.006, m["glass"], cyclic=True)
    lathe("Copper crown", p, [(0.337, 2.797), (0.415, 2.814), (0.425, 2.844), (0.398, 2.877),
          (0.329, 2.948), (0.249, 3.034), (0.157, 3.107), (0.061, 3.167), (0.025, 3.183)],
          [m["red"], m["iron"], m["brass"]], [1, 1, 2, 0, 0, 0, 0, 0], sides=80)
    for i in range(10):
        a = TAU * i / 10
        line("Standing seam on crown", [(x + r * math.cos(a), y + r * math.sin(a), z + h)
                                         for r, h in ((0.400, 2.867), (0.332, 2.95), (0.252, 3.036),
                                                      (0.160, 3.110), (0.060, 3.170))],
             0.009, m["red"])
    lathe("Crown finial", p, [(0.048, 3.159), (0.052, 3.197), (0.085, 3.238), (0.072, 3.285),
                              (0.024, 3.321), (0.012, 3.407)], [m["brass"]], sides=32)
    rod("Vane arm", (x - 0.21, y - 0.09, z + 3.36), (x + 0.22, y + 0.09, z + 3.36), 0.012, m["iron"])
    mesh("Vane arrow", [(x + 0.26, y + 0.104, z + 3.36), (x + 0.13, y + 0.052, z + 3.43),
                         (x + 0.13, y + 0.052, z + 3.29)], [(0, 1, 2)], [m["brass"]])


def cottage(m):
    group("05 • Keeper's cottage")
    x, y, a = 0.98, 0.46, math.radians(8)
    z = terrain_z(x, y) + 0.014
    ca, sa = math.cos(a), math.sin(a)

    def pt(u, v, h):
        return x + u * ca - v * sa, y + u * sa + v * ca, z + h

    def block(name, u, v, h, dims, mat, bevel=0.011):
        return box(name, pt(u, v, h), dims, mat, a, bevel)

    block("Low foundation", 0, 0, -0.097, (1.48, 1.01, 0.37), m["strata"][5], 0.033)
    block("Limewashed cottage", 0, 0, 0.40, (1.41, 0.96, 0.70), m["cream"], 0.028)
    # Extrude a ridge along the long axis, with folded metal standing seams on both pitches.
    gable = [pt(u, v, h) for u in (-0.702, 0.702) for v, h in ((-0.479, 0.73), (0.479, 0.73), (0, 1.13))]
    mesh("Gable plaster", gable, [(2, 1, 0), (3, 4, 5), (0, 3, 5, 2), (2, 5, 4, 1), (0, 1, 4, 3)],
         [m["cream"]])
    for side in (-1, 1):
        pts = [pt(u, side * v, h) for u in (-0.788, 0.788)
               for v, h in ((-0.009, 1.176), (0.598, 0.739), (-0.009, 1.125), (0.598, 0.701))]
        roof = mesh("Folded roof pitch", pts, [(0, 1, 5, 4), (2, 6, 7, 3), (0, 2, 3, 1),
                                                (4, 5, 7, 6), (0, 4, 6, 2), (1, 3, 7, 5)], [m["roof"]])
        # Reversed pitching changes the face normals on one side.
        if side == 1:
            for polygon in roof.data.polygons:
                polygon.flip()
        for i in range(13):
            u = -0.752 + i * 0.125
            line("Roof standing seam", [pt(u, 0, 1.187), pt(u, side * 0.603, 0.743)], 0.013, m["roof"])
        for u in (-0.785, 0.785):
            line("Ivory gable trim", [pt(u, 0, 1.147), pt(u, side * 0.608, 0.708)], 0.029, m["cream"])
        line("Gutter", [pt(-0.802, side * 0.612, 0.705), pt(0.802, side * 0.612, 0.705)], 0.018, m["iron"])
    rod("Ridge cap", pt(-0.817, 0, 1.182), pt(0.817, 0, 1.182), 0.025, m["roof"])
    block("Brick chimney", 0.43, 0.29, 1.087, (0.213, 0.210, 0.390), m["red"])
    for j in range(3):
        block("Chimney mortar course", 0.43, 0.29, 0.984 + 0.087 * j, (0.224, 0.219, 0.010),
              m["strata"][4], 0.003)
    block("Chimney cap", 0.43, 0.29, 1.289, (0.278, 0.275, 0.067), m["strata"][5])
    for u in (0.386, 0.474):
        lathe("Chimney pot", pt(u, 0.29, 1.31), [(0.035, 0), (0.034, 0.098), (0.047, 0.114)],
              [m["red"]], sides=18)
    block("Door frame", -0.412, -0.494, 0.307, (0.259, 0.058, 0.48), m["letter"])
    block("Cottage door", -0.412, -0.529, 0.292, (0.214, 0.045, 0.418), m["shutter"])
    block("Transom", -0.412, -0.556, 0.426, (0.144, 0.015, 0.114), m["glass"], 0.005)
    block("Door knob", -0.340, -0.564, 0.252, (0.03, 0.028, 0.03), m["brass"], 0.009)
    for j in range(3):
        block("Cottage front step", -0.412, -0.625 - 0.071 * j, 0.043 - 0.067 * j,
              (0.36 + 0.035 * j, 0.223, 0.115), m["strata"][4 - j], 0.016)
    for u in (-0.026, 0.425):
        block("Cottage sash frame", u, -0.501, 0.425, (0.238, 0.066, 0.301), m["letter"])
        block("Cottage lit window", u, -0.536, 0.425, (0.174, 0.015, 0.229), m["glass"], 0.004)
        block("Sash meeting rail", u, -0.551, 0.425, (0.185, 0.024, 0.020), m["letter"], 0.003)
        block("Sash muntin", u, -0.551, 0.425, (0.015, 0.024, 0.234), m["letter"], 0.003)
        block("Cottage sill", u, -0.549, 0.278, (0.276, 0.095, 0.036), m["letter"], 0.007)
        for side in (-1, 1):
            block("Louvered shutter", u + 0.145 * side, -0.517, 0.426, (0.058, 0.040, 0.263), m["shutter"])
            for i in range(5):
                block("Shutter louver", u + 0.145 * side, -0.541, 0.341 + i * 0.040,
                      (0.044, 0.012, 0.013), m["roof"], 0.003)
    block("Gable sash frame", 0.714, -0.054, 0.49, (0.062, 0.245, 0.321), m["letter"])
    block("Gable amber window", 0.751, -0.054, 0.49, (0.018, 0.179, 0.236), m["glass"], 0.004)
    block("Gable crossbar", 0.765, -0.054, 0.49, (0.017, 0.191, 0.023), m["letter"], 0.002)
    block("Gable sill", 0.75, -0.054, 0.339, (0.106, 0.285, 0.043), m["letter"])
    for u in (-0.697, 0.697):
        for j in range(4):
            block("Quoin", u, -0.477, 0.136 + 0.166 * j,
                  (0.157 - 0.039 * (j % 2), 0.066, 0.118), m["strata"][4], 0.009)
    # Small enamel cottage light and a stack of lobster baskets on the side.
    lathe("Porch lantern", pt(-0.584, -0.535, 0.39), [(0.043, 0), (0.049, 0.025), (0.046, 0.111),
          (0.053, 0.127), (0.018, 0.150)], [m["iron"], m["glass"]], [0, 1, 0, 0], sides=8)
    for h in (0.03, 0.17):
        block("Lobster crate", 0.784, 0.238, h, (0.28, 0.33, 0.133), m["wood"][1], 0.017)
        for k in range(3):
            block("Crate slat", 0.931, 0.238, h - 0.045 + k * 0.045, (0.015, 0.314, 0.024), m["wood"][2], 0.003)


def trail_points(controls, samples=16):
    points = [Vector(p) for p in controls]
    extended = [points[0], *points, points[-1]]
    for p0, p1, p2, p3 in zip(extended, extended[1:], extended[2:], extended[3:]):
        for i in range(samples):
            t = i / samples
            yield 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t**2
                         + (-p0 + 3 * p1 - 3 * p2 + p3) * t**3)
    yield points[-1]


def coastal_walk(m, rng):
    group("06 • Shell trail and salt-garden")
    landing = Vector((1.64, -0.79))
    controls = [(-1.075, -0.054), (-0.950, -0.317), (-0.691, -0.568), (-0.229, -0.644),
                (0.21, -0.539), (0.624, -0.400), (1.06, -0.522), landing]
    path = list(trail_points(controls))
    ribbon("Winding crushed shell trail", [(x, y, 0) for x, y in path],
           [0.247 + 0.048 * math.sin(i * 0.20) for i in range(len(path))], m["sand"], follow_terrain=True)
    pebbles = []
    for i in range(6, len(path) - 3, 2):
        tangent = (path[i + 1] - path[i - 1]).normalized()
        across = Vector((-tangent.y, tangent.x))
        for _ in range(2):
            x, y = path[i] + across * rng.uniform(-0.140, 0.140)
            pebbles.append((x, y, terrain_z(x, y) + 0.041))
    trail_pebbles(pebbles, m["strata"][4])

    # A low post-and-rail fence traces the bluff on the seaward side of the trail.
    fence = [(-1.82, -0.59), (-1.62, -0.87), (-1.36, -1.08), (-1.04, -1.24), (-0.70, -1.29), (-0.36, -1.27)]
    posts = [Vector((x, y, terrain_z(x, y))) for x, y in fence]
    for p in posts:
        box("Weathered fence post", p + Vector((0, 0, 0.127)), (0.054, 0.059, 0.27), m["wood"][1], bevel=0.007)
    for a, b in zip(posts, posts[1:]):
        for h in (0.102, 0.204):
            rod("Bluff fence rail", a + Vector((0, 0, h)), b + Vector((0, 0, h)), 0.017, m["wood"][2], sides=5)

    def pine(x, y, height):
        z = terrain_z(x, y)
        base = Vector((x, y, z - 0.03))
        knot = base + Vector((0.045, -0.023, 0.40 * height))
        top = base + Vector((0.22 * height, 0.025, 0.88 * height))
        rod("Crooked pine trunk", base, knot, 0.067 * height, m["trunk"], 0.047 * height, sides=7)
        rod("Pine leader", knot, top, 0.047 * height, m["trunk"], 0.019 * height, sides=7)
        for tier in range(3):
            center = knot.lerp(top, tier / 3)
            size = height * (0.35 - 0.061 * tier)
            v = rng.uniform(-0.5, 0.5)
            offsets = [(-0.67, 0.26, 0.24), (0.32, -0.58, 0.13), (0.64, 0.35, 0.29)]
            if tier == 2:
                offsets = [(0.08, 0.14, 0.7), (0.41, -0.11, 0.2)]
            for dx, dy, dz in offsets:
                c = center + Vector((dx * size, (dy + v) * size, (dz + 0.40) * size))
                rod("Wind-shaped branch", center, c, 0.021 * height, m["trunk"], 0.009 * height, sides=6)
                boulder("Wind-sheared pine crown", c, (size * 1.03, size * 0.81, size * 0.50),
                        [m["foliage"][tier], m["foliage"][min(2, tier + 1)]], rng, sides=9, smooth=True)

    for tree in ((-2.43, 0.66, 0.71), (-1.99, 1.11, 0.94), (-1.02, 1.54, 0.80), (-0.48, 1.65, 1.01),
                 (0.13, 1.33, 0.68), (1.58, 1.26, 1.03), (2.08, 0.91, 0.76), (2.07, 0.55, 0.52),
                 (-1.86, -0.50, 0.51), (-1.51, -0.74, 0.43)):
        pine(*tree)
    for x0, y0 in ((-2.50, -0.06), (-0.67, 0.84), (-0.50, -1.32), (0.22, -1.12),
                   (1.0, -0.91), (2.19, -0.58), (1.69, 0.10)):
        for _ in range(5):
            x, y = x0 + rng.uniform(-0.17, 0.18), y0 + rng.uniform(-0.13, 0.13)
            s = rng.uniform(0.085, 0.153)
            boulder("Coastal heather cushion", (x, y, terrain_z(x, y) + 0.046), (s, s * 0.83, s * 0.72),
                    [m["foliage"][1], m["foliage"][2]], rng, sides=7, smooth=True)
    verts, faces, indices = [], [], []
    for i in range(500):
        x, y = coast_xy(rng.uniform(0, TAU), rng.uniform(0.24, 0.82))
        if (x + 1.4) ** 2 + (y - 0.53) ** 2 < 0.61 ** 2 or (abs(x - 0.98) < 0.85 and abs(y - 0.46) < 0.58):
            continue
        if any((p.x - x) ** 2 + (p.y - y) ** 2 < 0.155 ** 2 for p in path[::2]):
            continue
        z = terrain_z(x, y) - 0.016
        for _ in range(rng.randint(3, 5)):
            a, w, h = rng.uniform(0, TAU), rng.uniform(0.012, 0.023), rng.uniform(0.037, 0.149)
            dx, dy = math.cos(a), math.sin(a)
            o = len(verts)
            verts.extend(((x - dy * w, y + dx * w, z), (x + dy * w, y - dx * w, z),
                          (x + dx * 0.30 * h, y + dy * 0.30 * h, z + 0.72 * h),
                          (x + dx * 0.84 * h, y + dy * 0.84 * h, z + h)))
            faces.extend(((o, o + 1, o + 2), (o, o + 2, o + 3)))
            c = rng.randrange(len(m["grass"]))
            indices.extend((c, c))
        if i % 9 == 0:
            # Tiny sea campion blossoms punctuate the grass in pale cream.
            tip = (x + 0.025, y + 0.025, z + rng.uniform(0.099, 0.162))
            rod("Campion stem", (x, y, z), tip, 0.004, m["grass"][2], sides=5)
            lathe("Campion flower", tip, [(0.009, -0.003), (0.025, 0.013), (0.020, 0.018)],
                  [m["letter"]], sides=5, smooth=False)
    mesh("Windblown grass tufts", verts, faces, m["grass"], indices)
    return landing


def dinghy(m, berth, moor):
    bow_direction = (Vector(moor[:2]) - Vector(berth)).normalized()
    angle = math.atan2(bow_direction.y, bow_direction.x) + 0.27
    ca, sa = math.cos(angle), math.sin(angle)

    def pt(u, v, z):
        return berth[0] + ca * u - sa * v, berth[1] + sa * u + ca * v, SEA + z

    station = [(-0.55, 0.14, 0.042), (-0.40, 0.219, 0.026), (-0.15, 0.255, 0.005),
               (0.09, 0.245, 0), (0.32, 0.195, 0.025), (0.52, 0.094, 0.060), (0.62, 0.012, 0.115)]
    outline = [(u, -w, lift) for u, w, lift in station] + list(reversed(station))
    # One continuous hull: keel → clinker strake → gunwale → inner floor.
    sections = [(0.72, 0.46, -0.075), (0.88, 0.72, -0.018), (0.972, 0.94, 0.104), (1.00, 1.00, 0.151),
                (0.981, 0.97, 0.169), (0.922, 0.81, 0.152), (0.832, 0.65, 0.096), (0.717, 0.40, 0.044)]
    verts = [pt(u * sx, v * sy, z + lift * (z + 0.12) / 0.29)
             for sx, sy, z in sections for u, v, lift in outline]
    n = len(outline)
    faces = []
    for k in range(len(sections) - 1):
        for j in range(n):
            a, b = k * n + j, k * n + (j + 1) % n
            faces.append((a, b, b + n, a + n))
    faces.extend((tuple(reversed(range(n))), tuple(range(len(verts) - n, len(verts)))))
    mesh("Red clinker-built dinghy", verts, faces, [m["red"], m["cream"], *m["wood"]],
         [index for index in (0, 0, 1, 1, 3, 2, 3) for _ in range(n)] + [0, 2])
    rim = [pt(u * 0.995, v, 0.166 + lift) for u, v, lift in outline]
    line("Dinghy varnished gunwale", rim, 0.016, m["wood"][1], cyclic=True)
    for u, width in ((-0.36, 0.345), (-0.08, 0.44), (0.23, 0.36)):
        box("Dinghy thwart", pt(u, 0, 0.128), (0.104, width, 0.031), m["wood"][2], angle, 0.007)
    for sign in (-1, 1):
        a, b = pt(-0.39, 0.10 * sign, 0.21), pt(0.37, 0.043 * sign, 0.205)
        rod("Stowed oar", a, b, 0.013, m["wood"][1], sides=9)
        box("Oar blade", pt(0.315, 0.045 * sign, 0.21), (0.215, 0.052, 0.024), m["wood"][2], angle, 0.010)
    bow = Vector(pt(0.610, 0, 0.257))
    a, b = Vector(moor), bow
    rope = [a.lerp(b, i / 18) - Vector((0, 0, 0.084 * math.sin(math.pi * i / 18))) for i in range(19)]
    line("Dinghy mooring line", rope, 0.013, m["sand"])
    for start, end in ((0.24, 2.4), (3.35, 5.6)):
        angles = [start + (end - start) * i / 42 for i in range(43)]
        points = [pt(0.78 * math.cos(k), 0.38 * math.sin(k), 0.007) for k in angles]
        ribbon("Dinghy wash", points, [0.003 + 0.015 * math.sin(math.pi * i / 42) for i in range(43)], m["mist"])


def harbor(m, rng, landing):
    group("07 • Stone steps, wharf and moored dinghy")
    start = Vector((2.24, -1.40))
    d = (start - landing).normalized()
    angle = math.atan2(d.y, d.x)
    tangent = Vector((-d.y, d.x))
    top_z = 0.884

    def trestle(u, v, z):
        xy = start + d * u + tangent * v
        return (xy.x, xy.y, z)

    walk_top = terrain_z(*landing) + 0.044
    steps = 9
    for j in range(steps):
        p = landing.lerp(start, (j + 0.45) / steps)
        z = walk_top + (top_z - walk_top) * (j + 1) / steps
        block_height = max(0.196, z - terrain_z(*p) + 0.084)
        box("Quarry-stone slipway tread", (*p, z - block_height / 2),
            (0.131, 0.410 - 0.035 * (j / steps), block_height), m["strata"][rng.choice((1, 3, 4, 4))],
            angle, 0.012)
    for side in (-0.145, 0.145):
        box("Wharf stringer", trestle(0.51, side, 0.792), (1.20, 0.085, 0.090), m["wood"][0], angle, 0.008)
    for i in range(18):
        u = i * 0.064
        box("Individual wharf plank", trestle(u, rng.uniform(-0.012, 0.012), top_z - 0.027),
            (0.061, rng.uniform(0.423, 0.463), 0.054), rng.choice(m["wood"]), angle, 0.007)
    for u, height in ((0.078, 1.044), (0.56, 1.005), (1.045, 1.128)):
        for v in (-0.212, 0.212):
            x, y, _ = trestle(u, v, height)
            lathe("Wharf pile and chamfered cap", (x, y, 0), [(0.047, 0.53), (0.045, height - 0.027),
                  (0.037, height)], [m["wood"][0], m["wood"][2]], [0, 1], sides=9)
            for j in range(3):
                line("Rope wrapped around pile", circle(x, y, height - 0.074 - j * 0.017, 0.048, 20),
                     0.006, m["sand"], cyclic=True)
    for u, v in ((0.29, -0.115), (0.38, 0.082)):
        lathe("Coopered barrel", trestle(u, v, top_z - 0.004), [(0.064, 0), (0.079, 0.058),
              (0.075, 0.115), (0.062, 0.150)], [m["wood"][2]], sides=10, smooth=False)
        for j in (0.038, 0.110):
            line("Barrel hoop", circle(*trestle(u, v, top_z + j), 0.077, 20), 0.007, m["iron"], cyclic=True)
    dinghy(m, (3.59, -1.07), trestle(1.04, 0.212, 1.054))
    for x, y in ((0.31, -3.35), (3.95, 0.15)):
        lathe("Vermilion channel float", (x, y, SEA - 0.01), [(0.108, 0), (0.122, 0.054),
              (0.088, 0.108), (0.043, 0.142), (0.034, 0.169)], [m["red"], m["cream"]], [0, 0, 1, 0], sides=20)
        line("Float loop", [(x - 0.022, y, SEA + 0.155), (x - 0.013, y, SEA + 0.194),
                           (x + 0.013, y, SEA + 0.194), (x + 0.022, y, SEA + 0.155)], 0.009, m["iron"])


def studio(scene):
    group("00 • Studio, lights and camera")
    box("Seamless studio backdrop", (0, 0, -0.09), (200, 200, 0.18), surface("Warm studio sage", "727F76", 0.82))
    world = bpy.data.worlds.new("Coastal studio ambient")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.43, 0.55, 0.62, 1)
    bg.inputs["Strength"].default_value = 0.26
    scene.world = world
    for name, loc, power, size, color in (
        ("Late afternoon key", (-4.8, -4.0, 8.5), 2300, 5.0, (1, 0.88, 0.73)),
        ("Soft blue fill", (5.5, -2.5, 6.2), 720, 6.5, (0.66, 0.85, 1)),
        ("Warm shoreline rim", (-2.0, 6.6, 7.4), 2350, 5.5, (1, 0.93, 0.78)),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.size, data.color = power, size, color
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (Vector((0, 0, 1.1)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    cam = bpy.data.cameras.new("Exhibition camera")
    cam.type, cam.ortho_scale, cam.lens = "ORTHO", 11.65, 50
    obj = bpy.data.objects.new("Exhibition camera", cam)
    bpy.context.collection.objects.link(obj)
    obj.location = CAMERA
    obj.rotation_euler = (Vector((0, 0, 1.61)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = obj


def animate_camera(scene, frames, fps):
    """A small exhibition orbit as editable object keyframes, not a runtime driver."""
    scene.frame_start, scene.frame_end, scene.render.fps = 1, frames, fps
    orbit = bpy.data.objects.new("Camera orbit • edit keyframes here", None)
    scene.camera.users_collection[0].objects.link(orbit)
    orbit.empty_display_type = "PLAIN_AXES"
    scene.camera.parent = orbit
    for f, degrees in ((1, 0), (1 + frames // 4, 13), (1 + frames // 2, 0),
                       (1 + 3 * frames // 4, -13), (1 + frames, 0)):
        orbit.rotation_euler.z = math.radians(degrees)
        orbit.keyframe_insert(data_path="rotation_euler", index=2, frame=f)
    scene.frame_set(1)


def render_settings(scene, width, samples):
    scene.render.engine = "CYCLES"
    cycles = scene.cycles
    cycles.device, cycles.samples = "CPU", samples
    cycles.use_denoising, cycles.denoiser = True, "OPENIMAGEDENOISE"
    cycles.use_adaptive_sampling, cycles.adaptive_threshold = True, 0.03
    cycles.max_bounces, cycles.diffuse_bounces, cycles.glossy_bounces = 6, 2, 3
    cycles.transmission_bounces = 4
    cycles.seed, cycles.use_animated_seed = 19, False
    cycles.use_auto_tile, cycles.tile_size = True, 512
    cycles.caustics_reflective = cycles.caustics_refractive = False
    scene.render.resolution_x, scene.render.resolution_y = width, round(width * 0.75)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    # A restrained halation on the Fresnel lamp only, not a global haze.
    tree = bpy.data.node_groups.new("Lantern halation", "CompositorNodeTree")
    scene.compositing_node_group = tree
    tree.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    layer = tree.nodes.new("CompositorNodeRLayers")
    glare = tree.nodes.new("CompositorNodeGlare")
    glare.inputs["Type"].default_value = "Bloom"
    glare.inputs["Threshold"].default_value = 1.6
    glare.inputs["Strength"].default_value = 0.32
    glare.inputs["Size"].default_value = 0.55
    out = tree.nodes.new("NodeGroupOutput")
    tree.links.new(layer.outputs["Image"], glare.inputs["Image"])
    tree.links.new(glare.outputs["Image"], out.inputs["Image"])
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_perspective = "CAMERA"


def build_scene(width, samples, *, frames=1, fps=24):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = "LANTERN TIDE • Coastal Station 01"
    scene.unit_settings.system = "METRIC"
    m = palette()
    rng = random.Random(118)
    studio(scene)
    display(m)
    tides(m, rng)
    ground(m, rng)
    lighthouse(m)
    cottage(m)
    harbor(m, rng, coastal_walk(m, rng))
    render_settings(scene, width, samples)
    if frames > 1:
        animate_camera(scene, frames, fps)
    else:
        scene.frame_start = scene.frame_end = 1
        scene.frame_set(1)
    return scene


def positive_int(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return number


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--width", type=positive_int, default=1600, help="image width in pixels (4:3 aspect)")
    parser.add_argument("--samples", type=positive_int, default=56, help="maximum Cycles samples per pixel")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parent / "out")
    # In Blender, only the arguments after its `--` separator belong to this script.
    argv = sys.argv[1:]
    if bpy.app.binary_path:
        argv = argv[argv.index("--") + 1:] if "--" in argv else []
    args = parser.parse_args(argv)
    target = args.output_dir.resolve()
    target.mkdir(parents=True, exist_ok=True)

    scene = build_scene(args.width, args.samples)

    bpy.context.preferences.filepaths.save_version = 0
    scene.render.filepath = "//lantern-tide.png"
    blend = target / "lantern-tide.blend"
    if "FINISHED" not in bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True, relative_remap=False):
        raise RuntimeError("Blender did not save the editable scene")
    if "FINISHED" not in bpy.ops.render.render(write_still=True):
        raise RuntimeError("Cycles did not finish the render")
    print(f"Saved {blend} and {target / 'lantern-tide.png'}", flush=True)


if __name__ == "__main__":
    main()
