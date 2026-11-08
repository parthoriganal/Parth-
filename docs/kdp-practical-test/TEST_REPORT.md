# Practical skill-system test: KDP nonfiction project

> Historical test results. See [KDP quality remediation and retest](../KDP_QUALITY_RETEST.md) for subsequent changes and current limitations.

**Test date:** 2026-11-08
**Verdict:** Partial practical execution; **not publication-ready and not a completed book**.

## Project and scope

No actual existing title, author, manuscript, audience brief, sales data, or ASIN was supplied. To exercise the system without inventing them, this test created a concrete **proposed** nonfiction project: *The Weekly Reset: A practical planning routine for an unpredictable week*. Its proposed audience is adults seeking a flexible weekly planning exercise. It is a real local draft and document artifact, but it is **not an established KDP listing or a user-validated commercial project**. The title, audience, outline, 120-page print scenario and $9.99 price are test assumptions, not research findings or recommendations.

Artifacts in this directory:

- `manuscript-sample.md`: working brief, six-chapter outline and one original sample chapter, with an explicitly hypothetical example. It is not a complete manuscript.
- `manuscript-sample.docx`: editable 6 × 9 inch **test** conversion of that material, including test-status text. Not a print proof or KDP-ready interior.
- `create-docx.cjs`: limited-format generator for this sample, not a general Markdown conversion tool.

No book was published, no demand or competition was established, and no author, citation, testimonial, sales figure, or actual case study was invented. The sample's `wc -w` count was **949 words including its brief and outline**, not the length of a finished book.

## Stage-by-stage evidence

| Stage | Method and result | Classification / remaining work |
|---|---|---|
| Routing and loading | `python3 skillsystem/skill.py workflow kdp-research`, `workflow book-writing`, and `workflow document-production` listed task-specific plans and original skill paths. `show` loaded doc-coauthoring, discernment-nudge, docx and ui-ux-pro-max instructions. `npm run test:skills`: **7 tests passed**, including all eight allowlisted helpers on fixtures. | **Executable:** catalog, routing, instruction retrieval and fixture-tested helpers. Plans are recommendations; the CLI does not execute the prose or author the book. |
| Brief and outline | Wrote the sample's reader, promise, scope and six-chapter outline using the coauthoring structure. | **Manual AI reasoning:** only one chapter drafted. The user did not supply or approve a brief, author voice, rights, genre positioning or the outline. The coauthoring skill's interactive discovery and fresh-reader test were not completed. |
| Live keyword research | Flask test client called `GET /api/autocomplete?prefix=weekly%20planning&marketplace=us`. It returned **HTTP 500**, `status=failed`, no suggestions; underlying error was `SSLError: TLS/SSL connection has been closed (EOF)` to `completion.amazon.com`. The environment restricts external egress. | **Unavailable:** no live Amazon autocomplete, demand or competition evidence was obtained. The full research pipeline was not run: it performs many external calls and can substitute mock keywords and synthetic competition counts. No mock output is presented as market evidence. |
| Trends and category suggestions | `POST /api/trends` with `weekly planning` returned HTTP 200, **SIMULATED**, from a deterministic seasonal model. `POST /api/categories` returned HTTP 200, **SUGGESTED**, eight local suggestions, and zero competitor-derived categories. | **Executed but not research evidence:** no direction, seasonality or category ranking inferred. Live Google Trends and Amazon category data remain unverified. |
| Provider readiness | `GET /api/health` returned HTTP 200 / `ok`; both `dataforseo_configured` and `pangolinfo_configured` were false. A reverse-ASIN route probe using the deliberately artificial string `B012345678` returned **UNAVAILABLE**, empty keywords, and a credentials message. | **Unavailable:** no actual competitor ASIN was supplied or researched. Health reports configuration, not proof a provider is reachable or its data is accurate. |
| Pricing scenario | `POST /api/profit` with test inputs price **$9.99**, **120 pages**, US, default B&W and delivery cost returned HTTP 200 / `CALCULATED`. The application produced eBook **$6.84**, paperback **$3.70**, hardcover **$0.05**; its printing assumptions were $2.29 and $5.94 respectively. | **Executable calculation only:** these are outputs of local formulas for hypothetical inputs, **not verified current KDP royalties, sales projections or profit**. The endpoint's `marketplace` is parsed but not passed into `calc_all`; the same cost model is used regardless. Pricing/rate, trim, page count, territory, channel, file delivery cost and current KDP terms must be independently checked before making a decision. The estimated 120-page scenario does not describe the current short draft. |
| Writing | Authored one sample chapter with an inventory exercise, illustrative example, and limitations. The example is labeled invented; no empirical efficacy or clinical claim is made. | **Manual AI reasoning:** an unfinished sample; no sources, expert review, permissions review, independent readership test or complete book. |
| Editing | Manually revised the first paragraph to lead with the concrete action and changed the “waiting” section to distinguish the reader's action from another person's. Reviewed the chapter for a clear exercise, conditional advice, invented-example labeling, and avoidance of outcome promises. | **Manual AI editing, not independent professional editing:** no tracked-change review, copy-edit pass by another person, developmental editor, sensitivity review, or independent reader test. The sample may still contain weak structure or repetition. |
| Design helper | `python3 skillsystem/skill.py run ux-search 'book reader accessible typography' --domain typography` returned three local suggestions, including `Editorial Classic` (Cormorant Garamond / Libre Baskerville). | **Executable local search:** suggestions are not accessibility certification or print-layout guidance. The first result was a mobile/poster pairing, so it was not treated as evidence of suitability for this book. Suggested fonts were not installed or visually compared; the test DOCX uses Georgia. |
| Optional title helper | `run title --title 'The Weekly Reset' --thumb 'PLAN A FLEXIBLE WEEK'` returned 16 characters and a **94/100 YouTube heuristic score**, with a `no-number` warning. | **Executable, but not fit for KDP title validation:** this is a YouTube title/thumbnail tool. Its score says nothing about KDP search demand, book positioning, trademarks, or sales. No subtitle, keyword, or title availability validation follows from it. |
| DOCX production | The docx skill's `docx` npm dependency was absent. Installed `docx@9.5.1` into `/tmp/parth-docx-project` (not the repository manifest); generated the sample with `NODE_PATH=/tmp/parth-docx-project/node_modules node docs/kdp-practical-test/create-docx.cjs`. | **Executable:** file created using docx-js. Only this sample's narrow Markdown subset is supported. Font availability and actual Word/KDP rendering have not been established. |
| Structural QC | Reopened the final DOCX using `python-docx` 1.2.0, compared extracted paragraphs with the Markdown after stripping heading/list markup and bold delimiters: **38/38 matched**. All paragraphs had a resolvable style; **10 heading** paragraphs and **13 numbered/list** paragraphs were present. Section measured **6.0 × 9.0 inches**; ZIP `testzip()` returned `None` (no corrupt member). | **Executable structural checks passed:** text extraction and package integrity are not visual proof, accessibility validation, complete OOXML validation, or KDP compliance. The first QC attempt raised `AttributeError` when some plain paragraphs lacked a resolvable style; the generator was amended with an explicit Normal style and the final check passed. |
| Schema validation | Ran `.claude/skills/anthropic/docx/scripts/office/validate.py` on the final DOCX. **Exit 1:** `docProps/core.xml` schema import failed to parse `http://dublincore.org/schemas/xmls/qdc/2003/04/02/dc.xsd`; validator reported 38 paragraphs. | **Failed/blocked:** this is not a passed schema validation and does not by itself prove invalid document content. Offline schema imports need a local resolution strategy and retest. |
| Visual/print QC | Invoked the docx skill's `office/soffice.py --headless --convert-to pdf ...`; **exit 1**, `FileNotFoundError: 'soffice'`. `doctor` also reported `pdftoppm` absent. | **Unavailable:** no rendered pages, margins, page count, line breaks, widows/orphans, glyph substitution, final gutter or KDP print preview were checked. No PDF or final EPUB was produced. |

## System-level and quality gaps

1. The wrapper is a **manual router and restricted helper dispatcher**, not an end-to-end workflow engine. Writing and judgment happen through the assistant; users must deliberately load instructions and perform each stage. The helper suite does not verify a book's quality or correctness.
2. The skill system cannot access KDP/Amazon research by itself. The research engine can return mock or simulated output, and its scores and "actual"-sounding source labels need careful scrutiny. No live market validation, trend validation, category positioning, review analysis, or competitor study was completed here.
3. `doc-coauthoring` is being adapted from structured document collaboration to a book project. Without a real user's goals and voice, and without an independent reader, its intended collaborative loop is incomplete.
4. `docx` creation and structural inspection worked, but the required visual and schema QA did not. The sample contains a brief and outline that would not belong in a finished interior; no cover, metadata, ISBN decision, rights check, accessibility review, references, publishing settings, tax setup or upload preview exists.
5. There is no dedicated allowlisted nonfiction editing or book-formatting helper; the YouTube tools should not be repurposed as proof of book-market quality. Local typography search was relevant but gives suggestions rather than validated print guidance.
6. The calculator's formula/market assumptions must be checked against official, current KDP documentation and the actual final format. This test did not access that documentation, so no official royalty claim is made.

## Reproduction

From the repo root, in an environment with Node/npm and Python 3.11:

```bash
npm ci
npm run test:skills
python3 skillsystem/skill.py workflow kdp-research
python3 skillsystem/skill.py workflow book-writing
python3 skillsystem/skill.py workflow document-production
python3 skillsystem/skill.py doctor
python3 skillsystem/skill.py run ux-search 'book reader accessible typography' --domain typography
python3 skillsystem/skill.py run title --title 'The Weekly Reset' --thumb 'PLAN A FLEXIBLE WEEK'
npm install --prefix /tmp/parth-docx-project --no-save docx@9.5.1
NODE_PATH=/tmp/parth-docx-project/node_modules node docs/kdp-practical-test/create-docx.cjs
```

The backend probes require a virtual environment with `backend/requirements.txt`; structural checks additionally require `python-docx`. The validator requires its Python dependencies and access to or local copies of external schema imports. Network/credential outcomes and versions can differ in another environment. Probe against real external services only where access and terms allow; never use mocked data as observed market data.

## Next decisions before treating this as a real publishing project

- Obtain the author's intended audience, voice, goals, topic boundaries, rights, preferred format and approval of the brief; replace or confirm this test premise.
- Collect current, attributable market and competitor evidence using permitted access, then distinguish observation from interpretation. Verify KDP pricing, production requirements and title rights against current authoritative sources.
- Draft the remaining chapters, independently fact-check and edit, get reader feedback, and revise. Complete format-specific layout, accessible document checks and a visual KDP proof before upload.
