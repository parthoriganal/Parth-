# API Guide & Feature Matrix

## Feature status — genuinely functional vs planned

| # | Module | Status | Data source | Notes |
|---|---|---|---|---|
| 1 | Keyword Miner | ✅ Functional | Amazon autocomplete `completion.{domain}/api/2017/suggestions` (a-z expansion) | depth 1=27 queries, depth2=deep. Rate-limited. |
| 2 | Search Volume Analyzer | ⚠️ Estimated (DataForSEO optional) | Autocomplete position heuristic 0-100 (ESTIMATED) unless `DATAFORSEO_*` set → DataForSEO `search_volume` ACTUAL | UI warns: autocomplete ≠ monthly searches |
| 3 | Competition Analyzer | ✅ Functional | Amazon search `/s?k=` result count + parsed organic results | CAPTCHA → status=blocked, not fake count |
| 4 | Reverse ASIN | ⚠️ Requires DataForSEO | `dataforseo_labs/amazon/ranked_keywords/live` | Without key: UNAVAILABLE + workaround (use title as seeds) |
| 5 | Competitor Analyzer | ✅ Functional | Scrapes `/dp/{ASIN}` for title, author, BSR, price, rating, reviews, pages, categories, image | Multi-selector fallback, CAPTCHA detection |
| 6 | Category Analyzer | ✅ Functional | From competitor BSR categories + wayfinding breadcrumbs + static explorer | Suggested set always available |
| 7 | Trend Analyzer | ✅ Functional (SIMULATED by default) | Google Trends via `pytrends` if installed → ACTUAL else deterministic seasonal model → SIMULATED | Both labeled; 12-month view |
| 8 | Content Gap | ✅ Functional | TF-IDF demand tokens vs competitor title/desc/categories | Gap score 0-100, High/Med/Low |
| 9 | Profit Calculator | ✅ Functional | KDP tables: eBook 70%/35%, paperback/hardcover 60% minus printing | Includes ladder $0.99-$14.99 |
| 10 | Opportunity Scorer | ✅ Functional | Composite 0-100: Demand30+Competition25+Differentiation15+Intent15+Profit15 | Every pillar explains its inputs; overall = mean top-10 |

## Endpoint contracts

### POST /api/research (recommended)
One call runs the full pipeline.
```json
{ "title":"...", "subtitle":"...", "seeds":["cozy mystery","culinary mystery"], "marketplace":"us", "format":"ebook", "price":4.99, "pages":280, "asins":["B08N5WRWNW"], "department":"kindle", "depth":1 }
```
Returns `{ input, meta, mined[], scored{overall,keywords[],formula}, competitors{books[],stats}, profit{...}, categories, content_gap, low_competition[], top20[], sources, warnings, errors }`

### POST /api/mine
```json
{ "seeds":["thriller"], "marketplace":"us", "department":"kindle", "depth":1 }
```

### POST /api/competitors
```json
{ "asins":["B08N5WRWNW","B003K16PJW"], "marketplace":"us" }
```

### POST /api/profit
```json
{ "price":4.99, "pages":280, "color":false, "marketplace":"us" }
```

### POST /api/trends
```json
{ "keyword":"cozy mystery", "marketplace":"us" }
```
If `pytrends` installed ⇒ `status=ACTUAL`, else `SIMULATED` with deterministic curve.

### POST /api/reverse-asin
```json
{ "asin":"B08N5WRWNW", "marketplace":"us" }
```
Requires DataForSEO env.

## Scoring formula (transparent)

```
Demand        30 = f(position 1..10, result_count) — position 1 ⇒ strong. Boost if >10k results.
Competition   25 = invert(result_count, avg_BSR, avg_reviews) — fewer/weaker competitors ⇒ higher.
Differentiation 15 = specificity (word count) + content_gap TF-IDF.
Buyer Intent 15 = commercial tokens (workbook/journal/planner/guide/best/buy) + top-3 autocomplete boost.
Profitability 15 = KDP royalty window ($2.99-$9.99 → 70% ebook else 35%; paperback 60%-printing).
Total 0-100 = sum pillars. Overall niche = mean of top-10 keyword scores.

Labels: ≥75 Excellent, ≥60 Good, ≥45 Moderate, ≥30 Challenging, <30 High Risk.
```

No invented numbers: if a source fails, `status` is `FAILED`/`BLOCKED`/`UNAVAILABLE` and the UI shows the failure banner.

