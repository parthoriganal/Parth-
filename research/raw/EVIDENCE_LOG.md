# Raw Evidence Log — Amazon US, accessed 2026-11-10 (UTC)

All rows captured during this research session. **Status legend:** MEASURED (read directly off
Amazon) · UNAVAILABLE (could not be obtained) · INFERRED (judgement, not a number).

Sandbox constraint: bash egress in this environment is allowlisted to GitHub / PyPI / npm only,
so `www.amazon.com` returns HTTP 000 via `curl`. **The repo's own `backend/kdp_engine`
scraper could therefore not be executed here.** All Amazon observations below were made through
the agent's page-fetch layer against live amazon.com URLs, which is why they are still first-party
Amazon data rather than third-party estimates.

---

## A. Endpoints that worked

| Endpoint | Result | Status |
|---|---|---|
| `completion.amazon.com/api/2017/suggestions?mid=ATVPDKIKX0DER&alias=stripbooks&prefix=…` | Live JSON keyword suggestions, US marketplace, print-books (`stripbooks`) department | MEASURED |
| `www.amazon.com/s?k=…&i=stripbooks` | Live SERP with result-count string (`1-24 of over N results`) | MEASURED |
| `www.amazon.com/s?k=…&i=stripbooks&s=exact-aware-popularity-rank` | SERP sorted by sales rank (Amazon's own ordering) | MEASURED |
| `www.amazon.com/gp/bestsellers/books/{node}` | Live Best Sellers list, ranks 1–50 | MEASURED |
| `www.amazon.com/gp/new-releases/books/{node}` | Live Hot New Releases list | MEASURED |
| `www.amazon.com/dp/{ASIN}` | Title, price, formats, rating count, review count, pub date, page count, breadcrumb category | MEASURED (partial) |

## B. Endpoints that did NOT work — and what that costs the analysis

| Endpoint | Result | Consequence |
|---|---|---|
| Amazon product-page **BSR number** ("Best Sellers Rank: #12,345 in Books") | Not present in fetched HTML — Amazon renders the detail-bullets block client-side. Also `product_scraper.py`'s selector `#detailBullets_feature_div` never matched. | **Exact BSR values are UNAVAILABLE.** I substituted *category bestseller rank position* and *review counts* as demand proxies. |
| `product-reviews/{ASIN}` (review text) | Redirects to `ap/signin` — reviews require login | **Customer complaint text is UNAVAILABLE.** Qualitative "voice of customer" is therefore marked INFERRED, never quoted. |
| `trends.google.com/trends/api/explore` | HTTP **429 Too Many Requests** | **Google Trends seasonality not obtained.** Seasonality resting on structural argument only. |
| `completion.amazon.com` with 2+ word prefixes | Returns only 1–3 suggestions for these book queries (Amazon's book-department autocomplete is sparse) | Autocomplete is used as a *presence/absence* signal for long-tail phrases, **not** as a volume ranking. No volume is inferred from autocomplete position. |
| DataForSEO | No API key present in `backend/.env` | No third-party Amazon search-volume figure available. **No volume number is reported anywhere in this report.** |

---

## C. Autocomplete captures (US, `stripbooks`, 2026-11-10)

Verbatim suggestion values returned. Count shown because sparsity is itself informative.

| Query prefix | Suggestions returned | Notable long-tail surfaced |
|---|---|---|
| `blood pressure` | 5 | `blood pressure log book` (#2) |
| `blood pressure log` | 1 | `blood pressure log book` |
| `blood pressure log book` | 1 | exact-match echo |
| `blood sugar` | 3 | `blood sugar log book` (#1) |
| `diabetes` | 3 | `diabetes log book` |
| `medication log` | 1 | `medication log book` |
| `medication tracker` | 1 (all-dept) | `medication tracker log book` |
| `caregiver` | 1 | bare term only |
| `caregiver log` | 1 (all-dept) | `caregiver log book planner` |
| `aging parents` | 1 (all-dept) | **`aging parents caregiver handoff`** |
| `caregiver handoff` | 1 (all-dept) | **`caregiver handoff workbook`** |
| `dementia` | 4 | `dementia activity book`, `dementia coloring book` |
| `vital signs` | 1 | bare term |
| `senior` | 3 | dev/product terms, no book term |
| `elderly` | 1 | product term, no book term |
| `fishing log` | 1 | `fishing log book` |
| `hunting log` | 1 (all-dept) | `hunting log journal personalized` |
| `mileage` | 1 | `mileage log book` |
| `car maintenance` | 1 | bare term |
| `garden` | 10 | `garden journal` (#4) |
| `reading journal` | 1 | bare term |
| `reading log` | 1 | `reading light` (product; query drift) |
| `wedding planner` | 1 | bare term |
| `gratitude journal` | 4 | for women / kids / men |
| `prayer journal` | 4 | for women / men / kids |
| `food journal` | 1 | bare term |
| `habit tracker` | 1 | bare term |
| `budget planner` | 2 | `budget planner with posits` |
| `adhd planner` | 2 | `adhd planner for women` |
| `dbt workbook` | 3 | for teens / adults |
| `weight loss journal` | 1 | bare term |
| `sourdough` | 10 | `sourdough cookbook`, `sourdough discard recipes cookbook` |
| `dog training` | 2 | `dog training book` |
| `guitar` | 10 | `guitar chords`, `guitar for dummies` (rest = hardware) |
| `toddler activity` | 2 | `toddler activity book` |
| `workbook` | 3 | `workbook for 3 year old`, `workbook for adults` |
| `log` | 10 | **dominated by Logitech hardware** — "log book" is not a head term |
| `seizure` | 1 (all-dept) | `seizure emergency kit` (product) |

## D. SERP result counts (`1-24 of over N results`, `i=stripbooks`, 2026-11-10)

| Query | Amazon's count phrase | Status |
|---|---|---|
| `blood pressure log book` | over **50,000** | MEASURED |
| `blood pressure log book large print` | over **10,000** | MEASURED |
| `blood pressure and medication log book` | over **10,000** | MEASURED |
| `blood sugar log book` | over **50,000** | MEASURED |
| `medication log book` | over **30,000** | MEASURED |
| `mileage log book` | over **50,000** | MEASURED |
| `caregiver log book` | over **20,000** | MEASURED |
| `aging parents caregiver log book` | over **3,000** | MEASURED |
| `caregiver binder` | over **1,000** | MEASURED |
| `caregiver handoff binder` | **181** | MEASURED |

> Result counts are a **title-density** metric, not demand. High counts indicate a crowded
> keyword field. They are reported for competition analysis only.

## E. Category bestseller ranks (sales-ordered, 2026-11-10)

### E1. Health-log cluster — Books › Medical › Nursing › **Nursing Home Care (node 227657)**

| Rank | Title | Reviews | Price | Format |
|---|---|---|---|---|
| #1 | Blood Pressure Log Book: Large Print (HA & S0 Publishing) | 318 | $9.99 | PB |
| #2 | Tai Chi & Chair Yoga for Seniors Over 60 | 23 | $0.99 | Kindle |
| #3 | Jumbo Autumn Word Search for Seniors | 16 | $14.99 | PB |
| #4 | Memories: Memory Lane 1960s (dementia picture book) | 128 | $10.99 | PB |
| #5 | Fall Prevention Balance Exercises For Seniors | 686 | $14.99 | PB |
| #6 | Blood Pressure Log Book: Large Print (Eden Paul) | 25 | $9.99 | PB |
| #7 | Mosby's Textbook for Nursing Assistants | 92 | $63.03 | PB |
| #8 | Vital Signs Log Book | 25 | $7.99 | PB |
| #9 | Wound Care QuickStudy | 310 | $6.48 | pamphlet |
| #10 | Medication & Vital Signs Log Book (Eden Paul) | 84 | $9.99 | PB |
| #11 | Blood Sugar Blood Pressure Log Book | — | — | PB |

**Read:** 5 of the top 11 category bestsellers are consumer health log books. This category is
*owned* by log books — strong demand signal. It is also where the incumbents live.

### E2. Caregiver cluster — Books › Parenting & Relationships › **Aging Parents (node 11352)**

| Rank | Title | Reviews | Price | Type |
|---|---|---|---|---|
| #1 | The Year-Long Retirement Devotional for Women | 519 | $14.81 | PB devotional |
| #2 | Crap I'll Forget Unless I Write It Down | 369 | $6.99 | humor notebook |
| #3 | Two Women Walk into a Bar | 12,739 | $1.99 | Kindle memoir |
| #4 | 99 Ways Not to Become a Grumpy Old Man | 92 | $14.95 | humor |
| #5 | Trivia For Seniors | 382 | $14.14 | PB |
| #6 | I Remember That! (senior trivia) | — | — | PB |

**Read:** **no caregiver organizer/log/navigator appears in the top 6.** The category's sales are
humor, trivia, devotionals and memoir. The organizer buyer is present in the category but the shelf
is not yet occupied by organizers.

### E3. Aging Parents — **Hot New Releases** (new-entrant behaviour)

| Rank | Title | Reviews | Price |
|---|---|---|---|
| #1 | 100 Ways Not To Become a Grumpy Old Lady | 92 | $13.99 |
| #2 | The Dementia Care Toolkit (trade publisher) | 18 | $21.95 |
| #3 | The Midlife Edit | 16 | $19.99 |
| #4 | A Guide to Navigating the Alzheimer's Journey | — | $0.99 Kindle |
| #5 | Get It Together: Organize Your Records So Your Family Won't Have To | 12 | $26.96 |
| #6 | Daughters Caring for a Parent with Dementia | 18 | — |

**Read — the most important table in this report:** brand-new titles reach top-6 new-release
position in this category with **12–18 reviews**. Compare the flat market: Books #1 = 469 reviews,
Books #2 = 1,703, Self-Help #1 = 1,063. In Aging Parents, single-digit-to-low-double-digit review
counts buy visibility — which is precisely the entry condition an unmarketed KDP paperback needs.

### E4. Flat-market calibration (proxy for how hard top-of-category is elsewhere)

| List | #1 | #2 | #3 |
|---|---|---|---|
| Best Sellers in Books | Dog Man #15 (469) | Diary of a Wimpy Kid #21 (1,703) | Contend (1,063) |
| Best Sellers in Self-Help | Contend (1,063) | Let Them Theory (49,670) | Atomic Habits (150,451) |

These are calibration anchors only; they are trade titles, not KDP comparables.

## F. SERP competitor detail (sales-rank sorted where noted)

### `caregiver log book` — sorted by `exact-aware-popularity-rank` (Amazon's own sales ordering)

| Pos | Title | Reviews | Price |
|---|---|---|---|
| 1 | Caregiver Daily Log Book (Ken Mihara) | 123 | $8.99 |
| 2 | Medication Log Book: Large Print | 90 | $9.99 |
| 3 | Caregiver Daily Log Book: Medical Journal Organizer | 20 | $9.99 |
| 4 | Caregiver Daily Log Book (Data Savy) | 147 | $8.98 |
| 5 | Caregiver Daily Log Book: Care Journal | 0 | $5.88 |

### `caregiver handoff binder` — 181 results total

| Pos | Title | Reviews | Price | Pub |
|---|---|---|---|---|
| 1 | The Caregiver's Paperwork Binder | **2** (rating 1.5★) | $16.99 | Aug 14 2026 |
| 2 | Caregiver Shift Handoff Log Book for Aging Parents | 0 | $9.99 | Aug 23 2026 |
| 3 | Caregiver Medical Binder Workbook | 0 | $15.99 | May 11 2026 |

### `aging parents caregiver log book` — over 3,000 results

| Pos | Title | Reviews | Price | Pub |
|---|---|---|---|---|
| 1 | Aging Parent Caregiver Log (Andre Edwards) | 0 | $12.99 | Sep 28 2026 |
| 2 | Caregiver Daily Log Book (Data Savy) | 147 | $8.98 | Jul 29 2021 |
| 3 | Caregiver Daily Log Book for Aging Parents (Claire A. Lawson) | 0 | — | Sep 10 2026 |

**Read:** the #1 organic position on the exact long-tail query is held by a **zero-review,
September-2026 self-published title**. That is direct measured evidence that this sub-niche is
enterable without ad spend — and also that it is filling up fast (three of the top three published
within five months).

### `caregiver binder` — 1,000+ results

| Pos | Title | Reviews | Note |
|---|---|---|---|
| 1 | Personal Health Record Keeper and Logbook (Peter Pauper Press, 2015) | **1.6K** | trade legacy item, *not* a caregiver-handoff product |
| 2 | Caregiver Daily Log Book | 123 | generic daily log |
| 3 | Caregiver Daily Log Book: Medical Journal Organizer | 20 | |

**Read:** the review count at #1 is not a competitor. It is a different product (a personal health
record book from 2015) ranking on partial match. Dedicated caregiver binders carry 0–2 reviews.

### `blood pressure log book` — the incumbent wall (comparison case)

* Eden Paul, "Simple Blood Pressure Log Book" — **1,499 reviews**, $8.99 — running a **sponsored brand ad** on this exact query.
* B0CYXT5CSW — **750 reviews**, $7.99, carries **Amazon's Choice** badge.
* HA & S0 Publishing — **318 reviews**, $9.99, **#1 bestseller** in Nursing Home Care.
* Eden Paul operates **≥3 near-duplicate variants** in this one keyword (B09HFT9H9D $8.99, B0FJXBK9ZG $9.99, B09J7MK8RL $9.99) plus a hardcover at $14.99.
* A third publisher (SimpleSpark) launched a variant in Jan 2026 and reached 44 reviews.

**Read:** entering "blood pressure log book" cold means competing with a 1,499-review incumbent that
is *also paying for ads*, an Amazon's-Choice title, and a publisher flooding the field with variants.
Organic page-1 placement without marketing is not a realistic expectation.

## G. Product-page details captured (MEASURED)

| ASIN | Detail |
|---|---|
| B0GKVS5L5P | 4.8★ / 44 reviews · Paperback $9.99 (Hardcover $14.99) · 120 pages · pub 2026-01-28 · 8.5×11 in · "RN-Designed Health Tracking Series (5 books)" · breadcrumb: Books › Medical Books › Medicine › Internal Medicine › Pathology › Diseases › Cardiovascular |
| B09HFT9H9D | 4.7★ / 1,499 reviews · Paperback $8.99 · 110 pages · 6×9 in · Eden Paul |
| B09J7MK8RL | 4.7★ / 84 reviews · Paperback $9.99 · 100 pages · 8.5×11 in · Eden Paul |

Note publisher series behaviour: SimpleSpark shipped **5 books** in one series. Series/shelf-building
is the actual competitive moat in this space, not a single title.
