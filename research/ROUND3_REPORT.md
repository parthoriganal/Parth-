# Round 3 — Free-Only Niche Search, Comparative Ranking & Final Decision
### Amazon US · branch `arena/8a33cda7-parth` · captures dated 2026-11-10 UTC
### Budget constraint: **$0. No subscription, API, credit or dataset was purchased or trialled.**

> **Files.** New this round: `raw/EVIDENCE_LOG_ROUND3.md`, `data/round3_evidence.csv` (29 candidates),
> `data/round3_ranking.csv`, `tools/autocomplete_demand_index.py`, `tools/rank_niches.py`.
> Round 1 (`FINAL_REPORT.md`, `raw/EVIDENCE_LOG.md`) and round 2 (`ROUND2_REPORT.md`,
> `raw/EVIDENCE_LOG_ROUND2.md`, `data/keyword_demand_matrix.csv`) are **unmodified**.

---

## 0. The answer

> ## NO QUALIFIED WINNER
>
> No niche in this round is selected. **Rule 3 — high Amazon search demand — cannot be satisfied at
> $0**, for any niche, by any route I could find. This is not a statement about the caregiver niche
> specifically; it is a structural limit of free data.
>
> Amazon does not publish search volume. Every free estimator in public open source is, by its own
> documentation, an **ordinal prominence score**, not a volume. Amazon's only real first-party volume
> tools (Product Opportunity Explorer, Brand Analytics) are **free but gated** behind a Professional
> seller account (≈$39.99/mo) or Brand Analytics eligibility. So the honest position is: I can rank
> niches, I can prove demand *exists*, and I still cannot put a number on it.
>
> **Three niches are worth your attention** (Section 6), and one of them — sourdough discard baking —
> is the most interesting thing this research has found. None of them clears all three rules on
> evidence available for free.

---

## 1. What this round actually added to the method

Round 2's weakest point was that "confirmed autocomplete" lumped together real book queries and
phrases where Amazon silently redirected the search to *non-book products*. Round 3 found a way to
separate those, for free, from data Amazon already returns.

**1.1 The book-index gate (new, and genuinely decisive).** The suggestion payload contains an
`alias` field and a per-suggestion `refTag`:

| Signal | Meaning |
|---|---|
| `alias: "stripbooks"` + `refTag: "nb_sb_ss_i_*"` | answered from Amazon's **book** index — a real book query |
| `alias: "aps"` + `refTag: "nb_sb_ss_fb_*"` | Amazon **fell back** to the general product index — *not* a book query |

This is a hard, free, binary test, and it overturned a lot. **Fifteen of 29** candidates failed it —
including several that looked excellent on paper:

- `funeral guest book` → product index (mortality demand is the most reliable demand there is, and it
  *still* fails: buyers want a bound physical guest book, not a KDP paperback)
- `seizure`, `migraine journal`, `food allergy`, `herbal remedies`, `mushroom foraging`, `seed starting`
- `truck driver log` (also being replaced by electronic logging devices)
- `hunting log` → autocomplete literally asks for **"personalized"**, i.e. a print-on-demand product
- `nurse brain`, `activity director`, `teacher lesson planner`, `homeschool record`
- **all six Spanish-language probes** — see §7.2, this damages round 2's headline alternative

**1.2 A free ordinal demand index.** Rather than paraphrase, I implemented the technique the best
free tool actually uses. `alikilickaya/amazon-search-volume-estimator` (MIT, 2★) probes the phrase and
each of its prefixes and weights hits exponentially; its own README is explicit that the output is a
score out of 100, **not a volume**. `tools/autocomplete_demand_index.py` reimplements that scoring
plus the book-index gate, and passes **10/10 self-tests** against payloads captured live this round.

**1.3 A transparent, reproducible ranking.** `tools/rank_niches.py` applies a documented rubric with
published weights and a hard gate. Sub-scores for organic/evergreen/demand/differentiation are
**analyst judgements** and the report labels them as such; competition and confidence are computed
mechanically from measured fields.

**1.4 What I could not add.** Real volume. No free source produces it (§2).

---

## 2. Can free tools estimate keyword volume? — audited, no

| Tool | Free? | What it actually gives | Verdict |
|---|---|---|---|
| `alikilickaya/amazon-search-volume-estimator` (MIT) | Yes | 0–100 **ordinal prominence** score from autocomplete prefixes. README says plainly it is not a volume. | **Rejected as a volume source.** Used only for its *method*, as an ordinal signal. |
| `adegbe11/RankKV` (0★, no licence) | Claims free | "Free keyword research and search volume platform for Google, YouTube, TikTok, Amazon". Zero stars, no licence, unverifiable methodology. | **Not usable as evidence.** |
| `trendsmcp-ai/trends-agent-seo` (MIT) | Yes | Live trend data — but as an MCP server for AI agents; **Google Trends itself returned 429** to us and trends are not Amazon volume. | Rejected. |
| `cumabozkurt/advanced-free-keyword-research-tool` (MIT) | Yes | Bulk long-tail ideas from autocomplete. Idea generation, not volume. | Not a volume source. |
| Helium 10 / Jungle Scout free tiers | Partly | Limited Xray lookups, **estimates**, not Amazon internal data; free tier is a funnel to a subscription. | Rejected — not first-party, and several require an account. |
| **Amazon Product Opportunity Explorer** | **Free *with* a Professional seller account** | **Real Amazon search volume trends**, conversion share, 90-day rolling. First-party. | **The only genuine answer — but gated** (≈$39.99/mo selling plan, or Brand Registry / Brand Analytics eligibility). Not reachable at $0. |
| Amazon Brand Analytics — Search Query Performance | Free *with* Brand Registry | Actual top search terms, click share, conversion share for your category | Gated the same way. |

**Conclusion: the audit is closed.** There is no $0 path to Amazon search volume for someone not
already enrolled as a Professional seller. That single fact fixes the verdict for *every* niche,
present and future.

---

## 3. Breadth: the candidate set

29 candidates scored this round, covering 22 new niches not previously probed, plus the strongest
carry-overs from rounds 1–2. Clusters: cooking/fermentation, mental health, education, caregiving,
homesteading, gardening, outdoors, events, compliance/business logs, nursing, health logs,
Spanish-language.

**Fifteen failed the book-index gate** (§1.1). Fourteen passed. Those fourteen were scored.

---

## 4. Comparative ranking

Weights: organic discoverability 20%, evergreen 20%, **demand evidence 25%**, competition 15%,
differentiation 10%, confidence 10%. Full machine-readable output in `data/round3_ranking.csv`.

| # | Niche | Org | Evg | Dem | Cmp | Dif | Cnf | Total | Tier |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Dementia activity book** | 4 | 5 | **4** | 2 | 2 | 5 | **3.80** | B-range |
| 2 | **Caregiver daily log / aging-parent organizer** | 3 | 5 | **5** | 2 | 1 | 5 | **3.75** | B-range |
| 3 | **Sourdough discard baking** | **5** | 4 | 2 | **5** | 2 | 4 | **3.65** | B-range |
| 4 | DBT skills workbook | 3 | 4 | 2 | 4 | 2 | 4 | 3.10 | C-range |
| 5 | Pressure canning for beginners | 3 | 4 | 2 | 4 | 2 | 4 | 3.10 | C-range |
| 6 | Blood pressure log book | 3 | 5 | 3 | 1 | 1 | 5 | 3.10 | C-range |
| 7 | Medication log book | 2 | 5 | 3 | 1 | 1 | 5 | 2.90 | C-range |
| 8 | Grief journal | 2 | 5 | 2 | 1 | 2 | 4 | 2.65 | C-range |
| 9 | Homeschool planner | 2 | 5 | 2 | 1 | 2 | 4 | 2.65 | C-range |
| 11 | Sourdough starter / beginner | 3 | 4 | 2 | 0 | 2 | 4 | 2.50 | C-range |
| 12 | Mileage log book | 2 | 4 | 2 | 1 | 1 | 4 | 2.35 | D-range |
| 13–14 | Baby memory book · Wedding guest book | 2 | 3–4 | 2 | 0 | 2 | 2 | 1.9–2.1 | D-range |

**Nothing reaches A-range (≥4.2).** The top three sit within 0.15 of each other — statistically
indistinguishable given that four of the six inputs are judgement scores. **Treat the ordering of the
top three as a tie, not a ranking.** The honest read of the table is: three B-range candidates, one
clear winner on supply thinness, one on demand proof, and no A.

*Legend: Org = organic discoverability, Evg = evergreen, Dem = demand evidence, Cmp = competition
(higher = more room), Dif = differentiation, Cnf = confidence in the evidence.*

---

## 5. The 15 gate failures, and what they teach

| Failed candidate | Why it looked good | Why it fails |
|---|---|---|
| Funeral guest book | Perfect evergreen demand | Product index; buyers want a bound physical book |
| Seizure / migraine / food allergy logs | Chronic-condition logging = recurring purchase | Product index |
| Truck driver log | Regulated, permanent need | Product index + replaced by ELD software |
| Hunting log | Large hobby | Autocomplete wants "personalized" → POD product |
| Beekeeping log | Hobby log, clean fit | Core term is a book; the *log* is a product |
| Nurse brain / activity director / teacher planner / homeschool record | Professional recurrence | Product index |
| Herbal remedies, mushroom foraging, seed starting | Evergreen interest | Product index |
| **6 × Spanish-language phrases** | Round 2 called this the strongest alternative | **Book index falls back on every one** |

**The lesson:** "there is a recurring need" and "Amazon sells a book for that need" are different
facts, and free autocomplete can now distinguish them for you. Half the intuitive appeal of low-content
niches dies at this gate — which is worth knowing *before* writing 120 pages.

---

## 6. The three finalists, and exactly why each fails

### 6.1 Dementia activity book — 3.80, best evidence-to-risk
- **Demand proven twice:** #2 of Nursing Long-Term Care (16311341) is *Over 90 Easy and Fun Dementia
  Activities*, **4.6 / 214 reviews / $11.95**; #53 is a Spanish seniors activity book at 24 reviews.
- **Autocomplete:** 4+ book-index suggestions extending the phrase.
- **Fails on:** 20,000+ competing titles, active sponsored shelf, and identical product type to the
  high-colour picture/activity books the brief asks me not to default to. Differentiation is thin —
  every entrant claims "gentle, dignified activities".
- **Rule 3:** no volume. Unverified.

### 6.2 Caregiver daily log / aging-parent organizer — 3.75, strongest demand, weakest moat
- **Best demand evidence in three rounds of work:** #3 (123 rev, $8.99) and #4 (90 rev, $9.99) of a
  category we measured 100 deep; two unrelated publishers at **~4–5 reviews/month** sustained over
  16–30 months.
- **Fails on:** 20,000+ competitors; the entire premise commoditised — **≥7 listings published May–Oct
  2026** market handoff/sibling coordination; a **$4.99** price floor already set; active ads.
- **Rule 3:** no volume. Unverified. (Round 2 said the same; round 3 confirms nothing changed it.)

### 6.3 Sourdough discard baking — 3.65, and the most interesting finding of the project
- **982 competing titles — the thinnest supply of any book-index-confirmed phrase found, by a factor
  of two.** For contrast: grief journal 40,000+; homeschool planner 50,000+; caregiver log 20,000+.
- **Ten confirmed book-index suggestions**, including a distinct product-type phrase
  (`sourdough discard recipes cookbook`) — the highest organic score in the table (5/5).
- **Demand is proven, not merely present:** the #1 result is a **professionally published cookbook
  with 1,000+ reviews at $19**, and Amazon flags it *Editors' pick — Best Cookbooks*. A market with
  1,000-review demand and <1,000 competing titles is a combination I did not find anywhere else.
- **Evergreen, with an honest caveat:** keeping a starter alive is a real skill and a sticky habit, so
  demand is practice-driven rather than fashion-driven — but participation did rise sharply in 2020
  and could decay, and I could not test that (Trends 429).
- **Fails on:** *production cost and my own authorship constraint.* The competitor set is real
  cookery publishing. A competitive entry needs developed, tested recipes — the opposite of a fast
  low-content build, and I did not establish that you can write it.
- **Rule 3:** no volume. Unverified. Rule 1 is *inferred*, not verified — the 1,000-review incumbent
  proves the market buys, not that a new entrant gets organic visibility.

---

## 7. Corrections to round 2

**7.1 The "bilingual / Spanish caregiver log" alternative is weaker than I reported.** Round 2 called
it the strongest alternative on the basis of 815 results and incumbents at 1–2 reviews. Round 3 tested
six Spanish phrases against the book index — `libro de sopas de letras`, `sopas de letras para
adultos`, `libro de crucigramas`, `libro para colorear para adultos`, `libro de actividades para`,
`caregiver log book spanish` — and **every single one fell back to the product index.** Amazon's US
book autocomplete does not serve Spanish-language book queries. So "815 results" is a supply count
from a channel whose demand I cannot verify at all, and the 1–2-review incumbents are equally
consistent with *nobody looking*. **Same unmeasurable Rule 3, plus a weaker Rule 1. I withdraw it as
the named strongest alternative.**

**7.2 Round 2's judgement that the caregiver niche should not be dropped to C still stands** — the
demand evidence is real. But round 3 shows that conclusion was never specific to caregiving: *no*
niche can clear Rule 3 free, so "B" was the ceiling for everything, not a finding about that niche.

**7.3 Newly credible:** sourdough discard (982 results) had never been probed in rounds 1–2. It
outscores the original candidate on supply thinness and organic confirmation, and loses only on
production realism — which is a reason to check your appetite for it, not a reason to dismiss it.

---

## 8. Decision

**No niche is selected. Book production does not start.**

| Rule | Status across all 29 candidates |
|---|---|
| 1 — organic sales without marketing | **Inferred at best.** Best case (caregiver) has sustained category rank and review velocity, but the niche runs ads, so organic-only can't be isolated. |
| 2 — evergreen demand | **The one rule that can be assessed free, and the one most candidates pass.** Caregiving, dementia, chronic-condition and fermentation niches are structurally durable. |
| 3 — high search demand | **Unverifiable at $0 for every candidate.** No free volume source exists. |

Two of three rules assessable; one structurally blocked. Under your rule that all three must have
sufficient evidence, the correct output is **NO QUALIFIED WINNER**, not a forced pick.

### What would change this — and it isn't a purchase
If you already hold an **Amazon Professional seller account**, *Product Opportunity Explorer*
(Growth → POE) is included at no extra cost and reports real search-volume trends and conversion
share. That is the only first-party volume data that exists, and it is genuinely free *given* that
account. If you have one, three queries would settle this project:

1. `caregiver daily log` / `caregiver organizer` — niche search volume + growth
2. `dementia activity book` — to confirm the #2-of-category reading
3. `sourdough discard` — the thin-supply hypothesis, and whether it is decaying post-2020

If you do not hold that account, then at $0 the answer stays **PROMISING BUT UNVERIFIED** in
perpetuity, and the decision becomes a judgement call between §6.1 and §6.3 — which I can argue
either way, but will not dress up as measurement.

**My recommendation, stated as opinion rather than finding:** the caregiver organizer remains the
best *demand* evidence and the worst *moat*; sourdough discard is the best *market structure* and the
heaviest *production* burden. If the goal is a book you can actually finish and that has room to rank,
sourdough discard deserves a serious look — with the explicit caveat that it requires you to become a
recipe developer, and that neither choice has verified volume.

---

### Evidence files
- `research/raw/EVIDENCE_LOG_ROUND3.md` — every capture this round, verbatim
- `research/data/round3_evidence.csv` — 29 candidates, all scored inputs + measured basis
- `research/data/round3_ranking.csv` — machine-readable ranking
- `research/tools/autocomplete_demand_index.py` — free signals, 10/10 self-tests passing
- `research/tools/rank_niches.py` — rubric + gate + weights
- Rounds 1–2 files: unmodified
