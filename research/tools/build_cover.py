"""
build_cover.py — the separate KDP cover PDF, built to measured dimensions.

Dimensions are computed from the verified interior, not chosen:

    page count            116            (interior build, see PAGE_COUNT_AND_TRIM_REPORT.md)
    paper / ink           white, black
    spine per page        0.002252 in    (KDP B&W white paper)
    spine                 116 x 0.002252   = 0.261232 in
    cover width           0.125 + 8.5 + 0.261232 + 8.5 + 0.125 = 17.511232 in
    cover height          0.125 + 11.0 + 0.125 = 11.25 in

Layout order left to right is back | spine | front, which is how KDP reads the spread.
Greyscale only, exactly neutral (r = g = b), fonts embedded.

Nothing that is a production instruction is drawn on the artwork. There are no crop marks, no
trim guides and no barcode placeholder box: the barcode area is simply left empty, and its
position is recorded in KDP_COVER_PRODUCTION_BRIEF.md. A separate proof file with guides can be
made by build_cover_guides.py.

    python build_cover.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from reportlab.pdfgen import canvas as canvaslib
from reportlab.lib.colors import Color
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import Paragraph

from fro_layout import register_fonts

OUT_DIR = os.path.join(os.path.dirname(HERE), "deliverables", "cover")
PDF = os.path.join(OUT_DIR, "The-Family-Records-Organizer_cover_116pp_BW.pdf")

IN = 72.0
TRIM_W, TRIM_H = 8.5, 11.0
BLEED = 0.125
PAGES = 116
SPINE_PER_PAGE = 0.002252
SPINE = PAGES * SPINE_PER_PAGE
COVER_W = BLEED + TRIM_W + SPINE + TRIM_W + BLEED
COVER_H = BLEED + TRIM_H + BLEED

# exactly neutral greyscale
INK = Color(0.09, 0.09, 0.09)
BODY = Color(0.16, 0.16, 0.16)
SOFT = Color(0.35, 0.35, 0.35)
FAINT = Color(0.55, 0.55, 0.55)
RULE = Color(0.62, 0.62, 0.62)
RULE_LT = Color(0.78, 0.78, 0.78)
WASH = Color(0.95, 0.95, 0.95)
WASH2 = Color(0.906, 0.906, 0.906)

SAFE = 0.25                     # our own floor; KDP requires 0.125
BARCODE_W, BARCODE_H = 2.25, 1.45

PARTS = [
    ("One", "Getting started"),
    ("Two", "The first 48 hours"),
    ("Three", "Family & personal records"),
    ("Four", "Final wishes & preferences"),
    ("Five", "Digital assets"),
    ("Six", "Document locator"),
    ("Seven", "Maintenance"),
    ("Eight", "Notes & letters"),
]


LEDGER = []          # (label, x0, y0, x1, y1) in points, for the collision check


def track(name, x, y, w, size, leading=1.0):
    LEDGER.append((name, x, y - size * 0.13, x + w, y + size * 0.71 * leading))


def text(c, x, y, s, font, size, color=INK, space=0, align="L"):
    w = pdfmetrics.stringWidth(s, font, size) + space * max(0, len(s) - 1)
    if align == "R":
        x0 = x - w
    elif align == "C":
        x0 = x - w / 2.0
    else:
        x0 = x
    LEDGER.append((s.strip(), x0, y - size * 0.22, x0 + w, y + size * 0.78))
    c.setFillColor(color)
    c.setFont(font, size)
    if align == "R":
        c.drawRightString(x, y, s, charSpace=space)
    elif align == "C":
        c.drawCentredString(x, y, s, charSpace=space)
    else:
        c.drawString(x, y, s, charSpace=space)


def label(c, x, y, s, color=FAINT, size=7.6, track=0.42, font="WorkSans-B", align="L"):
    text(c, x, y, s.upper(), font, size, color, track, align)


def rule(c, x1, y, x2, color=RULE, w=0.7):
    c.setStrokeColor(color)
    c.setLineWidth(w)
    c.line(x1, y, x2, y)


def para(c, s, x, y, width, size=10.4, leading=15.4, color=BODY, font="Lora"):
    st = ParagraphStyle("c", fontName=font, fontSize=size, leading=leading, textColor=color,
                        alignment=TA_LEFT, spaceAfter=0)
    p = Paragraph(s, st)
    w, h = p.wrap(width, 10000)
    LEDGER.append(("para: " + s[:40], x, y - h, x + w, y))
    p.drawOn(c, x, y - h)
    return y - h


def build():
    os.makedirs(OUT_DIR, exist_ok=True)
    register_fonts()
    c = canvaslib.Canvas(PDF, pagesize=(COVER_W * IN, COVER_H * IN),
                         initialFontName="Lora", initialFontSize=10, cropMarks=0)
    c.setTitle("The Family Records Organizer — cover")
    c.setSubject("KDP paperback cover, 116 pp, black and white, white paper")
    c.setAuthor("The Family Records Organizer")
    c.setCreator("build_cover.py")

    # anchors, in points, measured from the bottom-left of the bleed page
    trim_l, trim_b = BLEED * IN, BLEED * IN
    trim_t = trim_b + TRIM_H * IN
    back_l = trim_l
    back_r = back_l + TRIM_W * IN
    spine_l = back_r
    spine_r = spine_l + SPINE * IN
    front_l = spine_r
    front_r = front_l + TRIM_W * IN

    TRIM_L_PT, TRIM_B_PT = trim_l, trim_b
    TRIM_R_PT, TRIM_T_PT = front_r, trim_t

    def fy(inch):        # y measured down from the top trim edge, for the front and back covers
        return trim_t - inch * IN

    # =========================================================== FRONT
    fx = front_l + 0.85 * IN
    fw = TRIM_W * IN - 1.70 * IN

    label(c, fx, fy(1.55), "A records organizer", FAINT, 7.8, 1.9)
    rule(c, fx, fy(1.80), fx + 1.30 * IN, INK, 1.5)

    ty = fy(2.62)
    for line in ("The Family", "Records", "Organizer"):
        text(c, fx, ty, line, "Lora", 46, INK)
        ty -= 0.80 * IN

    rule(c, fx, fy(5.12), fx + 3.45 * IN, RULE, 0.9)
    para(c, "Everything your family will need to know, and where to find it.",
         fx, fy(5.34), 4.55 * IN, size=13.0, leading=19.8, color=SOFT)

    # what is inside
    label(c, fx, fy(6.30), "What is inside", FAINT, 7.6, 1.5)
    rule(c, fx, fy(6.44), front_r - 0.85 * IN, RULE_LT, 0.7)
    ry = fy(6.78)
    for head, sub in (
        ("Where everything is", "documents, accounts, policies, digital records"),
        ("What to do first", "the first 48 hours, in order, and what can wait"),
        ("What you would prefer", "wishes, letters, and the people to tell"),
        ("How to keep it true", "one annual review and a change log"),
    ):
        text(c, fx, ry, head, "Lora", 11.2, INK)
        text(c, fx + 2.10 * IN, ry, sub, "Lora", 9.5, SOFT)
        ry -= 0.31 * IN

    # the eight parts, two columns
    rule(c, fx, fy(8.30), front_r - 0.85 * IN, RULE_LT, 0.7)
    label(c, fx, fy(8.58), "The eight parts", FAINT, 7.6, 1.5)
    col_w = 3.28 * IN
    py = fy(8.94)
    for i, (num, name) in enumerate(PARTS):
        cx = fx + (col_w if i >= 4 else 0)
        cy = py - ((i - 4) * 0.245 * IN if i >= 4 else i * 0.245 * IN)
        label(c, cx, cy, num, RULE, 7.2, 1.3)
        text(c, cx + 0.62 * IN, cy, name, "Lora", 9.6, BODY)

    rule(c, fx, fy(9.92), front_r - 0.85 * IN, RULE_LT, 0.7)
    label(c, fx, fy(10.18), "Fill in once · tell someone · review it every year", FAINT, 7.6, 1.2)

    LEDGER.append(("BOX: front tint", front_l, trim_t - 0.30 * IN, front_r, trim_t))

    # =========================================================== SPINE
    # US convention: reads top to bottom. Kept >= 0.0625 in clear of both folds.
    spine_text = "THE FAMILY RECORDS ORGANIZER"
    sw = pdfmetrics.stringWidth(spine_text, "WorkSans-B", 8.2) + 2.2 * len(spine_text)
    c.saveState()
    c.translate(spine_l + SPINE * IN / 2.0, trim_t - (TRIM_H * IN - sw) / 2.0)
    c.rotate(-90)
    label(c, 0, -2.9, spine_text, INK, 8.2, 2.2, "WorkSans-B")
    c.restoreState()

    # =========================================================== BACK
    bx = back_l + 1.15 * IN
    bw = 5.55 * IN

    label(c, bx, fy(1.40), "Before you need it", FAINT, 7.6, 1.5)
    hy = fy(1.86)
    for line in ("Most families do not", "lose the house.", "They lose everything",
                 "that sits behind a sign-in."):
        text(c, bx, hy, line, "Lora", 21.5, INK)
        hy -= 0.41 * IN

    rule(c, bx, fy(3.66), bx + 1.55 * IN, RULE, 0.9)
    y = para(c,
             "This is a place to write down what you have, where it is kept, who should be told, "
             "and what you would prefer. It is one book, filled in over a few evenings, and it "
             "answers the question a family asks in the worst week of their lives: where do we "
             "start?",
             bx, fy(3.90), bw, size=10.8, leading=16.6, color=BODY)

    y -= 0.34 * IN
    for head in ("No password, PIN or key is ever written down",
                 "Preference is kept separate from instruction",
                 "Ruled space, not boxes too small to use",
                 "One review a year, with a log of what changed"):
        text(c, bx, y, "—", "Lora", 10.4, RULE)
        text(c, bx + 0.26 * IN, y, head, "Lora", 10.4, BODY)
        y -= 0.27 * IN

    # what this book is not
    y -= 0.30 * IN
    box_txt = ("<b>What this book is not.</b> It is not a will, a power of attorney, a healthcare "
               "directive or an estate plan, and filling it in does not create one. It records "
               "where those documents are and who prepared them — which is the part families "
               "actually struggle with.")
    inner_w = bw - 0.62 * IN
    st = ParagraphStyle("b", fontName="Lora", fontSize=9.8, leading=14.8, textColor=BODY,
                        alignment=TA_LEFT)
    bh = Paragraph(box_txt, st).wrap(inner_w, 10000)[1]
    box_h = bh + 0.52 * IN
    box_top = y
    LEDGER.append(("BOX: what this book is not", bx, box_top - box_h, bx + bw, box_top))
    c.setFillColor(WASH)
    c.rect(bx, box_top - box_h, bw, box_h, stroke=0, fill=1)
    c.setFillColor(RULE)
    c.rect(bx, box_top - box_h, 0.035 * IN, box_h, stroke=0, fill=1)
    para(c, box_txt, bx + 0.30 * IN, box_top - 0.26 * IN, inner_w, size=9.8, leading=14.8)
    box_bottom = box_top - box_h

    # who it is for, placed clear of the box that was just measured
    wy = box_bottom - 0.42 * IN
    label(c, bx, wy, "Who it is for", FAINT, 7.6, 1.5)
    rule(c, bx, wy - 0.15 * IN, bx + 4.85 * IN, RULE_LT, 0.7)
    para(c,
         "Anyone who owns a home, a vehicle, an account or a phone — and would rather their "
         "family not have to guess. You do not need to be retired, unwell or wealthy to use it, "
         "and you do not have to fill it in at one sitting.",
         bx, wy - 0.32 * IN, 4.85 * IN, size=9.8, leading=14.8, color=SOFT)

    label(c, bx, fy(10.42), "8.5 × 11 in · 116 pages · print edition", FAINT, 7.2, 1.1)

    # barcode clear area: left empty on purpose, nothing drawn
    # (back cover bottom-right; see KDP_COVER_PRODUCTION_BRIEF.md)

    c.showPage()
    c.save()
    import json
    with open(os.path.join(OUT_DIR, "cover_geometry.json"), "w") as fh:
        json.dump({"items": LEDGER,
                   "trim": [TRIM_L_PT, TRIM_B_PT, TRIM_R_PT, TRIM_T_PT]}, fh, indent=1)
    return PDF


if __name__ == "__main__":
    p = build()
    print("cover written:", p)
    print("pages %d  spine %.6f in  cover %.6f x %.6f in" % (PAGES, SPINE, COVER_W, COVER_H))
