"""Check the repository bootstrap contract, not an agent host's auto-loading behavior."""
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STARTUP_FILES = (
    'AI_AGENT_INSTRUCTIONS.md', 'PROJECT_CONTEXT.md',
    'CURRENT_STATUS.md', 'docs/SKILL_SYSTEM.md',
)
WORKFLOWS = ('kdp-research', 'book-writing', 'document-production', 'premium-motion')


class AgentBootstrapTests(unittest.TestCase):
    def test_entry_and_prompt_reference_existing_startup_files(self):
        entry = (ROOT / 'AGENTS.md').read_text(encoding='utf-8')
        guide = (ROOT / 'docs/AGENT_MODE_START.md').read_text(encoding='utf-8')
        for filename in STARTUP_FILES:
            with self.subTest(filename=filename):
                self.assertTrue((ROOT / filename).is_file())
                self.assertIn(filename, entry)
                self.assertIn(filename, guide)
        self.assertIn('not been verified', entry)
        self.assertIn('not been verified', guide)
        self.assertIn('My task:', guide)

    def test_named_workflows_are_available(self):
        entry = (ROOT / 'AGENTS.md').read_text(encoding='utf-8')
        for name in WORKFLOWS:
            with self.subTest(workflow=name):
                self.assertIn(name, entry)
                result = subprocess.run(
                    [sys.executable, str(ROOT / 'skillsystem/skill.py'), 'workflow', name],
                    cwd=ROOT, text=True, capture_output=True, timeout=30,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn('not automatic execution', result.stdout)


if __name__ == '__main__':
    unittest.main()
