"""
Faithful visual proof of the 6x9 interior.

Why this exists: PyMuPDF's built-in DOCX reader ignores embedded fonts,
run-level page breaks and most style alignment, and renders this book as a flat
run of paragraphs (no chapter openers, no centred title, no Literata).
Rendering that and calling it visual QA would be false.

This walks the DOCX body in document order and sets each paragraph using the
DOCX's own style definitions (pt size, family, weight, italic, alignment,
first-line indent, space before/after, shading), then flows it into pages at
the real trim size and margins with the real embedded Literata/Inter fonts.

Fidelity limits, stated plainly:
  * Line breaking is MuPDF's, not Word's. Word may break a line a word earlier
    or later, so page breaks can shift by a line or two.
  * Word's document grid (docGrid linePitch) and its justification algorithm
    are not reproduced exactly.
  * Only the folio is drawn; running heads are not.
It is a proof of the typography the build produced, not a Word facsimile.
"""
import os
import tempfile

import pymupdf
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

SRC = "/home/user/Parth-/book/The_15_Minute_Fascial_Release_Plan_Final.docx"
FONTS = "/home/user/Parth-/book/design/fonts"
OUT = "/tmp/proof"

PW, PH = 6 * 72, 9 * 72
doc = Document(SRC)
sec = doc.sections[0]
LEFT, RIGHT = sec.left_margin.pt, sec.right_margin.pt
TOP, BOT = sec.top_margin.pt, sec.bottom_margin.pt
BODY_W = PW - LEFT - RIGHT
BOTTOM_Y = PH - BOT

archive = pymupdf.Archive(FONTS)

FONT_CSS = """
@font-face{font-family:'Literata';src:url('Literata-Regular.ttf');font-weight:400;font-style:normal}
@font-face{font-family:'Literata';src:url('Literata-SemiBold.ttf');font-weight:700;font-style:normal}
@font-face{font-family:'Literata';src:url('Literata-Italic.ttf');font-weight:400;font-style:italic}
@font-face{font-family:'Inter';src:url('Inter-Regular.ttf');font-weight:400;font-style:normal}
@font-face{font-family:'Inter';src:url('Inter-Medium.ttf');font-weight:500;font-style:normal}
@font-face{font-family:'Inter';src:url('Inter-Bold.ttf');font-weight:700;font-style:normal}
body{margin:0}
p{margin:0}
table.k{border-collapse:collapse;width:100%;margin:8pt 0}
table.k th, table.k td{border:1px solid #c9c6bd;padding:3pt 4pt;
  vertical-align:top;text-align:left;line-height:1.28;
  font-family:'Inter','Literata',sans-serif;font-size:7.6pt}
table.k th{background:#f2f0ea;font-weight:700}
"""


def resolve(style, attr):
    seen = set()
    while style is not None and style.name not in seen:
        seen.add(style.name)
        v = getattr(style.font, attr, None)
        if v is not None:
            return v
        style = style.base_style
    return None


def pf(style, para, attr):
    v = getattr(para.paragraph_format, attr, None)
    if v is not None:
        return v
    seen = set()
    while style is not None and style.name not in seen:
        seen.add(style.name)
        v = getattr(style.paragraph_format, attr, None)
        if v is not None:
            return v
        style = style.base_style
    return None


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def para_html(para):
    st = para.style
    size = resolve(st, "size")
    size_pt = size.pt if size else 10.5
    fam = resolve(st, "name") or "Literata"
    bold = resolve(st, "bold")
    italic = resolve(st, "italic")
    align = pf(st, para, "alignment")
    fli = pf(st, para, "first_line_indent")
    li = pf(st, para, "left_indent")
    ri = pf(st, para, "right_indent")
    sb = pf(st, para, "space_before")
    sa = pf(st, para, "space_after")

    css = [
        f"font-family:'{fam}','Literata',serif",
        f"font-size:{size_pt:.2f}pt",
        "line-height:1.40",
        f"font-weight:{'700' if bold else '400'}",
        f"font-style:{'italic' if italic else 'normal'}",
        "margin:0",
    ]
    if align is not None:
        css.append("text-align:" + str(align).split()[0].lower())
    else:
        css.append("text-align:justify")
    if fli is not None:
        css.append(f"text-indent:{fli.pt:.1f}pt")
    if li is not None:
        css.append(f"margin-left:{li.pt:.1f}pt")
    if ri is not None:
        css.append(f"margin-right:{ri.pt:.1f}pt")
    if sb:
        css.append(f"margin-top:{sb.pt:.1f}pt")
    if sa:
        css.append(f"margin-bottom:{sa.pt:.1f}pt")

    if "w:shd" in para._p.xml:
        import re as _re
        m = _re.search(r'w:fill="([0-9A-Fa-f]{6})"', para._p.xml)
        if m:
            css.append(f"background-color:#{m.group(1)}")
            # horizontal padding only: vertical padding puts whitespace inside
            # each shaded paragraph and breaks one panel into bands
            css.append("padding:2pt 6pt")

    frags = []
    for r in para.runs:
        t = esc(r.text)
        if not t:
            continue
        if r.bold:
            t = f"<b>{t}</b>"
        if r.italic:
            t = f"<i>{t}</i>"
        frags.append(t)
    inner = "".join(frags) or esc(para.text)
    return f'<p style="{";".join(css)}">{inner}</p>'


def table_html(tbl):
    rows = []
    for ri, row in enumerate(tbl.rows):
        cells = []
        for c in row.cells:
            inner = "<br/>".join(esc(p.text) for p in c.paragraphs if p.text.strip()) or "&#160;"
            tag = "th" if ri == 0 else "td"
            cells.append(f"<{tag}>{inner}</{tag}>")
        rows.append("<tr>" + "".join(cells) + "</tr>")
    return '<table class="k">' + "".join(rows) + "</table>"


def iter_blocks(document):
    for child in document.element.body.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, document)
        elif child.tag == qn("w:tbl"):
            yield Table(child, document)


# ---- split into logical pages on explicit page breaks ----------------------
logical = []
cur = []
for item in iter_blocks(doc):
    if isinstance(item, Paragraph):
        raw = item._p.xml
        if ('w:type="page"' in raw) or ("pageBreakBefore" in raw):
            if cur:
                logical.append(cur)
                cur = []
            continue
    cur.append(item)
if cur:
    logical.append(cur)

# ---- render -----------------------------------------------------------------
merged = pymupdf.open()
stats = {"paras": 0, "tables": 0, "logical": len(logical)}
tmpfiles = []

for blocks in logical:
    frags = []
    for item in blocks:
        if isinstance(item, Paragraph):
            frags.append(para_html(item))
            stats["paras"] += 1
        else:
            frags.append(table_html(item))
            stats["tables"] += 1
    body = "".join(frags) or "<p>&#160;</p>"

    story = pymupdf.Story(html=f"<body>{body}</body>", user_css=FONT_CSS,
                          archive=archive, em=10.5)
    fd, tpath = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    tmpfiles.append(tpath)
    writer = pymupdf.DocumentWriter(tpath)

    def rectfn(n, filled):
        # order is (mediabox, textrect, ctm); swapping the first two pushes the
        # whole text block off the left edge of the page
        return (pymupdf.Rect(0, 0, PW, PH),
                pymupdf.Rect(LEFT, TOP, LEFT + BODY_W, BOTTOM_Y),
                pymupdf.Matrix(1, 1))

    story.write(writer, rectfn)
    writer.close()
    sub = pymupdf.open(tpath)
    merged.insert_pdf(sub)
    sub.close()

for f in tmpfiles:
    try:
        os.remove(f)
    except OSError:
        pass

for i in range(merged.page_count):
    merged[i].insert_text((LEFT + BODY_W / 2 - 3.2, PH - BOT + 26), str(i + 1),
                          fontname="helv", fontsize=9, color=(0.4, 0.4, 0.4))

os.makedirs(f"{OUT}/pages", exist_ok=True)
for i in range(merged.page_count):
    merged[i].get_pixmap(dpi=110).save(f"{OUT}/pages/p{i+1:02d}.png")
merged.save(f"{OUT}/paginated.pdf")

print("blocks:", stats)
print("rendered pages:", merged.page_count)
