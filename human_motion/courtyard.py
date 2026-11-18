"""Sun, stone, planted olive trees and a continuous, editable camera move."""

from math import atan2, cos, pi, sin, tau, radians

import bpy
import numpy as np
from mathutils import Vector

from meridian_m02.look import illuminate, surface
from production.studio import box, camera_move, collection, label, lathe, mesh
from .character import tube_mesh


def arch(grp,x,y,z,rx,rise,w,mat):
    """Mortared radial stones with open space below the arch, not a wall decal."""
    for j in range(14):
        a=(j+.017)*pi/14;b=(j+1-.017)*pi/14
        pp=[]
        for yy in (-.125,.21):
            for r in (0.,w):
                pp.extend((x+(rx+r)*cos(t),y+yy,z+(rise+r)*sin(t)) for t in np.linspace(a,b,6))
        ff=[]
        for j1 in range(5):
            i=j1
            ff.extend(((i,i+1,i+7,i+6),(12+i,18+i,19+i,13+i),
                       (i,12+i,13+i,i+1),(i+6,i+7,i+19,i+18)))
        ff.extend(((0,6,18,12),(5,17,23,11)))
        ob=mesh(grp,'Individual arch voussoir',pp,ff,[mat[j%len(mat)]])
        mod=ob.modifiers.new('Stone arris','BEVEL'); mod.width=.008; mod.segments=2
        ob.modifiers.new('Stone face normals','WEIGHTED_NORMAL')


def olive(grp,location,size,seed,mats):
    rng=np.random.default_rng(seed)
    x,y,z=location
    center=Vector(location)
    def P(a,b,c): return center+Vector((a*size,b*size,c*size))
    trunk=[P(0,0,0),P(.07,.045,.41),P(.027,.08,.91),P(-.08,.11,1.37),P(.03,.145,1.90),P(.13,.16,2.40)]
    tube_mesh(grp,'Olive • crooked main bole',[trunk[:4]],mats['bark'],.088*size)
    tube_mesh(grp,'Olive • leader',[trunk[3:]],mats['bark'],.047*size)
    branches=[]; branch2=[]; leaves=[]; tips=[]
    for i in range(18):
        a=i*2.39996+.44
        h=rng.uniform(.98,2.28)
        r=rng.uniform(.41,.98)*(1.16-.20*(h-1.2))
        k=Vector((cos(a),sin(a),0.))
        points=[P(-.025,.075,h),P(k.x*r*.32,k.y*r*.32,h+.26),P(k.x*r*.71,k.y*r*.71,h+.47),P(k.x*r,k.y*r,h+.64)]
        branches.append(points)
        for j in range(9):
            u=(j+.30)/9
            b=points[1].lerp(points[-1],u)
            aa=a+rng.uniform(-.9,.9)+(j%2-.5)*1.3
            outward=Vector((cos(aa),sin(aa),rng.uniform(.22,.66))).normalized()
            length=rng.uniform(.14,.49)*size
            end=b+outward*length
            branch2.append([b,b.lerp(end,.51)+Vector((0,0,.054*size)),end]); tips.append((end,outward))
    tube_mesh(grp,'Olive • scaffold branches',branches,mats['bark'],.025*size)
    tube_mesh(grp,'Olive • terminal shoots',branch2,mats['branch'],.0051*size)
    vs=[]; fs=[]; ix=[]
    for end,outward in tips:
        for _ in range(27):
            p=end+Vector(rng.uniform(-.25,.25,3)*size)
            e=(outward+Vector(rng.uniform(-1,1,3))*.76).normalized()
            u=e.cross(Vector((0,0,1))).normalized()
            v=e.cross(u)
            n=len(vs); l=rng.uniform(.032,.076)*size; w=rng.uniform(.008,.021)*size
            vs.extend(tuple(z) for z in (p-e*l*.47,p+u*w*.55,p+e*l*.67,p-u*w*.55,p+v*w*.25))
            fs.extend((n+a,n+b,n+4) for a,b in ((0,1),(1,2),(2,3),(3,0)))
            c=int(rng.integers(len(mats['leaf'])))
            ix.extend([c]*4)
    mesh(grp,'Olive • individually faceted lanceolate leaves',vs,fs,mats['leaf'],ix,smooth=False)


def scatter(grp,name,locations,palette,seed):
    rng=np.random.default_rng(seed); vs=[]; fs=[]; ix=[]
    for x,y,z,s in locations:
        i=len(vs)
        w=s*rng.uniform(.5,1.)
        h=s*rng.uniform(.3,.8)
        for k in range(5):
            angle=k*tau/5
            vs.append((x+s*cos(angle),y+w*sin(angle),z))
        vs.append((x+s*rng.uniform(-.5,.5),y+w*rng.uniform(-.5,.5),z+h))
        fs.extend((i+k,i+(k+1)%5,i+5) for k in range(5))
        ix.extend([int(rng.integers(len(palette)))]*5)
    mesh(grp,name,vs,fs,palette,ix)


def courtyard(scene):
    group=collection('04 • Location / Field Notes courtyard')
    planted=collection('05 • Location / olive, dirt and stone')
    light=collection('06 • Exterior / low afternoon sun and sky')
    m=lambda name,col,**k:surface(name,col,**k)
    pale=[m('Limestone grade '+str(i),c,rough=.79,scale=39,bump_depth=.011,tint=.20) for i,c in enumerate(('CCB995','C3AD88','D3BF9C','C6B391','BBA580'))]
    floor=[m('Sawn sandstone flags '+str(i),c,rough=.77,scale=47,bump_depth=.009,tint=.16) for i,c in enumerate(('C0B39A','B9AD97','C8BCA2','AEA18B','C5B69B','BFB29C'))]
    gravel=m('Planter • washed aggregate','8E8269',rough=.95,scale=63,bump_depth=.029,tint=.31)
    mortar=m('Mortar and shaded joints','8B8473',rough=.91,scale=105,bump_depth=.011,tint=.27)
    plaster=m('Limewash return wall','D1BD98',rough=.92,scale=9,bump_depth=.017,tint=.075)
    slate=m('Deep blue-gray architectural steel','36454B',rough=.43,metal=.40,scale=225,bump_depth=.002)
    glass=m('Old glazing • softened highlights','505F59',rough=.23,metal=.28,coat=.54,scale=65,bump_depth=.0028)
    walnut=m('Oiled bench and shutter slats','6D4D36',rough=.55,direction=(.16,8.,3.),scale=81,bump_depth=.005,tint=.31)
    bronze=m('Rendered bronze letterforms','D9AF6F',rough=.52,metal=.20,scale=120,bump_depth=.0004)
    sand=m('Dust and umber','756249',rough=.95,scale=67,bump_depth=.018,tint=.24)
    bark=m('Olive • longitudinal bark','584937',rough=.92,direction=(2.,2.,.11),scale=80,bump_depth=.016,tint=.36)
    subbark=m('Olive • dry branch tips','75654E',rough=.88,scale=74,bump_depth=.004)
    leaves=[m('Olive • dual-sided leaf '+str(i),c,rough=.52,scale=450,coat=.14,bump_depth=.0003,tint=.15) for i,c in enumerate(('526341','616E44','68794D','7E8759','9BA17A','4B613C'))]
    box(group,'Continuous ground below paving joints',(0,0,-.075),(55,50,.13),mortar,.0)
    rng=np.random.default_rng(3142)
    for j in range(16):
        yy=-10.6+j*.86
        for i in range(-7,8):
            xx=i*1.12+(.56 if j%2==0 else 0.)
            box(group,'Sandstone flag',(xx,yy,-.029),(1.112,.852,.058),floor[int(rng.integers(len(floor)))],.004)
    for j in range(6):
        x=-7.16+(j-.5)*3.15; y=3.06
        for k in range(5):
            box(group,'Shared arcade pier course',(x,y,k*.405+.177),(.83,.728,.393),pale[(j+k)%len(pale)],.012)
        box(group,'Pier impost',(x,y,1.955),(.859,.80,.158),pale[-1],.014)
    for j in range(5):
        x=-7.16+j*3.15; y=3.06
        sp=1.99; r=1.16
        arch(group,x,y-.37,sp,r,1.00,.235,pale)
        box(group,'Recess wall',(x,y+.88,1.83),(3.153,.24,3.66),plaster,.025)
        box(group,'Recessed steel opening',(x,y+.735,1.29),(1.31,.09,2.54),slate,.028)
        for si in (-1,1):
            for k in range(3):
                box(group,'Recessed window light',(x+si*.317,y+.682,.48+k*.776),(.584,.062,.726),glass,.011)
        for k in range(3):
            box(group,'Deep horizontal arcade cornice',(x,y,3.26+k*.141),(3.16,1.53+.10*k,.115),pale[(j+k+1)%len(pale)],.012)
        for k in range(3):
            box(group,'Enclosing mass above arcade',(x,y+.28,3.72+k*.494),(3.155,.66,.480),pale[(j+k)%len(pale)],.015)
    for j in range(4):
        x=-8.24; y=1.8-j*2.52
        box(group,'Masonry boundary / side building',(x,y,1.54),(.68,2.515,3.08),pale[(j+1)%len(pale)],.025)
        for k in range(2):
            box(group,'Deep blue shutter',(x+.36,y+(k-.5)*.46,1.81),(.052,.442,1.47),slate,.013)
            for sl in range(11):
                box(group,'Shutter blade',(x+.393,y+(k-.5)*.46,1.18+sl*.114),(.038,.405,.086),walnut,.005)
    for i,(x,y,s) in enumerate(((-3.47,.45,1.13),(3.35,.74,1.08),(-5.9,2.19,1.23),(6.45,.80,.99))):
        lathe(planted,'Olive • lipped porous stone planter',(x,y,0),[(.47,.008),(.49,.037),(.54,.38),(.58,.44),(.59,.48),(.54,.484),(.50,.421)],
              [pale[i],mortar],[0,0,0,0,0,1],sides=44)
        lathe(planted,'Olive • packed gravel bed',(x,y,0),[(.48,.40),(.525,.448)],[gravel],sides=36)
        pts=[]
        for _ in range(290):
            a=rng.uniform(0,tau); r=rng.uniform(.07,.50)
            pts.append((x+r*cos(a),y+r*sin(a),.448,rng.uniform(.006,.024)))
        scatter(planted,'Tiny stones in planted basin',pts,[mortar,*pale],342+i)
        olive(planted,(x,y,.435),s,88+17*i,{'bark':bark,'branch':subbark,'leaf':leaves})
    # A timber waiting bench, small typographic plaque, and edge planting create scale without distracting from the actor.
    for x,y in ((2.82,2.02),(-5.40,-.15)):
        for xx in (-.69,.69):
            box(group,'Bench cast leg',(x+xx,y,.22),(.092,.39,.43),slate,.018)
        for ii in range(5):
            box(group,'Bench timber slat',(x,y+(ii-2)*.087,.458),(1.81,.077,.070),walnut,.012)
        box(group,'Bench lower rail',(x,y,.174),(1.53,.042,.07),slate,.009)
    box(group,'Small wayfinding plaque',(2.304,2.668,1.55),(.352,.048,.251),slate,.014)
    label(group,'Courtyard wayfinding','FIELD NOTES',(2.304,2.641,1.575),.032,bronze)
    label(group,'Courtyard wayfinding number','COURT  /  04',(2.304,2.641,1.518),.018,bronze)
    pts=[]
    for _ in range(450):
        x=rng.uniform(-7,7); y=rng.uniform(-4.5,3.3)
        if abs(x)<.80: continue
        pts.append((x,y,.0001,rng.uniform(.003,.018)))
    scatter(planted,'Path edge aggregate and dry leaves',pts,[sand,mortar,pale[0],leaves[-2]],781)
    atmosphere=illuminate(scene,light,'amber')
    sun=bpy.data.lights['Key sun • disk angle & Kelvin']; sun.temperature=4880; sun.energy=2.09; sun.angle=radians(3.0)
    sky=next(n for n in scene.world.node_tree.nodes if n.type=='TEX_SKY')
    e,a=radians(31),radians(235)
    sky.sun_elevation=e; sky.sun_rotation=a
    light.objects[sun.name].rotation_euler=Vector((-cos(e)*cos(a),-cos(e)*sin(a),-sin(e))).to_track_quat('-Z','Y').to_euler()
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.19
    for name,watts in (('Key',740),('Edge',660),('Fill',370)):
        bpy.data.lights[name+' • temperature / size'].energy=watts
    return atmosphere


def camera(scene,frames,fps):
    group=collection('07 • Cinema / uninterrupted dolly and focus pull')
    z=(frames-1)/fps
    keys=[(0.,(1.69,-4.85,1.27),(-.27,.055,.948),43),
          (2.62,(1.51,-4.80,1.31),(-.225,.01,.974),44),
          (4.14,(1.35,-5.23,1.38),(-.13,-.97,.946),46),
          (5.86,(1.10,-5.88,1.47),(-.105,-2.42,1.235),54),
          (6.94,(.89,-5.29,1.65),(-.074,-2.48,1.466),65),
          (7.89,(.73,-4.60,1.70),(-.032,-2.53,1.616),98),
          (8.46,(.68,-4.68,1.675),(-.043,-2.53,1.606),92),
          (9.83,(.61,-5.16,1.57),(-.195,-2.55,1.414),53),
          (11.37,(.49,-5.19,1.57),(-.200,-2.55,1.412),54),
          (13.46,(.45,-5.10,1.60),(-.166,-2.55,1.411),56),
          (z,(.41,-5.04,1.62),(-.141,-2.55,1.436),57)]
    cam=camera_move(scene,group,frames,[(t/z,p,q,l) for t,p,q,l in keys],aperture=5.6)
    cam.name='CAM • the passerby / 43–98 mm continuous dolly'
    cam.data.sensor_width=36
    cam.data.dof.aperture_blades=9
    target=cam.data.dof.focus_object
    for t,_,aim,lens in keys:
        frame=1+round(t*fps)
        cam.data.dof.aperture_fstop=4.4 if lens>=65 else 6.3
        cam.data.keyframe_insert(data_path='dof.aperture_fstop',frame=frame)
        target.location=Vector((aim[0]*.30,aim[1]-.105,1.646 if lens>=76 else 1.57 if t>5.50 else 1.20))
        target.keyframe_insert(data_path='location',frame=frame)
    scene.frame_set(1)
    return cam
