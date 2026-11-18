"""Layered skin, woven fabrics, coated eyes and procedural fiber shaders."""

from pathlib import Path
from tempfile import TemporaryDirectory

import bpy

from meridian_m02.look import surface
from production.studio import rgb


def swatch(s):
    return (*rgb(s),1.)


def bsdf(mat):
    return next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')


def packed(raw, name, noncolor=False):
    with TemporaryDirectory(prefix='arena-human-') as temp:
        path=Path(temp)/Path(name).name
        path.write_bytes(raw[name])
        img=bpy.data.images.load(str(path),check_existing=False)
        if noncolor:
            img.colorspace_settings.name='Non-Color'
        img.pack(); img.filepath='//'+Path(name).name
    return img


def texture(mat,img,label,loc):
    n=mat.node_tree.nodes.new('ShaderNodeTexImage')
    n.image=img; n.label=label; n.location=loc
    return n


def skin(raw):
    mat=bpy.data.materials.new('Arun • melanin / flush / pores'); mat.use_nodes=True
    mat.diffuse_color=swatch('A76E52')
    tree=mat.node_tree; n=tree.nodes; l=tree.links; p=bsdf(mat)
    p.label='Meter-scale subsurface skin'; p.location=(590,240)
    p.inputs['Roughness'].default_value=.47
    p.inputs['Subsurface Weight'].default_value=.20
    p.inputs['Subsurface Radius'].default_value=(1,.48,.27)
    p.inputs['Subsurface Scale'].default_value=.012
    p.inputs['IOR'].default_value=1.41
    p.inputs['Specular IOR Level'].default_value=.30
    co=n.new('ShaderNodeTexCoord'); co.location=(-1170,280)
    color=n.new('ShaderNodeTexNoise'); color.label='Broad pigmentation'; color.location=(-910,470)
    color.inputs['Scale'].default_value=31
    color.inputs['Detail'].default_value=2.3
    fixed=n.new('ShaderNodeVectorMath');fixed.operation='MULTIPLY';fixed.label='Bind-space pore and pigment scale'
    fixed.inputs[1].default_value=(1.17,.28,1.07);fixed.location=(-920,710)
    l.new(co.outputs['Generated'],fixed.inputs[0]);l.new(fixed.outputs['Vector'],color.inputs['Vector'])
    ramp=n.new('ShaderNodeValToRGB'); ramp.location=(-650,490)
    ramp.color_ramp.elements[0].color=swatch('90563E')
    ramp.color_ramp.elements[1].color=swatch('BB8666')
    l.new(color.outputs['Fac'],ramp.inputs[0]); result=ramp.outputs['Color']
    for idx,(mask,c,power) in enumerate([
        ('face','B57C60',.16),('ears','A06455',.72),('eyelids','885644',.54),
        ('lips','965447',.91),('fingernails','BA8D77',.83),('inside-mouth','54291D',.94),
    ]):
        image=texture(mat,packed(raw,f'masks/{mask}.jpg',True),mask,(-950,170-210*idx))
        l.new(co.outputs['UV'],image.inputs['Vector'])
        fac=n.new('ShaderNodeMath'); fac.operation='MULTIPLY'; fac.inputs[1].default_value=power
        fac.location=(-590,100-200*idx); l.new(image.outputs['Color'],fac.inputs[0])
        blend=n.new('ShaderNodeMixRGB'); blend.location=(-320+idx*135,440-70*idx); blend.label=mask.title()+' complexion'
        l.new(fac.outputs[0],blend.inputs[0]); l.new(result,blend.inputs[1]); blend.inputs[2].default_value=swatch(c)
        result=blend.outputs['Color']
    beard=n.new('ShaderNodeAttribute'); beard.attribute_name='beard_shadow'; beard.location=(40,-695)
    blend=n.new('ShaderNodeMixRGB'); blend.location=(425,405); blend.label='Shaven skin color at beard line'
    l.new(beard.outputs['Fac'],blend.inputs[0]); l.new(result,blend.inputs[1]); blend.inputs[2].default_value=swatch('775A49')
    rim=n.new('ShaderNodeAttribute');rim.attribute_name='lid_margin';rim.location=(85,-900)
    eyelid=n.new('ShaderNodeMixRGB');eyelid.label='Deforming upper eyelid margin';eyelid.location=(630,504)
    l.new(rim.outputs['Fac'],eyelid.inputs[0]);l.new(blend.outputs['Color'],eyelid.inputs[1]);eyelid.inputs[2].default_value=swatch('572E24')
    l.new(eyelid.outputs['Color'],p.inputs['Base Color'])
    pores=n.new('ShaderNodeTexNoise'); pores.label='Fine pore grain'; pores.location=(-420,-470)
    pores.inputs['Scale'].default_value=805; pores.inputs['Detail'].default_value=2
    l.new(fixed.outputs['Vector'],pores.inputs['Vector'])
    bump=n.new('ShaderNodeBump'); bump.label='Microsurface only'; bump.location=(360,-310)
    bump.inputs['Strength'].default_value=.16; bump.inputs['Distance'].default_value=.0005
    l.new(pores.outputs['Fac'],bump.inputs['Height']); l.new(bump.outputs['Normal'],p.inputs['Normal'])
    return mat


def eyes(raw):
    mat=bpy.data.materials.new('Iris & sclera • wet dielectric'); mat.use_nodes=True
    mat.diffuse_color=swatch('B8A282')
    p=bsdf(mat); tree=mat.node_tree
    img=texture(mat,packed(raw,'brown-eye.png'),'Tinted sclera and brown iris',(-430,160))
    tint=tree.nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.label='Subtle warm sclera tone'
    tint.inputs[0].default_value=1.;tint.inputs[2].default_value=(.88,.78,.71,1.)
    tree.links.new(img.outputs['Color'],tint.inputs[1]);tree.links.new(tint.outputs['Color'],p.inputs['Base Color'])
    p.inputs['Roughness'].default_value=.25
    p.inputs['Coat Weight'].default_value=.78; p.inputs['Coat Roughness'].default_value=.115
    p.inputs['IOR'].default_value=1.384
    p.inputs['Subsurface Weight'].default_value=.08; p.inputs['Subsurface Scale'].default_value=.006
    return mat


def cloth(name, color, rough=.67):
    mat=surface(name,color,rough=rough,scale=510,direction=(1.26,1.44,.54),rough_spread=.08,bump_depth=.00115,tint=.075)
    p=bsdf(mat); p.inputs['Sheen Weight'].default_value=.32
    p.inputs['Sheen Roughness'].default_value=.55
    p.inputs['Anisotropic'].default_value=.11
    return mat


def fibers(color,name='Hair • dark fiber'):
    m=bpy.data.materials.new(name); m.use_nodes=True
    m.diffuse_color=swatch(color)
    n=m.node_tree.nodes; p=bsdf(m)
    p.inputs['Base Color'].default_value=m.diffuse_color
    p.inputs['Roughness'].default_value=.38
    p.inputs['Coat Weight'].default_value=.19
    p.inputs['Anisotropic'].default_value=.56
    p.inputs['Specular IOR Level'].default_value=.30
    return m
