"""One timed performance: stepped weight transfer, foot roll, gaze, greeting and settle."""

from dataclasses import dataclass
from math import cos, exp, pi, sin, sqrt, tau

import bpy
from mathutils import Euler, Quaternion, Vector

from .rig import SIDES, calibrate_knees, frame_axes, turn_on

FPS=24
DURATION=15
# Alternating grounded intervals; y is forward in negative Blender Y. Exact touch times drive footfalls.
STEPS=(('L',3.025,3.46,-.515),('R',3.545,3.98,-1.045),('L',4.065,4.50,-1.575),
       ('R',4.575,5.01,-2.08),('L',5.075,5.51,-2.50),('R',5.555,5.98,-2.45))
START={'L':-.085,'R':.041}
ROOT=((0.,0.,0.),(2.95,0.,0.),(3.46,-.276,-.99),(3.98,-.772,-1.025),
      (4.50,-1.306,-1.02),(5.01,-1.818,-.89),(5.51,-2.288,-.59),(6.05,-2.465,0.),(15.,-2.465,0.))
BLINKS=(.82,2.21,3.22,4.61,5.77,6.84,8.03,9.09,10.49,11.73,13.08,14.27)


def smooth(x):
    x=max(0.,min(1.,x)); return x*x*(3-2*x)


def factor(t,a,b):
    return smooth((t-a)/(b-a))


def hermite(t, knots):
    for (a,x,u),(b,y,v) in zip(knots,knots[1:]):
        if t <= b:
            dt=b-a; s=max(0.,(t-a)/dt)
            return (2*s**3-3*s*s+1)*x + (s**3-2*s*s+s)*u*dt + (-2*s**3+3*s*s)*y +(s**3-s*s)*v*dt
    return knots[-1][1]


def foot_clock(t,side):
    here=START[side]; previous=None
    intervals=[(a,b,end) for s,a,b,end in STEPS if s==side]
    for i,(a,b,aim) in enumerate(intervals):
        if t>=b:
            here=aim; previous=(b,i)
            continue
        if t>=a:
            u=(t-a)/(b-a); f=smooth(u)
            last=i==len(intervals)-1 and side=='R'
            strike=-.115 if last else -.19
            pitch=.23*(1-factor(u,0.,.54))+strike*factor(u,.46,1.)
            lift=.093*sin(pi*u)**1.60 if last else .120*sin(pi*u)**1.55
            return here+(aim-here)*f, pitch, lift, 'swing'
        if t> a-.105:
            return here,.23*factor(t,a-.105,a),0.,'toe_roll'
        break
    if previous:
        b,i=previous
        strike=-.115 if i==len(intervals)-1 and side=='R' else -.19
        if t<b+.105:
            return here,strike*(1-factor(t,b,b+.105)),0.,'heel_roll'
    return here,0.,0.,'flat'


def eye_closure(t,side):
    a=.009 if side=='R' else 0.
    return max((factor(t,hit+a-.072,hit+a)*(1-factor(t,hit+a+.025,hit+a+.13)) for hit in BLINKS),default=0.)


def gait(t):
    onset=factor(t,2.91,3.52); ending=1-factor(t,5.36,6.09)
    strength=onset*ending
    phase=tau*(t-3.24)/1.04
    side=0.
    for s,a,b,_ in STEPS:
        sign=1 if s=='L' else -1
        if a-.09<t<b+.064:
            side-=sign*.041*factor(t,a-.09,a+.13)*(1-factor(t,b-.10,b+.064))
    side-=.023*factor(t,2.62,2.95)*(1-factor(t,3.085,3.38))
    return strength,phase,side


@dataclass
class Foot:
    position: Vector
    delta: Quaternion
    mode: str
    nominal: float


def plan_foot(t,side,char):
    sign=1 if side=='L' else -1
    y,pitch,lift,kind=foot_clock(t,side)
    # Foot pivot is solved from the exact modeled sole ring, not from an ankle altitude guess.
    yaw=sign*.085
    q=Quaternion((0,0,1),yaw)@Quaternion((1,0,0),pitch)
    pts=char.contact[side]
    low=min((q@p).z for p in pts)
    pivot=min(pts,key=lambda p:(q@p).z)
    aim=(Quaternion((0,0,1),yaw)@pivot)-(q@pivot)
    pos=Vector((sign*.112+aim.x,y+aim.y,lift-low+.0022))
    return Foot(pos,q,kind,y)


class Poses:
    def __init__(self, ctrl):
        self.ctrl=ctrl
        self.rig=ctrl.rig
        self.rest=ctrl.world_rest
        self.current={}
        self.previous={}
        self.frame=1

    def basis(self,name,q):
        name=str(name)
        p=self.rig.pose.bones[name]
        q=q.normalized()
        if name in self.previous and q.dot(self.previous[name])<0:
            q.negate()
        p.rotation_quaternion=q
        p.keyframe_insert(data_path='rotation_quaternion',frame=self.frame,group=name)
        self.previous[name]=q.copy()
        self.current[name]=q

    def around(self,name,angles):
        r=self.rest[name]
        self.basis(name,r.inverted()@Euler(angles,'XYZ').to_quaternion()@r)

    def world(self,name):
        b=self.rig.pose.bones[name]; rest=self.rest[name]; q=self.current.get(name,Quaternion())
        if b.parent:
            pn=b.parent.name
            return self.world(pn)@self.rest[pn].inverted()@rest@q
        return rest@q

    def orient(self,name,q):
        b=self.rig.pose.bones[name]; rest=self.rest[name]
        known=(self.world(b.parent.name)@self.rest[b.parent.name].inverted()@rest) if b.parent else rest
        self.basis(name,known.inverted()@q)


def softmin(a,b,limit=.022):
    return min(a,b)-max(0.,limit-abs(a-b))**2/(4*limit)


def arm(poses,ctrl,side,t,power,phase,raise_hand,pulse):
    sign=1 if side=='L' else -1
    strength=raise_hand if side=='R' else 0.
    wave=pulse if side=='R' else 0.
    u=f'upperarm01.{side}'; l=f'lowerarm01.{side}'; w=f'wrist.{side}'
    up0=Vector((sign*.123,(.03 if side=='R' else -.012)+sign*.225*power*cos(phase),-.985)).normalized()
    up1=Vector((sign*(.79+.029*wave),-.33,-.529+.041*wave)).normalized()
    up=up0.slerp(up1,strength)
    approach=Vector((sign*.048,-1,.15)).lerp(Vector((-sign*.29,-.57,.84)),strength)
    perp=(approach-up*up.dot(approach)).normalized()
    ang=(.175 + (.076+.042*sign*sin(phase))*power)*(1-strength) + (1.85+.063*wave)*strength
    low=(up*cos(ang)+perp*sin(ang)).normalized()
    bones=ctrl.rig.data.bones
    rest_up=bones[u].tail_local-bones[u].head_local
    rest_low=bones[l].tail_local-bones[l].head_local
    n_old=rest_up.cross(rest_low).normalized(); n_new=up.cross(low).normalized()
    desired_up=frame_axes(up,n_new)@frame_axes(rest_up,n_old).inverted()@ctrl.world_rest[u]
    desired_lower=frame_axes(low,n_new)@frame_axes(rest_low,n_old).inverted()@ctrl.world_rest[l]
    rest_hand,rest_palm=ctrl.hand_axes[side]
    relax=(low+Vector((0,.095,.015))).normalized()
    salutation=Vector((sign*(.155+.27*wave),-.055,.985)).normalized()
    along=relax.slerp(salutation,strength*.86)
    palm=Vector((-sign*.90,.37,-.11)).slerp(Vector((.10,-.98,.15)),strength)
    desired_hand=frame_axes(along,palm)@frame_axes(rest_hand,rest_palm).inverted()@ctrl.world_rest[w]
    # Use part of the wrist's twist on the radius/ulna; preserve the forearm's pointing axis.
    reference_low=(desired_lower@ctrl.world_rest[l].inverted())@rest_palm
    target_low=palm-low*palm.dot(low)
    ref_low=reference_low-low*reference_low.dot(low)
    if ref_low.length>.01 and target_low.length>.01:
        twist_angle=ref_low.angle(target_low)
        az=1 if ref_low.cross(target_low).dot(low)>0 else -1
        desired_lower=Quaternion(low,az*min(1.13,twist_angle)*(.40+.28*strength))@desired_lower
    poses.orient(u,desired_up)
    poses.orient(l,desired_lower)
    poses.orient(w,desired_hand)
    for finger in range(1,6):
        for k in range(1,4):
            name=f'finger{finger}-{k}.{side}'
            d=(bones[name].tail_local-bones[name].head_local).normalized()
            axis=d.cross(rest_palm)
            if axis.length<.05:
                axis=d.cross(Vector((0,0,1)))
            interval=(.13,.24,.18)[k-1]*(.52 if finger==1 else 1.+.105*(finger-3))
            softness=(.045,.08,.065)[k-1]+.024*sin(t*7.9+.65*finger)*strength
            angle=(interval*(1-strength)+softness*strength)*(1+.39*power)
            loc_axis=ctrl.world_rest[name].inverted()@axis.normalized()
            poses.basis(name,Quaternion(loc_axis,angle))


def animate(scene, ctrl, char, frames, fps):
    turn_on(ctrl)
    poses=Poses(ctrl); rig=ctrl.rig
    bones=rig.data.bones
    root=rig.pose.bones['root']; rest_root=bones['root'].head_local
    face=char.skin.data.shape_keys.key_blocks
    lengths={s:bones['upperleg01.'+s].length+bones['lowerleg01.'+s].length for s in SIDES}
    for frame in range(1,frames+1):
        t=(frame-1)/fps
        poses.frame=frame; poses.current={}
        breath=.5+.5*sin(tau*t/4.36+.30)
        strength,phase,shift=gait(t)
        forward=hermite(t,ROOT)
        look=factor(t,6.18,6.96)*(1-factor(t,8.00,8.89))
        look_eye=factor(t,6.06,6.30)*(1-factor(t,8.13,8.58))
        lift=factor(t,9.13,9.98)*(1-factor(t,11.82,13.08))
        pulse=sin(tau*(t-9.89)*1.42)*factor(t,9.72,10.14)*(1-factor(t,11.25,11.80))
        feet={s:plan_foot(t,s,char) for s in SIDES}
        lateral=shift+.010*sin(tau*t*.200+.35)*(1-strength)+.013*lift
        z=-.003+.0060*breath-strength*(.017+.017*cos(2*phase+.32))
        for side,f in feet.items():
            h=bones['upperleg01.'+side].head_local
            d=Vector((h.x+lateral-f.position.x,h.y+forward-f.position.y))
            reach=max(.1,(lengths[side]-.006)**2-d.length_squared)
            cap=f.position.z+sqrt(reach)-h.z
            z=softmin(z,cap)
        poses.around('root',(strength*.020, -.034*strength*sin(phase)+.025*lift,
                            .086*strength*cos(phase)+.026*look))
        root.location=ctrl.world_rest['root'].inverted()@Vector((lateral,forward,z))
        root.keyframe_insert(data_path='location',frame=frame,group='root')
        poses.around('spine05',(.012+.013*strength,.018*strength*sin(phase),-.020*strength*cos(phase)))
        poses.around('spine04',(.012, -.016*strength*sin(phase),-.026*strength*cos(phase)))
        poses.around('spine03',(-.017,-.015*shift,.036*look-.024*strength*cos(phase)))
        poses.around('spine02',(-.014-.020*breath,-.041*lift,-.046*strength*cos(phase)+.048*look))
        poses.around('spine01',(.008+.012*breath,-.011*strength*sin(phase),.041*look-.036*strength*cos(phase)))
        nod=exp(-((t-10.53)/.225)**2)*.092-exp(-((t-10.89)/.261)**2)*.043
        poses.around('neck01',(-.018-.03*breath, .014*sin(t*1.36), .042*look))
        poses.around('neck02',(.015*strength*sin(phase), .014*lift, .063*look))
        poses.around('neck03',(-.020, -.034*look, .064*look))
        poses.around('head',(.016*cos(t*1.71)+.045*look+nod-.043*lift, .045*lift-.026*look,
                             .302*look+.025*sin(t*1.07)-.061*lift))
        for side,f in feet.items():
            sign=1 if side=='L' else -1
            ctrl.soles[side].location=f.position
            ctrl.soles[side].rotation_quaternion=f.delta@ctrl.world_rest['foot.'+side]
            ctrl.soles[side].keyframe_insert(data_path='location',frame=frame,group='Sole pivot')
            ctrl.soles[side].keyframe_insert(data_path='rotation_quaternion',frame=frame,group='Sole pivot')
            ctrl.knees[side].location=(f.position.x+sign*.078,forward-.74,.54+z)
            ctrl.knees[side].keyframe_insert(data_path='location',frame=frame,group='Knee pole')
            swing=(-.041 if side=='R' else .041)*strength*cos(phase)
            reach=lift if side=='R' else 0.
            poses.around('clavicle.'+side,(swing,sign*(.017+.074*reach),-.041*reach))
            poses.around('shoulder01.'+side,(.039*reach,.050*reach,-.063*reach))
            arm(poses,ctrl,side,t,strength,phase,lift,pulse)
            closure=eye_closure(t,side)
            face[f'Blink.{side}'].value=closure
            face[f'Blink.{side}'].keyframe_insert(data_path='value',frame=frame,group='Blink and eyelid arcs')
            char.lashes[side].value=closure
            char.lashes[side].keyframe_insert(data_path='value',frame=frame,group='Upper lash follows lid')
            brow=.21*look_eye+.23*lift + .03*sin(t*1.15+.50*sign)
            face[f'Brow.{side}'].value=max(0.,brow)
            face[f'Brow.{side}'].keyframe_insert(data_path='value',frame=frame,group='Subtle brows')
        smile=(.40*factor(t,8.55,9.86)*(1-factor(t,12.52,14.32)) +.04*look)
        face['Smile'].value=smile
        face['Smile'].keyframe_insert(data_path='value',frame=frame,group='Smile and cheek lift')
        ctrl.gaze.location=(.22+2.89*look_eye+.102*sin(t*1.78),forward-4.30+.91*look_eye,1.615+.125*look_eye-.066*lift)
        ctrl.gaze.keyframe_insert(data_path='location',frame=frame,group='Look direction in scene')
    rig.animation_data.action.name='Arun • 15 s authored performance, editable pose keys'
    calibrate_knees(scene,ctrl)
    scene.frame_set(1)
