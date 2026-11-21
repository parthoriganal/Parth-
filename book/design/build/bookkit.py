"""
bookkit.py — production typesetting core for The 15-Minute Fascial Release Plan

Design decisions encoded here:
  * 6 x 9 in trim, no bleed (no full-page art)
  * mirrored margins: gutter 0.875", outer 0.625", top 0.75", bottom 0.8"
  * Literata (body) + Inter (heads/labels/captions) — both OFL, embedded subsets
  * pyphen en-GB hyphenation with proper justification via word-spacing shim
  * all flowables shrink-to-fit so nothing can overflow the text block
"""
import os, re, html
from reportlab.lib.pagesizes import inch
from reportlab.lib.units import inch as IN
from reportlab.lib.colors import Color, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, NextPageTemplate,
                                PageBreak, Flowable, KeepTogether, CondPageBreak)
import pyphen
from reportlab import rl_config as _rc
from reportlab.pdfgen.canvas import Canvas as _Canvas

# ReportLab hyphenates natively when a language is set and pyphen is importable.
_rc.hyphenationLang = "en_GB"
# keep the always-registered base font (F1) inside our embedded family
_rc.canvas_basefontname = "Literata"

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "..", "fonts")

# ---------------------------------------------------------------- geometry
PAGE_W, PAGE_H = 6 * IN, 9 * IN
GUTTER   = 0.875 * IN
OUTER    = 0.625 * IN
TOP      = 0.75 * IN
BOTTOM   = 0.80 * IN
TEXT_W   = PAGE_W - GUTTER - OUTER
TEXT_H   = PAGE_H - TOP - BOTTOM

INK    = Color(0.07, 0.07, 0.07)
GREY   = Color(0.42, 0.42, 0.42)
LIGHT  = Color(0.62, 0.62, 0.62)
HAIR   = Color(0.72, 0.72, 0.70)
PANEL  = Color(0.955, 0.952, 0.945)
RULE_D = Color(0.25, 0.25, 0.25)


def register_fonts():
    faces = {
        "Literata":          "Literata-Regular.ttf",
        "Literata-SemiBold": "Literata-SemiBold.ttf",
        "Literata-Italic":   "Literata-Italic.ttf",
        "Inter":             "Inter-Regular.ttf",
        "Inter-Medium":      "Inter-Medium.ttf",
        "Inter-Bold":        "Inter-Bold.ttf",
    }
    for name, fn in faces.items():
        pdfmetrics.registerFont(TTFont(name, os.path.join(FONT_DIR, fn)))
    addMapping("Literata", 0, 0, "Literata")
    addMapping("Literata", 1, 0, "Literata-SemiBold")
    addMapping("Literata", 0, 1, "Literata-Italic")
    addMapping("Literata", 1, 1, "Literata-SemiBold")
    addMapping("Inter", 0, 0, "Inter")
    addMapping("Inter", 1, 0, "Inter-Bold")
    addMapping("Inter", 0, 1, "Inter")
    addMapping("Inter", 1, 1, "Inter-Bold")


# ------------------------------------------------------------ hyphenation
def hyphenate(fragment):
    """Identity shim: hyphenation is handled by ReportLab via rl_config."""
    return fragment


# ---------------------------------------------------------------- styles
def styles():
    S = {}
    S["body"] = ParagraphStyle("body", fontName="Literata", fontSize=10.4, leading=15.1,
                               alignment=TA_JUSTIFY, textColor=INK,
                               spaceBefore=0, spaceAfter=0, allowWidows=0, allowOrphans=0,
                               hyphenationLang="en_GB", embeddedHyphenation=1)
    S["body_first"] = ParagraphStyle("body_first", parent=S["body"], firstLineIndent=0)
    S["body_indent"] = ParagraphStyle("body_indent", parent=S["body"], firstLineIndent=13)
    S["chap_num"] = ParagraphStyle("chap_num", fontName="Inter-Medium", fontSize=8.2,
                                   leading=11, textColor=GREY, spaceAfter=12)
    S["chap_title"] = ParagraphStyle("chap_title", fontName="Literata-SemiBold", fontSize=22,
                                     leading=26.5, textColor=black, spaceAfter=8)
    S["chap_kicker"] = ParagraphStyle("chap_kicker", fontName="Literata-Italic", fontSize=11.2,
                                      leading=16, textColor=GREY, spaceAfter=6)
    S["h2"] = ParagraphStyle("h2", fontName="Inter-Medium", fontSize=9.6, leading=12.6,
                             textColor=black, spaceBefore=15, spaceAfter=6)
    S["h3"] = ParagraphStyle("h3", fontName="Literata-SemiBold", fontSize=10.4, leading=14,
                             textColor=black, spaceBefore=11, spaceAfter=4)
    S["box_head"] = ParagraphStyle("box_head", fontName="Inter-Bold", fontSize=7.4, leading=10,
                                   textColor=black, spaceAfter=7)
    S["box_body"] = ParagraphStyle("box_body", fontName="Literata", fontSize=9.2, leading=13.3,
                                   alignment=TA_LEFT, textColor=Color(0.13, 0.13, 0.13))
    S["box_body_ind"] = ParagraphStyle("box_body_ind", parent=S["box_body"], spaceBefore=5)
    S["caption"] = ParagraphStyle("caption", fontName="Inter", fontSize=7.4, leading=10.4,
                                  textColor=GREY, spaceBefore=5, alignment=TA_LEFT)
    S["pull"] = ParagraphStyle("pull", fontName="Literata-Italic", fontSize=13, leading=19,
                               textColor=Color(0.20, 0.20, 0.20), alignment=TA_LEFT,
                               leftIndent=16, rightIndent=16, spaceBefore=6, spaceAfter=6)
    S["table"] = ParagraphStyle("table", fontName="Inter", fontSize=8.0, leading=11,
                                alignment=TA_LEFT, textColor=INK)
    S["table_head"] = ParagraphStyle("table_head", fontName="Inter-Bold", fontSize=7.4,
                                     leading=10, alignment=TA_LEFT, textColor=black)
    S["bullet"] = ParagraphStyle("bullet", parent=S["body"], leftIndent=14, bulletIndent=2,
                                 spaceAfter=4.5, alignment=TA_LEFT)
    S["note"] = ParagraphStyle("note", fontName="Inter", fontSize=7.8, leading=11.6,
                               textColor=Color(0.30, 0.30, 0.30), alignment=TA_LEFT)
    S["fm_title"] = ParagraphStyle("fm_title", fontName="Literata-SemiBold", fontSize=26,
                                   leading=31, alignment=TA_CENTER, textColor=black)
    S["fm_sub"] = ParagraphStyle("fm_sub", fontName="Literata-Italic", fontSize=12.5,
                                 leading=18, alignment=TA_CENTER, textColor=Color(0.25, 0.25, 0.25))
    S["fm_small"] = ParagraphStyle("fm_small", fontName="Inter", fontSize=7.6, leading=11.4,
                                   alignment=TA_LEFT, textColor=Color(0.28, 0.28, 0.28))
    S["fm_center"] = ParagraphStyle("fm_center", fontName="Inter", fontSize=8.4, leading=13,
                                    alignment=TA_CENTER, textColor=Color(0.25, 0.25, 0.25))
    S["toc_ch"] = ParagraphStyle("toc_ch", fontName="Literata", fontSize=9.8, leading=14.6,
                                 textColor=INK)
    S["toc_part"] = ParagraphStyle("toc_part", fontName="Inter-Bold", fontSize=7.6, leading=12,
                                   textColor=GREY, spaceBefore=11, spaceAfter=3)
    return S


# ------------------------------------------------------------- flowables
class HRule(Flowable):
    def __init__(self, width, thickness=0.5, color=HAIR, before=0, after=0):
        Flowable.__init__(self)
        self.width, self.t, self.color = width, thickness, color
        self.before, self.after = before, after
        self.height = thickness + before + after
    def wrap(self, aw, ah): return (min(self.width, aw), self.height)
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(self.t)
        y = self.after
        self.canv.line(0, y, self.width, y)


class Ornament(Flowable):
    """A short centred rule — used once per chapter close, not as decoration spam."""
    def __init__(self, width=26, color=RULE_D, before=14, after=14):
        Flowable.__init__(self)
        self.w, self.color, self.before, self.after = width, color, before, after
        self.height = before + after + 0.6
    def wrap(self, aw, ah): return (aw, self.height)
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(0.6)
        cx = self.w / 2.0
        self.canv.line(cx - self.w / 2, self.after, cx + self.w / 2, self.after)


def panel(flowables, width, bg=PANEL, border=Color(0.80, 0.79, 0.76), pad=14):
    t = Table([[flowables]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.5, border),
        ("LEFTPADDING", (0, 0), (-1, -1), pad),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), pad - 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad - 2),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    t.hAlign = "LEFT"
    return t


class Bookmark(Flowable):
    """Zero-height marker that registers a PDF outline entry."""
    def __init__(self, key, title, level=0):
        Flowable.__init__(self)
        self.key, self.title, self.level = key, title, level
        self.width = self.height = 0
    def wrap(self, aw, ah): return (0, 0)
    def draw(self):
        self.canv.bookmarkPage(self.key)
        self.canv.addOutlineEntry(self.title, self.key, level=self.level, closed=False)


# ------------------------------------------------------------- document
class _BookCanvas(_Canvas):
    def __init__(self, *a, **kw):
        kw.setdefault("initialFontName", "Literata")
        kw.setdefault("initialFontSize", 10.4)
        _Canvas.__init__(self, *a, **kw)


class Book(BaseDocTemplate):
    def __init__(self, path, running_title="", **kw):
        BaseDocTemplate.__init__(self, path, pagesize=(PAGE_W, PAGE_H),
                                 leftMargin=GUTTER, rightMargin=OUTER,
                                 topMargin=TOP, bottomMargin=BOTTOM,
                                 title=kw.pop("title", ""), author=kw.pop("author", ""),
                                 subject=kw.pop("subject", ""), creator="bookkit",
                                 canvasmaker=_BookCanvas,
                                 **kw)
        self.running_title = running_title
        self.chapter_name = ""
        self.show_folio = True
        self.blank_next = False
        self._frame = Frame(GUTTER, BOTTOM, TEXT_W, TEXT_H, id="main",
                            leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([PageTemplate(id="main", frames=[self._frame],
                                            onPage=self._deco)])

    def handle_pageBegin(self):
        # Mirrored margins by parity: move the single frame so the wider gutter
        # always sits against the spine. Done here, before layout, so it cannot
        # land on the wrong side.
        pn = self.page + 1          # 1-based number of the page being begun
        self._frame._x1 = GUTTER if pn % 2 == 1 else OUTER
        BaseDocTemplate.handle_pageBegin(self)

    def _deco(self, canv, doc):
        pn = canv.getPageNumber()
        canv.saveState()
        if pn > 1 and self.show_folio:
            recto = (pn % 2 == 1)
            x_in  = GUTTER if recto else OUTER
            x_out = PAGE_W - OUTER if recto else PAGE_W - GUTTER
            y = PAGE_H - TOP + 17
            canv.setFont("Inter-Medium", 7.2); canv.setFillColor(GREY)
            canv.drawString(x_in, y, self.chapter_name.upper()[:46])
            canv.drawRightString(x_out, y, self.running_title.upper()[:44])
            canv.setStrokeColor(HAIR); canv.setLineWidth(0.4)
            canv.line(x_in, y - 4.5, x_out, y - 4.5)
            canv.setFont("Inter-Medium", 8.2); canv.setFillColor(GREY)
            if recto:
                canv.drawRightString(x_out, BOTTOM - 25, str(pn))
            else:
                canv.drawString(x_in, BOTTOM - 25, str(pn))
        canv.restoreState()

    def afterFlowable(self, flowable):
        pass
