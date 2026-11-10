# Raw Evidence Log — Round 3 (free-only pass), Amazon US, 2026-11-10 UTC

Append-only companion to `EVIDENCE_LOG.md` (r1) and `EVIDENCE_LOG_ROUND2.md` (r2).
Status legend: MEASURED / ESTIMATED / INFERRED / UNAVAILABLE.

---

## A. Free-tool audit (§ requirement 4)

GitHub API searches run 2026-11-10 for `amazon keyword volume free`, `amazon search volume
estimator`, `amazon autocomplete keyword tool`, `kdp niche finder free`.

| Repo | ★ | Licence | Claim | Assessment |
|---|---|---|---|---|
| `alikilickaya/amazon-search-volume-estimator` | 2 | MIT | estimates volume from autocomplete | **Cloned and README read.** Output is a 0–100 **ordinal score**, explicitly not a volume. Method reused; result NOT used as volume. |
| `adegbe11/RankKV` | 0 | none | free volume platform | No licence, 0 stars, no verifiable method. Not used as evidence. |
| `trendsmcp-ai/trends-agent-seo` | 0 | MIT | live trend data | Trend data, not Amazon volume. |
| `cumabozkurt/advanced-free-keyword-research-tool` | 1 | MIT | bulk long-tail from 25 autocompletes | Idea generation only. |

**Product Opportunity Explorer / Brand Analytics:** verified via public documentation that Amazon's
first-party search-volume tools are free **but require a Professional seller account (≈$39.99/mo) or
Brand Registry**. No purchase made, no account held. This is the binding constraint on Rule 3.

---

## B. Book-index gate — the new free discriminator

`alias` + `refTag` decoded from live payloads. `stripbooks` + `_i_` = book index.
`aps` + `_fb_` = **fell back to general product index → not a book query.**

### B.1 PASSED the gate (book index answered)
| Probe | alias | Suggestions returned | Count |
|---|---|---|---|
| `sourdough` | stripbooks | sourdough; **sourdough discard recipes cookbook**; sourdough cookbook; sourdough pizza; sourdough books; sourdough starter kit; sourdough bread bags; sourdough starter; sourdough ho; sourdough ceramic loaf pans | **10** |
| `sourdough starter` | stripbooks | sourdough starter kit; sourdough starter; sourdough starter kit kilcoin | 3 |
| `dbt work` | stripbooks | dbt workbook; dbt workbook for teens; dbt workbook for adults | 3 |
| `grief journal` | stripbooks | grief journal (bare echo) | 1 |
| `homeschool plan` | stripbooks | homeschool planner (bare echo) | 1 |
| `dementia activity` | stripbooks | dementia activity book; dementia activities for seniors | 2 |
| `wedding planner` | stripbooks | wedding planner (bare echo) | 1 |
| `wedding guest book` | stripbooks | wedding guest book (bare echo) | 1 |
| `baby memory book` | stripbooks | baby memory book (bare echo) | 1 |
| `reading journal` | stripbooks | reading journal (bare echo) | 1 |
| `blood pressure log` | stripbooks | blood pressure log book | 1 |
| `dog training` | stripbooks | dog training; dog training book | 2 |
| `pressure canning` | stripbooks | pressure canning for beginners | 1 |
| `beekeeping` | stripbooks | beekeeping (bare echo; but `beekeeping log` FALLS BACK) | 1 |
| `bread baking` | stripbooks | bread baking; bread baking cookbook | 2 |
| `caregiver organizer` | aps→ but value is book-shaped | caregiver organizer for elderly parents | 1 |

### B.2 FAILED the gate (product-index fallback — NOT book queries)
| Probe | alias | What Amazon suggested instead |
|---|---|---|
| `seizure` | aps | seizure emergency kit |
| `activity director` | aps | activity director |
| `mushroom foraging` | aps | mushroom foraging identification book |
| `herbal remedies` | aps | herbal remedies for black people |
| `homeschool record` | aps | homeschool record keeping |
| `truck driver log` | aps | truck driver log sheets |
| `funeral guest book` | aps | funeral guest book with address |
| `migraine journal` | aps | migraine journal tracker |
| `beekeeping log` | aps | beekeeping log book |
| `food allergy` | aps | food allergy chart baby |
| `seed starting` | aps | seed starting cubes |
| `nurse brain` | aps | nurse brain chronic pain insider playbook |
| `hunting log` | aps | **hunting log journal personalized** |
| `teacher lesson planner` | aps | teacher lesson planner 9 subject 2026-2027 |
| `libro de sopas de letras` | aps | libro de sopas de letras en español de dollarama |
| `sopas de letras para adultos` | aps | sopas de letras para adultos |
| `libro de crucigramas` | aps | libro de crucigramas en español para adultos |
| `libro para colorear para adultos` | aps | libro para colorear para adultos |
| `libro de actividades para` | aps | libro de actividades para prekinder para que aprenda a escribir |

**15 distinct candidates / phrases failed.** All six Spanish probes failed.

---

## C. SERP result counts (`i=stripbooks`, MEASURED, 2026-11-10)

| Query | Count phrase | Kind |
|---|---|---|
| `sourdough discard cookbook` | **982** | exact |
| `dbt workbook for adults` | over **2,000** | lower bound |
| `pressure canning for beginners` | over **2,000** | lower bound |
| `dementia activity book` | over **20,000** | lower bound |
| `grief journal` | over **40,000** | lower bound |
| `homeschool planner` | over **50,000** | lower bound |
| `dog training book` | over **50,000** | lower bound |
| `sourdough discard cookbook` vs caregiver head term | 982 vs 20,000+ | 20× thinner |

Round 1/2 counts re-used (not re-measured): blood pressure log 50,000+; medication log 30,000+;
mileage log 50,000+; caregiver daily log 20,000+; caregiver log book spanish 815.

**Note on 982:** it is an exact number, not a "over N" bound, which makes it unusually reliable as a
supply measurement. It is still a *supply* figure — it says nothing about demand.

---

## D. Sourdough competitor evidence (the strongest market-structure finding)

From `/s?k=sourdough discard+cookbook&i=stripbooks`, results block:

| Item | Detail |
|---|---|
| #1 result | **Sourdough Every Day: Your Guide to Using Active and Discard Starter…** — Hannah Dela Cruz |
| Rating / reviews | **4.5 / 1,000+** |
| Price | **$19.00** (list $22.99); used/new from $11.05 |
| Badge | **Editors' pick — Best Cookbooks, Food & Wine** |
| Formats | Paperback, Kindle; "Great On Kindle" |
| Also in set | *Artisan Sourdough at Home* (B0GGPZ4BBL), sponsored, $16.98 (list $18.99), 4.0/59 |
| Sponsored presence | Yes — "Artisan bread baking books" storefront from Leanna Yarson |

**Reading:** demand of 1,000+ reviews at $19 in a market of 982 titles. Compare caregiver logs:
123 reviews at $8.99 in a market of 20,000+. Sourdough has roughly **an order of magnitude better
demand-to-supply ratio** — and an order of magnitude higher production bar.

---

## E. Category check attempted (FAILED — recorded as a dead end)

`/gp/bestsellers/books/4220` resolves to **Cocktails & Mixed Drinks**, not bread/baking. Top 5:
Art of Mixology 4.7/12,492 $8.40; Magnolia Table Vol 2 4.9/28,861; Cocktail Codex 4.8/3,690 $19.15;
Making Spirits Bright 4.8/179; Tequila Mockingbird 4.8/7,312. The bread/baking node ID was not
resolved within this round; no sourdough category depth figure is claimed. **Do not cite a
sourdough category rank.**

---

## F. Sandbox limitation (re-verified)

`curl https://completion.amazon.com` → HTTP 000; `urllib` → `TLS/SSL connection has been closed (EOF)`.
Bash egress is allowlisted to GitHub/PyPI/npm only. Python collection therefore cannot run in-sandbox;
`tools/autocomplete_demand_index.py` is written for a machine with normal egress and validated with
`--selftest` (10/10 PASS) against the payloads in §B.

Requests were paced with deliberate spacing; no CAPTCHA, sign-in wall or rate limit was bypassed.
`/product-reviews` was not retried. Google Trends was not retried after the round-1 429.
