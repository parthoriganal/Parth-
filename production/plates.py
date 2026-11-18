"""Build portable shot files; render and resume each shot in independent batches."""

from dataclasses import asdict

import os
import resource
import time

from blender_pipeline.authoring import check_runtime
from blender_pipeline.manifest import PipelineError, digest, frame_ids, frame_name, read_json, write_json
from blender_pipeline.media import RECEIPT, check_cached, empty_receipt, frame_stats, load_receipt
from blender_pipeline.worker import load_scene, log_event

from .edl import BLENDER_TEMPLATES, blend_path, editorial_plan, load_plan, write_plan
from .models import LAND_SEGMENTS, model_spec


def check(condition, label):
    if not condition:
        raise PipelineError(f'Scene QA: {label}')


def audit(bpy, shot, settings):
    scene = bpy.context.scene
    check(scene.camera and scene.render.engine == 'CYCLES' and scene.cycles.device == 'CPU', 'missing CPU scene/camera')
    check((scene.render.resolution_x, scene.render.resolution_y, scene.render.fps, scene.frame_end) ==
          (settings['plate_width'], settings['plate_height'], settings['fps'], shot['frames']), 'scene/EDL mismatch')
    check(not bpy.data.libraries and not any(f.filepath != '<builtin>' and not f.packed_file for f in bpy.data.fonts),
          'external library or unpacked font')
    check(not any(i.source in {'FILE','MOVIE','SEQUENCE','TILED'} and not i.packed_file for i in bpy.data.images),
          'external image')
    scene.frame_set(1)
    location = scene.camera.matrix_world.translation.copy()
    lens = scene.camera.data.lens
    armatures = [obj for obj in scene.objects if obj.type == 'ARMATURE']
    rig, suit = None, None
    if shot['template'] == 'pavilion':
        check(len(armatures) == 1, 'shelter needs one skinned character')
        rig, = armatures
        suit = next(obj for obj in rig.children if obj.type == 'MESH')
        check(len(rig.data.bones) >= 13 and len(suit.vertex_groups) >= 13, 'missing skeleton bindings')
        check(all(v.groups for v in suit.data.vertices), 'unskinned suit vertices')
        before = [v.co.copy() for v in suit.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices]
        root = rig.location.copy()
    scene.frame_set(shot['frames'])
    distance = (scene.camera.matrix_world.translation - location).length
    check(distance > .3 and abs(scene.camera.data.lens - lens) >= 1, 'camera or focal animation inactive')
    report = {'shot': shot['id'], 'objects':len(scene.objects), 'materials':len(bpy.data.materials),
              'packed_fonts':sum(bool(f.packed_file) for f in bpy.data.fonts),
              'camera_travel':round(distance, 3), 'lens_mm':[round(lens,2), round(scene.camera.data.lens,2)]}
    template = shot['template']
    model = model_spec(template, shot.get('model', {}))
    if template == 'product':
        count = sum(o.name.startswith('Indexed knurl') for o in scene.objects)
        check(count == 2 * model.rib_count, 'incorrect modeled knurl count')
        report['knurls'] = count
    elif template == 'pavilion':
        count = sum(o.name.startswith('Vault module ') and o.name.endswith(' • cast vault') for o in scene.objects)
        check(count == model.bays, 'incorrect modeled vault count')
        report['vault_bays'] = count
    elif template == 'landscape':
        land = scene.objects.get('Headland • stratified terrain surface')
        check(land and len(land.data.vertices) == (model.layers + 1) * LAND_SEGMENTS,
              'incorrect modeled terrain rings')
        report['terrain_vertices'] = len(land.data.vertices)
    report['model'] = asdict(model)
    if rig:
        after = suit.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices
        changed = sum((a.co - b).length > .02 for a,b in zip(after, before))
        travel = (rig.location-root).length
        check(changed >= 150 and travel > 1.0, 'no evaluated skin deformation / root travel')
        report.update(bones=len(rig.data.bones), deformed_vertices=changed, actor_travel=round(travel,2))
    scene.frame_set(1)
    return report


def build(root, project_file, preset):
    import bpy

    from .sets import make_scene

    check_runtime(bpy)
    doc = editorial_plan(read_json(project_file), preset)
    (root / 'bundle').mkdir(parents=True, exist_ok=True)
    qa = []
    for shot in doc['shots']:
        if shot['template'] not in BLENDER_TEMPLATES:
            continue
        make_scene(shot, doc['settings'])
        path = blend_path(root, shot['id']).resolve()
        draft = path.with_name('.' + path.name)
        bpy.context.preferences.filepaths.save_version = 0
        try:
            check(bpy.ops.wm.save_as_mainfile(filepath=str(draft), compress=True, relative_remap=False) == {'FINISHED'},
                  f'did not save {path.name}')
            check(bpy.ops.wm.open_mainfile(filepath=str(draft), load_ui=False, use_scripts=False) == {'FINISHED'},
                  f'did not reopen {path.name}')
            qa.append(audit(bpy, shot, doc['settings']))
            draft.replace(path)
        finally:
            draft.unlink(missing_ok=True)
    plan = write_plan(root, doc, bpy.app.build_hash.decode())
    write_json(root / 'bundle/scene-qa.json', {'project_id':plan['project_id'], 'status':'pass', 'shots':qa})
    print(f"Prepared {len(qa)} editable .blend files, {len(plan['shards'])} batches, {plan['frames']} final frames.", flush=True)


def render(root, shard_id, threads=None):
    doc = load_plan(root)
    shard = next((s for s in doc['shards'] if s['id'] == shard_id), None)
    if not shard:
        raise PipelineError(f'Unknown batch {shard_id}; use the matrix command')
    blend = blend_path(root, shard['shot']).resolve()
    if not blend.is_file() or digest(blend) != doc['scene_sha256'][shard['shot']]:
        raise PipelineError(f'Changed/missing {blend.name}: rebuild the scene bundle')
    folder = root / 'frames' / shard_id
    folder.mkdir(parents=True, exist_ok=True)
    settings = doc['settings']
    size = (settings['plate_width'], settings['plate_height'])
    try:
        receipt = load_receipt(folder, doc, shard)
    except PipelineError as exc:
        if (folder / RECEIPT).exists():
            log_event(folder, 'discarded_receipt', reason=str(exc))
        receipt = empty_receipt(doc, shard)
    pending, reused = [], 0
    for i in frame_ids(shard):
        try:
            check_cached(folder, receipt, i, size)
        except PipelineError as exc:
            if str(i) in receipt['frames']:
                log_event(folder, 'invalidated', frame=i, reason=str(exc))
                del receipt['frames'][str(i)]
            pending.append(i)
        else:
            reused += 1
    write_json(folder / RECEIPT, receipt)
    if not pending:
        log_event(folder, 'complete', rendered=0, reused=reused)
        return

    import bpy

    check_runtime(bpy)
    if bpy.app.build_hash.decode() != doc['blender_build']:
        raise PipelineError('Blender worker version does not match scene bundle')
    cap = len(os.sched_getaffinity(0)) if hasattr(os, 'sched_getaffinity') else os.cpu_count() or 1
    threads = min(cap, threads or cap, 4)
    scene = load_scene(bpy, blend, threads)
    batch_start = time.monotonic()
    for i in pending:
        dest = (folder / frame_name(i)).resolve()
        work = dest.with_name(f'.{dest.stem}.partial.png')
        for attempt in (1, 2):
            work.unlink(missing_ok=True)
            start = time.monotonic()
            try:
                scene.frame_set(i)
                scene.render.filepath = str(work)
                if bpy.ops.render.render(write_still=True) != {'FINISHED'}:
                    raise PipelineError('Blender did not render')
                stats = frame_stats(work, size)
                sha = digest(work)
                work.replace(dest)
                receipt['frames'][str(i)] = sha
                write_json(folder / RECEIPT, receipt)
                log_event(folder, 'rendered', frame=i, seconds=round(time.monotonic()-start, 2),
                          attempt=attempt, bytes=dest.stat().st_size, **stats)
                break
            except (RuntimeError, OSError) as exc:
                log_event(folder, 'error', frame=i, attempt=attempt, reason=str(exc))
                if attempt == 2:
                    raise PipelineError(f'{shard_id}/{i}: both attempts failed: {exc}') from exc
                scene = load_scene(bpy, blend, threads)
            finally:
                work.unlink(missing_ok=True)
    log_event(folder,'complete', rendered=len(pending), reused=reused, threads=threads,
              seconds=round(time.monotonic()-batch_start, 2),
              peak_rss_mib=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1))
