# Best Open Source Repos, Code Libraries & Skills — Master Table

**Purpose:** Single filtered table of the best open-source GitHub repositories, code libraries, and skills relevant to (a) a KDP/Amazon keyword & niche research platform and (b) video creation by style.  
**Research date:** 2026-11-05. Star counts are approximate ("~"). Branch: `arena/3ff51f4b-parth`.

**Verdicts:** ✅ Recommended | ⚠️ Conditional (license/maturity check) | ❌ Avoid

---

## Master table — good vs bad, best for category

| # | Domain | Category | Repo / Library | License | Stars (~*) | Best for | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Research | Web scraping (Python) | Scrapy (`scrapy/scrapy`) | BSD-3-Clause | ~63k | Production Python crawls; pipelines, throttling, retries | ✅ |
| 2 | Research | Web scraping (Node) | Crawlee (`apify/crawlee`) | Apache-2.0 | ~24k | All-in-one Node scraping; queue/storage/proxy rotation | ✅ |
| 3 | Research | Web scraping (multi) | Playwright (`microsoft/playwright`) | Apache-2.0 | ~92k | JS-heavy sites; auto-wait, Chromium/Firefox/WebKit | ✅ |
| 4 | Research | Web scraping (Node) | Puppeteer (`puppeteer/puppeteer`) | Apache-2.0 | ~95k | Chrome-first headless Chromium via CDP | ✅ |
| 5 | Research | Scraping → LLM/RAG | Crawl4AI (`unclecode/crawl4ai`) | Apache-2.0 (+attr.) | ~70–81k | Markdown output, REST API, MCP for LLM/RAG pipelines | ⚠️ |
| 6 | Research | Scraping (Python) | Scrapling (`D4Vinci/Scrapling`) | BSD-3-Clause | ~67–75k | Modern HTTP + browser fetching, Markdown output | ✅ |
| 7 | Research | HTML parsing | BeautifulSoup / lxml / requests | MIT / BSD | — | Static HTML parsing — already in `backend/requirements.txt` | ✅ |
| 8 | Research | Anti-bot TLS | curl_cffi | — | — | Bypass TLS/JA3 fingerprinting on protected targets | ✅ |
| 9 | Research | AI browser agent | Browser Use | MIT | ~119k | LLM-driven browser automation to extract data | ✅ |
| 10 | Research | Amazon/KDP engine | rxpelle/kdp-scout | MIT | ~91 | **Already integrated** — primary engine: autocomplete, scraping, BSR model, scoring, DataForSEO, SQLite | ✅ |
| 11 | Research | Amazon enrichment | pangolinfoapi/amazon-niche-finder | MIT | — | **Already integrated** — blue-ocean niche feed via `filter_niches` (API-key gated, 200 free calls) | ✅ |
| 12 | Research | Amazon reference | thirdwatch-dev/amazon-scraper | MIT | — | 18 Amazon marketplaces; product/listing/reviews/ASIN fields | ✅ |
| 13 | Research | Amazon reference | ian-kerins/amazon-python-scrapy-scraper | MIT | ~92 | Keyword → ASIN → product page fields; pattern reference | ✅ |
| 14 | Research | Keyword research toolkit | ZensInk/zens-ink-seo-package | MIT | ~50–70 | **Highest-value add** — zero-dep Python, 20 CLI tools, MCP server + agent skill | ✅ |
| 15 | Research | Keyword research | octopusOn/seo-keyword-research | MIT or Apache-2.0 | ~0 | Free keyword ideas + SERP clustering + intent/CPC | ✅ |
| 16 | Research | SEO platform | open-seo (every-app / arturseo-geo) | MIT | ~26.3k | Self-hosted Semrush/Ahrefs alternative; keyword, backlinks, audits | ✅ |
| 17 | Research | SEO tools | nitishkgupta/seotoolsuite | MIT | — | DataForSEO-powered keyword/competitive/backlink research | ✅ |
| 18 | Research | Google autocomplete | quantumproxies/keyword-research-tool | MIT | ~0 | Expand one seed into up to 500 suggestions with relevance scores | ✅ |
| 19 | Research | Rank tracking | SerpBear (towfiqi/serpbear) | — | — | Unlimited keyword positions, email alerts, SERP API, GSC | ✅ |
| 20 | Research | Frontend charts | Chart.js | MIT | ~65k | **Already in repo** — lightweight responsive dashboards | ✅ |
| 21 | Research | Frontend charts | D3.js / ECharts / Plotly.js / ApexCharts / Recharts | BSD/MIT/Apache | ~111k / ~62k / ~17k / ~15k / ~25k | Custom/network/3D visualizations beyond Chart.js core types | ✅ |
| 22 | Skills | MCP / agent skill | ZensInk (MCP stdio + agent skill) | MIT | ~50–70 | `python3 -m zens_ink.mcp`; `npx skills add ZensInk/zens-ink-seo-package` | ✅ |
| 23 | Skills | Prompt skills | nexscope-ai/amazon-skills | Unstated | ~1–3k | 48 `SKILL.md` prompt defs — reference only, not executable standalone | ⚠️ |
| 24 | Video | Motion graphics (desktop) | EffectCraft (`storytold/effectcraft`) | MIT or Apache-2.0 | ~2–5k | After Effects alternative: layers, keyframes, 306 effects, expressions, render queue | ✅ |
| 25 | Video | Motion graphics (web) | mo-js (`mojs/mojs`) | MIT | ~18k | Web motion graphics: shape, swirl, burst, stagger (SVG/HTML) | ✅ |
| 26 | Video | Motion graphics (desktop) | Premation (`isroil01/premation`) | AGPL-3.0 | ~1–3k | 2.5D cameras, graph editor, After Effects-like timeline | ⚠️ |
| 27 | Video | 3D animation & render | Blender (`blender/blender`) | GPL-2.0+ | ~40–50k | Full 3D pipeline: model, rig, animate, simulate, render (Cycles+EEVEE) | ✅ |
| 28 | Video | 3D modeling | Dust3D (`Dust3D/Dust3D`) | MIT | ~8–10k | Fast watertight 3D modeling for characters & game assets | ✅ |
| 29 | Video | 3D engine | Armory 3D (`armory3d/armory`) | Zlib | ~2–4k | Open-source 3D game engine with full Blender integration | ✅ |
| 30 | Video | Cinematic path-trace | LuxCoreRender (`LuxCoreRender/LuxCore`) | Apache-2.0 | ~3–5k | Physically based path tracing: caustics, dispersion, volumetric (GPU) | ✅ |
| 31 | Video | Cinematic path-trace | OSPRay (`ospray/ospray`) | Apache-2.0 | ~2–4k | Scalable portable ray-tracing engine for high-fidelity viz | ✅ |
| 32 | Video | Real-time path-trace | ZetaRay (`alipbcs/ZetaRay`) | MIT | ~300–500 | Real-time Direct3D 12 path tracer, ReSTIR GI, hardware ray tracing | ✅ |
| 33 | Video | 2D frame-by-frame | Krita (`Krita/krita`) | GPL-3.0 | ~10–15k | Painting + frame-by-frame 2D, brush engine, onion skinning | ✅ |
| 34 | Video | 2D traditional pipeline | OpenToonz (`opentoonz/opentoonz`) | BSD-style | ~8–10k | Production 2D (Studio Ghibli), exposure sheet, node compositing | ✅ |
| 35 | Video | 2D vector tweening | Synfig Studio (`Synfig/Synfig`) | GPL-3.0 | ~4–6k | Bone rigging + auto tweening, vector cut-out animation | ✅ |
| 36 | Video | 2D beginner | Pencil2D (`pencil2d/pencil`) | GPL-2.0+ | ~8–10k | Simple hand-drawn frame-by-frame 2D | ✅ |
| 37 | Video | 2.5D animation | Premation (`isroil01/premation`) | AGPL-3.0 | ~1–3k | 2.5D cameras, graph editor, After Effects-like timeline | ⚠️ |
| 38 | Video | 2.5D / 3D web | three.js (`mrdoob/three.js`) | MIT | ~90–100k | WebGL 3D library for browser scenes, cameras, lights, animation | ✅ |
| 39 | Video | Web animation (code) | Anime.js (`juliangarnier/anime`) | MIT | ~45–50k | Lightweight JS engine for CSS, SVG, DOM, JS objects | ✅ |
| 40 | Video | Web animation (timeline) | Scene.js (`daybrush/scenejs`) | MIT | ~2–4k | JavaScript & CSS timeline-based animation | ✅ |
| 41 | Video | Web tweening | TweenJS / Between.js | MIT | ~5–10k | Lightweight tweening/animation engines | ✅ |
| 42 | Research | Scraping (abandoned) | Colly (Go) | Apache-2.0 | ~25k | Last release 1–2 years ago — not actively maintained | ❌ |
| 43 | Research | Scraping (heavy) | Selenium | Apache-2.0 | ~34k | Superseded by Playwright/Puppeteer | ❌ |
| 44 | Research | Scraping (copyleft) | Firecrawl self-hosted | AGPL-3.0+ | ~177k | Copyleft risk for closed-source SaaS | ❌ |
| 45 | Research | Scraping (copyleft) | Maxun | AGPL-3.0 | ~16k | Copyleft; self-hosted no-code but license-restrictive | ❌ |
| 46 | Research | Amazon (.exe/paid) | yasinsayal, KaziArman, jaishasohail | — | 0 / paid | Not actually open source; paid license, no source code | ❌ |
| 47 | Research | List only (no code) | nexscope-ai/awesome-amazon-seller-tools | — | — | Curated markdown of paid tools; zero integration value | ❌ |
| 48 | Research | Desktop-only GUI | hulyx/scout-app | MIT | — | PyQt6 desktop, Windows BAT installer; not web-compatible | ❌ |
| 49 | Video | Paid/no-source tools | Various ".exe" video tools | — | — | No source code; paid license | ❌ |

*\*Star counts are approximate snapshots as of 2026-11-05; verify `pushed_at`, release cadence, and open issues on GitHub before depending on a repo.*

---

## Recommended starter stack — KDP research platform (`parthoriganal/Parth-`)

| Layer | Choice | License | Why |
|---|---|---|---|
| Backend language | Python 3.10+ | — | Already in repo (`backend/app.py`, Flask). |
| Research engine | `rxpelle/kdp-scout` patterns | MIT | Already ported into `backend/kdp_engine/`. |
| Keyword research add-on | **ZensInk** | MIT | Zero-dep Python; MCP server + agent skill; fits Flask backend. |
| Optional enrichment | Pangolinfo `filter_niches` | MIT | API-key gated toggle (200 free calls). |
| HTML parsing | BeautifulSoup + lxml | MIT / BSD | Already in repo. |
| JS rendering (on demand) | Playwright | Apache-2.0 | Add only if a target requires JS rendering. |
| Frontend charts | Chart.js | MIT | Already in repo. |
| Data contract | ACTUAL / ESTIMATED / SIMULATED / UNAVAILABLE | — | Already enforced; never invent data. |

## Recommended starter stack — video by style

| If you want to… | Use this |
|---|---|
| Full animated short film (3D) | **Blender** + **LuxCoreRender** for cinematic path-traced frames |
| Motion graphics / titles / VFX | **EffectCraft** (desktop) or **mo-js** (web) |
| 2D cartoons frame-by-frame | **Krita** or **OpenToonz** |
| 2D vector cut-out / rigged | **Synfig Studio** |
| Simple hand-drawn 2D (beginner) | **Pencil2D** |
| 2.5D animation | **Premation** (⚠️ AGPL-3.0) |
| Web / UI motion graphics | **mo-js**, **Anime.js**, **three.js** |
| Cinematic photorealistic renders | **LuxCoreRender**, **OSPRay**, or **ZetaRay** |
| AI agent skills (MCP) | **ZensInk** (MIT, zero-dep Python) |

## What to avoid

- Paid ".exe" tools with no source code (e.g., yasinsayal, KaziArman) — not actually open source.
- Abandoned repos (no commits/releases in 1–2+ years).
- AGPL tools if building closed-source SaaS — legal review required (copyleft).
- Prompt-skill repos with no runnable harness / MCP server — reference only.
- `hulyx/scout-app` — PyQt6 desktop GUI, Windows-only; not web-compatible.

---

## Files in this repo

- `docs/OPEN_SOURCE_LIBRARY_RESEARCH.md` — deep research report (KDP/scraping/SEO/visualization/skills).
- `docs/VIDEO_OPEN_SOURCE_BY_CATEGORY.md` — video tools organized by style/category.
- `video_narration.mp3` — narrated voiceover for the video table.
- `video_preview.gif` — animated preview of all video category frames.
- `video_frames/*.png` — 10 individual 1280×720 frames.

**Bottom line:** Your repo's existing foundation (`kdp-scout` engine + Chart.js + the ACTUAL/ESTIMATED/SIMULATED data-accuracy contract) is already the best open-source base. The single highest-value addition is **ZensInk** (MIT, zero-dependency Python keyword/research toolkit with MCP server + agent skill). Verify licenses before commercial use.
