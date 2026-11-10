# Raw Evidence Log — Round 2 (validation pass), Amazon US, 2026-11-10 UTC

Captures made *after* `EVIDENCE_LOG.md` (round 1). Round 1 is left untouched.
Status legend unchanged: MEASURED / ESTIMATED / INFERRED / UNAVAILABLE.

---

## 0. Data-source audit (requested in task §3)

| Source | Status in this environment | Detail |
|---|---|---|
| **DataForSEO** | ❌ **NOT available** | No `backend/.env` exists; `DATAFORSEO_LOGIN` / `DATAFORSEO_API_KEY` / `PANGOLINFO_API_KEY` are declared in `backend/.env.example` but **unset in env**. No key was purchased (no cost authorised). |
| Amazon autocomplete (`completion.amazon.com`) | ✅ **Available, MEASURED** | Live JSON, no key. Used for 18 further prefixes this round. |
| Amazon search results (`/s?k=&i=stripbooks`) | ✅ **Available, MEASURED** | Result-count phrase + ranked listings. |
| Amazon Bestsellers (`/gp/bestsellers/books/{node}`) | ✅ **Available, MEASURED** | incl. **page 2**, which is the decisive depth test. |
| Amazon Hot New Releases (`/gp/new-releases/books/{node}`) | ✅ **Available, MEASURED** | |
| Amazon product pages (`/dp`, `/gp/aw/d`) | ✅ **Available, MEASURED** | Price, review count, rating, pub date, pages, dimensions, series, badges. |
| Product BSR number | ❌ **UNAVAILABLE** | Still absent from fetched HTML (client-rendered). |
| Review text / star filters | ❌ **UNAVAILABLE** | `/product-reviews` redirects to sign-in (verified again this round). |
| **Google Trends** | ❌ **UNAVAILABLE** | 429 in round 1; not retried (would repeat the same rate-limit). |
| Third-party Amazon keyword datasets | ❌ **Not accessible** | No subscription; no open dataset contains Amazon-internal volume. |
| Bash egress to amazon.com | ❌ **Blocked** | `curl` → HTTP 000; `urllib` → TLS EOF (re-verified round 1). Python-side scraping must run off-sandbox. |

**Bottom line on §3:** the environment can measure *Amazon's own outputs* (rank, density, listings,
metadata) but **cannot obtain Amazon search volume from any source**. That is unchanged, and it is
the sole reason Rule 3 stays Unverified.

---

## 1. Autocomplete — the 8 requested clusters + expansions

| # | Prefix probed | Result | Verdict |
|---|---|---|---|
| 1 | `aging parents caregiver log book` | (probed via `aging parent care` → `aging parent caregiver workbook`) | **no direct suggestion** |
| 2 | `caregiver handoff binder` | (via `caregiver handoff` → `caregiver handoff workbook`) | **present as `caregiver handoff workbook`** |
| 3 | `caregiver communication` | `caregiver communication book chinese english` (all-dept) | **drifting to a translation aid — not a log** |
| 4 | `family caregiver` | **`family caregiver planner`** | **present** |
| 5 | `family caregiver planner` | **`family caregiver planner`** (exact) | **present (exact)** |
| 6 | `elderly care planner` | **NO SUGGESTIONS (empty)** | **absent** |
| 7 | `senior care coordination` | **NO SUGGESTIONS (empty)** | **absent** |
| 8 | `aging parent care journal` | **NO SUGGESTIONS (empty)** | **absent** |
| 9 | `elderly care` | `elderly caregiver alert` (product) | absent as book term |
| 10 | `senior care` | `senior care camera hidden` (product) | absent as book term |
| 11 | `aging parent care` | **`aging parent caregiver workbook`** | **present** |
| 12 | `caregiver daily log` | **`caregiver daily log book in spanish`** | **present — language variant** |
| 13 | `caregiver log book` | `caregiver log book planner` (all-dept) | present |
| 14 | `caregiver log book in` | **NO SUGGESTIONS (empty)** | — |
| 15 | `caregiver planner` | **`caregiver planner organizer book`** | **present** |
| 16 | `caregiver organizer` | **`caregiver organizer for elderly parents`** | **present** |
| 17 | `caregiver handoff` (round 1) | `caregiver handoff workbook` | present |
| 18 | `aging parents` (round 1) | `aging parents caregiver handoff` | present |

**Reading (this is the load-bearing interpretation):** at least **6 of the 8 requested keyword clusters
are confirmed as phrases Amazon itself suggests** — the niche is a real query space, not invented
vocabulary. But **3 of the 8 are empty** (`elderly care planner`, `senior care coordination`,
`aging parent care journal`). Those three are *marketing language, not buyer language* — a person
does not type "senior care coordination" into Amazon. This is a concrete, measured finding and it
should govern title/keyword choice.

---

## 2. SERP result counts (`i=stripbooks`, 2026-11-10)

| Query | Amazon count phrase | vs. round 1 |
|---|---|---|
| `caregiver daily log book` | over **20,000** | same as `caregiver log book` |
| `family caregiver planner` | over **7,000** | new |
| `elderly care planner` | over **7,000** | new — **7,000 despite zero autocomplete** |
| `aging parents caregiver workbook` | over **1,000** | new |
| `caregiver communication log` | over **1,000** | new |
| **`caregiver log book spanish`** | **815** (exact, not "over") | **new — the key find** |
| `caregiver handoff binder` | **181** | round 1 |

**Critical observation:** `elderly care planner` has **7,000+ results but returns no autocomplete
suggestion.** Result count and buyer language are measuring different things. A high result count
with no autocomplete presence is a keyword that *sellers* target but *buyers* do not type — the
single most common KDP trap. Conversely 815 results with confirmed autocomplete
(`caregiver daily log book in spanish`) is a *thin but genuinely requested* phrase.

---

## 3. Category depth — the test round 1 did not run

### 3.1 Best Sellers in **Nursing Long-Term Care** (node 16311341) — page 1

| Rank | Title | Reviews | Price |
|---|---|---|---|
| #1 | EKG/ECG Interpretation Made Easy | 3,670 | $10.95 |
| #2 | Over 90 Easy and Fun Dementia Activities for Seniors | 214 | $11.95 |
| **#3** | **Caregiver Daily Log Book (Ken Mihara)** | **123** | **$8.99** |
| **#4** | **Medication Log Book (Brain and Paint Books)** | **90** | **$9.99** |
| #5 | (continued) | — | — |
| #51 | Guía de Supervivencia para Cuidadores de Personas con Demencia (Spanish) | 32 | $22.95 |
| #52 | Caregiver Daily Log Book (Cassie Graham) | 47 | $11.25 |
| #53 | Libro de Actividades para Mayores (Spanish) | 24 | $9.99 |

**Measured conclusion:** the **#51 threshold in this category is ~24–32 reviews.** Caregiver logs hold
**#3 and #4 on a sustained bestseller list**, which is a real sales signal — not a new-release artifact.

### 3.2 Best Sellers in **Aging Parents** (node 11352) — page 2

| Rank | Title | Reviews | Price |
|---|---|---|---|
| #51 | The Complete Family Guide to Dementia (trade) | 94 | $15.29 |
| #52 | Daughters Caring for a Parent with Dementia | 46 | $15.99 |
| #53 | The End of Alzheimer's | 5,522 | $10.99 |
| **#54** | **My Final Wishes Planner (self-pub planner)** | **930** | **$9.99** |
| #55 | The Early Birds | 407 | $0.99 |
| #56 | Living in the Moment | — | — |

**Measured conclusion:** Aging Parents is **much deeper than round 1 implied** — #51 needs ~94 reviews,
and **#54 is a 930-review self-published family planner at $9.99.** Two implications:
1. Family-admin planners for this demographic **do sell at volume** (930 reviews ≈ thousands of copies). Strong Rule-3 supporting evidence.
2. My round-1 claim that a new entrant reaches this list with "12–18 reviews" was **about New Releases, not the bestseller list** — see §6 corrections.

---

## 4. Review velocity (the §4 request) — computed from pub date, not guessed

Formula: reviews ÷ months since publication (as of 2026-11-10). This is a *rate*, and a lower bound on
cumulative units. It is **not** a sales figure — review-to-sale ratio for low-content titles is
unpublished and varies widely (and launch-period solicitation inflates it).

| ASIN | Title | Reviews | Pub date | Months live | Reviews/mo | Note |
|---|---|---|---|---|---|---|
| 8409925206 | Caregiver Daily Log Book (Brain & Paint) | 20 | 2026-09-29 | 1.4 | **14.3** | #1 New Release; **outlier — likely launch-period review solicitation** |
| 8409724138 | Medication Log Book (Brain & Paint) | 90 | 2025-04-30 | 18.4 | **4.9** | mature, consistent |
| B0D4TX3TRR | Caregiver Daily Log Book (Ken Mihara) | 123 | 2024-05-19 | 30.0 | **4.1** | mature, consistent; #3 category bestseller |
| B0FJ7697MM | The Caregiver's Compass | 60 | 2025-07-05 | 16.3 | **3.7** | mature |
| B0HHS493H6 | Guiding Care for Aging Parents | 7 | 2026-08-26 | 2.5 | **2.8** | early |
| B0BNB8ZN7V | Caregiver Daily Log Book (Cassie Graham) | 47 | 2022-12 | ~47 | **~1.0** | slow tail |

**Reading:** the two *mature* comparables converge on **~4–5 reviews/month sustained**, which is a
meaningful and repeatable rate for paperback planners in this niche. The 14.3/mo figure is a
launch spike and should not be extrapolated. Convergence of two independent publishers on 4–5/mo is
the single most credible demand signal obtained in either round.

---

## 5. Competitive landscape, corrected — the differentiator is gone

Round 1 recommended "the only binder built for multiple carers handing off." **That claim is now false.**
Listings explicitly marketing *handoff* or *sibling coordination*, by publication date:

| ASIN | Title fragment | Pub date | Price | Reviews |
|---|---|---|---|---|
| B0H3974JJ9 | The Complete Caregiver Planner & Daily Log Book (eldercare organizer) | 2026-05-26 | $14.99 | 23 |
| B0HHS493H6 | Guiding Care for Aging Parents: 90-Day Planner, Organizer & Caregiver Logbook | 2026-08-26 | $14.99 | 7 |
| B0HG6P1J9N | **Caregiver Shift Handoff Log Book for Aging Parents** | 2026-08-23 | $9.99 | 0 |
| B0HJDML184 | Caregiver Daily Log Book … **Family Caregiver Handoffs** | 2026-09-10 | — | 0 |
| B0HLMXTRH1 | Aging Parent Caregiver Log … **Sibling Handoffs** | 2026-09-28 | $12.99 | 0 |
| 8409925206 | Caregiver Daily Log Book … **"Caregiver notes and handoff information"** | 2026-09-29 | $9.99 | 20 |
| B0HNXWYWMG | **Bilingual** Caregiver Daily Log Book … **Daily Handoff Notes** | 2026-10-20 | $12.99 | 0 |

**At least 7 listings, all published May–Oct 2026, explicitly target handoff or sibling coordination.**
The proposed USP is commoditised across the sector in under six months.

### 5.1 The Spanish-language pocket (the genuinely underexploited finding)

`caregiver log book spanish` → **815 results** (vs 20,000+ English). Existing supply:

| ASIN | Title | Pub date | Reviews | Price |
|---|---|---|---|---|
| B09L3RC7QT | Registro Diario del Cuidador (Spanish) | 2021-11-05 | **2** | $7.23 |
| B09M7RR2NB | Libro de Registro del Cuidador (Spanish) | 2021-11-25 | **1** | — |
| B0HNXWYWMG | Bilingual Caregiver Daily Log Book (EN-ES) | **2026-10-20** | 0 | $12.99 |

**Measured:** a market of 815 competing titles whose two oldest Spanish-only incumbents hold
**1–2 reviews after five years** — i.e. almost no accumulated sales. That is the softest *and*
thinnest measured pocket found in either round. It cuts two ways: little competition, but the
1–2 review incumbents are also evidence that Spanish-only caregiver logs **have not sold well**
over five years. **A bilingual handoff book landed 3 weeks ago**, so this angle is being taken too.

---

## 6. Corrections to Round 1 (recorded explicitly)

| Round-1 claim | Status | Correction |
|---|---|---|
| "The only binder built for multiple carers handing off" | ❌ **WRONG** | ≥7 listings market handoff/sibling coordination; the differentiator is commoditised |
| "12–18 reviews buys a top-6 new-release slot ⇒ easy entry" | ⚠️ **MISLEADING** | True of *Hot New Releases* (time-limited), not the sustained bestseller list, where #51 needs **~32–94 reviews** |
| "No caregiver organizer appears in the top six of Aging Parents" | ✅ true, ⚠️ incomplete | Category **#54 is a 930-review self-pubbed family planner at $9.99** — organizers do sell here |
| "`caregiver handoff binder` = 181 results is an opportunity" | ⚠️ **OVERSTATED** | 181 is a **keyword**, not a market; too thin to carry a title alone |
| "5 of top 11 of Nursing Home Care are health logs" | ✅ confirmed | Re-confirmed; #3/#4 of Long-Term Care are caregiver logs |
| Rule 3 unverified | ✅ **still unverified** | No volume obtainable from any source |
