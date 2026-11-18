"""Completely local wardrobe, groom and skin assembly around the pinned human topology."""

from collections import defaultdict
from dataclasses import dataclass
from math import cos, pi, sin, tau

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

from meridian_m02.look import surface
from production.studio import collection, mesh
from .look import cloth, eyes as eye_surface, fibers, skin as skin_surface


@dataclass
class Character:
    skin: object
    top: object
    trousers: object
    eyes: dict
    lashes: dict
    contact: dict
    shoes: dict
    hands: dict
    head: list
    counts: dict


def remap(weights, mapping, remove_eye=False):
    out=defaultdict(float)
    for b,v in weights.items():
        p=mapping.get(b,b)
        if remove_eye and p in ('eye.L','eye.R'):
            p='head'
        out[p]+=v
    return out


def weights_bind(obj, rig, weights, *, dq=True):
    names={}
    for i,row in enumerate(weights):
        total=sum(row.values())
        if not total:
            row={'root':1.0}; total=1.0
        for name,w in row.items():
            if w<=.00001:
                continue
            if name not in names:
                names[name]=obj.vertex_groups.new(name=name)
            names[name].add([i],w/total,'REPLACE')
    obj.parent=rig
    mod=obj.modifiers.new('Native weighted deformation','ARMATURE')
    mod.object=rig; mod.use_deform_preserve_volume = dq
    return obj


def smooth(obj, level=1):
    if level:
        mod=obj.modifiers.new('Bounded surface subdivision','SUBSURF')
        mod.levels=mod.render_levels=level
    return obj


def subset(group,name,src,faces,mat,weights,rig,uv=True,level=1):
    ids=sorted({i for poly,_ in faces for i in poly})
    inv={i:j for j,i in enumerate(ids)}
    obj=mesh(group,name,src.vertices[ids].tolist(),[tuple(inv[i] for i in face) for face,_ in faces],[mat],smooth=True)
    if uv:
        loop=obj.data.uv_layers.new(name='Licensed human UV')
        coords=[coord for _,us in faces for u in us for coord in src.uv[u]]
        loop.data.foreach_set('uv',coords)
    weights_bind(obj,rig,[weights[i] for i in ids]); smooth(obj,level)
    return obj,ids


def normal_field(p, polys):
    n=np.zeros_like(p)
    for face in polys:
        a,b,c=p[np.asarray(face[:3])]
        u=np.cross(b-a,c-a)
        for i in face:
            n[i]+=u
    return n/np.maximum(1e-10,np.linalg.norm(n,axis=1))[:,None]


def clipped_patch(positions, weights, polys, planes):
    """Weld newly sliced hem/cuff loops, interpolating original skin weights."""
    xyz=[v.copy() for v in positions]
    ww=list(weights)
    for field in planes:
        out=[]; cache={}
        for face in polys:
            edge=[]
            for a,b in zip(face,face[1:]+face[:1]):
                x,y=field(xyz[a]),field(xyz[b])
                if x>=0: edge.append(a)
                if (x>=0)!=(y>=0):
                    if abs(x)<1e-10:
                        idx=a
                    elif abs(y)<1e-10:
                        idx=b
                    else:
                        key=tuple(sorted((a,b)))
                        idx=cache.get(key)
                        if idx is None:
                            t=x/(x-y)
                            idx=len(xyz); cache[key]=idx
                            xyz.append(xyz[a]+t*(xyz[b]-xyz[a]))
                            nw=defaultdict(float)
                            for j,f in ((a,1-t),(b,t)):
                                for k,v in ww[j].items(): nw[k]+=v*f
                            ww.append(dict(nw))
                    if not edge or edge[-1]!=idx:
                        edge.append(idx)
            edge=list(dict.fromkeys(edge))
            if len(edge)>2:
                out.append(tuple(edge))
        polys=out
    used=sorted({j for f in polys for j in f}); m={i:j for j,i in enumerate(used)}
    return np.asarray([xyz[i] for i in used]),[tuple(m[i] for i in f) for f in polys],[ww[i] for i in used]



def cloth_blend(xyz,fs,ww,garment):
    """Soften small elbow seams and anchor the hidden, central trouser gusset to the hips."""
    def ease(x):
        u=float(np.clip(x,0.,1.)); return u*u*(3-2*u)
    weights=[dict(w) for w in ww]
    if garment=='pants':
        for i,(x,y,z) in enumerate(xyz):
            pin=.955*ease((z-.750)/.073)*ease(1.-(abs(x)-.033)/.083)
            if pin:
                row={b:(1-pin)*v for b,v in weights[i].items()}
                row['root']=row.get('root',0.)+pin
                weights[i]=row
        return weights
    edges=defaultdict(set)
    for poly in fs:
        for a,b in zip(poly,poly[1:]+poly[:1]):
            edges[a].add(b); edges[b].add(a)
    for _ in range(3):
        nxt=list(weights)
        for i,(x,y,z) in enumerate(xyz):
            flex=.65*ease((abs(x)-.257)/.069)*ease((.457-abs(x))/.039)*ease((z-1.106)/.08)*ease((1.333-z)/.087)
            if flex<.01 or not edges[i]: continue
            blend=defaultdict(float,{b:(1-flex)*v for b,v in weights[i].items()})
            neighbors=[(j,1/max(.004,np.linalg.norm(xyz[j]-xyz[i]))) for j in sorted(edges[i])]
            total=sum(v for _,v in neighbors)
            for j,r in neighbors:
                for b,v in weights[j].items(): blend[b]+=flex*r*v/total
            nxt[i]=dict(blend)
        weights=nxt
    return weights


def tubes(lines, sides=7, radius=.0012):
    """Circular polyline cross-sections in stable neighbor frames."""
    points=[]; faces=[]
    for line in lines:
        offset=len(points)
        for k,p in enumerate(line):
            p=Vector(p)
            a=Vector(line[max(0,k-1)]); b=Vector(line[min(k+1,len(line)-1)])
            z=(b-a).normalized()
            x=z.cross(Vector((0,1,0))).normalized() if abs(z.y)<.94 else z.cross(Vector((1,0,0))).normalized()
            y=z.cross(x).normalized()
            points.extend(tuple(p+radius*(x*cos(tau*j/sides)+y*sin(tau*j/sides))) for j in range(sides))
        for k in range(len(line)-1):
            i=offset+k*sides
            for j in range(sides):
                nxt=(j+1)%sides
                faces.append((i+j,i+nxt,i+sides+nxt,i+sides+j))
    return points,faces


def tube_mesh(grp,name,lines,mat,radius):
    p,f=tubes(lines, radius=radius)
    return mesh(grp,name,p,f,[mat],smooth=True)


def patch_details(group, rig, xyz, fs, ww, materials, bottom, collar):
    surf=BVHTree.FromPolygons(xyz.tolist(),fs,all_triangles=False)
    kd=KDTree(len(xyz))
    for i,v in enumerate(xyz): kd.insert(v,i)
    kd.balance()

    def sample(x,z,offset):
        co,_,_,_=surf.ray_cast(Vector((x,-1.2,z)),Vector((0,1,0)),1.4)
        if co is None:
            return (x,-.105-offset,z)
        return (x,co.y-offset,z)

    def bound(meshobj):
        rows=[]
        for v in meshobj.data.vertices:
            co=v.co
            row=defaultdict(float)
            for pt,i,dist in kd.find_n(co,4):
                for name,val in ww[i].items(): row[name]+=val/max(.0015,dist)**2
            rows.append(row)
        return weights_bind(meshobj,rig,rows)

    def panel(name,rect,mat,offset=.009):
        x0,x1,z0,z1=rect
        pts=[sample(float(x),float(z),offset) for z in np.linspace(z0,z1,10) for x in np.linspace(x0,x1,4)]
        faces=[(j*4+i,j*4+i+1,(j+1)*4+i+1,(j+1)*4+i) for i in range(3) for j in range(9)]
        ob=bound(mesh(group,name,pts,faces,[mat],smooth=True))
        lift=ob.modifiers.new('Sewn seam allowance','SOLIDIFY'); lift.thickness=.0021
        return ob

    cap=min(collar-.042,1.464)
    panel('Folded front placket',(-.016,.018,bottom+.026,cap),materials['placket'],.0015)
    zlo, zhi=1.264,1.375
    panel('Left chest patch pocket',(.072,.172,zlo,zhi),materials['top'],.0025)
    panel('Pocket mouth welt',(.069,.175,zhi-.013,zhi+.002),materials['placket'],.0042)
    stitch=[]
    for x in (-.016,.018):
        stitch.append([sample(x,float(z),.0042) for z in np.linspace(bottom+.035,cap-.005,51)])
    stitch.extend([[sample(x,float(z),.0042) for z in np.linspace(zlo,zhi,22)] for x in (.073,.170)])
    stitch.append([sample(float(x),zlo,.0042) for x in np.linspace(.073,.170,17)])
    bound(tube_mesh(group,'Bias seam top-stitch',stitch,materials['thread'],.00056))
    pv=[]; pf=[]
    for z in np.linspace(bottom+.062,cap-.018,6):
        x,y,z=sample(.001,float(z),.008)
        r=.00615; k=len(pv)
        for back in (0.,.0033):
            pv.extend((x+r*cos(tau*i/18),y+back,z+r*sin(tau*i/18)) for i in range(18))
        pf.append(tuple(k+i for i in reversed(range(18))))
        pf.extend((k+i,k+(i+1)%18,k+18+(i+1)%18,k+18+i) for i in range(18))
    bound(mesh(group,'Six horn buttons',pv,pf,[materials['button']],smooth=True))


def footwear(group, rig, bones, mats):
    shoes, contact = {}, {}
    for side in ('L','R'):
        pivot=bones['foot.'+side].head_local.copy()
        side_sign=1 if side=='L' else -1
        n=48; out=[]; faces=[]; index=[]
        # Profile compensates for a round heel, full forefoot and quiet rocker toe.
        for k,(s,h,front) in enumerate(((.94,.002,0),(1.0,.014,0),(1.,.032,0),(.985,.042,0),(.92,.058,.01),
                                         (.71,.082,.032),(.47,.109,.049),(.37,.134,.051),(.35,.138,.053))):
            for i in range(n):
                t=tau*i/n
                heel=cos(t)
                width=.056*(1.-.17*max(0.,heel))
                x=pivot.x+sin(t)*width*s+side_sign*.007*max(0.,-heel)*s
                y=pivot.y-.067+.144*s*heel+front
                toe=max(0.,(-heel-.51)/.49)
                out.append((x,y,h+.009*toe**2))
            if k:
                for i in range(n):
                    faces.append(((k-1)*n+i,k*n+i,k*n+(i+1)%n,(k-1)*n+(i+1)%n))
                    index.append(0 if k<=2 else 1 if k==3 else 2)
        faces.extend((tuple(range(n)),tuple((len(out)-n+j) for j in reversed(range(n))))); index.extend((0,2))
        shoe=mesh(group,'Leather walking shoe '+side,out,faces,[mats['sole'],mats['welt'],mats['leather']],index,smooth=True)
        weights_bind(shoe,rig,[{'foot.'+side:1.0} for _ in out]); shoes[side]=shoe
        contact[side]=[Vector(p)-pivot for p in out[:n]]
        lines=[]
        for j in range(4):
            yy=pivot.y-.090+.019*j
            lines.append([(pivot.x+float(dx),yy+.004*float(dx)/.024,.091+.008*j+.007*cos(float(dx)/.024*pi/2))
                         for dx in np.linspace(-.024,.024,9)])
        laces=tube_mesh(group,'Waxed laces '+side,lines,mats['lace'],.0017)
        weights_bind(laces,rig,[{'foot.'+side:1.} for _ in laces.data.vertices])
    return shoes,contact


def curvy_fibers(grp,name,splines,mats,rad):
    geo=bpy.data.curves.new(name,'CURVE'); geo.dimensions='3D'
    geo.resolution_u=1; geo.bevel_resolution=0; geo.bevel_depth=rad
    geo.twist_smooth=3
    for m in mats:
        geo.materials.append(m)
    for points,mat,r in splines:
        f=geo.splines.new('POLY'); f.points.add(len(points)-1); f.material_index=mat
        for j,(p,w) in enumerate(zip(points,np.linspace(1.0,.20,len(points)))):
            f.points[j].co=(*p,1.0); f.points[j].radius=r*w
    ob=bpy.data.objects.new(name,geo); grp.objects.link(ob)
    return ob


def rigid_parent(obj,rig,bone):
    before=obj.matrix_world.copy()
    obj.parent=rig; obj.parent_type='BONE'; obj.parent_bone=bone
    bpy.context.view_layer.update()
    obj.matrix_world=before


def groom(grp, model,rig):
    coords=model.meters
    faces=[ids for ids,_ in model.obj.group('body') if min(coords[list(ids),2])>1.530]
    used=sorted({i for f in faces for i in f}); inv={i:j for j,i in enumerate(used)}
    bvh=BVHTree.FromPolygons(coords[used].tolist(),[tuple(inv[i] for i in f) for f in faces],all_triangles=False)
    rng=np.random.default_rng(288)
    root=Vector((0,-.053,1.635));
    mat=fibers('211915','Arun • espresso fibers'); dark=fibers('291D18','Arun • warm fiber bundle')
    light=fibers('432B21','Arun • sun-catching fibers'); fleck=fibers('4A3932','Arun • scattered midtones')

    def limit(theta):
        front=cos(theta)
        return 1.22 + .69*max(0.,-front) - .37*max(0.,front) + .069*cos(3*theta+.44) + .092*sin(theta)+.012*cos(17*theta)

    def locate(theta,phi):
        d=Vector((sin(theta)*sin(phi)*.89,-cos(theta)*sin(phi)*1.05,cos(phi)*1.13)).normalized()
        at,_,_,_=bvh.ray_cast(root+d*.21,-d,.25)
        return (at if at is not None else root+d*.088),d

    # Tapered side part, dark skin-tight scalp under independently drawn strands.
    p=[]; fs=[]; seg=66; rings=18
    for j in range(rings):
        for i in range(seg):
            theta=i*tau/seg
            phi=limit(theta)*(.020+.969*j/(rings-1))
            at,v=locate(theta,phi)
            lift=(.0014+.007*cos(phi)**2)*(.66+.34*cos(theta+.6))*(1-.47*(j/(rings-1))**7)
            p.append(tuple(at+v*lift))
    for j in range(rings-1):
        for i in range(seg):
            a=j*seg+i; b=j*seg+(i+1)%seg
            fs.append((a,b,b+seg,a+seg))
    fs.append(tuple(reversed(range(seg))))
    cap=mesh(grp,'Tapered groom • scalp coverage',p,fs,[mat],smooth=True)
    rigid_parent(cap,rig,'head')
    locks=[]
    for i in range(3300):
        theta=rng.uniform(0,tau); phi=limit(theta)*rng.uniform(.02,1.035)**.60
        # The longer fringe flows up from the forehead and over the right-side part.
        prominence=max(0.,cos(theta))
        length=rng.uniform(.090,.33)*(1.0+.55*prominence)
        sweep=rng.uniform(.18,.35)*(1. if sin(theta)>.29 else -.72)
        h=rng.uniform(.0038,.011)*(1.+1.15*prominence)
        samples=[]
        for u in np.linspace(0,1,7):
            a=theta+sweep*u*(.56+.44*prominence)
            b=max(.023,phi+length*u*(.62 if phi<.44 else -.54))
            at,n=locate(a,b)
            lift=(.0019 + .0085*cos(b)**2)+h*sin(pi*u*.84)**.8
            samples.append(tuple(at+n*lift))
        locks.append((samples,int(rng.choice(4,p=[.50,.33,.145,.025])),rng.uniform(.65,1.52)))
    hair=curvy_fibers(grp,'Sweep back • 3300 individual groom strands',locks,[mat,dark,light,fleck],.00035)
    rigid_parent(hair,rig,'head')
    browsets=[]
    for s in (-1,1):
        center=model.joints['eye.'+('L' if s==1 else 'R')+'____head']
        xx=abs(center[0]); zz=center[2]+.0200
        for i in range(208):
            u=rng.uniform(-1,1)
            x=s*(xx+.0175*u)
            z=zz + .004*(1-u*u)-.0047*u+rng.normal(0,.00177)*(1-.60*abs(u))
            pts=[]
            for t in (0.,.33,.66,1.):
                xxx=x+s*t*rng.uniform(.0017,.0033)
                zzz=z+t*(.0031*(1-.62*u))
                cv,_,_,_=bvh.ray_cast(Vector((xxx,-.244,zzz)),Vector((0,1,0)),.16)
                if cv is None: break
                pts.append((xxx,cv.y-.0006-.0005*t,zzz))
            if len(pts)==4:
                browsets.append((pts,int(rng.uniform(0,2)),rng.uniform(.6,1.48)))
    brows=curvy_fibers(grp,'Individually drawn brow fibers',browsets,[dark,light],.00018)
    rigid_parent(brows,rig,'head')
    return len(locks),len(browsets)



def lid_details(grp, model, rig, skin, ids, all_weights):
    """Tint a lid-margin strip and bind short lash fibers to the same closure morph."""
    p=model.meters[ids]; offsets={}
    margin=np.zeros(len(ids),dtype=np.float32); lashes={}
    mat=fibers('39201A','Fine upper lid lashes')
    sign_x=abs(p[:,0]); top=1.6473+.00645*np.exp(-((sign_x-.0318)/.0118)**2)
    radial=np.clip(1.-((sign_x-.033)/.0171)**4,0.,1.)
    for side in ('L','R'):
        sign=1 if side=='L' else -1
        delta=model.face_delta['Blink.'+side][ids]
        mask=(p[:,0]*sign>.017)&(p[:,0]*sign<.052)&(p[:,1]<-.133)&(delta[:,2]<-.0019)
        value=(.84*np.exp(-((p[:,2]-top)/.00112)**2)*radial)*mask
        margin=np.maximum(margin,value)
        selected=np.where(mask & (abs(p[:,2]-top)<.0031))[0]
        kdt=KDTree(len(selected))
        for k in selected: kdt.insert(p[k],int(k))
        kdt.balance()
        lines=[]; weights=[]; dd=[]
        for i,u in enumerate(np.linspace(0.,1.,29)):
            x=.0205+.0271*u
            z=1.6473+.00645*np.exp(-((x-.0318)/.0118)**2)
            y=-.1475+.011*((x-.032)/.018)**2
            neighbors=kdt.find_n((x*sign,y,z),3)
            ww=defaultdict(float); tcs=np.zeros(3); de=np.zeros(3); sumw=0.
            for _,j,d in neighbors:
                w=1/max(d,.00075)**2; sumw+=w; tcs+=p[j]*w; de+=delta[j]*w
                for n,v in all_weights[ids[j]].items(): ww[n]+=v*w
            tcs/=sumw; de/=sumw; tcs[0]=x*sign; tcs[1]-=.00042
            wave=.72+.28*sin(i*17.3)**2
            length=(.0018+.00145*sin(pi*u)**.8)*wave
            line=[tcs+np.asarray((sign*.00052*r,-length*r,.00017*r+.00060*r*r)) for r in (0,.44,.77,1.)]
            lines.append(line)
            for j,r in enumerate((0,.44,.77,1.)):
                for _ in range(7):
                    weights.append(ww); dd.append(de+np.asarray((0,0,-.00083*r)))
        pts,fs=tubes(lines,radius=.000116)
        hair=mesh(grp,'Arun • articulated upper lashes '+side,pts,fs,[mat],smooth=True)
        weights_bind(hair,rig,weights)
        hair.shape_key_add(name='Basis')
        key=hair.shape_key_add(name='Blink.'+side)
        key.data.foreach_set('co',(np.asarray(pts)+np.asarray(dd)).ravel())
        lashes[side]=key
    attr=skin.data.attributes.new('lid_margin','FLOAT','POINT'); attr.data.foreach_set('value',margin)
    return lashes


def create(model,rig,bone_map):
    grp=collection('03 • Arun / weighted human, tailoring and groom')
    p=model.meters
    mt={
      'top':cloth('Dusty petrol • washed twill overshirt','32545B'),
      'placket':cloth('Raised edges • dark teal thread','2A444C'),
      'thread':cloth('Top stitch • pale cotton','6A8280',.6),
      'pants':cloth('Slate olive • dense woven trousers','565647'),
      'button':surface('Dark brushed horn','5A462F',rough=.42,scale=290,bump_depth=.00055),
      'sole':surface('Rubber tread • warm gray','706C61',rough=.8,scale=98,bump_depth=.00055),
      'welt':surface('Sealed stitched welt','9B866B',rough=.62,scale=205,bump_depth=.00056),
      'leather':surface('Cordovan • worn shoe leather','3C2A22',rough=.45,coat=.18,scale=350,bump_depth=.00080),
      'lace':cloth('Waxed cotton laces','A48869'),
    }
    cuffs={}
    for side in ('L','R'):
        wrist=model.joints['wrist.'+side+'____head']; elbow=model.joints['lowerarm01.'+side+'____head']
        direction=(wrist-elbow)/np.linalg.norm(wrist-elbow)
        cuffs[side]=(wrist-.080*direction,direction)
    bottom=.884; waist=.988; collar=1.504
    def upper(q):
        wing=np.clip((abs(q[0])-.047)/.055,0.,1.)
        return collar+.036*wing*wing-.036*np.exp(-(q[0]/.068)**2)*np.clip((-q[1]-.022)/.061,0.,1.)
    rawfaces=model.obj.group('body')
    skin_faces=[(vs,uv) for vs,uv in rawfaces if any(
         q[2] > upper(q)-.062 and abs(q[0])<.177 or
         any(abs(q[0])>.27 and (q-c).dot(d)>-.010 and q[0]*(1 if s=='L' else -1)>0
             for s,(c,d) in cuffs.items()) for q in p[list(vs)])]
    import copy
    source=copy.copy(model.obj); source.vertices=p
    ww=[remap(w,bone_map) for w in model.weights]
    skin_weights=[remap(w,bone_map,True) for w in model.weights]
    obj,skids=subset(grp,'Arun • face, neck and anatomical hands',source,skin_faces,skin_surface(model.raw),
                    skin_weights,rig,level=2)
    # Diffuse shaven areas; geometry itself remains fully detailed and shutter-safe.
    attr=obj.data.attributes.new('beard_shadow','FLOAT','POINT')
    px=p[skids]
    beard=np.clip((1.627-px[:,2])/.041,0,.48)*np.clip((-px[:,1]-.055)/.058,0,1)*np.clip((px[:,2]-1.536)/.028,0,1)
    attr.data.foreach_set('value',beard)
    obj.shape_key_add(name='Basis')
    for name,delta in model.face_delta.items():
        key=obj.shape_key_add(name=name)
        key.data.foreach_set('co',(px+delta[skids]).ravel())
        key.slider_max=1.2 if 'Blink' in name else 1.
    lashes=lid_details(grp,model,rig,obj,skids,skin_weights)
    eyes={}
    for side in ('L','R'):
        factor=1 if side=='L' else -1
        es=model.fitted_eyes
        # Source alpha-zero cornea loops share a single UV in the lower-right pad.
        # Their opaque import formerly masked the sclera and iris. The coat lobe handles gloss.
        ev=[(vs,uv) for _,vs,uv in es.faces if np.mean(es.vertices[list(vs),0])*factor>0
            and not all(es.uv[u][0]>.86 and es.uv[u][1]<.135 for u in uv)]
        eye_w=[{'eye.'+side:1.} for _ in es.vertices]
        eyes[side],_=subset(grp,'Arun • calibrated eyeball '+side,es,ev,eye_surface(model.raw),eye_w,rig,level=0)
    cloth_faces=[ids for ids,_ in model.obj.group('helper-tights')]
    n=normal_field(p,cloth_faces)
    z=p[:,2]; x=p[:,0]; y=p[:,1]
    # Small woven-fabric silhouette folds above knees, cuffs and at the overshirt hem.
    shape_noise=.0023*np.sin(51*x+35*y+55*z)+.0014*np.sin(121*z+47*y-24*x)
    pants_folds=.0060*np.exp(-((z-.53)/.105)**2)*np.sin(92*z+25*y)**2 + .0051*np.exp(-((z-.14)/.08)**2)*np.sin(117*z+39*y)
    trousers_pos=p+n*(.015+shape_noise+pants_folds+.009*np.exp(-((z-.26)/.24)**2))[:,None]
    wrinkles=.0035*np.exp(-((z-(.93-.15*x+.27*x*x))/.072)**2)*np.sin(81*z+22*x)**2
    coat_pos=p+n*(.014+shape_noise+wrinkles+.013*np.exp(-((z-1.01)/.18)**2))[:,None]
    sleeve_fn=[(lambda q,c=c,d=d: -(q-c).dot(d)) for c,d in cuffs.values()]
    coat_p,coat_f,coat_w=clipped_patch(coat_pos,ww,cloth_faces,[lambda q:q[2]-bottom,lambda q:upper(q)-q[2],*sleeve_fn])
    pants_p,pants_f,pants_w=clipped_patch(trousers_pos,ww,cloth_faces,[lambda q:waist-q[2],lambda q:q[2]-.090])
    coat_w=cloth_blend(coat_p,coat_f,coat_w,'coat')
    pants_w=cloth_blend(pants_p,pants_f,pants_w,'pants')
    garments=[]
    for name,xyz,fs,weights,mat in [('Tailored chore overshirt',coat_p,coat_f,coat_w,mt['top']),
                                      ('Straight leg canvas trousers',pants_p,pants_f,pants_w,mt['pants'])]:
        garment=mesh(grp,name,xyz.tolist(),fs,[mat],smooth=True)
        weights_bind(garment,rig,weights); smooth(garment,1)
        thick=garment.modifiers.new('Inside fabric and finished visible hems','SOLIDIFY'); thick.thickness=.0019
        garments.append(garment)
    patch_details(grp,rig,coat_p,coat_f,coat_w,mt,bottom,collar)
    collar_edges=[]
    seen=set()
    for poly in coat_f:
        for a,b in zip(poly,poly[1:]+poly[:1]):
            k=tuple(sorted((a,b)))
            if k not in seen and all(abs(upper(coat_p[u])-coat_p[u,2])<.00072 for u in k):
                seen.add(k); collar_edges.append(k)
    strip,fs=tubes([[coat_p[a],coat_p[b]] for a,b in collar_edges],radius=.0032)
    if strip:
        binding=mesh(grp,'Double folded neckline binding',strip,fs,[mt['placket']],smooth=True)
        weights_bind(binding,rig,[coat_w[u] for edge in collar_edges for u in edge for _ in range(7)])
    shoes,contact=footwear(grp,rig,rig.data.bones,mt)
    strands,brows=groom(grp,model,rig)
    hands={s:[j for j,i in enumerate(skids) if p[i,0]*(1 if s=='L' else -1)>.445 and p[i,2]<1.20] for s in ('L','R')}
    hi=[j for j,i in enumerate(skids) if p[i,2]>1.54]
    return Character(obj,garments[0],garments[1],eyes,lashes,contact,shoes,hands,hi,
         {'skin_vertices':len(skids),'garment_vertices':[len(coat_p),len(pants_p)],'groom_strands':strands,'brow_strands':brows})
