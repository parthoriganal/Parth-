# Installed skill execution audit

Date: 2026-11-08. Scope: the 37 installed skills in `.claude/skills/{anthropic,nextlevelbuilder,youtube-agent-skill}` in this checkout. This is an audit of the installed copies, not a claim about current upstream repositories.

## Method and confidence

Inventoried all skill directories, script types, dependency manifests, and references. Parsed and validated all 37 complete `SKILL.md` frontmatters using the installed skill-creator validator; inspected the instructions and representative supporting files needed for the tests below. This is **not** a line-by-line semantic review or execution of every reference, script, example, or supported workflow: the packs contain hundreds of supporting files, including schemas, fonts, data catalogs, and provider-specific examples. Markdown links directly in skill instructions were checked for relative target existence; dynamic and code-formatted paths are not fully covered. No evidence here implies a whole skill works end to end.

Statuses below mean **tested helper** (the named narrow behavior was exercised), **partial/failure** (a particular operation failed or was blocked), or **not executed** (instruction/reference-only workflow or unavailable integration). Frontmatter validation is not functional testing. For instruction-only skills, an LLM following prose cannot be reproducibly certified by merely parsing a file; their capabilities remain unverified unless explicitly tested below.

Environment: Node 22.22.3, npm 10.9.8, Python 3.11.2; a disposable virtual environment with backend requirements plus pytest, pytest-mock, PyYAML, Pillow, openpyxl, pypdf, python-docx, python-pptx, reportlab and slack-gif dependencies. External networking is restricted to approved GitHub, npm and PyPI hosts; there is no LibreOffice, Poppler, pandoc, browser or configured provider key. Tests did not send content to external providers. The virtual environment is not a persistent project dependency.

## Cross-cutting findings

1. **Fixed:** `npm ci` previously omitted `jsdom`, which both Gravity Lab and Contribution City smoke tests require. Added `jsdom` 26 as a dev dependency and updated the lockfile. A fresh `npm ci`, `npm run test:sim`, `node contribution-city/test/smoke.cjs`, and `npm run build` passed. npm reports a deprecated transitive `whatwg-encoding`; no vulnerabilities were reported. This does not install screenshot dependencies or Playwright.
2. **Skill metadata compatibility:** `quick_validate.py` passed 30 of 37. It rejects `claude-api` because its description is 1,068 characters (validator maximum 1,024), and six Nextlevelbuilder skills because `argument-hint` is not in that validator's allowed key list. This is a validator/format compatibility difference, not proof that Claude Code or another host rejects those skills. Do not silently strip metadata without checking the target host's format.
3. **Copied UI/UX tests incomplete:** four test files fail collection with `StopIteration` because they seek upstream-root scripts (`refresh-google-fonts.py`, `refresh-icon-catalog.py`, `generate-catalog-summary.py`, or `evaluate-relevance.py`) that were not installed with this skill. The remaining tests pass; they do not cover those four areas. Supply the upstream test fixtures/tools, or ship only self-contained installed-copy tests.
4. **UI/UX path mismatch:** `ui-ux-pro-max/SKILL.md` shows `${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py`, but this checkout places it at `.claude/skills/nextlevelbuilder/ui-ux-pro-max/scripts/search.py`. The installed path works when invoked explicitly. Resolve paths from the actual skill directory or adjust deployment packaging.
5. **PPTX schema validation:** a freshly generated `python-pptx` fixture failed the bundled validator while parsing `docProps/core.xml`, because `opc-coreProperties.xsd` imports Dublin Core schemas over HTTP. With restricted egress this is not usable as a reliable offline validation result. Vendor and resolve the schemas locally and retest; this result alone does not establish that the PPTX is invalid. DOCX/XLSX copies include related office schemas; their full validators were not tested.
6. Several instructions assume preinstalled packages or tools (`docx`, `pptxgenjs`, LibreOffice, Playwright, etc.). Those assumptions do not hold generally in this sandbox. Install per task, pin dependencies where appropriate, and report missing OS binaries rather than promising full operation.
7. Overlap is not proof of redundancy: `frontend-design`, `ui-styling`, `design`, `design-system` and `ui-ux-pro-max` cover related UI work; `brand-guidelines` is Anthropic-specific while `brand` is general; `pptx`, `slides`, and `design-system` address different presentation formats/workflows. The office skills include near-duplicate schema/validator assets, creating maintenance drift risk; consolidate only if upstream licensing and release management permit it.

## Anthropic skills (19)

| Skill | Purpose / installed assets and dependencies | Execution status and evidence | Limitation / recommendation |
|---|---|---|---|
| academy-guide | Claude Academy course selection; instructions and external catalog. | **Not executed**; metadata passed. | Academy domain is outside allowed egress; current catalog and links not verified. Use live catalog when network access is authorized. |
| algorithmic-art | Seeded p5.js art; JS generator template and HTML viewer. | **Not executed**; metadata passed. | No p5/browser rendering test. Validate seed determinism and viewer locally with a browser before use. |
| brand-guidelines | Anthropic palette/fonts and brand styling; prose only. | **Not executed**; metadata passed. | Fonts and actual artifact rendering not verified; avoid applying this brand to unrelated users by default. |
| canvas-design | Poster/art creation; 54 TTF files and font licenses; relies on a rendering workflow. | **Not executed**; metadata passed. | Fonts inventoried, not visually tested; use a real brief and inspect rendered output. |
| claude-api | Extensive SDK/API and evaluation references, two JS and two Python helpers; external SDK/service credentials. | **Partial/failure:** metadata validator rejects 1,068-character description. No API/helper invocation. | Verify model identifiers, prices and live API behavior separately; shorten description if required by the target validator. |
| discernment-nudge | Judgment-oriented follow-up-question guidance, no scripts. | **Not executed**; metadata passed. | No behavioral evaluation; measure usefulness and user burden with representative prompts. |
| doc-coauthoring | Three-stage collaborative documentation workflow; prose only. | **Not executed**; metadata passed. | Requires user interaction and reader testing; not a deterministic executable. |
| docx | Word manipulation and OOXML validators; schemas, Python helpers; creation instructions mention npm `docx`, LibreOffice and pandoc. | **Tested helper:** `merge_runs.py` merged two same-style runs into one; python-docx reopened the output and verified `Audit fixture`. | Full creation, tracked changes, validation, and visual rendering untested; LibreOffice/pandoc unavailable. |
| frontend-design | Aesthetic direction and frontend implementation guidance; prose only. | **Not executed**; metadata passed. | Needs an actual design brief and browser review; no functional outcome asserted. |
| internal-comms | Internal update templates; four reference Markdown files. | **Not executed**; metadata passed. | Requires organizational context and human review; templates do not establish factual accuracy. |
| mcp-builder | MCP server design guides and Python connection/evaluation scripts; `mcp` and `anthropic` requirements. | **Not executed**; metadata passed. | No server/evaluation or provider call tested. Install declared dependencies in isolation and test with a local fixture server and, separately, authorized credentials. |
| pdf | PDF reading, forms and transformations; eight helpers, references; pypdf and optional rendering/OCR dependencies. | **Tested helper:** `check_fillable_fields.py` correctly distinguished a one-page PDF without fields from a generated form with field `name`; independently confirmed with pypdf. | Other helpers, OCR, visual placement and rendering not tested. `--help` is treated as a file path, not a help option. Poppler unavailable. |
| pptx | Slide creation/editing and OOXML validation; 15 Python scripts and schemas; commonly needs pptxgenjs, LibreOffice and Poppler. | **Partial/failure:** validator ran on a generated one-slide fixture but failed resolving an external schema import. | Not a successful validation or render; fix offline schema resolution and exercise editing plus image QA. |
| skill-creator | Skill authoring, validation and evaluation tools; 10 Python scripts, references; PyYAML, with agent/provider tooling for evaluations. | **Tested helper:** `quick_validate.validate_skill` ran on all 37 directories and yielded the metadata results above. | Only frontmatter validation tested; it does not verify instruction quality, script execution, or full eval loop. |
| slack-gif-creator | Pillow/imageio-based animation assembly, easing and validation. | **Tested helper:** created a 128×128, 10-frame, 10-fps GIF; reopened it with Pillow and `validate_gif(..., is_emoji=True)` returned pass. | One synthetic example; visual quality, other dimensions and Slack upload not tested. |
| theme-factory | Ten preset visual themes plus a PDF reference; prose selection workflow. | **Not executed**; metadata passed. | No themed artifact or font/render verification. |
| web-artifacts-builder | React/Tailwind/shadcn scaffolding and single-file bundling; two shell scripts and component tarball. | **Not executed**; metadata passed and tarball exists. | Initializer may globally install pnpm and runs package-manager commands; not run to avoid unbounded environment changes. Run in an isolated disposable project with pinned versions. |
| webapp-testing | Python Playwright guidance and `with_server.py` lifecycle helper. | **Tested helper:** started a local Gravity Lab HTTP server, asserted response contained `Gravity Lab`, and observed helper stop the server. | This was an HTTP test, not a Playwright browser test; browser/Playwright missing. |
| xlsx | Spreadsheet creation, editing and formula recalculation; openpyxl/pandas, LibreOffice and OOXML helpers. | **Partial/failure:** generated an XLSX containing `=A1*2`; `recalc.py` reported `soffice not found on PATH`. | Formula result and visual rendering unverified. Install LibreOffice and rerun, checking cached values. |

## Nextlevelbuilder skills (7)

The six skills marked metadata-incompatible below are rejected specifically by the bundled Anthropic validator for `argument-hint`; host support may differ.

| Skill | Purpose / assets and dependencies | Execution status and evidence | Limitation / recommendation |
|---|---|---|---|
| banner-design | Banner workflow and one size/style reference; optional browser/image tools. | **Not executed**; metadata incompatible as above. | No banner or screenshot produced; verify actual dimensions and platform safe zones using a current brief. |
| brand | Brand documentation, context and token sync; four Node helpers, 12 Markdown references. | **Tested helper suite:** 21 `test_sync_brand_to_tokens.py` tests passed. Metadata incompatible as above. | Other helpers and real brand files not independently exercised; backup existing brand data before mutations. |
| design | Logo/CIP/icon workflows; 11 Python scripts, CSV catalogs, references, optional image providers and credentials. | **Tested helpers:** logo search for `technology minimalist` returned Tech/Digital and Minimalist; CIP search for `technology` returned Technology; 26 design tests and 23 logo tests plus 3 subtests passed. Metadata incompatible as above. | Actual provider image generation, APIs and visual quality were not tested; tests can include mocks. |
| design-system | Design tokens and HTML slides; Node/Python helpers, eight CSVs and references. | **Tested helpers:** `search-slides.py 'data dashboard' --domain chart` returned KPI Card and Line Chart; token-validator suite passed 2 tests. Metadata incompatible as above. | Other token generation, fetching and visual slide output not verified; check outputs with actual token fixtures. |
| slides | Strategic HTML presentation guidance, five references; relies on sibling design-system helpers where applicable. | **Not executed end to end**; metadata incompatible as above. | Related slide search was tested under design-system; no slide deck was built or visually checked. |
| ui-styling | shadcn/Tailwind/canvas guidance, two Python helpers, references and fonts. | **Tested helper suite:** 64 tests passed for shadcn and Tailwind helpers. Metadata incompatible as above. | Tests do not establish a real package installation or browser accessibility; test on a disposable project. |
| ui-ux-pro-max | Local search and design-system intelligence; 37 CSVs, 15 JSON files, Python search/data tools. | **Tested helpers:** chart query `dashboard accessible chart legend` returned three chart recommendations; 150 tests and 8,281 subtests passed with four collection-failing files excluded. Metadata passed. | Results are recommendations, not an accessibility audit. Fix documented path mismatch and restore/segregate upstream-only tests; no exhaustive catalog accuracy review. |

## YouTube skills (11)

The six scripts use Python standard library. `npm run verify:yt-skill` passed all 17 checks using synthetic SRT/CSV/JSON fixtures; it checks selected output markers and sibling imports, not general semantic quality. Inputs and assertions are in `scripts/verify-youtube-skill.mjs`. Skills do not publish content.

| Skill | Purpose and dependencies | Execution status and evidence | Limitation / recommendation |
|---|---|---|---|
| yt-audit | Channel audit workflow; prose, requires actual channel evidence. | **Not executed**; metadata passed. | Obtain real channel data and verify observations; no channel access was tested. |
| yt-chapters | Transcript chapter boundaries; `chapters.py` imports sibling `yt-edit/deadair.py`. | **Tested helper:** synthetic transcript checks passed; also ran against `video/narration.srt`, yielding eight draft chapters starting 0:00. | Tool-generated topic labels are placeholders, not publish-ready titles; review timing and edit labels. |
| yt-comment | Triage and draft creator-voice replies; prose, optional voice profile. | **Not executed**; metadata passed. | Requires real comments and voice examples; no posting or voice-match test. |
| yt-edit | Transcript-based edit decision list; `deadair.py`. | **Tested helper:** synthetic transcript output included `REPEAT` and `cuts`. | Heuristic flags require human review; no footage was edited. |
| yt-package | Title/thumbnail linting; `title.py`. | **Tested helper:** fixture produced character and score output. | Score is heuristic, not a CTR prediction; actual thumbnail and publishing untested. |
| yt-plan | Capacity-aware content calendar; prose. | **Not executed**; metadata passed. | Needs creator availability and priorities; no real plan or scheduling integration tested. |
| yt-retention | Retention CSV diagnosis; `retention.py`, optional sibling transcript parser. | **Tested helper:** fixture emitted `HOOK LEAK`, `CLIFFS`, and `SLIDE` with `--transcript`. | Synthetic curve only; real Studio export formats and causality unverified. |
| yt-script | Hook scoring and video script workflow; `hookscore.py`, `hooks.json`. | **Tested helper:** fixture output included `VERDICT`, `SPECIFICITY`, and formula; catalog contained 21 formulas. | Score is a heuristic, not a validated forecast; full creator-voice script untested. |
| yt-seo | Search-oriented video description/tags guidance; prose. | **Not executed**; metadata passed. | Needs video/query context and verification against current platform behavior. |
| yt-shorts | Transcript-to-Shorts repurposing guidance; prose. | **Not executed**; metadata passed. | No clip or edit produced; requires transcript and human editorial judgment. |
| yt-viral | Outlier discovery from collected video JSON; `swipe.py` reads sibling hook catalog. | **Tested helper:** fixture ranked a 412k small-channel outlier and excluded a 410k big-channel non-outlier; tests asserted output. | Does not collect or authenticate by itself; sample-size and classification limitations remain. |

## Reproduction

```bash
npm ci
npm run test:sim
node contribution-city/test/smoke.cjs
npm run build
npm run verify:yt-skill
python3 .claude/skills/nextlevelbuilder/ui-ux-pro-max/scripts/search.py 'dashboard accessible chart legend' --domain chart
python3 .claude/skills/nextlevelbuilder/design-system/scripts/search-slides.py 'data dashboard' --domain chart --max-results 2
python3 .claude/skills/youtube-agent-skill/yt-chapters/chapters.py video/narration.srt --target 8
```

The Python pytest groups require the temporary test dependencies named above. Running all UI/UX tests in the installed tree currently fails during collection; exclude the four upstream-dependent files named in cross-cutting finding 3 to reproduce the 150-test result. Test inputs were synthetic and temporary; no test output was published.
