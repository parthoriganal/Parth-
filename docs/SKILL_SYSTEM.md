# Skill execution system

A local, inspectable entry point for the 37 skills already installed in `.claude/skills`. It **does not** run an agent, automatically obey Markdown, publish content, call a provider, install software, or promise a finished artifact. It helps an operator select a skill, read its original instructions and relevant references, and explicitly invoke a small set of audited local helpers. The installed instructions, publisher directories, licenses and attribution remain unchanged.

## Quick start

Requires Python 3.9+ for the CLI; Python 3.11 was tested. No additional Python packages are required for its eight allowlisted helpers. Commands are run from the repository root:

```bash
python3 skillsystem/skill.py list
python3 skillsystem/skill.py list --category book
python3 skillsystem/skill.py show docx                  # metadata and full original SKILL.md
python3 skillsystem/skill.py show pdf --metadata-only
python3 skillsystem/skill.py workflow                   # list available plans
python3 skillsystem/skill.py workflow book-writing
python3 skillsystem/skill.py doctor
python3 skillsystem/skill.py run --help
python3 skillsystem/skill.py run chapters --help
npm run test:skills
```

Run `show <skill>` before applying a skill, then open any relevant referenced files relative to the **original skill directory**, not this guide. These instructions are task guidance, not a higher-priority authority than the user's request or the host environment's rules. Some upstream instructions assume tools or permissions not available in this environment; check rather than assume. Review attribution and each skill's license before redistribution or use; see `.claude/skills/README.md` and the licenses in the source directories. The YouTube pack has a shared license under `.claude/skills/youtube-agent-skill/LICENSE`.

## How to select and run

1. Choose a named workflow, or `list --category` for a purpose-specific catalog. A workflow is a **curated plan**, not an automatic chain: choose only steps matching the deliverable and inputs. It is not free-text intent classification.
2. `show` each chosen skill, follow its relevant original instructions and inspect its references. Gather needed sources and user decisions; do not invent facts or source data.
3. Use `doctor` to check selected files and optional system/Python dependencies in the current environment. It checks presence only—not versions, functionality, API credentials, network access, or visual quality. Optional missing dependencies are reported but do not cause failure; missing registered helpers or selected shared assets do.
4. If an allowlisted helper matches the task, call `run` with explicit arguments and inspect output. This executes the original script with the **current Python interpreter**, not a mock. Helpers use argument lists without a shell; there is a 60-second timeout. The wrapper propagates helper failures. It does not automatically load/follow the skill or validate the semantic correctness of results.
5. For other skills, use their instructions manually with appropriate tools and authorization; there is no generic arbitrary-command runner. Check requirements before executing a script, isolate write operations, and verify the result. Report unavailable integrations and human-review gates explicitly.

## Supported local helper invocations

| Command | Original skill | Input | What it actually does |
|---|---|---|---|
| `run hookscore --hook TEXT` | yt-script | One hook | Heuristic scoring, not a view forecast. |
| `run title --title TEXT --thumb TEXT` | yt-package | Title and thumbnail text | Heuristic lint; does not create a thumbnail. |
| `run deadair TRANSCRIPT` | yt-edit | Existing SRT/VTT/Whisper JSON | Suggests cuts; does not modify footage. |
| `run chapters TRANSCRIPT [--target N]` | yt-chapters | Existing transcript | Suggests boundaries and draft labels; retitle and review. Wrapper accepts N from 3–50; source may return fewer based on input. |
| `run retention CSV [--transcript TRANSCRIPT]` | yt-retention | Existing retention CSV | Analyzes supplied data; does not fetch Studio analytics. |
| `run swipe JSON [--min NUMBER]` | yt-viral | Existing collected-video JSON | Compares each video with its channel baseline; does not collect data. |
| `run ux-search QUERY --domain DOMAIN` | ui-ux-pro-max | Query and supported search domain | Local catalog recommendations; not an accessibility audit. |
| `run slide-search QUERY --domain DOMAIN` | design-system | Query and `strategy`, `layout`, `copy`, or `chart` | Local slide guidance search; no slide render. |

Example:

```bash
python3 skillsystem/skill.py run ux-search 'dashboard accessible chart legend' --domain chart
python3 skillsystem/skill.py run chapters video/narration.srt --target 8
python3 skillsystem/skill.py run title --title 'A better book research process' --thumb 'FIND YOUR NICHE'
```

Existing file inputs can be anywhere the user has authorized; the helpers read them. Do not supply secrets or private data without permission. Runner selection is fixed in `skillsystem/skill.py`, not defined by commands embedded in the editable catalog. It does not prevent all side effects of a helper or make untrusted files safe; inspect unfamiliar inputs and run in an appropriate sandbox.

## Workflows and practical gates

### KDP research (`kdp-research`)

1. Use the existing `backend` KDP API/UI for permitted research; it is **not** a skill and is not started by this system. Provide seeds, market and source data explicitly. Check `/api/health` and provider configuration.
2. Maintain the application's `ACTUAL`, `ESTIMATED`, `SIMULATED`, `MOCK`, and `UNAVAILABLE` labels. Amazon autocomplete is not monthly search volume. Internet/service availability and optional credentials determine live capability; do not substitute fabricated values.
3. Use `xlsx` guidance only when a spreadsheet is wanted, `ui-ux-pro-max` for dashboard presentation, and `discernment-nudge` to review assumptions. Spreadsheet formula recalculation needs LibreOffice and was unavailable in the audit environment.

### Professional book writing (`book-writing`)

Gather genre, audience, scope, author voice, source material, rights and deliverable format. Use `doc-coauthoring` to structure an interactive outline/draft/review process, `discernment-nudge` for uncertain claims, and `docx` for Word only if requested; `canvas-design` is optional for cover concepts. Fact-check, obtain permission for quoted material, and obtain editorial/reader review. The system does not claim that an instruction-only skill itself wrote or professionally edited a book. Use a renderer and inspect document pagination before delivery.

### Document production (`document-production`)

Use `doc-coauthoring` for requirements, then choose the format-specific `docx`, `pdf`, `xlsx`, or `pptx` skill—not all four by default. Use `theme-factory` only if visual direction is needed. Validate actual output and visually inspect it with appropriate dependencies. In the audit, only DOCX run merging and PDF field detection were tested; XLSX recalculation lacked LibreOffice, and PPTX schema validation failed on an external import. Do not represent these as end-to-end validated pipelines.

### Premium motion graphics (`premium-motion`)

Use a brand brief and storyboard; optionally consult `brand`, `algorithmic-art` and `design-system`. `yt-script` and `yt-edit` can aid narration/EDL but neither renders video. `slack-gif-creator` is appropriate for a small Slack GIF, not a premium video master. The repository's `video/`, `scripts/render.mjs`, and `singularity-bloom/` are separate rendering components, not unified skill helpers. Check source, dependencies, licenses, FFmpeg/Blender/browser availability, output specs, and frame/audio quality before committing to a render. No end-to-end premium motion rendering was verified in this audit.

## Catalog and compatibility

`skillsystem/catalog.json` maps each installed skill to its original path, publisher, purpose, categories, dependencies, audit status and caveats. Status is **historical audit evidence**, not a live readiness check:

- `tested-helper`: a named narrow helper or suite was exercised; not proof that the whole skill works.
- `partial`: an operation was attempted but blocked or failed.
- `instruction-only`: guidance requiring an operator/agent; no deterministic execution claimed.
- `not-tested`: executable or reference workflow exists but was not functionally verified.

For exact test evidence, metadata validation differences, missing upstream tests and limitations, see [SKILL_EXECUTION_AUDIT.md](SKILL_EXECUTION_AUDIT.md). The current runtime may differ from that audit. Provider-backed functions, browser testing, rendering, and many document operations are outside the allowlist and require their own checks. `doctor` does not assert that they work.

## Maintenance and tests

When a skill is added, removed, renamed, or its upstream version changes, update the catalog and rerun tests; verify its original license and cross-skill imports. Workflow steps reference skill IDs and must exist in the catalog. Do not alter original skill instructions merely to fit this wrapper. Add an executable helper only after inspecting it, constraining its interface and dependencies, and adding real success and failure tests.

`npm run test:skills` runs standard-library `unittest` integration tests: catalog coverage of all 37 paths, all workflow and instruction lookups, validation failures, dependency presence reporting, all eight helper invocations with fixtures, and helper-failure propagation. The tests do not test provider calls, real publishing, browser visuals, full KDP research, book authorship, document rendering or premium motion output. `npm run verify:yt-skill` remains the separate six-tool YouTube fixture suite.
