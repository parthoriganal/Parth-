# Espresso Dial-In Fieldbook — production files

Production workspace for the selected US home-espresso workbook concept. The final paperback interior is black ink/white paper, 8.5 × 11 in, no bleed, 116 pages.

## Deliverables

- `espresso-dial-in-fieldbook-interior.pdf` — print interior.
- `espresso-dial-in-fieldbook-editable-manuscript.docx` — editable, page-referenced text manuscript/transcript. It preserves the printable wording and field labels; it does not replicate vector page geometry.
- `build_book.py` — authoritative editable ReportLab layout/source for the PDF, including original diagrams, forms, and page-count assertion.
- `export_editable_manuscript.py` — regenerates the DOCX transcript from the final PDF.
- `espresso-dial-in-fieldbook-full-wrap-cover.pdf` — one-page full-wrap paperback cover PDF, exact KDP-specification dimensions.
- `create_full_wrap_cover.py` — editable vector cover source and reproducible PDF/preview generator.
- `espresso-dial-in-fieldbook-cover-preview.png` — full-wrap cover render, visually inspected.
- `cover-qa-results.json` — machine-readable cover geometry/font/safe-area checks.
- `kdp-cover-dimensions.md` — official KDP specification inputs, exact cover calculation, panel coordinates, barcode reserve, and live-template caveat.
- `production-and-quality-report.md` — updated production summary, low-content recommendation, technical checks, cover QA, pricing estimate, and remaining KDP actions.
- `final-prepublication-audit.md` — dated independent audit snapshot; see the cover-phase update at the top for current deliverables and open validation items.
- `previews/` — seven selected high-resolution rendered preview pages.
- `all-page-review-sheets/` — 29 four-up contact sheets covering all 116 rendered interior pages.

## Rebuild

Use Python 3.11+ with the free packages in `requirements.txt` and DejaVu fonts available at `/usr/share/fonts/truetype/dejavu/` (Debian/Ubuntu package: `fonts-dejavu-core`). From this directory:

```bash
python build_book.py
python export_editable_manuscript.py
python create_full_wrap_cover.py
```

The PDF generator fails if the designed page count differs from 116. If any page content or the page count changes, rerun the visual/technical checks, update the cover calculation, and regenerate the DOCX and previews.

## Release note

This is a technically preflighted interior and a cover dimension brief, not KDP's acceptance or a physical proof. Before publication, use KDP's live cover template and Previewer, upload final files, inspect warnings, and review a printed proof.
