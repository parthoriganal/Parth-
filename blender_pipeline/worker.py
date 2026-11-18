"""Render one Cycles CPU shard with checksummed, atomic frame recovery."""

from datetime import datetime, timezone
import json
import os
import resource
import time

from .authoring import check_runtime
from .manifest import BLEND, PipelineError, digest, frame_ids, frame_name, load_manifest, shard_dir, write_json
from .media import RECEIPT, check_cached, empty_receipt, frame_stats, load_receipt


def log_event(folder, event, **data):
    record = {"event": event, "utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), **data}
    with (folder / "events.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, sort_keys=True) + "\n")
    print(json.dumps(record, sort_keys=True), flush=True)


def load_scene(bpy, blend, threads, *, persistent_data=False):
    if bpy.ops.wm.open_mainfile(filepath=str(blend), load_ui=False, use_scripts=False) != {"FINISHED"}:
        raise PipelineError(f"Could not open {blend}")
    scene = bpy.context.scene
    scene.render.threads_mode, scene.render.threads = "FIXED", threads
    scene.render.use_persistent_data = persistent_data  # Opt in per project/worker memory budget.
    return scene


def render(bundle, frames_root, shard_id, threads=None, attempts=2, *, manifest_loader=load_manifest,
           blend_name=BLEND, persistent_data=False):
    project, profile = manifest_loader(bundle)
    shard = next((item for item in project["shards"] if item["id"] == shard_id), None)
    if shard is None:
        raise PipelineError(f"Unknown shard {shard_id!r}; use the id from the matrix command")
    folder = shard_dir(frames_root, shard)
    folder.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    try:
        receipt = load_receipt(folder, project, shard)
    except PipelineError as exc:
        if (folder / RECEIPT).exists():
            log_event(folder, "ignored_receipt", reason=str(exc))
        receipt = empty_receipt(project, shard)
    log_event(folder, "shard_started", project_id=project["project_id"], **shard)
    size = (profile.width, profile.height)
    missing = []
    for i in frame_ids(shard):
        try:
            check_cached(folder, receipt, i, size)
        except PipelineError as exc:
            if str(i) in receipt["frames"]:
                log_event(folder, "invalid_frame", frame=i, reason=str(exc))
            missing.append(i)
            receipt["frames"].pop(str(i), None)
        else:
            log_event(folder, "reused_frame", frame=i)
    write_json(folder / RECEIPT, receipt)
    if not missing:
        log_event(folder, "shard_complete", new_frames=0, reused_frames=len(receipt["frames"]))
        return

    import bpy

    check_runtime(bpy)
    build_hash = bpy.app.build_hash.decode()
    if build_hash != project["toolchain"]["Blender build"]:
        raise PipelineError(f"Worker Blender build {build_hash} does not match the scene build")
    available = len(os.sched_getaffinity(0)) if hasattr(os, "sched_getaffinity") else (os.cpu_count() or 1)
    threads = min(threads or available, available)
    blend = (bundle / blend_name).resolve()
    scene = load_scene(bpy, blend, threads, persistent_data=persistent_data)
    for i in missing:
        dest = (folder / frame_name(i)).resolve()
        tmp = dest.with_name(f".{dest.stem}.partial.png")
        for attempt in range(1, attempts + 1):
            tmp.unlink(missing_ok=True)
            frame_started = time.monotonic()
            try:
                scene.frame_set(i)
                scene.render.filepath = str(tmp)
                if bpy.ops.render.render(write_still=True) != {"FINISHED"}:
                    raise PipelineError("Render was not finished")
                stats = frame_stats(tmp, size)
                sha = digest(tmp)
                tmp.replace(dest)
                receipt["frames"][str(i)] = sha
                write_json(folder / RECEIPT, receipt)
                log_event(folder, "rendered_frame", frame=i, attempt=attempt, bytes=dest.stat().st_size,
                          seconds=round(time.monotonic() - frame_started, 2), sha256=sha, **stats)
                break
            except (RuntimeError, OSError) as exc:
                log_event(folder, "failed_frame", frame=i, attempt=attempt, reason=str(exc))
                if attempt == attempts:
                    raise PipelineError(f"{shard_id}: frame {i} still failed after {attempts} attempt(s)") from exc
                scene = load_scene(bpy, blend, threads, persistent_data=persistent_data)
            finally:
                tmp.unlink(missing_ok=True)
    log_event(folder, "shard_complete", new_frames=len(missing), reused_frames=len(receipt["frames"]) - len(missing),
              cpu_threads=threads, peak_rss_mib=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1),
              seconds=round(time.monotonic() - started, 2))
