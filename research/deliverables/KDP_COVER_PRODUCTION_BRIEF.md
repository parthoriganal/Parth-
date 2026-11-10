# KDP Cover Production Brief — *The Family Records Organizer*

**Prepared:** 10 November 2026
**Interior it belongs to:** `The-Family-Records-Organizer_interior_8.5x11_BW_116pp.pdf`
(116 pages, 8.5 × 11 in, black ink on white paper, sha256 `369c8565…c90fb`)

> This is a **separate document from the five interior reports**, as specified. It contains the cover
> specification, the arithmetic behind the dimensions, the artwork that has been produced, the
> checks that artwork has passed, and the remaining production steps. Nothing here replaces
> KDP's own previewer.

---

## 1. The dimensions, and where every number comes from

KDP does not accept a guessed spine. The spine width is a function of page count and paper stock,
and the cover page size is a function of the spine. All of it is arithmetic, so all of it is
reproducible:

| Quantity | Derivation | Result |
|---|---|---|
| Page count | interior build, counted and verified | **116 pp** |
| Paper / ink | print edition, black ink | **white paper, B&W** |
| Spine per page | KDP formula, B&W white paper | 0.002252 in |
| **Spine width** | 116 × 0.002252 | **0.261232 in** (≈ 6.63 mm) |
| Trim | fixed | 8.5 × 11 in |
| Bleed | required all round for a full-bleed cover | 0.125 in |
| **Cover width** | 0.125 + 8.5 + 0.261232 + 8.5 + 0.125 | **17.511232 in** (1260.81 pt) |
| **Cover height** | 0.125 + 11 + 0.125 | **11.25 in** (810 pt) |

Cream paper would give a different spine (0.0025 in/page → 0.290 in, cover 17.540 in). **This brief
and the artwork assume white paper.** If the stock changes, the spine must be recomputed and the
cover rebuilt — the maths is a one-line change in `build_cover.py`.

**Spine text is permitted** because the book is over KDP's 79-page threshold for it. The wording sits
on the spine's centre line, which measured 12.0 pt clear of the left fold and 14.6 pt clear of the
right fold — comfortably above the 0.0625 in (4.5 pt) minimum, with room for fold drift on a
perfect-bound book.

---

## 2. What has actually been produced

| File | What it is |
|---|---|
| `deliverables/cover/The-Family-Records-Organizer_cover_116pp_BW.pdf` | **The cover, one page, 17.5112 × 11.25 in.** Back \| spine \| front, left to right. 35,382 bytes, sha256 `7fbd8d7de4eadc12c77447ad362f81aabbd35d7db9f7c06823d60d1031b0b556`. |
| `deliverables/cover/cover_geometry.json` | Every text and panel as a bounding box, so the layout can be re-checked without re-rendering. |
| `deliverables/cover_qa_report.json` | The automated result for the cover (see §4). |
| `research/tools/build_cover.py` | The source that generates the cover from the page count. |
| `research/tools/qa_cover.py` | The cover QA suite, 9 checks. |

The cover is **vector**, not a flattened raster: text stays sharp at any size and no image
resolution question arises. It is greyscale only, with every colour operator exactly neutral
(r = g = b), matching the interior's black-ink rule.

---

## 3. How the cover is laid out, and why

The design has one job beyond looking like the book it belongs to: **make the promise legible at
thumbnail size**, because that is how most buyers first meet it.

**Front.** A restrained editorial page: a tracked eyebrow, a three-line Lora title at 46 pt, a rule,
one sentence of positioning, a four-line "what is inside" summary, and the eight parts in two
columns. The part names are the same ones used in the interior and in the final TOC — the front
cover is a table of contents that happens to sell. A light 0.30 in tint band runs off the top
**into the bleed**, which is why the file carries bleed even though the interior does not.

**Spine.** Title only, 8.2 pt, tracked, set in Work Sans Bold caps, centred on the spine and on the
page's vertical centre (measured: 0.017 in above centre, i.e. optically centred). Reads
**top-to-bottom**, the US convention, so it is legible when the book lies face-up on a shelf or
right-way-up in a hand.

**Back.** The argument, in the order a sceptical buyer needs it:

1. *"Most families do not lose the house. They lose everything that sits behind a sign-in."* —
   names the real problem, which is retrieval rather than death.
2. What the book is, in one paragraph, ending on the question it answers.
3. Four claims that are all **literally true of the interior**: no password/PIN/key written down;
   preference kept separate from instruction; ruled space; one review a year with a change log.
4. **"What this book is not."** — an explicit panel stating it is not a will, power of attorney,
   healthcare directive or estate plan, and that filling it in does not create one. This is on the
   back cover deliberately: the honesty limit is a selling point, not a disclaimer to be buried.
5. Who it is for — deliberately **not** "the elderly" or "the terminally ill": anyone who owns a
   home, a vehicle, an account or a phone.
6. Book facts at the foot: 8.5 × 11 in · 116 pages · print edition.

**Barcode.** The lower-right of the back cover is left **completely empty** — no drawn box, no
placeholder text, nothing that could print. KDP places its own barcode there after upload. The
reserved area is 2.25 × 1.45 in, set 0.25 in inside the trim on the right and bottom edges:
**x 6.125 to 8.375 in, y 0.375 to 1.825 in**, measured from the bottom-left of the bleed page (so
it sits wholly within the back cover, whose trim runs x 0.125–8.625 in). Nothing may be added to
that rectangle — the QA suite asserts it is empty of text.

---

## 4. Checks the cover has passed

`qa_cover.py` runs nine checks and exits non-zero on any failure. Current result: **PASS, 0
failures, 0 warnings** (`cover_qa_report.json`).

| # | Check | Result |
|---|---|---|
| 1 | Single page; dimensions equal the spine arithmetic above | 17.511236 × 11.25 in — 0.000004 in from target, i.e. PDF unit rounding |
| 2 | All cover text at least 0.125 in inside the trim | 44 text fragments, 0 outside; our own margin is 0.25 in or more |
| 3 | No type below 7 pt | smallest 7.2 pt; full set `7.2 7.6 7.8 8.2 9.5 9.6 9.8 10.4 10.8 11.2 13 21.5 46` |
| 4 | Barcode clear area contains no text | 0 fragments inside it |
| 5 | No crop marks / colour bars | no ink at the outer edge of the bleed page on any side; the only bleed ink is the deliberate tint band (7.2 % of the top band) |
| 6 | Fonts embedded and subset | Lora-Regular, Lora-Bold, WorkSans-Bold, all `AAAAAA+` subsets |
| 7 | Colours exactly neutral | 60 colour operators, 7 distinct values, all r = g = b: `.09 .16 .35 .55 .62 .78 .95` |
| 8 | No CMYK or spot colour | none |
| 9 | No overlapping blocks | 53 geometry items, 0 collisions |

Check 9 exists because the first two builds failed visually in ways the earlier checks could not
see: the front-cover eyebrow collided with the title, and then the back-cover disclaimer panel
collided with the "Who it is for" block. Both were found by rendering and looking. The collision
check was then **fault-injected** — the block was moved back into the panel, and the check
correctly reported `['para: What this book is not…', 'WHO IT IS FOR', 0.721 in, 0.055 in]` and
failed. It is not a check that passes vacuously.

**Rasterised visual inspection:** the cover was rendered at 1.15×, 1.8× and 3.0× and inspected
whole and in detail — including a zoomed crop of the spine at 3× to confirm the wording is centred
and clears both folds. Source was corrected, rebuilt and re-rendered three times (title collision,
barcode placeholder removed, panel collision).

---

## 5. Answering the brief's questions directly

**Is the cover calculable?** Yes. Page count is verified at 116 and the paper stock is fixed at
white, so the spine and both cover dimensions follow from KDP's published formula. No estimation
and no template was used.

**Does the cover claim anything the interior does not deliver?** No. Every back-cover claim
corresponds to a real feature — the no-password rule, the preference/instruction separation, the
ruled writing space and the annual review with change log are all in the interior and are covered
by `FONT_AND_LAYOUT_VERIFICATION.md` and `PDF_QA_REPORT.md`. The cover makes no claim about
lay-flat binding, no claim about print quality beyond "print edition", and no claim of legal
sufficiency — it states the opposite in the disclaimer panel.

**Does it reproduce competitor wording?** No. The cover is original copy written for this book. The
headline was written from the subject, not from any competitor's listing.

**Trademark.** The title was checked against Amazon search for an exact match during the earlier
research round and none was found, but **no trademark clearance search has been performed** and none
is claimed. That limitation stands in `REMAINING_LIMITATIONS.md`.

---

## 6. What remains, and who has to do it

These are the steps that cannot be done from here, stated plainly so nothing appears finished that
is not:

1. **Upload and preview in KDP's cover previewer.** This is the only authoritative check. Our QA
   cannot see how KDP's printer imposes the file, and it cannot simulate fold drift on a real
   binding.
2. **Get the barcode placed.** KDP adds it automatically to the reserved area after upload. Do not
   add one yourself.
3. **Confirm the paper stock on the KDP form matches "white".** If cream is selected, the spine is
   wrong by 0.029 in and the cover must be rebuilt (`PAGES * 0.0025`, one constant in
   `build_cover.py`).
4. **Proof copy before release.** This is the standing $0-budget constraint: a physical proof has a
   cost and has *not* been ordered, so nothing here is claimed to have been checked on paper.
5. **If the interior page count changes, the cover is invalid.** Any edit that alters 116 pages
   changes the spine. The build order is interior → count → `build_cover.py` → `qa_cover.py`.

**What is not claimed:** that this cover has been seen by KDP, that it has been printed, that the
colours are calibrated for a specific press, or that the title is clear of trademarks. It is a
complete, measured, internally verified cover file ready for the KDP upload step.
