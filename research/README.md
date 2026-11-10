# KDP Niche Research — evidence workspace

Every number in `FINAL_REPORT.md` traces back to a file in this directory.

| Folder | Contents |
|---|---|
| `raw/` | Verbatim captures: Amazon autocomplete JSON, SERP result counts, product-page BSR/reviews |
| `data/` | Derived tables (CSV/JSON) built only from `raw/` — no synthetic values |
| `tools/` | The measurement scripts actually used (no third-party install required) |

## Evidence status labels (inherited from this repo's data-accuracy contract)
- **MEASURED** — read directly from Amazon (result count string, BSR, review count, autocomplete ordering).
- **ESTIMATED** — derived from a measured value by a documented, calibrated formula.
- **INFERRED** — analyst judgement from structural evidence; never presented as a number.
- **UNAVAILABLE** — could not be obtained; stated explicitly rather than filled in.

Amazon does not publish public search volume. No search-volume figure in this report is
presented as measured. See "Data limitations" in `FINAL_REPORT.md`.

## Index

- [`FINAL_REPORT.md`](./FINAL_REPORT.md) — the deliverable (verdict: **B — Promising but unverified**)
- [`raw/EVIDENCE_LOG.md`](./raw/EVIDENCE_LOG.md) — verbatim captures, every number in the report traces here
- [`data/candidate_niches.csv`](./data/candidate_niches.csv) — 40 candidates with probe depth + honest evidence status
- [`tools/measure_amazon_us.py`](./tools/measure_amazon_us.py) — stdlib-only, re-runnable; refuses to emit a volume number
