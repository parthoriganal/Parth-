# Compatibility Report — GitHub Repository Evaluation

**Date:** 2026-10-30
**Evaluator:** KDP Platform Build — automated inspection + clone + source review
**Branch:** `arena/e427fc8d-parth`

---

## Summary

| # | Repository | Exists | License | Maintained | Runnable | Verdict |
|---|---|---|---|---|---|---|
| 1 | [rxpelle/kdp-scout](https://github.com/rxpelle/kdp-scout) | ✅ | MIT | ✅ Active (Jun 2026, 35 commits) | ✅ Yes — Python 3.9+, pip install -e . | **PRIMARY ENGINE — Integrated** |
| 2 | [hulyx/scout-app](https://github.com/hulyx/scout-app) | ✅ | MIT | ✅ Active (May 2026, 87 commits, 9 tags) | ⚠️ Partial — Desktop PyQt6 app, Windows-centric (BAT installer), not web/mobile | **Reference only — logic ported selectively** |
| 3 | [pangolinfoapi/amazon-niche-finder](https://github.com/pangolinfoapi/amazon-niche-finder) | ✅ | MIT | ✅ Active (daily bot commits, Oct 30 2026) | ✅ Yes — stdlib only, needs Pangolinfo API key | **Optional enrichment — Integrated as toggle** |
| 4 | [nexscope-ai/amazon-skills](https://github.com/nexscope-ai/amazon-skills) | ✅ | MIT (implied) | ✅ Active (54 commits, Aug 2026) | ⚠️ Prompt templates + shell scripts, not a standalone service | **Inspiration for scoring, prompts & docs — not directly executed** |
| 5 | [nexscope-ai/awesome-amazon-seller-tools](https://github.com/nexscope-ai/awesome-amazon-seller-tools) | ✅ | — | ⚠️ Low (3 commits, last Aug 2026) | ❌ No code — curated markdown list | **No integration — docs reference** |

---

## Detailed Findings

### 1. rxpelle/kdp-scout — ✅ Fully Runnable

**Repo:** https://github.com/rxpelle/kdp-scout
**Language:** Python
**License:** MIT — Copyright (c) 2026 KDP Scout Contributors
**Deps:** `requests`, `beautifulsoup4`, `click`, `rich`, `python-dotenv`, `pandas`, `urllib3`
**Python:** >=3.9

**What it actually does (verified in source):**
- `collectors/autocomplete.py` — Queries `https://completion.{domain}/api/2017/suggestions?mid={MID}&alias={kindle|stripbooks|aps}&prefix={term}` with a-z expansion (27 queries depth=1, ~700 depth=2), adaptive backoff on 429/503, rate-limited, UA rotation, proxy support. Returns deduplicated `(keyword, position)` list.
- `collectors/product_scraper.py` — Scrapes `https://{domain}/dp/{ASIN}` for title, author, BSR overall + categories, price (Kindle/paperback), review_count, avg_rating, page_count, categories[], publication_date, description. Multi-selector fallback, CAPTCHA detection.
- `collectors/dataforseo.py` — DataForSEO wrapper for `ranked_keywords`, `search_volume`, `related_keywords`, `competitors`. Graceful no-op when keys missing. Bearer Basic Auth, spend tracker.
- `collectors/bsr_model.py` — Power-law `daily_sales = k * bsr^(-a)` calibrated per marketplace (us_kindle k=150k a=0.82, us_paperback, uk_kindle, etc.), monthly revenue via royalty (70% $2.99-$9.99 else 35%).
- `keyword_engine.py` — Full engine: mine → dedupe → DB (SQLite) → score with weighted composite (autocomplete position, competition, BSR demand, ads impressions/orders/profitability, search volume, CTR, etc.)
- `niche_scorer.py` — `score_niche(keyword)` scrapes Amazon search `https://www.amazon.com/s?k={kw}&i={dept}` for top-10 organic results, computes avg BSR, avg reviews, avg price, high-BSR count, estimated revenue, opportunity_score 0-100.
- `trending.py` — Trending via Amazon bestseller scraping + Google suggest patterns.
- `db.py` — SQLite with KeywordRepository, BookRepository, KeywordRankingRepository.
- `config.py` — Marketplace presets for US/UK/DE/FR/ES/IT/CA/AU (domains + MIDs + bestseller URLs), rate limits, optional DataForSEO/ANTHROPIC/PROXY keys via .env.
- `automation.py` / `cron_helper.py` — Daily/weekly automation, cron install.

**Maintenance:** Active, CI with least-privilege token, Rich terminal output, cron, seed management.
**Limitations:**
- Scraping Amazon search/product pages is subject to bot detection/CAPTCHA; requires rate limiting & proxy for scale.
- No marketplace entry for India (IN) — needs adding.
- Autocomplete endpoint is unofficial but stable; Amazon may throttle.

**Integration decision:** **Use as primary engine.** Port `autocomplete.py`, `product_scraper.py`, `bsr_model.py`, `dataforseo.py` patterns into `backend/kdp_engine/` with Flask wrapper. Respect rate limits.

---

### 2. hulyx/scout-app — ⚠️ Desktop-only, Not Web-Compatible

**Repo:** https://github.com/hulyx/scout-app
**Language:** Python + JavaScript (browser extension)
**License:** MIT
**Deps:** PyQt6, matplotlib, etc. + browser extension (`scout-extension/` with content scripts for Amazon, Etsy, Pinterest, Redbubble, Spreadshirt, BubbleTrends)
**Install:** `CLICK ME.bat` / `INSTALL ME.bat` — Windows batch that auto-installs Python, deps, PyInstaller exe. `scout_gui.py` as entry.

**What it actually does:**
- KDP Mode: 5 data sources — Amazon (8 tools: Keywords, Trending, Niche Analyzer, BSR Tracker, Category Explorer, Competitor Analysis, ASIN Lookup, Review Analyzer), Google (G-Keywords, G-Trending, G-Books), TikTok BookTok, Reddit Demand, Goodreads Open Library.
- POD Mode: 4 sources — Amazon Merch, Google, Pinterest, Etsy.
- Core logic is an evolution of kdp-scout (same author lineage visible in `scout/` package: `keyword_engine.py`, `db.py`, `collectors/`, `nlp_cluster.py`, `pod_db.py` etc.) with extras: `CompetitionProber` (avg BSR/KU ratio/median reviews), `KeywordScorer` extended weights, `nlp_cluster` for content gap via TF-IDF, async autocomplete.
- GUI: PyQt6 desktop window with mode toggle, matplotlib charts. Not responsive web.
- Extension bridge: `extension_bridge.py` + `bridge_client.py` for browser content scraping.

**Why not directly integrated:**
- PyQt6 cannot run in a mobile browser; PyInstaller exe cannot be served via web.
- Heavy desktop dependencies (Qt, matplotlib) unsuitable for cloud Flask.
- Windows BAT installer not portable.
- Extension requires user to install Chrome extension + grant Amazon access — not suitable for cloud execution.

**What's reusable:**
- `keyword_engine.py` extended weights (ku_ratio, median_reviews) and `CompetitionProber` concept adopted into scorer.
- `nlp_cluster.py` TF-IDF clustering inspires Content Gap Analyzer.
- Category/promo logic for dashboard.

**Integration decision:** **Do not run as-is.** Extract ideas (scoring weights, content gap via clustering) and re-implement in lightweight web stack. Cite as inspiration.

---

### 3. pangolinfoapi/amazon-niche-finder — ✅ Runnable, API-Key Gated

**Repo:** https://github.com/pangolinfoapi/amazon-niche-finder
**Language:** Python 3.10+ stdlib only (zero pip deps)
**License:** MIT
**Deps:** None (stdlib `urllib`, `sqlite3`, `json`); `requirements.txt` is empty comment.

**What it actually does (verified):**
- `niche_finder.py` (single file, ~600 LOC) — MCP client over streamable HTTP:
  - `McpClient` POSTs JSON-RPC to `https://mcp.pangolinfo.com/mcp` with `Bearer <token>` + `mcp-session-id`, `initialize` → `call_tool(filter_niches, {filters})`.
  - `filter_niches` scans Amazon catalog via Pangolinfo dataset (billions of listings) with filters: `search_volume_t90_min`, `price range`, `brand_count_max`, etc., sorted by `searchVolumeT90`.
  - Scores each niche for blue-ocean opportunity: `score = f(search_volume, brand_count, price)`, flags `is_opportunity`.
  - Upserts into `data/niches.db` SQLite (`niches` table: niche_id, title, search_volume_t90/t360, min/max price, brand_count, product_count, return_rate, avg BSR/rating/review_count, score, is_opportunity, first/last_seen).
  - Exports `data/opportunities.csv`, generates `reports/*.md` daily.
- GitHub Actions: `tool.pangolinfo.com` free tier 200 calls, daily bot commits (last Oct 30 2026).
- `pangolinfo` dataset includes real demand/competition metrics unavailable via autocomplete alone.

**Limitations:**
- Requires `PANGOLINFO_API_KEY` (200 free calls; beyond that paid). Without key, zero data returned — reports empty with error.
- `filter_niches` is Amazon private-label/ecommerce focused, not KDP-book specific (no BSR Kindle category split, no page count, no KDP royalty). Useful for general niche validation but not book-specific BSR/reviews.
- MCP endpoint behind Cloudflare, blocks `python-urllib` UA — workaround is browser UA header (already in code).
- Daily scan cadence; not real-time user keyword mining.

**Integration decision:** **Optional module.** Integrate as toggle in dashboard: if user supplies Pangolinfo API key (or platform has env key), show blue-ocean niche feed via backend proxy to `filter_niches`. If no key, show disabled state with link to `https://tool.pangolinfo.com`. Label data source clearly.

---

### 4. nexscope-ai/amazon-skills — ⚠️ Agentic Prompt Skills, Not a Service

**Repo:** https://github.com/nexscope-ai/Amazon-Skills
**Language:** Markdown skills + Bash scripts (`scripts/research.sh`) + JSON meta
**License:** Not explicitly declared; treat as CC-ish — no package distribution.
**Size:** 48 skills (each `SKILL.md` ~10-40KB) + shell scripts.

**What it actually does:**
- Each skill is an AI-agent prompt definition (for OpenClaw/Claude Code/Cursor/Windsurf/Codex): e.g., `amazon-keyword-research`, `amazon-niche-finder`, `amazon-competitor-analysis`, `amazon-listing-optimization`, etc.
- `amazon-keyword-research/scripts/research.sh` — Bash: curls `https://completion.{domain}/api/2017/suggestions?mid={MKT}&alias=aps&prefix={encoded_kw}` with prefix expansions `best/cheap/top` + `a-z`, `python3 -c json parse`, `sort -u`. Essentially same autocomplete as kdp-scout but shallower (no depth-2, no dept alias).
- Workflow described: Step 1 autocomplete via script → Step 2 web_search for competition → Step 3 web_fetch Google Trends → Step 4 LLM synthesis into report with opportunity score 1-10.
- No Python engine, no DB, no API server, no persistent state. Relies on host LLM to synthesize.

**Limitations:**
- Not executable without LLM agent harness; `npx skills add ...` registers prompts, doesn't start a service.
- Competition/seasonality steps are LLM web_search calls, not coded scrapers — non-deterministic, no tests.
- No BSR/revenue/royalty calculations, no SQLite.
- `research.sh` uses hard-coded `aps` alias only; less flexible than kdp-scout's `digital-text`/`stripbooks`.

**Integration decision:** **Do not execute directly.** Borrow:
- Multi-marketplace domain/MID mapping (adds JP/MX/BR coverage ideas).
- Output format template (High Commercial Intent / Informational / Niche buckets, competition table, seasonal trends, opportunity score breakdown).
- Scoring dimensions (competition density, price room, demand trend, niche potential).
- Re-implement as deterministic Python code in backend.

---

### 5. nexscope-ai/awesome-amazon-seller-tools — ❌ Not a Tool

**Repo:** https://github.com/nexscope-ai/awesome-amazon-seller-tools
**Language:** Markdown
**License:** Unstated
**Content:** Curated awesome-list: AI Agents & Skills, All-in-One (Helium 10, Jungle Scout...), Product Research, Keyword Research, Listing Optimization, PPC, Reviews, Pricing, Inventory, Analytics, Photography, Sourcing, etc. + communities/podcasts/blogs/courses.

**Integration decision:** **Zero code to integrate.** Reference for UI placeholder links ("Explore 200+ tools" curated section) and to avoid reinventing all-in-one suites.

---

## Overall Architecture Decision

**Primary engine:** `rxpelle/kdp-scout` (proven, MIT, actively maintained, full pipeline).
**Secondary (optional):** `pangolinfoapi/amazon-niche-finder` via Pangolinfo MCP (real demand/competition when API key present).
**Design inspiration:** `hulyx/scout-app` extended scoring + `nexscope-ai/amazon-skills` report templates.
**Excluded from execution:** `awesome-amazon-seller-tools` (list only), `hulyx/scout-app` GUI (desktop-only), `amazon-skills` LLM synthesis (non-deterministic).

**Marketplaces in final platform:** US, UK, Canada (CA), Australia (AU), Germany (DE), India (IN) — IN added as extension (domain amazon.in, MID A21TJRUUN4KGV, reuses us_kindle BSR model).

**Data accuracy contract (enforced in app):**
- Autocomplete ≠ search volume — labeled ESTIMATED (heuristic from position) unless DataForSEO returns real volume.
- BSR → sales via power-law labeled ESTIMATED.
- All numbers carry source tag + timestamp + status (ACTUAL / ESTIMATED / UNAVAILABLE / SIMULATED).
- Failed source shows failure banner, not fake data.

