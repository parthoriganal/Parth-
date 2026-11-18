"""Optional restricted-network review bridge for the finished small payloads only.

The frame archive stays in Actions artifacts. This writes unreferenced content-addressed
blobs (not branches, commits or releases), so the sandbox can inspect the exact MP4
through api.github.com if the external artifact storage host is unreachable.
"""

import argparse
from base64 import b64decode, b64encode
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess

from blender_pipeline.manifest import digest, write_json

CHUNK=650_000
MAX=22_000_000
NAMES=('a-passing-hello.mp4','a-passing-hello.blend','contact-sheet.jpg','poster.jpg','scene-qa.json','delivery-qa.json')


def api(repo,path,method='GET',payload=None):
    cmd=['gh','api',f'repos/{repo}/git/blobs{path}','-X',method]
    if payload is not None:
        cmd+=['--input','-']
    return json.loads(subprocess.check_output(cmd,input=payload,timeout=90))


def put(repo,target):
    def part(raw):
        data=json.dumps({'content':b64encode(raw).decode('ascii'),'encoding':'base64'}).encode()
        return api(repo,'','POST',data)['sha']
    out={}
    with ThreadPoolExecutor(max_workers=3) as ex:
        for name in NAMES:
            path=target/name
            if path.stat().st_size>MAX:
                raise RuntimeError(f'{name} exceeds the review relay size bound')
            raw=path.read_bytes()
            out[name]={'n':len(raw),'sha256':digest(path),
                       'chunks':list(ex.map(part,(raw[i:i+CHUNK] for i in range(0,len(raw),CHUNK))))}
    write_json(target/'review-relay.json',out)
    print('::notice title=Review relay receipt::'+json.dumps(out,separators=(',',':')),flush=True)


def get(repo,receipt,target):
    doc=json.loads(receipt.read_text()); target.mkdir(exist_ok=True,parents=True)
    def load(part): return b64decode(api(repo,'/'+part)['content'])
    with ThreadPoolExecutor(max_workers=4) as ex:
        for name in NAMES:
            item=doc[name]; path=target/name; tmp=path.with_suffix('.part')
            with tmp.open('wb') as f:
                for data in ex.map(load,item['chunks']): f.write(data)
            if tmp.stat().st_size!=item['n'] or digest(tmp)!=item['sha256']:
                tmp.unlink(missing_ok=True)
                raise RuntimeError(f'Relay payload checksum failed: {name}')
            tmp.replace(path)
            print(f'{name} {item["n"]} bytes; SHA-256 verified',flush=True)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('method',choices=['put','get']); p.add_argument('repo')
    p.add_argument('target',type=Path); p.add_argument('--receipt',type=Path)
    args=p.parse_args()
    if args.method=='put': put(args.repo,args.target)
    else: get(args.repo,args.receipt,args.target)


if __name__=='__main__': main()
