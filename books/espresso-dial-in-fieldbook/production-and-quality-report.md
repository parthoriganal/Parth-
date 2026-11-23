# Production and quality report — current package

**Title:** *Espresso Dial-In Fieldbook for Home Baristas*  
**Subtitle:** *Compare 4 Shots per Bean, Track Grind, Dose, Yield, Time & Taste, and Save Your Repeatable Recipes*  
**Report date:** 22 November 2026

## Current deliverables

- `espresso-dial-in-fieldbook-interior.pdf` — 116-page US Letter interior, black ink on white paper, no interior bleed.
- `espresso-dial-in-fieldbook-editable-manuscript.docx` — page-referenced text transcript, not a page-faithful layout source.
- `build_book.py` — authoritative editable interior layout generator.
- `espresso-dial-in-fieldbook-full-wrap-cover.pdf` — single-page, vector full-wrap cover PDF, with the back, narrow spine, and front in one print sheet.
- `create_full_wrap_cover.py` — editable Python/ReportLab cover source; checks the interior count/trim before computing and building the cover.
- `espresso-dial-in-fieldbook-cover-preview.png` — 144-dpi, full-wrap render inspected after the final PDF build.
- `cover-qa-results.json` — machine-readable results of final cover/PDF/layout checks.
- `kdp-cover-dimensions.md` — current KDP specification inputs, cover math, panel coordinates, and remaining live-template check.
- `final-prepublication-audit.md` — independent audit snapshot and the earlier page 107 correction.
- `all-page-review-sheets/` and `previews/` — 29 contact sheets for the full interior and seven selected interior previews.

## KDP low-content classification — conclusion based on this interior

**Recommendation: classify this title as low-content in KDP title setup.** KDP defines low-content books as having minimal or no interior content, generally repetitive and designed to be filled by the user; its examples expressly include log books. This book's main use is a repeated espresso log/workbook, not continuous nonfiction:

- Pages 23–78: **56 session pages** for fourteen bean experiments—profiles, shot logs, and compare/decide forms.
- Pages 79–92: **14 saved-recipe cards**.
- Pages 93–104: **12 working-note forms**.
- Pages 105–116: **12 utility/reference pages**, substantially indexes, settings maps, logs, reminders, and reusable note space.
- Pages 3–22 add **20 pages of actual instructional/reference text**, plus two front-matter pages. That is useful content, but it is not the dominant page function.

Thus, about **94 of 116 pages** are structured for recording, indexing, or user completion. The 20-page guide does not change the dominant, repetitious logbook use. KDP publishes no page-percentage threshold and says exceptions exist, so its review remains final; nevertheless the defensible setup choice for this actual interior is **Low-content**. If so classified, KDP's current guidance says not to select a conflicting category; low-content titles may use their own ISBN or publish without an ISBN, but are not eligible for a free KDP ISBN. The cover deliberately reserves the lower-right barcode zone for KDP's automatic barcode if published without an ISBN.

Official source: [KDP Low-Content Books](https://kdp.amazon.com/en_US/help/topic/GGE5T76TWKA85DJM).

## KDP print inputs and exact cover calculation

The actual interior was reopened and checked: **116 pages**, **8.5 × 11 in trim**. The specified production choice remains **black ink on white paper**, no interior bleed, left-to-right reading. KDP's current trim-size table lists 8.5 × 11 in B&W/white paperback at 24–590 pages, so 116 pages is within the published range. The official calculator page accepts custom trim up to 8.5 in wide and 11.69 in high; the chosen trim is at those accepted limits/within range. The calculator's interactive template was not submitted or downloaded in this session; dimensions below are calculated directly using its current official formula and cross-checked against the current specification.

KDP's published white-paper B&W spine factor is **0.002252 in per page**:

- Spine: `116 × 0.002252 = 0.261232 in`.
- Full wrap width: `0.125 + 8.5 + 0.261232 + 8.5 + 0.125 = 17.511232 in`.
- Full wrap height: `0.125 + 11 + 0.125 = 11.25 in`.
- Exact PDF page boxes: **1260.808704 × 810 pt** (MediaBox and CropBox).

The print PDF uses all four panels as one sheet: **back trim x = 0.125–8.625 in; spine = 8.625–8.886232 in; front trim = 8.886232–17.386232 in; outer bleed brings total width to 17.511232 in**. Bleed is 0.125 in at top, bottom, and the two outside edges. A single continuous background crosses the fold/spine to avoid a hard spine color change. **No spine text or critical art** is placed in the 0.261232-in spine; at 116 pages KDP permits spine text by page count, but its minimum side clearances make it inappropriate at this narrow width.

The lower-right back cover reserves a clean white **2 × 1.2 in** barcode rectangle, 0.25 in inside the bottom/right trim edges. No title, author, art, rule, or label intrudes on it. The cover has no ISBN printed because the low-content ISBN option has not yet been selected.

Official sources: [KDP cover calculator](https://kdp.amazon.com/cover-calculator), [Create a Paperback Cover](https://kdp.amazon.com/en_US/help/topic/G201953020), [Print Options](https://kdp.amazon.com/en_US/help/topic/G201834180), and [Trim Size, Bleed, and Margins](https://kdp.amazon.com/en_US/help/topic/GVBQ3CMEQW3W2VL6).

## Cover art direction and content

The original cover is a restrained specialty-coffee editorial design: deep roast-green ground, warm cream typography, copper/crema accents, serif display title, quiet sans-serif information, and an original vector top-view espresso/crema illustration with four numbered shot markers. The front reproduces the exact title/subtitle and author name. The back describes only features present in the interior (four-shot sessions, recipe cards, grinder/setup notes, and taste-led comparison). It contains no fabricated testimonial, endorsement, review quote, award, or author credential. The narrow spine is intentionally unlettered.

The print PDF is vector-first, one page, CMYK-only vector fills/strokes (no spot colors, color profile, or raster art); all used fonts are embedded. Visible cover text is **7 pt or larger**, front/back type stays inside KDP's 0.125-in safe line, and there is no text on the spine or over the barcode reserve. The finished PDF is a single full-wrap page—not three separate cover files.

## QA performed on the cover

- Rebuilt by `create_full_wrap_cover.py`; the script refuses a different interior page count or trim size.
- Verified one-page PDF, exact raw MediaBox/CropBox **1260.808704 × 810 pt**, correct output title/subtitle/author, embedded used fonts, no raster objects, and CMYK paint operators.
- Checked every text span against the front/back safe lines; **zero text-safe-area, spine-text, or barcode-overlap issues**. The closest text is 33 pt beyond KDP's 0.125-in cover safe-line minimum.
- Confirmed background reaches the bleed edges and the reserved barcode area is white and unobstructed.
- Rendered the final PDF at 144 dpi to `espresso-dial-in-fieldbook-cover-preview.png`; the PNG matches a fresh rasterization of the final PDF pixel-for-pixel. I visually inspected the final full-wrap render for hierarchy, text wrapping, panel/fold alignment, contrast, spine treatment, and barcode-zone clearance. The panel order is back–spine–front, left-to-right.

Detailed machine-readable checks are in `cover-qa-results.json`.

## Interior production summary

The page plan totals 116 pages: 2 front matter; 20 guidance/reference pages; 14 sessions × 4 pages; 14 recipe cards; 12 working-note pages; and 12 utility pages. The four-shot sequence is baseline, Test A, Test B, then confirmation/refinement. Guidance treats ratios, shot time, and taste descriptors as contextual rather than universal rules.

Prior independent preflight of the current interior found 612 × 792 pt pages, embedded used DejaVu fonts, visible type 7–33 pt, grayscale-only rendering, no blank pages or replacement glyphs, and no text/vector intrusion into KDP's minimum no-bleed margins. The editable DOCX preserves all page text as a transcript but is not the print-layout source. The page 107 table width defect was fixed and the 105–108 review sheet was refreshed.

## Price/cost assumption retained

Using the current public Amazon.com large-trim B&W white-paper paperback schedule for 116 pages:

- Print-cost estimate: `$1.00 + (116 × $0.017) = $2.972` (about **$2.97** per copy).
- At a **$16.99** list price with an assumed 60% Amazon-channel paperback royalty: `($16.99 × 0.60) − $2.972 = $7.222` (about **$7.22** per sale).

This is schedule arithmetic, not a live KDP quote; $16.99 is an untested positioning suggestion. Marketplaces, final print choices, rounding, taxes, and Expanded Distribution can change the result. Recheck KDP's live calculator/pricing screen.

Sources: [Paperback printing costs](https://kdp.amazon.com/en_US/help/topic/G201834340) and [Paperback royalties](https://kdp.amazon.com/en_US/help/topic/G201834330).

## Remaining actions before KDP submission/publication

1. In KDP title setup, select **Low-content** for this journal/log-style workbook, then choose either publish-without-ISBN or use an ISBN you own. Do not choose a free KDP ISBN if KDP treats the book as low-content.
2. Re-enter the exact options in the live cover calculator and download its latest template. Compare its fold/safe-area/barcode guides with this mathematically exact PDF; make any template-specific adjustment only if needed. KDP's live template and validation are authoritative.
3. Enter matching title, subtitle, author, print settings, rights/territories, description, keywords, and categories. Use the no-ISBN barcode handling consistent with the ISBN choice.
4. Upload only when ready; inspect KDP Previewer and resolve warnings. **No upload, publication, or KDP acceptance has been performed.**
5. Order and inspect a physical proof for actual color, crop/bind variance, paper behavior, small type, contrast, and handwriting space. **No physical proof has been ordered or inspected.**

The cover package is complete as a specification-based print-ready file; KDP's generated template/Previewer and a physical copy remain unverified.
