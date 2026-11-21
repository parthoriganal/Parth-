# Quality Assurance Report

**Title:** *The 15-Minute Fascial Release Plan: Self-Treatment for Stiff Necks, Tight Shoulders, and Aching Hips — Using Only a Tennis Ball, a Wall, and a Towel*

**Files assessed:**
- `The_15_Minute_Fascial_Release_Plan_Final.docx` (68,206 bytes)
- `The_15_Minute_Fascial_Release_Plan_Final.epub` (746,632 bytes)
- Source manuscript: `book/short/` (10 markdown files)
- Interior proof: `PDF-REVIEW/interior-proof.pdf` (48 pages, rendered for visual QA)

**Date of assessment:** 21 November 2026
**Assessed by:** automated structural, textual and schema validation; visual inspection of reflowed EPUB pages; and visual inspection of a rendered 48-page interior proof of the DOCX (see §6a).

---

## VERDICT: NOT READY FOR PUBLICATION

The files are **technically sound and complete as a draft**, but two required gates have not been passed and one is a standing instruction from the commissioning brief:

1. **No qualified clinical review has taken place.** Every technique description in Chapter 5 is unreviewed by a clinician. The brief states that all technique descriptions *must* be reviewed before publication.
2. **The print-ready interior PDF does not exist.** No PDF was produced, because no typesetting engine was available in this environment (see §7). The DOCX is the print-layout source, not a print-ready artefact.

Neither gap can be closed by further editing. Both require an action outside this workspace.

Declaring these files ready would require either ignoring a safety requirement the brief calls non-negotiable, or misrepresenting what has been verified. Neither is acceptable, so the verdict is NOT READY.

---

## 1. Editorial scope

| Item | Target | Actual | Status |
|---|---|---|---|
| Body word count | 8,000–12,000 | 9,294 | Met |
| Total word count (incl. front/back matter) | — | 11,449 | — |
| Chapters | 6–8 | 7 | Met |
| Structure | Pain & body; fascia science & limits; tools; safety; routine; progress; quick reference | All seven present | Met |
| Reflowed EPUB extent | — | 50 pages | — |

The book was not padded to reach a word count. Where the target range and editorial quality conflicted, quality won; the result sits mid-range rather than at the ceiling.

**Deliberate structural deviation:** the original brief specified ~15 chapters across three parts. That structure was superseded by the later instruction to produce a 6–8 chapter, 8,000–12,000 word book. The 7-chapter arrangement is the direct consequence of that instruction, not an omission.

## 2. Claim and language audit

Screened the full text for prohibited claims and promotional language.

| Term | Occurrences | Finding |
|---|---|---|
| "guarantee" | 2 | Both negations — "not a guarantee about you". Correct. |
| "cure" | 4 in prose | All four are explicit denials ("it is not a cure"). |
| "adhesion" | 6 | All in the chapter that dismantles the claim; none asserts breaking adhesions. |
| "detox", "miracle", "secret", "pain-free forever", "proven to", "reset your nervous system" | 0 | Absent. |

The word *release* appears only in the book's title and in explicit quotation of the claims being examined. It is never used as a description of a mechanism.

No fabricated citations, authors, journals, statistics, testimonials, or credentials were introduced. Every reference in `08-references.md` corresponds to a source recorded in `research/stage1/STAGE1_RESEARCH_REPORT.md`. Where a source was read only at abstract level, the reference entry says so rather than implying a full-text reading.

**Clinical review disclosure:** present and prominent — it appears on the copyright page, in a shaded callout, before any instruction is given.

## 3. Style metrics

| Metric | Value | Editorial band | Status |
|---|---|---|---|
| Em dashes per 1,000 words | 4.9 (46 total) | 2–6 | Within band |
| Average sentence length | 17.0–27.4 words by chapter | 15–25 | Ch. 4 at 27.4 is above band, deliberate |
| Three-part lists | 4 across 7 chapters | — | Low |
| Duplicated paragraphs | 0 | 0 | Clean |

Chapter 4 carries the longest average sentence length because it is the safety chapter: it is written in long, qualified sentences on purpose, and shortening them would make the cautions read as more absolute than the evidence supports.

## 4. DOCX structural verification

| Check | Result |
|---|---|
| Page size | 6.000 × 9.000 in — exact |
| Margins | L 0.875 / R 0.625 / T 0.750 / B 0.800 in |
| Text block width | 4.500 in |
| Mirrored margins | Present in `settings.xml` (`w:mirrorMargins`) |
| Paragraphs | 354 |
| Tables | 3 (13×2 contraindications, 8×3 weekly template, 15×5 journal) |
| Custom styles | 34 |
| TOC field | Present, with `w:updateFields` so Word refreshes on open |
| Human-readable TOC | Present as fallback, 11 entries |
| Page numbering field | Present |
| Outline levels | Chapter Title = 0, Section Heading = 1 |
| `keepNext` on heading styles | 3 of 3 |
| `widowControl` on body styles | 2 of 2 |
| `cantSplit` on table rows | 36 of 36, plus repeated header rows |
| Literal markdown / TODO / placeholder text | 0 |

Three defects were found and fixed during this assessment, all of which earlier checks had missed:

1. **`w:mirrorMargins` was in the wrong XML element.** It had been written into `sectPr`, where Word ignores it, so pages would not have alternated for binding. It belongs in `settings.xml`. An earlier verification claimed this was correct because it searched the whole document part rather than the settings part.
2. **Reader-facing instructions were inside the book.** The Contents page told readers to "right-click it in Word and choose Update Field". That is a production note that leaked into the reading experience. Replaced with a populated TOC plus the update-on-open setting.
3. **Table rows could split across page breaks.** Rows now carry `cantSplit`, and header rows repeat.

## 5. EPUB structural verification

| Check | Result |
|---|---|
| **EPUBCheck 5.4.0** | **0 fatals / 0 errors / 0 warnings / 0 infos** |
| Spine documents | 13 |
| Embedded fonts | 5 TTF (Literata Regular/SemiBold/Italic, Inter Regular/Medium) |
| Navigation document | Present, 12 TOC links + 5 landmark links |
| Broken internal links | 0 of 17 (all fragments resolve) |
| Landmarks | Present (cover, copyright, notice, bodymatter, backmatter) |
| `mimetype` entry | First in archive, uncompressed |
| Fixed page sizes / absolute positioning | None — reflowable |
| Hyphenation | `hyphens: auto` on body text only, disabled on display type |

Four defects were found and fixed:

1. **Every document body was being emitted empty.** A Unicode string carrying an XML encoding declaration was being parsed by lxml's HTML parser, which rejected it; ebooklib swallowed the exception and silently returned empty content. The book still validated cleanly in that state, which is why schema validation alone was not sufficient to catch it. The declaration is now omitted and ebooklib adds it on write.
2. **Chapter headings duplicated the number** — "Chapter 1" as a kicker above an H1 that also read "1 · The Morning Check".
3. **Reference entries had alternating indentation**, because the default body rule's first-line indent applied to some entries and not others. Now all use a consistent hanging indent.
4. **The title page hyphenated "Using" as "Us-ing"** across a line break. Hyphenation is now disabled on display text.

Items 1, 3 and 4 were only found by rendering and looking at the pages. They would not have appeared in any schema or text-extraction check.

## 6. Content integrity

Every prose paragraph of 12 words or more in the source files was traced into both outputs.

| Check | Result |
|---|---|
| Source paragraphs tested | 221 |
| Present in DOCX | 214 / 221 (96.8%) |
| Present in EPUB | 214 / 221 (96.8%) |
| Unaccounted-for paragraphs | 0 |

The 7 non-matches are **not losses**. They are the seven Contents-summary lines from `00-front-matter.md`, which are deliberately replaced in both formats by a real table of contents — a field-driven one in the DOCX, the navigation document in the EPUB. Each chapter's content survives in full.

Earlier automated comparisons in this assessment produced false alarms at a rate that is itself worth recording: a naive paragraph splitter, a tag-stripper that inserted spaces inside italicised words, and an HTML-entity-blind comparison each reported missing text that was in fact present. All integrity figures above come from the corrected comparison, verified by direct inspection of the disputed passages.

## 6a. Visual inspection of the interior (new)

The DOCX had never been seen rendered. It now has.

**How.** No Word, LibreOffice, or PDF converter was installable in this
environment. PyMuPDF's built-in DOCX reader was tried first and **rejected as a
QA method**: it ignores embedded fonts, run-level page breaks and most style
alignment, and flattened a 42-page book into an undifferentiated stream of
paragraphs with no chapter openers and no Literata. Reporting that as a visual
pass would have been false.

Instead, `PDF-REVIEW/proof_render.py` walks the DOCX body in document order and
sets each paragraph using the DOCX's **own** style definitions — pt size,
family, weight, italic, alignment, first-line indent, left/right indent, space
before/after, and paragraph shading — then flows it into pages at the true
6 × 9 trim and true margins using the real embedded Literata and Inter files.
Output: `PDF-REVIEW/interior-proof.pdf`, 48 pages.

**Fidelity limits — what this proof is not.** Line breaking is MuPDF's, not
Word's, so Word may break a line a word earlier or later and page breaks can
shift by a line or two. Word's document grid and exact justification are not
reproduced. Only folios are drawn; running heads are not. This is a proof of the
typography the build produced, not a Word facsimile.

**Pages inspected:** every one of the 48, plus a margin-containment check across
all pages (no text crosses the 4.5 in measure; the only marks outside the text
block are the folios, by design).

**Defects found visually — none of which any structural check had caught:**

| # | Defect | Fix |
|---|---|---|
| 1 | The copyright-page callout was the **only unshaded callout** in the book. It had been written out by hand instead of going through the callout emitter, so it shipped with no panel, no rule, and no Inter small-caps head. | Rebuilt through `emit_callout`. All 4 callout paragraphs are now shaded. |
| 2 | The callout-head detector had a `len(text) < 70` cap, which silently demoted the 92-character clinical-review head to body style. The **most safety-critical sentence in the book was the only one not set as a heading.** | Cap removed; head is now detected by being the first all-caps line. |
| 3 | Callouts broke into four separate shaded bands instead of reading as one panel, because each paragraph carried 5 pt of space after. | `space_after` set to 0 inside a callout; indents added so the panel is inset. |
| 4 | **"Back Matter" shipped as a visible Chapter Title** on the appendix page. It is a label for the source file, not reader-facing content. | Suppressed in the DOCX; the appendix heading now opens the section. |
| 5 | The appendix record table had a **blank header cell** in the "Day" column, which reads as a mistake at print size. | Header row labelled. |

All five were fixed, both files rebuilt, and the proof re-rendered to confirm.
Items 1–3 were in the visual-only category: they were invisible to every schema,
XML and text-extraction test run before this point.

## 6b. Clinician review packet

Prepared at `book/CLINICIAN_REVIEW_PACKET.md` (8-page PDF), with a clean
11-page review copy of only the material in scope at
`PDF-REVIEW/CLINICIAN_MANUSCRIPT.pdf`.

The packet asks 40 numbered questions across four parts: safety screening, each
of the ten techniques, the front-matter notice, and eight evidence claims where
a clinician's judgement beats an editor's. It provides a written response table
and page references into `interior-proof.pdf` so the reviewer can mark up the
proof directly.

It asks the reviewer explicitly whether the book has been **over-cautious** to
the point of misleading readers away from something that would help them.
Honesty that understates benefit is also a failure.

## 7. Testing that could NOT be completed

Stated plainly, because the brief requires it.

1. **No clinical, medical, or physiotherapy review.** No clinician has read any part of this manuscript. This is the single most significant outstanding item, and it is a gate the brief sets before publication.
2. **The DOCX is not proven in Word.** It has now been rendered and visually reviewed (§6a), but the renderer is MuPDF with the document's own styles, not Word. Word's pagination may differ by a line or two per page, and running heads have not been seen at all. A pass in Word or LibreOffice is still required before print. What has been verified is the typography, the callouts, the tables, and the page-flow — not Word's own line-breaking.
3. **No print-ready interior PDF.** Not produced. No LaTeX, pandoc, Ghostscript, or working HTML-to-PDF converter was available.
4. **No print proof, colour check, or binding test.** Both files are designed for 6×9 black-and-white, but neither has been through a physical or virtual press check.
5. **Illustrations: 0 produced against a required 12.** See §8.
6. **No accessibility certification.** The EPUB has good structural semantics (landmarks, nav, semantic headings, reflowable text, embedded fonts with fallbacks) but has not been through an EPUB Accessibility conformance check or a screen-reader test.
7. **No reading-system testing beyond one engine.** Rendering was confirmed in a single reflow engine. Kindle, Apple Books, Kobo, and Adobe RMSDK behaviour is untested.
8. **No plagiarism or originality scan against a corpus.** Originality was maintained by construction — all prose is newly written and no competing book was consulted for phrasing — but no automated similarity check was run.
9. **No human copyedit or proofread pass beyond automated screening.** Spelling variants, punctuation consistency, and factual phrasing were screened mechanically and by targeted reading, not by a professional proofreader on paper.

## 8. Illustration deviation

The brief specifies at least 12 illustrations. **The book contains none.** This is a deliberate deviation, and it should be understood as a genuine shortfall rather than a design choice presented as a virtue.

The reasoning offered is that a 9,294-word book does not sustain 12 illustrations without padding — that would mean roughly one per 770 words. The two candidate placements are the routine in Chapter 5 (hand positions) and the check diagrams in Chapter 1. For a self-treatment book, hand-position illustrations are arguably **not optional**; they are the part a reader most needs to see.

**Recommendation:** commission 4–6 line illustrations for Chapter 5 before publication, in preference to 12 illustrations spread thinly. This requires an illustrator, which was outside what this environment could produce honestly — generated imagery cannot be trusted to depict correct anatomy or safe hand placement in a self-treatment book.

## 9. Standing brief requirements: status

| Requirement | Status |
|---|---|
| Original manuscript | Complete |
| Verified bibliography | Complete — every entry traceable to the research report |
| Medical claim verification table | Complete — `manuscript/CH01_SOURCES_AND_REVIEW.md` and `research/stage1/STAGE1_RESEARCH_REPORT.md` |
| Safety review checklist | Complete — `SAFETY_PLAN.md`, operationalised in Ch. 4 |
| Illustration plan | Partial — plan exists, zero illustrations produced |
| Original illustration files | **Not delivered** |
| Print-ready interior PDF | **Not delivered** |
| Editable manuscript | Complete — `book/short/*.md` plus both generators |
| Final KDP specs | Partially specified — 6×9 B&W established; bleed, spine width, and cover not specified |
| Detailed QC report | This document |

No ISBN was invented. No clinical review was claimed. The manuscript is not described as human-written, and no claim is made about AI detection.

## 10. Conditions for changing this verdict to READY

1. A qualified clinician reviews Chapters 4 and 5 and signs off on the technique descriptions and contraindications.
2. The DOCX is opened in Word or LibreOffice and paginated; the table of contents is refreshed; tables, headers, and page breaks are checked on screen.
3. A print-ready interior PDF is generated from the DOCX and inspected page by page.
4. Hand-position illustrations for Chapter 5 are commissioned and placed.
5. KDP specifications are finalised: bleed setting, spine width from the final page count, and cover.

Items 1 and 3 are mandatory. Items 2, 4, and 5 are strongly recommended before submitting to a retailer.

---

*This report describes what was checked and what was not. Where a check could not be performed, that is stated rather than implied to have passed.*
