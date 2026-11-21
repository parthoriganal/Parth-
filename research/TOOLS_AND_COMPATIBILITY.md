# Tools & Skills Actually Used — and Their Device Compatibility

**Run date:** 2026-11-21 · **Branch:** `arena/7de5ce58-parth`
This file documents the exact repos/skills used, what each did, and its Android/mobile vs PC requirements. Everything listed was **actually executed** in this research — nothing here is a bare recommendation.

---

## 0. Skills inspected first (per the brief)

`.claude/skills/` is installed in this repo. I inspected the manifest (`.claude/skills/README.md`) and the publishers:

| Publisher | Repo | Verdict for this task |
|---|---|---|
| **Anthropic** | `anthropics/skills` | ❌ Not relevant — design/docs/office skills (docx, pptx, xlsx, pdf, canvas-design, brand-guidelines). No market-research capability. |
| **nextlevelbuilder** | `nextlevelbuilder/ui-ux-pro-max-skill` | ❌ UI/UX only. |
| **Jakeschincariol** | `Jakeschincariol/youtube-agent-skill` | ❌ YouTube — wrong platform. Explicitly excluded: the goal is organic *Amazon* sales without an audience, and this pack assumes a channel. |

**Honest finding: no installed skill does Amazon/KDP research.** The relevant engine was already inside the repo itself (`backend/kdp_engine/`) — so I used that rather than pretending a generic skill covered it.

---

## 1. The research engine — used for scoring

### `rxpelle/kdp-scout` (MIT) — *primary engine, already ported into this repo*
- **What it is:** Python 3.9+ CLI/engine for Amazon keyword mining, competition stats, BSR→sales modelling.
- **What I actually ran:** `backend/kdp_engine/scorer.py` (the 0–100 five-pillar opportunity score), `backend/kdp_engine/bsr_model.py` (`estimate_daily_sales`, `ebook_royalty` for the $6.99/$9.99/$12.99 royalty table), and the ported `autocomplete.py` HTTP pattern (the same `completion.amazon.com/api/2017/suggestions` endpoint and `alias=digital-text` convention I queried live).
- **Directly produced in this run:** the full candidate ranking table and every royalty figure in the report.
- **Compatibility:** ✅ **Android works** (Termux: `pkg install python`) for scoring/royalty math — pure Python, no display.
  ⚠️ **PC preferred** for the scraping collectors (Amazon blocks/TLS-throttles mobile IPs and residential proxies are easier on desktop). Desktop-only for `click`/`rich` CLI output and the SQLite cron automation.

### `pangolinfoapi/amazon-niche-finder` (MIT) — *optional enrichment, NOT used*
- **Why not used:** requires a **paid Pangolinfo API key**. The brief asked for free/working tools, and I will not present a key-gated tool as if it produced data. Documented and skipped.

### `hulyx/scout-app` (MIT) — *NOT used*
- **Why not:** PyQt6 **desktop GUI** with Windows `.bat` installers. Incompatible with mobile and headless use; logic is already covered by kdp-scout.

### `nexscope-ai/amazon-skills` — *NOT used*
- **Why not:** prompt templates and shell scripts, not an executable research service. No metrics to obtain.

---

## 2. Live data sources — actually queried

| Source | Endpoint | What it gave me | Compatibility |
|---|---|---|---|
| **Amazon autocomplete** | `completion.amazon.com/api/2017/suggestions?alias=digital-text&prefix=…` | Real suggestions + the `digital-text` vs `aps` department signal | ✅ Android + PC — plain GET, JSON |
| **Amazon search (SERP)** | `amazon.com/s?k=…&i=digital-text` | **"1-16 of N results"** counts, review counts, prices, pub dates | ✅ PC → ⚠️ Android: works but pages are ad-heavy (15–20 chunks); heavy to parse on a phone |
| **Google suggest** | `suggestqueries.google.com/complete/search?client=firefox&q=…` | Independent demand cross-check, query phrasing | ✅ Android + PC — tiny payload |
| **Wikimedia Pageviews API** | `wikimedia.org/api/rest_v1/metrics/pageviews/…` | 3-year normalized trend series | ✅ Android + PC — ~3 KB JSON |

---

## 3. Workarounds I tested and rejected (and why)

| Attempt | Result | Note |
|---|---|---|
| `curl` Amazon from sandbox shell | ❌ `000` — blocked | egress only to GitHub/npm/PyPI; used the agent fetch tool instead |
| `r.jina.ai` proxy for Amazon | ❌ Returned Amazon's **checkpoint/CAPTCHA** page | Do not rely on it for Amazon |
| Full `/dp/{ASIN}` product pages | ⚠️ 18 chunks each for BSR/sales data | Too expensive; SERP review counts gave the same competitiveness signal far cheaper |
| `pytrends` / Google Trends | ❌ Not installable (no PyPI egress, PEP 668) and rate-limited | Replaced with the control-normalized Wikimedia series — arguably more rigorous |

---

## 4. Mobile vs PC summary

| Task | Android | PC |
|---|---|---|
| Run `scorer.py` / `bsr_model.py` | ✅ Termux | ✅ Native |
| Live autocomplete + Google suggest | ✅ | ✅ |
| Amazon SERP scraping at scale | ⚠️ works, painful | ✅ Recommended |
| Category/BSR scraping loops | ❌ | ✅ |
| SQLite keyword DB + cron | ⚠️ possible | ✅ |

**Bottom line:** the *analysis* is fully reproducible on Android; the *collection* phase wants a PC. That asymmetry is why the report leans on autocomplete counts rather than bulk-scraped BSR.

---

## 5. What no free tool could give me

- **Actual units sold** by any competitor
- **BSR** at the time of research (only via `/dp/` pages, which were prohibitively heavy)
- **Monthly search volume** (DataForSEO/Helium10 — paid)
- **Ad/bid and keyword-difficulty data**

These gaps are the reason the deliverable ends in a **21-day go/no-go test** rather than declaring the niche "validated." I have deliberately not filled them with estimates.
