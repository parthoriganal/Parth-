"""Blender-free checks for the frozen sequence, assets and dialogue-free audio clock."""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
import wave

from blender_pipeline.manifest import PipelineError
from human_motion.assets import load
from human_motion.foley import soundtrack
from human_motion.project import BLEND, MASTER, create_plan, load_plan


class FilmTests(unittest.TestCase):
    def test_identity_subset_and_expression_deltas(self):
        m=load()
        self.assertEqual(m.meters.shape,(19158,3))
        self.assertEqual(m.height,1.765)
        self.assertEqual(len(m.fitted_eyes.vertices),1064)
        self.assertEqual(set(m.face_delta),{'Blink.L','Blink.R','Brow.L','Brow.R','Smile'})
        self.assertTrue(all(v.any() for v in m.face_delta.values()))
        self.assertTrue(m.weights[0])

    def test_manifest_exact_clock_and_invalid_scene(self):
        with TemporaryDirectory() as temp:
            b=Path(temp); (b/BLEND).write_bytes(b'test only')
            plan=create_plan(b,{'Blender build':'test only'})
            doc,p=load_plan(b)
            self.assertEqual(p,MASTER); self.assertEqual(doc['project_id'],plan['project_id'])
            self.assertEqual(p.frames/p.fps,15)
            frames=[i for shard in doc['shards'] for i in range(shard['first'],shard['last']+1)]
            self.assertEqual(frames,list(range(1,361)))
            (b/BLEND).write_bytes(b'bad bytes')
            with self.assertRaises(PipelineError): load_plan(b)

    def test_foley_raster(self):
        with TemporaryDirectory() as d:
            p=Path(d)/'tone.wav'; info=soundtrack(p,15)
            with wave.open(str(p),'rb') as f:
                self.assertEqual((f.getnchannels(),f.getframerate(),f.getnframes()),(2,48000,720000))
            self.assertFalse(info['dialogue']); self.assertEqual(len(info['shoe_cues_s']),6)
            self.assertLess(info['source_peak_dbfs'],-6)
