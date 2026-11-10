# PAGE COUNT & TRIM REPORT
**The Family Records Organizer — print-ready interior**
Round 9 · generated 2026-11-10

## 1. Delivery identification

| item | value |
|---|---|
| Interior PDF | `research/deliverables/The-Family-Records-Organizer_interior_8.5x11_BW_116pp.pdf` |
| Pages | **116** |
| File size | 277,190 bytes |
| SHA-256 | `369c8565e1df4539055ba817d2c859c7581456bce18f1bdb9f426b6e466c90fb` |
| Trim | 8.500 × 11.000 in (612 × 792 pt) — identical on all 116 pages |
| Bleed | **none** — the design uses no element that reaches the trim edge |
| Ink | 100 % greyscale, no colour operators, no images |
| Binding | perfect-bound paperback (KDP) |

Page size was verified from the PDF `MediaBox` of every page, not from the layout constants:
the only size present is `(612.0, 792.0)` pt.

## 2. Page budget against the 112–120 target

| block | pages | count |
|---|---|---|
| Front matter (title, copyright, contents ×2) | 1–5 | 5 |
| Part 1 · Getting started | 6–16 | 11 |
| Part 2 · The first 48 hours | 17–27 | 11 |
| Part 3 · Family and personal records | 28–46 | 19 |
| Part 4 · Wishes and preferences | 47–60 | 14 |
| Part 5 · Digital assets | 61–79 | 19 |
| Part 6 · The document locator | 80–89 | 10 |
| Part 7 · Maintenance | 90–99 | 10 |
| Part 8 · Notes and letters | 100–109 | 10 |
| Back matter (resources, worksheet index, glossary, index, sources, colophon) | 110–116 | 7 |
| **Total** | | **116** |

**116 pp sits inside 112–120 with 4 pages of headroom below the ceiling.** No page is a
duplicate of another: the QA harness hashes the raster of every page and found no identical
pair. The eight multi-sheet inventories (locator ×6, accounts ×2, debts ×2) carry continuous
reference series and are marked "sheet *n* of *m*", so they read as a set rather than a repeat.

## 3. Margins, and why they are what they are

| margin | value | KDP minimum for 24–150 pp at this trim |
|---|---|---|
| Inside (gutter) | **0.875 in** | 0.375 in |
| Outside | **0.625 in** | 0.25 in |
| Top | **0.780 in** | 0.375 in (no live matter at the head) |
| Bottom | **0.800 in** | 0.375 in |
| Content width | **7.000 in** | — |

Margins mirror by page parity, so the wide side is always the spine.

**The gutter is deliberately larger than the minimum.** In a perfect-bound book of this thickness
the inner few tenths of an inch are hard to write in, so the writing area is pushed away from the
spine. This is a usability decision about *where a hand can reach*. It is **not** a claim that
the book lies flat, and the book says so on pages 101 and 116.

Running heads sit in the outside/top margin at 10.49 in from the foot (7.2 pt); folios sit at
0.50 in, right-aligned to the outside edge, above a hairline rule at 0.62 in. Both are inside the
0.625 in outside margin and well outside the outer 0.35 in of paper.

## 4. How the page count was reached honestly

The first full build was **84 pages**. It passed every automated check, and that was the problem:
56 of those pages stopped more than 1.6 in above the bottom margin. Two rounds of work followed,
neither of which added a blank page, a repeated worksheet, or a larger type size:

1. **Structural fill.** Tables stretch their rows into unused vertical space (caps at 0.62 in per
   row); pages that still stop short get a ruled *Notes* tail, because in a book whose product is
   somewhere to write, dead space at the foot is wasted product. → 84 → 106 pp.
2. **New pages, each on a subject the book was missing.** Every one is listed in §5 and every one
   answers a question an earlier page provokes. → 106 → 116 pp.

The current build has **0 clamped tables and 0 overflowing paragraphs**; both counters are printed
by `build_book.py` on every run and are hard failures in `qa_book.py`.

## 5. The 26 pages added after the first build (none is a repeat)

Front: one-page summary · ten-minute start.
Part 2: what goes back and what stops · documents you will be asked for · telling people what to
say · the paperwork in the first month.
Part 3: accounts sheet 2 · debts sheet 2 · vehicles and titled property · memberships and
organisations · household services and suppliers · home contents worth listing · people who help ·
making an insurance claim.
Part 4: if there is no will · the order of service · organ and tissue donation · things I would like
kept together.
Part 5: email, messaging and social accounts · digital money and marketplaces · things bought and
licensed · devices, drives and backups · home network and smart devices · digital accounts in the
first two weeks.
Part 6: locator sheets 5 and 6 · the first hour with this book.
Part 7: a family conversation with an agenda · if I cannot manage this myself.
Part 8: a letter to whoever settles my estate.
Back: every worksheet in this book.

## 6. Print economics at 116 pp (KDP paperback, B&W, large trim)

| item | value | source |
|---|---|---|
| Print cost | **$1.00 + 116 × $0.017 = $2.972** | KDP printing-cost formula, large trim B&W |
| Minimum list for 60 % royalty | $9.99 | KDP royalty bands |
| Royalty at $12.99 | **$4.82** | 60 % × 12.99 − 2.972 |
| Royalty at $14.99 | **$6.02** | 60 % × 14.99 − 2.972 |
| Royalty at $9.99 | **$3.02** | 60 % × 9.99 − 2.972 |

Two pages fewer than 118 keeps the book comfortably above the 110 pp cost step; the figure above
is the one to use. (Note: the repo's `backend/config.py` carries the small-trim constants and was
**not** edited — this table is the correct one for 8.5 × 11.)

## 7. Files

```
research/deliverables/The-Family-Records-Organizer_interior_8.5x11_BW_116pp.pdf   ← interior
research/deliverables/TOC_final.txt
research/deliverables/qa_report.json
research/deliverables/layout-trace.json
research/deliverables/PAGE_COUNT_AND_TRIM_REPORT.md      (this file)
research/deliverables/PDF_QA_REPORT.md
research/deliverables/FONT_AND_LAYOUT_VERIFICATION.md
research/deliverables/FACTUAL_SOURCE_LIST.md
research/deliverables/REMAINING_LIMITATIONS.md
research/deliverables/KDP_COVER_PRODUCTION_BRIEF.md
research/deliverables/cover/                              ← cover PDFs + brief
```

## 8. What is *not* claimed

- No claim that the interior has been proof-printed. It has been rasterised at 1.2–2× and
  inspected page by page, which is not the same thing.
- No claim of KDP preflight acceptance. The file follows every published requirement checked this
  round, but only KDP's own converter can accept it.
- No claim that 116 is the only possible length: 112–120 was the brief, and this build lands at
  116 with all slack absorbed by content.
