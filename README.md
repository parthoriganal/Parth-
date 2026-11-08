# KDP Scout Pro — Advanced Amazon KDP Keyword & Niche Research Platform

**Mobile-responsive SaaS dashboard for KDP authors** — keyword mining, demand vs competition scoring, BSR/reviews, profit, categories, trends, content gaps, and a transparent 0–100 opportunity score.

Built on [rxpelle/kdp-scout](https://github.com/rxpelle/kdp-scout) (MIT) as the primary research engine, with optional enrichment from [pangolinfoapi/amazon-niche-finder](https://github.com/pangolinfoapi/amazon-niche-finder) and templates from [nexscope-ai/amazon-skills](https://github.com/nexscope-ai/amazon-skills). See [`docs/COMPATIBILITY_REPORT.md`](./docs/COMPATIBILITY_REPORT.md) for the full repository audit.

![Dark dashboard](docs/screenshot-placeholder.png)

---

## 🪐 Also in this repo: three visual toys

| Project | What it is |
|---|---|
| **[Gravity Lab](./gravity-lab/)** | A Barnes–Hut N-body gravitational simulator — leapfrog integration, inelastic merging, and eight real astrophysical initial conditions (solar system, galaxy collision, the figure-eight three-body choreography, a Plummer-sphere cluster, an accreting black hole…). No WebGL, no libraries. [`README`](./gravity-lab/README.md) · [`test/physics.cjs`](./gravity-lab/test/physics.cjs) |
| **[Contribution City](./contribution-city/)** | Your GitHub contribution graph rebuilt as a beveled 3D city by a hand-rolled software renderer inside a Blender-flavoured UI. |
| **[Singularity Bloom](./singularity-bloom/)** | A real 3D sculpture generated entirely by Python running inside **Blender 5.0** (headless, no display server), path-traced with Cycles, exported to glTF and spun in a three.js viewer. 25 crystal petals, two torus knots, 380 dust motes, an obsidian shell around a glowing heart. [`README`](./singularity-bloom/README.md) |

```bash
npm run sim            # serve Gravity Lab at :8080
npm run bloom          # serve the Singularity Bloom 3D viewer at :5180
npm run bloom:render   # re-run the Blender/Cycles build + render
npm run test:physics   # numerical acceptance suite
npm run test:sim       # headless jsdom smoke test
```

---

## ✨ What it does

| Module | Source | Status |
|---|---|---|
| **Keyword Miner** | Amazon autocomplete `completion.{domain}/api/2017/suggestions` + a–z expansion | ⚠️ ACTUAL when reachable |
| **Search Volume Analyzer** | Autocomplete position heuristic (ESTIMATED); monthly search volume is not retrieved by the research pipeline | ⚠️ UNAVAILABLE |
| **Competition Analyzer** | Amazon search result count `/s?k=` + parsed organics | ⚠️ ACTUAL when reachable; counts may be approximate |
| **Reverse ASIN** | DataForSEO `ranked_keywords/live` (≈$0.01/ASIN) | ⚠️ UNAVAILABLE without key |
| **Competitor Analyzer** | Scrapes `/dp/{ASIN}` for BSR, price, rating, reviews, pages, categories | ✅ ACTUAL |
| **Category Analyzer** | BSR category trees + breadcrumbs + 25 KDP categories explorer | ✅ |
| **Trend Analyzer** | Google Trends via `pytrends` when reachable → ACTUAL, otherwise UNAVAILABLE | ⚠️ optional |
| **Content Gap** | TF-IDF demand tokens vs competitor title/desc/categories | ✅ |
| **Profit Calculator** | Illustrative assumptions; verify current KDP terms and marketplace costs | ⚠️ ESTIMATED |
| **Opportunity Scorer** | Transparent 0–100: Demand30 + Competition25 + Differentiation15 + Intent15 + Profit15 | ✅ |

**Data limitations:** Live requests can fail, throttle, or return incomplete data. Research no longer substitutes mock keywords, products, result counts, or trend curves. Autocomplete is not search volume; scores are heuristics, not evidence of demand or sales. Profit figures use unverified local assumptions. See [quality notes](./docs/KDP_QUALITY_RETEST.md).

---

## 🚀 Quick Start

### Backend (Flask research engine)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # optional: add DataForSEO / Pangolinfo keys
python app.py                  # → http://localhost:5000  •  /api/health
```

### Frontend (Vite + Chart.js)

```bash
npm install
npm run dev    # → http://localhost:5173  (proxies /api to Flask)
npm run build  # → dist/  (Flask also serves it at /)
```

### Full stack in one command

```bash
npm run build && PORT=5000 python backend/app.py
# Open http://localhost:5000  — single origin, no CORS
```

**Android:** open the preview URL in Chrome — heavy work runs cloud-side (Flask), not on device.

---

## 📖 Usage

1. **Research tab** → Title / Subtitle (optional), **1–10 seed keywords**, Marketplace (US/UK/CA/AU/DE/IN), Format, Price, Page count, optional **ASINs** (up to 8), Depth (1 fast / 2 deep).
2. Click **Run Full Research** — 15–35s: mines autocomplete (a–z), probes competition for top-12, scrapes competitors, scores, builds trends/categories/gaps.
3. Explore: **Dashboard** (overall score, demand vs competition scatter, intent donut), **Keywords** table (filter/sort, export), **Competitors** (BSR & review charts, categories), **Trends**, **Profit**, **Report & Export** (CSV/PDF).

**Try Demo:** click *Load Demo (cozy mystery)* → Run.

---

## 🔑 Optional API keys (all features work without them)

| Key | Get it at | Env vars | Enables |
|---|---|---|---|
| DataForSEO | dataforseo.com | `DATAFORSEO_LOGIN`, `DATAFORSEO_API_KEY` | Reverse ASIN when configured and reachable; no volume integration in the research pipeline |
| Pangolinfo | tool.pangolinfo.com (200 free calls) | `PANGOLINFO_API_KEY` | Blue-ocean `filter_niches` feed |
| Google Trends actual | `pip install pytrends` | — | Attempts live Google Trends; otherwise UNAVAILABLE |

Copy `backend/.env.example` → `backend/.env` and fill any you have.

---

## 🧮 How the score works — no black box

```
Demand 30        = heuristic from autocomplete position; it is not observed search volume or sales.
Competition 25   = invert(result_count, avgBSR, avgReviews) — fewer/weaker ⇒ higher.
Differentiation 15= word count specificity + TF-IDF content-gap vs competitors.
Buyer Intent 15  = commercial tokens (workbook/journal/planner/guide/best/buy/for beginners) + top-3 autocomplete boost.
Profitability 15 = KDP window: $2.99-$9.99 → 70% eBook else 35% (delivery $0.15); paperback/hardcover 60% - printing.

Total 0–100 = sum pillars. Overall niche = mean of top-10 keyword scores.
Labels: ≥75 Excellent  ≥60 Good  ≥45 Moderate  ≥30 Challenging  <30 High Risk
```

Click any keyword in the report to see its 5-pillar breakdown with plain-English explanations.

---

## 📊 Dashboard exports

- **CSV:** all mined keywords with demand, result_count, opportunity, pillars, source, timestamp — opens in Sheets/Excel → Amazon Ads import-ready.
- **PDF:** printable report via browser `window.print()` (no server round-trip) — includes top-20 table + score breakdowns.
- **Copy Summary:** one-line clipboard for notes/ads.

---

## 🏗 Architecture

```
Browser (Vite + Chart.js, responsive dark UI)
   │  /api/* proxy (dev) or same origin (prod)
   ▼
Flask (backend/app.py) ──► kdp_engine/
   ├─ autocomplete.py  (ported kdp-scout, a–z + adaptive backoff; failure returns unavailable)
   ├─ product_scraper.py (multi-selector /dp scrape + CAPTCHA detect)
   ├─ bsr_model.py     (legacy estimate model; not used in product responses)
   ├─ scorer.py        (transparent 100-pt composite)
   ├─ profit.py        (KDP royalty + printing tables)
   ├─ trends.py        (pytrends → ACTUAL else UNAVAILABLE)
   ├─ content_gap.py   (TF-IDF demand vs competitor coverage)
   └─ mock_data.py     (legacy fixtures; not used in live research)

LocalStorage: last research JSON persisted for offline revisit.
```

**Markets:** US, UK, Canada, Australia, Germany, India (added — reuses `us_kindle` BSR model, MID `A21TJRUUN4KGV`).

**Respect for ToS:** rate-limited (0.18–1.2s between Amazon hits), UA rotation, exponential backoff on 429/503, never bypasses CAPTCHA — reports it.

---

## 📚 Docs

- [KDP quality remediation and retest](./docs/KDP_QUALITY_RETEST.md)
- [Skill system — workflows, invocation, and compatibility](./docs/SKILL_SYSTEM.md)
- [Skill execution audit — evidence and limitations](./docs/SKILL_EXECUTION_AUDIT.md)
- [Compatibility Report — repo audit + integration decisions](./docs/COMPATIBILITY_REPORT.md)
- [Setup Guide](./docs/SETUP.md)
- [API Guide & feature matrix](./docs/API_GUIDE.md)

---

## 🛠 Dependencies

**Backend:** Flask, Flask-Cors, requests, beautifulsoup4, lxml, pandas, python-dotenv
**Frontend:** Vite, Chart.js
**Optional:** pytrends (trends ACTUAL), DataForSEO account, Pangolinfo key

---

## 🔒 Privacy

No telemetry, no cloud DB — SQLite local if you add it; research JSON stays in `localStorage`. Your ASINs/keys never leave your machine except to Amazon/DataForSEO for the searches you explicitly run.

---

## 📄 License

App: MIT (consistent with `rxpelle/kdp-scout` MIT). Curated mock data is demo-only. Amazon is a trademark of Amazon.com, Inc.

