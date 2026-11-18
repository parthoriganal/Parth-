"""Immutable scene identity and deterministic frame plans."""

from dataclasses import asdict, dataclass
from hashlib import file_digest, sha256
import json
import os
from pathlib import Path
import re
from tempfile import NamedTemporaryFile

ROOT = Path(__file__).resolve().parent.parent
BLEND = "lantern-tide.blend"
MANIFEST = "project.json"
SCHEMA = 1
BLENDER_VERSION = (5, 0, 1)


class PipelineError(RuntimeError):
    """An invalid input or an unsuccessful pipeline operation."""


@dataclass(frozen=True)
class Profile:
    width: int
    height: int
    frames: int
    fps: int
    samples: int
    batch: int


PROFILES = {
    "ci": Profile(544, 408, 12, 8, 12, 4),
    "preview": Profile(768, 576, 36, 12, 16, 6),
    "quality": Profile(1152, 864, 72, 24, 32, 8),
}


def ranges(profile):
    """Inclusive ranges: no gaps, overlap or extra last frame."""
    return [
        {"id": f"{i:02d}", "first": first, "last": min(first + profile.batch - 1, profile.frames)}
        for i, first in enumerate(range(1, profile.frames + 1, profile.batch))
    ]


def frame_ids(shard):
    return range(shard["first"], shard["last"] + 1)


def frame_name(i):
    return f"frame-{i:05d}.png"


def shard_dir(root, shard):
    return root / f"shard-{shard['id']}"


def digest(path):
    with path.open("rb") as stream:
        return file_digest(stream, "sha256").hexdigest()


def identity(doc):
    content = {key: value for key, value in doc.items() if key != "project_id"}
    return sha256(json.dumps(content, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def write_json(path, data):
    """Rename only after serialization; interrupted writes cannot corrupt old receipts."""
    with NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, prefix=f".{path.name}.", delete=False) as f:
        tmp = Path(f.name)
        try:
            json.dump(data, f, indent=2, sort_keys=True)
            f.write("\n")
            f.close()
            os.replace(tmp, path)
        finally:
            tmp.unlink(missing_ok=True)


def read_json(path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise PipelineError(f"Cannot read {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise PipelineError(f"Expected a JSON object in {path}")
    return data


def create_manifest(bundle, name, toolchain):
    profile = PROFILES[name]
    sources = [ROOT / "lantern-tide" / "render_scene.py", *ROOT.glob("blender_pipeline/*.py"),
               *ROOT.glob("blender_pipeline/*.lock")]
    doc = {
        "schema": SCHEMA,
        "profile": name,
        "settings": asdict(profile),
        "shards": ranges(profile),
        "scene_sha256": digest(bundle / BLEND),
        "sources_sha256": {path.relative_to(ROOT).as_posix(): digest(path) for path in sorted(sources)},
        "toolchain": toolchain,
    }
    doc["project_id"] = identity(doc)
    write_json(bundle / MANIFEST, doc)
    return doc


def load_manifest(bundle):
    doc = read_json(bundle / MANIFEST)
    name = doc.get("profile")
    profile = PROFILES.get(name) if isinstance(name, str) else None
    if (doc.get("schema") != SCHEMA or profile is None or doc.get("settings") != asdict(profile)
            or doc.get("shards") != ranges(profile) or doc.get("project_id") != identity(doc)):
        raise PipelineError(f"Invalid or incompatible render manifest: {bundle / MANIFEST}")
    sha = doc.get("scene_sha256", "")
    if not isinstance(sha, str) or not re.fullmatch(r"[a-f0-9]{64}", sha):
        raise PipelineError("Invalid SHA-256 in render manifest")
    if not (bundle / BLEND).is_file() or digest(bundle / BLEND) != sha:
        raise PipelineError(f"Blend checksum mismatch: {bundle / BLEND}")
    return doc, profile
