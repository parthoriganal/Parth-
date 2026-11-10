# FONT & LAYOUT VERIFICATION REPORT
**The Family Records Organizer — interior**
Round 9 · 2026-11-10

---

## 1. Typefaces

| role | family | files | licence | embedding |
|---|---|---|---|---|
| Body text, section titles, folios, table prefills | **Lora** (Cyreal) | `Lora-Regular`, `Lora-Bold`, `Lora-Italic` | SIL Open Font License 1.1 | TrueType, subset, embedded |
| Labels, table headers, running heads | **Work Sans** (Wei Huang) | `WorkSans-Regular`, `WorkSans-Bold` | SIL Open Font License 1.1 | TrueType, subset, embedded |

Both faces are shipped in the repository at
`.claude/skills/anthropic/canvas-design/canvas-fonts/` with their per-family `OFL.txt`.
The OFL permits embedding and commercial printing; the colophon states the licence and the
designers' names, which is the attribution the licence asks for.

Five fonts appear in the delivered PDF, **all embedded as subsets**:

```
/AAAAAA+Lora-Regular        ✔
/AAAAAA+Lora-Bold           ✔
/AAAAAA+Lora-Italic         ✔
/AAAAAA+WorkSans-Regular    ✔
/AAAAAA+WorkSans-Bold       ✔
```

There is **no base-14 font anywhere in the file.** This matters more than it sounds: reportlab
writes a `BT /F1 12 Tf` line into the page preamble at save time from `canvas._fontname`, so a
canvas created with the default font puts a non-embedded `/Helvetica` in *every* page's resource
dictionary even if nothing is drawn in it. That is a KDP rejection, and it was present in the
first build of this book. It is fixed at construction:

```python
self.c = canvaslib.Canvas(path, pagesize=(PAGE_W, PAGE_H),
                          initialFontName=SERIF, initialFontSize=10)
```

Verified afterwards by reading `/Resources /Font` on every page, not by trusting the call.

**Metrics used in layout** (from the font tables, not guessed):
Lora ascent 1006 / descent −274 / 1000 upm; Work Sans ascent 930 / descent −243 / 1000 upm.

## 2. Glyph coverage

The book uses 77 distinct characters. Non-ASCII characters actually used:

| char | count in file | font that carries it |
|---|---|---|
| `—` em dash | 157 | Lora, Work Sans |
| `·` middle dot (running heads) | 96 | Lora, Work Sans |
| `–` en dash | 2 | Lora |
| `×` multiplication sign (trim size) | 2 | Lora |

Zero replacement characters, zero missing-glyph markers, zero fallback substitutions appear in
the extracted text. No accented characters are used anywhere in the copy, so there is no coverage
question to answer beyond the four above.

## 3. Type scale

| use | size / leading | colour |
|---|---|---|
| Part numeral | 54 pt | INK |
| Part title | 27 pt | INK |
| Section title | 19.5 pt | INK |
| Standfirst (italic) | 11.6 / 18.4 | SOFT |
| Body | 10.9 / 16.2 | BODY |
| Run-in emphasis | 10.1 / 15.0 | BODY |
| Table prefill | 8.0 pt Work Sans | 0.30 grey |
| Notes / captions (italic) | 9.7 / 14.2 | SOFT |
| Tracked uppercase labels | **7.0–8.2 pt** | LABEL / FAINT |
| Table headers (reversed) | **7.0 pt** | white on DARK |
| Running head | 7.2 pt | FAINT |
| Folio | 9.4 pt | FAINT |

**Floor: 7.0 pt.** The brief asked that labels not go below about 7 pt. The first build had 225
strings at 6.2–6.9 pt because the label-fitting routine was allowed to shrink that far; the floor
was raised to 7.0 pt and nine table headings were shortened so they fit at that size rather than
being shrunk below it.

Prose is set to a **5.62 in measure** inside the 7.0 in grid. Tables, bands and rule-lines use the
full 7.0 in. A 7-inch line of 10.9 pt Lora would be too long to read comfortably; the short measure
is what makes the prose pages read as a book rather than a form.

## 4. Grid and page furniture

| item | value |
|---|---|
| Trim | 8.5 × 11.0 in |
| Inside margin | 0.875 in (mirrored: always the spine side) |
| Outside margin | 0.625 in |
| Top margin | 0.780 in |
| Bottom margin | 0.800 in |
| Content box | 7.000 × 9.420 in |
| Running-head baseline | 10.50 in from foot (7.2 pt, FAINT) |
| Footer rule | 0.62 in from foot, hairline |
| Folio baseline | 0.50 in, right-aligned to the outside edge |

Margins mirror by page parity, so a recto has the gutter on the left and a verso on the right.
Every page in the trace respects this: the minimum x of drawn text is 0.625 in and the maximum
is 7.875 in, i.e. 0.625 in of clear paper on whichever side is the outside edge.

The gutter is 0.875 in against a KDP minimum of 0.375 in. The extra half-inch pushes the writing
area away from the spine because a perfect-bound 8.5 × 11 book of this thickness is hard to write
in near the fold. **This is a usability choice, not a binding claim** — the book says plainly, on
page 101 and again in the colophon, that a paperback of this thickness does not lie flat.

## 5. Worksheet system (consistency)

Every worksheet in the book is assembled from the same primitives, so the system cannot drift:

* **Field** — 7.6 pt tracked uppercase label above a stroked hairline rule. Rules are drawn lines,
  never typed underscore characters (which print badly and look cheap).
* **Field pitch** 0.40–0.44 in between rows; write-on rule sits 0.185 in below its label.
* **Handwriting pitch** 0.30 in for free writing, 0.375 in on Notes pages, 0.44 in on Letters pages.
* **Checkbox** 8.4 pt square, 0.8 pt stroke; 7.6 pt on dense lists. Comfortably tickable with a
  pen and large enough to survive a photocopy.
* **Table** — reversed 0.30 in header band in DARK, alternating 0.95 wash zebra, hairline rules,
  closed with a 0.7 pt box. Rows stretch to fill available height (cap 0.62 in) so a worksheet
  never leaves a dead band at the foot.
* **Record band** — bordered unit with a wash reference chip (D1, D2 …), used for the digital
  inventory; each carries its own disposal and legacy questions.
* **Overflow capture** — every record page ends with a fixed band: *"I need more space"* checkbox,
  *"I continued on a separate sheet, dated ____"*, *"Number of entries recorded here ____"*. This
  is the deliberate alternative to repeating worksheets.
* **Callout** — tinted panel with a 2.6 pt hairline on the left edge, heading in bold run-in,
  body at 10.1/15.0. Height computed from the wrapped text so it can never spill.

## 6. Layout verification performed

| check | result |
|---|---|
| Text inside the safe frame | 3,291 boxes, 0 outside |
| Ink in the outer 0.35 in of paper | 0 pages |
| Body text in the footer band | 0 (folio and part label only) |
| Overlapping text | 0 pairs |
| Smallest type | 7.0 pt |
| Table rows drawn past the text block | 0 |
| Paragraphs below the text block | 0 |
| Tables needing to be clamped | 0 |
| Pages with >1.6 in of unused foot | 12 — all intentional (title, contents cont., 8 part openers, letters, notes, colophon) |
| Identical pages | 0 |
| Section start on an even page where a facing page exists | all sections start on a recto or are short enough to be self-contained |

## 7. Colophon and honesty

The colophon (page 116) states the typefaces, the OFL licence, the trim, that the file contains no
colour, no bleed and no images, and — plainly — that the book does not lie flat. There is no
trademark-clearance claim anywhere in the book or in these reports: no trademark search was run,
and none is implied.
