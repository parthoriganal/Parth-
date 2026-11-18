"""Meridian M/02 — build editable climate sets and render a checked cinematic edit."""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

from blender_pipeline.manifest import PipelineError
from production.edl import PRESETS
from .storyboard import DEFAULT, load_board, require_plan


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('out/meridian-m02'))
    cmds = parser.add_subparsers(dest='cmd', required=True)
    for verb in ('plan', 'build'):
        sub = cmds.add_parser(verb, help='compile a storyboard' if verb == 'plan' else 'author, inspect and reopen the Blender files')
        sub.add_argument('--preset', choices=PRESETS, default='draft')
        sub.add_argument('--board', type=Path, default=DEFAULT)
        if verb == 'build':
            sub.add_argument('--prove-repairs', action='store_true', help='inject and fix faults, in a separate proof-only root')
    cmds.add_parser('matrix', help='emit Actions frame-batch matrix JSON')
    render = cmds.add_parser('render', help='render/resume a shard, or every shard when omitted')
    render.add_argument('--shard')
    render.add_argument('--threads', type=int, choices=range(1, 5))
    cmds.add_parser('stage', help='verify receipt/dimensions and inspect every delivered plate')
    cmds.add_parser('compose', help='create the atlas edit with Pillow and FFmpeg')
    cmds.add_parser('export', help='mux and decode-check 3 streams; collect editable sources and QA')
    cmds.add_parser('details', help='render controlled look/rig/prop diagnostic pairs from a saved bundle')
    args = parser.parse_args()
    root = args.root.resolve()
    try:
        if args.cmd == 'plan':
            print(json.dumps(load_board(args.board, args.preset), ensure_ascii=False, indent=2))
        elif args.cmd == 'build':
            from .preflight import build
            if (root/'bundle/project.json').is_file():
                require_plan(root)
                from blender_pipeline.manifest import read_json
                old = read_json(root/'bundle/scene-qa.json')
                if bool(old.get('proof_only')) != args.prove_repairs:
                    raise PipelineError('Use different roots for clean and injected-fault builds')
            build(root, args.board, args.preset, args.prove_repairs)
        else:
            doc = require_plan(root)
            match args.cmd:
                case 'matrix':
                    print(json.dumps({'include': doc['shards']}, separators=(',',':')))
                case 'render':
                    from production.plates import render
                    for name in [args.shard] if args.shard else [s['id'] for s in doc['shards']]:
                        render(root, name, args.threads)
                case 'details':
                    from .details import run
                    run(root, doc)
                case 'stage':
                    from .edit import stage
                    stage(root, doc)
                case 'compose':
                    from .edit import compose
                    compose(root, doc)
                case 'export':
                    from .edit import export
                    export(root, doc)
    except (PipelineError, OSError, RuntimeError, ImportError, ValueError, KeyError, subprocess.SubprocessError) as exc:
        message = f'{args.cmd}: {exc}'
        if os.environ.get('GITHUB_ACTIONS') == 'true':
            message = '::error title=Meridian M/02::' + message.replace('%','%25').replace('\r','%0D').replace('\n','%0A')[:3000]
        print(message, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
