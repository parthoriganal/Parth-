# Installed Agent Skills

This directory contains open-source Agent Skills (SKILL.md format) installed from GitHub publishers. Skills are plain Markdown + reference files — they are **read-only**, never executed by the sandbox, and work with any LLM (Claude, GPT, Gemini, etc.) that supports the skills format.

## Sources

| Publisher | Source repo | License | Skills installed |
|---|---|---|---|
| **nextlevelbuilder** | github.com/nextlevelbuilder/ui-ux-pro-max-skill | MIT | banner-design, brand, design, design-system, slides, ui-styling, ui-ux-pro-max |
| **Anthropic** | github.com/anthropics/skills | See per-skill LICENSE | academy-guide, algorithmic-art, brand-guidelines, canvas-design, claude-api, discernment-nudge, doc-coauthoring, docx, frontend-design, internal-comms, mcp-builder, pdf, pptx, skill-creator, slack-gif-creator, theme-factory, web-artifacts-builder, webapp-testing, xlsx |

## Install method

These were cloned via `git clone https://github.com/<owner>/<repo>` (network: `github.com` is allowed in this sandbox). Skill folders were copied into `.claude/skills/<publisher>/<skill>/`.

No build step, no GPU, and no display are required — skills are SKILL.md definitions plus static reference/scripts files.

## How to use

Point your AI coding assistant (Claude Code, Cursor, Windsurf, etc.) at this directory so it can discover the skills:

- **Claude Code:** skills are auto-discovered under `~/.claude/skills/` or a project `.claude/skills/`.
- **MCP:** use a skills MCP server (e.g. `gengirish/skills-mcp`, `adelie-ai/skills-mcp`, `mk0e/skillkit-mcp`) pointed at `.claude/skills`.
- **Manual:** read any `.claude/skills/<publisher>/<skill>/SKILL.md` for that skill's instructions.

## Notes

- Sandbox limitation: GUI/video tools (EffectCraft, Krita, OpenToonz, LuxCoreRender, OSPRay, ZetaRay) could **not** be installed here — GitHub release assets are on a blocked host, `apt`/Debian repos are unreachable, no Rust toolchain, and the sandbox is headless with no GPU. Those must be installed on a local desktop machine with a GPU.
- These skill files are safe to commit; they contain no secrets and no executable binaries.
