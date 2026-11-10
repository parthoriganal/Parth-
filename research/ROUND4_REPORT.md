# Round 4 — Deep Feasibility & Competition Validation: Sourdough Discard Cookbook
### Amazon US · branch `arena/8a33cda7-parth` · captures 2026-11-10 UTC
### Budget: **$0** · Book production: **NOT started**

> New files: `raw/EVIDENCE_LOG_ROUND4.md`, `data/round4_competitors.csv`,
> `data/round4_directions.csv`, `tools/recipe_test_ledger.py`.
> Rounds 1–3 unmodified.

---

## 0. Verdict up front

> # B — PROMISING BUT TOO DIFFICULT FOR A $0 PRODUCTION BUDGET
> ### *and* the market structure that justified Round 3's interest does not survive contact with the actual competitor set.

Round 3 flagged sourdough discard as "the thinnest supply I've found" (982 results) and therefore
interesting. Having now read the actual listings, **the 982 number is misleading in a specific,
documentable way**, and the real barrier turns out to be recipe testing, not market size.

Three findings drive the verdict:

1. **The market is already occupied by purpose-built series publishers, not by hobbyists.** A single
   publisher (Mindful Meals Publishing) has a two-book *Sourdough Cookbook Collection* on this exact
   shelf, is **buying sponsored ads**, and has already shipped **every one of the five directions you
   proposed** — as chapter headings, in one book.
2. **Reviews prove the genre sells but also show the quality ceiling is low.** The category's
   established seller has **3.9 stars — the weakest rating in any niche measured in four rounds**
   (compare 4.7–4.9 for caregiver logs). Somebody is already selling to this demand and disappointing
   buyers.
3. **Producing a competitive entry requires roughly 100 kitchen-tested recipes.** That cannot be done
   at $0 — not because of tooling (the tooling is genuinely free), but because recipe testing consumes
   ingredients, oven time and weeks of calendar.

**There is also one genuinely open direction** (§7.3), but it cannot be validated without buying
ingredients, which I cannot do.

---

## 1. What "982 results" actually means

Round 3 treated the SERP count as a supply measure. Reading the listings shows why that was too generous.

`/s?k=sourdough+discard+recipes&i=stripbooks` → **992 results**; `sourdough+discard+cookbook` → **982**.
The first page is not 24 independent authors. It is:

- **Sponsored** (top slot): *Sourdough Discard Recipes Cookbook: From Discard to Delight* — Mindful Meals Publishing
- **Sponsored** (inline): *Artisan Sourdough at Home* — same publisher's roster
- Inline sponsored block from **"Leanna Yarson"** ("Artisan bread baking books")
- Organic #1: *Sourdough Every Day* — a **trade** cookbook, 4.5 / 1,000+ / $19.00, Editors' pick

So the "thin" 982-title market has a **trade publisher at #1, an ads-buying series publisher at #1
sponsored, and at least one more ad slot**. The count is thin; the *front page* is not.

**Autocomplete is far thinner than the count suggests.** Only ONE phrase has a book-index suggestion:

| Phrase | Result |
|---|---|
| `sourdough discard` | `sourdough discard recipes cookbook` |
| `sourdough discard recipes` | `sourdough discard recipes cookbook` |
| `sourdough discard breakfast` | **EMPTY** |
| `sourdough discard savory` | **EMPTY** |
| `sourdough discard quick` | **EMPTY** |
| `sourdough discard for beginners` | **EMPTY** |

**All five proposed directions return zero autocomplete suggestions.** Amazon's book index knows
exactly one buyer phrase in this niche: `sourdough discard recipes cookbook`. Everything else is
seller vocabulary — the same trap round 2 found with `elderly care planner`.

---

## 2. The real competitor set

Measured from listing pages (`data/round4_competitors.csv`).

| Title | Author / Publisher | Price | Pages | Pub date | Reviews | Rating |
|---|---|---|---|---|---|---|
| **Sourdough Discard Recipes Cookbook: From Discard to Delight** — "Zero-Waste… 115+ Full-Color Recipes" (*Sourdough Cookbook Collection* #1) | Mindful Meals Publishing | **$18.95** | 90 | **Mar 13 2025** | none visible | none |
| **The Ultimate Sourdough Discard Book** — advanced techniques, unconventional uses (*Collection* #2) | Mindful Meals Publishing | **$5.99** | 102 | Mar 12 2025 | none visible | none |
| **Sourdough Discard Recipes Cookbook** — "100+ quick and easy… everyday baking" | Rebecca Baker | **$9.99** | 110 | **Aug 7 2024** | **28** | **3.9 ★** |
| **Sourdough Every Day** — active + discard starter | Hannah Dela Cruz (trade) | $19.00 | — | — | **1,000+** | 4.5 ★ |
| Artisan Sourdough at Home (*Artisan Baking Collection*) | Leanna Yarson | $16.98 | — | — | 59 | 4.0 ★ |
| The Perfect Loaf | (trade, Maurizio Leo) | $21.64 | — | — | — | — |
| Sourdough Cookbook for Beginners | (trade) | $11.87 | — | — | — | — |

**Structural observations, each with a consequence:**

- **Price ladder is set: $5.99 / $9.99 / $11.87 / $18.95 / $19–21.** A new KDP entry lands in a
  band already occupied at every rung.
- **Mindful Meals Publishing is a *series* operation.** Two books, published **one day apart**
  (Mar 12 and 13, 2025), cross-promoted inside each other's listings ("an exclusive offer on another
  book"), one full-price at $18.95 and one at $5.99. That is a funnel, not two independent books.
- **They are buying ads** for this exact shelf.
- **Page counts cluster at 90–110 pp, 8.5 × 11.** A competitive entry is ~90–115 pages of recipes.
- **Neither Mindful Meals book shows a visible review count** in the captures — worth flagging as an
  inference limit, not a zero.

---

## 3. Customer complaints and missing features — a method limitation, stated honestly

**I could not read review text.** `/product-reviews` redirects to sign-in, and this has been true in
every round. I did **not** bypass it, and I did **not** fabricate complaints.

What I can report is the strongest available proxy:

**3.9 stars on 28 reviews (Rebecca Baker, Aug 2024).** In four rounds of measurement nothing else has
scored below 4.2 in a mature niche — caregiver logs sit at 4.4–4.9, the dementia activity book at 4.6,
sourdough trade books at 4.5. A 3.9 on the *established* indie entry is a real, measured signal that
buyers are disappointed. I can state the fact; I cannot state *what* disappointed them.

**Inferring the likely gaps from the listings themselves — labelled INFERRED, not measured:**

| Likely gap | Basis | Confidence |
|---|---|---|
| Recipes don't work as written | 3.9 rating; no test claim visible; 110pp/100+ recipes = ~1 page per recipe | Medium |
| No weight measurements | Competitors describe cups; baking forums consistently fault volume-only recipes | Low–Medium |
| No photos / poor photos | $9.99 at 110pp cannot carry full-colour printing; claims of "115+ Full-Color" sit at $18.95 | Medium |
| Discard-vs-starter confusion | Rebecca Baker's blurb spends a paragraph on "understanding the unique properties"; Mindful Meals adds meal plans "for 1, 2 or 3 cups daily" | Medium |
| Bulk-quantity problem unsolved | Nobody tells you what to do with a *large* accumulation | **Inferred only — unverified** |

That last row is my hypothesis for the one open direction, and I have not verified it.

---

## 4. Evergreen or trend? — honestly undetermined

**Evidence for evergreen:** maintaining a starter is a skill with a real barrier; discard is generated
*continuously by anyone who keeps one*, so demand is structurally coupled to the practice rather than
to fashion. The market's #1 trade book has 1,000+ reviews, implying years of accumulated sales.

**Evidence for trend risk:** sourdough starter culture exploded during 2020. Both serious indie
entrants published in **2024–2025**, i.e. late — consistent with either a durable market or a decaying
one being farmed. **I cannot distinguish these**, because Google Trends returns 429 to this
environment (rounds 1 and 4) and I will not guess.

**Status: INFERRED evergreen, with a live 2020-cohort decay risk. Rule 2 is not verified.**

---

## 5. Saturation — nuanced, and worse than round 3 implied

- **Not saturated in raw count** (982–992 vs 20,000+ for caregiver logs).
- **Saturated at the front page**: trade publisher at organic #1, series publisher at sponsored #1,
  a third ad slot worth of sponsored placements, and the *only* autocomplete-confirmed phrase already
  the exact title of two competing books.
- **Saturated in concept**: the five directions proposed for this round are **chapter headings** in a
  book published 20 months ago.

**Answer: the market is small and crowded rather than large and crowded.** That is a worse position
than round 3 assumed — there is less room to hide in a thin market with a well-funded front page.

---

## 6. The five proposed directions — evaluated

Scored in `data/round4_directions.csv`. Competition / differentiation / customer value / production
difficulty are **analyst rubric judgements**; the autocomplete and competitor facts behind them are measured.

| Direction | Autocomplete | Already shipped by | Differentiation available | Production difficulty | Verdict |
|---|---|---|---|---|---|
| **Beginner-friendly** | **EMPTY** | Mindful Meals ("Theoretical Part", "meal plans for 1/2/3 cups"); plus a dedicated trade *Sourdough Cookbook for Beginners* at $11.87 | **Very low** — 3 incumbents | Medium | **Reject** |
| **Quick recipes** | **EMPTY** | Mindful Meals literally has a **"QUICK & EASY 20-MINUTE RECIPES"** chapter; Rebecca Baker's title is "100+ quick and easy" | **None** | Low–Medium | **Reject — fully commoditised** |
| **Savory** | **EMPTY** | Mindful Meals: "PIZZA AND SAVORY CASSEROLES", "MAIN DISHES", "APPETIZERS AND SNACKS"; Baker: crusted chicken, casseroles | Low | Medium | **Reject** |
| **Zero-waste** | **EMPTY** (as a phrase; the concept is in the #1 book's *subtitle*) | Mindful Meals: **"Your Everyday Zero-Waste Baking Approach"** | Low | Low | **Reject** |
| **Breakfast & baking** | **EMPTY** | Mindful Meals: "BREAKFASTS" chapter + "BREAD AND BAKED GOODS"; Baker: pancakes, French toast, biscotti | Low | Medium | **Reject** |

**All five directions are occupied.** The fifth-place finding is the important one: the competitor did
not just cover these topics, it used them as the exact chapter taxonomy a new book would use.

---

## 7. What would actually be different

**7.1 Differentiators that are real but cost money**

| Idea | Why it would work | Cost barrier |
|---|---|---|
| **Weights in grams alongside cups** | Removes the single most common cause of failed baking; nearly free to *write* | Needs a kitchen scale (~$15–25) to verify — **not $0** |
| **Every recipe tested, with a stated protocol** | Directly attacks the 3.9-star incumbent's weakness | The core $0 problem (§8) |
| **Photography** | The $18.95 competitor sells partly on "115+ Full-Color"; the $9.99 one can't | Camera + props + printing cost; **not $0** |
| **Bulk-discard system** (what to do with 500 g, not 1 cup) | Genuinely unaddressed in any listing I read | Needs testing, not just writing |

**7.2 Differentiators that are free and genuinely available**

- **A rigorous, honest testing protocol published in the front matter**, with a real count of tests and
  a date. No competitor in this set claims this. It is the one advantage a careful first-time author
  has over a series publisher shipping two books in two days — *if the testing actually happens.*
- **Troubleshooting keyed to failure modes** (why flat, why dense, why gummy) rather than a generic tips
  page. Baker advertises a troubleshooting section; it evidently did not save the rating.
- **Honest scope**: ~40 tested recipes beats 115 untested ones, and is the only version producible at $0.

**7.3 The one genuinely open direction: the bulk-discard / discard-management angle**
Every listing assumes you have a cup or two. None addresses the person whose starter produces far more
than they bake — the actual zero-waste problem. That is a real gap. **I have not verified it** (no
review text), and validating it requires cooking, i.e. buying flour. **Unvalidated hypothesis.**

---

## 8. Can a high-quality cookbook be produced without personally testing recipes?

**No — not honestly, and not competitively.** This is the crux of the verdict.

A cookbook's only real product is "this works in your kitchen". Untested recipes are the failure mode
the 3.9-star incumbent most likely represents. Publishing untested recipes is also exactly the kind of
fabrication this project has refused at every earlier step; a cookbook that *claims* testing it never
did is worse than one that stays silent.

**Crucially, the blocker is not tools — the tools are free (§9).** It is the physical cost of testing:

| Cost of testing ~100 recipes | Amount | Free alternative? |
|---|---|---|
| Flour | ~20–40 kg across the project | **None** |
| Butter / oil / sugar / dairy / eggs | Ongoing | **None** |
| Oven + electricity/gas, ~100 sessions | Real | **None** |
| Calendar time (bake, cool, note, revise, retest) | 8–16 weeks part-time | **None** |
| Kitchen scale for gram accuracy | ~$15–25 | **None** (a differentiating feature depends on it) |

**You can write a sourdough discard cookbook at $0. You cannot *validate* one at $0.** Since Round 4's
question is whether a *high-quality* cookbook is realistically producible, the answer is no — the
honest ceiling at $0 is a well-written, clearly-labelled **untested** collection, which would enter a
market whose established seller is already rated 3.9.

**A note on a genuinely free middle path**, offered because it is honest rather than because it
rescues the niche: a *small* number of recipes can be tested almost free if flour is already a
household staple and testing is folded into normal cooking. That does not scale to 100 recipes, but it
does scale to ~15–20 — which is a **booklet or a narrow single-subject book**, not a $9.99–18.95
competitor. I have not costed this and it is not a recommendation.

---

## 9. What needs kitchen testing vs what can be reliably researched

This is the most transferable output of the round.

| Reliably researchable at $0 | Must be kitchen-tested |
|---|---|
| Technique explanation (what discard is, hydration, gluten) | **Every ingredient proportion** |
| Food-safety guidance (USDA/FDA published) | **Every time and temperature** |
| Unit conversions, cup↔gram tables (published standards) | Every pan size ↔ yield relationship |
| History, terminology, equipment descriptions | Whether a recipe actually tastes good |
| Troubleshooting *causes* (from established baking science) | That a substitution works |
| Structure, chapter design, indexing | Proofing/bulk behaviour of a specific dough |
| Recipe *categories* and naming | The claim "115 recipes" being true |

**Rule of thumb:** anything with a number attached to an ingredient, a time or a temperature is a
kitchen claim. Anything explanatory is a research claim. A book built only from the right-hand column
is not a cookbook.

**This distinction is now enforced in code.** `tools/recipe_test_ledger.py` refuses to certify a
manuscript unless every recipe marked `requires_kitchen_test=true` carries a `test_date`, a named
`taster` and a `result` — and it blocks `result=failed`, future-dated tests, non-ISO dates, duplicate
IDs and any test claimed without a date. **9/9 self-tests pass.** It cannot make a recipe work; it can
stop an untested one from being called tested.

---

## 10. Free open-source tooling audit

All verified against the GitHub API and PyPI on 2026-11-10.

| Tool | ★ / version | Licence | Use in this project | Verdict |
|---|---|---|---|---|
| **reportlab** | v5.1.0 | BSD | Programmatic PDF (recipe cards, KDP interior) | **Usable** |
| **WeasyPrint** | 9,779★ / v70.0 | BSD-3 | HTML+CSS → print-quality PDF; best control over KDP trim/bleed | **Usable — best fit** |
| **textstat** | v0.7.13 | MIT | Readability of instructions (are steps written for beginners?) | **Usable** |
| **LanguageTool** (`language_tool_python` v3.4.0) | 15,243★ | **LGPL-2.1** | Grammar/style; self-hosted. **LGPL — check obligations before bundling** | Usable, licence caveat |
| **Vale** (`errata-ai/vale`) | — | — | Prose linter for consistent style/terminology | Usable (repo lookup redirected; licence **not confirmed**) |
| **recipe-scrapers** | 2,265★ / v15.13.0 | MIT | Parse recipe schema from public recipe sites — **research/competitive scanning only** | Usable for research; **respect site terms and robots.txt** |
| **pint** | 2,826★ / v0.26.2 | NOASSERTION (BSD-family) | Unit/quantity arithmetic for cup↔gram consistency checks | Usable; licence metadata ambiguous |
| **openfoodfacts-python** | 476★ | NOASSERTION (ODbL data) | Nutrition data **if** nutrition panels are wanted | Usable, but see caveat |

**Nutrition-label caution.** Do not compute nutrition figures from an LLM. If a nutrition panel is
included, derive it from a real dataset (Open Food Facts, USDA FoodData Central) and note that baked-goods
values depend on the *actual* flour and hydration used — which means it is a kitchen measurement again.
**Simplest safe choice: omit nutrition panels.** They are not standard in this category's listings.

**Other free supports:** Jupyter/pandas for recipe databases; `matplotlib` for yield/scale charts;
`Pillow` for image prep; `pypdf` for assembling sections. All free, all sufficient. **No tool in this
list costs money, and none of them solves the testing problem.**

---

## 11. Verdict

> ### B — PROMISING BUT TOO DIFFICULT FOR A $0 PRODUCTION BUDGET

| Test | Result |
|---|---|
| Real Amazon paperback market exists | **Yes, measured** — 982–992 titles, active ads, trade publisher at #1 |
| Demand proven | **Yes** — 1,000+ reviews on the trade book; 28 on the indie incumbent |
| Buyer language confirmed | **Thin** — exactly one autocomplete phrase; all five proposed directions zero |
| Room for a new entrant | **Poor** — every direction already shipped by a series publisher buying ads |
| Differentiation achievable | **Yes, but only with testing and a scale** — neither is $0 |
| Producible at $0 | **No** — ~100 recipes require ingredients, oven time and weeks |

**Why B and not C:** the demand is real and measured, and the genre's quality ceiling is demonstrably
low — a careful author could beat 3.9 stars. That is a genuine opening.

**Why not A:** producing the book that *wins* that opening requires kitchen testing this budget cannot
fund, and the concepts are already taken by an ad-buying series publisher.

**The line I will not cross:** I am not going to write 115 recipes I cannot test and describe them as
a cookbook. That is the same fabrication the previous three rounds refused, wearing an apron.

---

## 12. Return to niche discovery?

**Yes — but with a sharpened filter, which is the real value of this round.**

Sourdough discard fails on **production cost**, not on demand. That suggests a filter for round 5:

> Prefer niches where the product's value is **research and structure** rather than **validated
> physical procedure**. Cookbooks, workbooks requiring clinical expertise, and anything needing
> photography all fail the $0 test. Reference, organisational, and structured-knowledge products
> pass it.

Applied to round 3's shortlist, that filter immediately re-ranks the top three:

- **Sourdough discard** — fails (kitchen validation)
- **Dementia activity book** — fails the same way (every activity needs testing with a person living
  with dementia; producing untested "dignified activities" is precisely the failure mode)
- **Caregiver daily log / organizer** — **passes the production filter cleanly** (forms and structure
  need no physical validation), but remains the weakest on moat. Its problem is competition, not
  feasibility — the mirror image of sourdough.

**Recommendation for round 5:** search specifically for niches where *both* hold — demand provable
from rank/velocity **and** a product whose correctness is documentary rather than physical. Do not
reopen sourdough discard unless the budget for ingredients changes.

---

### Evidence files
- `research/raw/EVIDENCE_LOG_ROUND4.md` — every capture, verbatim
- `research/data/round4_competitors.csv`, `research/data/round4_directions.csv`
- `research/tools/recipe_test_ledger.py` — 9/9 self-tests passing
