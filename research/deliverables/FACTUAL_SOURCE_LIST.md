# FACTUAL SOURCE LIST

Every factual statement in *The Family Records Organizer* traces to one of the sources below.
The book is deliberately thin on facts and heavy on places to write; where it states something as
fact, the source is here. Nothing in the book is an invented statistic, an estimated figure, or a
quotation from another book.

All of these were read during production (Round 9, 2026-11-10) and are free to access. Where a page
had moved or died, that is recorded too — a dead link is a fact about the source, not something to
hide.

---

## 1. Sources cited in the book (page 115, "Sources")

| # | Source | Publisher | What the book takes from it |
|---|---|---|---|
| 1 | *How Social Security Can Help You When a Family Member Dies*, Publication No. 05-10008, July 2026 edition | U.S. Social Security Administration | That a funeral director normally reports the death; the $255 lump-sum death payment for an eligible surviving spouse; the categories of survivor who may be eligible for monthly benefits; that benefits paid for the month of death must be returned; the national number 1-800-772-1213 and TTY 1-800-325-0778 |
| 2 | *Agencies to notify when someone dies* | USAGov | Which organisations must be told, and what each does — SSA (which notifies Medicare), IRS, State Department, state social services, VA, DFAS, OPM, financial institutions |
| 3 | *How to get a certified copy of a death certificate* | USAGov | That only certain family members may obtain a copy; that states release records to the public after a period that varies; that deaths abroad are recorded by a Consular Report of Death Abroad, with up to 20 free certified copies issued at the time of death |
| 4 | *Where to Write for Vital Records* | U.S. Centers for Disease Control and Prevention, NCHS | That birth, death, marriage and divorce records are held by the state or territory where the event occurred, and that the federal government does not issue them |
| 5 | *Taking Control of Your Finances: Help for Surviving Spouses* | Consumer Financial Protection Bureau | The guidance to request ten to twelve certified copies of the death certificate; the list of organisations to notify; that SSA does not pay for the month of death |
| 6 | *When a loved one dies and debt collectors come calling* | Consumer Financial Protection Bureau | That a written dispute within 30 days stops collection contact until the debt is verified; that a personal representative is not personally liable for the deceased's debts; that contact can be limited in writing |
| 7 | Kindle Direct Publishing trim, margin, spine and printing specifications | Amazon KDP | The page size, margin minima, spine-width formula and file requirements used to lay out and check this interior |

## 2. Design and production sources (used to build the file, not stated in the text)

| Source | Taken from it |
|---|---|
| KDP help page *Format Your Paperback Cover* (help id G201953020), read this round | Cover width = bleed + back + spine + front + bleed; cover height = 11.25 in; **black-and-white white-paper spine = page count × 0.002252 in** (cream × 0.0025); spine text permitted only above 79 pages and must stay ≥ 0.0625 in clear of both folds; all cover text ≥ 0.125 in inside trim and ≥ 7 pt; no crop marks, colour bars or template text; 300 dpi minimum; single flattened PDF with fonts embedded |
| KDP printing-cost and royalty tables | Paperback, black ink, large trim (8.5 × 11 qualifies): **$1.00 + $0.017 per page**; 60 % royalty from a $9.99 list price, 50 % below it |
| SIL Open Font License 1.1 (`OFL.txt` shipped with each family) | Permission to embed Lora and Work Sans in a commercial print interior |
| Lora and Work Sans font tables | Ascent, descent and per-glyph widths used to measure every string in the layout |

## 3. Sources consulted but **not** used, and why

| Source | Outcome |
|---|---|
| `consumerfinance.gov/consumer-tools/losing-a-loved-one/` | **404.** Superseded by the two CFPB documents in the table above. |
| `usa.gov/after-death` | **404.** Superseded by `usa.gov/report-a-death`. |
| `consumerfinance.gov/.../losing-a-loved-one-step-by-step/` | **404** (also dead in Round 8). |
| Amazon customer reviews for competing organisers | **Not read.** The review text is behind a sign-in wall. The only numbers used in earlier rounds are the visible aggregate ratings and counts, labelled as such, and no review content is quoted anywhere. |

## 4. Claims the book deliberately does **not** make

These came up during writing and were removed or hedged, and are listed so the omission is
documented rather than accidental:

* **No specific death-certificate count stated as a rule.** The CFPB advises ten to twelve; the
  book repeats that as advice with its source, not as a requirement.
* **No state-specific legal statement.** Every legal or procedural statement that varies by state
  is either attributed or replaced with "ask a professional in your state". There is no list of
  state rules anywhere in the book, because a printed list would be wrong within a year.
* **No figures for probate timing, estate fees, or tax thresholds.** None appeared in the sources
  read, and none is estimated.
* **No benefit amounts other than the $255 lump sum**, which is statutory and stated as such.
* **No medical guidance.** The book records who to contact and where documents are kept; it
  contains no instruction to be acted on clinically, no dosages, and no treatment language. The
  word "medication" appears only as a document name ("medication list").
* **No passwords, PINs, recovery phrases, private keys or authentication codes** are requested
  anywhere. The four fields that come closest ask *where* such a thing is held, *who* holds it, and
  offer fixed checkboxes — never a blank line for a secret.
* **No claim that completing the book creates a will, trust, power of attorney, directive or estate
  plan.** The copyright page, page 12 ("What this can and cannot do"), page 55 ("What needs a
  professional") and page 58 ("If there is no will") each say this in plain words.
* **No claim that the layout makes a perfect-bound book lie flat.** Three statements in the book
  say the opposite.
* **No trademark-clearance claim.** No trademark search was performed for the title, and neither
  the book nor these reports implies one.

## 5. How the compliance sweep works

`research/tools/content_audit.py` extracts the text of the delivered PDF and runs regex families for
banned credential fields, implied legal effect, medical instruction, lay-flat claims and
trademark-clearance claims. The delivered file returns **0 hits in every family**, and the three
uses of "lie flat" are all denials, verified by reading the surrounding sentence in the extracted
text:

1. "It does not lie flat, and the book does not claim that it does." (copyright page)
2. "This is a paperback, and it will not lie flat on a table." (page 101)
3. "…this is a paperback, and a paperback of this thickness does not lie flat." (colophon)
