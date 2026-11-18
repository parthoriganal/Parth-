"""Fast QA and recovery fixtures: no Blender or GPU required."""

from dataclasses import asdict
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from PIL import Image, ImageDraw

from blender_pipeline.manifest import (BLEND, MANIFEST, PROFILES, PipelineError, Profile, digest, frame_ids, frame_name,
                                       identity, load_manifest, ranges, shard_dir, write_json)
from blender_pipeline.media import (RECEIPT, check_cached, empty_receipt, frame_stats, load_receipt, verified_frames)


class PlanTests(unittest.TestCase):
    def test_coverage_and_partial_last_chunk(self):
        for p in [*PROFILES.values(), Profile(16, 12, 11, 8, 2, 3)]:
            shards = ranges(p)
            self.assertEqual([i for s in shards for i in frame_ids(s)], list(range(1, p.frames + 1)))
            self.assertEqual(len({s['id'] for s in shards}), len(shards))
            self.assertTrue(all(len(frame_ids(s)) <= p.batch for s in shards))

    def test_rejects_changed_blend_and_plan_even_with_rewritten_id(self):
        with TemporaryDirectory() as tmp:
            d = Path(tmp)
            blend = d / BLEND
            blend.write_bytes(b"scene fixture for manifest tests")
            plan = {"schema": 1, "profile": "ci", "settings": asdict(PROFILES["ci"]),
                    "shards": ranges(PROFILES["ci"]), "scene_sha256": digest(blend)}
            plan["project_id"] = identity(plan)
            write_json(d / MANIFEST, plan)
            self.assertEqual(load_manifest(d)[0], plan)
            blend.write_bytes(b"unexpected replacement")
            with self.assertRaisesRegex(PipelineError, "Blend checksum mismatch"):
                load_manifest(d)
            plan["shards"][0]["last"] += 1
            plan["project_id"] = identity(plan)
            write_json(d / MANIFEST, plan)
            with self.assertRaisesRegex(PipelineError, "Invalid or incompatible"):
                load_manifest(d)


class FrameTests(unittest.TestCase):
    def setUp(self):
        tmp = TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.profile = Profile(64, 48, 3, 8, 2, 2)
        self.size = self.profile.width, self.profile.height
        self.plan = {"project_id": "test-project", "shards": ranges(self.profile)}

    def create_shard(self, index):
        shard = self.plan["shards"][index]
        folder = shard_dir(self.root, shard)
        folder.mkdir()
        receipt = empty_receipt(self.plan, shard)
        for i in frame_ids(shard):
            image = Image.new("RGB", self.size, "#366b70")
            ImageDraw.Draw(image).rectangle((i * 2, 12, i * 2 + 18, 29), fill="#fdce72")
            path = folder / frame_name(i)
            image.save(path)
            receipt["frames"][str(i)] = digest(path)
        write_json(folder / RECEIPT, receipt)
        return folder, shard, receipt

    def test_frame_qa_rejects_wrong_size_blank_truncated_and_non_png(self):
        folder, _, _ = self.create_shard(0)
        good = folder / frame_name(1)
        self.assertGreater(frame_stats(good, self.size)["luma_stddev"], 2.0)
        with self.assertRaisesRegex(PipelineError, "expected RGB PNG"):
            frame_stats(good, (self.size[0] // 2, self.size[1]))
        flat = self.root / "flat.png"
        Image.new("RGB", self.size, "darkred").save(flat)
        with self.assertRaisesRegex(PipelineError, "near-uniform"):
            frame_stats(flat, self.size)
        broken = self.root / "broken.png"
        broken.write_bytes(good.read_bytes()[:60])
        with self.assertRaisesRegex(PipelineError, "Cannot decode"):
            frame_stats(broken, self.size)
        jpeg = self.root / "jpeg.png"
        Image.new("RGB", self.size, "green").save(jpeg, format="JPEG")
        with self.assertRaisesRegex(PipelineError, "expected RGB PNG"):
            frame_stats(jpeg, self.size)

    def test_resume_only_accepts_a_valid_matching_receipt_and_frame_hash(self):
        folder, shard, receipt = self.create_shard(0)
        self.assertEqual(load_receipt(folder, self.plan, shard), receipt)
        with self.assertRaisesRegex(PipelineError, "another build"):
            load_receipt(folder, {"project_id": "stale"}, shard)
        # A valid PNG with the wrong pixels is not accepted, even at the right size.
        (folder / frame_name(1)).write_bytes((folder / frame_name(2)).read_bytes())
        with self.assertRaisesRegex(PipelineError, "checksum mismatch"):
            check_cached(folder, receipt, 1, self.size)
        self.assertGreater(check_cached(folder, receipt, 2, self.size)["luma_stddev"], 2)

    def test_assembly_fails_on_missing_shard_and_ignores_strays(self):
        folder, _, _ = self.create_shard(0)
        with self.assertRaisesRegex(PipelineError, "Cannot read"):
            verified_frames(self.root, self.plan, self.profile)
        self.create_shard(1)
        (folder / frame_name(999)).write_bytes(b"not in manifest")
        frames, _ = verified_frames(self.root, self.plan, self.profile)
        self.assertEqual([p.name for p in frames], [frame_name(i) for i in range(1, 4)])


if __name__ == "__main__":
    unittest.main()
