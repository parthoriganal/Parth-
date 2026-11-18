"""Validate image sequences and assemble a verified MP4 without importing Blender."""

import os
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory
import time

from PIL import Image, ImageChops, ImageDraw, ImageStat, UnidentifiedImageError

from .manifest import (BLEND, MANIFEST, PipelineError, digest, frame_ids, frame_name, load_manifest,
                       read_json, shard_dir, write_json)

RECEIPT = "receipt.json"


def frame_stats(path, size):
    """Reject corrupt, wrong-size and essentially blank RGB frames before reuse/assembly."""
    try:
        with Image.open(path) as image:
            if image.format != "PNG" or image.size != size or image.mode != "RGB":
                raise PipelineError(f"{path.name}: expected RGB PNG at {size[0]} × {size[1]}")
            image.verify()
        with Image.open(path) as image:
            image.load()  # verify() alone does not decode all pixel rows
            image.thumbnail((128, 128))
            stats = ImageStat.Stat(image.convert("L"))
            mean, spread = stats.mean[0], stats.stddev[0]
    except (OSError, UnidentifiedImageError, SyntaxError, ValueError) as exc:
        raise PipelineError(f"Cannot decode {path.name}: {exc}") from exc
    if mean < 2.0 or mean > 253.0 or spread < 2.0:
        raise PipelineError(f"{path.name}: blank or near-uniform render (luma {mean:.1f} ± {spread:.1f})")
    return {"luma_mean": round(mean, 2), "luma_stddev": round(spread, 2)}


def empty_receipt(project, shard):
    return {"project_id": project["project_id"], "shard": shard, "frames": {}}


def load_receipt(folder, project, shard):
    receipt = read_json(folder / RECEIPT)
    if (receipt.get("project_id") != project["project_id"] or receipt.get("shard") != shard
            or not isinstance(receipt.get("frames"), dict)):
        raise PipelineError(f"{folder.name}: receipt belongs to another build or shard")
    return receipt


def check_cached(folder, receipt, i, size):
    path = folder / frame_name(i)
    sha = receipt["frames"].get(str(i))
    if not isinstance(sha, str) or not path.is_file() or digest(path) != sha:
        raise PipelineError(f"{folder.name}/{path.name}: missing frame or checksum mismatch")
    return frame_stats(path, size)


def verified_frames(frames_root, project, profile):
    """Use only the manifest's ordered ranges; don't glob stale extra frames into a video."""
    paths, stats = [], []
    for shard in project["shards"]:
        folder = shard_dir(frames_root, shard)
        receipt = load_receipt(folder, project, shard)
        for i in frame_ids(shard):
            stats.append(check_cached(folder, receipt, i, (profile.width, profile.height)))
            paths.append(folder / frame_name(i))
    return paths, stats


def thumbnail(path):
    with Image.open(path) as image:
        return image.convert("RGB").resize((320, 240), Image.Resampling.LANCZOS)


def contact_sheet(paths, indices, destination):
    canvas = Image.new("RGB", (1008, 300), "#15292d")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 8), "LANTERN TIDE  /  Animation QA", fill="#f2dfb9")
    for column, i in enumerate(indices):
        x = 12 + column * 332
        canvas.paste(thumbnail(paths[i]), (x, 28))
        draw.text((x, 276), f"FRAME {i + 1:05d}", fill="#c0d0c8")
    canvas.save(destination, quality=91, optimize=True)


def ffmpeg_run(exe, args, log):
    with log.open("a", encoding="utf-8") as stream:
        stream.write(f"\n$ ffmpeg {args!r}\n")
        stream.flush()
        result = subprocess.run([exe, *args], stdin=subprocess.DEVNULL, text=True, stdout=subprocess.PIPE,
                                stderr=stream, timeout=600, check=False)
        stream.write(result.stdout)
    if result.returncode:
        raise PipelineError(f"FFmpeg exited with {result.returncode}; see {log}")
    return result.stdout


def verify_video(exe, path, profile, log):
    report = ffmpeg_run(exe, ["-hide_banner", "-v", "error", "-xerror", "-threads", "2", "-i", str(path),
                              "-map", "0:v:0", "-an", "-f", "framemd5", "-"], log)
    dims = re.search(r"^#dimensions 0: (\d+)x(\d+)$", report, re.MULTILINE)
    rows = [line.split(",") for line in report.splitlines() if line and not line.startswith("#")]
    if dims is None or tuple(map(int, dims.groups())) != (profile.width, profile.height) or len(rows) != profile.frames:
        raise PipelineError("Encoded MP4 does not decode to the expected resolution and frame count")
    tb = re.search(r"^#tb 0: (\d+)/(\d+)$", report, re.MULTILINE)
    times = [int(row[2]) for row in rows]
    if tb is None or int(tb[2]) != int(tb[1]) * profile.fps or times != list(range(profile.frames)):
        raise PipelineError("Encoded MP4 does not have the planned constant frame rate")


def assemble(bundle, frames_root, output):
    import imageio_ffmpeg

    started = time.monotonic()
    project, profile = load_manifest(bundle)
    scene_qa = read_json(bundle / "scene-qa.json")
    if scene_qa.get("project_id") != project["project_id"] or scene_qa.get("status") != "pass":
        raise PipelineError("Scene QA report missing or stale")
    paths, stats = verified_frames(frames_root, project, profile)
    # Sample the two extrema of the camera motion, not only the coincident start/midpoint.
    indices = (0, profile.frames // 4, 3 * profile.frames // 4)
    base = thumbnail(paths[0])
    motion = [sum(ImageStat.Stat(ImageChops.difference(base, thumbnail(paths[i]))).mean) / 3 for i in indices[1:]]
    if min(motion) < 2.0:
        raise PipelineError("Animation QA: orbit samples are visually indistinguishable from frame 1")

    output.mkdir(parents=True, exist_ok=True)
    log = output / "encode.log"
    log.write_text("", encoding="utf-8")
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    build = ffmpeg_run(exe, ["-version"], log).splitlines()[0]
    video = output / "lantern-tide.mp4"
    with TemporaryDirectory(prefix=".encode-", dir=output) as temp:
        sequence = Path(temp)
        for path in paths:
            target = sequence / path.name
            try:
                os.link(path, target)
            except OSError:
                shutil.copyfile(path, target)
        draft = sequence / video.name
        ffmpeg_run(exe, ["-hide_banner", "-loglevel", "warning", "-nostdin", "-y", "-framerate", str(profile.fps),
                         "-start_number", "1", "-i", str(sequence / "frame-%05d.png"), "-an",
                         "-frames:v", str(profile.frames), "-vf", "format=yuv420p", "-filter_threads", "2",
                         "-c:v", "libx264", "-threads", "2", "-preset", "fast", "-crf", "19",
                         "-movflags", "+faststart", str(draft)], log)
        verify_video(exe, draft, profile, log)
        draft.replace(video)

    contact_sheet(paths, indices, output / "contact-sheet.jpg")
    shutil.copyfile(paths[0], output / "poster.png")
    for name in (BLEND, MANIFEST, "scene-qa.json"):
        shutil.copyfile(bundle / name, output / name)
    summary = {"status": "pass", "project_id": project["project_id"], "profile": project["profile"],
               "resolution": [profile.width, profile.height], "decoded_frames": profile.frames, "fps": profile.fps,
               "seconds": profile.frames / profile.fps, "verified_shards": len(project["shards"]),
               "min_frame_luma_stddev": min(s["luma_stddev"] for s in stats),
               "orbit_pixel_delta_min": round(min(motion), 2), "encode_and_qa_seconds": round(time.monotonic() - started, 2),
               "ffmpeg": build, "mp4_sha256": digest(video), "frame_bytes": sum(p.stat().st_size for p in paths),
               "video_bytes": video.stat().st_size}
    write_json(output / "render-qa.json", summary)
    print(f"Video QA passed: {profile.frames} frames at {profile.width}×{profile.height}, {profile.fps} fps → {video}.",
          flush=True)
