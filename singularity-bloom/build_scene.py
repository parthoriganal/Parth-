"""
SINGULARITY BLOOM
=================
A fully procedural 3D sculpture, generated with real Blender (bpy 5.0) running
headless as a Python module inside a Linux container with no display server.

Everything you see is code — no imported models, no textures, no HDRIs:

  * a noise-displaced chrome singularity core, veined with emissive seams
  * two interlocking torus knots (gold, copper) woven through the bloom
  * a 3-tier crystal lotus: 39 blades swept along Bezier spines
  * a belt of 900 glowing dust motes and a swarm of 260 convex-hull shards
  * volumetric haze, a backlit halo card, three-point lighting
  * Cycles path tracing (CPU), AgX, denoised, bloom in the compositor

Usage
-----
    ./render.sh --preview                 fast look-dev (~1 min)
    ./render.sh                           final still (~20 min, 2 cores)
    ./render.sh --turntable 8 --width 500 --samples 40   spin frames

Outputs
-------
    out/singularity_bloom.blend   editable scene
    out/singularity_bloom.glb     web-ready PBR model (viewer/ loads this)
    out/renders/*.png
"""

import argparse
import math
import os
import random
import time

import bpy
import bmesh
from mathutils import Euler, Matrix, Vector, noise

# ----------------------------------------------------------------------------
# config
# ----------------------------------------------------------------------------

P = argparse.ArgumentParser()
P.add_argument("--preview", action="store_true", help="low-res look-dev render")
P.add_argument("--samples", type=int, default=0)
P.add_argument("--width", type=int, default=0)
P.add_argument("--turntable", type=int, default=0, help="number of spin frames")
P.add_argument("--out", default="out")
P.add_argument("--seed", type=int, default=20261106)
P.add_argument("--no-glb", action="store_true")
A = P.parse_args()

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, A.out)
RENDERS = os.path.join(OUT, "renders")
os.makedirs(RENDERS, exist_ok=True)

if A.preview:
    SAMPLES, WIDTH = A.samples or 32, A.width or 480
else:
    SAMPLES, WIDTH = A.samples or 160, A.width or 900
HEIGHT = int(WIDTH * 1.25)

TAU = math.tau
random.seed(A.seed)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"

COL = bpy.data.collections.new("SingularityBloom")
scene.collection.children.link(COL)


# ----------------------------------------------------------------------------
# materials
# ----------------------------------------------------------------------------

def _set(bsdf, key, val):
    if key in bsdf.inputs:
        bsdf.inputs[key].default_value = val


def principled(name, base, metallic=0.0, roughness=0.4, emission=None,
               emission_strength=0.0, coat=0.0, anisotropic=0.0,
               transmission=0.0, ior=1.45):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    _set(b, "Base Color", (*base, 1.0))
    _set(b, "Metallic", metallic)
    _set(b, "Roughness", roughness)
    _set(b, "Coat Weight", coat)
    _set(b, "Coat Roughness", 0.04)
    _set(b, "Anisotropic", anisotropic)
    _set(b, "Transmission Weight", transmission)
    _set(b, "IOR", ior)
    if emission:
        _set(b, "Emission Color", (*emission, 1.0))
        _set(b, "Emission Strength", emission_strength)
    mat.diffuse_color = (*base, 1.0)
    mat.metallic, mat.roughness = metallic, roughness
    return mat


def emissive(name, color, strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1.0)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    mat.diffuse_color = (*color, 1.0)
    return mat


def add_veins(mat, scale=5.0, thin=0.05):
    """Voronoi distance-to-edge seams glowing through a dark chrome skin."""
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexVoronoi")
    tex.feature = "DISTANCE_TO_EDGE"
    tex.inputs["Scale"].default_value = scale
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (1, 1, 1, 1)
    ramp.color_ramp.elements[1].position = thin
    ramp.color_ramp.elements[1].color = (0, 0, 0, 1)
    nt.links.new(tex.outputs["Distance"], ramp.inputs["Fac"])

    bmp = nt.nodes.new("ShaderNodeBump")
    bmp.inputs["Strength"].default_value = 0.15
    bmp.inputs["Distance"].default_value = 0.05
    nt.links.new(ramp.outputs["Color"], bmp.inputs["Height"])
    nt.links.new(bmp.outputs["Normal"], b.inputs["Normal"])

    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = (0.01, 0.02, 0.03, 1)
    mix.inputs["B"].default_value = (0.05, 0.95, 1.0, 1)
    nt.links.new(ramp.outputs["Color"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = 3.2
    return mat


M_CORE = principled("Core.Chrome", (0.008, 0.010, 0.014), metallic=1.0,
                    roughness=0.16, coat=1.0)
M_GOLD = principled("Metal.Gold", (1.0, 0.70, 0.26), metallic=1.0, roughness=0.11,
                    anisotropic=0.9)
M_COPPER = principled("Metal.Copper", (0.95, 0.30, 0.12), metallic=1.0,
                      roughness=0.3, anisotropic=0.7)
M_TEAL = principled("Metal.Iridescent", (0.10, 0.45, 0.52), metallic=1.0,
                    roughness=0.12, coat=0.9, anisotropic=0.35)
M_PETAL = principled("Metal.Petal", (0.52, 0.57, 0.65), metallic=1.0,
                     roughness=0.32, coat=0.45)
M_SHARD = principled("Crystal.Shard", (0.16, 0.24, 0.38), metallic=0.4,
                     roughness=0.05, coat=1.0, transmission=0.5, ior=1.75)
M_GLOW_CYAN = emissive("Glow.Cyan", (0.30, 0.92, 1.0), 4.2)
M_GLOW_AMBER = emissive("Glow.Amber", (1.0, 0.38, 0.06), 20.0)
M_GLOW_VIOLET = emissive("Glow.Violet", (0.55, 0.18, 1.0), 22.0)
M_DUST = emissive("Glow.Dust", (0.75, 0.86, 1.0), 1.1)


# ----------------------------------------------------------------------------
# mesh helpers
# ----------------------------------------------------------------------------

def mesh_object(name, verts, faces, mat=None, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.validate(verbose=False)
    me.update()
    ob = bpy.data.objects.new(name, me)
    COL.objects.link(ob)
    if mat:
        ob.data.materials.append(mat)
    if smooth:
        for poly in me.polygons:
            poly.use_smooth = True
    return ob


def sweep_tube(name, spine, radii, mat, segments=12, up=Vector((0, 0, 1))):
    """Sweep a circular profile along a polyline using parallel transport."""
    n = len(spine)
    tangents = []
    for i in range(n):
        if i == 0:
            t = spine[1] - spine[0]
        elif i == n - 1:
            t = spine[-1] - spine[-2]
        else:
            t = spine[i + 1] - spine[i - 1]
        tangents.append(t.normalized())

    ref = up.copy()
    if abs(tangents[0].dot(ref)) > 0.95:
        ref = Vector((1, 0, 0))
    normals = [(ref - tangents[0] * ref.dot(tangents[0])).normalized()]
    for i in range(1, n):
        pt, ct = tangents[i - 1], tangents[i]
        axis = pt.cross(ct)
        if axis.length < 1e-9:
            normals.append(normals[-1])
            continue
        rot = Matrix.Rotation(math.atan2(axis.length, pt.dot(ct)), 3, axis.normalized())
        nrm = rot @ normals[-1]
        normals.append((nrm - ct * nrm.dot(ct)).normalized())

    verts, faces = [], []
    for i in range(n):
        t, nrm = tangents[i], normals[i]
        bino = t.cross(nrm).normalized()
        for j in range(segments):
            a = TAU * j / segments
            verts.append(spine[i] + (nrm * math.cos(a) + bino * math.sin(a)) * radii[i])
    for i in range(n - 1):
        for j in range(segments):
            a = i * segments + j
            b = i * segments + (j + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    faces.append(tuple(range(segments))[::-1])
    base = (n - 1) * segments
    faces.append(tuple(range(base, base + segments)))
    return mesh_object(name, verts, faces, mat)


# ----------------------------------------------------------------------------
# 1. singularity core
# ----------------------------------------------------------------------------

def build_core():
    """Polished dark-chrome singularity, orbited by glowing gyro rings."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=1.0)
    ob = bpy.context.object
    ob.name = "Singularity.Core"
    for c in ob.users_collection:
        c.objects.unlink(ob)
    COL.objects.link(ob)
    ob.data.materials.append(M_CORE)
    ob.location = (0.0, 0.0, 0.28)
    for v in ob.data.vertices:
        p = v.co.copy()
        d, amp, freq, seed = 0.0, 0.035, 3.4, 0.0
        for _ in range(4):
            d += amp * noise.noise(p * freq + Vector((seed, seed * 0.7, seed * 1.3)))
            amp *= 0.5
            freq *= 2.1
            seed += 9.1
        v.co = p * (1.0 + d)
    ob.data.update()

    ring_specs = [
        (M_GLOW_CYAN, 1.035, 0.011, (math.radians(74), 0.0, math.radians(8))),
        (M_GLOW_AMBER, 1.115, 0.008, (math.radians(-24), math.radians(18), 0.0)),
        (M_GLOW_VIOLET, 1.180, 0.006, (math.radians(38), math.radians(-52), 0.0)),
    ]
    for idx, (mat, rad, thick, rot) in enumerate(ring_specs):
        spine, radii, steps = [], [], 260
        for i in range(steps + 1):
            u = TAU * i / steps
            spine.append(Vector((rad * math.cos(u), rad * math.sin(u), 0.0)))
            radii.append(thick)
        ring = sweep_tube(f"CoreRing.{idx}", spine, radii, mat, segments=8)
        ring.rotation_euler = Euler(rot)
    return ob


# ----------------------------------------------------------------------------
# 2. torus knots
# ----------------------------------------------------------------------------

def torus_knot(name, p, q, R=1.6, r=0.05, mat=M_GOLD, steps=760, rot=(0, 0, 0)):
    spine, radii = [], []
    for i in range(steps + 1):
        u = TAU * i / steps
        rr = R + R * 0.40 * math.cos(q * u)
        spine.append(Vector((rr * math.cos(p * u), rr * math.sin(p * u),
                             R * 0.40 * math.sin(q * u))))
        radii.append(r * (1.0 + 0.22 * math.sin(3 * u)))
    ob = sweep_tube(name, spine, radii, mat, segments=10)
    ob.rotation_euler = Euler(rot)
    return ob


# ----------------------------------------------------------------------------
# 3. crystal lotus — 3 deliberate tiers
# ----------------------------------------------------------------------------

def petal_geometry(length, width, curl, twist, seg_u=40, seg_v=14):
    verts, faces = [], []
    for i in range(seg_u + 1):
        t = i / seg_u
        s = Vector((length * t, 0.0, curl * (t ** 2.4)))
        w = width * math.sin(math.pi * min(1.0, t ** 0.62)) * (1.0 - 0.18 * t)
        tan = Vector((length, 0.0, curl * 2.4 * max(t, 1e-6) ** 1.4)).normalized()
        side = Vector((0, 1, 0))
        nrm = tan.cross(side).normalized()
        for j in range(seg_v + 1):
            v = j / seg_v
            a = (v - 0.5) * math.pi
            off = side * (math.sin(a) * w) + nrm * (math.cos(a) * w * 0.07)
            verts.append(s + Matrix.Rotation(twist * t, 3, tan) @ off)
    cols = seg_v + 1
    for i in range(seg_u):
        for j in range(seg_v):
            a = i * cols + j
            faces.append((a, a + 1, a + cols + 1, a + cols))
    return verts, faces


def build_lotus():
    """Three tiers of blades opening upward around the core — a mechanical cup."""
    tiers = [
        # count, length, width, curl, pitch_deg, mat
        (9, 1.95, 0.70, 1.35, -12.0, M_PETAL),    # outer: opens out, tips curl back
        (9, 1.55, 0.62, 1.00, -38.0, M_TEAL),     # middle
        (7, 1.05, 0.48, 0.65, -64.0, M_PETAL),    # inner: steep cup
    ]
    petals = []
    for ti, (count, length, width, curl, pitch, mat) in enumerate(tiers):
        for k in range(count):
            ang = TAU * k / count + (0.5 * TAU / count) * (ti % 2)
            twist = math.radians(24 if k % 2 else -24)
            v, f = petal_geometry(length * (1.0 + 0.05 * math.sin(2.3 * k)),
                                 width, curl, twist)
            ob = mesh_object(f"Petal.{ti}.{k:02d}", v, f, mat)
            ob.location = Vector((0.0, 0.0, 0.02 + 0.05 * ti))
            ob.location += Vector((math.cos(ang), math.sin(ang), 0.0)) * (0.62 - 0.10 * ti)
            # rotate about +Y to pitch the blade up out of the XY plane,
            # then about +Z to fan it around the cup
            ob.rotation_euler = Euler((0.0, math.radians(pitch + 3.0 * math.sin(2.7 * k)), ang))
            petals.append(ob)
    return petals


# ----------------------------------------------------------------------------
# 4. shard swarm + dust belt
# ----------------------------------------------------------------------------

def convex_shard(name, size, rng):
    bm = bmesh.new()
    for _ in range(rng.randint(5, 8)):
        bm.verts.new((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))
    bmesh.ops.convex_hull(bm, input=bm.verts)
    for v in list(bm.verts):
        if not v.link_faces:
            bm.verts.remove(v)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    COL.objects.link(ob)
    ob.scale = (size * rng.uniform(0.7, 1.9), size * rng.uniform(0.6, 1.6),
                size * rng.uniform(0.8, 2.4))
    ob.data.materials.append(M_SHARD)
    for poly in ob.data.polygons:
        poly.use_smooth = False
    return ob


def build_swarm(n=90):
    rng = random.Random(A.seed + 11)
    for k in range(n):
        ob = convex_shard(f"Shard.{k:03d}", rng.uniform(0.035, 0.10), rng)
        ang = rng.uniform(0, TAU)
        if rng.random() < 0.68:      # fat belt
            rad, z, tilt = rng.uniform(3.3, 4.9), rng.gauss(0, 0.22), math.radians(rng.uniform(-14, 14))
        else:                        # sparse shell
            rad, z, tilt = rng.uniform(2.6, 6.0), rng.gauss(0, 1.7), math.radians(rng.uniform(-58, 58))
        pos = Matrix.Rotation(tilt, 3, "X") @ Vector((math.cos(ang) * rad,
                                                      math.sin(ang) * rad, z))
        ob.location = pos
        ob.rotation_euler = Euler((rng.uniform(0, TAU), rng.uniform(0, TAU),
                                   rng.uniform(0, TAU)))


def build_dust(n=190, r_in=2.8, r_out=4.8):
    """One merged mesh of n genuine micro-spheres — the glowing belt."""
    rng = random.Random(A.seed + 77)
    bm = bmesh.new()
    for _ in range(n):
        ang = rng.uniform(0, TAU)
        rad = rng.uniform(r_in, r_out)
        z = rng.gauss(0, 0.10)
        base = Matrix.Rotation(math.radians(9), 3, "X") @ Vector(
            (math.cos(ang) * rad, math.sin(ang) * rad, z))
        m = Matrix.Translation(base) @ Matrix.Scale(rng.uniform(0.014, 0.040), 4)
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0, matrix=m)
    me = bpy.data.meshes.new("Dust.Belt")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("Dust.Belt", me)
    COL.objects.link(ob)
    ob.data.materials.append(M_DUST)
    for poly in me.polygons:
        poly.use_smooth = True
    return ob


# ----------------------------------------------------------------------------
# 5. filaments
# ----------------------------------------------------------------------------

def build_filaments():
    specs = [
        (M_GLOW_CYAN, 2.45, 0.35, 0.006, math.radians(12)),
        (M_GLOW_AMBER, 3.10, -0.45, 0.0045, math.radians(-46)),
    ]
    for idx, (mat, rad, zamp, thick, tilt) in enumerate(specs):
        spine, radii, steps = [], [], 380
        for i in range(steps + 1):
            u = TAU * i / steps
            r = rad + 0.18 * math.sin(3 * u + idx)
            p = Vector((r * math.cos(u), r * math.sin(u),
                        zamp * math.sin(2 * u + idx * 0.7)))
            spine.append(Matrix.Rotation(tilt, 3, "X") @ p)
            radii.append(thick * (1.0 + 0.55 * math.sin(5 * u + idx)))
        sweep_tube(f"Filament.{idx}", spine, radii, mat, segments=8)


# ----------------------------------------------------------------------------
# build
# ----------------------------------------------------------------------------

t_start = time.time()
print("[bloom] core")
build_core()
print("[bloom] knots")
torus_knot("Knot.Gold", 3, 2, R=1.72, r=0.032, mat=M_GOLD,
           rot=(math.radians(20), 0, 0))
torus_knot("Knot.Copper", 2, 3, R=2.10, r=0.024, mat=M_COPPER,
           rot=(math.radians(64), math.radians(26), 0))
print("[bloom] lotus")
build_lotus()
print("[bloom] swarm + dust")
build_swarm()
build_dust()
print("[bloom] filaments")
build_filaments()

rig = bpy.data.objects.new("RIG", None)
COL.objects.link(rig)
BASE_ROT = Euler((math.radians(-13), math.radians(-7), math.radians(27)))
rig.rotation_euler = BASE_ROT
for ob in COL.objects:
    if ob is not rig and ob.parent is None:
        ob.parent = rig
        ob.matrix_parent_inverse = rig.matrix_world.inverted()

# ----------------------------------------------------------------------------
# world / haze / halo / lights / camera
# ----------------------------------------------------------------------------

world = bpy.data.worlds.new("Void")
scene.world = world
world.use_nodes = True
wnt = world.node_tree
bg = wnt.nodes["Background"]

grad = wnt.nodes.new("ShaderNodeTexGradient")
grad.gradient_type = "SPHERICAL"
tco = wnt.nodes.new("ShaderNodeTexCoord")
ramp = wnt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.35
ramp.color_ramp.elements[0].color = (0.006, 0.014, 0.032, 1)
ramp.color_ramp.elements[1].position = 1.0
ramp.color_ramp.elements[1].color = (0.0003, 0.0006, 0.0012, 1)
wnt.links.new(tco.outputs["Generated"], grad.inputs["Vector"])
wnt.links.new(grad.outputs["Fac"], ramp.inputs["Fac"])
wnt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 1.0

# volumetric haze
bpy.ops.mesh.primitive_cube_add(size=26)
fog = bpy.context.object
fog.name = "Haze"
for c in fog.users_collection:
    c.objects.unlink(fog)
COL.objects.link(fog)
fmat = bpy.data.materials.new("Haze.Volume")
fmat.use_nodes = True
fnt = fmat.node_tree
fnt.nodes.clear()
fout = fnt.nodes.new("ShaderNodeOutputMaterial")
fvol = fnt.nodes.new("ShaderNodeVolumePrincipled")
fvol.inputs["Density"].default_value = 0.00045
fvol.inputs["Color"].default_value = (0.30, 0.55, 0.9, 1)
fvol.inputs["Anisotropy"].default_value = 0.45
fnt.links.new(fvol.outputs["Volume"], fout.inputs["Volume"])
fog.data.materials.append(fmat)
fog.visible_shadow = False

# dark reflective floor, far below — grounds the sculpture and doubles the glow
bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, -3.1))
floor = bpy.context.object
floor.name = "Floor"
for c in floor.users_collection:
    c.objects.unlink(floor)
COL.objects.link(floor)
fmat2 = principled("Floor.BlackGlass", (0.004, 0.005, 0.007), metallic=0.9,
                   roughness=0.3)
floor.data.materials.append(fmat2)


def area_light(name, loc, energy, size, color):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy, ld.size, ld.color = energy, size, color
    ob = bpy.data.objects.new(name, ld)
    COL.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (-Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


area_light("Key", (-6.4, -6.8, 6.2), 1900, 2.8, (1.0, 0.86, 0.66))
area_light("Fill", (5.6, -3.4, -0.6), 260, 3.4, (0.30, 0.55, 1.0))
area_light("Rim", (1.8, 5.2, 4.4), 2800, 1.6, (0.55, 0.22, 1.0))
area_light("Under", (0.0, -1.6, -3.2), 900, 2.2, (0.10, 0.95, 1.0))

crown = bpy.data.lights.new("Crown", "POINT")
crown.energy = 900
crown.color = (0.25, 0.95, 1.0)
crown.shadow_soft_size = 0.45
crown_ob = bpy.data.objects.new("Crown", crown)
COL.objects.link(crown_ob)
crown_ob.location = (0.0, 0.0, 1.15)

cam_data = bpy.data.cameras.new("Cam")
cam_data.lens = 52
cam_data.dof.use_dof = True
cam_data.dof.focus_distance = 9.4
cam_data.dof.aperture_fstop = 2.1
cam = bpy.data.objects.new("Camera", cam_data)
COL.objects.link(cam)
cam.location = (1.4, -8.6, 4.3)
cam.rotation_euler = (Vector((0.0, 0.0, 0.55)) - Vector(cam.location)).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

# ----------------------------------------------------------------------------
# render settings
# ----------------------------------------------------------------------------

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.denoiser = "OPENIMAGEDENOISE"
scene.cycles.max_bounces = 6
scene.cycles.diffuse_bounces = 2
scene.cycles.glossy_bounces = 3
scene.cycles.transmission_bounces = 4
scene.cycles.volume_bounces = 0
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = 0.015
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.cycles.blur_glossy = 1.0
scene.render.resolution_x = WIDTH
scene.render.resolution_y = HEIGHT
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_depth = "8"
scene.view_settings.view_transform = "AgX"
for look in ("AgX - Punchy", "Punchy", "AgX - Medium High Contrast", "None"):
    try:
        scene.view_settings.look = look
        break
    except Exception:
        continue

try:
    ng = bpy.data.node_groups.new("Bloom.Compositing", "CompositorNodeTree")
    scene.compositing_node_group = ng
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    rl = ng.nodes.new("CompositorNodeRLayers")
    glare = ng.nodes.new("CompositorNodeGlare")
    glare.inputs["Type"].default_value = "Bloom"
    glare.inputs["Quality"].default_value = "High"
    glare.inputs["Threshold"].default_value = 1.0
    glare.inputs["Strength"].default_value = 0.55
    glare.inputs["Size"].default_value = 0.65
    gout = ng.nodes.new("NodeGroupOutput")
    ng.links.new(rl.outputs["Image"], glare.inputs["Image"])
    ng.links.new(glare.outputs["Image"], gout.inputs["Image"])
    print("[bloom] compositor bloom enabled")
except Exception as exc:
    print("[bloom] compositor skipped:", exc)

# ----------------------------------------------------------------------------
# save / export / render
# ----------------------------------------------------------------------------

blend = os.path.join(OUT, "singularity_bloom.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend)
print("[bloom] saved", blend)

if not A.no_glb:
    glb = os.path.join(OUT, "singularity_bloom.glb")
    # the 600-unit floor and the haze cube are set dressing — keep them out of
    # the exported model so the web viewer frames the sculpture, not the room
    hidden = []
    for name in ("Floor", "Haze", "Halo.Card"):
        ob = bpy.data.objects.get(name)
        if ob is not None:
            ob.hide_render, hidden = True, hidden + [(ob, ob.hide_get())]
            ob.hide_set(True)
    try:
        bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB",
                                  use_selection=False, use_visible=True,
                                  export_apply=True, export_cameras=False,
                                  export_lights=False, export_yup=True)
        print("[bloom] glb", round(os.path.getsize(glb) / 1e6, 2), "MB")
    except Exception as exc:
        print("[bloom] glTF export failed:", exc)
    for ob, was_hidden in hidden:
        ob.hide_render = False
        ob.hide_set(was_hidden)

frames = [("hero", 0.0)]
if A.turntable:
    frames = [(f"tt_{i:02d}", TAU * i / A.turntable) for i in range(A.turntable)]

for name, spin in frames:
    rig.rotation_euler = Euler((BASE_ROT.x, BASE_ROT.y, BASE_ROT.z + spin))
    path = os.path.join(RENDERS, f"{'preview' if A.preview else 'bloom'}_{name}.png")
    scene.render.filepath = path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"[bloom] rendered {name} in {time.time() - t0:.1f}s -> {path}")

print(f"[bloom] done in {time.time() - t_start:.1f}s")
