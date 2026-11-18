"""Parametric Blender scene templates for product, architectural and field shots."""

from dataclasses import dataclass
from math import cos, pi, sin, tau
import random

import bpy

from .character import field_guide, fk_walk
from .studio import (area, atmosphere, box, camera_move, collection, configure, curve, empty,
                     label, lathe, material, mesh, ring)


@dataclass(frozen=True)
class LampSpec:
    scale: float = 1.0
    body_radius: float = .62
    rib_count: int = 32
    chassis: str = '25474B'
    output: float = 2.35


@dataclass(frozen=True)
class PavilionSpec:
    bays: int = 3
    span: float = 3.48
    bay_spacing: float = 1.35
    stone: str = 'BC8B70'


@dataclass(frozen=True)
class LandSpec:
    layers: int = 8
    radius: float = 4.6
    seed: int = 67


def luminaire(at=(0, 0, 0), spec=LampSpec()):
    group = collection('02 • M/01 parametric luminaire')
    root = empty(group, 'M/01 | scale and position')
    r = spec.body_radius
    dark = material('M/01 • ceramic-coated aluminum', spec.chassis, .34, .56, grit=.012)
    black = material('M/01 • graphite seals', '162A32', .65)
    alloy = material('M/01 • satin copper', 'DD9257', .29, .67, anisotropy=.5, grit=.004)
    pale = material('M/01 • brushed faceplate', 'BDBA9B', .30, .55, grit=.003)
    warm = material('M/01 • opal diffuser', 'F8AA64', .43, glow=spec.output)
    core = material('M/01 • recessed light channels', 'FFC789', .35, glow=spec.output * 1.35)
    mark = material('M/01 • ivory markings', 'F7EDD2', .40, glow=.15)
    def turn(name, p, mats, bands=None):
        return lathe(group, name, (0, 0, 0), [(r * radius, z) for radius, z in p], mats, bands)

    turn('Base / captured turning profile', [(1.02,.04),(1.17,.09),(1.22,.19),(1.22,.34),(1.16,.42),
         (1.07,.49),(1.07,.70),(1.11,.82),(1.10,.92),(.99,1.01)], [dark, black, alloy], [1,0,0,0,0,0,2,0,0])
    turn('Optical barrel / dielectric diffuser', [(.91,.89),(1.01,.96),(1.01,1.015),(.93,1.12),
         (.929,2.025),(1.012,2.14),(1.012,2.19),(.96,2.22)], [warm, core, alloy], [2,2,1,0,1,2,2])
    turn('Crown / precision-milled cap', [(.95,2.13),(1.14,2.185),(1.178,2.25),(1.176,2.39),(1.082,2.48),
         (.94,2.55),(.85,2.62),(.82,2.65)], [dark, alloy, black], [1,0,0,0,0,1,2])
    for z, radius in ((.215,1.22),(.82,1.11),(2.19,1.12),(2.45,1.11)):
        ring(group, 'Machined bright line', (0, 0, z), r * radius, .012, alloy)
    for i in range(spec.rib_count):
        a = tau * i / spec.rib_count
        for z in (.167, 2.315):
            box(group, 'Indexed knurl', (r * 1.193 * cos(a), r * 1.193 * sin(a), z),
                (.050, .029, .093), dark, .009, a)
    for i in range(14):
        a = tau * i / 14
        if i not in (10, 11):  # front window without cage ribs across the serial tag
            box(group, 'Heat-diffusion flute', (r * .942 * cos(a), r * .942 * sin(a), 1.572),
                (.027, .037, .947), warm, .010, a)
    for x in (-.426, .426):
        px = x * r/.62
        curve(group, 'Cast upper handle', [(px, 0, 2.46), (px, 0, 2.89),
              (px*.97, 0, 3.00), (px*.79, 0, 3.08), (-px*.004, 0, 3.08)], .065, dark)
        latch = lathe(group, 'Handle end-pin', (px, -.076, 2.67), [(.081,0),(.081,.049),(.067,.066)], [alloy], sides=24)
        latch.rotation_euler.x = pi / 2
    plate_y = -r * 1.07
    box(group, 'Badge / bevelled enamel', (0, plate_y, .597), (.65, .082, .223), black, .031)
    label(group, 'Inlaid serial typography', 'M / 0 1', (0, plate_y - .044, .575), .107, mark)
    box(group, 'Pale badge rule', (0, plate_y - .043, .55), (.38,.006,.007), alloy)
    button = lathe(group, 'Recessed control button', (0, -r * .53, 2.634), [(.12,0),(.102,.039),(.089,.044)], [pale], sides=48)
    ring(group, 'Control indicator', (0, -r * .53, 2.680), .072, .006, core, 40)
    for child in tuple(group.objects):
        if child != root:
            child.parent = root
    root.location, root.scale = at, (spec.scale,) * 3
    return root


def portal(group, name, depth_y, inner, pier_h, thickness, height, stone, trim):
    """Extrude a reusable vault segment; separate masonry piers keep the opening clean."""
    for s in (-1, 1):
        box(group, name + ' pier', (s*(inner+thickness*.48), depth_y, height + pier_h/2),
            (thickness, .42, pier_h), stone, .035)
    n = 38
    for band, offset, depth, mat in ((0, 0, .42, stone), (1, -.228, .062, trim)):
        ro = inner + thickness * (1 if band == 0 else .13)
        z0 = height + pier_h
        vs = [(r*cos(pi*j/n), depth_y+offset+dy, z0+r*sin(pi*j/n))
              for dy in (-depth/2, depth/2) for r in (inner, ro) for j in range(n+1)]
        m = n + 1
        faces = []
        for j in range(n):
            a, b = j, j+1
            faces.extend(((a,b,b+m,a+m),(a+2*m,a+3*m,b+3*m,b+2*m),
                          (a,a+2*m,b+2*m,b),(a+m,b+m,b+3*m,a+3*m)))
        faces.extend(((0,m,3*m,2*m),(n,2*m+n,3*m+n,m+n)))
        mesh(group, name + (' • cast vault' if band == 0 else ' • edge inlay'), vs, faces, [mat])


def pavilion(spec=PavilionSpec()):
    group = collection('02 • Kit of parts / modular pavilion')
    stone = material('Architectural terracotta concrete', spec.stone, .7, grit=.022)
    trim = material('Limewash edge casting', 'DFC095', .73, grit=.012)
    deck = material('Terrace • honed gray stone', '647172', .56, grit=.018)
    beam = material('Ceiling battens • oxidized bronze', '593C2C', .49, .45)
    lantern = material('Pavilion cove • amber emit', 'F8B076', .48, glow=2.7)
    inner = spec.span * .5
    end = -1.0 + (spec.bays - 1) * spec.bay_spacing
    center = (end - 1.0) / 2
    for i, (w, dep, z) in enumerate(((5.65,5.25,.066),(5.28,4.95,.196),(4.97,4.38,.307))):
        box(group, 'Plinth course', (0, center+(i*.14),z), (w,dep,.135), deck if i<2 else stone, .035)
    for i in range(spec.bays):
        y = -1 + spec.bay_spacing*i
        portal(group, f'Vault module {i+1:02}', y, inner, .885, .29, .365, stone, trim)
        curve(group, 'Recessed cove optic', [(inner*cos(a),y+.143,1.25+inner*sin(a))
              for a in (pi*k/48 for k in range(49))], .020, lantern)
    for i in range(9):
        a = pi * (.145 + .71 * i/8)
        x, z = (inner+.28)*cos(a), 1.25+(inner+.27)*sin(a)
        box(group, 'Span batten', (x, center, z+.025), (.15,end+1+.43,.125), beam, .016)
    for i in range(7):
        y = -2.56 + i*.68
        box(group, 'Deck drainage joint', (0,y,.377), (4.55,.013,.008), deck)
    for s in (-1, 1):
        box(group, 'Built-in bench', (s*1.38, .65, .62), (.34,1.78,.36), deck, .027)
    label(group, 'Stamped wayfinding', 'S H E L T E R   0 2', (0,-2.49,.385), .114, trim, vertical=False)
    return group


def terrain(spec=LandSpec()):
    group = collection('02 • Layered coastal escarpment')
    rng = random.Random(spec.seed)
    pal = [material(f'Geology course {i+1:02}', h, .82, grit=.023) for i,h in enumerate(
        ('443D48','65535A','895A55','A37467','886669','AC7E68','765B5C','BD917A'))]
    n = 52
    phase = rng.uniform(0, tau)
    verts, faces, indices = [], [], []
    for k in range(spec.layers + 1):
        z = .04 + .25*k
        radius = spec.radius*(1-.057*k-(.041 if k%2 else 0))
        for j in range(n):
            a = tau*j/n
            f = 1 + .09*sin(3*a+phase)+.05*cos(7*a+.47*k)
            verts.append((radius*f*cos(a) + .44-.19*k, .64*radius*f*sin(a)+.50,
                          z+.105*sin(5*a+.53*k)+.14*sin(a)))
    for k in range(spec.layers):
        for j in range(n):
            a,b = k*n+j,k*n+(j+1)%n
            faces.extend(((a,b,b+n),(a,b+n,a+n)))
            indices.extend((k%len(pal), (k if rng.random()<.88 else k-1)%len(pal)))
    faces.append(tuple(range(len(verts)-n,len(verts))))
    indices.append(len(pal)-1)
    mesh(group, 'Headland • stratified terrain surface', verts, faces, pal, indices)
    for i in range(25):
        a = rng.uniform(-pi, .2)
        r = spec.radius * rng.uniform(.80,1.1)
        x,y = r*cos(a)+.46,r*.64*sin(a)+.46
        z = rng.uniform(.09,.44)
        size = rng.uniform(.08,.37)
        lathe(group,'Erosion scree',(x,y,0),[(size*.66,.013),(size,.082),(size*.60,z)],
              [pal[rng.randrange(2,6)]], sides=rng.randint(5,8))
    sea = material('Tidal flat • teal enamel', '1B4048', .40, .25, grit=.006)
    box(group, 'Tidal flat / horizon plate', (0,0,-.09), (200,200,.13), sea)
    curl = material('Tidal contours • sea glass', '6EA8A1', .65, glow=.2)
    for i in range(4):
        r = spec.radius * (1.02 + i * .075)
        pts = [(.44+r*cos(a),.50+r*.68*sin(a),-.021) for a in (-pi+.022*j for j in range(149))]
        curve(group, 'Shoreline contour', pts, .015, curl)
    return group


def sweep(group, name, mat):
    """A curved seamless background instead of a hard world horizon."""
    profile = [(-30,-.05),(4,-.05)]
    profile += [(4+3.8*sin(pi*j/36), 3.75-3.8*cos(pi*j/36)) for j in range(1,19)]
    profile.append((7.8,10))
    points = [(x,y,z) for y,z in profile for x in (-45,45)]
    return mesh(group,name,points,[(i,i+1,i+3,i+2) for i in range(0,len(points)-2,2)],[mat],smooth=True)


def product_scene(scene, plan, frames):
    grp = collection('01 • Product cyclorama')
    rig = collection('00 • Camera & lighting')
    atmosphere(scene, (.32,.48,.49), .16)
    floor = material('Cyclorama • carbon teal', '15343A', .50, .06, grit=.014)
    stand = material('Display • dark ceramic', '344E51', .48, .26, grit=.010)
    accent = material('Display • calibration ink', 'A3BCAB', .51)
    sweep(grp, 'Curved infinity sweep', floor)
    lathe(grp, 'Hero platform', (.50,0,0), [(1.43,.005),(1.52,.025),(1.52,.18),(1.45,.225)], [stand])
    ring(grp, 'Registration', (.50,0,.219), 1.33,.006,accent)
    label(grp, 'Platform serial', '0 1', (.5,-1.498,.075), .123,accent)
    luminaire((.50,0,.224))
    area(rig,'Warm softbox',(-3.3,-3.1,5.9),(.4,0,1.6),1270,3.6,(1,.78,.60),height=4.5)
    area(rig,'Cool edge strip',(3.1,1.9,3.6),(.5,0,1.7),1330,1.8,(.47,.81,1),height=4.4)
    area(rig,'Bronze top',(0,2.8,6.4),(.5,0,1.5),985,2.5,(1,.55,.31))
    area(rig,'Lens fill',(1.5,-5.2,2.6),(.5,0,1.3),225,3.3,(.65,.85,1))
    configure(scene, plan, frames, exposure=-.15)
    camera_move(scene,rig,frames,[(0,(4.75,-8.7,3.59),(-.61,0,1.79),48),
        (.52,(5.10,-8.05,3.38),(-.71,0,1.81),50),(1,(5.64,-7.66,3.50),(-.67,0,1.83),51)], aperture=5.6)


def shelter_scene(scene, plan, frames):
    grp = collection('01 • Desert court')
    rig = collection('00 • Camera & lighting')
    atmosphere(scene,(.45,.50,.56),.20)
    ground = material('Blue hour court • compacted terracotta dust','745D59',.76,grit=.023)
    sweep(grp,'Continuous court backdrop',ground)
    pavilion()
    luminaire((1.21,-.69,.80),LampSpec(.255,rib_count=20,output=4.1))
    bpy.context.view_layer.update()
    actor, _ = field_guide()
    fk_walk(actor,frames,plan['fps'],start=(-.19,.70,.36))
    area(rig,'Last sun',(-4.8,-3.8,7.4),(0,0,1.5),2270,4.9,(1,.72,.57))
    area(rig,'Evening soft fill',(5.4,3.0,5.4),(0,0,1.4),1450,5.1,(.50,.74,1))
    area(rig,'Vault bounce',(-.6,1.7,1.5),(0,-.8,1.4),195,1.5,(1,.51,.26))
    configure(scene,plan,frames,exposure=-.02)
    camera_move(scene,rig,frames,[(0,(6.2,-9.4,3.71),(-.75,.39,1.55),40),
        (.50,(5.05,-9.1,3.51),(-.85,.35,1.56),41),(1,(4.11,-8.74,3.28),(-.84,.32,1.53),42)])


def landscape_scene(scene,plan,frames):
    rig = collection('00 • Camera & lighting')
    grp = terrain()
    atmosphere(scene,(.35,.42,.62),.25)
    pedestal = material('Waypoint • basalt','3E4447',.69,grit=.014)
    lathe(grp,'Lookout base',(1.23,-.05,2.035),[(.45,0),(.48,.06),(.44,.19)], [pedestal],sides=44)
    luminaire((1.23,-.05,2.224),LampSpec(.34,chassis='30474E',rib_count=20,output=4.6))
    box(grp,'Survey marker',(.20,-.94,2.043),(.95,.115,.046),pedestal,.01,yaw=.12)
    area(rig,'Honey dusk edge',(-4.9,4.7,6.8),(0,0,1.3),2500,5.2,(1,.56,.33))
    area(rig,'Sea bounce',(4.5,-5.2,6.3),(0,0,1.3),1770,7,(.49,.76,1))
    area(rig,'Surface softbox',(-4.7,-3,5.3),(0,0,1),730,4.1,(.79,.85,1))
    configure(scene,plan,frames,exposure=-.06)
    camera_move(scene,rig,frames,[(0,(8.1,-10.7,6.8),(-.39,.02,1.40),39),
        (.54,(8.75,-10.05,5.8),(-.41,.05,1.46),40),(1,(9.1,-9.9,5.53),(-.43,.08,1.45),41)])


TEMPLATES = {'product': product_scene, 'pavilion': shelter_scene, 'landscape': landscape_scene}


def make_scene(shot, settings):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = f"Meridian / {shot['marker']}"
    TEMPLATES[shot['template']](scene, settings, shot['frames'])
    scene.frame_set(1)
    for screen in bpy.data.screens:
        for area_ in screen.areas:
            if area_.type == 'VIEW_3D':
                area_.spaces.active.region_3d.view_perspective = 'CAMERA'
    return scene
