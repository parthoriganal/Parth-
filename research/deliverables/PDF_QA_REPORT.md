# PDF QA REPORT
**The Family Records Organizer — interior PDF**
Round 9 · 2026-11-10 · object under test: 116-page interior, 8.5 × 11 in, B&W

| | |
|---|---|
| File | `research/deliverables/The-Family-Records-Organizer_interior_8.5x11_BW_116pp.pdf` |
| SHA-256 | `369c8565e1df4539055ba817d2c859c7581456bce18f1bdb9f426b6e466c90fb` |
| Size | 277,190 bytes |
| Pages | 116 |
| Machine-readable results | `qa_report.json` (per-page ink, fonts, colours), `layout-trace.json` (3,291 recorded text boxes) |
| Harness | `research/tools/qa_book.py`, `content_audit.py`, `audit_fill.py` |

Everything below was produced by running the harness against the delivered file, not by
inspection of the source. The commands and their outputs are reproducible from the repo.

---

## 1. Results summary

| # | Check | Method | Result |
|---|---|---|---|
| 1 | Trim / page size | `MediaBox` of all 116 pages | **PASS** — only `612 × 792 pt` occurs |
| 2 | Page count | page tree | **PASS** — 116, inside 112–120 |
| 3 | Margin safety | x/y extents of 3,291 traced strings vs safe frame | **PASS** — 0 outside |
| 4 | Footer clearance | no body text in the 0.62 in footer band | **PASS** — only folio + part label |
| 5 | Physical edge | raster scan of the outer 0.35 in of every page | **PASS** — 0 pages with edge ink |
| 6 | Blank / near-blank pages | raster ink count per page | **PASS** — lightest page 13,266 dark px |
| 7 | Font embedding | `/FontDescriptor` of every font on every page | **PASS** — 5 fonts, all embedded |
| 8 | Colour | every `rg`/`RG` operator in every content stream | **PASS** — 16 values, all exactly neutral |
| 9 | Text collisions | pairwise overlap of 3,291 boxes (ink extent per line) | **PASS** — 0 overlaps |
| 10 | Type size floor | min recorded size | **PASS** — 7.0 pt |
| 11 | Duplicated pages | MD5 of every rendered page bitmap | **PASS** — no identical pair |
| 12 | Dangling cross-references | regex over extracted text | **PASS** — 0 × `page --`, 0 × `page None` |
| 13 | Overflow / clamp counters | printed by `build_book.py` | **PASS** — 0 tables clamped, 0 paragraphs below the block |
| 14 | Binding claim | regex, plus manual count | **PASS** — 3 uses of "lie flat", all denials |
| 15 | Banned credential fields | 8 regexes over the full text | **PASS** — 0 |
| 16 | Implied legal effect | 3 regexes over the full text | **PASS** — 0 |
| 17 | Medical instruction | 4 regexes over the full text | **PASS** — 0 |
| 18 | Trademark-clearance claim | 2 regexes | **PASS** — 0 |

**No failures, no warnings.**

---

## 2. What each check actually does, and what it caught

### 2.1 Trim and page size
Reads `MediaBox` from all 116 pages rather than trusting the layout constant. A single stray
`showPage()` with a different page size would show up here. Result: one size only.

### 2.2 Margin safety
`fro_layout.text()` and `fro_layout.para()` record the real glyph box of every string drawn
(3,291 records). Extents: **x from 0.625 to 7.875 in**, **y from 0.483 to 10.571 in** — inside
the mirrored 0.625/0.875 side margins and inside 0.30–10.70 in vertically. Traced strings outside
the safe frame: **0**.

The paragraph recorder was calibrated against a raster before use — an early version under-
reported the top of a paragraph by 0.1 in, which hid a real collision. Fixed and re-verified.

### 2.3 Physical edge (raster)
The trace cannot see rules, boxes or filled panels, so every page is also rendered at 1.2× and
the outer 0.35 in of paper is scanned for ink. This distinguishes two different things that a
naive test would conflate:

* the **content margin** (0.625/0.875 in) — running heads and folios deliberately live here;
* the **physical edge** (0.35 in) — must be empty.

0 pages have ink in the physical edge band. The check initially flagged every page because it
measured the content margin; that was a defect in the test, and it is recorded here rather than
quietly changed.

### 2.4 Blank pages
Dark-pixel count per page at 1.2×. Lightest page is page 1 (the title page) at 13,266 px;
next lightest are the letter and notes pages at ~13,900 px, which are intentionally ruled writing
surfaces. There is no page with no purpose and no page with no ink.

### 2.5 Fonts
| font | embedded | used for |
|---|---|---|
| `Lora-Regular` | ✔ (subset) | body text, section titles, folios |
| `Lora-Bold` | ✔ | run-in emphasis, rule headings |
| `Lora-Italic` | ✔ | standfirsts, notes |
| `WorkSans-Regular` | ✔ | checkbox labels, table prefills |
| `WorkSans-Bold` | ✔ | tracked uppercase labels, table headers |

**Defect found and fixed:** reportlab writes `BT /F1 12 Tf` into every page preamble from
`canvas._fontname`. Because the initial font was Helvetica, every page carried a non-embedded
`/Helvetica` in its resources — a KDP rejection. `setFont()` mid-page does not fix it, and neither
does `setPageSize()` at the end, because `save()` rebuilds the preamble last. Fixed with
`Canvas(..., initialFontName="Lora", initialFontSize=10)`. The delivered file's page 1 resources
contain the five subsets above and nothing else.

### 2.6 Colour
Every `rg`/`RG` operator in every content stream is extracted. 16 distinct values, all with
**r = g = b** exactly:

`.09` `.13` `.16` `.30` `.33` `.34` `.40` `.42` `.56` `.68` `.80` `.84` `.855` `.86` `.95` `1.0`

Zero `/XObject` entries exist in the whole document, so there are no images, no scans and no
placed logos. Nothing in the file can print as anything but a grey of black ink.

This check found a real weakness: the palette was originally near-neutral with 0.003–0.01
channel offsets (e.g. a warm paper tint). That prints identically, but "exactly neutral" is a
cleaner claim to be able to make, so the palette was made exact.

### 2.7 Collisions
Three thousand two hundred and ninety-one recorded boxes, compared pairwise within each page with
a 0.012 in tolerance in both axes. Real defects found and fixed during the build:

* three column headings running into the following column (identity table, finance table, legacy table);
* the part-opener "PART 04" eyebrow sitting on the numeral;
* the index page's closing note drawn over the first rows of the table;
* a "somebody who will ask questions you cannot answer" label 2.34 in wide overlapping its text column;
* two rule-heading labels overflowing into their body text.

All were fixed at source by changing the geometry, not by nudging coordinates until the checker
went quiet.

### 2.8 Type size
Smallest size in the file: **7.0 pt**, which is the tracked-uppercase label size used throughout.
The brief asked for labels no smaller than about 7 pt. Getting here required raising the
label-shrink floor from 6.2 to 7.0 pt and then shortening nine table headings so they fit at
7 pt (`Registration` → `Reg. no.`, `Section or page` → `Page or part`, `Branch or adviser` →
`Branch/adviser`, and so on). Table headers are 7.0 pt; body text is 10.9 pt on 16.2 pt leading.

### 2.9 Duplicated pages
Every page is rasterised and MD5-hashed. No two pages are identical, which is the mechanical
test of the anti-padding rule. The eight continuation sheets are distinguished by their printed
`sheet n of m` line and their continuous reference series (D1–D27, L1–L60).

### 2.10 Cross-references
The build renders the book three times: pass 1 with an empty page map, pass 2 with the resolved
map, pass 3 to confirm the map did not move. **The map was stable on all three passes on the final
build**, which is what allows 40-odd in-text pointers ("page 81 lists…") to be trusted. The regex
sweep over the extracted text confirms zero unresolved pointers.

---

## 3. Defects found during the build and what was done about them

This is the honest record of what the harness caught. Each was fixed in the source and the whole
book rebuilt; none was patched in the PDF.

| # | Defect | How it was found | Fix |
|---|---|---|---|
| 1 | Non-embedded Helvetica on every page | font-resource scan | `initialFontName="Lora"` on the canvas |
| 2 | Locator sheets printed headers with **zero rows** | visual inspection of page 56 | row count derived from `len(prefill)` |
| 3 | Finance table drew 4 of 8 requested rows, the last in the margin | trace y-extents | tables clamp to the text block and the build reports the clamp; now 0 |
| 4 | 56 of 84 pages had >1.6 in of dead space at the foot | raster ink-bottom measurement | tables stretch rows into free space; short pages get a ruled Notes tail |
| 5 | 7 column labels overflowed their column | label-fit counter in the build | labels shrink to 7 pt, headings shortened |
| 6 | 13 real text collisions | pairwise box overlap | geometry corrected in 8 places |
| 7 | Contents ran off the bottom when the book grew | trace y-extents | contents paginates itself |
| 8 | Contents and part dividers listed pages out of order after insertions | reading the divider against the folios | both sort by resolved page number; dividers read the build manifest |
| 9 | Warm-tinted greys (0.003–0.01 channel offset) | colour-operator audit | palette made exactly neutral |
| 10 | 225 strings below 7 pt | type-size floor check | floor raised to 7.0 pt, nine headings shortened |
| 11 | Footer/header text flagged as margin violations | raster check on the *content* margin | the check now measures the physical edge; heads and folios are deliberate |
| 12 | A confirmation band's text ran past the band edge on page 18 | zoomed raster crop | copy shortened to fit the band at 9.9 pt |

## 4. Rasterised visual inspection

The harness numbers are not the whole review. Every page was also rendered at 1.4× and inspected
as contact sheets of four, then specific pages were re-rendered and cropped at 2× where a defect
was suspected. Pages inspected this way include: 1–10, 14–27, 29–31, 34–36, 40, 43, 45–56, 61–80,
84–91, 96, 99–107, 109–116.

What that inspection changed, beyond what the counters found:

* **Part openers had no contents list** where the manifest had grown — now generated, so a page
  added to a part cannot be missing from its divider.
* **"How this book works"** had a three-column layout whose middle column collided with the text
  column; re-cut into a stacked layout with the part range set flush right.
* **Funeral page's disposition checkboxes** wrapped into each other; rebuilt as a measured row
  with the "not sure" option on its own line.
* **Letters pages** were double-ruled (page rules plus the automatic Notes tail); the tail is now
  suppressed on pages that are already a full writing surface.
* **The first-48-hours band** had a sentence running past the tinted panel; shortened.
* **"Documents you will be asked for"** had its estimate list in one narrow column; converted to
  a three-column list with proper column heads.

## 5. What this report does not certify

* It does not certify that KDP's converter will accept the file. Every published requirement
  checked this round is met, but only KDP's own preflight can accept a file.
* It does not certify a physical proof. No proof copy was ordered (that would be a paid item, and
  the budget for this round was $0).
* It does not certify accessibility or tagged-PDF structure. The file is a print interior; it is
  untagged by design.
* The raster inspection is a human eye on a screen at 1.4–2×, not a printed signature.
