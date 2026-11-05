"""Generate and render NEON SINGULARITY with Blender's bpy Python package."""
import bpy, math, random
from mathutils import Vector
random.seed(21)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
s=bpy.context.scene
s.render.engine='CYCLES'; s.cycles.samples=32
s.cycles.use_denoising=True
s.render.resolution_x=1000; s.render.resolution_y=1000; s.render.resolution_percentage=100
s.world.color=(0.001,0.001,0.003)
s.view_settings.view_transform='AgX'
# Materials
def mat(name, color, metallic=0, rough=.3, emission=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metallic; p.inputs['Roughness'].default_value=rough
 if emission: p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
 return m
black=mat('Obsidian',(.012,.018,.035),.8,.22); violet=mat('Ultraviolet',(.38,.025,1),.3,.22,5); cyan=mat('Electric cyan',(.01,.8,1),.2,.2,5); gold=mat('Molten gold',(1,.21,.025),.5,.25,3); chrome=mat('Dark chrome',(.075,.09,.15),.9,.18)
def uv(name, loc, scale, material, segments=32):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=16, location=loc); o=bpy.context.object; o.name=name; o.scale=scale if isinstance(scale,tuple) else (scale,)*3; o.data.materials.append(material); bpy.ops.object.shade_smooth(); return o
def torus(name,loc,major,minor,material,rot=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_segments=128,minor_segments=12,location=loc,major_radius=major,minor_radius=minor,rotation=rot); o=bpy.context.object;o.name=name;o.data.materials.append(material); bpy.ops.object.shade_smooth(); return o
def cube(name,loc,scale,material, bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel: mod=o.modifiers.new('Edge glints','BEVEL');mod.width=bevel;mod.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL')
 return o
# Floating terraced plinth
for z,r,d in [(-.9,2.6,.22),(-.68,2.3,.20),(-.48,1.95,.18)]:
 bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=r, depth=d, location=(0,0,z));o=bpy.context.object;o.data.materials.append(black);mod=o.modifiers.new('Beveled edges','BEVEL');mod.width=.07;mod.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL')
 torus('Plinth light', (0,0,z+d/2+.01),r*.91,.012,cyan)
# Levitation core
uv('Singularity',(0,0,1.25),.78,black,64)
uv('Core',(0,0,1.25),.48,violet,64)
for i in range(13):
 a=i*math.tau/13
 o=cube('Orbiting shard',(1.0*math.cos(a),1.0*math.sin(a),1.25+random.uniform(-.3,.3)),(.16,.27,random.uniform(.5,1.1)),chrome,.025);o.rotation_euler=(random.uniform(-.4,.4),random.uniform(-.4,.4),a)
for radius,ang,ma in [(1.15,(.4,.2,.1),cyan),(1.42,(1.15,.3,.4),violet),(1.72,(.8,-.65,.2),gold)]:
 torus('Gyroscopic orbit',(0,0,1.25),radius,.018,ma,ang)
# pillars surrounding the core
for i in range(8):
 a=math.tau*i/8; x,y=2.15*math.cos(a),2.15*math.sin(a); h=random.uniform(.65,1.4)
 cube('Obelisk',(x,y,-.35+h/2),(.17,.17,h),black,.035)
 uv('Beacon',(x,y,-.35+h),.075,cyan if i%2 else gold)
# airborne particles
for i in range(170):
 a=random.random()*math.tau; r=random.uniform(2.4,6.8); z=random.uniform(-.6,5.5)
 uv('Stardust',(r*math.cos(a),r*math.sin(a),z),random.uniform(.008,.035),random.choice([cyan,violet,gold]),12)
# Giant distant sun
o=uv('Distant sun',(0,4,3.3),1.65,mat('Sun',(0.65,.045,.18),.1,.4,1.5),64)
# Floating planetary stones
for i in range(35):
 a=random.random()*math.tau;r=random.uniform(2.8,5.3);z=random.uniform(-1.1,3.8)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=random.uniform(.05,.22),location=(r*math.cos(a),r*math.sin(a),z));bpy.context.object.data.materials.append(chrome)
# floor
cube('Ground',(0,0,-1.5),(200,200,.1),mat('Ground material',(.008,.012,.025),.45,.32),0)
def aim(o, p): o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def light(name,loc,color,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,1))
light('Cyan key',(4,-5,7),(.03,.65,1),1100,5);light('Magenta rim',(-4,3,5),(1,.02,.35),1500,4);light('Gold edge',(2,4,3),(1,.26,.03),900,3)
bpy.ops.object.camera_add(location=(7,-11,6));cam=bpy.context.object;aim(cam,(0,0,1.25));cam.data.type='ORTHO';cam.data.ortho_scale=8.7;s.camera=cam
# Glow compositor
s.use_nodes=True;n=s.node_tree.nodes;n.clear();rl=n.new('CompositorNodeRLayers');gl=n.new('CompositorNodeGlare');gl.glare_type='FOG_GLOW';gl.quality='HIGH';gl.threshold=1.3;gl.size=7;out=n.new('CompositorNodeComposite');s.node_tree.links.new(rl.outputs['Image'],gl.inputs['Image']);s.node_tree.links.new(gl.outputs['Image'],out.inputs['Image'])
s.render.image_settings.file_format='PNG';s.render.filepath='//neon-singularity.png'
bpy.ops.wm.save_as_mainfile(filepath='blender-art/neon-singularity.blend')
bpy.ops.render.render(write_still=True)
