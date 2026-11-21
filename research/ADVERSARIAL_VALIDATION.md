# Adversarial Validation — Final Verdict
**Date:** 2026-11-21 · **Target under test:** "Peripheral Neuropathy Diet & Self-Management" (my round-1 recommendation)
**Method:** attempt to disprove. New evidence gathered: product-page review velocity, also-bought competitor strength, long-tail autocomplete probes, normalized trend for a new challenger, Google book-intent modifiers.

---

# VERDICT: ❌ **FAIL**

**Do not publish this book.** My round-1 recommendation was built on a flawed inference, and the disconfirming evidence was available all along. Details below — including what I got wrong.

**Overall status: NO NICHE REACHES "VERIFIED WINNER."** One alternative (Balance & Fall Prevention) has the only genuine commercial-traction evidence in the study, but it is materially more competitive and needs illustrated content. It is a *better candidate*, not a validated one.

---

## 1. The fatal error in round 1

I treated **"#1 ranking with 1 review"** as proof of *weak competition*. It is equally consistent with **no buyers** — and I never tested which. So I tested it via **review velocity** (ratings accrue roughly in proportion to sales).

| Book | Position / date | Global ratings | Months live | **Ratings / month** |
|---|---|---|---|---|
| **The Simple Neuropathy Diet** | **#1 on `neuropathy diet`** · Jun 2026 | **1** | 5.2 | **0.19** |
| **Neuropathy Nutrition Protocol for Seniors** | #2 · Aug 2026 | **1** | 3.5 | **0.28** |
| Peripheral Neuropathy Diet Cookbook | #1 on `neuropathy cookbook` · Nov 2024 | 4 | 24.5 | **0.16** |
| Peripheral Neuropathy CURE GUIDE | #2 · Jul 2025 | 2 | 16.2 | **0.12** |
| Practical Guide to Peripheral Neuropathy | #1 on `peripheral neuropathy` · May 2025 | 52 | 17.9 | **2.90** |
| Defeat Neuropathy Now! | also-bought · 2016 | 297 | ~131 | **2.27** |
| Peripheral Neuropathy (AAN Press) | also-bought · 2011 | 355 | ~191 | **1.86** |
| You Can Cope With Peripheral Neuropathy | also-bought · 2011 | 121 | ~191 | **0.63** |

### What this proves
**Five months at #1 on a commercial keyword produced one rating.** In the *diet/cookbook* sub-segment, the best-performing book yields **0.12–0.28 ratings/month**. The weakness I found is not an opportunity — **it is the market telling us it doesn't buy this book.**

**Second failure:** the books with real traction (1.86–2.90 ratings/mo) are **general neuropathy guides**, a different sub-niche that I explicitly dismissed in round 1 on autocomplete grounds. So the sub-niche I picked is the one where nobody buys, and the one where people do buy is the one I rejected.

### Caveats on this method (stated honestly)
Ratings ≠ sales. Only ~1–3% of buyers rate; Amazon shows "global ratings," not purchases. Velocity is a **directionally reliable proxy, not a sales figure.** I could **not** retrieve BSR — Amazon's product pages would not expose the Best Sellers Rank at any chunk offset I tried. **No BSR or unit-sales number is claimed anywhere in this document.**

---

## 2. The "no competition" claim was also false

From the also-bought carousels on the two #1 neuropathy diet books:

| Competitor | Ratings | Kindle price |
|---|---|---|
| Peripheral Neuropathy (AAN Press) | **355** | $9.99 |
| Defeat Neuropathy Now! | **297** | $12.97 |
| You Can Cope With Peripheral Neuropathy | **121** | $9.99 |

**773 cumulative ratings** across three established incumbents — while my $9.99 price point is exactly where they sit. Round 1 said "provably weak page-1 incumbents." That was wrong; it looked only at the 4 newest titles.

---

## 3. Long-tail keywords: neuropathy's is EMPTY

Attempting to find 10+ underserved keywords for a series — every probe returned **nothing**:

| Amazon probe (Kindle dept) | Result |
|---|---|
| `neuropathy diet meal…` | **[] empty** |
| `neuropathy for seniors…` | **[] empty** |
| `neuropathy symptom…` | **[] empty** |
| `diabetic neuropathy diet…` | **[] empty** |

Only the bare head term `neuropathy diet` has demand. **There is no series to build and no long-tail to hide in** — the opposite of what round 1 implied.

*(Cross-check: Google suggest has `peripheral neuropathy diet book`, `…diet plan`, `…cookbook` — but Amazon, where the sale happens, offers no expansion. Google intent ≠ Amazon purchase.)*

---

## 4. Book-intent & ebook suitability

- ✅ `neuropathy` returns Amazon suggestions **in the Kindle department** (`digital-text`) — a real book query exists.
- ❌ But `neuropathy diet` returns alias **`aps`** (all-departments fallback) — the purchase query is **product-skewed**, competing with supplements and pain rubs. Amazon actively served me a *Bromelain capsule ad* on `neuropathy`.
- ❌ Both #1 books are filed under **"Cookbooks, Food & Wine"** — recipe books, not the self-management guide I proposed. My positioning doesn't match where the buyers are filed.
- ⚠️ "CURE GUIDE," "Reversing neuropathy," "Defeat Neuropathy Now" — the segment rewards **cure claims**, which are both unsafe and unsubstantiable for a neuropathy book.

---

## 5. Unique value beyond free medical info?

Weak. Diet-for-nerve-pain content is substantially covered free (Mayo/ NHS/ AAN patient materials) and by 3 established books plus the AAN Press title. The honest differentiators available — *practical* symptom management, a safety-first framing that refuses cure claims, and navigating care — are real but **thin**, and they cut against what the segment's bestsellers sell. This is a partial pass at best.

---

## 6. Evergreen? Partly — but not the deciding factor

Normalized (control baseline 0.532): peripheral-neuropathy interest = **1.32 (growing)**, vs vagus nerve 1.50, menopause 1.12, POTS 1.04, tinnitus 1.01, **diverticulitis 0.55 (declining)**, histamine 0.71.
Structurally evergreen (ageing population). ✅ But **medically important ≠ commercially viable** — and traction (above) shows the demand doesn't convert into book sales at this positioning.

---

## 7. The user's 3 sales: worth ~nothing

**1 menopause sale + 2 logbook sales carry essentially zero evidentiary weight.** n=3. A 2-vs-1 split is pure noise. These are consistent with any niche at rank ~500,000.

What they legitimately support is **process** information only: *the account can surface organically without ads, and the listings are discoverable at all.* They say nothing about which niche to enter. Round 1 correctly refused to over-generalize here — and I should apply the same standard to my own pick rather than let a 2:1 split quietly shape the thesis.

---

## 8. Re-scored: top 3 alternatives, same methodology

Repo's `scorer.py`, verified inputs only — then a traction overlay the scorer has no pillar for.

| | Niche | Amazon results | Scorer /100 | Trend (normalized) | **Traction (ratings/mo)** | Verdict |
|---|---|---|---|---|---|---|
| — | ❌ *Peripheral neuropathy diet* | 323 | 72.7 | 1.32 ✅ | **0.12–0.28 ❌ no buyers** | **FAIL** |
| **1** | **Balance & fall prevention (seniors)** | over 1,000 | **81.1** | unverified | **25.2 / 3.5 ✅✅ strongest** | **Best remaining candidate** |
| 2 | Vagus nerve reset | over 1,000 | 69.5 | 1.50 ✅ | unverified | Reject — fad risk, 1,000+ |
| 3 | Diverticulitis diet | 559 | 72.8 | **0.55 ❌ declining** | unverified | Reject — demand falling |

**Why Balance & Fall Prevention now leads.** It has the only *measured* commercial traction in the entire study: the #2 title holds **697 ratings in 27.7 months = ~25 ratings/month**, implying tens of thousands of units sold. A new 6-book series title reached **#1 with 69 ratings** (~3.5/mo) — so a newcomer *can* penetrate. Google shows explicit book modifiers (`balance exercises for seniors book`, `5 minute…book`, `10 minute…book`). Scorer agrees: 81.1, highest.

**Honest objections to it:** over 1,000 competitors; the incumbent is formidable; it **requires illustrations/photos** (my round-1 plan assumed figure-free text); and — critically — its trend is **unverified**. It's also close to a "workbook," so it must be a genuine prose exercise guide with figures to fit your constraint.

---

## 9. What I got wrong, plainly

1. **Equated "low reviews" with "opportunity."** It can equally mean "no demand." This was the central error and it inverted the conclusion.
2. **Sampled only the 4 newest results**, missing incumbents with 121–355 ratings.
3. **Assumed long-tail depth** without probing it. Neuropathy's is empty.
4. **Let the repo's scorer carry the decision** — it has pillars for demand/competition/intent but **no pillar for whether anyone actually buys**. A 72.7 score is meaningless if traction is 0.2/mo. I should have built that overlay first, not last.
5. **Downweighted book-intent alias `aps`** when it was a real warning.

---

## 10. Recommendation

- **Do not write "Peripheral Neuropathy Diet & Self-Management."** ❌
- **If you want the best-evidenced path:** test **Balance & Fall Prevention for Seniors** with the same cheap 21-day lead-in — but budget for illustrations and expect to fight a strong incumbent. **Do not commit to a series before the test.**
- **If you're unwilling to produce illustrated exercise content**, then on current evidence the answer is **NO VERIFIED WINNER** — and I'd rather tell you that than hand you a book with a 0.2-ratings/month market.

**The test that matters, for any niche:** publish short, price at $4.99, and measure **units per 1,000 impressions** in KDP Reports for 21 days. Review velocity told us a lot here, but only your own impression data converts this from proxy to fact.

*New measurements: `research/raw/adversarial_2026-11-21.json`*
