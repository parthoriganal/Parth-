# Installed Agent Skills

This directory contains open-source Agent Skills (SKILL.md format) installed from GitHub publishers. Skills are plain Markdown + reference files and work with any LLM (Claude, GPT, Gemini, etc.) that supports the skills format. Most packs here are **read-only** — nothing runs. The exception is [`youtube-agent-skill`](#youtube-agent-skill), which ships six stdlib-only Python tools that are meant to be executed.

## Sources

| Publisher | Source repo | License | Skills installed |
|---|---|---|---|
| **nextlevelbuilder** | github.com/nextlevelbuilder/ui-ux-pro-max-skill | MIT | banner-design, brand, design, design-system, slides, ui-styling, ui-ux-pro-max |
| **Anthropic** | github.com/anthropics/skills | See per-skill LICENSE | academy-guide, algorithmic-art, brand-guidelines, canvas-design, claude-api, discernment-nudge, doc-coauthoring, docx, frontend-design, internal-comms, mcp-builder, pdf, pptx, skill-creator, slack-gif-creator, theme-factory, web-artifacts-builder, webapp-testing, xlsx |
| **Jakeschincariol** | github.com/Jakeschincariol/youtube-agent-skill | MIT | yt-audit, yt-chapters, yt-comment, yt-edit, yt-package, yt-plan, yt-retention, yt-script, yt-seo, yt-shorts, yt-viral |

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

### Fine print, from upstream

- **It does not publish.** Every skill ends in a block you copy and a question. You upload.
- **`hookscore.py` is a heuristic, not a predictor.** Calibrated on 74 real short-form hooks; it separates bad hooks from real ones well, and a creator's own hits from their own misses barely at all.
- **The formula classifier judges the words on screen**, not why a video got its views.
- **`/yt-viral` reads public listings only** — it never logs in as you or touches credentials.
- **Nothing invents a number.** A skill that wants a figure it does not have asks you for it.

## Install method

These were cloned via `git clone https://github.com/<owner>/<repo>` (network: `github.com` is allowed in this sandbox). Skill folders were copied into `.claude/skills/<publisher>/<skill>/`.

`youtube-agent-skill` was installed the same way — its 11 `yt-*` folders were copied as a group into `.claude/skills/youtube-agent-skill/` so the sibling imports above keep resolving, along with its `LICENSE`, upstream `README.md` and `templates/voice.md`.

No build step, no GPU, and no display are required.

## How to use

Point your AI coding assistant (Claude Code, Cursor, Windsurf, etc.) at this directory so it can discover the skills:

- **Claude Code:** skills are auto-discovered under `~/.claude/skills/` or a project `.claude/skills/`.
- **MCP:** use a skills MCP server (e.g. `gengirish/skills-mcp`, `adelie-ai/skills-mcp`, `mk0e/skillkit-mcp`) pointed at `.claude/skills`.
- **Manual:** read any `.claude/skills/<publisher>/<skill>/SKILL.md` for that skill's instructions.

## Notes

- Sandbox limitation: GUI/video tools (EffectCraft, Krita, OpenToonz, LuxCoreRender, OSPRay, ZetaRay) could **not** be installed here — GitHub release assets are on a blocked host, `apt`/Debian repos are unreachable, no Rust toolchain, and the sandbox is headless with no GPU. Those must be installed on a local desktop machine with a GPU.
- These skill files are safe to commit; they contain no secrets and no compiled binaries. The `youtube-agent-skill` Python tools are readable source, dependency-free, and were run and verified here (`npm run verify:yt-skill`, 17/17).

