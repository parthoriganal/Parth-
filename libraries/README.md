# Downloaded Open-Source Repos & Code Libraries

Standalone open-source repositories and reusable code libraries downloaded from GitHub and tailored to this workspace (`KDP Scout Pro`, KDP publishing, procedural video/YouTube, Blender/Three.js 3D, and AI agent workflows).

Every package below was audited for permissive licensing, active maintenance, and clean runtime behavior. Run `npm run verify:downloads` from the repository root to verify all installed repos, skills, and libraries.

## Standalone GitHub Repos (`libraries/`)

| Directory | Upstream Repo | License | Language | What it provides | Quick start |
|---|---|---|---|---|---|
| `libraries/zens-ink-seo-package/` | [ZensInk/zens-ink-seo-package](https://github.com/ZensInk/zens-ink-seo-package) | MIT | Pure Python 3 (0 deps) | 22 SEO & keyword research CLI tools, Python library (`zens_ink`), and MCP stdio server (`python3 -m zens_ink.mcp`). Previously flagged as the #1 addition in `docs/OPEN_SOURCE_LIBRARY_RESEARCH.md`. | `PYTHONPATH=libraries/zens-ink-seo-package python3 -m zens_ink --help` |
| `libraries/scrapling/` | [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) | BSD-3-Clause | Python 3.10+ | High-performance adaptive HTML/XML scraping library (`Selector` + optional fetchers/spiders) for resilient Amazon/web parsing. Companion skill in `.claude/skills/scrapling/`. | `pip install -e libraries/scrapling` |
| `libraries/skillhawk/` | [Berserk-hub150/skillhawk](https://github.com/Berserk-hub150/skillhawk) | MIT | Node.js 18+ (0 deps) | Zero-dependency security scanner for Agent Skills (`SKILL.md`) and MCP configs with CLI, JSON, and SARIF outputs. | `node libraries/skillhawk/src/cli.js scan .claude/skills` |

## Installed Frontend / Creative-Coding Libraries (`package.json`)

| Package | Upstream Repo | License | Use in this workspace |
|---|---|---|---|
| `animejs` (`^4.5.0`) | [juliangarnier/anime](https://github.com/juliangarnier/anime) | MIT | Timeline, SVG, CSS, DOM, and JS object animation engine for web motion graphics, procedural videos, and UI transitions. |
| `simplex-noise` (`^4.0.3`) | [jwagner/simplex-noise.js](https://github.com/jwagner/simplex-noise.js) | MIT | Fast 2D/3D/4D procedural noise for Three.js scenes (`singularity-bloom`), shader/canvas visuals, and simulations (`gravity-lab`, `contribution-city`). |
| `three` (`^0.187.0`, pre-existing) | [mrdoob/three.js](https://github.com/mrdoob/three.js) | MIT | WebGL 3D engine powering `singularity-bloom/viewer` and 3D shorts. |
| `chart.js` (`^4.4.4`, pre-existing) | [chartjs/Chart.js](https://github.com/chartjs/Chart.js) | MIT | Dashboard charts for `KDP Scout Pro`. |

## Quick Commands

```bash
# 1. Verify all downloaded skills, repos, and libraries
npm run verify:downloads

# 2. Run ZensInk SEO CLI (zero dependencies)
PYTHONPATH=libraries/zens-ink-seo-package python3 -m zens_ink --help
PYTHONPATH=libraries/zens-ink-seo-package python3 -m zens_ink.mcp   # MCP stdio server

# 3. Security-audit any skill folder with SkillHawk (zero dependencies)
node libraries/skillhawk/src/cli.js scan .claude/skills/superpowers

# 4. Install Scrapling adaptive parser into your Python venv
pip install -e libraries/scrapling
```
