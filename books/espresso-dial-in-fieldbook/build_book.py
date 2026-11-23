#!/usr/bin/env python3
"""Build the print interior and editable manuscript for the Espresso Dial-In Fieldbook.

Free stack: ReportLab for vector-first PDF output; PyMuPDF/pypdf for QA; python-docx
is used by the separate editable-source exporter. All artwork is original vector geometry.
"""
from __future__ import annotations
import html
import math
import os
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor, Color, white, black
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "espresso-dial-in-fieldbook-interior.pdf"
W, H = letter
PT = 72
PAGE_COUNT = 116
TITLE = "Espresso Dial-In Fieldbook for Home Baristas"
SUBTITLE = "Compare 4 Shots per Bean, Track Grind, Dose, Yield, Time & Taste, and Save Your Repeatable Recipes"
AUTHOR = "Parth Gosara"

# Restrained one-ink palette: all grays are tints of black and remain legible in B&W.
INK = HexColor("#202020")
CHARCOAL = HexColor("#3D3D3D")
MID = HexColor("#696969")
LINE = HexColor("#A8A8A8")
PALE = HexColor("#F1F1F1")
PALE2 = HexColor("#E4E4E4")
WHITE = white

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
pdfmetrics.registerFont(TTFont("FieldSans", str(FONT_DIR / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("FieldSans-Bold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))
pdfmetrics.registerFont(TTFont("FieldSerif", str(FONT_DIR / "DejaVuSerif.ttf")))
pdfmetrics.registerFont(TTFont("FieldSerif-Bold", str(FONT_DIR / "DejaVuSerif-Bold.ttf")))

styles = {
    "body": ParagraphStyle("body", fontName="FieldSans", fontSize=9.4, leading=13.2, textColor=INK, spaceAfter=0),
    "small": ParagraphStyle("small", fontName="FieldSans", fontSize=8.2, leading=11.2, textColor=CHARCOAL, spaceAfter=0),
    "tiny": ParagraphStyle("tiny", fontName="FieldSans", fontSize=7.5, leading=9.5, textColor=MID, spaceAfter=0),
    "lead": ParagraphStyle("lead", fontName="FieldSerif", fontSize=12.0, leading=17.0, textColor=INK, spaceAfter=0),
    "callout": ParagraphStyle("callout", fontName="FieldSans", fontSize=8.7, leading=12.0, textColor=INK, spaceAfter=0),
    "center": ParagraphStyle("center", fontName="FieldSans", fontSize=9.0, leading=13.0, alignment=TA_CENTER, textColor=INK),
}

c = canvas.Canvas(str(OUT), pagesize=letter, pageCompression=1)
c.setTitle(TITLE)
c.setAuthor(AUTHOR)
c.setSubject("A practical four-shot comparison workbook for home espresso dialing-in")
c.setCreator("ReportLab / original vector-first interior")
c.setKeywords("espresso, home barista, dial-in, shot log, coffee workbook")

page_no = 0
page_text_manifest: list[tuple[int, str, str]] = []

def esc(s: str) -> str:
    return html.escape(str(s), quote=False)

def start_page(section: str = "FIELD GUIDE", page_title: str | None = None, strap: str | None = None, show_folio: bool = True):
    """Open a page with mirrored, generous KDP-safe margins and a quiet running header."""
    global page_no
    page_no += 1
    # 8.5 x 11 in, no bleed. 0.72-in gutter and 0.50-in outside margin exceed
    # KDP's 0.375-in inside / 0.25-in outside minima for a 24-150-page book.
    inside = 0.72 * PT
    outside = 0.50 * PT
    left = inside if page_no % 2 else outside
    right = outside if page_no % 2 else inside
    x0, x1 = left, W - right
    width = x1 - x0
    if page_no not in (1, 2):
        c.setFillColor(MID)
        c.setFont("FieldSans-Bold", 7.2)
        c.drawString(x0, H - 28, "ESPRESSO  /  FIELDWORK")
        c.setFont("FieldSans", 7.2)
        c.drawRightString(x1, H - 28, section.upper())
        c.setStrokeColor(LINE)
        c.setLineWidth(0.65)
        c.line(x0, H - 36, x1, H - 36)
        if show_folio:
            c.setFillColor(MID)
            c.setFont("FieldSans", 7.5)
            c.drawString(x0, 24, f"{page_no:03d}")
            c.drawRightString(x1, 24, "ESPRESSO DIAL-IN FIELDBOOK")
    if page_title:
        y = H - (64 if page_no > 2 else 0)
        c.setFillColor(INK)
        c.setFont("FieldSerif-Bold", 22)
        c.drawString(x0, y, page_title)
        if strap:
            c.setFillColor(MID)
            c.setFont("FieldSans", 8.5)
            c.drawString(x0, y - 17, strap)
    page_text_manifest.append((page_no, section, page_title or ""))
    return x0, x1, width

def end_page():
    c.showPage()

def para(text: str, x: float, top: float, width: float, style: str = "body", max_h: float | None = None) -> float:
    """Draw wrapped paragraph from top coordinate; return new top below it."""
    p = Paragraph(text, styles[style])
    _, h = p.wrap(width, max_h or 2000)
    if max_h is not None and h > max_h + 0.2:
        raise ValueError(f"Paragraph overflow: {h:.1f} > {max_h:.1f}: {text[:60]}")
    p.drawOn(c, x, top - h)
    return top - h

def label(text: str, x: float, y: float, size: float = 7.1, color=MID, bold=True):
    c.setFillColor(color)
    c.setFont("FieldSans-Bold" if bold else "FieldSans", size)
    c.drawString(x, y, text.upper())

def rule(x1: float, y: float, x2: float, color=LINE, width: float = 0.75):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y, x2, y)

def box(x: float, y: float, w: float, h: float, fill=None, stroke=LINE, radius=7, line=0.8):
    c.setLineWidth(line)
    c.setStrokeColor(stroke)
    if fill:
        c.setFillColor(fill)
        c.roundRect(x, y, w, h, radius, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, radius, fill=0, stroke=1)

def callout(x: float, top: float, w: float, text: str, title: str | None = None, h: float = 58, fill=PALE):
    y = top - h
    box(x, y, w, h, fill=fill, stroke=PALE2, radius=7, line=0.7)
    if title:
        label(title, x + 12, top - 17, 7.3, CHARCOAL)
        para(esc(text), x + 12, top - 25, w - 24, "callout", h - 30)
    else:
        para(esc(text), x + 12, top - 12, w - 24, "callout", h - 20)
    return y - 12

def field(x: float, top: float, w: float, name: str, h: float = 37, hint: str | None = None, size: float = 7.0):
    label(name, x, top - 9, size, MID)
    if hint:
        c.setFillColor(MID)
        c.setFont("FieldSans", 7.0)
        c.drawRightString(x + w, top - 9, hint)
    rule(x, top - h + 5, x + w, LINE, 0.75)
    return top - h

def field_lines(x: float, top: float, w: float, name: str, lines: int = 2, line_gap: float = 22, top_label: bool = True):
    if top_label:
        label(name, x, top - 8, 7.0, MID)
        y = top - 24
    else:
        y = top
    for i in range(lines):
        rule(x, y - i * line_gap, x + w, LINE, 0.75)
    return y - (lines - 1) * line_gap - 12

def checkbox(x: float, y: float, text: str, size: float = 7.5):
    c.setStrokeColor(MID)
    c.setLineWidth(0.8)
    c.rect(x, y - 1, 8, 8, stroke=1, fill=0)
    c.setFillColor(INK)
    c.setFont("FieldSans", size)
    c.drawString(x + 13, y, text)

def scale(x: float, y: float, caption: str, n: int = 5, selected: int | None = None, diameter: float = 9, step: float = 17):
    c.setFillColor(MID)
    c.setFont("FieldSans-Bold", 7.0)
    c.drawString(x, y + 2, caption.upper())
    start = x + 74
    for i in range(n):
        xx = start + i * step
        c.setStrokeColor(MID)
        c.setLineWidth(0.8)
        c.circle(xx, y + 4, diameter / 2, stroke=1, fill=0)
        if selected == i + 1:
            c.setFillColor(INK)
            c.circle(xx, y + 4, diameter / 2 - 2, stroke=0, fill=1)
    c.setFont("FieldSans", 7.0)
    c.setFillColor(MID)
    c.drawString(start + n * step + 2, y + 2, "LOW  →  HIGH")

def section_tag(text: str, x: float, y: float):
    c.setFillColor(CHARCOAL)
    c.roundRect(x, y - 3, 4, 14, 2, fill=1, stroke=0)
    c.setFillColor(MID)
    c.setFont("FieldSans-Bold", 7.1)
    c.drawString(x + 10, y, text.upper())

def bullet_lines(items: list[str], x: float, top: float, w: float, leading: float = 25, font=8.7):
    y = top
    for item in items:
        c.setFillColor(INK)
        c.circle(x + 3, y - 4, 2, fill=1, stroke=0)
        y = para(esc(item), x + 13, y, w - 13, "body") - (leading - 15)
    return y

def draw_four_dots(x: float, y: float, r: float = 8, gap: float = 24, active: int | None = None):
    for i in range(4):
        c.setStrokeColor(INK if i == active else LINE)
        c.setLineWidth(1.1)
        c.circle(x + i * gap, y, r, fill=0, stroke=1)
        c.setFillColor(INK if i == active else MID)
        c.setFont("FieldSans-Bold", 7)
        c.drawCentredString(x + i * gap, y - 2.5, str(i + 1))

def grid_table(x: float, top: float, widths: list[float], headers: list[str], rows: list[list[str]], row_h: float, font: float = 7.0, header_h: float = 24):
    total = sum(widths)
    c.setFillColor(PALE)
    c.roundRect(x, top - header_h, total, header_h, 4, fill=1, stroke=0)
    cx = x
    for w, htxt in zip(widths, headers):
        c.setFillColor(CHARCOAL)
        c.setFont("FieldSans-Bold", font)
        # Wrap narrow headers if needed by drawing short labels as two lines.
        words = htxt.split("|")
        for j, word in enumerate(words):
            c.drawString(cx + 6, top - 10 - j * 8, word.upper())
        cx += w
    y_top = top - header_h
    for row in rows:
        y_bottom = y_top - row_h
        rule(x, y_bottom, x + total, LINE, 0.55)
        cx = x
        for w, cell in zip(widths, row):
            if cell:
                c.setFillColor(INK)
                c.setFont("FieldSans", font)
                c.drawString(cx + 6, y_top - row_h + 7, str(cell)[:28])
            cx += w
        y_top = y_bottom
    cx = x
    c.setStrokeColor(LINE)
    c.setLineWidth(0.55)
    for w in widths[:-1]:
        cx += w
        c.line(cx, y_top, cx, top)
    return y_top

def page_cover():
    x0, x1, width = start_page("TITLE", show_folio=False)
    # Original vector mark: four tasting/shot columns over a calm baseline.
    c.setFillColor(PALE)
    c.roundRect(x0, 118, width, 552, 18, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("FieldSans-Bold", 8.2)
    c.drawString(x0 + 30, 630, "A PRACTICAL HOME BARISTA WORKBOOK")
    c.setStrokeColor(INK)
    c.setLineWidth(1.4)
    c.line(x0 + 30, 615, x0 + 100, 615)
    c.setFillColor(INK)
    c.setFont("FieldSerif-Bold", 33)
    c.drawString(x0 + 30, 547, "Espresso")
    c.drawString(x0 + 30, 505, "Dial-In")
    c.drawString(x0 + 30, 463, "Fieldbook")
    c.setFillColor(CHARCOAL)
    c.setFont("FieldSans", 12.1)
    c.drawString(x0 + 30, 425, "for Home Baristas")
    para(esc(SUBTITLE), x0 + 30, 394, width - 60, "body")
    # Four original shot marks, varied heights but consistent baseline.
    base_y = 234
    bx = x0 + 58
    heights = [58, 94, 76, 111]
    for i, hh in enumerate(heights):
        xx = bx + i * 96
        c.setFillColor(INK if i == 3 else CHARCOAL)
        c.roundRect(xx, base_y, 42, hh, 8, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("FieldSans-Bold", 8)
        c.drawCentredString(xx + 21, base_y + hh / 2 - 3, f"0{i+1}")
        c.setFillColor(MID)
        c.setFont("FieldSans", 7)
        c.drawCentredString(xx + 21, base_y - 18, ["BASE", "TEST A", "TEST B", "CONFIRM"][i])
    c.setStrokeColor(INK)
    c.setLineWidth(1.0)
    c.line(bx - 10, base_y - 5, bx + 330, base_y - 5)
    c.setFillColor(INK)
    c.setFont("FieldSans-Bold", 9)
    c.drawString(x0 + 30, 159, "MEASURE  ·  TASTE  ·  LEARN  ·  REPEAT")
    c.setFillColor(MID)
    c.setFont("FieldSans", 8.5)
    c.drawString(x0 + 30, 138, AUTHOR)
    c.setFont("FieldSans", 7.2)
    c.drawRightString(x1 - 2, 92, "FIRST EDITION  /  2026")
    end_page()

def page_copyright():
    x0, x1, width = start_page("ABOUT THIS BOOK", show_folio=False)
    c.setFillColor(INK)
    c.setFont("FieldSerif-Bold", 20)
    c.drawString(x0, H - 105, "A note before you begin")
    y = H - 143
    y = para("Copyright © 2026 Parth Gosara. All rights reserved.", x0, y, width, "body") - 20
    y = para("No part of this book may be reproduced or distributed in any form without permission, except brief quotations used in reviews or as permitted by law. This book is an independently produced educational workbook.", x0, y, width, "body") - 20
    y = callout(x0, y, width, "This fieldbook is not affiliated with, endorsed by, or sponsored by any espresso machine, grinder, roaster, or coffee organization. The author and publisher make no claim that a recipe or taste cue will work for every coffee or setup.", "INDEPENDENCE & SCOPE", 91)
    y -= 12
    y = para("Espresso equipment and workflows differ. Use your machine manufacturer's manual, stay within basket and machine guidance, and follow safe handling practices around hot water, steam, and pressurized equipment. If a setting is not adjustable on your machine, leave it fixed and record that fact.", x0, y, width, "body") - 20
    y = para("Taste descriptions in this book are observation prompts, not laboratory measurements or diagnoses. A bright, sharp, bitter, dry, thin, or balanced impression can have more than one cause. Change one chosen variable at a time, record the result, and let your own cup decide what to keep.", x0, y, width, "body") - 24
    label("FIRST EDITION  ·  2026", x0, y, 7.4, MID)
    c.setFillColor(MID)
    c.setFont("FieldSans", 7.4)
    c.drawRightString(x1, 31, "Printed on demand")
    end_page()

def instructional_page(title: str, section: str, strap: str, blocks: list[tuple[str, str]], callouts: list[tuple[str,str]] | None = None, diagram: str | None = None):
    x0, x1, width = start_page(section, title, strap)
    y = H - 100
    if diagram == "workflow":
        labels = ["BUY BEANS", "SET BASELINE", "PULL 4 SHOTS", "COMPARE", "SAVE RECIPE"]
        box_w = (width - 4 * 7) / 5
        for i, txt in enumerate(labels):
            xx = x0 + i * (box_w + 7)
            c.setFillColor(INK if i in (0,4) else PALE)
            c.roundRect(xx, y - 48, box_w, 40, 7, fill=1, stroke=0)
            c.setFillColor(WHITE if i in (0,4) else INK)
            c.setFont("FieldSans-Bold", 7.0)
            c.drawCentredString(xx + box_w/2, y - 31, txt)
            if i < 4:
                c.setFillColor(MID)
                c.setFont("FieldSans-Bold", 9)
                c.drawCentredString(xx + box_w + 3.5, y - 27, "›")
        y -= 66
    if diagram == "four_shots":
        draw_four_dots(x0 + 18, y - 18, r=12, gap=(width - 36) / 3)
        names = ["BASELINE", "TEST A", "TEST B", "CONFIRM"]
        for i, name in enumerate(names):
            c.setFillColor(MID)
            c.setFont("FieldSans-Bold", 7.0)
            c.drawCentredString(x0 + 18 + i * (width - 36) / 3, y - 43, name)
        y -= 66
    for head, text in blocks:
        section_tag(head, x0, y - 3)
        y -= 20
        y = para(esc(text), x0, y, width, "body") - 14
    if callouts:
        for head, text in callouts:
            h = 66 if len(text) < 130 else 82
            y = callout(x0, y, width, text, head, h)
    if y < 57:
        raise ValueError(f"Page content overflow on {page_no} ({title}): y={y}")
    end_page()

def page_setup():
    x0,x1,width=start_page("SETUP", "Know your setup", "Record what you can repeat; leave unfamiliar or non-adjustable controls alone.")
    y=H-101
    callout(x0,y,width,"Your grinder's numbers are not universal. A setting of 12 on one grinder may not resemble 12 on another. Record the grinder name and its own scale.","IMPORTANT",55)
    y-=72
    section_tag("Machine & basket",x0,y); y-=20
    field(x0,y,width*0.56-8,"Espresso machine / model",40)
    field(x0+width*0.57,y,width*0.43,"Basket / dose range",40)
    y-=42
    field(x0,y,width*0.56-8,"Grinder / model",40)
    field(x0+width*0.57,y,width*0.43,"Grinder scale / zero point",40)
    y-=42
    field(x0,y,width*0.56-8,"Scale / timer",40)
    field(x0+width*0.57,y,width*0.43,"Water source / notes",40)
    y-=54
    section_tag("Your repeatable puck preparation",x0,y); y-=28
    prep=["Dose weighed before grinding", "Distribution method", "Tamp / leveling habit", "Pre-infusion (if used)", "Timer start convention", "Other routine detail"]
    colw=(width-20)/2
    for i,t in enumerate(prep):
        col=i%2; row=i//2
        checkbox(x0+col*(colw+20), y-row*34, t, 7.5)
    y-=116
    field_lines(x0,y,width,"My usual workflow / what I will keep constant",3,24)
    end_page()

def page_taste_scale():
    x0,x1,width=start_page("TASTE & DECISION", "Taste is the result", "Numbers describe the shot. Your palate decides whether you want to repeat it.")
    y=H-104
    callout(x0,y,width,"A familiar 1:2 example (18 g dry coffee in, 36 g espresso out) is only a starting reference. Basket size, roast, grinder, machine, and preference all matter. Record the recipe you actually used.","STARTING POINT, NOT A RULE",70)
    y-=88
    section_tag("Describe the cup in your own words",x0,y); y-=28
    dimensions=[("ACIDITY / BRIGHTNESS","round / lively / sharp"),("SWEETNESS","low / present / pronounced"),("BITTERNESS","soft / balanced / lingering"),("BODY","light / silky / heavy"),("FINISH","short / clean / drying")]
    for i,(h,sub) in enumerate(dimensions):
        yy=y-i*45
        label(h,x0,yy,7.2,CHARCOAL)
        c.setFillColor(MID); c.setFont("FieldSans",7.2); c.drawRightString(x1,yy,sub)
        for k in range(5):
            xx=x0+14+k*22
            c.setStrokeColor(LINE); c.circle(xx,yy-17,5,stroke=1,fill=0)
        rule(x0+145,yy-17,x1,LINE,0.65)
    y-=244
    callout(x0,y,width,"Try to write what you notice before deciding what to change. 'Sharp, lemon-like, light body' is more useful than 'bad.' If the shot is both sour and bitter, uneven flow or preparation may be involved; do not assume one grind adjustment explains everything.","A SMALL TASTING HABIT",78)
    y-=97
    field_lines(x0,y,width,"My words for a balanced shot",2,23)
    end_page()

def page_session_index():
    x0,x1,width=start_page("SESSION INDEX", "Fourteen bean sessions", "One four-shot experiment per bean or deliberate dial-in question.")
    rows=[]
    for i in range(1,15):
        rows.append([f"{i:02d}","","","","□"])
    grid_table(x0,H-107,[width*0.08,width*0.36,width*0.25,width*0.23,width*0.08],["NO.","COFFEE / ROASTER","ROAST / OPENED","FINAL RATIO","SAVED"],rows,35,7.4,27)
    y=H-107-27-14*35-27
    callout(x0,y,width,"Use the same session number on all four pages. When a bean needs more exploration, start another session and name the question you are testing.","KEEP THE THREAD",59)
    end_page()

def page_shot_card(x: float, top: float, w: float, h: float, shot_no: int, role: str):
    y=top-h
    box(x,y,w,h,fill=WHITE,stroke=LINE,radius=8,line=0.85)
    # Card head band
    c.setFillColor(PALE)
    c.roundRect(x+0.5,top-38,w-1,37,7,fill=1,stroke=0)
    c.setFillColor(INK)
    c.setFont("FieldSerif-Bold",13)
    c.drawString(x+13,top-24,f"SHOT {shot_no}")
    c.setFillColor(CHARCOAL)
    c.setFont("FieldSans-Bold",7.2)
    c.drawString(x+82,top-22,role.upper())
    c.setFillColor(MID); c.setFont("FieldSans",7.0)
    c.drawRightString(x+w-14,top-22,"Compare with shot ____")
    ix=x+14; iw=w-28
    rowtop=top-44
    # Compact, legible metric row; ample writing area remains for the sensory note.
    labels=[("GRIND SETTING",0.22),("DOSE · g",0.17),("YIELD · g",0.17),("TIME · s",0.17),("TEMP · °C / °F*",0.27)]
    cx=ix
    for nm,frac in labels:
        cw=iw*frac
        field(cx,rowtop,cw-7,nm,h=33,size=7.0)
        cx+=cw
    # Sensory selections, not diagnostic claims
    rowtop-=40
    label("TASTE / TEXTURE — TICK WHAT YOU NOTICE",ix,rowtop-3,7.0,MID)
    options=[("sharp / sour",0), ("sweet",1), ("bitter / dry",2), ("balanced",3), ("thin / hollow",4)]
    colw=iw/3
    for j,(txt,_) in enumerate(options):
        r=j//3; col=j%3
        checkbox(ix+col*colw,rowtop-22-r*18,txt,7.0)
    rowtop-=58
    scale(ix,rowtop,"BODY",5,diameter=8,step=16)
    scale(ix+iw*0.53,rowtop,"BALANCE",5,diameter=8,step=16)
    rowtop-=17
    field_lines(ix,rowtop,iw,"Taste notes / what changed in the cup",2,18)
    next_top=top-226
    field(ix,next_top,iw,"ONE next adjustment (or 'repeat unchanged')",27, size=7.0)
    c.setFillColor(MID); c.setFont("FieldSans",7.0)
    c.drawRightString(x+w-14,y+7,"*Optional; note if fixed or unavailable on your machine.")

def page_shots(session: int, pair: tuple[int,int], title_suffix: str):
    x0,x1,width=start_page(f"SESSION {session:02d} · SHOTS", f"Session {session:02d}  /  {title_suffix}", "Write the actual result—even when it misses the target.")
    top=H-97
    card_h=274
    page_shot_card(x0,top,width,card_h,pair[0],"Baseline" if pair[0]==1 else ("Test A" if pair[0]==2 else "Test B"))
    top2=top-card_h-16
    role="Test A" if pair[1]==2 else ("Test B" if pair[1]==3 else "Confirmation")
    page_shot_card(x0,top2,width,card_h,pair[1],role)
    c.setFillColor(MID); c.setFont("FieldSans",7.0)
    c.drawString(x0,39,"After each shot: record first → taste → name one next move.")
    end_page()

def page_session_profile(session: int):
    x0,x1,width=start_page(f"SESSION {session:02d} · PROFILE", f"Session {session:02d}  /  Bean & baseline", "Name the question you want four shots to answer.")
    y=H-103
    field(x0,y,width*0.60-10,"Coffee / bean name",44)
    field(x0+width*0.61,y,width*0.39,"Roaster",44)
    y-=49
    field(x0,y,width*0.33-8,"Origin / region",43)
    field(x0+width*0.34,y,width*0.31-8,"Process",43)
    field(x0+width*0.66,y,width*0.34,"Roast level",43)
    y-=47
    field(x0,y,width*0.36-8,"Roast date",42)
    field(x0+width*0.38,y,width*0.29-8,"Opened date",42)
    field(x0+width*0.69,y,width*0.31,"Basket / dose range",42)
    y-=53
    section_tag("Conditions to keep steady",x0,y); y-=26
    field(x0,y,width*0.48-8,"Machine / grinder",42)
    field(x0+width*0.50,y,width*0.50,"Grinder setting baseline",42)
    y-=47
    field(x0,y,width*0.32-8,"Basket / dose",42)
    field(x0+width*0.34,y,width*0.32-8,"Water temp / unit (if known)",42)
    field(x0+width*0.68,y,width*0.32,"Timer convention",42)
    y-=50
    section_tag("Starting recipe & test question",x0,y); y-=26
    field(x0,y,width*0.22-7,"Dose · g",41)
    field(x0+width*0.23,y,width*0.22-7,"Target yield · g",41)
    field(x0+width*0.46,y,width*0.18-7,"Ratio",41)
    field(x0+width*0.65,y,width*0.18-7,"Target time · s",41)
    field(x0+width*0.84,y,width*0.16,"Prep method",41)
    y-=49
    field_lines(x0,y,width,"Bean notes / why I chose it",2,22)
    y-=60
    field_lines(x0,y,width,"Question for this session (e.g., 'Does a slightly finer grind improve sweetness?')",2,22)
    y-=60
    callout(x0,y,width,"Shot 1 is your baseline. Keep the basket, dose, puck prep, timer convention, and target yield steady unless one of those is the specific variable you choose to test.","SET THE BASELINE",54)
    end_page()

def page_session_compare(session: int):
    x0,x1,width=start_page(f"SESSION {session:02d} · REVIEW", f"Session {session:02d}  /  Compare & decide", "The best shot is the one you prefer and can reproduce—not a number on its own.")
    y=H-101
    rows=[]
    for i in range(1,5): rows.append([f"{i:02d}","","",""])
    y=grid_table(x0,y,[width*0.08,width*0.30,width*0.27,width*0.35],["SHOT","CHANGE VS. BASE","TASTE / TEXTURE","KEEP / CHANGE?"],rows,40,7.0,28)
    y-=24
    # compact comparison prompts
    col=(width-16)/2
    field_lines(x0,y,col,"What improved?",2,22)
    field_lines(x0+col+16,y,col,"What worsened or stayed unclear?",2,22)
    y-=64
    field_lines(x0,y,width,"What variable did I change—and did it help?",2,22)
    y-=62
    section_tag("My decision",x0,y); y-=29
    for i in range(1,5):
        xx=x0+8+(i-1)*65
        checkbox(xx,y,f"Shot {i}",7)
    field(x0+285,y+10,width-285,"Favorite because…",36,size=7.0)
    y-=48
    section_tag("Recipe to save or test next",x0,y); y-=26
    field(x0,y,width*0.25-8,"Coffee / shot #",35)
    field(x0+width*0.26,y,width*0.18-8,"Grind",35)
    field(x0+width*0.45,y,width*0.18-8,"Dose · g",35)
    field(x0+width*0.64,y,width*0.18-8,"Yield · g",35)
    field(x0+width*0.83,y,width*0.17,"Time · s",35)
    y-=44
    field_lines(x0,y,width,"Why this recipe is worth repeating / what I will check next time",2,21)
    end_page()

def page_recipe(index: int):
    x0,x1,width=start_page("RECIPE LIBRARY", f"Saved recipe  /  {index:02d}", "Record the recipe you want to find again. Give it a name you will recognize.")
    y=H-103
    field(x0,y,width*0.62-10,"Recipe name / coffee",44)
    field(x0+width*0.64,y,width*0.36,"Saved on",44)
    y-=51
    field(x0,y,width*0.50-8,"Roaster / origin / process",43)
    field(x0+width*0.52,y,width*0.48,"Roast date / opened",43)
    y-=50
    section_tag("Equipment & recipe",x0,y); y-=27
    field(x0,y,width*0.54-8,"Machine / grinder",42)
    field(x0+width*0.56,y,width*0.44,"Basket / grinder scale",42)
    y-=47
    field(x0,y,width*0.18-6,"Dose · g",40)
    field(x0+width*0.19,y,width*0.18-6,"Yield · g",40)
    field(x0+width*0.38,y,width*0.18-6,"Ratio",40)
    field(x0+width*0.57,y,width*0.18-6,"Time · s",40)
    field(x0+width*0.76,y,width*0.24,"Temp / other",40)
    y-=48
    field(x0,y,width*0.49-8,"Puck prep / pre-infusion",41)
    field(x0+width*0.51,y,width*0.49,"Timer convention / machine mode",41)
    y-=52
    section_tag("Taste & repeatability",x0,y); y-=27
    for i,t in enumerate(["sweet", "bright", "bitter", "balanced", "thin", "silky", "dry", "other"]):
        row=i//4; col=i%4
        checkbox(x0+col*(width/4),y-row*22,t,7.3)
    y-=56
    field_lines(x0,y,width,"Taste result / what makes this recipe a keeper",3,23)
    y-=83
    field_lines(x0,y,width,"Re-dial-in notes (what changes with a new bag or roast date?)",3,23)
    y-=84
    callout(x0,y,width,"If the next bag behaves differently, keep this as a reference—not a promise. Start a new session, record the new baseline, and compare deliberately.","REPEAT, THEN RE-DIAL",56)
    end_page()

def page_note(index: int, title: str, prompt: str, kind: str="lines"):
    x0,x1,width=start_page("WORKING NOTES", title, prompt)
    y=H-104
    field(x0,y,width*0.28-8,"Date",36)
    field(x0+width*0.30,y,width*0.30-8,"Coffee / setup",36)
    field(x0+width*0.62,y,width*0.38,"Session / recipe no.",36)
    y-=49
    if kind=="matrix":
        rows=[["","","","","" ] for _ in range(8)]
        y=grid_table(x0,y,[width*0.18,width*0.20,width*0.20,width*0.20,width*0.22],["WHAT I HELD","WHAT I CHANGED","WHAT I TASTED","WHAT I LEARNED","NEXT TEST"],rows,42,7.0,30)
    elif kind=="map":
        rows=[["","","","" ] for _ in range(6)]
        y=grid_table(x0,y,[width*0.23,width*0.23,width*0.26,width*0.28],["GRINDER","ESPRESSO RANGE","MY SETTING","NOTES / REFERENCE"],rows,48,7.0,30)
    elif kind=="grid":
        c.setStrokeColor(PALE2); c.setLineWidth(0.45)
        left=x0; right=x1; bottom=82
        for yy in range(int(y-4),int(bottom),22): c.line(left,yy,right,yy)
        for xx in range(int(left),int(right),24): c.line(xx,bottom,xx,y-4)
        y=bottom
    else:
        # Handwriting rules with deliberate space and a narrow prompt rail.
        for i in range(18):
            yy=y-i*29
            if yy<90: break
            c.setFillColor(MID); c.setFont("FieldSans",7.0)
            if i % 4 == 0: c.drawString(x0,yy+7,["OBSERVE", "COMPARE", "DECIDE", "REPEAT"][((i//4)%4)])
            rule(x0+66,yy,x1,LINE,0.65)
    end_page()

def page_back_reference(index: int, title: str, strap: str, mode: str="table"):
    x0,x1,width=start_page("REFERENCE", title, strap)
    y=H-104
    if mode=="table":
        rows=[["","","","" ] for _ in range(10)]
        grid_table(x0,y,[width*0.22,width*0.25,width*0.25,width*0.28],["DATE / NO.","BEAN / SETUP","OBSERVATION","NEXT STEP"],rows,43,7.0,30)
    elif mode=="grid":
        c.setStrokeColor(PALE2); c.setLineWidth(0.5)
        for yy in range(int(y-3),86,24): c.line(x0,yy,x1,yy)
        for xx in range(int(x0),int(x1),28): c.line(xx,86,xx,y-3)
        callout(x0,103,width,"Use this page for a question you want the next session to answer.","FIELD NOTE",48)
    elif mode=="index":
        rows=[]
        for i in range(1,15): rows.append([f"{i:02d}","","","□"])
        grid_table(x0,y,[width*0.08,width*0.40,width*0.44,width*0.08],["NO.","COFFEE / RECIPE","PAGE / RATIO","SAVED"],rows,38,7.1,28)
        y=y-28-14*38-18
        callout(x0,y,width,"Write a short cue you will recognize when looking for this coffee later.","INDEX TIP",48)
    elif mode=="map":
        rows=[["","","","" ] for _ in range(8)]
        grid_table(x0,y,[width*0.23,width*0.22,width*0.22,width*0.33],["GRINDER / SCALE","COFFEE / BASKET","MY SETTING","PLAIN-LANGUAGE NOTE"],rows,46,7.0,30)
        callout(x0,239,width,"Record each grinder on its own scale. A setting is meaningful only with the grinder, coffee, and context that produced it.","KEEP SETTINGS LOCAL",55)
    elif mode=="checklist":
        items=["Confirm the basket fits the planned dose.","Weigh dose and espresso output if a scale is available.","Use the same timer start convention each session.","Record shot time as an observation, not a pass/fail grade.","Taste first; choose one variable for the next comparison.","Save the recipe only if you can identify the coffee and setup."]
        bullet_lines(items,x0+2,y,width-4,33,8.6)
        y-=220
        field_lines(x0,y,width,"My personal routine / machine-specific reminder",4,25)
    elif mode=="reference":
        blocks=[("DOSE", "Dry coffee mass placed in the basket, recorded in grams."),("YIELD", "Liquid espresso collected in the cup, recorded by mass when possible."),("BREW RATIO", "Yield divided by dose. Example: 36 g out ÷ 18 g in = 2.0, often written 1:2."),("GRIND SETTING", "Your grinder's own scale. Numbers are not comparable between different grinders."),("SHOT TIME", "Time measured using your chosen start and stop convention. Keep that convention steady."),("BALANCE", "Your overall impression of how acidity, sweetness, bitterness, body, and finish fit together."),("BASELINE", "The recipe you use as a reference for a controlled comparison."),("ONE-VARIABLE TEST", "A comparison where one chosen factor changes and the other conditions are kept as consistent as practical.")]
        yy=y
        for h,t in blocks:
            label(h,x0,yy,7.1,CHARCOAL)
            yy=para(esc(t),x0+105,yy+2,width-105,"small")-17
    elif mode=="taste":
        rows=[["Bright / sharp","Sweet / round","Dry / lingering","Body / weight"],["Sour","Caramel","Astringent","Thin"],["Citrus","Chocolate","Clean","Silky"],["Herbal","Nutty","Short finish","Heavy"],["Other: ______","Other: ______","Other: ______","Other: ______"]]
        grid_table(x0,y,[width*0.25]*4,["ACIDITY","SWEETNESS","FINISH","BODY"],rows,51,7.0,30)
        y-=30+5*51+18
        callout(x0,y,width,"Use words that fit your cup. This is a personal vocabulary aid, not a mandatory flavor wheel or a universal diagnosis.","YOUR PALATE, YOUR NOTES",61)
    elif mode=="shot":
        for i in range(1,5):
            yy=y-(i-1)*143
            box(x0,yy-122,width,122,fill=WHITE,stroke=LINE,radius=6,line=0.7)
            label(f"SHOT {i}  /  DATE ______",x0+12,yy-17,7.0,CHARCOAL)
            field(x0+12,yy-25,width*0.23-14,"Grind",34)
            field(x0+width*0.24,yy-25,width*0.20-14,"Dose",34)
            field(x0+width*0.45,yy-25,width*0.20-14,"Yield",34)
            field(x0+width*0.66,yy-25,width*0.17-14,"Time",34)
            field(x0+width*0.84,yy-25,width*0.16-14,"Taste",34)
            field_lines(x0+12,yy-73,width-24,"One note / one next change",1,20)
    end_page()

# ---- Build the 116-page interior ----
page_cover()                                  # 1
page_copyright()                              # 2
instructional_page("Welcome to your fieldbook","WELCOME","A small system for making the next shot more informative.",[
    ("THE POINT", "Espresso changes from bag to bag, and a recipe that works once can be difficult to remember. This book gives you a repeatable place to record what you used, what you tasted, and what you want to try next."),
    ("WHAT THIS BOOK IS", "A practical comparison workbook—not a machine manual, a recipe authority, or a promise that one ratio fits every coffee. Use the pages to learn your own setup and preserve the results you like."),
    ("HOW TO GET VALUE", "Write the baseline before pulling. Keep ordinary preparation steady. Make one intentional change at a time. Taste, record, and save the recipes you can reproduce."),
],[("START SIMPLE","You do not need every field. If your machine does not expose a variable, leave it fixed and use the space for a note.")]) # 3
instructional_page("The workflow at a glance","WORKFLOW","Each page in the book has a job in the same practical loop.",[
    ("BUY BEANS", "Note the coffee, roaster, origin, process, roast date, and opened date when known."),
    ("SET A BASELINE", "Choose a dose and target yield that suit your basket and preference. Record the grinder, timer convention, and preparation routine."),
    ("TEST FOUR SHOTS", "Shot 1 is the baseline. Shots 2 and 3 test a single deliberate change. Shot 4 confirms or refines the best direction."),
    ("COMPARE & SAVE", "Compare taste and measurements together. Keep the favorite recipe, not just the fastest or prettiest number."),
],diagram="workflow") #4
instructional_page("A quick start in six moves","QUICK START","You can begin with the next bag you open.",[
    ("01 · PREP", "Find the bean profile and setup page for the next numbered session. Weigh and prepare the coffee as consistently as you can."),
    ("02 · BASELINE", "Choose a starting recipe. A 1:2 example is 18 g in and 36 g out; use your basket and taste as the guide, not this example as a rule."),
    ("03 · SHOT 1", "Pull the reference shot. Record grind, dose, yield, time, and a plain-language taste note."),
    ("04 · TEST", "Change one chosen variable for Shot 2. For Shot 3, return to the baseline and test a different idea if useful. Keep other conditions steady."),
    ("05 · CONFIRM", "Use Shot 4 to repeat or refine the direction you prefer. A repeat helps reveal whether the result was consistent."),
    ("06 · KEEP", "Choose your favorite, write why, and transfer it to a saved recipe page. If the comparison was unclear, record the next question instead."),
]) #5
page_setup()                                   #6
instructional_page("Plan the four-shot experiment","SESSION METHOD","A compact sequence that compares options without pretending taste is a lab result.",[
    ("SHOT 1 · BASELINE", "Your reference recipe for this session. Record everything you can measure and the preparation you will keep steady."),
    ("SHOT 2 · TEST A", "Choose one purposeful change from the baseline—often a small grinder adjustment, or a deliberate yield change. Mark what changed."),
    ("SHOT 3 · TEST B", "Return to the baseline conditions, then test one different question. If you build from Shot 2 instead, write the comparison shot number so the sequence stays clear."),
    ("SHOT 4 · CONFIRM", "Repeat the leading candidate unchanged, or make one small final refinement. Mark which recipe it is confirming."),
],[("FAIRNESS CHECK","Changing dose, grind, yield, temperature, and puck preparation together makes it hard to learn which change mattered. If several things changed, log them honestly and treat the result as exploratory.")],diagram="four_shots") #7
instructional_page("Keep the comparison fair","METHOD","Small repeatable habits make your notes easier to interpret.",[
    ("HOLD STEADY", "Use the same machine, basket, dose target, puck preparation, cup position, and timer convention when they are not the question being tested."),
    ("CHANGE ONE MAIN THING", "Choose a single primary test. For example: keep dose and target yield steady while changing grind; or keep grind and dose steady while stopping at a different yield."),
    ("NOTE THE EXCEPTIONS", "If the grinder retains grounds, the machine temperature drifts, the shot channels, or your preparation changes, note it. A messy experiment can still teach you what to control next time."),
],[("NOT A BLIND TASTE TEST","You already know the settings you changed. Use the book to reduce memory bias, not to claim scientific certainty.")]) #8
instructional_page("Choose a starting recipe","BASELINE","Start with a recipe you can measure and repeat.",[
    ("DOSE", "Use a dose appropriate to your basket and machine instructions. Record dry coffee mass in grams, before brewing."),
    ("YIELD", "Choose a target output by weight when possible. Record the actual collected espresso, not only the intended target."),
    ("TIME", "Pick one timer convention and write it on the profile page. Pump-on to stop is one practical convention; other workflows may use a different start point."),
    ("GRIND", "Write the grinder name and its scale. A dial number only makes sense alongside that grinder."),
],[("ILLUSTRATIVE BASELINE","18 g dose → 36 g yield is a 1:2 brew ratio. It is an example for showing the math, not a required recipe or a universal target.")]) #9
instructional_page("Dose, yield & ratio","MEASURE","A few measurements give your tasting notes useful context.",[
    ("DOSE IN", "The mass of dry ground coffee placed in the basket. Keep the dose consistent while testing another variable unless dose itself is the experiment."),
    ("YIELD OUT", "The mass of espresso in the cup. A scale under the cup helps you stop at a chosen output and note the actual result."),
    ("BREW RATIO", "Divide yield by dose. Example: 36 g out ÷ 18 g in = 2.0, written as 1:2. This simple ratio does not measure taste or extraction by itself."),
    ("ACTUAL, NOT TARGET", "Write the measured output even if it overshoots. The difference between target and actual is part of the session record."),
],[("WRITE UNITS","Use grams for dose and yield. Write seconds for time. A consistent unit makes later comparisons much easier.")]) #10
instructional_page("Grind setting & shot time","OBSERVE","Treat time as a clue about flow—not a score to chase by itself.",[
    ("GRIND", "A finer grind often slows flow and a coarser grind often speeds it up, but grinders and coffees differ. Move in small steps your grinder can repeat."),
    ("TIME", "Record your chosen start-to-stop time consistently. Two shots timed from different points are not directly comparable."),
    ("READ BOTH", "A very fast or slow shot can help you ask a question, but time alone cannot tell you whether you like the cup. Record taste, actual yield, and any uneven flow too."),
],[("KEEP THE SCALE PERSONAL","Some grinders use clicks, numbers, steps, or stepless adjustment. Record the native setting and a useful description—never convert settings between brands as if they were equivalent.")]) #11
instructional_page("Optional controls & setup","OPTIONAL","Record a variable only when your machine exposes it and you can hold it steady.",[
    ("TEMPERATURE", "If the machine has a brew-temperature control, note its displayed setting and unit. If temperature is fixed or unknown, mark it as fixed/unknown and do not guess."),
    ("PRE-INFUSION / PRESSURE", "Note a setting only if your machine offers it and you understand what the control represents. Do not alter pressure or temperature just to fill in a field."),
    ("PREPARATION", "Distribution, tamp level, basket fill, and pre-infusion affect consistency. Use the same routine across compared shots where practical."),
],[("SAFETY","Follow your machine's manual for steam, hot water, pressure, cleaning, and cooling. This workbook is not a substitute for equipment-specific safety instructions.")]) #12
page_taste_scale()                            #13
instructional_page("A useful taste note","TASTING","Describe what you notice before deciding what to change.",[
    ("FIRST IMPRESSION", "Is the cup sharp, sweet, bitter, balanced, thin, heavy, clean, drying, or something else? Use the words that fit your palate."),
    ("BODY", "Body describes the weight or texture you perceive—light, silky, full, or heavy. It is a personal sensory note, not a measurement."),
    ("BALANCE", "Balance is your overall impression of how the cup's brightness, sweetness, bitterness, body, and finish work together."),
    ("REPEAT THE TASTE", "If the espresso is too hot to taste comfortably, wait. Keep your tasting moment and cup conditions reasonably similar across the session."),
]) #14
instructional_page("Choose one next move","ADJUSTMENT","A note is most useful when it points to a specific next test.",[
    ("SHARP / SOUR / THIN", "Could reflect a fast flow, a short yield, coffee character, or uneven preparation. If other conditions were steady, test a slightly finer grind OR a deliberately longer yield—not both at once."),
    ("BITTER / DRY / LINGERING", "Could reflect a long/slow shot, a longer yield, roast character, or uneven flow. If the recipe suggests it, test a slightly coarser grind OR a shorter yield as a separate comparison."),
    ("WEAK / WATERY", "Check dose, yield, and basket fit. A longer output can taste more diluted; a smaller yield can taste more concentrated. Decide which direction you prefer and test one change."),
    ("BOTH SOUR & BITTER / UNEVEN", "The shot may be uneven or the preparation inconsistent. Note visible flow differences if available; first repeat your preparation more consistently before making several recipe changes."),
],[("CAUTION","These are starting questions, not one-to-one diagnoses. A bean can taste bright without being defective, and a preferred recipe may not match a conventional time window.")]) #15
instructional_page("Repeat the parts that matter","CONSISTENCY","The goal is a comparison you can understand, not a perfect laboratory.",[
    ("WEIGH & RECORD", "Use the same scale and unit each time if available. Record the actual dose and yield rather than relying on memory or cup volume."),
    ("PREP THE SAME WAY", "Keep your distribution and tamp routine consistent. If you deliberately change puck preparation, make that the named test."),
    ("KEEP A TIMER RULE", "Choose pump-on, first-drip, or the convention you use; write it once in setup and keep it the same for each shot."),
    ("ACCEPT REAL-WORLD VARIATION", "Grinder retention, warm-up, bean age, and small prep differences happen. Note meaningful changes rather than hiding them."),
]) #16
instructional_page("When a shot surprises you","TROUBLESHOOT","Check the process before changing several settings.",[
    ("1 · VERIFY THE RECORD", "Was dose weighed? Was yield stopped and recorded by mass? Did you use the same timer convention? Is the grinder setting written clearly?"),
    ("2 · CHECK PREPARATION", "Look for a changed basket, uneven distribution/tamp, stale grounds in the grinder, or a machine condition that differed from the previous shot."),
    ("3 · NAME THE CUP", "Write a short observation such as 'sharp and light' or 'sweet, heavy, drying finish.' Avoid a vague label like 'wrong.'"),
    ("4 · TEST ONE IDEA", "Pick one adjustment related to your observation. Pull the next shot and write what changed before tasting."),
],[("IF THE RESULT IS UNCLEAR","Repeat the baseline rather than piling on adjustments. A clear repeated result is more useful than four unrelated attempts.")]) #17
instructional_page("Troubleshooting without guesswork","REFERENCE","Use symptoms to choose a question, not to force a diagnosis.",[
    ("FAST / GUSHING", "Check actual dose and basket fit, grind setting, and puck preparation. If those are steady, a small grind change may be a sensible test."),
    ("SLOW / STALLED", "Check whether the dose suits the basket and whether grounds are clumped or the setting is unusually fine. Change one thing at a time; do not force equipment beyond its manual."),
    ("CHANNELING / UNEVEN FLOW", "A single fast stream can be hard to interpret by taste alone. Repeat preparation consistently and note the pattern; do not treat a visual cue as a full extraction measurement."),
    ("GOOD ONCE, DIFFERENT NEXT TIME", "Compare the recipe, preparation, bean date, machine warm-up, and timer convention. Repeating the saved recipe can show whether it is robust on your setup."),
]) #18
instructional_page("Save a recipe you can find","RECIPE LIBRARY","A saved recipe is a useful reference, not a guarantee for every bag.",[
    ("NAME IT", "Use coffee name, roaster, or a short nickname. Add roast/opened date if you want to distinguish batches."),
    ("COPY THE SETTINGS", "Record grinder and its scale, dose, yield, ratio, time convention, basket, and any machine control you actually used."),
    ("DESCRIBE THE CUP", "Write the taste that made you keep it. A short phrase is enough: 'round, sweet, soft finish' or your own words."),
    ("RE-DIAL IN", "When you open a new bag or the cup changes, make a new session. Begin from the saved recipe, then test what needs to change."),
]) #19
instructional_page("Worked example · illustrative only","EXAMPLE","The numbers below demonstrate how to use the pages. They are not a recommended recipe for your machine.",[
    ("BASELINE · SHOT 1", "Example only: 18 g dose, 36 g yield, grinder mark 4.2, timer 29 s using pump-on. Note: 'pleasant sweetness; finish slightly dry.'"),
    ("TEST A · SHOT 2", "Return to the baseline dose and yield. Change only the grind slightly coarser. Record the actual result and taste; do not assume the change must help."),
    ("TEST B · SHOT 3", "Reset to the baseline. Change only the target yield a little shorter, if that is the question you want to ask. Compare the cup with Shot 1."),
    ("CONFIRM · SHOT 4", "Repeat the candidate you preferred. If the cup is similar, save it with the coffee and setup details. If it differs, note what may not have stayed constant."),
],[("WHY THIS EXAMPLE IS FICTIONAL","This is a made-up teaching sequence, not a customer result, product test, or universal recommendation.")]) #20
instructional_page("A compact glossary","REFERENCE","Use these definitions to make your notes consistent.",[
    ("DOSE", "Dry coffee mass in the basket, usually recorded in grams."),
    ("YIELD", "Espresso mass collected in the cup, usually recorded in grams."),
    ("RATIO", "Yield divided by dose. 36 g out from 18 g in = 2.0, commonly written 1:2."),
    ("GRIND SETTING", "A position on one specific grinder. It is not a universal unit."),
    ("SHOT TIME", "Elapsed time using the convention you recorded. Keep the same convention to compare."),
    ("BASELINE", "The reference recipe you choose for one session."),
    ("DIAL-IN", "A process of adjusting a recipe and preparation to suit a coffee and a person's preferences."),
]) #21
instructional_page("Further reading & source notes","SOURCES","This book's guidance is deliberately practical and non-prescriptive.",[
    ("WORKFLOW REFERENCE", "Perfect Daily Grind, 'A Guide to Dialling In Espresso' (2020; updated online). A readable overview of dose, yield, ratio, sensory cues, and recipe adjustment: perfectdailygrind.com/2020/07/a-guide-to-dialling-in-espresso/"),
    ("TASTE-LED REFERENCE", "Clive Coffee, 'Dialing In Espresso By Taste' (2026). Useful for the principle that taste should be read alongside measurements: clivecoffee.com/blogs/learn/dialing-in-espresso-by-taste"),
    ("YOUR EQUIPMENT", "Read the current manuals for your machine, grinder, basket, and scale. Manufacturer controls and safety limits take priority over a generic workbook."),
    ("HOW TO READ THIS BOOK", "The 1:2 example is arithmetic and a familiar starting reference, not a scientific optimum. Taste language and adjustment prompts are intentionally framed as hypotheses to test on your setup."),
],[("NO AFFILIATION","The sources above are independent reading suggestions. They do not endorse this fieldbook.")]) #22

# Four pages per bean session, fourteen intentionally reusable experiments.
for s in range(1,15):
    page_session_profile(s)
    page_shots(s,(1,2),"Shots 1–2")
    page_shots(s,(3,4),"Shots 3–4")
    page_session_compare(s)
# One full-page repeatable recipe card per saved coffee/recipe.
for i in range(1,15):
    page_recipe(i)
# Twelve purpose-specific notes pages.
notes=[
    ("My grinder map","Record your own grinder scale; settings do not transfer between machines.","map"),
    ("Taste words I use","Build a personal vocabulary for cups you enjoy and cups you would change.","grid"),
    ("Machine & basket notes","Record basket limits, machine controls, and setup details you want at hand.","lines"),
    ("Water & temperature notes","Use only information you can observe or verify; avoid guessing settings.","lines"),
    ("Puck preparation routine","Write the steps that help you keep comparisons consistent.","checklist"),
    ("What I want to test next","Plan one question, one primary change, and what you will keep steady.","matrix"),
    ("A cup worth remembering","Capture a result and recipe outside the numbered bean sessions.","shot"),
    ("My espresso preferences","Describe the balance, body, intensity, and finish you enjoy.","lines"),
    ("Bean-to-bean observations","Compare coffees in your own terms; do not assume a roast label predicts your taste.","matrix"),
    ("Open field notes  /  1","Use for a question, setup sketch, or notes from a session.","grid"),
    ("Open field notes  /  2","Use for a question, setup sketch, or notes from a session.","grid"),
    ("Open field notes  /  3","Use for a question, setup sketch, or notes from a session.","grid"),
]
for i,(title,strap,kind) in enumerate(notes,1): page_note(i,title,strap,kind)
# Twelve back-of-book utilities; all structured for later retrieval, not padding.
back=[
    ("Session finder","Find a bean experiment by its name, date, or final ratio.","index"),
    ("Saved recipe finder","Index the recipe-library pages you actually complete.","index"),
    ("Coffee-specific grind settings","Cross-reference a bean and basket with the grinder mark that worked for it.","map"),
    ("My repeatable baseline","Record the recipe and timer rule you most often use as a starting point.","checklist"),
    ("Issue & retest log","Track an unexpected shot, the single test you chose, and what happened.","table"),
    ("Equipment care notes","Record cleaning or service that could affect later comparisons. Follow your manual.","table"),
    ("Beans to try","Note roaster, coffee, purchase/open date, and why it caught your interest.","table"),
    ("Coffee freshness observations","Track dates and taste changes on your own coffees; no universal rest window is assumed.","table"),
    ("Four-shot reset card","A short reminder of baseline, tests, confirmation, and one-change discipline.","checklist"),
    ("Sensory word bank","A flexible list of words to help make your notes more specific.","taste"),
    ("Personal dial-in reference","Use these boxes for the settings and words that matter on your setup.","shot"),
    ("One more useful note","Close with an open page for an observation worth keeping.","grid"),
]
for i,(title,strap,mode) in enumerate(back,1): page_back_reference(i,title,strap,mode)

if page_no != PAGE_COUNT:
    raise RuntimeError(f"Expected {PAGE_COUNT} pages; built {page_no}")
c.save()
print(f"Built {OUT} ({page_no} pages, {W/PT:.2f} x {H/PT:.2f} in)")
