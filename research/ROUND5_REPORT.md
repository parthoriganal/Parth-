# Round 5 — Zero-Budget Organic Niche Discovery
### Amazon US · branch `arena/8a33cda7-parth` · captures 2026-11-10 UTC · Budget: **$0**
### Book production: **NOT started**

> New: `raw/EVIDENCE_LOG_ROUND5.md`, `data/round5_evidence.csv` (37 candidates),
> `data/round5_ranking.csv`. `tools/rank_niches.py` **extended** with `--input/--output`
> (reused, not duplicated — round-3 output verified byte-identical after the change).
> Rounds 1–4 unmodified.

**Evidence labels used throughout:**
**VERIFIED** = I measured it in this environment ·
**INFERRED** = reasoned from verified data ·
**UNVERIFIED** = no adequate evidence

---

## 0. Verdict

> # NO QUALIFIED WINNER
>
> Rule 3 — high Amazon buyer-intent search **demand** — has now failed verification in **five
> consecutive rounds**, and Round 5 establishes *why* it is structurally unverifiable at $0 rather
> than merely unmeasured.
>
> **Two candidates deserve the label "closest":**
> 1. **End-of-life / final-wishes planner** — the only candidate with *direct measured evidence of
>    real sales* (930 reviews at $9.99 in a category I measured 100 deep) that also passes the new
>    $0 production filter cleanly. **It fails the book-index gate.**
> 2. **Spelling workbook (grade 3)** — the best candidate that *passes* the gate: thinnest measured
>    supply (6,000), three book-index suggestions, curriculum content that is verifiable rather than
>    testable.
>
> Neither has Rule 3 evidence. I am not declaring a winner.

---

## 1. The finding that matters more than the ranking

I applied the new production filter honestly, and it produced an uncomfortable, useful result:

**Documentation niches are disproportionately *product-index* queries.** Of 37 candidates,
**23 (62%) failed the book-index gate** — Amazon redirected the search to physical products. And the
failures were not random: they clustered almost entirely in the documentation/log/organiser space
the filter was designed to favour.

| Filter-favourable cluster | Book-index result |
|---|---|
| notary journal | **PASS** |
| spelling / cursive / anatomy workbooks | **PASS** |
| home maintenance log, password book, inventory log | **PASS** (mostly bare echo) |
| **pet medical record, rental ledger, wine tasting, scuba log, chess scorebook, music practice log, chicken records, coin log, checkbook, birthday reminder, dog record, IEP binder, caregiver medical binder, final wishes planner, in-case-of-death organiser, estate organiser kit** | **ALL FAIL (_fb_)** |

**Why:** when the same document exists as a spiral-bound pad, a folder, a binder or a laminated
card, Amazon routes the query to that product. The catalogue has decided these are *objects*, not
books.

**The consequence is a genuine bind, and it is the most important thing I learned this round:**
the new production filter pushes toward documentation-and-worksheet products, while Rule 3
(buyer-intent book demand) rejects exactly those products. **The filter and the demand rule pull
against each other.** Any future niche search has to satisfy both, which is a much narrower target
than either rule alone suggests.

---

## 2. Production-filter screening (applied before ranking)

**Excluded outright — would require testing, credentials or liability:**

| Candidate | Filter triggered | Why |
|---|---|---|
| Medical terminology workbook | **Professional certification / clinical validation** | Sponsored incumbents are **M.D.-authored with 6K and 1.7K reviews**, one claiming 100,000+ copies sold (VERIFIED). Factual error in medical content is a real-harm risk |
| Anatomy coloring book | **Expensive equipment / illustration cost** | Needs professional anatomical illustration; not $0 |
| Pressure canning, herbal, foraging (r3) | Laboratory/ safety testing | Already excluded |
| Sourdough cookbook (r4) | Physical recipe testing | Excluded round 4 |

**Admitted — value is research/documentation/structure:** notary journal, spelling workbooks,
cursive workbook, genealogy organiser, home maintenance log, password book, inventory log,
end-of-life planner, IEP binder, caregiver binder, estate workbook.

---

## 3. Reuse audit (requested)

**Existing repository — reused, not rebuilt:**

| Asset | Verdict | Action |
|---|---|---|
| `backend/kdp_engine/autocomplete.py` | Amazon autocomplete miner | **Not reused** — requires network; sandbox egress blocked (verified: `curl` → 000, TLS EOF). Documented, not duplicated |
| `backend/kdp_engine/product_scraper.py` | **Broken** — selector `#detailBullets_feature_div` no longer matches live Amazon | Not reused; BSR extraction stays unavailable |
| `backend/kdp_engine/bsr_model.py` | Unvalidated k/a constants | **Deliberately not used** — would fabricate sales figures |
| `backend/kdp_engine/profit.py` | KDP royalty maths | Reusable later for pricing; not needed this round |
| `backend/kdp_engine/content_gap.py` | TOC/keyword gap analysis | Reusable at production stage |
| `backend/kdp_engine/scorer.py` | 5-pillar composite | Superseded by `research/tools/rank_niches.py`, which is transparent and auditable |
| `research/tools/autocomplete_demand_index.py` | Book-index gate + ordinal score | **Reused** — the `_i_` vs `_fb_` discriminator is the core instrument this round |
| `research/tools/rank_niches.py` | Weighted rubric + gate | **Reused and extended** with `--input/--output` rather than cloned |
| `research/tools/recipe_test_ledger.py` | Anti-fabrication gate | Not applicable (no recipes in shortlist) |

**The 38 `.claude/skills/` packs: inspected, not usable.** They are anthropic (20), nextlevelbuilder
(7) and youtube-agent (11) skill definitions — writing/agent/YouTube tooling. **None is an Amazon or
KDP research capability** (VERIFIED by directory listing). No pretence otherwise.

**New free libraries needed only at production stage** (audited last round, all free):
WeasyPrint (BSD-3) / reportlab (BSD) for worksheet PDFs; LanguageTool (LGPL-2.1, licence caveat) or
Vale for proofreading; textstat (MIT) for readability of instructions; pint (NOASSERTION/BSD-family)
and pypdf.

---

## 4. Final ranking — top 10

Weights: organic 20% · evergreen 20% · **demand 25%** · competition 15% · differentiation 10% ·
confidence 10%. Full machine output in `data/round5_ranking.csv`.
**Organic/evergreen/demand/differentiation are rubric judgements; competition and confidence are
computed from measured fields.**

| # | Niche | Buyer-intent keywords | Demand evidence | Competition | Organic discoverability | Evergreen | Production at $0 | Differentiation | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Spelling workbook (grade 3)** | `spelling workbook grade 3`, `spelling workbook grade 2` | **INFERRED** — no rank captured | **VERIFIED 6,000** (thinnest) | **VERIFIED** 3 book-index suggestions | **VERIFIED** structural (compulsory schooling) | **Easy** — curriculum is verifiable, no testing | Medium — 36-week structured programme vs random lists | Medium |
| 2 | **Medical terminology workbook** | `medical terminology`, `… for health professions` | **VERIFIED** 6K & 1.7K review incumbents | **VERIFIED 20,000+** | **VERIFIED** 3 suggestions | High | **EXCLUDED** — credential + harm | — | — |
| 3 | **Notary journal** | `notary journal`, `notary journal log book` | **UNVERIFIED** — no rank | **VERIFIED 20,000+** | **VERIFIED** 2 suggestions | **VERIFIED** structural (commission cycles) | **Easy** — pure documentation | Low — blank journal; state-law field risk | Medium |
| 4 | **Home maintenance log book** | `home maintenance log book` | **VERIFIED** leader 4.6/**1.3K** $14.99 | **VERIFIED 50,000+** | **VERIFIED** 1 suggestion (extended) | High | Easy | **Low** — leader is spiral-bound; KDP eq. at $6.99/12 rev | Medium |
| 5 | **Cursive handwriting workbook** | `cursive handwriting workbook`, `… for adults`, `… for teens` | **UNVERIFIED** | **VERIFIED 40,000+** | **VERIFIED** 3 suggestions (richest) | Medium-High | Easy — letterform practice is verifiable | Medium — adult/teen re-learning angle | Medium |
| 6 | **Password book (large print/seniors)** | `password book`, `password books for seniors` | **UNVERIFIED** | **VERIFIED 60,000+** | **VERIFIED** 3 suggestions | High | Easy | Low — hardcover brand owns shelf | Medium |
| 7 | **Inventory log book** | `inventory log book` | **UNVERIFIED** | **VERIFIED 50,000+** | **VERIFIED** bare echo only | Medium | Easy | **Very low** — spreadsheets substitute | Medium |
| 8 | **Anatomy coloring book** | `anatomy coloring book` | **UNVERIFIED** | **UNVERIFIED** | **VERIFIED** 1 suggestion | High | **EXCLUDED** — illustration cost | — | Low |
| 9 | **Genealogy research organizer** | `genealogy`, `genealogy books` | **UNVERIFIED** | **UNVERIFIED** | **VERIFIED** 2 suggestions | High | Easy | Medium — record-checklists per record type | Low |
| 10 | **End-of-life / final wishes planner** ⚠ | `final wishes planner`, `estate planning organizer` | **VERIFIED** — #54 of Aging Parents, **4.3 / 930 reviews / $9.99**, self-published | **VERIFIED 9,000+** + funded brand ads | **FAILED** — `_fb_` product fallback | **VERIFIED** — mortality | **Easiest of all** — pure worksheets, zero testing | **High** — digital-asset + state-document checklists | Medium |

⚠ **Rank 10 is a ranking artefact, not my judgement.** The model zeroes `organic_score` on a gate
failure, which is usually right but demonstrably **too harsh here**: this niche has something no
other candidate has — *measured sales of a self-published book at the target price*. A keyword gate
is a proxy; 930 reviews are an observation. I flag the divergence rather than quietly re-rank.

---

## 5. The two finalists, examined honestly

### 5.1 End-of-life / final-wishes planner — best demand, gate failure

**For (VERIFIED):**
- **#54 in Best Sellers > Aging Parents (node 11352): "My Final Wishes Planner", 4.3 ★, 930 reviews, $9.99** — measured in round 2 across pages 1–2 of a 100-deep list.
- 930 reviews on a self-published planner is proof that *this exact product type sells at volume without a trade publisher*.
- Pure documentation and worksheets — **passes the $0 filter perfectly**. No testing, no equipment, no credentials, no photography.
- 9,000+ competing titles (VERIFIED) — real competition, but a fifth of the password-book field.

**Against:**
- **Fails the book-index gate** (`final wishes planner` → product fallback). A funded brand, *Planners with Purpose*, buys sponsored ads on the exact phrase (VERIFIED).
- **Rule 3 still unverified** — I have rank and review evidence, not demand volume.
- Content risk: estate law is state-specific and changes; must be carefully framed as forms/checklists, not legal advice.

**Would need:** volume confirmation, and a differentiation wedge. The credible one is **digital-asset inventory** (accounts, subscriptions, crypto, password-manager handover) — the 2020-era planners predate it, and it is documentary, not testable.

### 5.2 Spelling workbook (grade 3) — best gate-passing candidate

**For (VERIFIED):** thinnest measured supply this round at **6,000**; **three** book-index suggestions including grade-specific variants; evergreen by construction (compulsory schooling, annual cohorts); content is **verifiable rather than testable** — word lists and grade expectations are researchable public curriculum facts, so no kitchen/lab equivalent exists.

**Against:** no rank or velocity evidence captured (**UNVERIFIED** demand); Scholastic Panda Education runs a sponsored grade 1–4 storefront (VERIFIED), so ad spend is present; free printable worksheets are a direct substitute; one grade = one narrow buyer cohort per child. Competing on structure (a sequenced 36-week programme) is a real but modest edge.

---

## 6. Rule-by-rule, and why "no winner" is the honest output

| Rule | Best available evidence | Status |
|---|---|---|
| **1. Sales without marketing** | End-of-life planner: 930-review self-published book at $9.99 | **INFERRED, not verified** — proves the *product* sells; the niche also carries sponsored ads, so organic-only is unproven |
| **2. Evergreen** | Mortality, compulsory schooling, notary commission cycles, homeowner maintenance | **VERIFIED as structural** — the one rule free data can genuinely settle |
| **3. High buyer-intent search demand** | No volume figure obtainable from any free source in 5 rounds | **UNVERIFIED — structurally, not incidentally** |

Round 5 removes the last hope that this was a tooling problem: Amazon's own volume data
(Product Opportunity Explorer / Brand Analytics) is **free but gated** behind a Professional seller
account, and every free third-party "estimator" is an ordinal score by its own documentation.

**Therefore: NO QUALIFIED WINNER.** I will not convert a 930-review observation into a demand
verdict, and I will not pick the top of a C-range table and call it a win.

---

## 7. Skepticism about my own work

Three things I could be wrong about, stated plainly:

1. **The book-index gate may be over-weighted.** It is a *keyword* signal. §4 rank 10 proves it can
   demote a niche with measured sales. I kept it as a hard gate for consistency with rounds 3–4, but
   it deserves less authority than an observation of 930 reviews.
2. **SERP counts are not demand** — I have said this every round and the ranking still uses them as a
   competition proxy. That is legitimate for *competition*, not for *demand*, and the table keeps the
   distinction explicit.
3. **Reviews are not sales.** 930 reviews ≠ a monthly sales figure. I have never converted it, and
   the review-to-sale ratio for low-content books is unpublished — which is exactly why Rule 3
   remains open.

---

## 8. Recommendation

**Do not start a book.** Two defensible next moves, both $0:

1. **If you hold an Amazon Professional seller account**, Product Opportunity Explorer gives real
   search-volume trends at no extra cost. Three queries would settle this: `final wishes planner` /
   `estate planning organizer`; `spelling workbook grade 3` / `grade 2`; `notary journal`. That is the
   only first-party volume data that exists, and it is the single unlock for Rule 3.
2. **If you do not**, then stop treating Rule 3 as satisfiable and make the call explicitly as a
   judgement: the end-of-life planner is the strongest documentary product with observed sales, and
   the spelling workbook is the strongest gate-passing one. I can argue either; I will not disguise
   either as verified demand.

**Position I would defend:** the end-of-life planner is the better commercial bet *on the evidence
that exists* (real sales, real price point, zero production cost, clear modern wedge). Its failure is
a keyword-routing artefact, not a market fact. But it is **not** a validated winner, and I am not
calling it one.

---

### Evidence files
- `research/raw/EVIDENCE_LOG_ROUND5.md` — every capture, verbatim
- `research/data/round5_evidence.csv` — 37 candidates, all scoring inputs
- `research/data/round5_ranking.csv` — machine ranking
