"""Read the pinned CC0 mesh/joint/target subset; no MakeHuman code or add-on is executed."""

from dataclasses import dataclass
from hashlib import sha256
import json
from pathlib import Path
from zipfile import ZipFile

import numpy as np

from blender_pipeline.manifest import PipelineError

ASSET_DIR = Path(__file__).resolve().parent / 'assets'
IDENTITY = {'asian': .57, 'caucasian': .29, 'african': .14}
FACE = {'Blink.L':'eye-left-closure', 'Blink.R':'eye-right-closure',
        'Smile':'mouth-corner-puller', 'Brow.L':'eyebrows-left-up', 'Brow.R':'eyebrows-right-up'}


@dataclass
class Obj:
    vertices: np.ndarray
    uv: list
    faces: list

    def group(self, name):
        return [(ids, uv) for group, ids, uv in self.faces if group == name]


def parse_obj(data):
    xyz, uv, faces = [], [], []
    name = 'default'
    for line in data.decode().splitlines():
        fields = line.split()
        if not fields:
            continue
        cmd, args = fields[0], fields[1:]
        if cmd == 'v':
            xyz.append(tuple(map(float, args[:3])))
        elif cmd == 'vt':
            uv.append(tuple(map(float, args[:2])))
        elif cmd == 'g':
            name = args[0]
        elif cmd == 'f':
            ids = [word.split('/') for word in args]
            faces.append((name, tuple(int(i[0])-1 for i in ids), tuple(int(i[1])-1 for i in ids)))
    return Obj(np.asarray(xyz, dtype=np.float64), uv, faces)


def deltas(blob, vertices):
    out = np.zeros_like(vertices)
    for line in blob.decode().splitlines():
        fields = line.split()
        if len(fields) == 4 and fields[0].isdigit():
            out[int(fields[0])] = list(map(float, fields[1:]))
    return out


def to_blender(values, scale, floor=0):
    out = values[:,[0,2,1]].copy()
    out[:,1] *= -1
    out[:,2] -= floor
    return out*scale


@dataclass
class Model:
    raw: dict
    obj: Obj
    meters: np.ndarray
    joints: dict
    skeleton: dict
    weights: list
    face_delta: dict
    fitted_eyes: Obj
    height: float


def pack_data():
    manifest = json.loads((ASSET_DIR/'sources.json').read_bytes())
    out = {}
    with ZipFile(ASSET_DIR/'human-base-cc0.zip') as pack:
        if sorted(pack.namelist()) != sorted(manifest):
            raise PipelineError('CC0 asset set has changed')
        for name,spec in manifest.items():
            blob = pack.read(name)
            if sha256(blob).hexdigest() != spec['sha256']:
                raise PipelineError(f'Unexpected source asset hash: {name}')
            out[name] = blob
    return out


def fit_eyes(eye, spec, verts):
    """Use mesh anchor barycentrics and axis scales from the upstream fit data."""
    offsets = np.ones(3)
    rows = []
    active = False
    for line in spec.decode().splitlines():
        fields = line.split()
        if not fields or fields[0].startswith('#'):
            continue
        if fields[0] in ('x_scale','y_scale','z_scale'):
            axis = 'xyz'.index(fields[0][0])
            i,j,d = int(fields[1]),int(fields[2]),float(fields[3])
            offsets[axis] = abs(verts[i,axis]-verts[j,axis])/d
        if fields[0] == 'verts':
            active=True
        elif active:
            if not fields[0].isdigit():
                break
            if len(fields) == 1:
                rows.append(verts[int(fields[0])].copy())
            elif len(fields) == 9:
                xyz = (verts[list(map(int,fields[:3]))]*np.asarray(fields[3:6],float)[:,None]).sum(axis=0)
                rows.append(xyz+np.asarray(fields[6:],float)*offsets)
    if len(rows) != len(eye.vertices):
        raise PipelineError(f'Unexpected eye weight coverage: {len(rows)} / {len(eye.vertices)}')
    return np.asarray(rows)


def load():
    raw = pack_data()
    obj = parse_obj(raw['body.obj'])
    original = obj.vertices
    verts = original.copy()
    for family,mix in IDENTITY.items():
        verts += mix*deltas(raw[f'shape/{family}-male-young.target'], original)
    # Local sculpt choices deliberately distinguish this adult from the upstream default.
    for name,mix in [('head-oval',.24),('nose-hump-incr',.29),('mouth-lowerlip-volume-incr',.32),('chin-cleft-incr',.13)]:
        verts += mix*deltas(raw[f'shape/{name}.target'], original)
    lid_widen=np.zeros_like(verts)
    for side in ('l','r'):
        for i,mix in ((1,.21),(2,.54),(3,.30)):
            lid_widen += mix*deltas(raw[f'shape/{side}-eye-height{i}-incr.target'],original)
    verts += lid_widen
    body = sorted({i for ids,_ in obj.group('body') for i in ids})
    floor, top = verts[body,1].min(), verts[body,1].max()
    height = 1.765
    scale = height/(top-floor)
    coords = to_blender(verts,scale,floor)
    skeleton = json.loads(raw['skeleton.json'])
    weights = [{} for _ in coords]
    for bone, spec in json.loads(raw['weights.json'])['weights'].items():
        for i,w in spec:
            weights[i][bone] = w
    eye = parse_obj(raw['eyes.obj'])
    eye.vertices = to_blender(fit_eyes(eye,raw['eye-fit.mhclo'],verts),scale,floor)
    expressions={}
    for name,short in FACE.items():
        delta=sum(mix*deltas(raw[f'face/{family}/{short}.target'],original) for family,mix in IDENTITY.items())
        if name.startswith('Blink.'):
            sign=1 if name.endswith('.L') else -1
            active=(np.linalg.norm(delta,axis=1)>.00001) & (original[:,0]*sign>0)
            delta[active] -= lid_widen[active]
        expressions[name]=to_blender(delta,scale)
    return Model(raw,obj,coords,{n:coords[v].mean(axis=0) for n,v in skeleton['joints'].items()},
                 skeleton,weights,expressions,eye,height)
