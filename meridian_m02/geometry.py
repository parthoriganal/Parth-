"""Shared cast modules, ribs and linked meshes for deterministic climate kits."""

from dataclasses import dataclass

import numpy as np
import trimesh
from mathutils import Vector

from blender_pipeline.manifest import PipelineError
from production.studio import bevel, box, mesh


@dataclass
class ModuleStats:
    solids: int = 0
    triangles: int = 0
    vertices: int = 0
    volume: float = 0.

    def solid(self, group, name, verts, faces, mat, edge=.035):
        solid = trimesh.Trimesh(vertices=verts, faces=faces, process=False)
        if not solid.is_watertight or not solid.is_winding_consistent or solid.volume <= 1e-5:
            raise PipelineError(f'Invalid generated structural solid: {name}')
        self.solids += 1
        self.triangles += len(solid.faces)
        self.vertices += len(solid.vertices)
        self.volume += float(solid.volume)
        return bevel(mesh(group,name,solid.vertices.tolist(),solid.faces.tolist(),[mat]),edge)

    def report(self):
        return {'closed_positive_volume_solids':self.solids, 'triangles':self.triangles,
                'vertices':self.vertices, 'total_volume':round(self.volume,4)}


def footprint(w, d, cut, center=(0.,0.)):
    x,y = w*.5,d*.5
    shape = np.array([(-x+cut,-y),(x-cut,-y),(x,-y+cut),(x,y-cut),(x-cut,y),(-x+cut,y),(-x,y-cut),(-x,-y+cut)])
    return shape + np.asarray(center)


def slab(stats, group, name, outline, low, high, mat, edge=.035):
    """Triangulated extrusion of a convex, CCW polygon; validate actual winding and volume."""
    n = len(outline)
    verts = [(float(x),float(y),z) for z in (low,high) for x,y in outline]
    faces = [(0,i+1,i) for i in range(1,n-1)] + [(n,n+i,n+i+1) for i in range(1,n-1)]
    for i in range(n):
        j = (i+1)%n
        faces.extend([(i,j,j+n),(i,j+n,i+n)])
    return stats.solid(group,name,verts,faces,mat,edge)


def bar(group, name, a, b, width, mat, *, depth=None, edge=.012):
    u,v = Vector(a),Vector(b)
    out = box(group,name,(u+v)/2,(width,depth or width,(u-v).length),mat,edge)
    out.rotation_mode='QUATERNION'; out.rotation_quaternion=(v-u).to_track_quat('Z','Y')
    return out


def patch(group, name, xlim, ylim, n, m, height, mat, *, smooth=True, material_indices=None):
    """Regular NumPy heightfield, callable field receives whole xy arrays."""
    x,y = np.meshgrid(np.linspace(*xlim,n),np.linspace(*ylim,m))
    z = height(x,y)
    verts = np.stack((x,y,z),axis=-1).reshape((-1,3)).tolist()
    faces = [(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i) for j in range(m-1) for i in range(n-1)]
    return mesh(group,name,verts,faces,mat,material_indices,smooth=smooth)


def links_from(obj, group, name, at, scale, quaternion=None):
    import bpy
    clone = bpy.data.objects.new(name,obj.data)
    group.objects.link(clone); clone.location=at; clone.scale=scale
    if quaternion is not None:
        clone.rotation_mode='QUATERNION'; clone.rotation_quaternion=quaternion
    return clone


def parent_local(obj, root):
    # Factories specify the transform in the parent's own coordinate system.
    obj.parent=root
    return obj
