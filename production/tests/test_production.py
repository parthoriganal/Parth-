from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
import wave

from blender_pipeline.manifest import PipelineError, frame_ids, read_json
from production.audio import score, subtitles, verify_sync
from production.edl import PRESETS, ROOT, editorial_plan
from production.models import LampSpec, model_spec


class EditorialTests(unittest.TestCase):
    def setUp(self):
        self.project=read_json(ROOT/'meridian.json')

    def test_two_presets_share_cut_times_and_exact_batch_coverage(self):
        plans=[editorial_plan(self.project,p) for p in PRESETS]
        self.assertEqual(subtitles(plans[0]),subtitles(plans[1]))
        self.assertEqual([s['audio_sample'] for s in plans[0]['shots']],
                         [s['audio_sample'] for s in plans[1]['shots']])
        for plan in plans:
            self.assertEqual(plan['frames']/plan['settings']['fps'],9.0)
            for shot in plan['shots'][:3]:
                ids=[i for batch in plan['shards'] if batch['shot']==shot['id'] for i in frame_ids(batch)]
                self.assertEqual(ids,list(range(1,shot['frames']+1)))

    def test_reject_misaligned_and_bad_asset_identity(self):
        changed=deepcopy(self.project)
        changed['shots'][0]['ticks']+=1
        with self.assertRaisesRegex(PipelineError,'align'):
            editorial_plan(changed,'draft')
        changed=deepcopy(self.project)
        changed['shots'][1]['id']='../other'
        with self.assertRaisesRegex(PipelineError,'shot id'):
            editorial_plan(changed,'draft')
        changed=deepcopy(self.project)
        changed['shots'][-1]['source']='optics'
        with self.assertRaisesRegex(PipelineError,'preceding Blender'):
            editorial_plan(changed,'master')

    def test_resolve_model_variants_without_changing_the_edit_clock(self):
        variants=read_json(ROOT/'examples/copper-field.json')
        plan=editorial_plan(variants,'draft')
        control=editorial_plan(self.project,'draft')
        self.assertEqual([s['audio_sample'] for s in plan['shots']],
                         [s['audio_sample'] for s in control['shots'][:3]])
        product, pavilion, landscape=[s['model'] for s in plan['shots']]
        self.assertEqual((product['chassis'], product['scale'], product['rib_count']),
                         ('763C34', LampSpec.scale, 20))
        self.assertEqual((pavilion['bays'], pavilion['stone']), (2, '89A1A0'))
        self.assertEqual((landscape['layers'],landscape['seed']), (9, 87))

    def test_reject_unknown_or_out_of_budget_model_values(self):
        for template, overrides in (
            ('product', {'knurls':20}), ('product', {'output':float('nan')}),
            ('product', {'chassis':'purple'}), ('pavilion', {'bays':True}),
            ('pavilion', {'bays':1e4}), ('landscape', {'seed':4.5}),
            ('landscape', []),
        ):
            with self.subTest(template=template, overrides=overrides), self.assertRaises(PipelineError):
                model_spec(template, overrides)
        changed=deepcopy(self.project)
        changed['shots'][-1]['model']={}
        with self.assertRaisesRegex(PipelineError,'only to 3D templates'):
            editorial_plan(changed,'master')

    def test_pcm_contains_cue_at_each_cut_and_muted_track_is_rejected(self):
        plan=editorial_plan(self.project,'master')
        with TemporaryDirectory() as tmp:
            p=Path(tmp)/'score.wav'
            self.assertLess(score(plan,p),-1)
            result=verify_sync(plan,p)
            self.assertEqual(len(result['cue_alignment']),5)
            self.assertEqual(result['decoded_samples'],432000)
            with wave.open(str(p),'wb') as f:
                f.setparams((2,2,48000,432000,'NONE','not compressed'))
                f.writeframes(bytes(432000*4))
            with self.assertRaisesRegex(PipelineError,'Audio cue missing'):
                verify_sync(plan,p)


if __name__=='__main__':
    unittest.main()
