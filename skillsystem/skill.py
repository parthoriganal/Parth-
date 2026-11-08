#!/usr/bin/env python3
"""Discover installed skill instructions and invoke a small allowlist of local helpers.

This program does not execute SKILL.md instructions or autonomously invoke agents.
"""
import argparse
import importlib.util
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'skillsystem' / 'catalog.json'

# The catalog is data, not executable configuration. Only these fixed paths may run.
TOOLS = {
    'hookscore': ('yt-script', '.claude/skills/youtube-agent-skill/yt-script/hookscore.py'),
    'title': ('yt-package', '.claude/skills/youtube-agent-skill/yt-package/title.py'),
    'deadair': ('yt-edit', '.claude/skills/youtube-agent-skill/yt-edit/deadair.py'),
    'chapters': ('yt-chapters', '.claude/skills/youtube-agent-skill/yt-chapters/chapters.py'),
    'retention': ('yt-retention', '.claude/skills/youtube-agent-skill/yt-retention/retention.py'),
    'swipe': ('yt-viral', '.claude/skills/youtube-agent-skill/yt-viral/swipe.py'),
    'ux-search': ('ui-ux-pro-max', '.claude/skills/nextlevelbuilder/ui-ux-pro-max/scripts/search.py'),
    'slide-search': ('design-system', '.claude/skills/nextlevelbuilder/design-system/scripts/search-slides.py'),
}


def load_catalog():
    with CATALOG.open(encoding='utf-8') as f:
        data = json.load(f)
    skills = data['skills']
    ids = [s['id'] for s in skills]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate skill ID in catalog')
    for s in skills:
        p = (ROOT / s['path']).resolve()
        if not p.is_relative_to(ROOT / '.claude' / 'skills') or p.name != 'SKILL.md' or not p.is_file():
            raise ValueError(f"Invalid skill path for {s['id']}: {s['path']}")
        if p.parent.name != s['id'] or p.parent.parent.name != s['publisher']:
            raise ValueError(f"Skill path does not match id/publisher: {s['id']}")
    for name, workflow in data['workflows'].items():
        for step in workflow['steps']:
            if step['skill'] not in ids:
                raise ValueError(f"Unknown skill in workflow {name}: {step['skill']}")
    return data


def existing_file(value):
    path = Path(value).expanduser()
    if not path.is_file():
        raise argparse.ArgumentTypeError(f'Input file not found: {value}')
    return str(path.resolve())


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='command', required=True)
    ls = sub.add_parser('list', help='List skills; optionally filter by category')
    ls.add_argument('--category')
    show = sub.add_parser('show', help='Show metadata and original instructions')
    show.add_argument('skill')
    show.add_argument('--metadata-only', action='store_true')
    wf = sub.add_parser('workflow', help='List workflows or show a workflow plan')
    wf.add_argument('name', nargs='?')
    sub.add_parser('doctor', help='Check installed paths and selected optional dependencies')
    run = sub.add_parser('run', help='Run an explicitly supported local helper')
    tools = run.add_subparsers(dest='tool', required=True)
    hook = tools.add_parser('hookscore'); hook.add_argument('--hook', required=True)
    title = tools.add_parser('title'); title.add_argument('--title', required=True); title.add_argument('--thumb', required=True)
    for name in ('deadair', 'chapters'):
        tool = tools.add_parser(name); tool.add_argument('transcript', type=existing_file)
        if name == 'chapters': tool.add_argument('--target', type=int, default=8, choices=range(3, 51), metavar='3..50')
    retention = tools.add_parser('retention'); retention.add_argument('csv', type=existing_file); retention.add_argument('--transcript', type=existing_file)
    swipe = tools.add_parser('swipe'); swipe.add_argument('json_file', type=existing_file); swipe.add_argument('--min', type=float, default=2.0, dest='minimum')
    ux = tools.add_parser('ux-search'); ux.add_argument('query'); ux.add_argument('--domain', required=True, choices=['style','color','chart','landing','product','ux','typography','icons','gsap','react','web','google-fonts'])
    slide = tools.add_parser('slide-search'); slide.add_argument('query'); slide.add_argument('--domain', required=True, choices=['strategy','layout','copy','chart'])
    return p


def run_tool(a):
    _, relative = TOOLS[a.tool]
    path = ROOT / relative
    if not path.is_file():
        print(f'Helper not installed: {relative}', file=sys.stderr)
        return 2
    args = {
        'hookscore': lambda: ['--hook', a.hook],
        'title': lambda: ['--title', a.title, '--thumb', a.thumb],
        'deadair': lambda: [a.transcript],
        'chapters': lambda: [a.transcript, '--target', str(a.target)],
        'retention': lambda: [a.csv] + (['--transcript', a.transcript] if a.transcript else []),
        'swipe': lambda: [a.json_file, '--min', str(a.minimum)],
        'ux-search': lambda: [a.query, '--domain', a.domain],
        'slide-search': lambda: [a.query, '--domain', a.domain],
    }[a.tool]()
    try:
        # No shell, no hidden installation or network operation, inherited output and exit status.
        return subprocess.run([sys.executable, str(path), *args], cwd=ROOT, timeout=60, check=False).returncode
    except subprocess.TimeoutExpired:
        print('Helper timed out after 60 seconds', file=sys.stderr)
        return 124


def main(argv=None):
    p = parser()
    a = p.parse_args(argv)
    try:
        data = load_catalog()
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as e:
        print(f'Invalid catalog: {e}', file=sys.stderr)
        return 2
    skills = {s['id']: s for s in data['skills']}
    if a.command == 'list':
        categories = sorted({c for s in skills.values() for c in s['categories']})
        if a.category and a.category not in categories:
            print('Unknown category. Available: ' + ', '.join(categories), file=sys.stderr)
            return 2
        for s in skills.values():
            if not a.category or a.category in s['categories']:
                print(f"{s['id']:22} {s['audit_status']:16} {s['purpose']}")
        return 0
    if a.command == 'show':
        s = skills.get(a.skill)
        if not s:
            print(f'Unknown skill: {a.skill}', file=sys.stderr); return 2
        print(json.dumps(s, indent=2))
        if not a.metadata_only:
            print('\n--- Original SKILL.md (read referenced files as needed) ---\n')
            print((ROOT / s['path']).read_text(encoding='utf-8'))
        return 0
    if a.command == 'workflow':
        if not a.name:
            for name, workflow in data['workflows'].items():
                print(f"{name}: {workflow['description']}")
            return 0
        w = data['workflows'].get(a.name)
        if not w:
            print(f'Unknown workflow: {a.name}', file=sys.stderr); return 2
        print(f"{a.name}: {w['description']}\n")
        for step in w['steps']:
            s = skills[step['skill']]
            print(f"- {s['id']} [{s['audit_status']}]: {step['reason']}\n  Load: {s['path']}")
        for note in w['notes']:
            print(f'  Note: {note}')
        print('\nThese are recommendations, not automatic execution; choose only relevant steps.')
        return 0
    if a.command == 'doctor':
        print(f'Catalog: {len(skills)} skill paths found; {len(data["workflows"])} workflows')
        for name, (_, path) in TOOLS.items():
            print(f"helper {name}: {'present' if (ROOT / path).is_file() else 'MISSING'}")
        shared = (
            '.claude/skills/youtube-agent-skill/yt-edit/deadair.py',
            '.claude/skills/youtube-agent-skill/yt-script/hooks.json',
            '.claude/skills/nextlevelbuilder/ui-ux-pro-max/data/charts.csv',
            '.claude/skills/nextlevelbuilder/design-system/data/slide-charts.csv',
        )
        for path in shared:
            print(f"shared asset {path}: {'present' if (ROOT / path).is_file() else 'MISSING'}")
        for module in ('pypdf', 'PIL', 'openpyxl', 'playwright'):
            print(f"Python {module}: {'present' if importlib.util.find_spec(module) else 'missing'}")
        for exe in ('node', 'soffice', 'pdftoppm', 'ffmpeg', 'blender'):
            print(f"{exe}: {shutil.which(exe) or 'missing'}")
        print('Presence checks are not functional tests; see docs/SKILL_EXECUTION_AUDIT.md.')
        ready = all((ROOT / path).is_file() for _, path in TOOLS.values())
        ready = ready and all((ROOT / path).is_file() for path in shared)
        return 0 if ready else 1
    return run_tool(a)


if __name__ == '__main__':
    sys.exit(main())
