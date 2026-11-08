"""Offline integration tests for the skill catalog, router, and supported helpers."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / 'skillsystem' / 'skill.py'
CATALOG = ROOT / 'skillsystem' / 'catalog.json'


def cli(*args):
    return subprocess.run([sys.executable, str(CLI), *map(str, args)], cwd=ROOT,
                          text=True, capture_output=True, timeout=30)


class SkillSystemTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
        cls.temp = tempfile.TemporaryDirectory()
        base = Path(cls.temp.name)
        cls.srt = base / 'sample.srt'
        cls.srt.write_text('''1\n00:00:00,000 --> 00:00:04,000\nAn opening about planets.\n\n2\n00:00:05,000 --> 00:00:12,000\nGravity pulls planets together.\n\n3\n00:00:16,000 --> 00:00:24,000\nGravity pulls planets together.\n\n4\n00:00:30,000 --> 00:00:40,000\nNow we explore stars and galaxies.\n\n5\n00:00:44,000 --> 00:00:55,000\nGalaxies collide and stars orbit.\n\n6\n00:01:00,000 --> 00:01:12,000\nFinally a different lesson about books.\n''', encoding='utf-8')
        cls.csv = base / 'retention.csv'
        cls.csv.write_text('position,percent_still_watching\n0,100\n10,88\n20,71\n30,66\n60,64\n90,62\n120,61\n150,44\n180,42\n210,41\n240,40\n270,39\n300,38\n', encoding='utf-8')
        cls.videos = base / 'videos.json'
        cls.videos.write_text(json.dumps([
            {'channel': 'Small', 'title': 'ordinary '+str(i), 'views': v, 'url': 'https://example.com/'+str(i), 'duration': 600}
            for i, v in enumerate([21000, 30000, 27000, 36000, 25000, 41000])
        ] + [{'channel':'Small','title':'I deleted 40000 lines', 'views':412000,'url':'https://example.com/winner','duration':600}]), encoding='utf-8')

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def assert_run(self, *args, contains):
        r = cli(*args)
        self.assertEqual(r.returncode, 0, r.stderr + r.stdout)
        self.assertIn(contains, r.stdout)
        return r.stdout

    def test_catalog_exactly_matches_installed_skills(self):
        actual = {str(p.relative_to(ROOT)) for p in (ROOT / '.claude' / 'skills').glob('*/*/SKILL.md')}
        entries = self.catalog['skills']
        self.assertEqual(len(entries), 37)
        self.assertEqual({s['path'] for s in entries}, actual)
        self.assertEqual(len({s['id'] for s in entries}), 37)
        for skill in entries:
            self.assertTrue(skill['purpose'] and skill['categories'] and skill['limitations'])
            self.assertIn(skill['audit_status'], {'instruction-only', 'not-tested', 'tested-helper', 'partial'})
        self.assert_run('list', contains='doc-coauthoring')

    def test_workflows_resolve_and_show_original_instructions(self):
        for name in ('kdp-research', 'book-writing', 'document-production', 'premium-motion'):
            out = self.assert_run('workflow', name, contains='not automatic execution')
            for step in self.catalog['workflows'][name]['steps']:
                self.assertIn(step['skill'], out)
        for skill in self.catalog['skills']:
            out = self.assert_run('show', skill['id'], contains='Original SKILL.md')
            self.assertIn((ROOT / skill['path']).read_text(encoding='utf-8').strip(), out)

    def test_category_and_invalid_inputs(self):
        out = self.assert_run('list', '--category', 'book', contains='docx')
        self.assertNotIn('yt-comment', out)
        for args in [('list','--category','does-not-exist'), ('show','missing'), ('workflow','missing'),
                     ('run','chapters','/missing/file.srt'), ('run','not-a-tool')]:
            r = cli(*args)
            self.assertNotEqual(r.returncode, 0, args)

    def test_doctor(self):
        self.assert_run('doctor', contains='Catalog: 37 skill paths found; 4 workflows')

    def test_six_youtube_helpers(self):
        self.assert_run('run','hookscore','--hook','I deleted 40000 lines of code and the app got faster', contains='VERDICT')
        self.assert_run('run','title','--title','The Truth About AI Coding Agents','--thumb','AI is dead', contains='score')
        self.assert_run('run','deadair',self.srt, contains='cuts')
        self.assert_run('run','chapters',self.srt,'--target','3', contains='0:00')
        self.assert_run('run','retention',self.csv,'--transcript',self.srt, contains='HOOK LEAK')
        out = self.assert_run('run','swipe',self.videos,'--min','2', contains='Small')
        self.assertIn('40000', out)

    def test_local_catalog_searches(self):
        out = self.assert_run('run','ux-search','dashboard accessible chart legend','--domain','chart', contains='Domain:')
        self.assertIn('chart', out.lower())
        self.assert_run('run','slide-search','data dashboard','--domain','chart', contains='KPI Card')

    def test_failed_helper_propagates_exit(self):
        with tempfile.TemporaryDirectory() as d:
            invalid = Path(d) / 'bad.json'; invalid.write_text('not json', encoding='utf-8')
            r = cli('run', 'swipe', invalid)
            self.assertNotEqual(r.returncode, 0)


if __name__ == '__main__':
    unittest.main()
