# Installed Agent Skills

This directory contains **230 open-source Agent Skills** (`SKILL.md` format) across **12 publisher packs**, installed from verified GitHub repositories. Skills are plain Markdown + reference files (with optional executable helper scripts where noted) and work with Claude Code, Codex, Cursor, Windsurf, Gemini CLI, and other compatible agents.

Run `npm run verify:downloads` and `npm run verify:yt-skill` to verify the installed packs, or scan any pack with `node libraries/skillhawk/src/cli.js scan .claude/skills/<pack>`.

## Sources

| Publisher / Folder | Source repo | License | Count | Focus |
|---|---|---|---|---|
| **superpowers** | [obra/superpowers](https://github.com/obra/superpowers) | MIT | 15 | Engineering workflow: brainstorming, planning, TDD, systematic debugging, subagent execution, code review, verification |
| **mattpocock** | [mattpocock/skills](https://github.com/mattpocock/skills) | MIT | 27 | Practical engineering & productivity: grill-me, codebase design, domain modeling, specs/tickets, triage, handoff, TDD |
| **blender** | [arjun988/blender-skills](https://github.com/arjun988/blender-skills) | MIT | 94 | Production Blender workflows: modeling, PBR materials, lighting, camera cinematography, rigging, animation, compositing, export |
| **threejs** | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | MIT | 13 | Three.js fundamentals, geometry, materials, shaders, lighting, loaders, animation, postprocessing, asset pipeline, R3F |
| **remotion** | [remotion-dev/skills](https://github.com/remotion-dev/skills) | See upstream | 13 | Official Remotion programmatic video skills: best practices, captions, multimedia, render, interactivity, studio |
| **marketing** | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | MIT | 19 | Curated SEO, AI-SEO, copywriting, content strategy, launch, pricing, CRO, competitor profiling, social, video |
| **zens-ink-seo** | [ZensInk/zens-ink-seo-package](https://github.com/ZensInk/zens-ink-seo-package) | MIT | 9 | Keyword research, difficulty, search intent, competitor gap, Reddit blue-ocean, rank tracking, GEO readiness, site audit (paired with `libraries/zens-ink-seo-package/`) |
| **scrapling** | [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) | BSD-3-Clause | 1 | Adaptive web scraping, spiders, RAG scraping, MCP server, and migrating from BeautifulSoup (paired with `libraries/scrapling/`) |
| **supabase** | [supabase/agent-skills](https://github.com/supabase/agent-skills) | MIT | 2 | Official Supabase & Postgres performance/schema best practices |
| **nextlevelbuilder** *(pre-existing)* | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | MIT | 7 | banner-design, brand, design, design-system, slides, ui-styling, ui-ux-pro-max |
| **anthropic** *(pre-existing)* | [anthropics/skills](https://github.com/anthropics/skills) | See per-skill LICENSE | 19 | academy-guide, algorithmic-art, brand-guidelines, canvas-design, claude-api, discernment-nudge, doc-coauthoring, docx, frontend-design, internal-comms, mcp-builder, pdf, pptx, skill-creator, slack-gif-creator, theme-factory, web-artifacts-builder, webapp-testing, xlsx |
| **youtube-agent-skill** *(pre-existing)* | [Jakeschincariol/youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill) | MIT | 11 | yt-audit, yt-chapters, yt-comment, yt-edit, yt-package, yt-plan, yt-retention, yt-script, yt-seo, yt-shorts, yt-viral |

## youtube-agent-skill

Eleven skills that run a YouTube channel, installed at `.claude/skills/youtube-agent-skill/yt-*/`. Free, MIT, **no API key and nothing to connect**. Upstream: [Jakeschincariol/youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill) (MIT, `LICENSE` retained in the folder).

| command | what it does |
|---|---|
| `/yt-script` | One idea into a script. Five hooks off 21 formulas, scored, then the spoken script with retention beats marked. |
| `/yt-package` | Title and thumbnail as one pairing, linted for truncation, duplication and vagueness. |
| `/yt-edit` | A transcript into an edit decision list: dead air, filler cues, retakes, with timecodes. |
| `/yt-comment` | The comment section triaged into four piles, then replies in your voice. Says which to pin. |
| `/yt-plan` | A week that fits the hours you actually have. One anchor, one cheap one, three Shorts. |
| `/yt-viral` | What is working in your niche, ranked by multiple over each channel's own median. |
| `/yt-retention` | Your retention export read properly: hook leak, the cliffs, the slide, and what to change. |
| `/yt-shorts` | The Shorts already inside a long video, with a new first line written for each. |
| `/yt-seo` | The description, the tags worth having, and the three queries this should win. |
| `/yt-chapters` | Chapters from a transcript, validated against YouTube's own rules so they render. |
| `/yt-audit` | The whole channel, ending in ONE fix rather than twenty. |

### The six tools

Plain Python 3, **no dependencies, no network, no API key** — audited: the only imports are `csv`, `json`, `os`, `re`, `statistics`, `sys`, and there are no `subprocess`/`eval`/HTTP calls in any of them.

```bash
cd .claude/skills/youtube-agent-skill
python3 yt-script/hookscore.py --hook "one line"          # 5-property hook panel
python3 yt-package/title.py --title "..." --thumb "..."   # title + thumbnail linter
python3 yt-edit/deadair.py transcript.srt                 # edit decision list
python3 yt-chapters/chapters.py transcript.srt            # validated chapters
python3 yt-retention/retention.py retention.csv           # where they left, and why
python3 yt-viral/swipe.py collected.json --min 2.0        # outliers by own-channel multiple
```

`npm run verify:yt-skill` runs all six against generated fixtures and asserts on their output (17 checks).

### ⚠️ Keep the 11 folders together

Three tools import **across sibling folders**, so the pack must stay under one common parent — moving a single `yt-*` folder out breaks it at runtime with `ModuleNotFoundError: No module named 'deadair'`:

- `yt-chapters/chapters.py` → `../yt-edit/deadair.py`
- `yt-retention/retention.py` → `../yt-edit/deadair.py` (only with `--transcript`)
- `yt-viral/swipe.py` → `../yt-script/hooks.json`

### Voice profile

Six skills read `~/.claude/youtube/voice.md` for how you actually talk. The blank template is at `youtube-agent-skill/templates/voice.md` — copy it there and fill it in, or send three of your own videos and ask for it to be written from those.

## Install method

All packs were cloned shallowly via `git clone --depth 1 https://github.com/<owner>/<repo>`, audited with SkillHawk (`libraries/skillhawk/`), and copied cleanly (excluding `.git` metadata) into `.claude/skills/<publisher>/` with upstream `LICENSE` files preserved.

## How to use

Point your AI coding assistant (Claude Code, Cursor, Windsurf, Codex, etc.) at this directory:

- **Claude Code:** project skills are auto-discovered under `.claude/skills/`.
- **MCP:** point a skills MCP server at `.claude/skills`, or launch ZensInk's built-in MCP server via `PYTHONPATH=libraries/zens-ink-seo-package python3 -m zens_ink.mcp`.
- **Manual:** read any `.claude/skills/<publisher>/<skill>/SKILL.md` for that skill's instructions.
