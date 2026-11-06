"""Export the sculpture as Wavefront OBJ + MTL from the saved .blend.

    ./.venv/bin/python singularity-bloom/export_obj.py \
        singularity-bloom/out/singularity_bloom.blend \
        singularity-bloom/docs/singularity_bloom.obj

OBJ has no PBR, so the MTL carries base colour / specular / emissive approximations;
use the .glb if you want the real materials. Geometry is identical.
"""
import os
import sys

import bpy

here = os.path.dirname(os.path.abspath(__file__))
blend = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "out", "singularity_bloom.blend")
obj = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, "docs", "singularity_bloom.obj")
blend = blend if os.path.isabs(blend) else os.path.join(os.getcwd(), blend)
obj = obj if os.path.isabs(obj) else os.path.join(os.getcwd(), obj)
os.makedirs(os.path.dirname(obj), exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=blend)

# set dressing stays out of the model, same rule as the glTF export
SKIP = {"Floor", "Haze", "Halo.Card"}
bpy.ops.object.select_all(action="DESELECT")
for ob in bpy.data.objects:
    if ob.type == "MESH" and ob.name not in SKIP:
        ob.select_set(True)

bpy.ops.wm.obj_export(
    filepath=obj,
    export_selected_objects=True,
    apply_modifiers=True,
    export_materials=True,
    export_normals=True,
    export_uv=False,
    export_triangulated_mesh=True,
    export_smooth_groups=False,
    export_object_groups=True,
    export_material_groups=True,
    path_mode="RELATIVE",
    forward_axis="NEGATIVE_Z",
    up_axis="Y",
    global_scale=1.0,
)

# Blender's OBJ writer can't read a pure Emission node, so the Glow.* materials
# lose their self-illumination. Patch Ke (emissive) to match Kd for those, which is
# what most OBJ importers look at.
mtl_path = os.path.splitext(obj)[0] + ".mtl"
if os.path.exists(mtl_path):
    blocks, cur = [], []
    for line in open(mtl_path):
        if line.startswith("newmtl ") and cur:
            blocks.append(cur)
            cur = [line]
        else:
            cur.append(line)
    if cur:
        blocks.append(cur)
    for b in blocks:
        if b and b[0].startswith("newmtl Glow."):
            kd = next((l.split()[1:] for l in b if l.startswith("Kd ")), None)
            if kd:
                for i, l in enumerate(b):
                    if l.startswith("Ke "):
                        b[i] = "Ke " + " ".join(kd) + "\n"
    with open(mtl_path, "w") as fh:
        for b in blocks:
            fh.writelines(b)

for ext in (".obj", ".mtl"):
    p = obj if ext == ".obj" else os.path.splitext(obj)[0] + ".mtl"
    if os.path.exists(p):
        print(f"[obj] {os.path.basename(p)}  {os.path.getsize(p)/1e6:.2f} MB")
