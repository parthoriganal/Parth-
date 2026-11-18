"""Frame-accurate editorial plan shared by Blender, Manim, Remotion and audio."""

from dataclasses import asdict, dataclass
from pathlib import Path
import math
import re

from blender_pipeline.manifest import PipelineError, digest, identity, read_json, write_json

from .models import MODEL_TYPES, model_spec

ROOT = Path(__file__).resolve().parent
FONT_ROOT = ROOT.parent / '.claude/skills/anthropic/canvas-design/canvas-fonts'
BLENDER_TEMPLATES = frozenset(MODEL_TYPES)
SAMPLE_RATE = 48000


@dataclass(frozen=True)
class Preset:
    fps: int
    width: int
    height: int
    plate_width: int
    plate_height: int
    samples: int
    batch: int


PRESETS = {
    'draft': Preset(12, 768, 432, 640, 360, 6, 8),
    'master': Preset(24, 1920, 1080, 1152, 648, 12, 14),
}


def editorial_plan(project, preset_name):
    preset = PRESETS[preset_name]
    clock = project.get('clock')
    if not isinstance(clock, int) or clock <= 0 or SAMPLE_RATE % preset.fps:
        raise PipelineError('Invalid project clock/audio rate')
    shots, shards, seen, cursor = [], [], {}, 0
    for spec in project['shots']:
        name, template = spec['id'], spec['template']
        if not isinstance(name, str) or not re.fullmatch(r'[a-z][a-z0-9-]{0,39}', name) or name in seen:
            raise PipelineError(f'Invalid or repeated shot id: {name}')
        if template not in BLENDER_TEMPLATES | {'diagram', 'endcard'}:
            raise PipelineError(f'Invalid template: {template}')
        ticks = spec['ticks']
        if type(ticks) is not int or ticks < 12 or ticks * preset.fps % clock:
            raise PipelineError(f'{name} does not align with the {preset.fps} fps grid')
        note = spec['note']
        if not isinstance(note, (float, int)) or not math.isfinite(note) or not 55 <= note <= 1600:
            raise PipelineError(f'Invalid audio cue frequency for {name}')
        if len(spec['title']) != 2 or not all(isinstance(part, str) for part in spec['title']):
            raise PipelineError(f'{name} requires two title lines (second may be empty)')
        length = ticks * preset.fps // clock
        if length < 6:
            raise PipelineError(f'{name} needs at least six frames for the authored motion')
        shot = {**spec, 'start': cursor, 'frames': length, 'audio_sample': cursor * (SAMPLE_RATE // preset.fps)}
        if 'model' in spec and template not in BLENDER_TEMPLATES:
            raise PipelineError(f'{name} model overrides apply only to 3D templates')
        if template == 'endcard':
            source = seen.get(spec.get('source'))
            if not source or source['template'] not in BLENDER_TEMPLATES:
                raise PipelineError('An endcard must reference a preceding Blender shot')
            shot['hold'] = source['frames']
        elif template in BLENDER_TEMPLATES:
            shot['model'] = asdict(model_spec(template, spec.get('model', {})))
            for i, first in enumerate(range(1, length + 1, preset.batch)):
                shards.append({'id': f'{name}-{i:02}', 'shot': name, 'first': first,
                               'last': min(first + preset.batch - 1, length)})
        shots.append(shot)
        seen[name] = shot
        cursor += length
    if not (shots and shards and cursor <= 3600 and len(shards) <= 128):
        raise PipelineError('Project is empty or exceeds the default production budget')
    return {'schema': 1, 'preset': preset_name, 'settings': asdict(preset), 'title': project['title'],
            'edition': project['edition'], 'shots': shots, 'shards': shards, 'frames': cursor,
            'sample_rate': SAMPLE_RATE}


def project_path(root):
    return root / 'bundle/project.json'


def blend_path(root, name):
    return root / 'bundle' / f'{name}.blend'


def write_plan(root, plan, blender_build):
    files = sorted((*ROOT.glob('*.py'), *ROOT.glob('*.txt'), *ROOT.glob('motion/*.jsx'),
                    *ROOT.glob('motion/*.mjs'), ROOT / 'motion/package-lock.json'))
    doc = {**plan, 'blender_build': blender_build,
           'scene_sha256': {shot['id']: digest(blend_path(root, shot['id'])) for shot in plan['shots']
                            if shot['template'] in BLENDER_TEMPLATES},
           'sources_sha256': {path.relative_to(ROOT).as_posix(): digest(path) for path in files}}
    doc['project_id'] = identity(doc)
    write_json(project_path(root), doc)
    return doc


def load_plan(root):
    doc = read_json(project_path(root))
    if doc.get('schema') != 1 or doc.get('profile') is not None or doc.get('project_id') != identity(doc):
        raise PipelineError('Production bundle manifest is corrupt or unsupported')
    if doc.get('preset') not in PRESETS or doc.get('settings') != asdict(PRESETS[doc['preset']]):
        raise PipelineError('Production preset changed; build a new scene bundle')
    return doc
