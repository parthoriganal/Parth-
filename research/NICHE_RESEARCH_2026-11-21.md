# KDP Ebook Niche Research — Autonomous Run

> ## ⚠️ SUPERSEDED — round-1 recommendation FAILED adversarial validation (2026-11-21)
> The winner below was **rejected** after review-velocity testing showed its market has
> **0.12–0.28 ratings/month** (no buyers), 773 cumulative ratings among hidden incumbents,
> and **no long-tail** to build a series on. **Do not act on this recommendation.**
> See **`research/ADVERSARIAL_VALIDATION.md`** for the verdict, the corrected ranking,
> and an explicit list of the errors made here.

**Date:** 2026-11-21 · **Marketplace:** amazon.com (US) · **Department:** Kindle (`i=digital-text`)
**Constraint:** organic sales only — no ads, no audience, no social, no external marketing.
**Tooling:** this repo's own engine (`backend/kdp_engine/` — `scorer.py`, `bsr_model.py`, autocomplete port of `rxpelle/kdp-scout`).

---

## 1. Verdict

> ## ✅ ONE WINNER: **Peripheral neuropathy self-management for adults 50+**
> **Working position:** a practical *guide* — nerve-pain relief + nerve-healthy eating + daily symptom management — written for people who already have the diagnosis and are not being given a plan by their doctor.

**Confidence: moderate-to-good on niche structure. LOW on absolute sales volume — because nobody outside Amazon can measure that.**

I am **not** reporting "no verified winner," because on every signal I could actually measure, this niche beat the alternatives — including one the user already sells in. But I am explicitly **not** claiming "validated": I could not verify units sold, BSR, or search volume for any title. Section 7 defines the exact go/no-go test that converts this from *best candidate* into *verified*.

---

## 2. What the 3 sales actually tell us (and what they don't)

| | Calming Menopause Anxiety | Knife Sharpening Logbook |
|---|---|---|
| Units | 1 | 2 |
| Format | Prose guide, emotional outcome | Structured tracker, mechanical task |
| Implied buyer | "I feel bad and want to feel better" | "I have a specific job to do and want a system" |

**Three honest readings:**

1. **Both sold without marketing** — that is the only genuinely useful signal. It proves the account, the categories, and the listings can surface organically at all.
2. **The task-specific book outsold the emotional one 2:1** — but with n=3 this is noise, not evidence. A 2-vs-1 split is statistically meaningless. What *is* worth noting is directional: mechanical, searchable problems convert without a relationship; emotional outcomes usually need trust the buyer doesn't have yet from a stranger.
3. **Neither proves a winning niche.** 3 sales across 2 titles is consistent with *any* niche at rank ~500,000. These sales tell us about **listing quality and category placement far more than about demand.**

**The actionable inference** isn't "do menopause" or "do logbooks." It's: *specific, concrete, already-diagnosed problems with a named task beat broad emotional positioning for a zero-audience author.* That is the mechanism I carried into the research — and it is exactly what the winner exploits.

Per the brief, logbooks/journals/planners/workbooks are excluded, so the *mechanism* is translated into a prose guide, not the format.

---

## 3. Method — what was measured vs. estimated

| Signal | Status | How |
|---|---|---|
| Amazon result counts | **ACTUAL** | live `/s?k=…&i=digital-text` → "1-16 of N results" |
| Autocomplete presence & rank | **ACTUAL** | live `completion.amazon.com/api/2017/suggestions` |
| Incumbent review counts | **ACTUAL** | organic result review badges |
| Incumbent price points | **ACTUAL** | SERP price fields |
| Demand trend | **ACTUAL (proxy)** | Wikimedia pageviews, **normalized against control articles** |
| Google query intent | **ACTUAL** | `suggestqueries.google.com` |
| Unit sales / BSR / search volume | **NOT AVAILABLE** | no free source; requires Helium10/Publishers Rocket or Amazon's own reports |

**Every number below is from the runs recorded in `research/raw/measurements_2026-11-21.json`.** Nothing is invented. Where a value is a proxy, it is labelled.

### A methodology correction that changed the result
My first trend read said *every* niche was collapsing (tinnitus 76k→34k views, menopause 22k→14k). That would have killed most candidates. I tested it against neutral control articles and found **Wikipedia traffic fell platform-wide**: Coffee went 122k→44k and Diabetes 66k→28k over the same window. So I divided each niche's raw change by the control baseline (**0.532**). Without this correction the recommendation would have been wrong.

---

## 4. Ranked candidates

Scored with the repo's `scorer.py` — Demand 30 + Competition 25 + Differentiation 15 + Buyer Intent 15 + Profitability 15 = 100 — then multiplied by a **capped (±20%)** trend modifier so an unproven proxy could never dominate the ranking.

| # | Niche | Amazon results | Raw /100 | Trend (normalized) | **Adjusted** | Outcome |
|---|---|---|---|---|---|---|
| **1** | **Peripheral neuropathy (diet / self-management)** | **289** (`neuropathy diet` **323**) | 72.7 | **1.32 growing** | **84.3** | **✅ WINNER** |
| 2 | Balance & fall prevention for seniors | over 1,000 | 81.1 | unverified | 81.1 | ❌ saturated incumbents |
| 3 | Vagus nerve reset | over 1,000 | 69.5 | 1.50 growing | 83.4 | ❌ bandwagon risk |
| 4 | Diverticulitis diet | 559 | 72.8 | unverified | 72.8 | ❌ no trend proof |
| 5 | Menopause anxiety *(user's book)* | 923 | 67.6 | 1.12 flat | 71.7 | ❌ crowded |
| 6 | Histamine intolerance | 321 | 69.7 | **0.71 declining** | 55.8 | ❌ demand falling |
| 7 | Peripheral neuropathy *(as head term)* | 289 | 40.0 | 1.32 | 46.4 | ❌ see note |
| 8 | POTS | 68 | 45.0 | 1.04 flat | 45.9 | ❌ too small |
| 9 | Tinnitus relief | 141 | 41.9 | 1.01 flat | 42.1 | ❌ falling, huge variance |

*Note on rows 1 vs 7:* identical trend and similar counts, but `neuropathy diet` is **Amazon's #1 autocomplete suggestion** for "neuropathy" while `peripheral neuropathy` returns **no book suggestion at all** (Amazon routes that prefix to a *massager*, alias `aps`). The book-buying query is the diet/management angle, not the clinical head term. That is why they diverge.

### Why each loser failed
- **Balance & fall prevention** — genuinely penetrable (a new 6-book series title ranked #1 with only 69 reviews), but "over 1,000" competitors and a **697-review** incumbent at #2. Needs volume I can't prove.
- **Vagus nerve** — best growth signal in the study (1.50), but a trending social-media topic with **over 1,000** results and heavy ad load. Trend chasers pile in; an evergreen thesis can't be defended.
- **Diverticulitis diet** — real keyword, 559 results, but **no independent trend data**, and the top of page 1 is dominated by general anti-inflammatory cookbooks, not diverticulitis-specific books. You'd be fighting for a share of a keyword you don't own.
- **Menopause anxiety** — the user's own book, 1 sale, **923 competitors**. Doubling down means paying the most expensive entry price in the study for the weakest proven outcome.
- **Histamine intolerance** — the only niche with a **verified decline** (0.71 after normalizing), plus Amazon classifies its queries as product-skewed (`aps`). Eliminated on evidence, not opinion.
- **POTS** — only 68 results and one strong recent indie success, but the demand pool is too small to build a list on. Adjacent opportunity, not a primary bet.
- **Tinnitus** — 141 results for "tinnitus relief" looked like the easiest win on paper. Killed by **volatility**: normalized trend ends anywhere from 1.01 to ~1.6 depending on which months you include, and the head term is flat. Too erratic to bet a book on.

---

## 5. Why the winner wins

**Buyer problem.** Peripheral neuropathy is chronic, progressive, and *under-served by the patient's own care pathway*. Patients leave the neurologist with a diagnosis, maybe gabapentin, and no daily plan. Nerve pain is worst at night, so it destroys sleep; diet is the one lever patients believe — correctly — they control. That is a high-urgency, self-directed, repeat-searching buyer.

**Organic discoverability (ACTUAL).** `neuropathy` is a **#1-ranked Amazon autocomplete suggestion in the Kindle department** (alias `digital-text`). Zero-audience authors live or die on being a plausible auto-suggest result for a term shoppers already type. This niche has that; most candidates didn't.

**Competition is weak at the top — the decisive finding (ACTUAL).**
| Query | Results | Top organic incumbents |
|---|---|---|
| `neuropathy diet` | **323** | **1 review** (Jun 2026), **1 review** (Aug 2026) |
| `neuropathy cookbook` | **76** | **4 reviews**, **2 reviews** |
| `peripheral neuropathy` | 289 | 52 reviews |
| *`menopause anxiety` (user's)* | *923* | *hundreds each* |

A book holding **position #1 on a commercial keyword with one review** is the clearest penetrability signal in this entire study. It also proves **recency is not penalised** here — 2025 and 2026 titles rank at the top, so the algorithm is rewarding keyword fit over accumulated authority.

**Evergreen demand (proxy, normalized).** **1.32× the platform baseline** — i.e. growing faster than the ambient decline, against a control-verified 0.53 baseline. Unlike vagus-nerve hype, this growth is driven by an ageing population, which is structural, not faddish.

**Ebook suitability.** Information-dense, text-led, no colour photos required, no printing cost, no journal interiors. It is a *read-and-apply* guide, not a fill-in product — so it survives the "no logbooks/workbooks" constraint as a genuine ebook.

**Unit economics (ACTUAL, via `bsr_model.py`).**
| Kindle price | Royalty | Per sale |
|---|---|---|
| $6.99 | 70% | **$4.74** |
| $9.99 | 70% | **$6.84** |
| $12.99 | 35% ❌ | $4.55 |

**Price at $9.99.** It is the profit peak, and it sits inside the range incumbents already use.

**Why it beats the alternatives:** balance/vagus/diverticulitis are all *more popular*, and popularity is exactly the trap the brief warns about. The neuropathy angle wins because it is the only candidate where **demand is verifiably growing, Amazon actively suggests the keyword, the top-ranked incumbents are provably weak, and a brand-new title can reach page-1 prominence** — all four at once.

---

## 6. Risks (read before writing)

1. **Sales volume is unverified.** Weak incumbents could mean *low competition* or *low demand*. The 1-review #1 is the crux: it might be a young book on the rise — or a book nobody buys. **This is the single biggest unknown.**
2. **Health/medical liability.** Do not promise a cure, do not advise on medication, include a clear "not medical advice" disclaimer.
3. **Low price ceiling.** Indie neuropathy books cluster at $3.99–$9.99. Do not model $12.99 (that's 35% royalty and an immediate 33% pay cut).
4. **AI-content saturation.** Several incumbents are clearly low-effort. That is the opening — but it also means Amazon may tighten enforcement. Write genuinely useful content.
5. **Semantic mismatch.** Amazon files these queries as product-skewed. Your **category placement and subtitle** must do heavy lifting to land in Kindle eBooks rather than alongside supplements.
6. **The 3-sale base rate.** Your realistic first-month expectation is single digits, not hundreds. Anything above that is upside.

---

## 7. Go/no-go test that turns this into a *verified* winner

Run this before writing 200 pages. Two weeks, zero dollars:

1. **Publish a short lead-in** (60–90 pages, $4.99): *"Peripheral Neuropathy Nerve-Pain Relief Plan: What to Eat, What to Avoid, and How to Sleep Through the Night."*
2. **Measure 21 days, organically**: impressions, click-through, and units in KDP Reports.
3. **Pass condition:** ≥1 unit per 1,000 impressions *and* ≥1 organic sale/week by day 21 → double down into the full guide and a 3-book series.
   **Fail condition:** <5 units in 21 days with a keyword-matched title → **abandon the niche**, don't add more books to it.

Given the user's baseline of 2 sales for a full book, even 5–8 units in three weeks is a genuine improvement signal.

**Do not run this test on vagus nerve** — the trend bonus (1.50) will be gone before the series matures. Evergreen thesis, evergreen niche.

### If it passes — the sequence
1. **Diet + symptom guide** (the #1 autocomplete slot)
2. **Sleep & night-pain guide** (highest-urgency sub-problem)
3. **Caregiver edition** (buyer with money and urgency, different searcher)
4. Bundle the series; keep every title keyword-locked to `neuropathy diet` / `nerve pain relief`.

### Keywords to own
Primary: `neuropathy diet`, `peripheral neuropathy diet`, `nerve pain relief`
Secondary (real autocomplete/suggest data): `neuropathy cookbook`, `sensory neuropathy`, `peripheral neuropathy pain relief`
Avoid (product-skewed, will misfire): bare `pots`, bare `nerve pain`, `peripheral neuropathy` as a head term.

---

## 8. One-line answer

**Write a $9.99, keyword-locked Kindle guide on peripheral-neuropathy diet and nerve-pain self-management for adults 50+** — the only niche in this study combining verified growth (1.32× normalized), top-ranked Amazon autocomplete demand, and provably weak page-1 incumbents (323 results, #1 holding 1 review) — **then prove it with a 21-day lead-in before committing to a series.**

*Raw measurements: `research/raw/measurements_2026-11-21.json` · Scores: `research/out/scores.json` · Tools: `research/TOOLS_AND_COMPATIBILITY.md`*
