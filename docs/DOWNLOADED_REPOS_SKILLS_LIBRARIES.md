# Downloaded Best GitHub Repos, Agent Skills & Code Libraries

**Snapshot date:** 2026-11-20 (GitHub star counts & `pushed_at` verified live via GitHub API)  
**Branch:** `arena/6d93fbb7-parth`

---

## How these were selected for your workspace

Separate chat threads outside this session are not accessible, so every selection below was tailored directly from your repository history in `parthoriganal/Parth-` (PRs #1–#12, existing `.claude/skills/`, `docs/OPEN_SOURCE_LIBRARY_RESEARCH.md`, `docs/BEST_OPEN_SOURCE_MASTER_TABLE.md`, `docs/VIDEO_OPEN_SOURCE_BY_CATEGORY.md`, and your connected Supabase integration):

| Your recurring work in `Parth-` | What was missing | What was downloaded |
|---|---|---|
| **KDP Scout Pro, SEO & Book Publishing** (main app + PR #12 KDP book) | Your own research doc named `ZensInk` #1 and `Scrapling` top Python scraper — neither was downloaded yet | `ZensInk/zens-ink-seo-package` (repo + 22 CLI tools + MCP + 9 skills), `D4Vinci/Scrapling` (library + skill), 19 curated `marketingskills` |
| **3D Art, Blender (`bpy`) & Three.js** (`singularity-bloom`, `contribution-city`, PRs #1, #3, #6, #7, #8, #10) | `three@0.187.0` was installed, but no Three.js/Blender skills or procedural noise library | `arjun988/blender-skills` (94 skills), `CloudAI-X/threejs-skills` (13 skills), `simplex-noise` (npm) |
| **YouTube & Programmatic Code-Generated Video** (`video/`, PRs #2, #4, #6, #7, #11) | `youtube-agent-skill` was installed, but no programmatic video skill or web animation engine (`animejs`) | `remotion-dev/skills` (13 official video-as-code skills), `animejs` v4 (npm) |
| **Engineering Discipline, Security & Connected Stack** (Flask/Vite/Node + connected Supabase) | Only Anthropic & UI/UX skills were installed; no TDD/debugging workflow pack, no skill security scanner, no Supabase skill | `obra/superpowers` (15 skills), `mattpocock/skills` (27 skills), `supabase/agent-skills` (2 skills), `Berserk-hub150/skillhawk` (repo/scanner) |

---

## 1. Downloaded Agent Skills (`.claude/skills/`) — 193 new skills (230 total)

| Pack | GitHub Repo | Stars (2026-11-20) | License | Skills | SkillHawk Scan | Local Path |
|---|---|---:|---|---:|---|---|
| **Superpowers** | [obra/superpowers](https://github.com/obra/superpowers) | 322,242 | MIT | 15 | 94/100 (A) · 0 crit/high | `.claude/skills/superpowers/` |
| **Matt Pocock Skills** | [mattpocock/skills](https://github.com/mattpocock/skills) | 328,293 | MIT | 27 | 85/100 (B)* | `.claude/skills/mattpocock/` |
| **Blender Skills** | [arjun988/blender-skills](https://github.com/arjun988/blender-skills) | 4,418 | MIT | 94 | 100/100 (A+) CLEAN | `.claude/skills/blender/` |
| **Three.js Skills** | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | 4,299 | MIT | 13 | 91/100 (A) · 0 crit/high | `.claude/skills/threejs/` |
| **Remotion Skills** | [remotion-dev/skills](https://github.com/remotion-dev/skills) | 7,588 | See upstream | 13 | 91/100 (A) · 0 crit/high | `.claude/skills/remotion/` |
| **Marketing & SEO Skills** (curated subset) | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | 61,558 | MIT | 19 | 91/100 (A) · 0 crit/high | `.claude/skills/marketing/` |
| **ZensInk SEO Skills** | [ZensInk/zens-ink-seo-package](https://github.com/ZensInk/zens-ink-seo-package) | 57 | MIT | 9 | 100/100 (A+) CLEAN | `.claude/skills/zens-ink-seo/` |
| **Scrapling Skill** | [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) | 104,476 | BSD-3-Clause | 1 | 100/100 (A+) CLEAN | `.claude/skills/scrapling/` |
| **Supabase Agent Skills** | [supabase/agent-skills](https://github.com/supabase/agent-skills) | 3,108 | MIT | 2 | 100/100 (A+) CLEAN | `.claude/skills/supabase/` |

*\*`mattpocock/wizard/template.sh` triggers one SkillHawk SH004 warning on a shell comment describing `.env` prompting; no malicious behavior.*

*(Pre-existing packs retained intact: `anthropic` (19), `nextlevelbuilder` (7), `youtube-agent-skill` (11).)*

---

## 2. Downloaded Standalone GitHub Repos (`libraries/`)

| Repo | GitHub | Stars (2026-11-20) | License | Runtime / Deps | Local Path | Verification |
|---|---|---:|---|---|---|---|
| **ZensInk SEO Package** | [ZensInk/zens-ink-seo-package](https://github.com/ZensInk/zens-ink-seo-package) | 57 | MIT | Python 3 stdlib (0 pip deps) | `libraries/zens-ink-seo-package/` | 23/23 unit tests PASS + 22 CLI tools + MCP stdio server |
| **Scrapling** | [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) | 104,476 | BSD-3-Clause | Python 3.10+ (`pip install -e libraries/scrapling`) | `libraries/scrapling/` | Clean editable pip install + `Selector` HTML parse verified |
| **SkillHawk** | [Berserk-hub150/skillhawk](https://github.com/Berserk-hub150/skillhawk) | 118 | MIT | Node.js 18+ (0 npm deps) | `libraries/skillhawk/` | Audited all 9 skill packs; 24/25 upstream tests pass (1 upstream SARIF rule-list test mismatch) |

---

## 3. Installed JavaScript Code Libraries (`package.json`)

| Library | GitHub | Stars (2026-11-20) | License | Version Installed | Verification |
|---|---|---:|---|---|---|
| **Anime.js** | [juliangarnier/anime](https://github.com/juliangarnier/anime) | 74,916 | MIT | `^4.5.0` | Verified Node ESM import & runtime exports (`Timeline`, `JSAnimation`, `Spring`, `SVG`/`WAAPI`) |
| **simplex-noise** | [jwagner/simplex-noise.js](https://github.com/jwagner/simplex-noise.js) | 1,855 | MIT | `^4.0.3` | Verified `createNoise2D()` runtime output |

---

## Verification

Run the automated verification suite anytime:

```bash
npm run verify:downloads   # verifies all 9 new skill packs, ZensInk, SkillHawk, Scrapling, animejs, simplex-noise
npm run verify:yt-skill    # verifies pre-existing YouTube skill tools (17 checks)
npm run verify             # verifies KDP Scout Pro frontend/backend baseline
```
