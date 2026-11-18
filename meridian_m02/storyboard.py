"""Compile a declarative set library and beat sheet into M/01-compatible plate jobs."""

from pathlib import Path
import math
import re

from blender_pipeline.manifest import PipelineError, digest, identity, read_json, write_json
from production.edl import ROOT, blend_path, editorial_plan, load_plan, project_path

HERE = Path(__file__).resolve().parent
DEFAULT = HERE / 'weather-atlas.json'
GRAMMAR = {'tidal': (3, 7), 'glasshouse': (3, 5), 'alpine': (10, 16)}
LIGHTS = {'amber', 'verdant', 'polar'}
CODE = re.compile(r'[a-z][a-z0-9-]{0,39}\Z')
COLOR = re.compile(r'#?([0-9a-fA-F]{6})\Z')


def require(condition, text):
    if not condition:
        raise PipelineError(text)


def scalar(v, lo, hi):
    return type(v) in (int, float) and lo <= v <= hi


def vector(values, name):
    require(isinstance(values, list) and len(values) == 3 and all(scalar(v, -50, 50) for v in values),
            f'{name}: expected three finite coordinates in [-50, 50]')
    return [float(v) for v in values]


def text(v, name, limit):
    require(isinstance(v, str) and 1 <= len(v) <= limit and all(c.isprintable() for c in v),
            f'{name}: expected a printable string (1–{limit} characters)')
    return v


def camera(spec, name):
    require(isinstance(spec, dict) and set(spec) == {'aperture', 'keys'}, f'{name}: camera needs aperture and keys')
    aperture = spec['aperture']
    require(scalar(aperture, 0, 0) or scalar(aperture, 2.8, 22), f'{name}: aperture must be 0 or 2.8–22')
    raw = spec['keys']
    require(isinstance(raw, list) and 2 <= len(raw) <= 6, f'{name}: camera needs 2–6 keys')
    keys, prev = [], -1
    for item in raw:
        require(isinstance(item, list) and len(item) == 4, f'{name}: camera key needs time, position, aim, lens')
        t, pos, target, lens = item
        require(scalar(t, 0, 1) and t > prev and scalar(lens, 24, 80), f'{name}: invalid camera time/lens')
        pos = vector(pos, f'{name}.position')
        target = vector(target, f'{name}.aim')
        require(math.dist(pos, target) >= 2.5 and pos[2] >= .6, f'{name}: degenerate camera pose')
        keys.append([t, pos, target, lens])
        prev = t
    require(keys[0][0] == 0 and keys[-1][0] == 1, f'{name}: first and last camera keys must be 0 and 1')
    return {'aperture': aperture, 'keys': keys}


def compile_board(board, preset):
    require(isinstance(board, dict) and type(board.get('schema')) is int and board['schema'] == 2,
            'M/02 storyboard schema must be 2')
    require(set(board) == {'schema', 'title', 'edition', 'clock', 'sets', 'shots'}, 'Invalid storyboard keys')
    require(type(board.get('clock')) is int and board['clock'] == 24, 'M/02 storyboard uses 24 ticks per second')
    raw_sets = board.get('sets')
    require(isinstance(raw_sets, dict) and 1 <= len(raw_sets) <= 8, 'Provide one to eight named sets')
    sets = {}
    for name, spec in raw_sets.items():
        require(isinstance(name, str) and CODE.fullmatch(name) is not None, f'Invalid set id: {name}')
        require(isinstance(spec, dict) and set(spec) == {'kind', 'seed', 'modules', 'accent'}, f'{name}: invalid set keys')
        kind, seed, modules = spec['kind'], spec['seed'], spec['modules']
        require(isinstance(kind, str) and kind in GRAMMAR, f'{name}: unknown set type')
        low, high = GRAMMAR[kind]
        require(type(seed) is int and 0 <= seed < 2**32, f'{name}: seed outside unsigned 32-bit range')
        require(type(modules) is int and low <= modules <= high, f'{name}: {kind} modules must be {low}–{high}')
        accent = spec['accent']
        match = COLOR.fullmatch(accent) if isinstance(accent, str) else None
        require(match is not None, f'{name}: expected a six-digit accent color')
        sets[name] = {**spec, 'accent': match[1].upper()}
    shots = board.get('shots')
    require(isinstance(shots, list) and 1 <= len(shots) <= 6, 'Provide one to six shots')
    edit, takes = [], {}
    for s in shots:
        require(isinstance(s, dict) and set(s) == {'id', 'set', 'ticks', 'marker', 'title', 'label', 'audio',
                                                  'note', 'light', 'exposure', 'camera'}, 'Invalid shot keys')
        name, set_id = s.get('id'), s.get('set')
        require(isinstance(name, str) and CODE.fullmatch(name) and name not in takes, 'Invalid or duplicate shot id')
        require(isinstance(set_id, str) and set_id in sets, f'{name}: missing reusable set')
        keys = camera(s.get('camera'), name)
        require(isinstance(s.get('light'), str) and s['light'] in LIGHTS, f'{name}: unknown lighting recipe')
        require(scalar(s.get('exposure'), -2, 2), f'{name}: exposure outside [-2, 2]')
        require(type(s.get('ticks')) is int and 36 <= s['ticks'] <= 120, f'{name}: 36–120 ticks required')
        require(scalar(s.get('note'), 55, 1600), f'{name}: invalid cue pitch')
        edit.append({'id': name, 'template': 'landscape', 'ticks': s['ticks'], 'title': [text(s.get('title'),name,30), ''],
                     'marker': text(s.get('marker'),name,32), 'label': text(s.get('label'),name,55),
                     'audio': text(s.get('audio'),name,100), 'note': s['note']})
        takes[name] = {'set': set_id, 'camera': keys, 'light': s['light'], 'exposure': s['exposure']}
    plan = editorial_plan({'title': text(board.get('title'),'title',60), 'edition': text(board.get('edition'),'edition',32),
                           'clock': board['clock'], 'shots': edit}, preset)
    plan['series'], plan['sets'] = 'M/02', sets
    for s in plan['shots']:
        s.pop('model')  # use the authored M/02 set grammar, not M/01's landscape parameters
        take = takes[s['id']]
        frames = [1 + round(k[0]*(s['frames']-1)) for k in take['camera']['keys']]
        require(len(set(frames)) == len(frames), f"{s['id']}: camera keys collapse onto the same frame")
        s['take'] = take
        s['accent'] = sets[take['set']]['accent']
    return plan


def freeze(root, plan, filename, build):
    doc = {**plan, 'blender_build': build, 'storyboard_sha256': digest(filename),
           'scene_sha256': {s['id']: digest(blend_path(root,s['id'])) for s in plan['shots']},
           'm02_sources_sha256': {p.name: digest(p) for p in sorted(HERE.glob('*.py'))},
           'shared_sources_sha256': {p.name: digest(p) for p in sorted(ROOT.glob('*.py'))}}
    doc['project_id'] = identity(doc)
    write_json(project_path(root), doc)
    return doc


def load_board(path, preset):
    return compile_board(read_json(path), preset)


def require_plan(root):
    doc = load_plan(root)
    require(doc.get('series') == 'M/02', 'Not an M/02 build; use a separate output root')
    require(digest(root/'bundle/storyboard.json') == doc['storyboard_sha256'], 'Storyboard attachment changed')
    return doc
