# REMAINING LIMITATIONS

**The Family Records Organizer — Round 9 delivery**
This is the honest list. Nothing here is a formality; each item is something a buyer or a
publisher could reasonably ask about, and the answer is stated rather than smoothed over.

---

## 1. The book has not been physically proofed

No proof copy was ordered and no printed sheet was examined. The interior was rasterised at
1.2–2× and inspected page by page on a screen, and every geometry number in the QA report comes
from the PDF itself. **A screen is not a press.**

What that leaves open:
* Whether the 7.0 pt reversed-out table headers survive the actual ink and paper as well as they
  read on a monitor. Reversed small type is the highest-risk element in any B&W interior.
* Whether the 0.95 grey wash panels print as a clean tint or as a visible screen pattern on KDP's
  equipment. Tints below about 5 % can drop out entirely; 0.95 is 5 % and sits right at the edge.
  A darker wash (0.93) would be safer if the proof shows dropout.
* Whether the 0.84–0.87 write-on rules are visible enough on cream stock.

A proof copy would be a paid item, and this round's budget was $0, so it was not ordered. This is a
known, deliberate gap, not an oversight.

## 2. No KDP preflight acceptance

The file meets every published KDP requirement that was checked this round — 8.5 × 11 trim, embedded
fonts, no bleed, margins well above the minima, single PDF, no crop marks. But acceptance is KDP's
decision, made by their converter, and it has not been run. No third-party validator was used either
(ghostscript-style preflight was not available in the sandbox, and adding a paid tool was out of
budget).

## 3. The book is US-centric

Every procedural statement is US-specific: Social Security, the State Department, the CDC vital
records directory, USAGov, the CFPB, DFAS and OPM. The layout is built around US Letter-derived
trim (8.5 × 11 in), which is the dominant KDP large-format size but is not a standard UK/EU trim.

A UK edition would need the equivalent of Part 2 rewritten — the notification agencies, the death
registration process, probate and the tell-us-once services are all different — while Parts 3 to 8
would carry over almost unchanged. **No UK/EU edition exists.** Nothing in the book claims to apply
outside the US, and the standfirst on page 17 says the rules differ by country.

## 4. State-level law is deliberately absent

The book says repeatedly that requirements vary by state and directs the reader to a professional.
That is the right editorial decision for a printed book, but it does mean the book cannot answer the
questions people most often ask: does my state require witnesses or a notary, does a spouse inherit
automatically, how long does probate take here.

A reader who wants those answers will be told to ask someone, which is honest but is not the same as
being helped. The alternative — printing a 50-state table — would be wrong within a year and would
be legal advice the book is not qualified to give.

## 5. The "lie flat" problem is real and unsolved

Perfect binding does not lie flat. The book compensates:

* the inside margin is 0.875 in instead of the 0.375 in minimum, so the writing area is pushed away
  from the fold;
* Letters and Notes pages use a 0.44 in / 0.375 in handwriting pitch, which is generous enough to
  write on with the book partly closed;
* page 101 tells the reader plainly that writing on a loose sheet and folding it into the back cover
  is a sensible thing to do.

None of that makes the book lie flat, and the book never says it does. A lay-flat binding (spiral,
wire-o) is **not available on KDP for this trim at all**, so a lay-flat edition would require a
different printer and a different price. That option was not pursued because it would take the book
off KDP.

## 6. Page count sits mid-band, not at a sweet spot

116 pages is inside the 112–120 target with four pages of headroom. It is not, however, at a
particularly meaningful price point: KDP's per-page cost is linear, so 112 pages would save
$0.068 and 120 would cost $0.068 more. The page count was driven by content — every page in the book
answers a subject the earlier pages raise — not by a price target, and it happens to land at 116.

If the book is later expanded, the next natural break is around 128 pages; if trimmed, 112 is
achievable by dropping four of the lower-value pages without touching the core.

## 7. The title has not been trademark-searched

No trademark search was performed. Nothing in the book, the cover brief or these reports claims
that "The Family Records Organizer" is clear for use, and the phrase should be searched before any
money is spent on cover production.

## 8. The cover is a brief, not a finished cover

The deliverable is a **cover production brief** with verified arithmetic (spine 0.2612 in at 116
pages on white paper, cover 17.5112 × 11.25 in). There is also a reference cover PDF built to those
dimensions so the calculations can be checked, but:

* the barcode area is left clear but no real ISBN is assigned;
* no retail typography or cover image has been commissioned;
* the cover PDF is a production reference, not a design a buyer would accept as finished.

## 9. Content that is intentionally generic

A few pages are deliberately non-specific because being specific would be wrong or unsafe:

* **Security questions** describes three approaches and asks the reader which they use. It does not
  list which services currently offer which settings, because that changes constantly.
* **Legacy and next-of-kin settings** asks the reader to find out and record the state of their own
  accounts, rather than printing a table that would be stale at press time.
* **Digital money** asks for an approximate balance, never an address or a key.
* **Organ and tissue donation** states that the rules differ by country and by state and records a
  decision, without telling anyone what the rules are where they live.

This is a considered choice, and it is the main reason the book will still be usable in five years.
It is also the main thing a reader skimming for "answers" might find unsatisfying.

## 10. No accessibility or tagged-PDF support

The file is a print interior. It is untagged: no reading order, no alt text, no language tagging
beyond the document default. A reflowable e-book edition would need to be built separately — the
content would carry over well, but the fixed worksheet grid would not.

## 11. Production environment

The build environment is a sandbox with a throwaway virtual environment. The book can be rebuilt
from the repository at any time by running `python research/tools/build_book.py` after installing
reportlab, pypdf, pypdfium2 and Pillow — all free. **The `/tmp/venv` used in this round is not
persisted**; the source files are, and the build is reproducible from them.

---

## What is *not* on this list

For the avoidance of doubt, these are things the delivery does get right, so they are not
limitations:

* every font is embedded; there is no base-14 fallback anywhere;
* the palette is exactly neutral grey, verified operator by operator;
* every page is inside the trim with 0.625 in of clear paper on the outside edge;
* every cross-reference resolves; the page map was stable across three rebuild passes;
* no page is blank, duplicated or padded, and no worksheet is repeated for filler;
* nothing in the book asks for a password, PIN, recovery phrase, key or code;
* nothing in the book implies that filling it in creates a legal document.
