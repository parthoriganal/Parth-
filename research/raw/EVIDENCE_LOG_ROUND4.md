# Raw Evidence Log — Round 4 (sourdough discard feasibility), 2026-11-10 UTC

Append-only. Rounds 1–3 logs unmodified. Legend: MEASURED / ESTIMATED / INFERRED / UNAVAILABLE.

---

## A. Autocomplete — the five proposed directions

All probed with `alias=stripbooks`, `mid=ATVPDKIKX0DER`.

| Prefix | alias returned | Suggestions | Status |
|---|---|---|---|
| `sourdough discard` | stripbooks | `sourdough discard recipes cookbook` | MEASURED |
| `sourdough discard recipes` | stripbooks | `sourdough discard recipes cookbook` | MEASURED |
| `sourdough discard breakfast` | stripbooks | **[] EMPTY** | MEASURED (zero) |
| `sourdough discard savory` | stripbooks | **[] EMPTY** | MEASURED (zero) |
| `sourdough discard quick` | stripbooks | **[] EMPTY** | MEASURED (zero) |
| `sourdough discard for beginners` | stripbooks | **[] EMPTY** | MEASURED (zero) |

**Exactly one buyer phrase exists in this niche.** Note all four EMPTY responses returned
`alias=stripbooks` with an empty array — this is a genuine zero, not a product-index fallback.

Round 3 re-used: `sourdough` → 10 suggestions (incl. `sourdough discard recipes cookbook`,
`sourdough cookbook`, `sourdough starter kit`, product terms); `sourdough starter` → 3;
`bread baking` → 2.

---

## B. SERP counts (MEASURED)

| Query | Count |
|---|---|
| `sourdough discard cookbook` | **982** (exact) |
| `sourdough discard recipes` | **992** (exact) |

Both are exact counts — unusually precise for Amazon. But see §C: the **first page** is not 24
independent authors.

---

## C. First-page composition, `sourdough discard recipes`

| Position | Item | Notes |
|---|---|---|
| Sponsored #1 (brand block) | **Mindful Meals Publishing** storefront — headline **"Give your sourdough discard a delicious new life!"** | Ad; links ASINs B0F1FCK7N3 + B0F1CN13MM |
| Sponsored #1 (product) | *Sourdough Discard Recipes Cookbook: From Discard to Delight* | B0F1FCK7N3, $18.95 |
| Inline sponsored | *Artisan Sourdough at Home* — "Leanna Yarson", *The Artisan Baking Collection* | B0GGPZ4BBL, $16.98 (list $18.99), 4.0/59 |
| Organic #1 | *Sourdough Every Day* — Hannah Dela Cruz | 4.5 / **1,000+** / **$19.00** (list $22.99), Editors' pick Best Cookbooks |

---

## D. Competitor detail (MEASURED from listing pages)

### D.1 B0F1FCK7N3 — Mindful Meals Publishing, $18.95
- **90 pages**, 8.5 × 0.21 × 11 in, **pub Mar 13 2025**, ISBN-13 979-8314001844
- Series: **The Sourdough Cookbook Collection, Book 1 of 2**
- Reviews: none visible in capture (INFERRED limit — not a measured zero)
- **Chapter list, verbatim:** THEORETICAL PART · BREAKFASTS · MAIN DISHES · PIZZA AND SAVORY
  CASSEROLES · BREAD AND BAKED GOODS · APPETIZERS AND SNACKS · DESSERTS · **QUICK & EASY 20-MINUTE
  RECIPES** · SEASONAL RECIPES · DRINKS & SAUCES
- Bonuses: **3 meal plans for 1, 2 or 3 cups daily**; sourdough discard labels; marinade collection;
  **DIY beauty recipes**; cross-sell to book 2
- Claim: "115+ Full-Color Recipes"; "3 Recipes from 1 Dough" (grissini, mini pizzas, cinnamon rolls)
- **This single book covers all five of the directions proposed for round 4.**

### D.2 B0F1CN13MM — Mindful Meals Publishing, $5.99
- **102 pages**, 8.5 × 0.23 × 11 in, **pub Mar 12 2025**, ISBN-13 979-8313869919
- Series: Book 2 of 2 — **published one day before Book 1**
- Frequently-bought-together with Book 1 and *The Perfect Loaf* ($21.64)
- Blurb up-sells Book 1 explicitly ("For the price of a Starbucks latte…")

### D.3 B0DCMPVMCW — Rebecca Baker, $9.99
- **110 pages**, 8.5 × 0.25 × 11 in, **pub Aug 7 2024**, ISBN-13 979-8335232333
- **Rating 3.9 / 28 reviews** ← lowest rating recorded in any niche across rounds 1–4
- "100+ recipes"; advertises a **troubleshooting section**, step-by-step techniques, "novice bakers
  and seasoned enthusiasts"
- Sample recipes advertised: pancakes, breakfast tacos, crusted chicken, savory casserole, zucchini
  chips, biscotti, French toast

### D.4 Price ladder observed
$5.99 (B0F1CN13MM) · $9.99 (B0DCMPVMCW) · $11.87 (Sourdough Cookbook for Beginners) ·
$16.98 (B0GGPZ4BBL) · $18.95 (B0F1FCK7N3) · $19.00 (Sourdough Every Day) · $21.64 (Perfect Loaf)

### D.5 Page/trim convention
90 / 102 / 110 pages, all **8.5 × 11 in**. A competitive KDP interior is ~90–115 pp at that trim.

---

## E. Category depth — NOT OBTAINED (recorded as a dead end)

Three attempts to locate the bread/baking bestseller node returned unrelated categories:

| Node tried | Actual category returned |
|---|---|
| `books/4220` | **Cocktails & Mixed Drinks** |
| `books/4218` | **Sauces & Toppings Cooking** |
| `books/4234` | **Main Courses & Side Dishes** |

The bread/baking node ID is a child of *Cookbooks, Food & Wine* but is not exposed in the nav
captured at chunk 0 for these nodes. **No sourdough category rank or depth is claimed.** Recorded
as an open gap; do not cite a category position for this niche.

Observations that *were* captured incidentally (usable as cookbook-market context, not sourdough data):
- *Cocktails* #1 Art of Mixology 4.7/12,492 $8.40; #2 Magnolia Table Vol 2 4.9/28,861
- *Sauces* #1 Complete Nesco Electric Pressure Canning 4.7/148 $14.99; #3 Essential Dry Mix Pantry 4.8/106
- *Main Courses* #1 Appetites 4.8/5,073; #2 Essential Dry Mix Pantry 4.6/196 $13.99;
  #4 Amish Dry Mix Pantry 4.2/110 $19.99
→ **"Dry mix pantry" is a visibly duplicated concept with three near-identical titles** — a useful
cautionary example of how fast this category clones a winning formula.

---

## F. Free tooling audit (GitHub API + PyPI, MEASURED 2026-11-10)

| Repo / package | Stars / version | Licence | Purpose |
|---|---|---|---|
| `hhursev/recipe-scrapers` | 2,265★ / v15.13.0 | **MIT** | scrape recipe schema from public sites (research only) |
| `languagetool-org/languagetool` | 15,243★ | **LGPL-2.1** | grammar/style, self-hosted |
| `language_tool_python` | v3.4.0 | — (wraps LGPL tool) | Python binding |
| `Kozea/WeasyPrint` | 9,779★ / v70.0 | **BSD-3-Clause** | HTML/CSS → print PDF |
| `reportlab` | v5.1.0 | **BSD** | programmatic PDF |
| `textstat` | v0.7.13 | **MIT** | readability metrics |
| `hgrecco/pint` | 2,826★ / v0.26.2 | **NOASSERTION** (BSD-family) | unit/quantity arithmetic |
| `openfoodfacts/openfoodfacts-python` | 476★ | **NOASSERTION** (ODbL data) | nutrition data |
| `errata-ai/vale` | (lookup redirected) | **not confirmed** | prose linter |
| `py-pdf/reportlab` (repo path) | moved permanently | — | use PyPI package instead |

Google Books API: **429 RESOURCE_EXHAUSTED** — `quota_limit_value: 0` on the shared project.
Unusable for metadata enrichment. Recorded, not retried.

---

## G. Method limits recorded this round

- **Review text: UNAVAILABLE.** `/product-reviews` requires sign-in. Not bypassed. All statements about
  customer *complaints* are therefore **INFERRED from ratings and listing copy**, never quoted.
- **Sales/BSR: UNAVAILABLE.** No BSR in any captured HTML.
- **Google Trends: UNAVAILABLE.** 429 (rounds 1 and 4). No seasonality claim made.
- **Google Books API: UNAVAILABLE (429, quota 0).**
- **Bread category node: NOT FOUND** after 3 attempts (§E).
- **No purchase made. No recipe cooked. No ingredient bought.** Every recipe claim in the report is
  explicitly marked as untested.
