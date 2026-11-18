"""Build, render/resume, and verify A Passing Hello on the Meridian CPU pipeline."""

import argparse
import json
from pathlib import Path
import sys

from blender_pipeline.manifest import PipelineError
from .project import BLEND, load_plan, render


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,default=Path('out/a-passing-hello'))
    cmd=p.add_subparsers(dest='cmd',required=True)
    cmd.add_parser('build',help='author, reopen and inspect the editable scene')
    cmd.add_parser('matrix',help='print the frozen CPU batches')
    r=cmd.add_parser('render',help='render or resume any batch (or all)')
    r.add_argument('--shard'); r.add_argument('--threads',type=int,choices=range(1,5))
    s=cmd.add_parser('samples',help='unofficial QA stills from the saved scene')
    s.add_argument('frames',nargs='+',type=int); s.add_argument('--width',type=int); s.add_argument('--samples',type=int)
    cmd.add_parser('deliver',help='check every plate, assemble, decode and archive')
    a=p.parse_args(); root=a.root.resolve()
    try:
        if a.cmd=='build':
            from .scene import prepare
            prepare(root)
        elif a.cmd=='matrix':
            print(json.dumps({'include':load_plan(root/'bundle')[0]['shards']},separators=(',',':')))
        elif a.cmd=='render':
            render(root,a.shard,a.threads)
        elif a.cmd=='samples':
            from .scene import samples
            res=(a.width,round(a.width*9/16)) if a.width else None
            samples(root/'bundle'/BLEND,root/'samples',a.frames,res,a.samples)
        else:
            from .delivery import deliver
            deliver(root)
    except PipelineError as exc:
        print(f'A Passing Hello: {exc}',file=sys.stderr)
        return 1
    return 0


if __name__=='__main__':
    raise SystemExit(main())
