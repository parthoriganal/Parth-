import copy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

import numpy as np
from PIL import Image

from blender_pipeline.manifest import PipelineError, read_json
from meridian_m02.quality import issues, measure, pixel_delta
from meridian_m02.storyboard import DEFAULT, compile_board
from production.audio import subtitles


class StoryboardTest(unittest.TestCase):
    def setUp(self):
        self.board = read_json(DEFAULT)

    def test_clock_and_scene_library(self):
        for preset, fps, frames, shards in [('draft', 12, 96, 13), ('master', 24, 192, 16)]:
            with self.subTest(preset=preset):
                plan = compile_board(self.board, preset)
                self.assertEqual((plan['series'], plan['frames'], len(plan['shards'])), ('M/02', frames, shards))
                self.assertEqual(plan['settings']['fps'], fps)
                self.assertEqual([shot['audio_sample'] for shot in plan['shots']], [0,120000,264000])
                self.assertEqual([shot['take']['set'] for shot in plan['shots']], list(self.board['sets']))
                for shot in plan['shots']:
                    self.assertNotIn('model', shot)
                    self.assertEqual(sum(s['last']-s['first']+1 for s in plan['shards'] if s['shot']==shot['id']),shot['frames'])
                self.assertIn('00:00:05,500 --> 00:00:08,000', subtitles(plan))

    def test_repeatable_scene_library_separate_takes(self):
        board = read_json(DEFAULT.parent/'examples/lichen-crossing.json')
        a, b = compile_board(board, 'draft')['shots']
        self.assertEqual(a['take']['set'], b['take']['set'])
        self.assertEqual(a['accent'], b['accent'])
        self.assertNotEqual(a['take']['camera'], b['take']['camera'])
        self.assertNotEqual(a['take']['light'], b['take']['light'])
        self.assertEqual((a['start'],b['start']), (0,20))

    def test_reject_wrong_model_and_clock_inputs(self):
        edits = [
            lambda b: b['sets']['glasshouse'].update(modules=True),
            lambda b: b['sets']['glasshouse'].update(modules=9),
            lambda b: b['sets']['glasshouse'].update(accent='#0aa'),
            lambda b: b['sets']['glasshouse'].update(seed=-1),
            lambda b: b['sets']['glasshouse'].update(forgotten_option=2),
            lambda b: b['shots'][0].update(id='../outside'),
            lambda b: b['shots'][1].update(id=b['shots'][0]['id']),
            lambda b: b['shots'][0].update(set='absent'),
            lambda b: b['shots'][0].update(ticks=55),
            lambda b: b['shots'][0].update(exposure=float('nan')),
            lambda b: b['shots'][0].update(audio='first\nsecond'),
            lambda b: b.update(clock=23),
        ]
        for i, edit in enumerate(edits):
            with self.subTest(case=i):
                bad = copy.deepcopy(self.board)
                edit(bad)
                with self.assertRaises(PipelineError):
                    compile_board(bad,'draft')

    def test_camera_constraints_and_frame_quantization(self):
        for edits in (
            lambda c: c['keys'][1].__setitem__(0,.001),  # normalized time snaps onto frame 1
            lambda c: c['keys'][1].__setitem__(3,111),
            lambda c: c['keys'][0].__setitem__(2,c['keys'][0][1]),
            lambda c: c.update(aperture=True),
            lambda c: c['keys'][-1].__setitem__(0,.9),
        ):
            bad = json.loads(DEFAULT.read_text())
            edits(bad['shots'][0]['camera'])
            with self.assertRaises(PipelineError):
                compile_board(bad,'draft')


class PixelPolicyTest(unittest.TestCase):
    def test_image_fixtures_and_ndc_flip(self):
        # Fixtures test policy and coordinate mapping. The Actions diagnostic job uses actual Cycles renders.
        rows,cols = np.indices((64,96))
        gradient = 32+((rows*9+cols*5)%130)
        with TemporaryDirectory() as tmp:
            def frame(name,gray):
                path=Path(tmp)/f'{name}.png'
                Image.fromarray(np.uint8(gray)).convert('RGB').save(path)
                return path
            okay=frame('valid',gradient)
            dark=frame('dark',gradient//4)
            bright=frame('bright',180+gradient//3)
            blank=frame('blank',np.zeros_like(gradient))
            self.assertEqual(issues(measure(okay)), [])
            self.assertIn('underexposed',issues(measure(dark)))
            self.assertIn('overexposed',issues(measure(bright)))
            self.assertIn('low_detail_or_blank',issues(measure(blank)))
            top=frame('bright-top',np.where(rows<32,gradient,gradient//4))
            self.assertAlmostEqual(measure(top,(0,.5,1,1))['p90'],measure(okay,(0,.5,1,1))['p90'])
            self.assertIn('underexposed',issues(measure(top,(0,0,1,.5))))
            self.assertGreater(pixel_delta(okay,dark),.1)
            self.assertEqual(pixel_delta(okay,okay),0.)


if __name__ == '__main__':
    unittest.main()
