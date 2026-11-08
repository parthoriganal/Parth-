# Project context

Last reviewed: 2026-11-08. This is a navigation and continuity document, not a substitute for checking the current source, working tree, dependencies, or live services.

For agent startup, see [AGENTS.md](AGENTS.md) and the reusable Arena prompt in [docs/AGENT_MODE_START.md](docs/AGENT_MODE_START.md). Automatic loading in Arena and behavior in a fresh chat have not been verified.

> **Commit boundary:** The skill system and KDP remediation were committed locally after the original memory commit. Check `git status`, history and paths before relying on this snapshot; preserve existing changes. See [CURRENT_STATUS.md](CURRENT_STATUS.md).

## Purpose and components

The main project is a mobile-responsive KDP research dashboard and Flask API for keyword, competition, competitor, trend, category, profit and opportunity analysis. It also contains standalone visual projects: Gravity Lab (N-body simulation), Contribution City (rendered contribution graph), Singularity Bloom (Blender/three.js sculpture) and video-production assets. [README.md](README.md) and the component READMEs are entry points; [docs/COMPATIBILITY_REPORT.md](docs/COMPATIBILITY_REPORT.md) is a historical upstream audit, not proof that live integrations work today.

Architecture in the reviewed working tree:

- [index.html](index.html), [src/app.js](src/app.js) and [src/style.css](src/style.css): Vite/Chart.js dashboard. [vite.config.js](vite.config.js) proxies `/api` to Flask during development. Flask can serve `dist/` in production.
- [backend/app.py](backend/app.py): Flask endpoints, including `/api/health`, `/api/autocomplete`, `/api/mine`, `/api/research`, `/api/trends`, `/api/profit`, and competitor/category endpoints. [backend/kdp_engine](backend/kdp_engine) contains the collectors, heuristic scorer and models. Network-backed results depend on permitted access and provider availability.
- [.claude/skills](.claude/skills): original installed skills and attribution. [skillsystem/catalog.json](skillsystem/catalog.json) and [skillsystem/skill.py](skillsystem/skill.py) are the catalog and manual router/allowlisted helper dispatcher; see [docs/SKILL_SYSTEM.md](docs/SKILL_SYSTEM.md). It is not an autonomous agent or automatic publishing pipeline.
- [scripts/validate_docx_offline.py](scripts/validate_docx_offline.py) and [scripts/proof_docx.py](scripts/proof_docx.py): DOCX schema-validation wrapper and optional reflow preview. [third_party/docx4j/README.md](third_party/docx4j/README.md) documents vendored schemas and licenses. The original skills are unchanged.
- [gravity-lab](gravity-lab), [contribution-city](contribution-city), [singularity-bloom](singularity-bloom), and [video](video): separate projects/assets, not capabilities automatically supplied by the skill router.

## Data integrity and publishing boundaries

In the reviewed remediation, failed live market requests do not automatically substitute mock keywords, products, result counts or trend curves; failed research can return `UNAVAILABLE`, partial responses warn, and no score is generated when no suggestions are available. A reported `over N` result count is a lower bound. Autocomplete is **not** monthly search volume; BSR is **not** a sales count; heuristic opportunity scores do not prove demand. Profit figures use local, non-marketplace-specific assumptions labeled `ESTIMATED`; verify current official KDP terms before reliance. These describe the reviewed implementation, not guarantees about future live services. Never invent or present simulated market data as actual.

The example [practical test report](docs/kdp-practical-test/TEST_REPORT.md), [sample manuscript](docs/kdp-practical-test/manuscript-sample.md), [DOCX](docs/kdp-practical-test/manuscript-sample.docx), and [retest](docs/KDP_QUALITY_RETEST.md) are committed artifacts. The project is a hypothetical brief with one chapter, not a finished or publication-ready book. Its [reflow preview](docs/kdp-practical-test/proof/proof-reflow.pdf) is **not** a faithful Word/LibreOffice/KDP print proof; in the observed preview list markers were missing and pagination needed review.

## Dependencies and environment

- Frontend: Node/npm, Vite, Chart.js and three.js; exact declarations in [package.json](package.json) and [package-lock.json](package-lock.json). `jsdom` is a dev dependency for the simulation smoke tests. The Vite build emits `docs/COMPATIBILITY_REPORT.md` into its output; `npm run test:build-output` checks the bundled report and documentation links.
- Backend: Python and the pinned Flask, Flask-Cors, requests, BeautifulSoup, dotenv, pandas and lxml requirements in [backend/requirements.txt](backend/requirements.txt).
- Skill CLI: Python 3.9+ (3.11 tested); its eight allowlisted helpers use Python standard library and local skill assets. Other skill workflows have separate dependencies; consult the catalog and original instructions.
- Optional document QA: [requirements-proof.txt](requirements-proof.txt) adds PyMuPDF, lxml and defusedxml. PyMuPDF is AGPL-3.0 or commercially licensed; review licensing. LibreOffice and Poppler are required by the original DOCX rendering guidance but were not available in the audited sandbox. The preview is reflowed and does not substitute for them.
- Live Amazon, Google Trends and optional DataForSEO/Pangolinfo integrations need compatible network access and, where applicable, credentials. The sandbox used for the retest could not reach Amazon; provider keys were not configured. No secrets belong in this file or Git.
- Blender/FFmpeg/Playwright/browser tooling is needed for various visual or video tasks and was not available for full rendering in the audited environment. Check the current environment instead of assuming this remains true.

## Skill inventory (37)

The following historical statuses are from the audit, **not live readiness**: `tested-helper` means only the cited narrow helper/suite was exercised; `partial` means a particular operation was blocked or failed; `instruction-only` means guidance, not a deterministic executable; `not-tested` means its workflow was not functionally verified. Read [docs/SKILL_EXECUTION_AUDIT.md](docs/SKILL_EXECUTION_AUDIT.md) for per-skill evidence, dependencies and limits, and the original skill files for instructions and attribution.

| Skill | Purpose | Audit status |
|---|---|---|
| [academy-guide](.claude/skills/anthropic/academy-guide/SKILL.md) | Claude Academy course selection | instruction-only |
| [algorithmic-art](.claude/skills/anthropic/algorithmic-art/SKILL.md) | Seeded generative visual art | not-tested |
| [brand-guidelines](.claude/skills/anthropic/brand-guidelines/SKILL.md) | Anthropic brand styling | instruction-only |
| [canvas-design](.claude/skills/anthropic/canvas-design/SKILL.md) | Static art, covers and posters | not-tested |
| [claude-api](.claude/skills/anthropic/claude-api/SKILL.md) | Anthropic API and SDK references | not-tested |
| [discernment-nudge](.claude/skills/anthropic/discernment-nudge/SKILL.md) | Review consequential recommendations | instruction-only |
| [doc-coauthoring](.claude/skills/anthropic/doc-coauthoring/SKILL.md) | Collaborative structured documents | instruction-only |
| [docx](.claude/skills/anthropic/docx/SKILL.md) | Word document editing and validation | tested-helper |
| [frontend-design](.claude/skills/anthropic/frontend-design/SKILL.md) | Visual direction for interfaces | instruction-only |
| [internal-comms](.claude/skills/anthropic/internal-comms/SKILL.md) | Internal updates and communication | instruction-only |
| [mcp-builder](.claude/skills/anthropic/mcp-builder/SKILL.md) | MCP integration design | not-tested |
| [pdf](.claude/skills/anthropic/pdf/SKILL.md) | PDF inspection and forms | tested-helper |
| [pptx](.claude/skills/anthropic/pptx/SKILL.md) | PowerPoint creation and editing | partial |
| [skill-creator](.claude/skills/anthropic/skill-creator/SKILL.md) | Author and validate skills | tested-helper |
| [slack-gif-creator](.claude/skills/anthropic/slack-gif-creator/SKILL.md) | Small animated GIF production | tested-helper |
| [theme-factory](.claude/skills/anthropic/theme-factory/SKILL.md) | Visual themes and palettes | instruction-only |
| [web-artifacts-builder](.claude/skills/anthropic/web-artifacts-builder/SKILL.md) | React artifact scaffolding and bundling | not-tested |
| [webapp-testing](.claude/skills/anthropic/webapp-testing/SKILL.md) | Web UI test guidance and server helper | tested-helper |
| [xlsx](.claude/skills/anthropic/xlsx/SKILL.md) | Spreadsheet production and recalculation | partial |
| [banner-design](.claude/skills/nextlevelbuilder/banner-design/SKILL.md) | Banner composition guidance | instruction-only |
| [brand](.claude/skills/nextlevelbuilder/brand/SKILL.md) | Brand identity and token sync | tested-helper |
| [design](.claude/skills/nextlevelbuilder/design/SKILL.md) | Logo, icons and identity systems | tested-helper |
| [design-system](.claude/skills/nextlevelbuilder/design-system/SKILL.md) | Design tokens and HTML slides | tested-helper |
| [slides](.claude/skills/nextlevelbuilder/slides/SKILL.md) | Strategic HTML presentations | instruction-only |
| [ui-styling](.claude/skills/nextlevelbuilder/ui-styling/SKILL.md) | Tailwind and shadcn UI styling | tested-helper |
| [ui-ux-pro-max](.claude/skills/nextlevelbuilder/ui-ux-pro-max/SKILL.md) | Searchable UX, styling and chart guidance | tested-helper |
| [yt-audit](.claude/skills/youtube-agent-skill/yt-audit/SKILL.md) | Channel audit | instruction-only |
| [yt-chapters](.claude/skills/youtube-agent-skill/yt-chapters/SKILL.md) | Transcript chapter boundary suggestions | tested-helper |
| [yt-comment](.claude/skills/youtube-agent-skill/yt-comment/SKILL.md) | YouTube comment replies | instruction-only |
| [yt-edit](.claude/skills/youtube-agent-skill/yt-edit/SKILL.md) | Transcript edit decision list | tested-helper |
| [yt-package](.claude/skills/youtube-agent-skill/yt-package/SKILL.md) | Title and thumbnail text linting | tested-helper |
| [yt-plan](.claude/skills/youtube-agent-skill/yt-plan/SKILL.md) | Creator production schedule | instruction-only |
| [yt-retention](.claude/skills/youtube-agent-skill/yt-retention/SKILL.md) | Retention curve diagnostics | tested-helper |
| [yt-script](.claude/skills/youtube-agent-skill/yt-script/SKILL.md) | Video hooks and script guidance | tested-helper |
| [yt-seo](.claude/skills/youtube-agent-skill/yt-seo/SKILL.md) | YouTube description and search guidance | instruction-only |
| [yt-shorts](.claude/skills/youtube-agent-skill/yt-shorts/SKILL.md) | Short-form repurposing guidance | instruction-only |
| [yt-viral](.claude/skills/youtube-agent-skill/yt-viral/SKILL.md) | Outlier ranking for supplied video data | tested-helper |

## Four curated workflows

The catalog defines `kdp-research` (use the separate KDP engine; preserve source labels), `book-writing` (brief, draft, human review, optional Word/cover), `document-production` (choose the requested format and validate), and `premium-motion` (visual direction and optional narration/editing helpers; rendering is separate). They are recommendations, not automatic chains. `python3 skillsystem/skill.py workflow <name>` shows the steps and original skill paths; [docs/SKILL_SYSTEM.md](docs/SKILL_SYSTEM.md) explains the gates.

## Eight allowlisted helpers

These are explicit commands of the skill CLI; their output needs review. Fixture-level execution was verified, not full task completion:

| Helper | Skill | Narrow function |
|---|---|---|
| `hookscore` | `yt-script` | Scores supplied hook text heuristically. |
| `title` | `yt-package` | Lints YouTube title/thumbnail text, not KDP demand. |
| `deadair` | `yt-edit` | Produces transcript-based edit suggestions, not a video edit. |
| `chapters` | `yt-chapters` | Suggests chapter boundaries and draft labels from a transcript. |
| `retention` | `yt-retention` | Analyzes a supplied retention CSV, optionally with a transcript. |
| `swipe` | `yt-viral` | Ranks supplied video JSON against channel baselines; does not collect data. |
| `ux-search` | `ui-ux-pro-max` | Searches a local design/UX catalog, not an accessibility audit. |
| `slide-search` | `design-system` | Searches local slide guidance, not a deck renderer. |

Use `python3 skillsystem/skill.py run --help`, then `run <helper> --help`. `show <skill>` prints original instructions; `doctor` checks selected paths/dependencies but is not a functional test.

## Evidence and current progress

The 2026-11-08 working-tree retest ran 15 quality tests, 7 skill-system tests and 17 YouTube verification checks; the simulation smoke test, physics suite, Contribution City smoke test, Bloom model test and Vite build also passed. The offline DOCX wrapper validated 16 XML files in the sample with no reported new schema errors; its test also rejected an intentionally invalid fixture. These results do not prove current live services, visual fidelity or publication readiness. See [CURRENT_STATUS.md](CURRENT_STATUS.md) for commands, unresolved issues and next priorities, and [AI_AGENT_INSTRUCTIONS.md](AI_AGENT_INSTRUCTIONS.md) for the continuation procedure.
