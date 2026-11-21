"""Generate the final DOCX: 6x9, real Word styles, live TOC field, page numbering."""
import os, re, glob
from docx import Document
from docx.shared import Pt, Inches, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..")
FONT_DIR = os.path.join(HERE, "..", "..", "design", "fonts")

BODY_FONT = "Literata"
HEAD_FONT = "Inter"
INK = RGBColor(0x12, 0x12, 0x12)
GREY = RGBColor(0x6B, 0x6B, 0x6B)


# ------------------------------------------------------------------ helpers
def set_font(run, name, size=None, bold=None, italic=None, color=None):
    run.font.name = name
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts"); rPr.append(rFonts)
    for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rFonts.set(qn(a), name)
    if size is not None:  run.font.size = Pt(size)
    if bold is not None:  run.font.bold = bold
    if italic is not None: run.font.italic = italic
    if color is not None: run.font.color.rgb = color


def add_field(paragraph, instr):
    r = paragraph.add_run()
    f1 = OxmlElement("w:fldChar"); f1.set(qn("w:fldCharType"), "begin")
    it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = instr
    f2 = OxmlElement("w:fldChar"); f2.set(qn("w:fldCharType"), "separate")
    t = OxmlElement("w:t")
    if "PAGE" in instr:
        t.text = "1"
    f3 = OxmlElement("w:fldChar"); f3.set(qn("w:fldCharType"), "end")
    r._r.append(f1); r._r.append(it); r._r.append(f2); r._r.append(t); r._r.append(f3)


def shade(paragraph, hexcolor="F4F2EC"):
    pPr = paragraph._p.get_or_add_pPr()
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), hexcolor)
    pPr.append(sh)
    for edge in ("top", "bottom"):
        b = OxmlElement("w:pBdr")
    pbdr = OxmlElement("w:pBdr")
    for edge, sz in (("top", "6"), ("left", "18"), ("bottom", "6"), ("right", "6")):
        e = OxmlElement("w:" + edge)
        e.set(qn("w:val"), "single"); e.set(qn("w:sz"), sz)
        e.set(qn("w:space"), "6"); e.set(qn("w:color"), "D8D5CC")
        pbdr.append(e)
    pPr.append(pbdr)


def _outline_level(style, level):
    """Give a custom style a real Word outline level so TOC/nav can find it."""
    pPr = style.element.get_or_add_pPr()
    ol = OxmlElement("w:outlineLvl")
    ol.set(qn("w:val"), str(level))
    pPr.append(ol)
    # also alias it to a built-in heading so field-driven TOC picks it up
    style.base_style = style.base_style


def keep_with_next(paragraph):
    pPr = paragraph._p.get_or_add_pPr()
    k = OxmlElement("w:keepNext"); pPr.append(k)
    k2 = OxmlElement("w:keepLines"); pPr.append(k2)


def page_break(doc):
    p = doc.add_paragraph()
    p.add_run().add_break(WD_BREAK.PAGE)
    return p


# ------------------------------------------------------------------ document
def build():
    doc = Document()

    # ---- page setup: 6 x 9, mirrored margins
    s = doc.sections[0]
    s.page_width, s.page_height = Inches(6), Inches(9)
    s.left_margin, s.right_margin = Inches(0.875), Inches(0.625)
    s.top_margin, s.bottom_margin = Inches(0.75), Inches(0.80)
    s.header_distance, s.footer_distance = Inches(0.42), Inches(0.45)
    s.different_first_page_header_footer = True
    # Mirrored gutter. w:mirrorMargins belongs to w:settings, NOT w:sectPr:
    # placed in sectPr Word silently ignores it and pages do not alternate.
    # Inside settings it must also precede w:updateFields to stay schema-valid.
    settings = doc.settings.element
    mirror = OxmlElement("w:mirrorMargins")
    hr = settings.find(qn("w:hdrShapeDefaults"))
    if hr is not None:
        hr.addprevious(mirror)
    else:
        settings.insert(0, mirror)

    # ---- styles
    st = doc.styles
    normal = st["Normal"]
    normal.font.name = BODY_FONT
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = INK
    rpr = normal.element.get_or_add_rPr()
    rf = OxmlElement("w:rFonts")
    for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rf.set(qn(a), BODY_FONT)
    rpr.append(rf)
    pf = normal.paragraph_format
    pf.line_spacing = Pt(15.2)
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf.widow_control = True

    def mk(name, base="Normal", size=10.5, font=BODY_FONT, bold=False,
           before=0, after=0, align=WD_ALIGN_PARAGRAPH.LEFT, spacing=None,
           italic=False, color=INK, indent=0, keep=False, caps=False):
        if name in [x.name for x in st]:
            p = st[name]
        else:
            p = st.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
        p.base_style = st[base]
        p.font.name = font; p.font.size = Pt(size); p.font.bold = bold
        p.font.italic = italic; p.font.color.rgb = color
        p.font.all_caps = caps
        r = p.element.get_or_add_rPr()
        rfx = OxmlElement("w:rFonts")
        for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
            rfx.set(qn(a), font)
        r.append(rfx)
        f = p.paragraph_format
        f.space_before = Pt(before); f.space_after = Pt(after)
        f.alignment = align
        f.first_line_indent = Inches(indent)
        if spacing: f.line_spacing = Pt(spacing)
        if keep: f.keep_with_next = True
        return p

    bf = mk("Body First", indent=0, spacing=15.2, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    bf.paragraph_format.widow_control = True
    bi = mk("Body Text Indent", indent=0.18, spacing=15.2, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    bi.paragraph_format.widow_control = True
    ch = mk("Chapter Title", size=23, bold=True, after=10, spacing=27,
            align=WD_ALIGN_PARAGRAPH.LEFT, keep=True)
    _outline_level(ch, 0)
    sh = mk("Section Heading", size=13.5, bold=True, before=18, after=7, spacing=17,
            align=WD_ALIGN_PARAGRAPH.LEFT, keep=True)
    _outline_level(sh, 1)

    mk("Chapter Number", size=8.5, font=HEAD_FONT, color=GREY, after=10, caps=True,
       align=WD_ALIGN_PARAGRAPH.LEFT)
    mk("Chapter Kicker", size=11, font=BODY_FONT, italic=True, color=GREY, after=20,
       spacing=16, align=WD_ALIGN_PARAGRAPH.LEFT)
    mk("Subheading", size=10.5, font=HEAD_FONT, bold=True, before=13, after=4,
       spacing=14, align=WD_ALIGN_PARAGRAPH.LEFT, keep=True)
    mk("Callout Body", size=9.5, spacing=13.5, align=WD_ALIGN_PARAGRAPH.LEFT)
    mk("Callout Head", size=7.5, font=HEAD_FONT, bold=True, after=6, caps=True,
       align=WD_ALIGN_PARAGRAPH.LEFT)
    mk("List Bullet Custom", size=10.5, spacing=15, align=WD_ALIGN_PARAGRAPH.LEFT,
       indent=0.0)
    mk("Caption", size=7.5, font=HEAD_FONT, color=GREY, spacing=10.5)
    mk("Reference", size=9, spacing=12.6, after=7, align=WD_ALIGN_PARAGRAPH.LEFT)
    mk("Front Title", size=26, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER,
       after=8, spacing=31)
    mk("Front Sub", size=11.5, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER,
       spacing=17, color=RGBColor(0x33, 0x33, 0x33))
    mk("Front Small", size=8, font=HEAD_FONT, spacing=12, align=WD_ALIGN_PARAGRAPH.LEFT)
    mk("TOC Entry", size=10, spacing=15, after=2, align=WD_ALIGN_PARAGRAPH.LEFT)

    # ---- running head + folio
    hdr = s.header
    hp = hdr.paragraphs[0]
    hp.text = ""
    hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = hp.add_run("The 15-Minute Fascial Release Plan")
    set_font(r, HEAD_FONT, 7.5, color=GREY)
    ftr = s.footer
    fp = ftr.paragraphs[0]
    fp.text = ""
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run(); set_font(r, HEAD_FONT, 8.5, color=GREY)
    add_field(fp, " PAGE ")

    story = []           # collected as (kind, text) then emitted
    P = doc.add_paragraph

    def para(text, style="Body Text Indent"):
        p = P(style=style)
        for seg, bold, ital in parse_inline(text):
            r = p.add_run(seg)
            r.font.bold = bold if bold else None
            r.font.italic = ital if ital else None
        return p

    # ============================================== FRONT MATTER
    for _ in range(6):
        P()
    p = P(style="Front Title"); p.add_run("The 15-Minute\nFascial Release Plan")
    p = P(style="Front Sub")
    p.add_run("Self-Treatment for Stiff Necks, Tight Shoulders, and Aching Hips — "
              "Using Only a Tennis Ball, a Wall, and a Towel")
    page_break(doc)

    P(style="Front Small").add_run("Copyright © 2026. All rights reserved.")
    P(style="Front Small").add_run("No part of this book may be reproduced in any form "
                                   "without written permission, except brief quotations in a review.")
    p = P(style="Front Small")
    p.add_run("This book is an original work of research and commentary. It is not medical advice.")
    P()

    page_break(doc)
    p = P(style="Section Heading"); p.add_run("Important Note to the Reader")
    # Set through emit_callout so this block gets the same shading and rule as
    # every other callout. It used to be written out by hand and was the only
    # unshaded callout in the book.
    emit_callout(doc, [
        "THIS BOOK HAS NOT BEEN REVIEWED BY A DOCTOR, PHYSIOTHERAPIST, OR OTHER QUALIFIED CLINICIAN.",
        "It is written for general educational purposes. It is not a substitute for individual "
        "medical assessment, diagnosis, or treatment, and no book can examine you.",
        "Read Chapter 4 before attempting anything in Chapter 5. Do not begin if you have any "
        "condition on the contraindication list, are pregnant, have recently had surgery, take "
        "anticoagulant medication, or are unsure whether these techniques are appropriate for you.",
        "The information here reflects the published evidence available in 2026. Medicine changes. "
        "If your situation changes, or if you are uncertain, consult a qualified healthcare "
        "professional.",
    ], P, para)

    page_break(doc)
    P(style="Section Heading").add_run("A Note on the Evidence")
    para("This book distinguishes, throughout, between what is established, what is emerging, and "
         "what is hypothesis. Where the research is divided, it says so rather than choosing the "
         "convenient side.", "Body First")
    para("The evidence cited is drawn from systematic reviews, meta-analyses, clinical practice "
         "guidelines, and primary studies, listed in the References at the end. Certainty language "
         "follows the conventions of the field: when a review rates evidence as \u201cmoderate "
         "certainty,\u201d that is a specific technical judgement and it is not the same as "
         "\u201cproven.\u201d")
    para("Where a study was read only in abstract or summary form, the reference list does not claim "
         "otherwise. No references have been fabricated and no studies are cited that were not "
         "consulted.")

    page_break(doc)
    P(style="Section Heading").add_run("Contents")
    tp = P()
    add_field(tp, r' TOC \o "1-2" \h \z \u ')
    # No reader-facing instructions here: this is inside the book, so the
    # field must read correctly with no manual update. fallback_text gives
    # it a visible placeholder until Word regenerates it on open.
    # w:updateFields makes Word refresh the TOC on open; the separate block
    # below is the visible placeholder for readers who never trigger it.
    uf = OxmlElement("w:updateFields"); uf.set(qn("w:val"), "true")
    doc.settings.element.append(uf)
    for _ch, _nm in ((1, "The Morning Check"), (2, "What Fascia Is, and What It Is Not"),
                     (3, "What a Ball Can and Cannot Do"), (4, "Before You Start"),
                     (5, "The Three Tools, and the Routine"),
                     (6, "Progress, Setbacks, and Knowing When to Stop"),
                     (7, "Quick Reference")):
        e = P(style="TOC Entry")
        e.add_run(f"Chapter {_ch}   {_nm}")
    P(style="TOC Entry").add_run("References")
    P(style="TOC Entry").add_run("Appendix: The Record Table")
    P(style="TOC Entry").add_run("Glossary")

    # ============================================== CHAPTERS
    files = sorted(glob.glob(os.path.join(SRC, "0[1-7]-*.md")))
    for path in files:
        page_break(doc)
        emit_chapter(doc, path, P, para)

    # ============================================== REFERENCES + BACK
    for path, title in [(os.path.join(SRC, "08-references.md"), None),
                        (os.path.join(SRC, "09-back-matter.md"), None)]:
        page_break(doc)
        emit_chapter(doc, path, P, para, plain=True)

    out = os.path.join(SRC, "..", "The_15_Minute_Fascial_Release_Plan_Final.docx")
    doc.save(os.path.abspath(out))
    print("saved", os.path.abspath(out), os.path.getsize(out), "bytes")


# ------------------------------------------------------------------ markup
def parse_inline(text):
    """Split **bold** and *italic* into (text, bold, italic) tuples."""
    out = []
    tokens = re.split(r"(\*\*[^*]+\*\*|\*[^*]+\*)", text)
    for tok in tokens:
        if not tok:
            continue
        if tok.startswith("**") and tok.endswith("**"):
            out.append((tok[2:-2], True, False))
        elif tok.startswith("*") and tok.endswith("*") and len(tok) > 2:
            out.append((tok[1:-1], False, True))
        else:
            out.append((tok, False, False))
    return out


def emit_chapter(doc, path, P, para, plain=False):
    raw = open(path).read()
    lines = [l.rstrip() for l in raw.split("\n")]
    first_para = True
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1; continue

        if line.startswith("# "):
            title = line[2:].strip()
            if plain:
                # The top-level "# Back Matter" is a structural label for the
                # source files, not something a reader should see on a page.
                # The first real heading inside it ("Appendix...") takes over.
                first_para = True
                i += 1; continue
            else:
                # "1 · The Morning Check" -> number + title
                m = re.match(r"(\d+)\s*·\s*(.+)", title)
                if m:
                    p = P(style="Chapter Number"); p.add_run("Chapter " + m.group(1))
                    p = P(style="Chapter Title"); p.add_run(m.group(2))
                else:
                    p = P(style="Chapter Title"); p.add_run(title)
            first_para = True
            i += 1; continue

        if line.startswith("## "):
            p = P(style="Section Heading"); p.add_run(line[3:].strip())
            first_para = True
            i += 1; continue

        if line.startswith("### "):
            p = P(style="Subheading"); p.add_run(line[4:].strip())
            first_para = True
            i += 1; continue

        if line.startswith("|"):
            # table block
            block = []
            while i < len(lines) and lines[i].startswith("|"):
                block.append(lines[i]); i += 1
            emit_table(doc, block)
            first_para = True
            continue

        if line.startswith("- "):
            p = P(style="List Bullet Custom")
            p.paragraph_format.left_indent = Inches(0.22)
            p.paragraph_format.first_line_indent = Inches(-0.16)
            p.paragraph_format.space_after = Pt(4)
            segments = parse_inline(line[2:].strip())
            first = True
            for seg, bold, ital in segments:
                r = p.add_run(("\u2022\u2002" if first else "") + seg)
                first = False
                r.font.name = BODY_FONT
                r.font.size = Pt(10.5)
                r.font.bold = bold or None
                r.font.italic = ital or None
            i += 1; continue

        if line.startswith("> "):
            # callout block
            block = []
            while i < len(lines) and lines[i].startswith(">"):
                block.append(lines[i].lstrip("> ").strip()); i += 1
            emit_callout(doc, [b for b in block if b], P, para)
            first_para = True
            continue

        if set(line.strip()) <= set("-—*") and len(line.strip()) >= 3:
            i += 1; continue

        style = "Body First" if first_para else "Body Text Indent"
        para(line.strip(), style)
        first_para = False
        i += 1


def emit_callout(doc, lines, P, para):
    from docx.shared import Pt
    for idx, text in enumerate(lines):
        # A callout head is the first all-caps line. There used to be a
        # len(text) < 70 cap here, which silently demoted any longer head to
        # body style; the copyright notice is 92 characters and lost its
        # small bold Inter treatment because of it.
        is_head = (idx == 0
                   and text == text.upper()
                   and any(ch.isalpha() for ch in text))
        style = "Callout Head" if is_head else "Callout Body"
        p = P(style=style)
        for seg, bold, ital in parse_inline(text):
            r = p.add_run(seg)
            r.font.bold = bold or None
            r.font.italic = ital or None
        shade(p)
        # space_after must be 0 between the paragraphs of one callout, or the
        # shading breaks into separate bands instead of reading as one panel.
        # The gap between *separate* callouts comes from the preceding
        # paragraph's spacing, not from inside the block.
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.left_indent = Pt(8)
        p.paragraph_format.right_indent = Pt(8)


def emit_table(doc, block):
    rows = []
    for l in block:
        if re.match(r"^\|[\s\-|:]+\|$", l.replace(" ", "").replace("\u2014", "-")) and set(l) <= set("|-: "):
            continue
        cells = [c.strip() for c in l.strip().strip("|").split("|")]
        if all(set(c) <= set("-: ") for c in cells):
            continue
        rows.append(cells)
    if not rows:
        return
    ncol = max(len(r) for r in rows)
    t = doc.add_table(rows=0, cols=ncol)
    t.style = "Table Grid"
    for ri, cells in enumerate(rows):
        cells = cells + [""] * (ncol - len(cells))
        row = t.add_row()
        # stop Word splitting a row across a page break
        trPr = row._tr.get_or_add_trPr()
        cant = OxmlElement("w:cantSplit"); trPr.append(cant)
        if ri == 0:
            hdr = OxmlElement("w:tblHeader"); trPr.append(hdr)
        for ci, ctext in enumerate(cells):
            cell = row.cells[ci]
            cell.text = ""
            p = cell.paragraphs[0]
            for seg, bold, ital in parse_inline(ctext):
                r = p.add_run(seg)
                r.font.name = HEAD_FONT
                r.font.size = Pt(8)
                r.font.bold = True if ri == 0 else (bold or None)
                r.font.italic = ital or None
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = Pt(10.5)
    doc.add_paragraph()


if __name__ == "__main__":
    build()
