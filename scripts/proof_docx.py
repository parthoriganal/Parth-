#!/usr/bin/env python3
"""Generate a reflowed visual preview, not a faithful Word or KDP print proof."""
import argparse
from pathlib import Path
import sys


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('docx', type=Path)
    p.add_argument('--out', required=True, type=Path, help='Directory for proof PDF and PNG pages')
    args = p.parse_args()
    if not args.docx.is_file() or args.docx.suffix.lower() != '.docx':
        p.error('Provide an existing .docx file')
    try:
        import pymupdf
    except ImportError:
        print('Install optional PyMuPDF from requirements-proof.txt to generate a reflow preview.', file=sys.stderr)
        return 2
    args.out.mkdir(parents=True, exist_ok=True)
    if (args.out / 'proof-reflow.pdf').exists() or any(args.out.glob('proof-page-*.png')):
        print('Proof output already exists; choose an empty output directory to avoid overwriting files.', file=sys.stderr)
        return 2
    try:
        with pymupdf.open(args.docx) as doc:
            if not doc.is_reflowable:
                raise ValueError('Expected a reflowable DOCX document')
            doc.layout(width=432, height=648, fontsize=11)
            pdf_bytes = doc.convert_to_pdf()
        with pymupdf.open(stream=pdf_bytes, filetype='pdf') as pdf:
            if pdf.page_count == 0:
                raise ValueError('No preview pages generated')
            for i, page in enumerate(pdf):
                page.insert_text((24, page.rect.height - 10), 'REFLOW PREVIEW - NOT A PRINT PROOF', fontsize=7, color=(0.65, 0, 0))
                page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False).save(args.out / f'proof-page-{i+1:03}.png')
            (args.out / 'proof-reflow.pdf').write_bytes(pdf.tobytes())
            print(f'Generated {pdf.page_count} reflowed preview pages at 6 x 9 inch viewport in {args.out}.')
            print('NOT a Word/LibreOffice layout or KDP print proof; formatting and pagination may differ.')
        return 0
    except (RuntimeError, ValueError, OSError) as exc:
        print(f'Proof generation failed: {exc}', file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
