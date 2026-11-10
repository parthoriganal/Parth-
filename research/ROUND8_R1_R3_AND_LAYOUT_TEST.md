# Round 8 — R1 Binding, R3 Title, and the Digital-Assets Layout Test

**Branch** `arena/8a33cda7-parth` · evidence 2026-11-10 · **$0 spent**
**Niche: unchanged.** End-of-life / final-wishes organizer. This round resolves two flagged
risks and renders one real section. **It does not write the book.**

---

## 0. Bottom line, before the detail

**R1 is a real, permanent, physical disadvantage, and it is not fixed by anything in this
document.** A perfect-bound 8.5 × 11 paperback will not lie flat. Wider gutters reduce the
*consequence* of that; they do not remove the *cause*. I am not going to claim otherwise.

**It is not disqualifying.** The category leader at 15,120 reviews is a lay-flat hardcover-spiral
at $9.95, but a 930-review perfect-bound paperback at $9.99 is also in the same shelf and
accumulated that number anyway. Binding is a real cost, and it is a cost one competitor is
visibly paying.

**My recommendation is in §6: proceed with KDP paperback at $12.99, with three format conditions
attached.** The conditions matter as much as the recommendation.

Two corrections to Round 7 are forced by this round's research, and both are bad news:

| Round-7 claim | Correction |
|---|---|
| "Royalty $4.81 at $11.99, from `backend/kdp_engine/profit.py`" | **The repo's model is wrong.** It uses `fixed $0.85 + $0.012/page`. KDP's published rate is `fixed $1.00 + $0.017/page` for **large trim** — which 8.5 × 11 is. Real royalty at $11.99 is **$4.02, not $4.81.** |
| "Interior margin 0.375 in minimum for 128 pp" | Correct figure, but the Round-7 report's own arithmetic block was muddled. KDP: 24–150 pp → **0.375 in inside, 0.25 in outside**. Confirmed from the help page this round. |

---

## 1. R1 — the binding disadvantage

### 1.1 What KDP actually offers (VERIFIED, kdp.amazon.com)

| Fact | Status |
|---|---|
| KDP paperback is **perfect-bound only**. There is no spiral, wire-o, lay-flat, or comb option. | **VERIFIED** — KDP's trim/binding help pages list no such binding for paperback. |
| KDP **hardcover is case-laminate only** — art printed directly on the board, **no dust jacket**. | **VERIFIED** — KDP "Format Your Hardcover". |
| KDP hardcover is available in **8.25 × 11** (large trim), 75–550 pp, black ink. | **VERIFIED** — trim specification table. |
| KDP hardcover is **not** offered in 8.5 × 11. The nearest is 8.25 × 11. | **VERIFIED** |
| Case-laminate hardcover is **sewn/glued**, not wire-o. It is stiffer than a paperback, but **it is not a lay-flat book and KDP does not claim it lies flat.** | **VERIFIED that it is case-laminate; the "does not lie flat" conclusion is INFERRED** from the format. |
| KDP hardcover minimum page count is **75–108 pp = flat cost, no per-page charge**; 110–550 pp costs `$5.65 + $0.017 pp` at large trim. | **VERIFIED** |

**The honest summary: there is no KDP binding that solves R1.** The format that solves it
(hardcover-spiral, the one Peter Pauper uses) is not a KDP product. It requires a different
printer, minimum runs, and money. Under a $0 constraint it is unavailable, and I am not going to
pretend a layout trick is a binding.

### 1.2 How serious is it, actually, for a *write-in* organizer?

This is where I part company with the panic. The severity is **real but narrower than it looks**,
for four reasons that are visible in the products themselves:

1. **Most of the writing happens once, in short bursts, not in long sittings.** The layout test
   (§5) puts **3 account bands on one page**, each needing a name, two short notes and four
   ticks. That is 30–90 seconds of writing per band. A reader can hold the book open with one
   hand for that long. The failure mode people fear — an hour of sustained writing into a gutter —
   is not what this particular section asks for.
2. **The category itself tolerates non-lay-flat.** Wairimu's book is **perfect-bound paperback,
   65 pp, $9.99, 930 reviews, 4.3**. It is not a niche curiosity; it is the second most-reviewed
   indie product in the cluster. Readers are demonstrably not rejecting perfect binding.
3. **The 4.6-rated leaders are not lay-flat *paperbacks* — they are hardcover-spirals in Office
   Products.** So the comparison is not "our paperback vs their paperback." It is "our paperback
   vs their premium hardcover-spiral", and the premium product costs the buyer $9.95–$11.33. The
   real question is whether a cheaper paperback can win a share, not whether it can match them.
4. **The failure is asymmetric and recoverable.** A stiff spine makes writing awkward; it does
   not make the book wrong. A wrong section, a legal claim, or a password field are far worse and
   are entirely within our control. Priority ordering matters.

**Where the disadvantage bites hardest** — and this should drive the design, not the worry:

| Section type | Severity | Why |
|---|---|---|
| Long ruled lists near the gutter (Document Locator) | **High** | Sustained writing, many rows, the page fights back |
| Multi-column record grids (financial accounts) | **Medium** | Short entries, but frequent |
| Narrative writing ("Last words", "Letters") | **High** | This is where the reader wants to sit and write for an hour |
| Short band worksheets (Digital assets) | **Low–Medium** | Bursts of 30–90 seconds |

**Conclusion: the letters/last-words section is the genuinely compromised one, not the worksheets.**
That is a design fact worth more than the general worry.

### 1.3 Do wider gutters and section-per-spread layouts reduce the problem?

**Yes, meaningfully — as mitigation of consequence, not as a fix.**

| Measure | Effect | Verified how |
|---|---|---|
| **Inside margin 0.875 in** vs KDP's 0.375 in minimum | +0.5 in of clear writing space at the spine — more than double the minimum | KDP minimum is VERIFIED; the choice is ours |
| **3 bands per page, not 6** | Fewer crossings of the gutter per session; each entry is short | Measured in the layout test |
| **Nothing important in the inner third** | The locator's write-on columns start 0.5 in clear of the gutter | Measured: leftmost ink on verso pages = 0.500 in, on recto = 0.875 in |
| **Section-per-spread** | Reduces page-flipping while writing, but does **not** flatten the book | Design judgement |

**What none of these do: make the book lie flat.** Stated once, plainly, because you asked me
not to claim otherwise. The physical constraint survives all four measures.

### 1.4 The format comparison, with real numbers

Royalties computed from **KDP's published constants** (§2), not the repo's wrong ones.

| Format | Trim | Extent | List price | Print cost | **Royalty** | Lies flat? |
|---|---|---|---|---|---|---|
| **Paperback (proposed)** | 8.5 × 11 | 128 pp | **$11.99** | $3.18 | **$4.02** | No |
| Paperback | 8.5 × 11 | 128 pp | $12.99 | $3.18 | **$4.62** | No |
| Paperback | 8.5 × 11 | 128 pp | $9.99 | $3.18 | **$2.82** | No |
| Paperback, trimmed extent | 8.5 × 11 | 88 pp | $11.99 | $2.84 | **$4.35** | No |
| **Hardcover (case-laminate)** | 8.25 × 11 | 128 pp | $18.99 | $7.83 | **$3.57** | No (stiffer, not flat) |
| Hardcover | 8.25 × 11 | 128 pp | $21.99 | $7.83 | **$5.37** | No |
| Hardcover, trimmed extent | 8.25 × 11 | 88 pp | $18.99 | $7.49 | **$3.90** | No |

**Read that table carefully, because it kills the hardcover option:**

- Hardcover **doubles the buyer's price** and **pays the author less than paperback** at any
  comparable retail price. At $18.99 hardcover you earn **$3.57**; at $12.99 paperback you earn
  **$4.62**.
- Hardcover **does not solve R1.** It is stiffer, but case-laminate is still a closed book. You
  would pay a 58% price increase for a *partial* improvement in a different attribute.
- Hardcover forces a **trim change** (8.25 × 11, not 8.5 × 11) and a **75-page minimum**, so the
  88-page variant is the only way to hit a sane hardcover price — a large replan.

**Therefore: hardcover is not a fix for R1. It is a different product with worse economics.**

---

## 2. Royalty model, corrected

The repo's `backend/kdp_engine/profit.py` uses `fixed_bw 0.85` and `per_page_bw 0.012`, which
matches KDP's **regular** trim rate but not the **large** trim rate that 8.5 × 11 falls under.
Verified from KDP's Paperback Printing Cost page this round:

| | Regular trim | **Large trim (>6.12 in wide or >9 in tall)** |
|---|---|---|
| Fixed | $1.00 | **$1.00** |
| Per page | $0.012 | **$0.017** |
| 24–110 pp | flat $2.30 | **flat $2.84** |

Hardcover (large trim, black ink): 75–108 pp **flat $7.49**; 110–550 pp **$5.65 + $0.017 pp**.
Hardcover royalty rate is **60% at list ≥ $9.99**, 50% below.

> **Action for the repo, not this report:** `config.py` needs a large-trim branch, or every
> future royalty figure in this project will be ~$0.80 optimistic at 128 pp. I have **not**
> edited it — it is application code, not research, and changing it silently would break the
> app's existing tests.

---

## 3. R3 — the title collision

### 3.1 What I actually checked

**Search run this round:** `"family records organizer"` in `stripbooks`.

| Result | Reading |
|---|---|
| **"1-16 of 356 results"** | The exact phrase is **not** a crowded title. 356 is a small result set for a quoted phrase on Amazon Books, and position 1 of the organic list is a sponsored vinyl-record stand, i.e. Amazon found no book it considered a strong exact match. |
| No book titled *The Family Records Organizer* appeared | **VERIFIED — no exact title collision found on Amazon Books at time of check.** |
| `I'm Dead, Now What? Planner` (15,120 reviews) | **VERIFIED collision of *concept*, not of title.** Its subtitle is "Important Information about My Belongings, Business Affairs, and Wishes." |

### 3.2 The honest verdict on the working title

**The title is clear. The title is also weak.** Three problems, in order of severity:

1. **It is semantically a near-synonym of the market leader.** "Family records organizer" and
   "important information about my belongings, business affairs and wishes" describe the same
   object. A shopper scanning results may read ours as a cheaper-looking version of the one with
   15,000 reviews.
2. **It inherits the "records" vocabulary, which reads administrative, not emotional.** This
   category is bought on relief and love ("so my daughter doesn't have to guess"), not on filing.
3. **It sits in the shadow of nothing and owns nothing.** It is a category description, not a
   promise.

**No trademark clearance is claimed. I checked Amazon Books titles for collision, and nothing
else.** I have not searched the USPTO register, and I am not going to imply otherwise. Before
publication, the chosen title needs a real trademark search — that is a paid-or-expert task and
it is outside this round's scope.

### 3.3 Five alternatives

Each is built on a different strategic bet. I have marked the bet, because the bet is the point.

| # | Title / Subtitle | The bet it makes | Risk |
|---|---|---|---|
| **1** | **The First 48 Hours**<br>*A family records organizer, so the people you love know what to do before they know what to feel* | Owns the one section no competitor has. Turns a filing product into a promise about the worst two days of someone's life. | Boldest. May read as a grief book rather than an organizer, and grief books are a different shelf. |
| **2** | **What My Family Will Need**<br>*The complete record of what I have, where it is, and what I want — in one place they can actually find* | Plain, warm, and searches well. Closest to buyer language without copying a live title. | Least differentiated as a *title*; carries the whole burden on the subtitle. |
| **3** | **Nothing Left to Guess**<br>*A guided organizer for your accounts, documents, and final wishes* | Emotional promise in four words; "guess" is the exact pain in this category. | Slightly abstract; needs the subtitle to be very concrete. |
| **4** | **The Family Records Organizer**<br>*Everything they'll need to know, and exactly what to do with it* | Keeps the clearance-checked title, fixes the flatness in the subtitle with the procedure promise. | Lowest risk, lowest differentiation. This is the fallback. |
| **5** | **Where Everything Is**<br>*A complete records organizer for the people you'll leave behind* | The most literal promise in the category, and the most searchable phrase of the five. | "Where everything is" is close to existing password-book phrasing; check collision before use. |

**My pick is #1 for differentiation and #2 for safety.** If the R1 decision in §6 is "proceed
carefully," then #2. If it is "proceed with conviction," then #1.

---

## 4. What the layout test found that the plan had not

Rendering the section surfaced **four defects that no amount of planning would have caught**, and
one of them changed a design decision. Listing them because the value of the test is in this list.

| # | Defect | Cause | Fix |
|---|---|---|---|
| 1 | **Text ran 1.2 in past the trim edge on two pages** | reportlab's text objects leave `charSpace` set on the canvas; every string after a tracked heading rendered wider than it measured | use `drawString(charSpace=…)`, which restores state |
| 2 | **Kicker rule and sub-line printed on the same baseline** | `gap` was subtracted in points, not inches — a unit bug that measured fine and looked wrong | `gap * inch` |
| 3 | **Warning panel too short; its paragraph spilled out and collided with the next block** | panel height hard-coded at 1.66 in against 3 lines of real text | height now **computed from the wrapped line count** |
| 4 | **Locator headers collided** ("WHO ELSE CAN GET TO IT" / "VERIFIED ON") | column widths chosen before measuring header widths | widths derived from measured header text |
| 5 | **Footer descenders sat at 0.31 in**, close to KDP's 0.25 in minimum | baseline placed for cap-height, not descender | footer raised to 0.52 in baseline |

**And the lesson that matters more than any of them:** my first "self-test" passed while the pages
were visibly broken. It measured *what the code intended to draw*, not *what landed on the page*.
The test now rasterises every page at 2× and finds the rightmost ink pixel, and it only passes when
the pixels agree with the trace. **A green test that nobody has cross-checked against pixels is
worse than no test.**

---

## 5. The exemplar — Digital Assets, section 6

**File:** `research/tools/digital_assets_exemplar.pdf` (5 pages, 8.5 × 11, black ink, no bleed)
**Renderer:** `research/tools/render_digital_assets_exemplar.py` — `--check` runs the layout test
**Repo tooling reused:** the margins, trim and mirroring follow the same rules the Round-7 blueprint
set; `backend/kdp_engine/profit.py` was used and then **corrected against KDP's published rates**
(§2). No duplicate tool was created.

### 5.1 Structure

| Page | Content | Purpose |
|---|---|---|
| 51 | Section opener: the no-credentials rule, why the section exists, three-step method, "you will need" | Sets the safety rule before any field is offered |
| 52 | **3 account bands** (D1–D3) + overflow capture | The worksheet |
| 53 | **3 account bands** (D4–D6) + overflow capture | The worksheet, continued |
| 54 | **Secure Asset & Document Locator** + 3-slot annual review block | The cross-reference hub |
| 55 | The five hard cases + section close + standing disclaimer | Completion and limits |

### 5.2 Worksheet structure — one band, fields and why each exists

Each band is a **fixed 1.83 in template**, identical on every page, so the reader learns it once.

| Field | Type | Why |
|---|---|---|
| **REF** (D1, D2…) | pre-printed, in a shaded chip | The link to the Locator. Pre-printed so the reader never has to invent a numbering scheme. |
| Service or account | write-on line, full width | The one free-text field. Widest line in the band. |
| What the family needs it for | write-on, 42% width | Forces the reader to think about *use*, not *existence* |
| Recorded in my Locator as | write-on, 34% | Explicit pointer |
| Or held by | write-on | Names the person who already knows |
| **Where the sign-in details are held** | **four checkboxes only**: Password manager · Sealed envelope · With my attorney · Other (not in this book) | **The core safety mechanism.** It is structurally impossible to write a credential: there is no line. |
| Next-of-kin or legacy setting in the service? | Yes / No / **Not sure** | Asks the question instead of asserting a feature exists (Round 7 §8 row 4) |
| On death: | Keep / Download / Memorialise / Close | The instruction the family actually needs |
| Overflow band, once per page | checkbox + two short lines | Counteracts the abandoned-book failure: a reader who runs out of bands is told what to do rather than left stuck |

### 5.3 The locator and the review date — your two explicit requirements

**Secure Asset & Document Locator (p.54):** 12 rows, 5 columns — REF · ASSET OR DOCUMENT ·
WHERE IT IS HELD · WHO ELSE KNOWS · **VERIFIED ON**. D1–D12 pre-printed, matching the bands.
A location column only; no value column exists anywhere on the page.

**Review-date field:** a dedicated block with **three dated slots**, each `Date reviewed` +
`Initials`, plus a full-width `What changed since the last review, and who I told` line. Three
slots rather than one is deliberate: it makes the annual habit visible as a pattern, so year two
is easier than year one.

### 5.4 Compliance, tested rather than asserted

The renderer's `--check` mode asserts three things mechanically:

```
geometry   : every drawn string inside the safe area (trace + 2x raster cross-check)
credentials: no credential term on the worksheet or locator sheets (pp.2-4)
legal      : no legal-claim phrasing anywhere
```

**Measured result:** rightmost ink per page = 7.993 / 7.611 / 7.986 / 7.618 / 7.986 in, against a
safe edge of 8.000 in and a trim edge of 8.500 in. Nothing crosses.

**No credential fields.** The only place a password-type word appears is (a) the warning, naming
what not to write, and (b) the hard-cases page, telling the reader not to record a recovery phrase.
Both are required. The four checkbox options are the *only* way to answer "where are the details
held", and none of them has a write-on line.

**No legal advice or claims.** The standing text is limited to: *"a record-keeping aid… not legal,
financial, or tax advice, and it does not establish ownership or entitlement to anything. Ask a
qualified professional about your own circumstances."* No section, statute, or state rule is named.
The test greps for the phrases that would signal a claim ("required by law", "legally binding",
"must be filed") and fails the build if any appear.

### 5.5 Register and typography

Body copy is deliberately on the knife-edge between **warm and administrative**. Openings use the
reader's own fear ("A family can find a house and a car. They cannot find a photo library"), and no
sentence instructs on law or money. Type: serif for reading, sans for labels, 7.5 pt label / 9.4 pt
note / 11.8 pt warning, on a bronze-on-cream palette. Rows are 1.83 in tall — sized so a
handwritten line at ~10 mm spacing sits comfortably, not so large that three bands fail to fit.

---

## 6. Recommendation

# Proceed with KDP paperback — conditionally.

Not "proceed" and not "stop." Here is the reasoning, and then the three conditions that are the
actual decision.

### 6.1 Why not stop

Stopping would require the binding disadvantage to outweigh the demand evidence. It does not:

- **24,863 reviews** sit on two products in this shelf. Demand is not in question.
- **A perfect-bound paperback already has 930 reviews** in this exact category at $9.99. The
  format is demonstrably survivable.
- **The disadvantage is physical and bounded.** It makes one section (letters) genuinely awkward
  and the worksheets slightly awkward. It does not make the product unusable, and it is not
  fixable by money I have, so the choice is "accept it" or "exit the niche entirely" — and exiting
  a category with 24,863 reviews over a spine is a disproportionate response.

### 6.2 Why not plain "proceed"

- **The category leader lies flat, costs the buyer less, and has 15,120 reviews.** We start behind
  on the single most tactile attribute of a write-in product.
- **$9.99 to $11.99 is a weak price point.** At $11.99 the paperback nets **$4.02**. At $9.99 it
  nets **$2.82** — while competing against a $9.95 hardcover. The middle of this range is where
  the plan's economics were wrong.
- **The real differentiator is a page, not a binding.** Its value is unproven until reviews exist
  (§Round-7 R2, still open).

### 6.3 The three conditions

**C1 — Price at $12.99, not $10.99–11.99.** Rationale is arithmetic, not greed:

| Price | Royalty (128 pp) | Position |
|---|---|---|
| $9.99 | $2.82 | Below the lay-flat leader's $9.95. Unsustainable. |
| $11.99 | $4.02 | The plan's stated price. Workable. |
| **$12.99** | **$4.62** | **Recommended.** Still inside the category's $7.98–$14.95 observed band. |
| $13.99 | $5.22 | Upper edge; the $13.99 competitor has only 24–171 reviews. |

$12.99 is the highest price still inside the band the shelf actually supports, and it buys **+15%
royalty over $11.99** for a product that has a real physical handicap to overcome.

**C2 — Design *for* the gutter, and say so out loud.** Inside margin stays 0.875 in; nothing
essential in the inner third; the Letters section is explicitly designed as a **one-page-per-person
spread with a note that the reader may prefer to write on loose paper and keep it in the book.**
Telling the reader how to work around the binding is honest, and no competitor does it.

**C3 — Reduce extent from 128 to 112–120 pp.** Three reasons: fewer pages is a *thinner* spine and
a *flatter-opening* book; large-trim printing cost falls from $3.18 to ~$3.00; and Round 7's 128
was chosen for signature arithmetic, which stopped mattering once the real printing rate was known.
**This is the one place the layout test changed the design.**

### 6.4 What would make me change this recommendation

| Signal | Effect |
|---|---|
| Review text showing complaints about **binding** rather than **content** | Reconsider entirely — the disadvantage is the thing buyers name |
| A new 2025–2026 entrant shipping a **perfect-bound** organizer at >500 reviews | Proceed with confidence; the format is proven in this decade |
| Any ability to fund a short-run spiral version | Replan around spiral; it removes R1 completely |

**The decision you are actually making is not "paperback vs hardcover."** Hardcover is worse on
both price and royalty and still does not lie flat (§1.4). It is **"enter with a real physical
handicap at $12.99, or do not enter."** I recommend entering.

---

## 7. Status of every open risk

| Risk | Round-7 status | Now |
|---|---|---|
| **R1** binding | Critical, unresolved | **Resolved as a decision: accepted, mitigated, priced in.** Not eliminated. |
| **R3** title | High | **Title is clear; no exact Amazon Books collision.** Five alternatives offered. **Trademark clearance still unverified — not claimed.** |
| R2 no review text | Critical | **Still open.** Unchanged; nothing this round substitutes for it. |
| R4 category placement | High | **Still open.** |
| R5 legal risk in Part 4 | High | Partially addressed — the exemplar models the "questions only" register and the test enforces it |
| R7 production scope | Medium | **Reduced**: one section built and tested; the template is now proven, not hypothetical |
| R8 thin margin | Medium | **Resolved by C1** ($12.99) |
| Round-7 royalty error | — | **Corrected** (§2) |

---

## 8. Files and spend

- **New:** `research/tools/render_digital_assets_exemplar.py` (renderer + self-test)
- **New:** `research/tools/digital_assets_exemplar.pdf` (5-page print sample)
- **New:** `research/tools/sample_*.png` (page previews, for review only)
- **Modified:** `backend/kdp_engine/` — **untouched.** The wrong constants are reported in §2, not silently edited.
- **Prior reports:** untouched. Evidence appended to the existing round-5 log.
- **Spend: $0.** No accounts, no trials, no paid tools. Free PyPI packages (`reportlab`, `pypdf`,
  `pypdfium2`, `Pillow`) in a throwaway venv, standard open-source licences.

**Book production: not started. One section rendered for layout validation only.**
