"""Meridian authoring and editorial commands (independent Python environments per stage)."""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

from blender_pipeline.manifest import PipelineError

from .edl import PRESETS, ROOT, load_plan


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', type=Path, default=Path('out/meridian'), help='output directory for this delivery')
    cmd = p.add_subparsers(dest='command', required=True)
    b = cmd.add_parser('build')
    b.add_argument('--preset', choices=PRESETS, default='draft')
    b.add_argument('--project', type=Path, default=ROOT / 'meridian.json')
    cmd.add_parser('matrix')
    r = cmd.add_parser('render')
    r.add_argument('--shard', required=True)
    r.add_argument('--threads', type=int, choices=range(1,5))
    cmd.add_parser('manim')
    cmd.add_parser('stage')
    cmd.add_parser('compose', help='compose with Pillow/FFmpeg instead of Remotion')
    cmd.add_parser('export')
    args = p.parse_args()
    root = args.root.resolve()
    try:
        match args.command:
            case 'build':
                from .plates import build
                build(root, args.project, args.preset)
            case 'matrix':
                print(json.dumps({'include': load_plan(root)['shards']}, separators=(',',':')))
            case 'render':
                from .plates import render
                render(root, args.shard, args.threads)
            case 'manim':
                from .manim_stage import render_diagrams
                render_diagrams(root)
            case 'stage':
                from .delivery import stage
                stage(root)
            case 'compose':
                from .open_compose import compose
                compose(root)
            case 'export':
                from .delivery import export
                export(root)
    except (PipelineError, ImportError, OSError, subprocess.TimeoutExpired, ValueError, KeyError) as exc:
        message = f'{args.command}: {exc}'
        if os.getenv('GITHUB_ACTIONS') == 'true':
            message = '::error title=Meridian production::' + message.replace('%', '%25').replace('\r','%0D').replace('\n','%0A')[:3000]
        print(message, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
