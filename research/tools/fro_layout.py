"""
fro_layout.py — layout engine for "The Family Records Organizer".

This module owns paper geometry, typography, page furniture and the primitives used to
build every worksheet. It contains no book copy; see fro_content.py for that.

DESIGN CONSTRAINTS THIS ENGINE ENFORCES
  * Trim 8.5 x 11 in, no bleed, black ink only (pure greyscale, no colour anywhere).
  * Mirrored margins: the gutter side swaps between recto and verso.
  * Verified KDP minima for 24-150 pp at this trim: inside 0.375 in, outside 0.25 in.
    We use 0.875 in inside and 0.625 in outside — far wider than required. The extra
    inside margin exists because a perfect-bound 8.5 x 11 book will not lie flat; this
    widens the usable writing area at the spine. It does NOT flatten the book and the
    book never claims otherwise.
  * Every drawn string is recorded in TRACE so geometry can be measured rather than
    eyeballed. reportlab's text objects can leak character-spacing into the graphics
    state (this bit us in round 8), so all tracked text goes through drawString(charSpace=).
  * Fonts are embedded TrueType (Lora + Work Sans, both SIL OFL 1.1).
"""
from reportlab.pdfgen import canvas as canvaslib
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import inch
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import Paragraph

import os

# ---------------------------------------------------------------- paper geometry
PT = 1.0
PAGE_W, PAGE_H = 8.5 * inch, 11.0 * inch
GUTTER_IN = 0.875          # inside margin (spine side) — deliberate, see module docstring
OUTER_IN = 0.625           # outside margin
TOP_IN = 0.78
BOTTOM_IN = 0.80
CONTENT_W = (8.5 - GUTTER_IN - OUTER_IN) * inch      # 7.0 in

HEAD_RULE_Y = PAGE_H - 0.62 * inch
HEAD_BASE_Y = PAGE_H - 0.50 * inch
FOOT_RULE_Y = 0.62 * inch
FOOT_BASE_Y = 0.50 * inch
CONTENT_TOP = PAGE_H - TOP_IN * inch                 # 10.22 in
CONTENT_BOT = BOTTOM_IN * inch                       # 0.80 in

SAFE_LEFT = OUTER_IN                # inches
SAFE_RIGHT = 8.5 - OUTER_IN

# ---------------------------------------------------------------- greyscale palette
# Exactly neutral greyscale: every value has r = g = b, which is asserted by qa_book.py
# from the colour operators in the finished PDF. A warm tint reads better on screen and is
# indistinguishable in B&W print, but an exact grey means the file needs no qualifier when
# it is described as black ink on white paper.
INK        = Color(0.09, 0.09, 0.09)       # headings, rules that matter
BODY       = Color(0.13, 0.13, 0.13)       # body text
SOFT       = Color(0.33, 0.33, 0.33)       # secondary prose
LABEL      = Color(0.42, 0.42, 0.42)       # field labels  (≈ 4.6:1 on white)
FAINT      = Color(0.56, 0.56, 0.56)       # folios, running heads
RULE       = Color(0.68, 0.68, 0.68)       # structural rules
RULE_LT    = Color(0.80, 0.80, 0.80)       # write-on lines
WASH       = Color(0.950, 0.950, 0.950)    # tint panels
WASH_2     = Color(0.906, 0.906, 0.906)    # stronger tint (table headers)
DARK       = Color(0.16, 0.16, 0.16)       # inverted table headers
WHITE      = Color(1, 1, 1)

# ---------------------------------------------------------------- typography
FONT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".claude", "skills", "anthropic", "canvas-design", "canvas-fonts")

SERIF, SANS = "Lora", "WorkSans"

BODY_SIZE, BODY_LEAD = 10.9, 16.2
MEASURE = 5.62 * inch          # readable prose measure inside the 7.0 in content width

TRACE = []          # dicts: page, box in inches, size, text
PARA_ENGINE = [None]   # set by Engine so para() can report overflow
PAGE = [0]


def register_fonts(font_dir=None):
    d = font_dir or FONT_DIR
    files = {
        "Lora":        ("Lora-Regular.ttf", "Lora-Bold.ttf", "Lora-Italic.ttf", "Lora-BoldItalic.ttf"),
        "Lora-B":      ("Lora-Bold.ttf",),
        "Lora-I":      ("Lora-Italic.ttf",),
        "Lora-BI":     ("Lora-BoldItalic.ttf",),
        "WorkSans":    ("WorkSans-Regular.ttf", "WorkSans-Bold.ttf", "WorkSans-Italic.ttf", None),
        "WorkSans-B":  ("WorkSans-Bold.ttf",),
        "WorkSans-I":  ("WorkSans-Italic.ttf",),
    }
    for name, fs in files.items():
        path = os.path.join(d, fs[0])
        if not os.path.exists(path):
            raise FileNotFoundError(path)
        pdfmetrics.registerFont(TTFont(name, path))
    pdfmetrics.registerFontFamily("Lora", normal="Lora", bold="Lora-B",
                                  italic="Lora-I", boldItalic="Lora-BI")
    pdfmetrics.registerFontFamily("WorkSans", normal="WorkSans", bold="WorkSans-B",
                                  italic="WorkSans-I", boldItalic="WorkSans-B")
    return True


# ---------------------------------------------------------------- text styles
def styles():
    return {
        "body": ParagraphStyle(
            "body", fontName="Lora", fontSize=BODY_SIZE, leading=BODY_LEAD,
            textColor=BODY, alignment=TA_LEFT, spaceAfter=BODY_LEAD * 0.62),
        "bodytight": ParagraphStyle(
            "bodytight", fontName="Lora", fontSize=BODY_SIZE, leading=BODY_LEAD,
            textColor=BODY, alignment=TA_LEFT, spaceAfter=BODY_LEAD * 0.34),
        "lede": ParagraphStyle(
            "lede", fontName="Lora", fontStyle="italic", fontSize=11.6, leading=18.4,
            textColor=SOFT, alignment=TA_LEFT, spaceAfter=BODY_LEAD * 0.55),
        "note": ParagraphStyle(
            "note", fontName="Lora", fontStyle="italic", fontSize=9.7, leading=14.2,
            textColor=SOFT, alignment=TA_LEFT, spaceAfter=0),
        "caption": ParagraphStyle(
            "caption", fontName="WorkSans", fontSize=8.4, leading=13.0,
            textColor=SOFT, alignment=TA_LEFT, spaceAfter=0),
        "bullet": ParagraphStyle(
            "bullet", fontName="Lora", fontSize=BODY_SIZE, leading=BODY_LEAD * 0.94,
            textColor=BODY, alignment=TA_LEFT, leftIndent=13, firstLineIndent=-13,
            spaceAfter=BODY_LEAD * 0.24),
        "centre": ParagraphStyle(
            "centre", fontName="Lora", fontSize=BODY_SIZE, leading=BODY_LEAD,
            textColor=BODY, alignment=TA_CENTER, spaceAfter=0),
    }


# ---------------------------------------------------------------- primitives
def text(c, x, y, s, font=SANS, size=10, color=BODY, space=0, align="L", box=None):
    """Draw a single-line string and record its real glyph box in TRACE."""
    w = pdfmetrics.stringWidth(s, font, size) + (space * max(len(s) - 1, 0) if space else 0)
    x0 = (x - w) if align == "R" else ((x - w / 2.0) if align == "C" else x)
    # the face's own bounding box, so ascenders and descenders are inside the record
    # Cap height plus a shallow descender is the honest collision box: using the face's
    # full ascender overstates large display type and produces false collisions.
    asc, desc = 0.71, -0.13
    TRACE.append({"p": PAGE[0], "x0": x0 / 72.0, "x1": (x0 + w) / 72.0,
                  "y0": (y + desc * size) / 72.0, "y1": (y + asc * size) / 72.0,
                  "size": size, "s": s})
    c.setFillColor(color)
    c.setFont(font, size)
    if align == "R":
        if space:
            w = pdfmetrics.stringWidth(s, font, size) + space * max(len(s) - 1, 0)
            c.drawString(x - w, y, s, charSpace=space)
        else:
            c.drawRightString(x, y, s)
    elif align == "C":
        if space:
            w = pdfmetrics.stringWidth(s, font, size) + space * max(len(s) - 1, 0)
            c.drawString(x - w / 2.0, y, s, charSpace=space)
        else:
            c.drawCentredString(x, y, s)
    else:
        c.drawString(x, y, s, charSpace=space)


def hline(c, x1, y, x2, color=RULE, w=0.6):
    c.setStrokeColor(color)
    c.setLineWidth(w)
    c.line(x1, y, x2, y)


def vline(c, x, y1, y2, color=RULE, w=0.6):
    c.setStrokeColor(color)
    c.setLineWidth(w)
    c.line(x, y1, x, y2)


def box(c, x, y, w, h, stroke=None, fill=None, lw=0.6):
    if fill is not None:
        c.setFillColor(fill)
    if stroke is not None:
        c.setStrokeColor(stroke)
        c.setLineWidth(lw)
    c.rect(x, y, w, h, stroke=1 if stroke is not None else 0,
           fill=1 if fill is not None else 0)


def hairbox(c, x, y, w, h, lw=0.7, color=RULE_LT):
    box(c, x, y, w, h, stroke=color, fill=None, lw=lw)


BOX_SIDE = 8.4          # checkbox side, pt — comfortably tickable with a pen
LABEL_SIZE = 7.6
LABEL_TRACK = 0.34


def label(c, x, y, s, color=LABEL, size=LABEL_SIZE, track=LABEL_TRACK,
          font="WorkSans-B", align="L"):
    text(c, x, y, s.upper(), font, size, color, space=track, align=align)


def checkbox(c, x, y, side=BOX_SIDE, color=Color(0.34, 0.34, 0.34), lw=0.8):
    c.setStrokeColor(color)
    c.setLineWidth(lw)
    c.rect(x, y, side, side, stroke=1, fill=0)


def opt_w(s, side=BOX_SIDE, pad=6.0):
    return side + 4.0 + pdfmetrics.stringWidth(s, "WorkSans", LABEL_SIZE) + pad


def option(c, x, y, s, side=BOX_SIDE, pad=6.0):
    checkbox(c, x, y, side)
    text(c, x + side + 4.0, y + 1.9, s, "WorkSans", LABEL_SIZE, Color(0.30, 0.30, 0.30))
    return x + opt_w(s, side, pad)


def options(c, x, y, labels, pad=6.0):
    cx = x
    for s in labels:
        cx = option(c, cx, y, s, pad=pad)
    return cx


def write_line(c, x, y, w, color=RULE_LT, lw=0.75):
    hline(c, x, y, x + w, color, lw)


def field(c, x, y, w, lab, line_y=None, size=None):
    """Label above a write-on rule. Rules are stroked, never typed underscores."""
    ly = y - (0.175 * inch if line_y is None else 0)
    if line_y is not None:
        ly = line_y
    label(c, x, y, lab)
    write_line(c, x, ly, w)


def para(c, text_, x, y, width, style, box_off=None, trailing=True):
    """Flow a Paragraph at (x, y) as its TOP edge. Returns the y of its bottom,
    including the style's spaceAfter unless trailing=False."""
    p = Paragraph(text_, style)
    w, h = p.wrap(width, 10000)
    p.drawOn(c, x, y - h)
    # Per-line boxes for QA. Calibrated against a raster: reportlab puts the first
    # baseline 0.66 x leading below the top of the frame, then one leading per line.
    size = getattr(style, "fontSize", 10.0) or 10.0
    lead = getattr(style, "leading", size * 1.4) or size * 1.4
    if y - h < CONTENT_BOT - 0.02 and y < CONTENT_TOP - 0.5:
        e = None
        try:
            eng = PARA_ENGINE[0]
            eng.overflows.append((PAGE[0], round((CONTENT_BOT - (y - h)) / 72.0, 2),
                                  "paragraph below the text block"))
        except Exception:
            pass
    lines = getattr(p.blPara, "lines", []) or []
    face = getattr(style, "fontName", "Lora") or "Lora"
    for i, ln in enumerate(lines):
        base = y - (0.66 + i) * lead
        # true line extent: measure the words reportlab actually placed, so the QA collision
        # check compares ink with ink instead of comparing against the full column width
        words = ln[1] if isinstance(ln, (tuple, list)) and len(ln) > 1 else []
        lw = 0.0
        if words:
            lw = sum(pdfmetrics.stringWidth(wd, face, size) for wd in words)
            lw += pdfmetrics.stringWidth(" ", face, size) * (len(words) - 1)
        else:
            lw = width
        TRACE.append({"p": PAGE[0], "x0": x / 72.0, "x1": (x + min(lw, width)) / 72.0,
                      "y0": (base - 0.26 * size) / 72.0,
                      "y1": (base + 0.74 * size) / 72.0,
                      "size": size, "s": "\u00b6"})
    return y - h - (getattr(style, "spaceAfter", 0) or 0 if trailing else 0)


# ---------------------------------------------------------------- page engine
class Engine:
    """Owns the canvas, the page cursor and all page furniture."""

    def __init__(self, path, title, author="", subject=""):
        # Initial font must be a real embedded face: reportlab's preamble emits a 12 pt Tf
        # for canvas._fontname on every page, and if that is a base-14 font the page ends up
        # with a non-embedded /F1 that KDP rejects. Register first, then start in Lora.
        register_fonts()
        self.c = canvaslib.Canvas(path, pagesize=(PAGE_W, PAGE_H),
                                  initialFontName=SERIF, initialFontSize=10)
        self.c.setTitle(title)
        self.c.setAuthor(author)
        self.c.setSubject(subject)
        self.c.setCreator("fro_layout.py")
        self.n = 0
        self.y = CONTENT_TOP
        self.st = styles()
        self.marks = {}          # label -> page number
        self.overflows = []       # (page, inches past the text block, what)
        self.page_end = {}        # page -> y (inches) where the body stopped
        PARA_ENGINE[0] = self
        self.clamps = []          # (page, requested rows, drawn rows, what)
        self.blank = []          # pages with no content ink
        self._new_page(first=True)

    # -- geometry ---------------------------------------------------------
    def frame(self, n=None):
        """(left, right) x for the current page — mirrored by parity."""
        n = self.n if n is None else n
        if n % 2 == 1:                     # recto: gutter on the left
            x = GUTTER_IN * inch
        else:                              # verso: gutter on the right
            x = OUTER_IN * inch
        return x, x + CONTENT_W

    # -- page lifecycle ---------------------------------------------------
    def _new_page(self, first=False):
        if not first:
            self.c.showPage()
        self.n += 1
        self.c.setFont(SERIF, 10)     # keep the page's initial Tf a real embedded face
        PAGE[0] = self.n
        self.y = CONTENT_TOP
        self._page_ink = False

    def new_page(self):
        self._new_page()

    def space(self, pts):
        self.y -= pts

    def need(self, pts):
        """Page-break if fewer than `pts` remain."""
        if self.y - pts < CONTENT_BOT:
            self._new_page()
            return True
        return False

    # -- furniture --------------------------------------------------------
    def furniture(self, running="", folio=True, rule=True):
        c = self.c
        x, xr = self.frame()
        part = running.split("\u00b7")[0].strip() if running else ""
        if running:
            label(c, x, HEAD_BASE_Y, running, FAINT, 7.2, 0.9, "WorkSans")
        if folio:
            text(c, xr, FOOT_BASE_Y, str(self.n), "Lora", 9.4, FAINT, align="R")
            label(c, x, FOOT_BASE_Y, part, FAINT, 7.0, 0.8, "WorkSans")
        if rule:
            hline(c, x, FOOT_RULE_Y, xr, RULE_LT, 0.6)

    def finish(self):
        # reportlab writes the page preamble from whatever font is current at save time,
        # including a "BT <font> 12 Tf" line. Leaving that as a base-14 face puts a
        # non-embedded /Helvetica in every page's resources, which KDP rejects. Set a real
        # face and rebuild the preamble before the document is written.
        self.c.setFont(SERIF, 10)
        self.c.setPageSize((PAGE_W, PAGE_H))
        self.c.save()
        return self.n
