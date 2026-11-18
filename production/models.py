"""Frame-safe parameter envelopes for Meridian's authored shot templates.

These are scene-template presets, not limits on the underlying geometry tools.
Keep this module independent of bpy so the edit can be validated before rendering.
"""

from dataclasses import dataclass
import re

from blender_pipeline.manifest import PipelineError


@dataclass(frozen=True)
class LampSpec:
    scale: float = 1.0
    body_radius: float = .62
    rib_count: int = 32
    chassis: str = '25474B'
    output: float = 2.35


@dataclass(frozen=True)
class PavilionSpec:
    bays: int = 3
    span: float = 3.48
    bay_spacing: float = 1.35
    stone: str = 'BC8B70'


@dataclass(frozen=True)
class LandSpec:
    layers: int = 8
    radius: float = 4.6
    seed: int = 67


MODEL_TYPES = {'product': LampSpec, 'pavilion': PavilionSpec, 'landscape': LandSpec}
LAND_SEGMENTS = 52
BOUNDS = {
    'product': {'scale': (.82, 1.04), 'body_radius': (.49, .72), 'rib_count': (12, 56), 'output': (.75, 4.8)},
    'pavilion': {'bays': (2, 4), 'span': (3.24, 3.84), 'bay_spacing': (1.05, 1.66)},
    'landscape': {'layers': (7, 9), 'radius': (4.28, 5.1), 'seed': (0, 2**32 - 1)},
}


def model_spec(template, overrides):
    """Validate a JSON model object; never silently ignore a mistyped parameter."""
    cls = MODEL_TYPES.get(template)
    if cls is None or not isinstance(overrides, dict):
        raise PipelineError(f'{template} model must be an object on a 3D template')
    values = {}
    for key, value in overrides.items():
        if key in BOUNDS[template]:
            low, high = BOUNDS[template][key]
            want_int = type(getattr(cls, key)) is int
            types = (int,) if want_int else (int, float)
            if type(value) not in types or not low <= value <= high:
                kind = 'an integer' if want_int else 'a number'
                raise PipelineError(f'{template}.model.{key} must be {kind} between {low} and {high}')
            values[key] = value if want_int else float(value)
        elif (template, key) in {('product', 'chassis'), ('pavilion', 'stone')}:
            if not isinstance(value, str) or not re.fullmatch(r'#?[0-9a-fA-F]{6}', value):
                raise PipelineError(f'{template}.model.{key} must be a six-digit RGB color')
            values[key] = value.removeprefix('#').upper()
        else:
            raise PipelineError(f'Unknown {template}.model parameter: {key}')
    return cls(**values)
