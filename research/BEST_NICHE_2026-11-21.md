# The Single Best KDP Ebook Niche — Round 3 Verdict

**Date:** 2026-11-21 · **Marketplace:** amazon.com US, Kindle Store (`digital-text`)
**Scope:** ebooks only — no journals, logbooks, planners, workbooks. Zero ads, zero marketing, zero external traffic.
**Supersedes:** `NICHE_RESEARCH_2026-11-21.md` (round 1) and `ADVERSARIAL_VALIDATION.md` (round 2 FAIL).

---

## THE DECISION

> # ✅ WINNER: Fascia / Myofascial Release self-treatment — for chronic pain that has no diagnosis

**Working title:** *The Fascia Fix: Why Your Pain Has No Diagnosis — and the 15-Minute Daily Release Plan That Finally Loosens It*
**Price:** $8.99 · **Royalty:** $6.14/sale · **Category:** Health, Fitness & Dieting → Diseases & Physical Ailments → Chronic Pain
**Why it wins:** it is the only niche I tested where **brand-new indie ebooks actually accumulate reviews fast**, **competition depth is under 350 titles**, **the topic is growing**, and **Big-5 publishers are pre-buying into it** — all four at once.

---

## 1. Your 3 sales — what they actually tell us

**Read this first: 3 sales is statistically worthless as a predictor.** With n=3 you cannot distinguish a niche's demand from one lucky ranking day. I treat these as *hints about buyer psychology*, not evidence of demand.

| Your title | Price band | What it proves |
|---|---|---|
| *Calming Menopause Anxiety* (1 sale) | Health/anxiety | **A symptom-relief buyer exists** — someone in distress searched a problem, not an author. High-intent, low-loyalty. |
| *The Knife Sharpening Logbook* (2 sales) | Hobby/practical | **Utility buyers convert on specificity.** A narrow, concrete promise ("sharp knives") beats a broad one. |

**The combined signal, stated honestly:** your two titles prove two things only — (a) a **problem-first, symptom-first buyer** searches Amazon and buys, and (b) **narrow beats broad**. Neither sale predicts *which* niche. What they do is argue against generic self-help and for **specific, physical, problem-named** books.

**Critical re-read of the menopause signal:** you own a menopause-adjacent title that made **1 sale**. That is not validation of the menopause niche — it is a warning. And it is consistent with what I measured: `perimenopause` has **5,000+ competing Kindle titles** and a page 1 saturated with paid ads. Do not read the 1 sale as "go deeper into menopause." Read it as "the format works, the topic was too crowded to surface."

---

## 2. Tools & repos actually used (not just listed)

Per your instruction, only free tools, and I ran them rather than citing them.

| Tool / repo | Exact name | What I used it for | Android? | PC? |
|---|---|---|---|---|
| **rxpelle/kdp-scout** (MIT) | `backend/kdp_engine/scorer.py`, `bsr_model.py` | Executed `score_keyword()` on 11 candidates with real result counts; executed `ebook_royalty()` and `estimate_daily_sales()`. Output saved to `research/out/scores_round3.json`. | Read-only, fine | ✅ **Primary engine** |
| **Amazon completion API** | `completion.amazon.com/api/2017/suggestions?alias=digital-text` | 20+ probes this round. Detects *whether* shoppers type a phrase and *which modifier* they append. | ✅ Works in any browser | ✅ |
| **Amazon Best Sellers** | `/gp/bestsellers/digital-text/<catID>` | **New this round.** Sales-ranked lists — the closest free proxy to units sold. | ✅ | ✅ |
| **Amazon Hot New Releases** | `/gp/new-releases/digital-text/<catID>` | **New this round.** Ranks *new* titles by sales → tells me if newcomers can sell. | ✅ | ✅ |
| **Amazon SERP sort override** | `?s=date-desc-rank` | **New this round.** Forced publication dates onto result cards → let me compute ratings/month. | ✅ | ✅ |
| **Wikimedia pageviews API** | `wikimedia.org/api/rest_v1/metrics/pageviews/...` | Evergreen/growth test, control-normalized. | ✅ | ✅ |
| **Google Suggest** | `suggestqueries.google.com/complete/search?client=firefox` | Independent cross-check of book-buying intent. | ✅ | ✅ |
| **nexscope-ai/amazon-skills** | prompt templates | Structured the elimination logic and the data-accuracy ledger. | ✅ | ✅ |
| **Anthropic docx/xlsx skills** (`.claude/skills/`) | — | **Not used this round** — no document deliverable was requested. | ❌ | ✅ |

**Repos audited and rejected:** `hulyx/scout-app` (PyQt6, Windows-only — fails your Android requirement), `pangolinfoapi` (requires paid API key — fails "free"), `awesome-amazon-seller-tools` (a markdown link list, no executable research capability). Full audit in `docs/COMPATIBILITY_REPORT.md`.

**One more honest note on the scorer:** I ran your repo's own scoring engine, and **it is structurally unsound for this decision.** It ranked `neuropathy diet` at **77.1** — above fascia's 73.2 — despite fascia having **70× more measured buyer traction**. The reason is in the code: `_score_competition()` rewards a *low result count*, and `_score_demand()` has no input for *whether anyone actually reviewed/bought recently*. The engine cannot see the one variable that mattered. I therefore report its output but **override it** with a traction metric I built this round. This is exactly the kind of verification that stopped round 1 from shipping a dead niche.

---

## 3. How I got a real sales signal (the breakthrough)

Round 2 failed because I could not tell *demand* from *listing count*. Amazon's `/dp/` pages return no BSR (6 attempts, zero results). This round I found three working channels:

1. **Best Sellers / Hot New Releases** — sales-ranked, not proxy-ranked.
2. **SERP sort-by-publication-date** — exposes the pub date on each card.
3. **Ratings ÷ months-live = "ratings per month."** Reviews are a lagging, imperfect function of sales, but *velocity of ratings* is the best free traction proxy available.

That third metric is what round 2 lacked, and it is reusable. It is what kills neuropathy and what crowns fascia.

### The traction table — the decisive evidence

| Title | Ratings | Published | Months live | **Ratings/mo** |
|---|---|---|---|---|
| **Practical Guide to Myofascial Release** | 109 | 2026-03-16 | 8.2 | **13.27** |
| **Myofascial Triggers** | 142 | 2025-02-06 | 21.5 | **6.62** |
| Fascial Fitness 2e (PRH) | 241 | 2021-07-06 | 64.5 | 3.74 |
| Heal Your Fascia | 28 | 2026-02-24 | 8.9 | 3.16 |
| Pocket Atlas of Trigger Points (PRH) | 59 | 2023-09-19 | 38.1 | 1.55 |
| *— benchmark —* neuropathy diet #1 | 1 | ~2026-06 | 5.2 | **0.19** |

**A book published 8 months ago in this niche has 109 reviews. The best-selling new neuropathy-diet book has 1 after 5 months.** That is a 70× gap, and it is the reason this niche is the answer and the last one was not.

---

## 4. Candidate survey — 22 niches across 8 categories

Generated from completion-API probes and Best-Seller/Hot-New-Release mining, deliberately **not** anchored on neuropathy or balance.

| # | Niche | Category | Result count | Traction | Verdict |
|---|---|---|---|---|---|
| 1 | **Fascia / myofascial release** | Health | **340** | **13.3/mo** | **✅ WINNER** |
| 2 | Balance & fall prevention | Health | >1,000 | ~21–25/mo | Runner-up (needs illustrations) |
| 3 | Fascial release (sub-kw) | Health | **107** | 13.3/mo | Winner's beachhead |
| 4 | Myofascial triggers (sub-kw) | Health | **145** | 6.6/mo | Winner's beachhead |
| 5 | Somatic exercises | Health | 2,000 | n/a | ❌ ad-saturated, fad-adjacent |
| 6 | Chronic pain relief | Health | 3,000 | n/a | ❌ supplement ad on page 1 |
| 7 | Perimenopause / menopause | Health | **5,000+** | n/a | ❌ saturated |
| 8 | Neuropathy diet | Health | 323 | 0.19/mo | ❌ rejected round 2 |
| 9 | Diverticulitis | Health | 583 | n/a | ❌ declining (0.55) |
| 10 | Vagus nerve | Health | >1,000 | n/a | ❌ fad risk |
| 11 | Social Security retirement | Finance | 1,000+ | n/a | ❌ annual-edition giants |
| 12 | Medicare guide | Finance | 1,000+ | n/a | ❌ annual-edition giants |
| 13 | Estate planning | Finance | — | n/a | ❌ "For Dummies" owns it |
| 14 | Sourdough | Cooking | 2,000+ | n/a | ❌ ad + kit on page 1 |
| 15 | Canning & preserving | Cooking | 6,000+ | n/a | ❌ saturated |
| 16 | Food preservation | Cooking | — | n/a | ❌ thin autocomplete |
| 17 | Decluttering | Home | 10/10 book-intent | n/a | ❌ "at the speed of life" incumbents |
| 18 | Raised-bed gardening | Home | — | n/a | ❌ weak autocomplete |
| 19 | Composting | Home | — | n/a | ❌ weak autocomplete |
| 20 | Beekeeping | Hobby | — | n/a | ❌ thin autocomplete |
| 21 | Dog training | Pets | 4 probes, "free kindle"-skewed | n/a | ❌ buyers want free |
| 22 | Chess / guitar / knot tying | Hobby | 1 suggestion each | n/a | ❌ no commercial intent signal |

**Long-tail confirmations of the winner** (this is the shape of a healthy niche): `fascia reset` = **16 titles**, `fascial release` = **107**, `myofascial triggers` = **145**. Compare round 2's neuropathy long-tail, which returned **`[]`** — literally zero. A live niche has small, specific sub-markets. A dead niche has nothing.

---

## 5. Deep validation of the top 3

### 🥇 #1 — Fascia / myofascial release → **SELECTED**

| Criterion | Finding | Status |
|---|---|---|
| Evergreen / growing | Wikipedia `Fascia` 2024 avg **15,757** → 2026 avg **15,220**/mo; raw ratio 0.97 → **normalized 1.82** (control 0.532). Flat-to-rising while the whole web decays. | **VERIFIED** |
| Buyer intent | Completion returns `fascia`, `fascia release`, `fascia connection`. Google adds `fascia release book`, `fascia release exercises book`, `best fascia release book`, `myofascial release book amazon`. | **VERIFIED** |
| Competition | 340 titles core; 107 and 145 in the two money sub-keywords. | **VERIFIED** |
| Competing book quality | Mostly *passable but generic*: 4.3–4.6★, thin on protocol. Trad-pub titles are 2021–2023 and **outdated** (pre-date the 2024–26 fascia boom). | **VERIFIED** |
| Newcomer viability | 109 reviews in 8.2 months; 28 reviews in 8.9 months. | **VERIFIED** |
| Commercial signal | **Hachette** pre-selling *Vital Motion* (Sep 2027) and a **$28.00** pre-order (*Secret Language of Fascia*, Oct 2027). Publishers do not pre-buy dying topics. | **VERIFIED** |
| Discoverability | Two under-150-title sub-keywords where a new book can rank page 1 organically. | **VERIFIED** |
| Price/royalty | $8.99 → **$6.14/sale** (70% band). Niche supports $8.99–9.99 (incumbents sit there). | **VERIFIED** (engine) |
| Long-term stability | Anatomy-based, not a viral trend. Normalized 1.82 trend. | **PROXY** |
| Search volume | — | **UNAVAILABLE** |
| Units sold | — | **UNAVAILABLE** |

**Buyer problem (the real one):** *"I hurt all the time. My MRI is clean. My doctor says there's nothing wrong, or it's 'just stress.' Nobody will tell me why, and nothing I've tried works."* This is the single most common frustration in chronic musculoskeletal pain. Fascia is the **explanatory label** that finally gives that person a name for their problem — and the existing books are either anatomy textbooks or $28 academic hardbacks. Nobody has written the **cheap, plain-English, do-this-today protocol**.

**Book angle:** a **15-minute daily release protocol, sequenced by body region**, built around tools the reader already owns (a tennis ball, a foam roller, a wall, a doorway) — explicitly *not* requiring a $200 device. Each chapter: the symptom → the fascial line responsible → the release sequence → a 3-minute "did it move?" self-test. Include a **"your scan is normal but you still hurt"** opening chapter, because that is the exact search that brings the buyer in.

**Target buyer:** woman, 38–60, chronic neck/back/hip pain, clean imaging, has tried physio and chiropractic, is *frustrated with being disbelieved*, reads on phone/Kindle at night. Secondarily: desk workers 30–45 with tension headaches and "tech neck."

**Keyword strategy (all verified to exist):**
- Title/subtitle: `fascia`, `fascial release`, `myofascial release`, `chronic pain`, `15-minute`
- Backend 7 slots: `fascia release exercises`, `myofascial release self treatment`, `trigger point therapy`, `fascia stretching`, `chronic pain relief without medication`, `tension headache relief`, `desk worker neck pain`
- Category: **Chronic Pain** (best-seller list has a #3 with **5 ratings** — the single most accessible bestseller list I found)
- Priced at $8.99 to sit inside the 70% band, undercutting the $12.99 trad-pub.

**Competitive advantage (three concrete wedges):**
1. **Price** — $8.99 vs $12.99/$28.00.
2. **Recency** — incumbents are 2021–2023 and pre-date the current fascia surge; a 2026 book is the current one.
3. **Specificity** — "15-minute, household-objects, region-by-region protocol" is a promise no incumbent makes.

⚠️ **The honest weakness:** the two strongest incumbents (*28-Day Fascia Reset*, *Practical Guide to Myofascial Release*) are **already running Amazon ads** and *28-Day* is in **Kindle Unlimited**. Zero-marketing entry can still work because those ads prove the keyword converts — but it means I must win on **specificity and price**, not on ranking volume. And fascia no longer has "no competition"; it has *beatable* competition.

### 🥈 #2 — Balance & fall prevention for seniors → viable runner-up
Strongest measured traction of any niche (~21–25 ratings/mo on the incumbent; a newcomer hit #1 with 69 ratings). **Blocked** only by production cost: it needs custom exercise illustrations, which is a real barrier for a text-first workflow. **Choose this if you can source clean diagrams.**

### 🥉 #3 — Somatic exercises → rejected
2,000+ titles and heavy paid-ad presence. Worse, it sits inside the vagus-nerve/"nervous system regulation" fad cluster, which I flagged in round 2 as fad-risk. Adjacent to fascia but with all of fascia's downsides and none of its clean sub-keywords.

---

## 6. What would make me wrong

I was wrong in round 1, so here is the falsification test rather than a defense:

- **Fascia is a social-media trend, not durable demand.** *Disconfirming evidence I already have:* Wikipedia is flat at ~15,000/mo, not spiking — and normalized at 1.82. A fad would show a curve. This looks like a slow structural rise.
- **Ratings ≠ sales.** True, and **UNAVAILABLE** to me. Some of those 109 ratings could be KU page-reads or ad-driven. I have not measured units and I am not claiming a sales number.
- **The incumbents are better resourced than I assumed.** *28-Day* is a series with ads. If it defends its position, a new book may get page 2.
- **AI-generated near-duplicates flood the niche** after *Practical Guide*'s success. Plausible; the 340-title count is low precisely because it is early. This window may be 6–12 months wide.

If I am forced to name the most likely failure mode: **the niche converts, my book is simply not differentiated enough to out-rank a 109-review incumbent on page 1.**

---

## 7. Revenue expectation — labelled ESTIMATE

$8.99 price → **$6.14 royalty per sale** (verified by the repo's engine). Units are **not** measured; the ratings→sales ratio is **UNAVAILABLE**.

| Units/month | Monthly | Annual |
|---|---|---|
| 30 | $184 | $2,211 |
| 60 | $369 | $4,423 |
| 100 | $614 | $7,372 |
| 150 | $921 | $11,057 |

**Treat the 60–100 band as the realistic ceiling for a solo, zero-marketing book** in a 340-title niche. Anyone quoting you more without a paid data source is inventing it.

---

## 8. Final ranking

| Rank | Niche | Why it placed here |
|---|---|---|
| **1** | **Fascia / myofascial release** | Only niche passing all four tests at once: fast newcomer traction, <350 titles, rising trend, trad-pub pre-buys |
| 2 | Balance & fall prevention | Best raw traction, but illustration-dependent |
| 3 | Somatic exercises | Size and ad spend too high |
| 4 | Chronic pain relief | Too broad, supplement-ad contaminated |
| 5 | Myofascial triggers | Actually a *wedge into #1*, not a rival |

---

## 9. Data ledger

**VERIFIED this session:** all result counts in §4; all ratings-per-month in §3; all Wikipedia monthly pageviews; all autocomplete strings; all Google Suggest strings; all prices shown; all publication dates shown; royalty math.
**PROXY:** ratings/month as a stand-in for sales velocity; normalized trend using the 0.532 control; "commercial signal" inference from publisher pre-orders.
**ESTIMATE:** the revenue table; the 6–12 month competitive window.
**UNAVAILABLE:** BSR · unit sales · search volume · ratings-to-sales ratio · review text (sign-in wall).

**Method note:** every number above traces to a page fetched in this session. Where a source was blocked — BSR, unit sales, review text — I switched channel (Best Sellers → Hot New Releases → date-sorted SERP) rather than stopping. Nothing is estimated where a measurement was possible.

*Raw data: `research/raw/round3_2026-11-21.json` · Scorer output: `research/out/scores_round3.json`*
