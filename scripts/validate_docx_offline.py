#!/usr/bin/env python3
"""Run the installed DOCX validator with pinned, local Dublin Core schemas."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from xml.sax.saxutils import quoteattr

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / '.claude/skills/anthropic/docx/scripts/office/validate.py'
SCHEMAS = ROOT / 'third_party/docx4j/xsd/docProps'


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('docx', type=Path)
    p.add_argument('--verbose', action='store_true')
    a = p.parse_args()
    if not a.docx.is_file() or a.docx.suffix.lower() != '.docx':
        p.error('Provide an existing .docx file')
    schema_paths = [SCHEMAS / f'{name}.xsd' for name in ('dc', 'dcterms')]
    if not all(x.is_file() for x in schema_paths):
        print('Offline schema files missing', file=sys.stderr)
        return 2
    with tempfile.TemporaryDirectory() as tmp:
        catalog = Path(tmp) / 'catalog.xml'
        entries = ''.join(f'<system systemId={quoteattr("http://dublincore.org/schemas/xmls/qdc/2003/04/02/" + path.name)} uri={quoteattr(path.as_uri())}/>' for path in schema_paths)
        catalog.write_text('<?xml version="1.0"?><catalog xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog">' + entries + '</catalog>', encoding='utf-8')
        env = dict(os.environ, XML_CATALOG_FILES=str(catalog))
        cmd = [sys.executable, str(VALIDATOR), str(a.docx.resolve())]
        if a.verbose:
            cmd.append('--verbose')
        return subprocess.run(cmd, env=env, check=False).returncode

if __name__ == '__main__':
    sys.exit(main())
