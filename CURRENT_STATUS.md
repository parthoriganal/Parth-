# Current project status

**Last reviewed:** 2026-11-08 UTC. This is a snapshot of the working tree; rerun `git status --short` and tests before relying on it.

## Git and continuity warning

At review, the active branch was `arena/a37a027e-parth`, with base `e1d33240369f428b899488b1e9fe3e02da04776f`. Earlier session work was present but **not committed**: KDP backend/frontend and build changes, the skill-system catalog/CLI, QA scripts and tests, third-party schemas, sample-book artifacts, and audit/retest documentation. A generated Vite JavaScript asset was already staged. The requested memory commit is intended to include only the three root memory files, leaving that earlier work and its staging state intact. Therefore a clean clone of that commit alone will lack some files and behavior described here; do not interpret this record as proof they were committed or pushed. Check the actual Git log and status in every future session.

## Completed in the reviewed working tree

- Audited 37 installed skills; documented narrow helper tests, instruction-only capabilities and failures in [docs/SKILL_EXECUTION_AUDIT.md](docs/SKILL_EXECUTION_AUDIT.md). Original skills and attribution were preserved. The audit is not a line-by-line validation of every reference or end-to-end workflow.
- Built a local catalog/router with four curated workflows and eight explicit local helper commands; see [docs/SKILL_SYSTEM.md](docs/SKILL_SYSTEM.md). It does not automatically run an agent, publish content or make external integrations work.
- Added `jsdom` to development dependencies so the Gravity Lab and Contribution City smoke tests can run after installation.
- Created a proposed nonfiction sample, an outline and one chapter, editable DOCX and practical report under [docs/kdp-practical-test](docs/kdp-practical-test). This was a test project, not a user-validated KDP listing or finished book.
- Changed the research failure paths to avoid automatically substituting synthetic keywords, competition counts, competitor products or trend curves; made missing data and illustrative profit assumptions explicit. Added a DOCX offline-schema wrapper and a marked PyMuPDF reflow preview. See [docs/KDP_QUALITY_RETEST.md](docs/KDP_QUALITY_RETEST.md) for evidence and scope.

## Most recent test evidence

On 2026-11-08, in the current working tree:

| Check | Result and scope |
|---|---|
| `npm run test:skills` | 7 tests passed; includes catalog/workflows and eight helper fixture invocations. Re-run in this memory-writing turn. |
| `npm run verify:yt-skill` | 17 checks passed on synthetic fixtures. Re-run in this turn. |
| `PATH=/tmp/parth-audit-venv/bin:$PATH npm run test:quality` | 15 tests passed, including offline DOCX validation/corruption and PyMuPDF preview; re-run in this turn. The temporary environment is not a persistent prerequisite: create your own from the requirements files. |
| `npm run test:sim`, `npm run test:physics` | Passed in the preceding quality-retest turn. |
| `node contribution-city/test/smoke.cjs`, `node singularity-bloom/test/model.cjs`, `npm run verify`, `npm run build` | Passed in the preceding quality-retest turn. |
| Real sandbox API probes | `/api/autocomplete` returned 502 `UNAVAILABLE`, `/api/research` 503 `UNAVAILABLE` without a score, `/api/trends` `UNAVAILABLE` with no values. DataForSEO was not configured. These were failure-path observations, not live-service success. |
| DOCX wrapper and preview | Sample passed installed validator with local schema mappings (16 XML files valid, 0 skipped, 0 new errors); four-page reflow preview generated. Not complete OOXML/Word/KDP compliance. |

`npm run test:quality` requires backend Python dependencies plus the optional document-QA dependencies. PyMuPDF's preview test skips if unavailable. Test fixtures are synthetic and never evidence of market demand or actual provider operation.

## Unresolved issues and risks

1. Earlier work remains uncommitted and will not be included in the documentation-only memory commit. Decide with the user how and when to commit that work; do not discard it.
2. Amazon is unreachable in the audited sandbox; real success of autocomplete, competition scraping, trends or configured providers is unverified. External services can throttle, block or change markup. Search result counts may be approximate or lower bounds.
3. The royalty calculator remains an illustrative, non-marketplace-specific model. Its status label was improved, but current official rules, eligibility and actual printing/delivery costs were not verified. Heuristic scores are not observed volume or sales.
4. PyMuPDF's reflow preview is not faithful to Word/LibreOffice. Its observed preview dropped list markers and had an orphaned heading/page break. LibreOffice/Poppler and KDP print preview were not available. The sample remains **not publication-ready**: the manuscript, author brief, independent editorial review, rights checks, cover, metadata and faithful final proof are incomplete.
5. The historical audit found four UI/UX test files that cannot collect in the installed copy without upstream repository tooling, a documented UI/UX plugin-root path mismatch, and skill metadata differences with the bundled validator. See [docs/SKILL_EXECUTION_AUDIT.md](docs/SKILL_EXECUTION_AUDIT.md). The PPTX validator's external-schema issue was not shown fixed by the DOCX-specific wrapper.
6. Browser-based Playwright tests and premium motion/Blender/FFmpeg rendering were not completed in that sandbox. Presence or `doctor` checks are not functional verification.

## Next priorities

1. Preserve and review the uncommitted changes, then commit them only when authorized; verify that every memory link exists in the resulting revision.
2. With authorized network access and appropriate credentials, run limited live tests of market providers and record response provenance, failures and terms; never substitute fabricated observations.
3. Verify current KDP pricing/printing policies and either correct the calculator with tests or keep it clearly hypothetical. Exercise partial and lower-bound behavior against representative permitted responses.
4. For a real book, obtain the author's requirements, complete and independently review the manuscript, verify rights and sources, and produce/inspect a faithful Word or LibreOffice and KDP proof.
5. Resolve upstream-only skill tests and path/metadata portability only after confirming expected host formats and preserving licenses and original instructions. Add regression tests for any change.

Maintain this file, [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), and [AI_AGENT_INSTRUCTIONS.md](AI_AGENT_INSTRUCTIONS.md) when significant changes occur; date entries and distinguish measured facts from assumptions.
