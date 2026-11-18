"""Build and run sample-specific scene QA with Blender's evaluated data API."""

from importlib.metadata import version
import platform
from pathlib import Path
import runpy
import time

from .manifest import BLEND, BLENDER_VERSION, ROOT, PROFILES, PipelineError, create_manifest, write_json


def check(ok, description):
    if not ok:
        raise PipelineError(f"Scene QA failed: {description}")


def check_runtime(bpy):
    check(tuple(bpy.app.version) == BLENDER_VERSION, f"expected Blender {BLENDER_VERSION}, got {bpy.app.version_string}")
    check(bpy.app.background, "expected headless Blender")


def blender_toolchain(bpy):
    return {"Blender": bpy.app.version_string, "Blender build": bpy.app.build_hash.decode(),
            "Python": platform.python_version(), "OS": platform.system(), "architecture": platform.machine(),
            "NumPy": version("numpy"), "trimesh": version("trimesh"), "Pillow": version("Pillow")}


def save_blend(bpy, scene, path: Path):
    bpy.context.preferences.filepaths.save_version = 0
    scene.render.filepath = "//frames/frame-"
    if bpy.ops.wm.save_as_mainfile(filepath=str(path), compress=True, relative_remap=False) != {"FINISHED"}:
        raise PipelineError(f"Failed to save {path}")


def inspect(bpy, scene, profile):
    import numpy as np
    import trimesh

    check(scene.camera is not None and scene.camera.type == "CAMERA", "no active camera")
    check(scene.render.engine == "CYCLES" and scene.cycles.device == "CPU", "not configured for Cycles CPU")
    check((scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage,
           scene.frame_start, scene.frame_end, scene.render.fps, scene.cycles.samples) ==
          (profile.width, profile.height, 100, 1, profile.frames, profile.fps, profile.samples),
          "scene settings do not match the render plan")
    check(not bpy.data.libraries and not any(img.source in {"FILE", "SEQUENCE", "MOVIE", "TILED"}
                                           and not img.packed_file for img in bpy.data.images), "external asset")
    check(not any(font.filepath != "<builtin>" and not font.packed_file for font in bpy.data.fonts),
          "unpacked font")
    check(not any(block.as_pointer() for block in bpy.data.texts if block.use_module), "auto-run Blender text")
    check(len(scene.collection.children) >= 8, "missing named scene collections")
    for obj in scene.objects:
        check(not obj.animation_data or not obj.animation_data.drivers, f"unexpected driver on {obj.name}")
    scene.frame_set(1)
    start = scene.camera.matrix_world.translation.copy()
    scene.frame_set(1 + profile.frames // 4)
    travel = (scene.camera.matrix_world.translation - start).length
    check(travel > 1.0, "camera orbit did not move")
    scene.frame_set(profile.frames + 1)
    check((scene.camera.matrix_world.translation - start).length < 1e-4, "camera orbit does not loop")
    scene.frame_set(1)

    obj = scene.objects["Tapered striped lighthouse"]
    mesh = obj.data
    uv = mesh.uv_layers.get("Lighthouse atlas")
    check(uv is not None and len(uv.uv) == len(mesh.loops), "incomplete lighthouse UV atlas")
    coords = np.empty(len(mesh.loops) * 2, dtype=np.float32)
    uv.uv.foreach_get("vector", coords)
    coords = coords.reshape((-1, 2))
    check(np.isfinite(coords).all() and ((coords > 0) & (coords < 1)).all(), "invalid UV coordinates")
    for poly in mesh.polygons:
        ring = coords[poly.loop_start:poly.loop_start + poly.loop_total]
        area = abs(np.dot(ring[:, 0], np.roll(ring[:, 1], -1)) - np.dot(ring[:, 1], np.roll(ring[:, 0], -1))) / 2
        check(area > 1e-6, f"collapsed UV face {poly.index}")

    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    tower = evaluated.to_mesh()
    try:
        xyz = np.empty(len(tower.vertices) * 3, dtype=np.float32)
        tower.vertices.foreach_get("co", xyz)
        tower.calc_loop_triangles()
        faces = np.empty(len(tower.loop_triangles) * 3, dtype=np.int32)
        tower.loop_triangles.foreach_get("vertices", faces)
        check(np.isfinite(xyz).all(), "non-finite tower vertices")
        solid = trimesh.Trimesh(vertices=xyz.reshape((-1, 3)), faces=faces.reshape((-1, 3)), process=False)
        check(solid.is_watertight and solid.is_winding_consistent and solid.volume > 0, "invalid tower topology")
    finally:
        evaluated.to_mesh_clear()

    scatter = scene.objects["Shell trail • instanced pebbles"]
    instances = sum(i.is_instance and i.parent is not None and i.parent.original == scatter
                    for i in depsgraph.object_instances)
    check(instances == len(scatter.data.vertices) and instances >= 50, "Geometry Nodes did not instance the trail")
    rock = scene.objects["Eroded cliff study"]
    rock_eval = rock.evaluated_get(depsgraph)
    check(rock_eval.type == "MESH" and len(rock_eval.data.polygons) > len(rock.data.polygons),
          "erosion stack did not refine the base mesh")
    check(len(obj.data.materials) == 2 and all(mat.node_tree for mat in obj.data.materials), "missing PBR paint bands")

    return {"status": "pass", "objects": len(scene.objects), "collections": len(scene.collection.children),
            "camera_travel_m": round(travel, 3), "camera_loop_closes": True, "tower_uv_loops": len(coords),
            "tower_triangles": len(solid.faces), "tower_closed_manifold": True, "tower_volume_m3": round(solid.volume, 4),
            "pebble_instances": instances, "erosion_base_faces": len(rock.data.polygons),
            "erosion_evaluated_faces": len(rock_eval.data.polygons), "materials": len(bpy.data.materials),
            "external_asset_paths": 0, "render_engine": "Cycles CPU"}


def build(bundle, profile_name):
    import bpy

    started = time.monotonic()
    check_runtime(bpy)
    profile = PROFILES[profile_name]
    bundle.mkdir(parents=True, exist_ok=True)
    blender_script = runpy.run_path(str(ROOT / "lantern-tide" / "render_scene.py"))
    scene = blender_script["build_scene"](profile.width, profile.samples, frames=profile.frames, fps=profile.fps)
    # Validate the serialized project, not only the in-memory generator state.
    path = bundle / BLEND
    tmp = bundle / ".build.blend"
    try:
        save_blend(bpy, scene, tmp.resolve())
        check(bpy.ops.wm.open_mainfile(filepath=str(tmp.resolve()), load_ui=False, use_scripts=False) == {"FINISHED"},
              "could not reopen the scene")
        qa = inspect(bpy, bpy.context.scene, profile)
        tmp.replace(path)
    finally:
        tmp.unlink(missing_ok=True)
    qa["build_and_qa_seconds"] = round(time.monotonic() - started, 2)
    toolchain = blender_toolchain(bpy)
    doc = create_manifest(bundle, profile_name, toolchain)
    write_json(bundle / "scene-qa.json", {**qa, "project_id": doc["project_id"], "toolchain": toolchain})
    print(f"Built {path} ({qa['objects']} objects; {qa['pebble_instances']} pebble instances). Scene QA passed.", flush=True)
