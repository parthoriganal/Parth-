"""Layered Cycles materials and Kelvin/sun-sky lighting recipes for M/02."""

from math import radians

import bpy
from mathutils import Vector

from production.studio import area, rgb


def surface(name, color, *, rough=.45, metal=0., coat=0., ior=1.46, transmission=0.,
            scale=27., rough_spread=.10, bump_depth=.006, direction=(1.,1.,1.), tint=.07):
    """Map aggregate/scratch noise into base tint, roughness and micro-normal; no image assets."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = base = (*rgb(color),1.)
    n, l = mat.node_tree.nodes, mat.node_tree.links
    p = next(x for x in n if x.type == 'BSDF_PRINCIPLED')
    p.label = 'Layered dielectric / conductor'
    for key, value in {'Base Color':base, 'Metallic':metal, 'Roughness':rough, 'IOR':ior,
                       'Coat Weight':coat, 'Coat Roughness':.2, 'Transmission Weight':transmission}.items():
        p.inputs[key].default_value = value
    if direction != (1.,1.,1.):
        p.inputs['Anisotropic'].default_value = .43
    if not (bump_depth or tint or rough_spread):
        return mat
    coords = n.new('ShaderNodeTexCoord'); coords.location = (-890,100)
    mapping = n.new('ShaderNodeVectorMath'); mapping.operation='MULTIPLY'; mapping.label='Scratch stretch / scale'
    mapping.location=(-690,100); mapping.inputs[1].default_value=direction
    l.new(coords.outputs['Object'],mapping.inputs[0])
    grain = n.new('ShaderNodeTexNoise'); grain.label='Microstructure'; grain.location=(-490,100)
    grain.inputs['Scale'].default_value=scale; grain.inputs['Detail'].default_value=1.7
    l.new(mapping.outputs['Vector'],grain.inputs['Vector'])
    if tint:
        ramp = n.new('ShaderNodeValToRGB'); ramp.label='Albedo variation'; ramp.location=(-235,255)
        ramp.color_ramp.elements[0].color=tuple(c*(1-tint) for c in base[:3])+(1.,)
        ramp.color_ramp.elements[1].color=tuple(min(1.,c*(1+tint)) for c in base[:3])+(1.,)
        l.new(grain.outputs['Fac'],ramp.inputs[0]); l.new(ramp.outputs['Color'],p.inputs['Base Color'])
    if rough_spread:
        gloss = n.new('ShaderNodeMapRange'); gloss.label='Roughness envelope'; gloss.location=(-215,-30)
        gloss.inputs['To Min'].default_value=max(.035,rough-rough_spread)
        gloss.inputs['To Max'].default_value=min(.96,rough+rough_spread)
        l.new(grain.outputs['Fac'],gloss.inputs['Value']); l.new(gloss.outputs['Result'],p.inputs['Roughness'])
    if bump_depth:
        bump = n.new('ShaderNodeBump'); bump.label='Micro-normal (scene units)'; bump.location=(-190,-260)
        bump.inputs['Strength'].default_value=.28; bump.inputs['Distance'].default_value=bump_depth
        l.new(grain.outputs['Fac'],bump.inputs['Height']); l.new(bump.outputs['Normal'],p.inputs['Normal'])
        if coat:
            l.new(bump.outputs['Normal'],p.inputs['Coat Normal'])
    return mat


def signal(name, color, frames, values=(.45,1.7,.68,1.25)):
    mat = surface(name,color,rough=.34,coat=.25,bump_depth=0,tint=0,rough_spread=0)
    p = next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Emission Color'].default_value=mat.diffuse_color
    pin = p.inputs['Emission Strength']
    for i, power in enumerate(values):
        pin.default_value=power
        pin.keyframe_insert(data_path='default_value',frame=1+round(i*(frames-1)/(len(values)-1)))
    return mat


# Scene-referred sun strengths / physical emitters (not calibrated light measurements).
RIGS = {
    'amber': {'sun':(22,248,1.62,3870,6.), 'sky':.14, 'key':((-3.1,-4.8,6.4),2700,4.0,4800),
              'edge':((3.0,4.7,5.1),2600,4.1,7900), 'fill':((-6.0,1.8,3.8),620,6.0,6450)},
    'verdant': {'sun':(35,222,1.45,5350,6.), 'sky':.14, 'key':((-2.2,-5.7,7.0),2650,3.9,5000),
                'edge':((3.9,4.4,5.3),2200,4.3,7400), 'fill':((-5.2,-.8,3.9),560,5.5,6600)},
    'polar': {'sun':(26,227,1.21,5940,8.), 'sky':.135, 'key':((-3.2,-5.7,6.3),1960,4.4,5500),
              'edge':((4.0,3.4,6.8),2700,4.2,9800), 'fill':((-6.3,1.4,4.6),610,5.2,7600)},
}


def illuminate(scene, group, recipe):
    rig = RIGS[recipe]
    elevation, azimuth, energy, temp, radius = rig['sun']
    world = bpy.data.worlds.new(f'{recipe.title()} • procedural atmospheric sky')
    world.use_nodes = True
    tree = world.node_tree
    sky = tree.nodes.new('ShaderNodeTexSky')
    sky.sky_type = 'MULTIPLE_SCATTERING'
    sky.sun_elevation, sky.sun_rotation = radians(elevation), radians(azimuth)
    sky.sun_disc = False  # the editable Sun lamp owns the direct shadow
    sky.altitude = 1.6 if recipe=='polar' else .12
    bg = tree.nodes.get('Background')
    tree.links.new(sky.outputs['Color'],bg.inputs[0]); bg.inputs[1].default_value=rig['sky']
    scene.world = world
    lamp = bpy.data.lights.new('Key sun • disk angle & Kelvin', 'SUN')
    lamp.energy,lamp.angle,lamp.use_temperature,lamp.temperature = energy,radians(radius),True,temp
    sun = bpy.data.objects.new(lamp.name,lamp); group.objects.link(sun)
    from math import cos, sin
    e,a = radians(elevation),radians(azimuth)
    sun.rotation_euler = Vector((-cos(e)*cos(a),-cos(e)*sin(a),-sin(e))).to_track_quat('-Z','Y').to_euler()
    softboxes = []
    for role in ('key','edge','fill'):
        at, watts, size, kelvin = rig[role]
        obj = area(group,role.title()+' • temperature / size',at,(0,0,1.05),watts,size,(1,1,1),height=size*.8)
        obj.data.use_temperature=True; obj.data.temperature=kelvin
        softboxes.append(obj.data)
    return {'sky':sky.sky_type,'sun_kelvin':temp,'sun_disk_deg':radius,
            'area_kelvin':[round(o.temperature) for o in softboxes]}
