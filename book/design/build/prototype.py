"""
Prototype: prove platypus can produce a genuine 6x9 print-ready page with
embedded Literata/Inter, running heads, page numbers, a callout box and a
figure, before we commit to the full book.
"""
import os
from reportlab.lib.pagesizes import inch
from reportlab.lib.units import inch as IN
from reportlab.lib.colors import Color, black, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, NextPageTemplate,
                                PageBreak, Flowable)

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "..", "fonts")

pdfmetrics.registerFont(TTFont("Literata", os.path.join(FONTS, "Literata-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Literata-SemiBold", os.path.join(FONTS, "Literata-SemiBold.ttf")))
pdfmetrics.registerFont(TTFont("Literata-Italic", os.path.join(FONTS, "Literata-Italic.ttf")))
pdfmetrics.registerFont(TTFont("Inter", os.path.join(FONTS, "Inter-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Inter-Medium", os.path.join(FONTS, "Inter-Medium.ttf")))
pdfmetrics.registerFont(TTFont("Inter-Bold", os.path.join(FONTS, "Inter-Bold.ttf")))
pdfmetrics.registerFontFamily("Literata", normal="Literata", bold="Literata-SemiBold", italic="Literata-Italic")
pdfmetrics.registerFontFamily("Inter", normal="Inter", bold="Inter-Bold", italic="Inter")

PAGE_W, PAGE_H = 6 * IN, 9 * IN
GUTTER, OUTER = 0.875 * IN, 0.625 * IN
TOP, BOTTOM = 0.75 * IN, 0.8 * IN
TEXT_W = PAGE_W - GUTTER - OUTER

GREY = Color(0.42, 0.42, 0.42)
HAIR = Color(0.75, 0.75, 0.75)

body = ParagraphStyle("body", fontName="Literata", fontSize=10.5, leading=15.2,
                      alignment=TA_JUSTIFY, firstLineIndent=0, spaceAfter=0,
                      textColor=Color(0.08, 0.08, 0.08))
chapnum = ParagraphStyle("chapnum", fontName="Inter-Medium", fontSize=8.5, leading=11,
                         textColor=GREY, spaceAfter=10)
chaptitle = ParagraphStyle("chaptitle", fontName="Literata-SemiBold", fontSize=23, leading=27,
                           spaceAfter=6, textColor=black)
kicker = ParagraphStyle("kicker", fontName="Literata-Italic", fontSize=11.5, leading=16,
                        textColor=GREY, spaceAfter=22)
h2 = ParagraphStyle("h2", fontName="Inter-Medium", fontSize=10, leading=13, spaceBefore=16,
                    spaceAfter=7, textColor=black)
boxbody = ParagraphStyle("boxbody", fontName="Literata", fontSize=9.4, leading=13.6,
                         alignment=TA_LEFT, textColor=Color(0.12, 0.12, 0.12))


class Rule(Flowable):
    def __init__(self, width, thickness=0.5, color=HAIR, space=0):
        Flowable.__init__(self); self.width = width; self.t = thickness
        self.color = color; self.space = space; self.height = thickness + space
    def wrap(self, *a): return (self.width, self.height)
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(self.t)
        self.canv.line(0, self.space, self.width, self.space)


def make_doc(path):
    doc = BaseDocTemplate(path, pagesize=(PAGE_W, PAGE_H),
                          leftMargin=GUTTER, rightMargin=OUTER,
                          topMargin=TOP, bottomMargin=BOTTOM,
                          title="Prototype", author="Test")
    def deco(canvas, d):
        canvas.saveState()
        pn = canvas.getPageNumber()
        if pn > 1:
            canvas.setFont("Inter-Medium", 7.4)
            canvas.setFillColor(GREY)
            # mirrored margins: odd = recto (gutter left), even = verso (gutter right)
            if pn % 2 == 1:
                x_text = GUTTER
                canvas.drawString(x_text, PAGE_H - TOP + 18, "1  ·  THE BODY YOU WAKE UP IN")
                canvas.drawRightString(PAGE_W - OUTER, PAGE_H - TOP + 18, "THE 15-MINUTE FASCIAL RELEASE PLAN")
                canvas.drawRightString(PAGE_W - OUTER, BOTTOM - 26, str(pn))
            else:
                x_text = OUTER
                canvas.drawString(x_text, PAGE_H - TOP + 18, "1  ·  THE BODY YOU WAKE UP IN")
                canvas.drawRightString(PAGE_W - OUTER, PAGE_H - TOP + 18, "THE 15-MINUTE FASCIAL RELEASE PLAN")
                canvas.drawString(OUTER, BOTTOM - 26, str(pn))
            canvas.setStrokeColor(HAIR); canvas.setLineWidth(0.4)
            canvas.line(x_text, PAGE_H - TOP + 14, PAGE_W - (GUTTER if pn % 2 == 1 else OUTER), PAGE_H - TOP + 14)
        canvas.restoreState()

    fw = TEXT_W
    frame_r = Frame(GUTTER, BOTTOM, fw, PAGE_H - TOP - BOTTOM, id="r",
                    leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    frame_v = Frame(OUTER, BOTTOM, fw, PAGE_H - TOP - BOTTOM, id="v",
                    leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([
        PageTemplate(id="recto", frames=[frame_r], onPage=deco),
        PageTemplate(id="verso", frames=[frame_v], onPage=deco),
    ])
    return doc


def build(path):
    doc = make_doc(path)
    s = []
    s.append(Spacer(1, 30))
    s.append(Paragraph("CHAPTER ONE", chapnum))
    s.append(Paragraph("The Body You Wake Up In", chaptitle))
    s.append(Rule(TEXT_W * 0.22, 1.2, black, 0))
    s.append(Spacer(1, 14))
    s.append(Paragraph("On the morning check, and why it is not a verdict.", kicker))
    for para in [
        "Before you get out of bed, you check. Most people with a stiff neck or an aching hip do this without deciding to. You turn your head a little against the pillow and wait for the answer.",
        "It is a strange habit when you look at it directly. You are consulting your body about the day before the day has happened. But it makes sense, because the answer changes things. A stiff neck at seven in the morning is not just a sensation. It is a forecast, and you plan around it.",
    ]:
        s.append(Paragraph(para, body)); s.append(Spacer(1, 9))

    s.append(Paragraph("What pain is", h2))
    s.append(Paragraph("The International Association for the Study of Pain, whose definitions are the ones most clinicians work from, describes pain as an unpleasant experience that combines sensation and emotion.", body))

    # callout box
    inner = [Paragraph("WHAT WE KNOW, AND WHAT WE DON'T", ParagraphStyle(
        "bx", fontName="Inter-Bold", fontSize=7.6, leading=10, textColor=black, spaceAfter=6))]
    inner.append(Paragraph("<b>We know</b> that pain is an experience produced by the nervous system, not a direct readout of tissue damage.", boxbody))
    inner.append(Spacer(1, 5))
    inner.append(Paragraph("<b>We don't know</b> how to reverse the relationship between tissue state and pain once it has become unhelpful.", boxbody))
    t = Table([[inner]], colWidths=[TEXT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), Color(0.955, 0.952, 0.945)),
        ("BOX", (0, 0), (-1, -1), 0.5, Color(0.80, 0.80, 0.78)),
        ("LEFTPADDING", (0, 0), (-1, -1), 14), ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    s.append(Spacer(1, 10)); s.append(t); s.append(Spacer(1, 12))

    # fake figure: image findings bar chart drawn with primitives
    from reportlab.graphics.shapes import Drawing, Rect, String, Line
    d = Drawing(TEXT_W, 130)
    d.add(String(0, 112, "Imaging findings in people with no back pain", fontName="Inter-Medium", fontSize=8, fillColor=GREY))
    bars = [("Age 20", 37, 30), ("Age 80", 96, 84)]
    bw, gap = 34, 96
    for i, (lab, degen, bulge) in enumerate(bars):
        x0 = 30 + i * gap
        for j, (v, col) in enumerate([(degen, Color(0.20, 0.20, 0.20)), (bulge, Color(0.62, 0.62, 0.60))]):
            h = v * 0.82
            d.add(Rect(x0 + j * (bw + 6), 18, bw, h, fillColor=col, strokeColor=None))
            d.add(String(x0 + j * (bw + 6) + bw / 2, 18 + h + 4, "%d%%" % v,
                         fontName="Inter-Medium", fontSize=7, fillColor=black, textAnchor="middle"))
        d.add(String(x0 + bw, 4, lab, fontName="Inter", fontSize=7.2, fillColor=GREY, textAnchor="middle"))
    d.add(Line(0, 18, TEXT_W, 18, strokeColor=HAIR, strokeWidth=0.5))
    s.append(d)
    s.append(Paragraph("Figure 1.1  Disc degeneration and disc bulge by age, in 3,110 people with no back pain (Brinjikji 2015).",
                       ParagraphStyle("cap", fontName="Inter", fontSize=7.6, leading=10.5, textColor=GREY, spaceBefore=4)))

    s.append(NextPageTemplate("verso"))
    s.append(PageBreak())
    s.append(Paragraph("Section 1.3", body))
    for i in range(3):
        s.append(Paragraph("Both halves of that sentence have to be held at once. The finding on your scan is real. It is also extremely common in people who feel fine, and it is a poor predictor of what any given person will experience. A scan is a photograph of structure, and pain is not a structure.", body))
        s.append(Spacer(1, 9))
    doc.build(s)


if __name__ == "__main__":
    out = os.path.join(HERE, "prototype.pdf")
    build(out)
    print("built", out, os.path.getsize(out), "bytes")
