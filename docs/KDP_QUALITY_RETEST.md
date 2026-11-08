# KDP quality remediation and retest

**Date:** 2026-11-08. The earlier [practical test report](kdp-practical-test/TEST_REPORT.md) records the original failures; this document records the subsequent changes. The local book is a proposed project and one sample chapter, not a validated KDP listing or completed manuscript.

## Changes and evidence

| Area | Remediation | Evidence and qualification |
|---|---|---|
| Amazon failure behavior | Autocomplete network/response failures return `UNAVAILABLE`; mining never falls back to synthetic keywords. Full research returns 503 when all seed requests fail and 422 when the live response has no suggestions; neither generates a score. Partial seed failures are reported. Throttled requests respect the full backoff interval. | Real sandbox retest: `/api/autocomplete` **502 UNAVAILABLE**, `/api/research` **503 UNAVAILABLE**, no results/score. Real live success remains unverified due to network restrictions. Synthetic tests cover valid response shape, errors and partial responses, not live Amazon reliability. |
| Competition and products | Removed synthetic competition counts, substitute competitor books and mock top search results. Failed/blocked statuses and missing values remain visible; incomplete competition raises warnings. A reported `over N` result count is marked `lower_bound` and excluded from low-competition recommendations. | Offline fixtures test blocked competitor/search responses, missing counts and lower bounds. Result parsing now avoids an exception caused by an invalid BeautifulSoup argument and avoids treating a displayed page range as a total. Amazon markup can change and result counts, including reported totals, need not equal a verified number of competing books. |
| Sales and demand claims | Product responses no longer emit BSR-derived sales/revenue guesses. The demand heuristic no longer treats result counts as observed demand. Autocomplete positions and heuristic scores are not search volumes, sales, or proof of opportunity. | Synthetic tests assert unavailable sales fields; real sales data is not available. Scores still use heuristic neutral assumptions when competition is missing and are explicitly warned as incomplete. |
| Trends and old demo data | When live Google Trends data cannot be obtained, the endpoint returns `UNAVAILABLE` and empty values, not a synthetic curve. The UI handles empty trends and caches by market and keyword. Previously stored mock results are discarded rather than silently restored. | Actual sandbox `/api/trends` returned **UNAVAILABLE**, zero values. Tests cover this and a simulated provider response shape; they do not certify current Google Trends service access. Old simulated trends were in memory, not persisted by this UI. |
| Price model | `/api/profit` is labeled `ESTIMATED`, with a warning that local assumptions are not verified or marketplace-specific. UI text and research source label reflect this. | This does **not** fix or establish the correctness of the underlying royalty formula. Verify current official KDP terms, territories, formats, delivery and print costs before using these illustrative numbers. |
| Offline DOCX XSD | Added a separate wrapper, `scripts/validate_docx_offline.py`, that directs the original validator's Dublin Core imports to pinned local schemas. Installed skill files remain unchanged. See `third_party/docx4j/README.md` for source, commit and license. | The sample passes the installed validator: **16 files valid, 0 skipped, 0 new errors; 38 paragraphs**. A deliberately malformed document fails in regression tests. This validator has its own scope and ignored errors; a pass is not comprehensive Office compatibility or KDP compliance. |
| Visual preview | Added `scripts/proof_docx.py` using optional PyMuPDF, and generated [a four-page PDF reflow preview](kdp-practical-test/proof/proof-reflow.pdf) plus PNG pages. Inspected all four rendered pages. | **Not a Word/LibreOffice or KDP proof:** PyMuPDF reflows DOCX into a 6 × 9 inch viewport and can change layout and pagination. In this preview the list numbering/bullets are missing, a heading sits at the bottom of page 2, and a paragraph runs from page 3 to 4. These demonstrate why a faithful renderer and a print proof are still required. Text is readable in the preview, but no typographic sign-off is claimed. PyMuPDF has AGPL-3.0/commercial licensing; review before distribution. |

No historical or synthetic data were represented as live Amazon data in this retest. The old mock fixture module and seasonal-model function still exist as legacy code but are not invoked by the live research/trend endpoints. Previously generated documents and skill instructions were preserved.

## Reproduction and automated checks

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt -r requirements-proof.txt
npm ci
npm run test:quality
npm run test:skills
npm run verify:yt-skill
npm run test:sim
npm run build
python scripts/validate_docx_offline.py docs/kdp-practical-test/manuscript-sample.docx --verbose
python scripts/proof_docx.py docs/kdp-practical-test/manuscript-sample.docx --out /tmp/kdp-proof
```

Retest: **15 quality tests**, **7 skill integration tests**, **17 YouTube verification checks**, simulator smoke test, and production build passed. The quality suite's proof test skips if optional PyMuPDF is missing; it ran in this retest. Test fixtures contain deliberately synthetic provider data and are never market observations. The validator regression includes both an accepted sample and an invalid OOXML fixture. The preview script refuses to overwrite existing proof files; choose a fresh output directory for each run.

## Remaining limitations and publication readiness

**Not publication-ready.** Live Amazon access is blocked in this sandbox; DataForSEO/Pangolinfo credentials were not configured; no real search volume, trends, competitor, sales or demand validation is available. Existing unofficial scrapers are sensitive to CAPTCHA, site markup, rate limits and permitted use; successful fixture parsing is not evidence of production reliability. No current official KDP royalty or printing rules were verified. The sample book lacks a complete manuscript, user-approved brief, independent editorial and reader review, rights checks, final metadata, cover, accessibility checks, faithful rendering and KDP preview.

Before publication: obtain a user-approved project and verified sources; research through authorized, reachable data sources; verify current KDP rules and pricing; finish and review the manuscript; render the final DOCX through Word or LibreOffice; inspect every page, list, font, margin and gutter; and complete KDP's own preview/proof process. The reflow PDF and PNGs are diagnostic artifacts only.
