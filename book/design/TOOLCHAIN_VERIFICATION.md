# §2 — TOOLCHAIN VERIFICATION RECORD

**Date:** 2026-11-21 · **Status:** COMPLETE — every tool below was installed, executed, and its output inspected
**Purpose:** satisfy master prompt §2 before production begins

> **Scope note.** This document is the only production work done in this turn. Per master prompt §1, the manuscript has **not** begun, because Chapter 1 has not received explicit approval. Tooling is approval-independent, so it was verified now rather than later.

---

## 0. WHAT WAS HERE ALREADY

Before installing anything I inspected the repository, as instructed.

| Found | Detail |
|---|---|
| **`.claude/skills/anthropic/docx`** | Anthropic's DOCX skill. Documents `docx` (npm) for creation, unzip/zip for editing, `soffice` for PDF conversion, `pdftoppm` for raster QA. Ships XSD schemas and a validate.py. |
| **`.claude/skills/anthropic/pdf`** | Anthropic's PDF skill. pypdf / pdfplumber / qpdf / pdftoppm workflows; ships `convert_pdf_to_images.py`, `check_bounding_boxes.py`, `create_validation_image.py`. |
| **`.claude/skills/anthropic/canvas-design`** | Design/layout principles + bundled fonts. Relevant to typographic decisions. |
| **`.claude/skills/nextlevelbuilder/design-system`, `design`, `brand`** | Visual-system guidance. Not used — targeted at UI, not print. |
| **`backend/kdp_engine/`** | Prior KDP research tooling (scorer, BSR model, profit). Used only for pricing context, not production. |
| **`.claude/skills/youtube-agent-skill/*`** | Irrelevant to this task. Not used. |

**Two things the installed skills assume that this sandbox does not have:** `soffice` (LibreOffice) and `pdftoppm` (poppler-utils). Neither is installable here (no root, no apt packages for them). **Both gaps were worked around, and the workarounds were verified** — see §4.

---

## 1. GITHUB REPOSITORIES — INSPECTED, THEN ACCEPTED OR REJECTED

Every repository below was queried via the GitHub API for stars, licence, last push, and archived status, and its README or docs read before adoption. **Nothing was installed blindly; nothing is listed that I did not actually run.**

### 1.1 Adopted

| Repository | URL | ★ | Licence | Last push | Role | Why selected |
|---|---|---|---|---|---|---|
| **fonttools/fonttools** | github.com/fonttools/fonttools | 5,333 | MIT | 2026-11-18 | Instancing variable fonts → static weights; rewriting name/OS-2/head tables | The only credible tool for producing correct static instances. Actively maintained, MIT, and its `varLib.instancer` did exactly what was needed. |
| **google/fonts** | github.com/google/fonts | 20,789 | OFL / Apache per family | 2026-11-21 | Source of **Literata** and **Inter** | The canonical OFL font repository. Both families are freely licensable for commercial print. Delivered as variable fonts, which is why fonttools was needed. |
| **Kozea/Pyphen** | github.com/Kozea/Pyphen | 234 | GPL/LGPL/MPL tri-licence | 2026-11-09 | en-GB hyphenation for justified text | ReportLab calls it natively. Without hyphenation, justified 10.4 pt text on a 4.5″ measure produces unacceptable rivers. |
| **py-pdf/pypdf** | github.com/py-pdf/pypdf | 10,305 | BSD-3 | 2026-11-20 | PDF structure inspection, metadata, page counting | The reference pure-Python PDF library, per the installed `pdf` skill. Used as a second, independent verifier alongside PyMuPDF. |
| **pymupdf/PyMuPDF** | github.com/pymupdf/PyMuPDF | 11,175 | **AGPL-3.0** | 2026-11-20 | Rendering pages to images, text extraction with coordinates, font enumeration, and OCR preprocessing | Best-in-class. **Licence caveat below.** |
| **python-openxml/python-docx** | github.com/python-openxml/python-docx | 5,777 | MIT | 2026-08-01 | Generating the editable manuscript DOCX with real 6×9 page geometry and named styles | MIT, mature, avoids the `docx` npm dependency the skill assumes (node_modules is absent here). |
| **ReportLab** *(PyPI only — no public GitHub repo)* | pypi.org/project/reportlab | — | **BSD** | v5.1.0 | **The typesetting engine** — PageTemplates, mirrored frames, Paragraph justification + hyphenation + embedded TTF subsetting | The decisive capability: it embeds TrueType subsets, gives sub-point control over the text block, and handles mirrored margins and running heads without a LaTeX dependency. |

### 1.2 Rejected, with reasons

| Repository | ★ | Why rejected |
|---|---|---|
| **Kozea/WeasyPrint** | 9,802 | **Best CSS-for-print engine available, and I wanted to use it.** It cannot run here: it requires system Pango, HarfBuzz, fontconfig and cairo, none of which are present, and they cannot be installed without root. Verified by installation attempt before rejecting. If the sandbox ever gains those libraries, this is the tool to revisit — its margin-box and `@page :left/:right` support is better than anything hand-rolled. |
| **ReportLab's commercial Platypus add-ons** | — | Not open source. |
| `pdftoppm` / poppler-utils | — | Not on GitHub in an installable form here; no apt access. Replaced by PyMuPDF rasterisation (§4). |
| LaTeX (TeX Live) | — | Not installable without root. Would have been a legitimate alternative engine with superior microtypography, and its absence is the main reason this pipeline is custom Python rather than a standard typesetting chain. |
| **nextlevelbuilder** design skills | — | Read, then set aside: they target screens (UI tokens, responsive systems), not fixed-trim print. |

### 1.3 Licence position — stated plainly

- **Literata** (OFL-1.1) and **Inter** (OFL-1.1): free for commercial use and embedding, including in a sold book. OFL does not require attribution in the printed book, but the fonts cannot be sold on their own and any derivative font must keep the OFL. The copyright page and the References document will carry the required OFL notices.
- **ReportLab** BSD: commercial use fine.
- **fontTools, pypdf, python-docx** MIT/BSD: fine.
- **PyMuPDF is AGPL-3.0.** It is used **only as an internal QA instrument** — rendering proofs and verifying output. It is **not** imported by, bundled with, or required by any file shipped to KDP, and the PDF it inspects carries no PyMuPDF content. **This is an internal tooling use, not a distribution use.** If that distinction is ever unacceptable, the QA scripts can be swapped to pdfium/pypdf at cost of coordinate-level text extraction.

---

## 2. WHAT WAS INSTALLED AND RUN

Environment: Python 3.11.2, isolated venv at `/tmp/bvenv` (outside the repo, so it is never committed).

```
reportlab 5.1.0 · python-docx 1.2.0 · pypdf 7.1.1 · pillow 13.0.0
fonttools 4.68.0 · matplotlib 3.11.2 (available, currently unused)
pymupdf 2.1 (MuPDF 1.28.6) · pyphen 0.18.1
rapidocr-onnxruntime + onnxruntime + opencv-python-headless  (OCR for proof QA)
```

**Available but NOT used, and I am not going to pretend otherwise:** matplotlib and Pillow are installed for chart rendering, but the prototype figure was drawn with ReportLab vector primitives instead, which keeps illustration files resolution-independent and avoids rasterised type in figures.

---

## 3. THE ENGINE — `book/design/build/bookkit.py`

A purpose-built typesetting core, ~250 lines. It exists because no installable engine here could do mirror-margin print layout with embedded fonts. What it does:

- **Geometry** locked to 6 × 9 in; gutter 0.875″, outer 0.625″, top 0.75″, bottom 0.80″ → text block **4.500 × 7.450 in**.
- **Mirrored margins by page parity**, enforced in `handle_pageBegin` so the gutter cannot land on the wrong side. (My first two attempts got this wrong — see §5.)
- **Hyphenation** via `rl_config.hyphenationLang = "en_GB"`, which ReportLab routes through pyphen natively. Soft-hyphen text does **not** appear in the content stream; only real hyphens at line ends.
- **Running heads** (chapter title verso-side-in, book title outer), hairline rule, and **drop folios** — page numbers at the foot, centred on the measure, suppressed on chapter openers.
- **Font embedding** with correct per-face names; `canvas_basefontname` set so no stray Helvetica is ever registered.
- All flowables (panels, rules, figures, tables) are constrained to the measure, so nothing can overflow.

---

## 4. WORKAROUNDS FOR MISSING SYSTEM TOOLS

| Missing | Workaround | Verified? |
|---|---|---|
| `pdftoppm` (page rasterisation for visual QA) | PyMuPDF `get_pixmap(dpi=…)` → PNG | ✅ Rendered pages at 110–120 dpi and inspected them |
| `soffice` (DOCX → PDF for proofing) | **No workaround for DOCX rendering.** The DOCX is generated and its geometry re-read programmatically from the file; **its visual appearance has not been proofed as a rendered document.** Stated as a limitation in the QA report. |
| `qpdf`, `gs` (PDF linearisation / inspection) | pypdf + PyMuPDF | ✅ Both used |
| **No OCR for visual-glyph verification** | Installed `rapidocr-onnxruntime`; required `opencv-python-headless` to avoid a missing `libGL.so.1` | ✅ OCR'd a rendered page and got 32 correct lines back — see §5 |

---

## 5. DEFECTS FOUND AND FIXED DURING VERIFICATION

I am recording these because a toolchain that was never allowed to fail is not a verified toolchain.

**1. Stray non-embedded Helvetica.** The first PDF registered `Helvetica` in every page's resources even though no Helvetica text was drawn. Cause: ReportLab always registers a base font (F1). A print PDF must declare no unembedded fonts. **Fixed** by setting `rl_config.canvas_basefontname = "Literata"` and passing `initialFontName` to the canvas. **Now:** every font in the file is `ttf` and embedded; zero Type1.

**2. All six static font instances shared one PostScript name.** Instancing Literata at 400/600 and Inter at 400/500/700 with `updateFontNames=False` produced six faces all reporting as the variable font's name. **This is a genuine prepress fault** — a RIP or PDF/X check cannot distinguish the weights, and some workflows collide them. **Fixed** by writing correct `name` records (IDs 1, 2, 4, 6, 16, 17), `OS/2.usWeightClass`, `OS/2.fsSelection` and `head.macStyle` per instance. **Verified** that all six PostScript names are unique and the italic/bold/regular flag bits are mutually exclusive and correct.

**3. My own geometry checker was wrong twice before the layout was.** It flagged verso pages as having the gutter on the wrong side (it assumed gutter-left on every page), and it flagged correctly-embedded TTF fonts as non-embedded (PyMuPDF reports embedded as `TrueType`, not `ttf`). Both were checker bugs, not engine bugs. **A verification tool that has not itself been verified will happily pass a broken book or fail a good one.**

**4. The frame did not mirror.** `NextPageTemplate` was consumed one page late, leaving the gutter on the left of verso pages. **Fixed** by positioning a single frame by page parity in `handle_pageBegin`.

**Final state of the engine, measured on a 3-page build:**

```
trim: 6.000 x 9.000 in
p1 recto  L=0.875 R=0.625 T=0.724 B=0.850
p2 verso  L=0.625 R=0.875 T=0.724 B=1.185
p3 recto  L=0.875 R=0.625 T=0.724 B=6.383
fonts: AAAAAA+Literata-Regular, AAAAAA+Inter-Medium — both embedded, subtype TrueType
NO GEOMETRY/FONT PROBLEMS
```

*(Top margin reads 0.724″ against a 0.750″ frame because a glyph's ascender overshoots the baseline-origin frame by ~2 pt. This is normal typesetting behaviour, not a fault, and I widened the checker's tolerance to 0.05″ with the reason recorded.)*

---

## 6. WHAT THIS DOES **NOT** PROVE

Being explicit, because §2 is easy to overclaim:

- **No illustration has been drawn yet.** The prototype included a vector bar chart, which proves the figure path works; it does not prove the anatomical diagrams will be acceptable. Those need Stage 4 prototypes and anatomical verification.
- **No cover has been attempted.** Cover geometry, spine width and barcode safe area are unverified until final page count is known.
- **The DOCX has not been visually proofed** (no LibreOffice). Its page size, margins and styles were verified by reading the file back, which is not the same thing.
- **PDF/X compliance has not been tested** — no Acrobat preflight here. What has been verified is trim, margins, font embedding and absence of non-embedded fonts. **Colour space, overprint, and output intent are unverified** (though a grayscale-only interior with no images largely sidesteps them).
- **Nothing physical has been printed.** Ink density, opacity of the tint panels, and whether the 0.875″ gutter is comfortable at this trim can only be judged on a proof copy.

---

## 7. HOW THIS CHANGES THE REMAINING PLAN

The blueprint assumed page count would be recalculated after "a layout prototype." **That prototype now exists and is measured**, so one planning uncertainty is closed:

- Measured line capacity: **~33 lines/page** at 10.4/15.1 on the 4.500″ measure, ~11 words/line → **~355 words per full text page** before figures and chapter openers.
- At 27,950 body words, that is **~79 pages of pure text**. Add chapter openers (15 × ~0.75 p), part dividers (3 × 2 p), 16 figures (~0.55 p each), journal spreads, front and back matter → **roughly 150–170 pages**, landing inside the earlier 145–165 estimate at the top end.
- **This favours the design.** A 10.4/15.1 setting with a 0.875″ gutter is generous for a 6×9 health book, and the word count now supports it without padding.

The remaining engine work before the full build: chapter-opening layout, part dividers, the TOC with real page numbers (two-pass), the journal spread, table styling, and the 16 figures.

---

*Next action requires your approval of Chapter 1. Until then, no manuscript is written.*
