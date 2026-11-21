# Publication Blockers

**Book:** *The 15-Minute Fascial Release Plan*
**Assessed:** 21 November 2026
**Current state:** manuscript complete (9,294 words, 7 chapters). DOCX and EPUB both built and validating. Neither is publishable yet.

This is the blocker list only. Everything else — structure, prose, evidence handling, claim language, typography, EPUB validity — has been checked and is not on this list.

---

## The four blockers

### 1. No clinical review — **hard blocker**

**What is missing.** No doctor, physiotherapist, or other qualified clinician has read any part of this book. Ten techniques are taught, each with a safety boundary, and none of those boundaries has been checked by someone qualified to judge them.

**Why it blocks.** Reader safety, and a standing instruction on this project that all technique descriptions must be clinically reviewed before publication. It is also the honest position: the book tells readers it has not been reviewed.

**What closes it.** A clinician works through `CLINICIAN_REVIEW_PACKET.md` (40 questions, ~3,000 words of source) and returns it. Then:
- accepted changes are made to Chapters 4 and 5;
- both editions are rebuilt and re-validated;
- the front-matter notice changes from "has not been reviewed" to naming the review (only with consent).

**Effort for you:** finding the clinician. **Effort for them:** 2–3 hours.  
**Effort for me:** under an hour once their responses exist.

---

### 2. No essential illustrations — **hard blocker for print**

**What is missing.** The book has **zero** illustrations against a required 12. Three are safety-critical:

| # | Figure | Why it cannot be prose-only |
|---|---|---|
| 1 | Neck boundary map — safe zone vs carotid triangle, cervical spine, base of skull | A reader who skips the text will look at the picture |
| 2 | Calf DVT exclusion | The only absolute exclusion in the book; must be unmissable |
| 3 | Lower back — wall vs floor placement | The intuitive posture is the dangerous one |

**Why it blocks.** In a self-treatment book the reader's hand position *is* the intervention. A wrong illustration is worse than none, because it is followed with more confidence than prose.

**What closes it.** An illustrator draws figures 1–3 from `ILLUSTRATION_SPEC.md`, and the clinician signs off on the anatomical boundaries. Figures 4–6 are strongly recommended but not blocking.

**Effort for you:** commissioning. **Effort for me:** placing them, writing alt text, rebuilding.

**Note:** the 12-illustration target is being deliberately missed. Six correct figures beat twelve decorative ones. This is recorded as a deviation, not corrected by filler.

---

### 3. No print-ready interior PDF — **blocker for paperback**

**What is missing.** No print-ready PDF exists. The DOCX is the layout source, not a print artefact.

**What exists instead.** `PDF-REVIEW/interior-proof.pdf` — 48 pages, rendered from the DOCX's own style definitions at true 6 × 9 with true margins, and visually reviewed. It is a proof, not a press file.

**Why it blocks.** KDP requires a PDF for paperback. The EPUB is complete and is not affected — it ships as its own edition.

**What closes it.** After blockers 1 and 2 (there is no point typesetting a book that will still change):
- open the DOCX in Word or LibreOffice, refresh the TOC, confirm pagination;
- export to PDF with fonts embedded;
- KDP specs: trim 6 × 9, no bleed for text-only interiors, spine width from final page count, cover.

**Effort for you:** ~30 minutes at a machine with Word or LibreOffice.  
**Effort for me:** the KDP spec sheet and the final page count.

**Deliberately sequenced last.** Generating a PDF now would be wasted work: clinical changes will reflow it.

---

### 4. No illustrator and no clinician engaged — **the actual constraint**

Blockers 1–3 are not technical. They are "two professionals have not been hired yet."

Nothing else on this project is waiting on me.

---

## Not blockers — recorded so they are not mistaken for them

| Item | Status |
|---|---|
| Manuscript complete at 9,294 words | ✅ within the 8,000–12,000 target |
| No padding | ✅ every chapter earns its place |
| EPUBCheck 5.4.0 | ✅ 0 fatals / 0 errors / 0 warnings / 0 infos |
| Claims language (no cure, no guarantee, no detox) | ✅ audited; only negations and quotations |
| Fabricated citations | ✅ none; every reference traceable to the research file |
| Clinical-review disclosure | ✅ prominent on the copyright page |
| DOCX geometry, styles, tables, callouts | ✅ verified structurally **and** visually |
| DOCX pagination proven in Word | ⚠️ not yet — needs one pass; not a content blocker |
| "Back Matter" label, blank table header, unshaded callout | ✅ all found in visual QA and fixed |
| ISBN | ✅ deliberately absent — do not invent one |
| Claim of human authorship | ✅ not made |

---

## Shortest honest route

```
Clinician engaged ──► review packet returned ──► edits ──► rebuild ──► re-validate
                                                              │
Illustrator engaged ─► figures 1–3 drawn ─► clinician signs off ┘
                                                              │
                                                              ▼
                                          Word/LibreOffice pass ──► PDF export
                                                              │
                                                              ▼
                                              KDP specs ──► paperback
```

The EPUB can be published **before** the illustrations exist, once the clinical review is done. The paperback needs both.

**Critical path is the clinician.** Start there. The illustrations can run in parallel, and the PDF export is 30 minutes at the end.
