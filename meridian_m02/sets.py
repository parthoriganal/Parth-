"""Three open-section climate station kits, built from seed and module count."""

from dataclasses import dataclass
from math import atan2, cos, pi, sin, tau

import numpy as np
import trimesh
from mathutils import Vector

from production.studio import box, collection, empty, label, lathe, mesh, ring
from .geometry import ModuleStats, bar, footprint, links_from, parent_local, patch, slab
from .look import signal, surface
from .rig import build_walker


@dataclass
class SetResult:
    kind: str
    focus: list  # bounds for the hero structure, not an automated aesthetic score
    mover: object
    stats: dict
    walker: object = None


def plinth(kind, mats, s, w=10.15, d=7.4):
    grp=collection('00 • Exhibition / cast substrate')
    slab(s,grp,'Chamfered graphite substrate',footprint(w,d,.54),-.70,-.31,mats['base'],.07)
    slab(s,grp,'Thin architectural reveal',footprint(w-.13,d-.13,.51),-.325,-.265,mats['line'],.022)
    slab(s,grp,'Upper site datum',footprint(w-.25,d-.25,.49),-.273,.035,mats['deck'],.035)
    box(grp,'Inset index block',(0,-d*.5-.015,-.49),(2.85,.125,.28),mats['base'],.026)
    label(grp,'Packed datum typography',kind,(0,-d*.5-.081,-.555),.135,mats['line'])
    box(grp,'Seamless exhibition ground',(0,0,-.89),(1600,1600,.18),mats['ground'])
    return grp


def common(accent,kind):
    base, deck, ground, line = {
        'tidal':('122C31','395D58','1A353B','B9C7A0'),
        'glasshouse':('1D3329','626B4F','314029','D7D9AE'),
        'alpine':('203141','8B9DAA','263448','C9DADA'),
    }[kind]
    return {'base': surface('Base • powder-coated cast alloy',base,rough=.41,metal=.2,coat=.13),
            'deck': surface('Site datum • mineral composite',deck,rough=.68,scale=12,bump_depth=.012,tint=.18),
            'ground': surface('Cyclorama • velvet matte',ground,rough=.82,bump_depth=0,tint=0,rough_spread=0),
            'line':surface('Datum • engraved paint',line,rough=.5,bump_depth=0,rough_spread=0),
            'metal':surface('Frame • brushed anodized aluminium',accent,rough=.31,metal=.81,coat=.26,
                            scale=44,direction=(.55,8.,1.6),rough_spread=.088,bump_depth=.004,tint=.13),
            'trim':surface('Dark conductor • gasket + grating',base,rough=.37,metal=.48,coat=.18,
                           scale=24,bump_depth=.004)}


def tidal(spec, frames):
    rng=np.random.default_rng(spec['seed']); s=ModuleStats(); m=common(spec['accent'],'tidal')
    plinth('W E A T H E R   /   0 1',m,s)
    g=collection('02 • Tidal basin and breakwater modules')
    water=surface('Brackish water • GGX surface coat', '195A53',rough=.26,coat=.32,ior=1.333,
                  transmission=.09,scale=8.,direction=(1.0,3.8,.8),rough_spread=.096,bump_depth=.033,tint=.32)
    concrete=surface('Marine aggregate • salt crust', '718C83',rough=.68,scale=26.,rough_spread=.16,bump_depth=.013,tint=.18)
    shell=surface('Tide archive • enamel panel', '50706D',rough=.29,metal=.24,coat=.37,scale=28.,bump_depth=.009)
    tint=surface('Obscured glazing • bluish dielectric', '2C6265',rough=.20,coat=.32,transmission=.19,rough_spread=.02,bump_depth=.001)
    amber=signal('Aperture lantern • tracked intensity','F4B76D',frames)
    phase=rng.uniform(0,2*pi)
    patch(g,'Tidal surface • seeded directional wind ridges',(-4.88,4.88),(-3.49,3.49),72,54,
          lambda x,y: .108+.023*np.sin(y*6.8+x*.9+phase)+.014*np.sin(x*3.5-y*1.75+phase*.8)
          +.008*np.sin(x*7+y*8.5+phase*.6),[water])
    slab(s,g,'Cut-stone station quay',footprint(5.40,5.82,.37,(2.12,.30)),.077,.37,concrete,.052)
    slab(s,g,'Outer breakwater pier',footprint(3.31,.91,.14,(-2.72,2.68)),.05,.33,concrete,.042)
    slab(s,g,'Intake catwalk',footprint(2.92,.66,.11,(-2.12,-1.23)),.10,.29,m['trim'],.028)
    for i in range(spec['modules']):
        x=-4.39+3.06*i/max(1,spec['modules']-1)
        y=3.07+rng.uniform(-.09,.10)
        slab(s,g,f'Breakwater caisson {i+1:02}',footprint(.39,.62,.075,(x,y)),.09,.53+rng.uniform(-.035,.1),concrete,.028)
        box(g,'Channel hazard enamel',(x,y-.20,.59),(.19,.045,.15),m['metal'],.014)
    # Rail system and visible cut-lines along the quay.
    for y in np.linspace(-2.24,2.76,12):
        box(g,'Quay joint',(-.34,y,.377),(.28,.025,.012),m['trim'],.003)
    for x,y in [(-3.53,-1.53),(-3.53,-.95),(-1.02,-1.53),(-1.02,-.95),(-4.08,2.34),(-1.43,2.34)]:
        lathe(g,'Capped mooring bitt',(x,y,.282),[(.085,0),(.08,.04),(.069,.29),(.108,.32),(.102,.37)],[m['metal']],sides=16)
    for y in [-1.51,-.95]:
        bar(g,'Catwalk tubular guard',(-3.53,y,.585),(-1.02,y,.585),.029,m['line'],edge=.008)
    g=collection('03 • Archive / cast enclosure and calibrated shutters')
    box(g,'Enclosure lower skirt',(1.74,.59,.546),(4.08,2.65,.39),m['trim'],.083)
    box(g,'Enamel envelope',(1.74,.61,1.42),(3.94,2.54,1.55),shell,.084)
    box(g,'Sun hood and parapet',(1.74,.59,2.26),(4.14,2.76,.24),m['trim'],.059)
    box(g,'Seamed aluminium cap',(1.74,.59,2.397),(3.87,2.49,.07),m['metal'],.031)
    modules=spec['modules']
    for j in range(modules):
        x=.18+3.15*j/(modules-1)
        box(g,'Blind panel / dark recess',(x,-.677,1.45),(.49,.060,.86),m['trim'],.029)
        box(g,'Dielectric inspection panel',(x,-.713,1.46),(.418,.039,.775),tint,.018)
        for k in range(3):
            box(g,'Exterior shutter blade',(x,-.758,1.22+k*.242),(.47,.104,.043),m['metal'],.013)
    for x in np.linspace(-.02,3.32,10):
        box(g,'Standing metal roof seam',(x,.58,2.452),(.027,2.36,.061),m['line'],.009)
    box(g,'Station name panel',(1.74,-.731,.985),(2.47,.043,.20),m['trim'],.016)
    label(g,'Station insignia','T I D E   A R C H I V E',(1.74,-.757,.947),.094,m['line'])
    for y in (-.15,.85):
        box(g,'Radiator housing',(3.744,y,1.58),(.16,.59,.79),m['trim'],.036)
        for n in range(5):
            box(g,'Radiator conductor',(3.845,y,1.29+.13*n),(.088,.56,.035),m['metal'],.013)
    # Main mechanical subject: a side-on current gauge with a rotating radial cage.
    g=collection('04 • Motion / tide rotor')
    cx,cy,cz=-2.01,-.10,1.44
    for x in (cx-.91,cx+.91):
        bar(g,'Gate stanchion',(x,cy+.19,.27),(x,cy+.19,2.75),.15,m['trim'],depth=.20,edge=.026)
        bar(g,'Brace',(x,cy+.90,.28),(x,cy+.19,1.53),.085,m['metal'])
    bar(g,'Instrument header',(cx-1.00,cy+.19,2.75),(cx+1.00,cy+.19,2.75),.13,m['metal'],depth=.23)
    housing=empty(g,'Gauge housing',(cx,cy,cz)); housing.rotation_euler.x=pi/2
    parent_local(ring(g,'Outside spun ring',(0,0,0),.91,.073,m['metal'],sides=64),housing)
    parent_local(ring(g,'Dark seal',(0,0,.02),.797,.039,m['trim'],sides=64),housing)
    parent_local(ring(g,'Induction band',(0,0,.03),.747,.019,amber,sides=64),housing)
    blade=empty(g,'Kinetic current rotor'); blade.parent=housing
    for i in range(6):
        a=tau*i/6
        parent_local(bar(g,'Shaped impeller web',(.154*cos(a),.154*sin(a),.05),(.68*cos(a+.40),.68*sin(a+.40),.05),
                         .103,m['metal'],depth=.088,edge=.025),blade)
        parent_local(ring(g,'Blade housing rivet',(.71*cos(a),.71*sin(a),.071),.033,.013,m['line'],sides=12),blade)
    parent_local(lathe(g,'Machined spindle',(0,0,0),[(.21,-.07),(.21,.075),(.12,.162)],[m['trim']],sides=32),blade)
    parent_local(lathe(g,'Instrument status lens',(0,0,.161),[(.097,0),(.087,.038),(.073,.049)],[amber],sides=30),blade)
    for t,a in ((0,.10),(.38,.68),(.74,1.53),(1,2.14)):
        blade.rotation_euler.z=a; blade.keyframe_insert(data_path='rotation_euler',frame=1+round(t*(frames-1)))
    for i in range(4):
        box(g,'Running light aperture',(2.94+.18*i,1.36,2.481),(.076,.32,.026),amber,.010)
    return SetResult('tidal',[[-3.12,-1.61,.26],[3.83,2.43,2.78]],blade,
                     {**s.report(),'caissons':modules,'wave_vertices':72*54,'rotor_blades':6})


def leaf_mesh(group, mat):
    verts=[(0,0,0),(-.30,.06,.28),(-.37,.08,.62),(-.19,.06,.88),(0,.02,1),(.19,.06,.88),(.37,.08,.62),(.30,.06,.28),(0,.17,.55)]
    return mesh(group,'Leaf prototype • shared mesh',verts,[(i,(i+1)%8,8) for i in range(8)],[mat],smooth=True)


def glasshouse(spec,frames,fps,offset):
    rng=np.random.default_rng(spec['seed']); s=ModuleStats(); m=common(spec['accent'],'glasshouse')
    plinth('W E A T H E R   /   0 2',m,s,w=9.94,d=7.30)
    stone=surface('Greenhouse plinth • lime aggregate','999273',rough=.72,scale=18,bump_depth=.014,tint=.16)
    cypress=surface('Planters • treated dark cedar','6F412C',rough=.48,coat=.21,scale=17,direction=(.56,7.,1.),bump_depth=.010,tint=.18)
    frame=surface('Cedar / painted metal envelope','425B53',rough=.33,metal=.39,coat=.34,direction=(1.,5.,1.),bump_depth=.004)
    glazing=surface('Northlight panels • glossy glass 1.46 IOR','B0C5A2',rough=.102,coat=.223,ior=1.46,transmission=.87,
                    scale=34,rough_spread=.042,bump_depth=.0015,tint=.06)
    soil=surface('Substrate • granulated pumice','443829',rough=.87,scale=31,bump_depth=.012,tint=.19)
    green=surface('Folded leaf • waxy mesophyll',spec['accent'],rough=.44,coat=.28,scale=22,rough_spread=.12,bump_depth=.004,tint=.23)
    green_deep=surface('Young plant • deeper wax',spec['accent'],rough=.56,coat=.14,scale=21,tint=.25)
    p=next(n for n in green_deep.node_tree.nodes if n.type=='VALTORGB')
    for elem in p.color_ramp.elements:
        elem.color=(*[c*.42 for c in elem.color[:3]],1.)
    light=signal('Climate indicator • growing cycle','DCDB86',frames,values=(.35,.9,.25,1.37))
    g=collection('02 • Terraced planters and accessible survey route')
    slab(s,g,'Cultivation floor',footprint(8.82,6.06,.31),.02,.245,stone,.033)
    deck=box(g,'Walkable floor • survey path',(-.21,-.42,.251),(1.21,5.08,.047),stone,.014)
    for j in range(10):
        y=-2.8+.51*j
        for x in (-.84,.42):
            box(g,'Wayfinding dashed ink',(x,y,.279),(.047,.24,.009),m['trim'],.004)
    leaves_proto=[leaf_mesh(g,mat) for mat in (green,green_deep)]
    for leaf in leaves_proto:
        leaf.hide_render=True; leaf.hide_viewport=True
    leaves,beds=0,0
    for side in (-1,1):
        for bx in (1.62,3.17):
            for y in (-.97,1.22):
                x=side*bx
                slab(s,g,'Closed planter trough',footprint(1.10,1.56,.14,(x,y)),.25,.62,cypress,.026)
                slab(s,g,'Recessed planter soil',footprint(.966,1.41,.12,(x,y)),.615,.634,soil,.013)
                for i in range(2):
                    for j in range(3):
                        xx=x+(i-.5)*.47+rng.uniform(-.065,.065)
                        yy=y+(j-1)*.40+rng.uniform(-.065,.065)
                        ang=rng.uniform(0,tau)
                        for k in range(6):
                            a=ang+tau*k/6+rng.uniform(-.26,.26)
                            off=rng.uniform(.33,.76)
                            vector=Vector((cos(a)*off,sin(a)*off,rng.uniform(.34,.85)))
                            q=vector.to_track_quat('Z','Y')
                            l=rng.uniform(.26,.62)
                            links_from(leaves_proto[k%2],g,'Linked botanical leaflet',(xx,yy,.636),(l*.66,l,l),q)
                            leaves+=1
                beds+=1
                for xx in (x-.49,x+.49):
                    box(g,'Drip rail brass cap',(xx,y,.68),(.044,1.64,.036),m['metal'],.008)
    g=collection('03 • Parametric sawtooth climate shell')
    n=spec['modules']; width=8.18/n
    x0=(-width*n/2); back=2.49; front=-.96
    for i in range(n+1):
        x=x0+width*i
        bar(g,'Gabled side column',(x,back,.245),(x,back,2.48),.113,frame,edge=.024)
        if i in (0,n):
            bar(g,'Front corner mullion',(x,front,.245),(x,front,2.55),.125,frame,edge=.024)
        bar(g,'Longitudinal cathead purlin',(x,back,2.53),(x,front,2.53),.099,frame,edge=.019)
    for i in range(n):
        a=x0+i*width
        b=a+width*.72
        c=a+width
        for y in (front,.77,back):
            bar(g,'Northlight rafter',(a,y,2.54),(b,y,3.65),.083,m['metal'],edge=.016)
            bar(g,'Upper return rafter',(b,y,3.65),(c,y,2.54),.084,frame,edge=.018)
        for x,z in ((a,2.54),(b,3.65),(c,2.54)):
            bar(g,'Continuous rooftop rail',(x,front,z),(x,back,z),.074,frame,edge=.015)
        # Alternating clear northlight wedges and slim opaque service slats; front is open for the shot.
        pane=box(g,'Transmissive northlight rack',((b+c)/2,1.63,3.065),(((c-b)**2+1.11**2)**.5-.065,1.58,.028),glazing,.008)
        pane.rotation_euler.y=atan2(1.11,c-b)
        for j in range(3):
            x=a+(j+1)*(b-a)/4
            z=2.54+(j+1)*1.11/4
            box(g,'Climate shading slat',(x,1.51,z),(.112,1.84,.041),m['metal'],.011)
        xx=(a+c)/2
        box(g,'Vented rear wall',(xx,back+0.07,.81),(width-.086,.13,1.13),frame,.024)
        for k in range(4):
            box(g,'Vent aperture',(xx,back-.013,.45+.19*k),(width-.21,.045,.058),m['trim'],.009)
    bar(g,'Roof eave / uninterrupted front',(x0,front,2.5),(-x0,front,2.5),.130,frame,depth=.16)
    box(g,'Climate station fascia',(1.60,front-.064,2.47),(2.12,.105,.276),m['trim'],.017)
    label(g,'Cultivation station inscription','G L A S S H O U S E',(1.60,front-.119,2.417),.095,m['line'])
    for j in range(3):
        box(g,'Climate sensor pin',(2.95+.21*j,front-.136,2.47),(.106,.029,.046),light,.01)
    root=empty(g,'Climate louver action',(-2.46,.37,2.28))
    for j in range(4):
        parent_local(box(g,'Actuated reflective louvers',(0,.18*(j-1.5),.01),(1.09,.139,.052),m['metal'],.012),root)
    for t,a in ((0,-.28),(.46,.22),(1,.53)):
        root.rotation_euler.x=a; root.keyframe_insert(data_path='rotation_euler',frame=1+round(t*(frames-1)))
    walker=build_walker(deck,frames,fps,offset=offset)
    return SetResult('glasshouse',[[-4.11,-2.59,.20],[4.11,2.57,3.74]],root,
                     {**s.report(),'roof_modules':n,'planters':beds,'shared_leaf_instances':leaves},walker)


def alpine(spec,frames):
    rng=np.random.default_rng(spec['seed']); s=ModuleStats(); m=common(spec['accent'],'alpine')
    plinth('W E A T H E R   /   0 3',m,s)
    ice=surface('Firn • dry snow with microcrystal coat','C2D3D5',rough=.57,coat=.23,ior=1.31,scale=32,
                rough_spread=.085,bump_depth=.012,tint=.19)
    dark_ice=surface('Fractured rock • bluish schist','617B8B',rough=.63,scale=17,rough_spread=.16,bump_depth=.023,tint=.20)
    porcelain=surface('Dome • frosted glazed tile','ADC4CE',rough=.35,coat=.45,scale=43,bump_depth=.004,tint=.08)
    metal=surface('Sensor reflector • lightly brushed silver','A4BDC5',rough=.24,metal=.90,coat=.20,
                  scale=62,direction=(1.,4.9,.85),rough_spread=.065,bump_depth=.002,tint=.055)
    glow=signal('Upper-air status • synchronized scan','8DE0DA',frames,values=(.38,.6,1.15,.48))
    g=collection('02 • Alpine berm, exposed moraine and surveyed route')
    p=rng.uniform(0,tau)
    def h(x,y):
        ramp = .13+.55*np.exp(-((x-.81)**2/17+(y-.37)**2/6.3))
        edge = np.maximum(0.16,1.-.033*(x*x+y*y))
        wave = .13*np.sin(x*1.67+.20*y+p)*np.cos(y*1.21+p*.7)+ .049*np.cos(3.8*x+2.91*y+p)
        return np.maximum(.087,(ramp+wave)*edge)
    n1,n2=39,31
    col=[]
    for j in range(n2-1):
        for i in range(n1-1):
            x=-4.74+9.48*(i+.5)/(n1-1); y=-3.36+6.72*(j+.5)/(n2-1)
            bedrock=(sin(1.37*x+1.62*y+p)+.61*cos(2.89*x-1.92*y)+.32*sin(6.31*x+3.27*y))
            col.append(int(bedrock>1.18 and (x-1.19)**2+(y-.58)**2>3.70))
    patch(g,'Seeded topographic snow surface',(-4.74,4.74),(-3.36,3.36),n1,n2,h,[ice,dark_ice],smooth=False,material_indices=col)
    raw=trimesh.creation.icosphere(subdivisions=1,radius=1)
    r=mesh(g,'Moraine prototype • linked',raw.vertices.tolist(),raw.faces.tolist(),[dark_ice,ice],
           [int(raw.vertices[f].mean(axis=0)[2]>.16) for f in raw.faces],smooth=False)
    r.hide_render=True; r.hide_viewport=True
    debris=0
    for i in range(36):
        x=rng.uniform(-4.53,4.53); y=rng.uniform(-3.21,3.21)
        if (x-1.21)**2+(y-.58)**2<4.45: continue
        sz=rng.uniform(.11,.31)
        rock=links_from(r,g,'Weathered rock cluster',(x,y,float(h(x,y))+.027),(sz*1.42,sz*.82,sz*.67))
        rock.rotation_euler.z=rng.uniform(0,tau); debris+=1
    # Access station at the exposed left rim.
    slab(s,g,'Lower ingress pad',footprint(2.68,1.43,.19,(-2.66,-1.25)),.22,.59,m['deck'],.059)
    box(g,'Weather control booth',(-2.56,-1.21,.97),(1.73,1.18,.89),m['trim'],.088)
    box(g,'Cold-weather roof cap',(-2.56,-1.19,1.47),(1.98,1.32,.15),porcelain,.058)
    for i in range(4):
        box(g,'Thermal vent slot',(-3.14+.36*i,-1.824,1.06),(.115,.051,.335),m['metal'],.019)
    label(g,'Pressure station inscription','A L T   /   0 3',(-2.56,-1.83,.772),.094,m['line'])
    for i in range(7):
        x=-2.15+i*.32;y=-2.22+.045*i
        box(g,'Runway stud',(x,y,float(h(x,y))+.065),(.068,.22,.073),glow,.022)
    g=collection('03 • Geodesic observatory / surveyed structural courses')
    cx,cy,z=1.27,.54,.60
    lathe(g,'Faceted anchor footing',(cx,cy,.319),[(2.46,0),(2.48,.12),(2.34,.22),(2.29,.29)],[m['trim']],sides=48)
    lathe(g,'Survey ring floor',(cx,cy,.563),[(2.22,0),(2.24,.05),(2.16,.107)],[porcelain],sides=48)
    ring(g,'Continuous sill rail',(cx,cy,z+.13),2.16,.062,m['metal'],sides=72)
    mcount=spec['modules']; rings=[]
    for i,lat in enumerate((0.,.35,.70,1.03,1.33)):
        rings.append([(cx+2.16*cos(lat)*cos(tau*(j+.50*(i%2))/mcount),
                       cy+2.16*cos(lat)*sin(tau*(j+.50*(i%2))/mcount),z+.13+2.27*sin(lat)) for j in range(mcount)])
    apex=(cx,cy,z+2.41)
    panels=[]; faces=[]; braces=0
    def cutout(points):
        if min(p[2] for p in points)>2.42:
            return False
        u=np.mean(points,axis=0)-(cx,cy,z)
        return u[1]<-.49 and u[0]*.90-u[1]*.42>.07

    def rib(a,b,style,mat,thickness):
        nonlocal braces
        if not cutout((a,b)):
            bar(g,style,a,b,thickness,mat,edge=.014); braces+=1

    def ceramic(tri):
        mid=np.mean(tri,axis=0)
        if mid[1]>cy+.12 or (min(p[2] for p in tri)>2.5 and mid[1]>cy-.37):
            k=len(panels)
            panels.extend([tuple(mid+(p-mid)*.963) for p in tri]); faces.append((k,k+1,k+2))

    for i,rp in enumerate(rings):
        for j,a in enumerate(rp):
            b=rp[(j+1)%mcount]
            if i>0:
                rib(a,b,'Dome circumferential rib',m['trim'],.073)
            if i<len(rings)-1:
                next_ring=rings[i+1]
                c=next_ring[j]; d=next_ring[(j+1)%mcount]; e=next_ring[(j-1)%mcount]
                if i%2==0:
                    rib(a,c,'Dome diagonal rib',m['metal'],.073)
                    rib(a,e,'Dome diagonal cross rib',m['metal'],.063)
                    for tri in ((a,b,c),(b,d,c)):
                        ceramic(tri)
                else:
                    rib(a,c,'Dome diagonal rib',m['metal'],.073)
                    rib(a,d,'Dome diagonal cross rib',m['metal'],.063)
                    for tri in ((a,b,d),(a,d,c)):
                        ceramic(tri)
            else:
                rib(a,apex,'Apex cap strut',m['metal'],.059)
    if panels: mesh(g,'Rear glazed ceramic infill',panels,faces,[porcelain])
    g=collection('04 • Motion / azimuth-elevation instrument')
    lathe(g,'Telescope mount pedestal',(cx,cy,.666),[(.37,0),(.37,.12),(.25,.18),(.23,.66),(.31,.71)],[m['trim']],sides=32)
    az=empty(g,'Azimuth drive',(cx,cy,1.53)); dish=empty(g,'Elevation drive'); dish.parent=az
    parent_local(lathe(g,'Machined pivot',(0,0,-.17),[(.19,0),(.21,.10),(.25,.19)],[m['metal']],sides=36),az)
    sec=[(.038,.04),(.24,.051),(.42,.083),(.63,.17),(.86,.285),(1.036,.425),(1.050,.451),(1.04,.468),
         (.99,.45),(.84,.325),(.63,.216),(.43,.138),(.22,.091),(.035,.076)]
    parent_local(lathe(g,'Concave scanned reflector',(0,0,.02),sec,[metal],sides=64),dish)
    parent_local(ring(g,'Green-lit reflector lip',(0,0,.493),1.035,.030,glow,sides=64),dish)
    for i in range(3):
        a=i*tau/3
        parent_local(bar(g,'Feed support truss',(.91*cos(a),.91*sin(a),.458),(0,0,.844),.045,m['trim'],edge=.01),dish)
    parent_local(lathe(g,'Receiver horn',(0,0,.79),[(.12,0),(.102,.12),(.067,.164)],[m['metal']],sides=24),dish)
    parent_local(lathe(g,'Receiver locator',(0,0,.945),[(.052,0),(.044,.025)],[glow],sides=18),dish)
    for t,a,e in ((0,.06,1.03),(.51,.50,1.27),(1,1.04,.95)):
        f=1+round(t*(frames-1)); az.rotation_euler.z=a; dish.rotation_euler.x=e
        az.keyframe_insert(data_path='rotation_euler',frame=f); dish.keyframe_insert(data_path='rotation_euler',frame=f)
    return SetResult('alpine',[[-3.57,-2.26,.24],[3.51,2.77,3.07]],az,
                     {**s.report(),'dome_segments':mcount,'dome_braces':braces,'shared_rock_instances':debris,'heightfield_vertices':n1*n2})


FACTORIES={'tidal':lambda spec,frames,fps,offset:tidal(spec,frames),
           'glasshouse':glasshouse,'alpine':lambda spec,frames,fps,offset:alpine(spec,frames)}
