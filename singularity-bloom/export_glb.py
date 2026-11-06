"""Re-export the web model from the saved .blend without re-rendering.

    ./.venv/bin/python export_glb.py [out/singularity_bloom.blend] [out/singularity_bloom.glb]
"""
import os
import sys

import bpy

blend = sys.argv[1] if len(sys.argv) > 1 else "out/singularity_bloom.blend"
glb = sys.argv[2] if len(sys.argv) > 2 else "out/singularity_bloom.glb"
here = os.path.dirname(os.path.abspath(__file__))
blend = blend if os.path.isabs(blend) else os.path.join(here, blend)
glb = glb if os.path.isabs(glb) else os.path.join(here, glb)

bpy.ops.wm.open_mainfile(filepath=blend)
for name in ("Floor", "Haze", "Halo.Card"):
    ob = bpy.data.objects.get(name)
    if ob:
        ob.hide_render = True
        ob.hide_set(True)

bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB",
                          use_selection=False, use_visible=True,
                          export_apply=True, export_cameras=False,
                          export_lights=False, export_yup=True)
print("[export] ", glb, round(os.path.getsize(glb) / 1e6, 2), "MB")
