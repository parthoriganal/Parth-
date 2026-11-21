# Final Checklist

**Book:** *The 15-Minute Fascial Release Plan*
**Date:** 21 November 2026
**Verdict:** NOT READY FOR PUBLICATION — four blockers, none of them editorial.

Three columns: what only you can do, what only a clinician can do, and what I can finish once those two are done.

---

## 1. What you personally need to do

### Must do — nothing publishes without these

| # | Task | Time | Notes |
|---|---|---|---|
| 1 | **Engage a clinician.** Physiotherapist, sports physician, or orthopaedic/manual therapist with MSK experience. | 1–2 weeks to find | The single critical path. Everything else waits on it. |
| 2 | **Send them `clinician-review-packet.pdf`** and the review copy. | 5 min | Both are in `book/PDF-REVIEW/`. The packet is written to be answered in 2–3 hours. |
| 3 | **Engage an illustrator** for figures 1–3 (minimum), using `illustration-spec.pdf`. | 1–2 weeks | Can run in parallel with the clinician. |
| 4 | **Get the clinician to sign off the illustration boundaries** — specifically figures 1, 2 and 3. | part of review | An anatomically wrong figure is worse than none. |
| 5 | **Open the DOCX in Word or LibreOffice**, refresh the table of contents, check pagination, export a PDF. | ~30 min | Cannot be done here — no converter available. |
| 6 | **Decide KDP specs:** trim (6 × 9 fixed), no bleed, spine width from final page count, cover. | ~30 min | Needs the final page count, so it comes after 1–5. |

### Should do — judgment calls that are yours

| # | Task | Why it matters |
|---|---|---|
| 7 | **Decide the author name.** The EPUB currently says "Anonymous" because no attribution was chosen. | It ships with whatever is in there. |
| 8 | **Decide on clinical reviewer credit.** Named, or "clinically reviewed" without a name? | If named, get written consent. |
| 9 | **Read the five visual-QA fixes** in `QA_REPORT.md` §6a. | They changed the copyright page and the appendix. Worth 10 minutes. |
| 10 | **Confirm the 12 → 6 illustration deviation** is acceptable, or commission 7–8 (stretch sequences for hips/thighs/feet are the right next figures). | Recorded as a deviation in the QA report. |
| 11 | **Decide whether the EPUB ships before the paperback.** | It can: the EPUB needs clinical review, not illustrations. |

### Do not do

- **Do not invent an ISBN.** KDP assigns one free for ebook and paperback.
- **Do not claim the book was written purely by a human.**
- **Do not claim clinical review before it has happened.**
- **Do not add testimonials or endorsements** — none exist and none were sought.

---

## 2. What a clinician needs to review

All of this is packaged in `CLINICIAN_REVIEW_PACKET.md` / `.pdf` as **40 numbered questions**. Summary of scope:

| Area | What they check | Questions |
|---|---|---|
| **Red-flag tiers** | Are the emergency and "within days" tiers correctly assigned? What is missing — giant cell arteritis? cervical arterial dysfunction signs? | 1–5 |
| **Contraindication table** | 13 conditions. Is "get advice" for active cancer too permissive? What is missing? | 6–10 |
| **Governing rule** | Does "when in doubt, don't" cover the reader who has no doubt but should? | 11 |
| **Load-control principles** | Is "3–4 out of 10" usable? Are 20–60 s holds right? | 12–14 |
| **Ten techniques** | Position, load, tissue, structures at risk, stop signals — per technique | 15–36 |
| **Front-matter notice** | Does the disclosure adequately discharge a duty of care? | 37–39 |
| **Eight evidence claims** | Has the book represented the research fairly? Has it been *over*-cautious? | 40 |

### The three highest-risk items for them

1. **Calf / DVT** (Q31–33) — the only absolute exclusion, and the highest litigation exposure.
2. **Lower back** (Q30) — "where self-treatment most often becomes self-injury." Kidneys, 12th rib and costovertebral angle are not currently named.
3. **Neck boundary** (Q15–18) — where "safe" stops. Also the figure they must sign off.

They can mark up `PDF-REVIEW/interior-proof.pdf` directly; every question is page-referenced.

**What I need back:** the response table filled in, or the marked-up proof. Free text is fine.

---

## 3. What I can finish automatically

Once you give me the inputs, these need no further decisions from you.

### On receiving clinician responses

| # | Task | Time |
|---|---|---|
| 1 | Apply accepted changes to `04-before-you-start.md` and `05-the-routine.md` | 30 min |
| 2 | Update the front-matter notice to reflect completed review | 10 min |
| 3 | Rebuild DOCX and EPUB | 2 min |
| 4 | Re-run EPUBCheck 5.4.0 and the full structural suite | 5 min |
| 5 | Re-verify content integrity (paragraph tracing, claim audit, style metrics) | 10 min |
| 6 | Re-render the interior proof and re-run visual QA on every page | 10 min |
| 7 | Update `QA_REPORT.md` with the new verdict | 20 min |

### On receiving illustration files

| # | Task | Time |
|---|---|---|
| 8 | Place figures at the specified anchors in both editions | 30 min |
| 9 | Write captions and alt text to the standards in the spec | 30 min |
| 10 | Rebuild, re-validate, re-render, re-check | 20 min |

### On being told the author name and KDP decisions

| # | Task | Time |
|---|---|---|
| 11 | Set `dc:creator` and rebuild the EPUB | 5 min |
| 12 | Produce the final KDP spec sheet (trim, spine, bleed, cover dimensions, file requirements) | 20 min |
| 13 | Final pre-submission QA pass and updated QA report | 30 min |

### What I cannot do, ever, in this environment

- **Open the DOCX in Word.** No Word, no LibreOffice, no converter. I render a faithful proof from the DOCX's own styles (and did — 48 pages, and it found five real defects), but Word's own pagination needs a machine that has Word on it. That is your step 5.
- **Produce a press-ready PDF.** Downstream of the above.
- **Obtain a clinician or an illustrator.** Those are human.

---

## Critical path in one line

**Clinician first, illustrator in parallel, PDF export last (30 minutes once the book stops changing).**

Everything I can do without you is already done. The EPUB validates clean, the DOCX is visually reviewed, the manuscript is complete, and the claim language has been audited. What remains is two professionals and one PDF export.
