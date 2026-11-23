# Final pre-publication audit

> **Cover-phase update — 22 November 2026:** The earlier missing-cover blocker was resolved after this audit snapshot. The full-wrap cover PDF, editable generator, preview, and cover QA results are now present in this folder. The current low-content recommendation and cover verification are recorded in `production-and-quality-report.md` and `kdp-cover-dimensions.md`. No KDP upload/Previewer review, publication, or physical proof has been performed. The verdict below is historical to the audit before cover creation.

**Book:** *Espresso Dial-In Fieldbook for Home Baristas*  
**Subtitle:** *Compare 4 Shots per Bean, Track Grind, Dose, Yield, Time & Taste, and Save Your Repeatable Recipes*  
**Audit date:** 22 November 2026  
**Scope:** skeptical review of the current interior PDF, editable transcript, source/layout generator, cover-dimension brief, production/QC report, and rendered review sheets. This report does not represent KDP acceptance or a legal opinion.

## Verdict

# NOT READY — FIX REQUIRED

The **interior is technically preflighted and has no known remaining layout blocker**, but this is not yet a complete paperback upload package: there is **no full-wrap cover artwork/PDF**—only a dimension brief. The book's KDP low-content classification also needs an explicit decision in title setup. Do not treat the interior PDF alone as a finished paperback upload.

A KDP upload/Previewer check and physical proof have not been performed. They are necessary remaining production checks before publication; they cannot be claimed as passed here.

## Audit results

| Area | Status | Finding |
|---|---|---|
| Four-shot tracking system | **PASS** | Fourteen numbered sessions each provide a profile, four distinct shot records across two pages, and a compare/decide page. The sequence is baseline → one deliberate test → a different test from baseline (or clearly recorded comparison) → repeat/refine a candidate. Per-shot records capture grind, dose, yield, time, optional temperature with units, taste, and next adjustment. Decision and recipe-transfer fields close the loop. |
| Home-barista usability, guidance, and writing | **PASS WITH MINOR ISSUES** | Guidance is practical and appropriately non-prescriptive: it explains timer conventions, grinder-specific scales, actual versus target yield, one-variable comparisons, and the limits of taste cues. The 1:2 example is explicitly illustrative; troubleshooting is framed as hypotheses, not diagnoses. Reusable blank forms and repeated fields are intentional and functionally tied to the workflow. The small labels are now 7 pt—the KDP minimum, not generous print typography—and handwriting comfort/line contrast still need a physical proof. No in-home user test or independent espresso expert fact-check was performed. |
| Title, subtitle, and Amazon US suitability | **PASS WITH MINOR ISSUES** | The title and subtitle are descriptive, relevant to the actual workbook, and printed on the title page; the PDF title/author metadata agree with the book. No misleading performance, endorsement, or universal-recipe promise was found. Market demand, keyword competitiveness, title/trademark clearance, final KDP metadata fields, categories, description, and listing image/cover fit were not researched or verified. Use the exact title/subtitle consistently in the listing and on the final cover. |
| Interior layout and rendered pages | **PASS** | The full 116-page sequence was visually inspected in 29 four-up sheets; representative pages were also reviewed at higher resolution. No unexplained blank/filler pages, obvious clipped text, replacement glyphs, or visible page-to-page layout inconsistencies were found. Page plan totals correctly: 2 front-matter + 20 guide/reference + 14 × 4 session pages + 14 recipe cards + 12 working-note pages + 12 utilities = 116 pages. |
| PDF, manuscript, source, and print preflight | **PASS** | Final PDF has 116 pages, 612 × 792 pt (8.5 × 11 in), with matching media/crop/trim/bleed boxes, no encryption, no embedded raster images, grayscale-only rendered output, and embedded used DejaVu fonts. Extracted visible text is 7–33 pt; there are no blank pages or replacement characters. Every page's text and vector drawings were checked against KDP's published minimum no-bleed margins for this page-count range; no intrusions were found. The editable DOCX has 116 print-page references and its non-empty page text matches the PDF extraction page by page. It is a flowing text transcript, not a page-faithful print-layout substitute; `build_book.py` remains the layout source. |
| Cover dimensions and calculations | **PASS WITH MINOR ISSUES** | For 116 pages, black ink/white paper, 8.5 × 11 in trim: spine = 116 × 0.002252 = **0.261232 in**; full-wrap size with 0.125 in outside/top/bottom bleed = **17.511232 × 11.25 in**. The arithmetic and assumptions in `kdp-cover-dimensions.md` are correct. Omit spine text at this narrow width and keep the barcode area clear. These are calculated dimensions, **not a KDP-generated final template**; regenerate/download KDP's template after choosing final print options. No cover artwork exists in this project. |
| Cost and royalty math | **PASS WITH MINOR ISSUES** | On the current public US schedule assumed here, large-trim B&W white paper at 116 pages estimates **$2.972** print cost ($1 + 116 × $0.017). At a **$16.99** Amazon.com list price and assumed 60% rate, estimated royalty is **$7.222** ($16.99 × 0.60 − $2.972), or about $7.22. The arithmetic is correct; $16.99 is a positioning suggestion, not tested pricing. This is not a live KDP quote and excludes Expanded Distribution and any author-level tax effects. Recheck KDP's calculator/title setup at publication. |
| Copyright, rights, and publishing metadata | **PASS WITH MINOR ISSUES** | The interior has a 2026 copyright notice, scope/safety disclaimer, independent-source notes, and no obvious copied passage, fabricated testimonial, or endorsement claim in the inspected material. This is not legal or trademark clearance. Before setup, confirm the publisher/account has rights to all text and artwork, choose territories/ISBN options, and complete accurate keywords/categories/description. **Low-content classification is unresolved:** KDP's examples include repetitive log books, while this title also contains substantial instructions. Determine how KDP classifies this mixed workbook at setup; if it is treated as low-content, select the required low-content option and follow its ISBN rules. |
| Upload/publication readiness | **FAIL — FIX REQUIRED** | A full-wrap cover file is absent, the low-content choice is not recorded, and neither KDP Previewer/upload validation nor a printed proof has been completed. Create the cover from KDP's final template (or use KDP's cover tool), resolve title setup, then upload/preview and order a proof before publication. |

## Specific defect found and corrected during this audit

The original page 107 **“Coffee-specific grind settings”** table used column widths totaling 104% of its text block. Its right edge crossed the intended outside text boundary. This was a real layout defect. I changed only the final column allocation in `build_book.py` (0.37 → 0.33 of the available width), rebuilt the 116-page PDF and editable DOCX, refreshed the 105–108 review sheet, and reinspected that page. The final table now ends at the intended content boundary. A final page-by-page geometry check found no text or vector-drawing intrusion into KDP's applicable minimum margins.

Earlier font-size review also found explicitly smaller labels; these were raised so the final PDF's smallest visible text is 7 pt. No other redesign or broad rewrite was warranted.

## Technical measurements on the final rebuild

- PDF: **116 pages**, each **612 × 792 pt**; final file approximately **320 KB**.
- Extracted text: **190–1,164 characters/page**; zero blank pages and zero replacement-character glyphs.
- Text sizes: **7–33 pt**; used embedded fonts: DejaVu Sans, DejaVu Sans Bold, and DejaVu Serif Bold.
- Rendered all pages for review: **29 four-up sheets**; seven selected high-resolution previews are present. The 105–108 sheet was refreshed after the page 107 fix.
- Render analysis: **zero non-grayscale pixels**. No KDP minimum-margin, text-boundary, or vector-boundary violations found in the final interior.
- DOCX: **116 print-page references**; page text agrees with PDF extraction after empty lines are excluded. This is a transcript, not the KDP print interior.
- Cover arithmetic: **0.261232 in spine; 17.511232 × 11.25 in wrap**.
- US price example: **$2.972 estimated print cost; $7.222 estimated Amazon.com royalty at $16.99**.

## Not validated — do not imply otherwise

1. **No KDP upload, live Print Previewer review, or KDP acceptance.** Margin/bleed/font/cover compliance checks here are independent file checks, not KDP's decision.
2. **No physical proof copy.** Actual grayscale weight, paper show-through, small-type readability, trim/bind behavior, and handwriting comfort remain untested.
3. **No finished cover art.** The dimension brief is not an uploadable cover. Cover template alignment, barcode placement, spine/fold safety, and cover-to-metadata agreement remain untested.
4. **No live cost/royalty quote, sales/keyword/competition study, trademark search, formal copyright review, or independent specialist espresso review.**
5. **No final KDP title metadata or low-content selection.** Resolve low-content treatment carefully: KDP describes books with minimal/repetitive fill-in pages as low-content, lists log books as an example, and notes exceptions. Its current guidance says the title setup's low-content selection matters and low-content ISBN options differ.

## Required next steps before publication

1. Decide and record the KDP low-content classification; select the appropriate title-setup option and ISBN route.
2. Generate the current KDP cover template for the chosen trim, page count, paper, and ink; create the full-wrap art, omit spine text, and preserve barcode clearance.
3. Ensure cover title/subtitle/author match the interior and final listing metadata; complete accurate description, keywords, categories, rights, and territories.
4. Upload the interior and cover, resolve every Previewer warning, and verify the live print-cost/royalty calculation.
5. Order and inspect a physical proof; check smallest text, light rules, actual margins, binding, and writing space. Fix any real defect and regenerate affected files before publishing.

## References

Official KDP guidance consulted for the applicable checks and assumptions:

- [Paperback Fonts](https://kdp.amazon.com/en_US/help/topic/G202145450) — minimum font size and font embedding guidance.
- [Trim size, bleed, and margins](https://kdp.amazon.com/en_US/help/topic/GVBQ3CMEQW3W2VL6) — paperback trim and no-bleed margin minimums.
- [Create a Paperback Cover](https://kdp.amazon.com/en_US/help/topic/G201953020) — cover dimensions, spine calculation, bleed, and spine text.
- [Paperback printing costs](https://kdp.amazon.com/en_US/help/topic/G201834340) and [Paperback royalties](https://kdp.amazon.com/en_US/help/topic/G201834330) — public cost schedule and royalty formula.
- [Low-Content Books](https://kdp.amazon.com/en_US/help/topic/GGE5T76TWKA85DJM) — definition, examples, setup selection, and ISBN differences.
- [Metadata Guidelines for Books](https://kdp.amazon.com/en_US/help/topic/G201097560) — book-detail metadata restrictions.

The interior's further-reading section cites Perfect Daily Grind's *A Guide to Dialling In Espresso* and Clive Coffee's *Dialing In Espresso By Taste*, and directs readers to their equipment manuals. The references are presented as further reading, not endorsements.
