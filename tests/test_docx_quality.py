"""Exercise the offline skill validator and optional reflow preview."""
import importlib.util
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / 'docs/kdp-practical-test/manuscript-sample.docx'
VALIDATE = ROOT / 'scripts/validate_docx_offline.py'
PROOF = ROOT / 'scripts/proof_docx.py'


def call(*args):
    return subprocess.run([sys.executable, *map(str, args)], cwd=ROOT, capture_output=True, text=True, timeout=30)


class DocumentQualityTests(unittest.TestCase):
    def test_offline_validator_accepts_sample_and_rejects_corruption(self):
        result = call(VALIDATE, SAMPLE, '--verbose')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('All validations PASSED', result.stdout)
        with tempfile.TemporaryDirectory() as tmp:
            corrupt = Path(tmp) / 'bad.docx'
            with zipfile.ZipFile(SAMPLE) as source, zipfile.ZipFile(corrupt,'w') as target:
                for item in source.infolist():
                    content = source.read(item.filename)
                    if item.filename == 'word/document.xml':
                        content = b'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:bogus/></w:body></w:document>'
                    target.writestr(item, content)
            result = call(VALIDATE, corrupt)
            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertIn('FAILED', result.stdout)

    def test_invalid_file_is_rejected(self):
        result = call(VALIDATE, ROOT / 'does-not-exist.docx')
        self.assertNotEqual(result.returncode, 0)

    @unittest.skipUnless(importlib.util.find_spec('pymupdf'), 'optional PyMuPDF unavailable')
    def test_proof_generates_pdf_and_images_with_actual_text(self):
        import pymupdf
        with tempfile.TemporaryDirectory() as tmp:
            result = call(PROOF, SAMPLE, '--out', tmp)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn('NOT a Word/LibreOffice layout', result.stdout)
            with pymupdf.open(Path(tmp)/'proof-reflow.pdf') as pdf:
                self.assertGreater(pdf.page_count, 0)
                self.assertIn('The Weekly Reset', ''.join(p.get_text() for p in pdf))
                self.assertTrue(all('REFLOW PREVIEW - NOT A PRINT PROOF' in p.get_text() for p in pdf))
                self.assertEqual(len(list(Path(tmp).glob('proof-page-*.png'))), pdf.page_count)
                self.assertAlmostEqual(pdf[0].rect.width,432)
                self.assertAlmostEqual(pdf[0].rect.height,648)
            before = (Path(tmp) / 'proof-reflow.pdf').read_bytes()
            repeat = call(PROOF, SAMPLE, '--out', tmp)
            self.assertNotEqual(repeat.returncode, 0)
            self.assertIn('already exists', repeat.stderr)
            self.assertEqual((Path(tmp) / 'proof-reflow.pdf').read_bytes(), before)

if __name__ == '__main__': unittest.main()
