# Open Source Repos, Skills & Code Libraries — Deep Research & Good/Bad Filter

**Subject:** Best open source GitHub repositories, agent skills, and code libraries relevant to building/running a KDP (Amazon Kindle Direct Publishing) keyword & niche research platform — i.e. web scraping, Amazon data extraction, keyword research, data visualization, and LLM agent skills.

**Context repo:** `parthoriganal/Parth-` → **KDP Scout Pro** (`arena/3ff51f4b-parth`), a Flask + Vite KDP research platform already built on `rxpelle/kdp-scout` (MIT) with optional enrichment from `pangolinfoapi/amazon-niche-finder` and `nexscope-ai/amazon-skills`. See `docs/COMPATIBILITY_REPORT.md` (the repo's prior audit of 5 repos) and `docs/API_GUIDE.md`.

**Research date:** 2026-11-05. Star counts and commit freshness are approximate (sources report them slightly differently); treat "~" as order-of-magnitude.

---

## How I filtered "good" vs "bad"

| Good (recommended) signals | Bad / avoid signals |
|---|---|
| Permissive license (MIT / Apache-2.0 / BSD-3) — safe for commercial & closed-source use | Copyleft (AGPL/GPL) if you plan a closed-source SaaS — legal review required first |
| Actively maintained (commits/releases within ~6–12 months) | Abandoned (no commits/releases in 1–2+ years) or "last release 1–2 years ago" |
| Runnable: installs via pip/npm, has README + tests, works headless | Not actually code: list-only awesome-lists, paid `.exe` with no source, Windows-only BAT/PyInstaller |
| Transparent data contract: labels every number `ACTUAL / ESTIMATED / SIMULATED / UNAVAILABLE / FAILED`, never invents data | Invents/fakes data (fake BSR, prices, reviews) or hides sources behind a paywall |
| Clear, single data source; optional API keys don't block core functionality | Core function requires a paid key with no usable free tier |
| Portable to a web/cloud stack (Python stdlib or Flask-friendly, Node/Vite-friendly) | Desktop-only GUI (PyQt6/PyInstaller), Windows batch installers, Chrome-extension-dependent |
| Community signal: stars, forks, issues, PRs, CI | 0 stars / 0 forks / no README / unverified "benchmark" claims + "book a call" marketing |

This repo already enforces a **data-accuracy contract** (every number carries `source` + `status` + `updated_at`; failures show a banner, never fake data). Any library I recommend below must be compatible with that contract.

---

## 1) Web scraping & crawling code libraries

These are the low-level libraries you import, not full end-user apps. This repo's backend already uses `requests`, `beautifulsoup4`, `lxml` (per `backend/requirements.txt`).

### GOOD / Recommended

| Library | Repo | Lang | License | Stars (~) | Best for | Notes |
|---|---|---|---|---|---|---|
| Scrapy | github.com/scrapy/scrapy | Python | BSD-3-Clause | ~63k | Production Python crawls | Mature standard since 2008; pipelines, throttling, retries; needs `scrapy-playwright` for JS pages. |
| Crawlee | github.com/apify/crawlee | JS/TS (+Python) | Apache-2.0 | ~24k | All-in-one Node scraping | HTTP + headless browser behind one API; request queue, storage, proxy rotation built in. Actively maintained (v3.18 Oct 2026). |
| Playwright | github.com/microsoft/playwright | Multi (JS/Python/Java/.NET) | Apache-2.0 | ~92k | JS-heavy sites | Auto-waiting, Chromium/Firefox/WebKit, multi-language. Default for dynamic rendering. |
| Puppeteer | github.com/puppeteer/puppeteer | Node.js | Apache-2.0 | ~95k | Chrome-first Node | Headless Chromium via CDP. Large example base. |
| Crawl4AI | github.com/unclecode/crawl4ai | Python | Apache-2.0 (+attribution clause) | ~70–81k | LLM/RAG pipelines | Markdown output, REST API, MCP endpoint; self-hosted, no cloud. Read the attribution clause before closed-source use. |
| Scrapling | github.com/D4Vinci/Scrapling | Python | BSD-3-Clause | ~67–75k | Modern Python scraping | Fast HTTP + browser fetching, Scrapy-style spiders, Markdown output; markets stealth/anti-bot. |
| BeautifulSoup (bs4) | pypi | Python | MIT | — | Static HTML parsing | Already in this repo. Parse-only; pair with requests/httpx for fetching. |
| lxml | pypi | Python | BSD/BSD-like | — | Fast XML/HTML parsing | Already in this repo. Fast, XPath support. |
| requests / httpx | pypi | Python | Apache-2.0 / BSD | — | Fetching static pages & APIs | Already in this repo. |
| Cheerio | github.com/cheeriojs/cheerio | Node.js | MIT | — | jQuery-style parsing in Node | Fast static HTML parsing (no JS rendering). |
| curl_cffi | pypi | Python | — | — | Anti-bot TLS fingerprinting | Best free option for getting past TLS/JA3 fingerprinting on protected targets. |
| Browser Use | github.com/browser-use | Python | MIT | ~119k | AI browser agent | LLM-driven browser automation to complete tasks/extract data. |
| Stagehand | github.com/... | TS | MIT | ~26k | AI browser automation | Mixes code with AI `act`/`extract` steps. |

### BAD / Avoid (for scraping)

| Repo | Why avoid |
|---|---|
| Colly (Go) | Last release 1–2 years ago — slowing; not actively maintained. |
| Selenium | Heavy, being superseded by Playwright/Puppeteer; keep only if you need the broadest language/browser matrix. |
| Firecrawl self-hosted core | AGPL-3.0-or-later — copyleft risk if you build a closed-source SaaS on top; get legal sign-off. |
| Maxun | AGPL-3.0 — copyleft; self-hosted no-code, interesting but license-restrictive. |
| trawl / Obscura / Camoufox / Patchright / pydoll / Botright | Niche anti-detect/challenge-solvers; all require residential proxies (cost) and are specialist tools, not general-purpose. |

**Verdict:** For this repo's stack, keep `requests` + `beautifulsoup4` + `lxml` for static Amazon pages (already used), and add **Playwright** only if a target starts requiring JS rendering/CAPTCHA bypass. **Crawl4AI** is worth evaluating if you ever feed scraped content into an LLM/RAG pipeline.

Sources: [scrapfly best open-source scrapers 2026](https://scrapfly.io/blog/posts/best-open-source-web-scrapers), [thunderbit 15 scraping GitHub projects](https://thunderbit.com/blog/best-web-scraping-github-projects), [nodemaven 14 repos](https://nodemaven.com/blog/14-open-source-github-repos-for-web-scraping-in-2026/), [geekflare tested tools](https://geekflare.com/open-source/web-scraping-tools/), [apify top crawlers](https://blog.apify.com/top-11-open-source-web-crawlers-and-one-powerful-web-scraper/).

---

## 2) Amazon / KDP-specific scrapers & keyword tools (most relevant to this repo)

This repo already integrates `rxpelle/kdp-scout` as its primary engine and `pangolinfoapi/amazon-niche-finder` as optional enrichment.

### GOOD / Recommended

| Repo | Lang | License | Stars | Status | Relevance to this repo |
|---|---|---|---|---|---|
| rxpelle/kdp-scout | Python | MIT | ~91 | ✅ Active (Jun 2026) | **Already integrated** — primary engine: autocomplete mining, product scraping, BSR power-law model, scoring, DataForSEO, SQLite, multi-marketplace. |
| pangolinfoapi/amazon-niche-finder | Python | MIT | — | ✅ Active | **Already integrated** as optional toggle — stdlib-only, blue-ocean niche feed via `filter_niches` (API-key gated, 200 free calls). |
| thirdwatch-dev/amazon-scraper | — | MIT | — | Apify actor | Reference: 18 Amazon marketplaces, product/listing/reviews/ASIN output fields; MIT. |
| ian-kerins/amazon-python-scrapy-scraper | Python | MIT | ~92 | Scrapy spider | Reference: keyword → ASIN → product page fields (ASIN, title, price, rating, reviews, BSR). Smaller, older; good pattern reference. |
| drawrowfly/amazon-keyword-scraper-go | Go | MIT | ~50 | CLI | Reference: keyword + active-products-per-keyword, CSV output. |
| drawrowfly/amazon-keyword-scraper-ts | TS | MIT | ~16 | npm module | Reference: JS/TS equivalent, event-based keyword emission. |
| Pangolin-spg/amazon-walmart-shopify-scrape-api | Python | — | — | Parser only | Reference: open-source Amazon keyword *parser* core (no fetch/rotate/CAPTCHA logic); community edition. |

### BAD / Avoid (Amazon scrapers)

| Repo | Why avoid |
|---|---|
| yasinsayal/amazon-product-scraper | **Not actually open source** — README says "You will Recieve only Software. Code is not Included," requires a paid license/Evtcode, Windows `.exe`. No code to integrate. |
| KaziArman/Amazon-Keyword-Scraper | 4 commits, no tests, hardcoded one-time password (`2307`), PyInstaller `.exe`, bundled Chrome drivers, opaque. Security risk; unmaintained. |
| jaishasohail/amazon-product-scraper | 0 stars / 0 forks / 0 watchers, unverified "97% success / 200 products/min" benchmarks, "book a call" marketing page. Low trust, likely abandoned. |
| souvik666/Open-Source-keyword-research-API-and-website-look-up | Heroku-deployed real-time scraper, unclear license/maintenance, no code transparency. Weak. |

**Verdict:** The repo's existing choice (`kdp-scout`) is the best open-source Amazon/KDP engine. Use thirdwatch-dev/iamazon-scraper and ian-kerins/* only as pattern references for additional selectors. Avoid all `.exe`/paid-license "scrapers."

Sources: [rxpelle/kdp-scout](https://github.com/rxpelle/kdp-scout), [ian-kerins/amazon-python-scrapy-scraper](https://github.com/ian-kerins/amazon-python-scrapy-scraper), [drawrowfly amazon-keyword-scraper-go/ts](https://github.com/drawrowfly/amazon-keyword-scraper-go), [thirdwatch-dev/amazon-scraper](https://github.com/thirdwatch-dev/amazon-scraper), [Pangolin open-source keyword scraper guide](https://www.pangolinfo.com/open-source-amazon-keyword-scraper-2/).

---

## 3) Keyword research & SEO tools (end-user apps / platforms)

### GOOD / Recommended

| Repo | Lang | License | Stars | Best for | Notes |
|---|---|---|---|---|---|
| ZensInk/zens-ink-seo-package | Python | MIT | ~54 | Indie SEO toolkit | **Pure Python, zero dependencies**, 20 CLI tools (keyword research, clustering, difficulty, intent, content gap, site audit, GEO). Ships an **MCP stdio server** and **agent skill** (`npx skills add ...`). Actively maintained (Oct 2026). Highly relevant to "skills." |
| octopusOn/seo-keyword-research | — | MIT or Apache-2.0 | ~0 | Free keyword research + SERP clustering | 100% free, keyword ideas + clustering by SERP overlap + intent/CPC + imports from Ahrefs/Semrush/GSC. CLI + GUI. |
| open-seo (every-app / arturseo-geo forks) | TS | MIT | ~26.3k | Self-hosted Semrush/Ahrefs alternative | Keyword research, domain insights, backlinks, site audits, AI keyword clustering, LLM mention tracking. Production-tested self-hosted instance. |
| nitishkgupta/seotoolsuite | TS | MIT | — | DataForSEO-powered SEO tools | Keyword/competitive/backlink research, caching, MIT. DataForSEO key required for some tools. |
| quantumproxies/keyword-research-tool | Python | MIT | ~0 | Google autocomplete CLI | Expand one seed into up to 500 suggestions (questions/alphabet/prepositions/comparisons) with Google relevance scores; no Ads account/proxy. $2 free/month on QuanticData. |
| SerpBear (towfiqi/serpbear) | — | — | — | Rank tracking + keyword research | Unlimited keyword positions, email alerts, SERP API, GSC integration; uses third-party SERP scrapers. |

### BAD / Avoid (keyword/SEO)

| Repo | Why avoid |
|---|---|
| nexscope-ai/awesome-amazon-seller-tools | **List only, no code** — curated markdown of paid tools (Helium 10, Jungle Scout...). Low activity (3 commits). Docs/reference only; zero integration value. |
| KhadimHussain12 WordPress keyword plugins | 0 stars, modular PHP "AI" plugins with vague claims; not relevant to a Flask/Vite KDP stack. |
| CorgiCorner/bisibility etc. | Smaller SEO platforms; fine references but not as strong as open-seo/ZensInk for this stack. |

**Verdict:** **ZensInk** is the standout for this repo — it's MIT, zero-dependency Python (fits the Flask backend), and literally provides "skills" (MCP + agent skill) which matches the user's mention of skills. **open-seo** is the best self-hosted SEO platform reference.

Sources: [ZensInk](https://github.com/ZensInk/zens-ink-seo-package), [octopusOn/seo-keyword-research](https://github.com/octopusOn/seo-keyword-research), [open-seo](https://github.com/every-app/open-seo), [seotoolsuite](https://github.com/nitishkgupta/seotoolsuite), [quantumproxies/keyword-research-tool](https://github.com/quantumproxies/keyword-research-tool), [SerpBear](https://github.com/towfiqi/serpbear), [GitHub seo-tools topic](https://github.com/topics/seo-tools).

---

## 4) Data visualization libraries (frontend — this repo uses Chart.js already)

The frontend already uses **Chart.js** (MIT, ~65k stars) via Vite. Good choice; keep it.

### GOOD / Recommended

| Library | License | Stars (~) | Best for |
|---|---|---|---|
| Chart.js | MIT | ~65k | Lightweight dashboards — already in repo; simple, responsive, MIT. |
| D3.js | BSD-3 | ~111k | Full control / custom SVG visualizations; steep learning curve. |
| Apache ECharts | Apache-2.0 | ~62k | Rich interactive charts, big datasets. |
| ApexCharts | MIT | ~15k | Modern interactive charts, responsive. |
| Plotly.js | MIT | ~17k | 40+ chart types incl. 3D, statistical, SVG maps; built on d3 + stack.gl. |
| Recharts | MIT | ~25k | React-composable charts (only if you move to React). |

**Verdict:** Stay with Chart.js for this repo. Consider D3.js or ECharts only if you need custom network/scatter visualizations beyond Chart.js's 8 core types.

Sources: [cube.dev front-end data tools](https://awesome.cube.dev/), [dotsquares 12 libraries 2025](https://www.dotsquares.com/press-and-events/tech/best-javascript-data-visualisation-libraries), [G2 best visualization libraries 2026](https://learn.g2.com/best-data-visualization-libraries).

---

## 5) "Skills" — agent skills, MCP servers, prompt skills

The user explicitly asked for "skills." In the current open-source landscape this means:
- **MCP servers** (Model Context Protocol) — expose tools to AI assistants over stdio/HTTP.
- **Agent skills** — installable prompt/tool packages (e.g. `npx skills add ...`).
- **Prompt skills** — markdown `SKILL.md` definitions for Cursor/Windsurf/Codex/OpenClaw.

### GOOD / Recommended

| Repo | Type | License | Notes |
|---|---|---|---|
| ZensInk/zens-ink-seo-package | MCP stdio server + agent skill | MIT | `python3 -m zens_ink.mcp` exposes every CLI tool as an MCP tool; `npx skills add ZensInk/zens-ink-seo-package --skill ...` registers agent skills. Pure stdlib Python — drop-in for this Flask backend. |
| nexscope-ai/amazon-skills | Prompt skills + Bash scripts | Unstated/CC-ish | **Already referenced** in this repo as inspiration. 48 `SKILL.md` files (keyword research, niche finder, competitor analysis, listing optimization). **Not executable standalone** — relies on host LLM to synthesize; no DB, no API server, non-deterministic. Reference only, do not execute directly. |
| Browser Use | AI browser agent | MIT | ~119k stars; agent that operates a browser to complete tasks/extract data. Good if you later want LLM-driven Amazon navigation. |

### BAD / Avoid
- Any "skill" that is only a marketing landing page with no installable code/MCP server.
- Prompt-skill repos without `SKILL.md` structure or a runnable harness.

---

## 6) Relevance to this repo — what to integrate vs avoid

### Already integrated (keep)
- `rxpelle/kdp-scout` — primary engine (MIT, active).
- `pangolinfoapi/amazon-niche-finder` — optional enrichment toggle (API-key gated).
- `nexscope-ai/amazon-skills` — design inspiration for scoring prompts & report templates only.
- Chart.js — frontend visualization.

### Strong candidates to add
1. **ZensInk** (`ZensInk/zens-ink-seo-package`) — MIT, zero-dependency Python keyword research + clustering + intent + site audit; ships MCP server + agent skill. Fits the Flask backend and directly addresses the "skills" part of your request. Evaluating it is the highest-value next step.
2. **Playwright** — only if a target site (e.g. Amazon) starts requiring JS rendering that `requests`+`BeautifulSoup` can't handle.
3. **Crawl4AI** — only if you later build an LLM/RAG pipeline over scraped content (read its attribution clause first).

### Do not integrate
- All `.exe`/paid-license Amazon "scrapers" (yasinsayal, KaziArman, jaishasohail).
- `nexscope-ai/awesome-amazon-seller-tools` — list only, no code.
- `hulyx/scout-app` — PyQt6 desktop GUI, Windows BAT installer, not web-compatible (repo already reached this conclusion).
- Firecrawl/Maxun — AGPL copyleft, legal review needed before any closed-source use.

---

## Recommended starter stack for this repo

| Layer | Choice | License | Why |
|---|---|---|---|
| Backend language | Python 3.10+ | — | Already in repo. |
| Research engine | `rxpelle/kdp-scout` patterns | MIT | Already ported into `backend/kdp_engine/`. |
| Keyword research add-on | ZensInk | MIT | Zero-dep Python, MCP + agent skill. |
| Optional enrichment | Pangolinfo `filter_niches` | MIT | API-key gated toggle. |
| HTML parsing | BeautifulSoup + lxml | MIT / BSD | Already in repo. |
| JS rendering (if needed) | Playwright | Apache-2.0 | Add on demand. |
| Frontend charts | Chart.js | MIT | Already in repo. |
| Data contract | ACTUAL/ESTIMATED/SIMULATED/UNAVAILABLE | — | Already enforced; keep. |

---

## Caveats

- **Amazon ToS / anti-bot:** Scraping Amazon search/product pages is subject to bot detection and CAPTCHA. All recommended scrapers require rate-limiting, UA rotation, and (at scale) residential proxies. This repo already enforces conservative rate limits (0.18–1.2s), backoff on 429/503, and never bypasses CAPTCHA — keep that contract.
- **Autocomplete ≠ search volume:** The public Amazon suggestions API gives position/rank, not monthly volume. Label as ESTIMATED unless DataForSEO returns actual volume (already done in this repo).
- **Star counts are snapshots:** They shift; verify `pushed_at`, release cadence, and open issues on each repo before depending on it.
- **License:** Always read the LICENSE file of anything you integrate; AGPL/GPL impose obligations that MIT/Apache/BSD do not.

---

**Bottom line:** The best open-source foundation for this repo is already in place (`kdp-scout` engine + Chart.js + the data-accuracy contract). The single highest-value addition from this research is **ZensInk** (MIT, zero-dependency Python keyword/research toolkit with MCP server + agent skill), followed by **Playwright** only if you need JavaScript rendering. Avoid all paid `.exe` "scrapers," abandoned repos, AGPL code (unless you're OK with copyleft), and list-only awesome-lists.
