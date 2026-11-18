"""Build, render and verify the Lantern Tide project in independent stages."""

import argparse
import json
from pathlib import Path
import subprocess
import sys

from .manifest import PROFILES, PipelineError, load_manifest

WORK = Path("out/blender-cpu")


def positive_int(text):
    value = int(text)
    if value < 1:
        raise argparse.ArgumentTypeError("must be positive")
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    build = sub.add_parser("build", help="generate the editable .blend, QA it and freeze a render manifest")
    build.add_argument("--profile", choices=PROFILES, default="ci")
    matrix = sub.add_parser("matrix", help="emit the manifest's inclusive ranges as a GitHub Actions matrix")
    render = sub.add_parser("render", help="render one shard (also the resume command)")
    render.add_argument("--shard", required=True, help="shard id printed by 'matrix', e.g. 00")
    render.add_argument("--threads", type=positive_int, help="limit Cycles threads on shared hardware")
    render.add_argument("--attempts", type=int, choices=(1, 2, 3), default=2)
    assemble = sub.add_parser("assemble", help="verify all frames, encode and decode-check the MP4")
    assemble.add_argument("--output", type=Path, default=WORK / "final")
    for stage in (build, matrix, render, assemble):
        stage.add_argument("--bundle", type=Path, default=WORK / "bundle")
    for stage in (render, assemble):
        stage.add_argument("--frames-root", type=Path, default=WORK / "frames")
    args = parser.parse_args()
    try:
        if args.command == "build":
            from .authoring import build as run_build
            run_build(args.bundle, args.profile)
        elif args.command == "matrix":
            doc, _ = load_manifest(args.bundle)
            print(json.dumps({"include": doc["shards"]}, separators=(",", ":")))
        elif args.command == "render":
            from .worker import render as run_worker
            run_worker(args.bundle, args.frames_root, args.shard, args.threads, args.attempts)
        else:
            from .media import assemble as run_assembly
            run_assembly(args.bundle, args.frames_root, args.output)
    except (PipelineError, OSError, ImportError, subprocess.TimeoutExpired) as exc:
        print(f"Blender pipeline: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
