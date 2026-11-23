#!/usr/bin/env python3
"""Create the vector-first KDP paperback cover and its review preview.

Edit this source to change the typography, colors, layout, or original vector
illustration. The PDF is a single full-wrap page with no raster artwork. It uses
the actual interior page count and the KDP white-paper B&W spine formula.
"""
from __future__ import annotations

import math
import os
from pathlib import Path

import fitz
from pypdf import PdfReader, PdfWriter
from pypdf.generic import FloatObject, RectangleObject
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parent
INTERIOR = ROOT / "espresso-dial-in-fieldbook-interior.pdf"
OUT_PDF = ROOT / "espresso-dial-in-fieldbook-full-wrap-cover.pdf"
OUT_PREVIEW = ROOT / "espresso-dial-in-fieldbook-cover-preview.png"

# Verified production inputs — update only if KDP print options or the interior change.
PAGE_COUNT = 116
TRIM_W = 8.5
TRIM_H = 11.0
BLEED = 0.125
PAPER_TYPE = "white"
INK = "black"
SPINE_FACTOR = 0.002252  # KDP black ink, white paper, inches per page
SPINE_W = PAGE_COUNT * SPINE_FACTOR
COVER_W_IN = BLEED + TRIM_W + SPINE_W + TRIM_W + BLEED
COVER_H_IN = TRIM_H + 2 * BLEED
PT = 72.0
W = COVER_W_IN * PT
H = COVER_H_IN * PT

# Panel positions in PDF points. The cover is back | spine | front, left to right.
BACK_X = BLEED * PT
PANEL_W = TRIM_W * PT
SPINE_X = BACK_X + PANEL_W
SPINE_END = SPINE_X + SPINE_W * PT
FRONT_X = SPINE_END
TRIM_BOTTOM = BLEED * PT
TRIM_TOP = H - BLEED * PT

# Restrained specialty-coffee palette in CMYK for predictable print separation.
BG = colors.CMYKColor(0.3590, 0.0000, 0.1026, 0.8471)       # deep roast-green
BG2 = colors.CMYKColor(0.2963, 0.0000, 0.1124, 0.7882)
BG3 = colors.CMYKColor(0.2321, 0.0000, 0.1160, 0.7294)
CREAM = colors.CMYKColor(0.0000, 0.0374, 0.1037, 0.0549)
PAPER = colors.CMYKColor(0.0000, 0.0647, 0.1638, 0.0902)
COPPER = colors.CMYKColor(0.0000, 0.3266, 0.5529, 0.2196)
GOLD = colors.CMYKColor(0.0000, 0.1887, 0.4243, 0.1686)
COFFEE = colors.CMYKColor(0.0000, 0.3571, 0.4821, 0.7804)
COFFEE2 = colors.CMYKColor(0.0000, 0.3978, 0.5354, 0.6549)
MUTED = colors.CMYKColor(0.0107, 0.0000, 0.0694, 0.2667)

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
pdfmetrics.registerFont(TTFont("CoverSans", str(FONT_DIR / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("CoverSans-Bold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))
pdfmetrics.registerFont(TTFont("CoverSerif", str(FONT_DIR / "DejaVuSerif.ttf")))
pdfmetrics.registerFont(TTFont("CoverSerif-Bold", str(FONT_DIR / "DejaVuSerif-Bold.ttf")))

BODY = ParagraphStyle("cover-body", fontName="CoverSans", fontSize=10.6,
                      leading=15.2, textColor=CREAM, spaceAfter=0)
SUBTITLE_STYLE = ParagraphStyle("cover-subtitle", fontName="CoverSans", fontSize=11.3,
                                leading=16.5, textColor=CREAM, spaceAfter=0)

TITLE = "Espresso Dial-In Fieldbook for Home Baristas"
SUBTITLE = ("Compare 4 Shots per Bean, Track Grind, Dose, Yield, Time & Taste, "
            "and Save Your Repeatable Recipes")
AUTHOR = "Parth Gosara"


def spaced_text(c: canvas.Canvas, text: str, x: float, y: float, *,
                font: str = "CoverSans-Bold", size: float = 8.0,
                tracking: float = 1.2, color=CREAM) -> None:
    obj = c.beginText(x, y)
    obj.setFont(font, size)
    obj.setFillColor(color)
    obj.setCharSpace(tracking)
    obj.textOut(text)
    # Character spacing is a persistent PDF text-state parameter. Reset it
    # inside this text object so later paragraph/body copy wraps to its box.
    obj.setCharSpace(0)
    c.drawText(obj)


def paragraph(c: canvas.Canvas, text: str, x: float, top: float,
              width: float, style: ParagraphStyle) -> float:
    p = Paragraph(text, style)
    _, h = p.wrap(width, 1000)
    p.drawOn(c, x, top - h)
    return h


def draw_background(c: canvas.Canvas) -> None:
    # A continuous field over back, spine, front, and bleed avoids a hard spine edge.
    c.setFillColor(BG)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    # Quiet, low-contrast editorial grain is made from sparse vector hairlines.
    c.setStrokeColor(BG2)
    c.setLineWidth(0.35)
    for x in range(int(BLEED * PT + 24), int(W - BLEED * PT - 24), 73):
        if abs(x - SPINE_X) < 20 or abs(x - SPINE_END) < 20:
            continue
        c.line(x, 16, x, H - 16)
    # A few muted horizontal rules anchor the wrap without creating trim borders.
    c.setStrokeColor(BG3)
    c.setLineWidth(0.45)
    for y in (TRIM_BOTTOM + 22, TRIM_TOP - 22):
        c.line(BLEED * PT + 24, y, W - BLEED * PT - 24, y)


def draw_espresso_illustration(c: canvas.Canvas, cx: float, cy: float) -> None:
    """Original vector top-view espresso cup with crema rings and four-shot markers."""
    # Subtle open orbital lines — no enclosing frame or spine-crossing artwork.
    c.setStrokeColor(BG3)
    c.setLineWidth(0.8)
    c.circle(cx, cy, 132, stroke=1, fill=0)
    c.circle(cx, cy, 125, stroke=1, fill=0)

    # Saucer and cup, all composed as vector circles.
    c.setFillColor(BG2)
    c.setStrokeColor(COPPER)
    c.setLineWidth(1.2)
    c.circle(cx, cy, 111, stroke=1, fill=1)
    c.setStrokeColor(BG3)
    c.setLineWidth(0.8)
    c.circle(cx, cy, 101, stroke=1, fill=0)
    c.setFillColor(PAPER)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.0)
    c.circle(cx, cy, 88, stroke=1, fill=1)
    c.setFillColor(COFFEE2)
    c.setStrokeColor(COFFEE2)
    c.circle(cx, cy, 77, stroke=1, fill=1)
    c.setFillColor(COFFEE)
    c.circle(cx, cy, 68, stroke=0, fill=1)

    # Crema: layered, hand-drawn arcs and a central spiral-like sweep.
    c.setStrokeColor(GOLD)
    c.setLineWidth(2.2)
    c.arc(cx - 57, cy - 57, cx + 57, cy + 57, 12, 245)
    c.setStrokeColor(COPPER)
    c.setLineWidth(1.65)
    c.arc(cx - 47, cy - 47, cx + 47, cy + 47, 181, 248)
    c.setStrokeColor(PAPER)
    c.setLineWidth(1.45)
    c.arc(cx - 36, cy - 36, cx + 36, cy + 36, 18, 250)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    c.arc(cx - 24, cy - 24, cx + 24, cy + 24, 196, 246)
    # Small crema island with a tapered leaf motif (Bezier strokes).
    path = c.beginPath()
    path.moveTo(cx - 20, cy - 5)
    path.curveTo(cx - 11, cy + 15, cx + 12, cy + 15, cx + 19, cy + 2)
    path.curveTo(cx + 10, cy - 8, cx - 9, cy - 15, cx - 20, cy - 5)
    c.setFillColor(GOLD)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.65)
    c.drawPath(path, stroke=1, fill=1)
    c.setStrokeColor(COFFEE)
    c.setLineWidth(0.8)
    c.line(cx - 15, cy - 5, cx + 14, cy + 2)
    for offset in (-7, 0, 7):
        c.line(cx + offset, cy - 2, cx + offset - 3, cy + 4)

    # Four numbered markers tell the product story without relying on a stock icon.
    marker_angles = (135, 45, -45, -135)
    for i, angle in enumerate(marker_angles, 1):
        rad = math.radians(angle)
        mx = cx + 128 * math.cos(rad)
        my = cy + 128 * math.sin(rad)
        c.setFillColor(BG)
        c.setStrokeColor(COPPER)
        c.setLineWidth(1.0)
        c.circle(mx, my, 14, stroke=1, fill=1)
        c.setFillColor(CREAM)
        c.setFont("CoverSans-Bold", 7.2)
        c.drawCentredString(mx, my - 2.5, f"0{i}")


def draw_front(c: canvas.Canvas) -> None:
    x = FRONT_X
    left = x + 44
    right = x + PANEL_W - 42
    # Small editorial masthead and a restrained copper rule.
    spaced_text(c, "ESPRESSO  /  FIELDWORK", left, 747, size=8.1, tracking=1.35)
    c.setStrokeColor(COPPER)
    c.setLineWidth(1.1)
    c.line(left, 731, left + 42, 731)
    spaced_text(c, "A HOME BARISTA WORKBOOK", left, 710,
                font="CoverSans", size=8.2, tracking=1.1, color=MUTED)

    # Title hierarchy mirrors the interior, with the exact book title and subtitle.
    c.setFillColor(CREAM)
    c.setFont("CoverSerif-Bold", 46)
    c.drawString(left, 651, "Espresso")
    c.setFont("CoverSerif-Bold", 51)
    c.drawString(left, 592, "Dial-In")
    c.setFont("CoverSerif-Bold", 44)
    c.drawString(left, 541, "Fieldbook")
    c.setFillColor(GOLD)
    c.setFont("CoverSans", 14)
    c.drawString(left + 2, 515, "for Home Baristas")

    c.setStrokeColor(BG3)
    c.setLineWidth(0.65)
    c.line(left, 493, right, 493)
    paragraph(c, SUBTITLE, left, 476, right - left, SUBTITLE_STYLE)

    # Hero composition: custom crema rings and four marked shot positions.
    draw_espresso_illustration(c, x + 432, 280)

    # A concise four-step index keeps the visual tied to the real interior system.
    labels = ("BASE", "TEST A", "TEST B", "CONFIRM")
    seq_x = left
    seq_y = 140
    step_w = 119
    c.setStrokeColor(BG3)
    c.setLineWidth(0.8)
    c.line(seq_x + 9, seq_y + 3, seq_x + step_w * 3 + 9, seq_y + 3)
    for i, label in enumerate(labels):
        sx = seq_x + i * step_w
        c.setFillColor(BG)
        c.setStrokeColor(COPPER if i == 3 else BG3)
        c.setLineWidth(1.0)
        c.circle(sx + 10, seq_y + 3, 9, stroke=1, fill=1)
        c.setFillColor(CREAM)
        c.setFont("CoverSans-Bold", 7.2)
        c.drawCentredString(sx + 10, seq_y + 0.5, str(i + 1))
        spaced_text(c, label, sx + 25, seq_y + 0.4,
                    font="CoverSans-Bold", size=7.2, tracking=0.5,
                    color=GOLD if i == 3 else CREAM)

    c.setFillColor(CREAM)
    c.setFont("CoverSans-Bold", 9.2)
    c.drawString(left, 67, AUTHOR)
    spaced_text(c, "MEASURE  ·  TASTE  ·  LEARN  ·  REPEAT",
                left, 48, font="CoverSans", size=7.0, tracking=0.72, color=MUTED)


def draw_back(c: canvas.Canvas) -> tuple[float, float, float, float]:
    x = BACK_X
    left = x + 42
    width = PANEL_W - 84
    spaced_text(c, "A PRACTICAL FIELD GUIDE TO HOME ESPRESSO", left, 747,
                font="CoverSans-Bold", size=7.8, tracking=1.0, color=GOLD)
    c.setStrokeColor(COPPER)
    c.setLineWidth(1.1)
    c.line(left, 731, left + 42, 731)

    c.setFillColor(CREAM)
    c.setFont("CoverSerif-Bold", 25)
    c.drawString(left, 684, "Make each shot")
    c.drawString(left, 652, "teach you something.")

    intro = ("Espresso is personal. A useful record helps you see what changed, "
             "what you preferred, and what is worth trying again. This fieldbook "
             "gives each coffee a repeatable four-shot comparison—without treating "
             "one ratio, timer reading, or taste cue as a universal rule.")
    intro_h = paragraph(c, intro, left, 626, width, BODY)

    rule_y = 626 - intro_h - 17
    c.setStrokeColor(BG3)
    c.setLineWidth(0.7)
    c.line(left, rule_y, x + PANEL_W - 42, rule_y)
    spaced_text(c, "INSIDE THE FIELDNOTES", left, rule_y - 24,
                font="CoverSans-Bold", size=8.0, tracking=1.2, color=GOLD)

    bullets = [
        "14 bean-by-bean sessions, each built around four recorded shots.",
        "Compare changes, measurements, and taste—then decide what to keep.",
        "14 recipe cards, plus notes for grinder, basket, water, and preparation.",
        "A steady, taste-led method that treats time and ratio as clues, not rules.",
    ]
    y = rule_y - 52
    bullet_style = ParagraphStyle("bullet", fontName="CoverSans", fontSize=9.6,
                                  leading=13.4, textColor=CREAM, spaceAfter=0)
    for i, text in enumerate(bullets, 1):
        c.setFillColor(COPPER)
        c.circle(left + 5, y - 5, 3.4, stroke=0, fill=1)
        h = paragraph(c, text, left + 20, y, width - 22, bullet_style)
        y -= max(h, 13.4) + 14

    c.setStrokeColor(COPPER)
    c.setLineWidth(0.8)
    c.line(left, y - 4, left + 40, y - 4)
    spaced_text(c, "BASELINE  /  TEST  /  TASTE  /  SAVE", left, y - 24,
                font="CoverSans-Bold", size=7.1, tracking=0.75, color=GOLD)

    c.setFillColor(CREAM)
    c.setFont("CoverSerif-Bold", 13)
    c.drawString(left, 126, AUTHOR)
    c.setFillColor(MUTED)
    c.setFont("CoverSans", 8.0)
    c.drawString(left, 108, "Espresso Dial-In Fieldbook for Home Baristas")

    # Reserved, unprinted white barcode area: 2 x 1.2 in, lower-right of back trim.
    # It is intentionally clear for KDP's auto barcode if the low-content title
    # is published without an ISBN, or for a publisher barcode if applicable.
    bx = x + PANEL_W - 18 - 2.0 * PT
    by = TRIM_BOTTOM + 18
    bw, bh = 2.0 * PT, 1.2 * PT
    c.setFillColor(colors.CMYKColor(0, 0, 0, 0))
    c.rect(bx, by, bw, bh, stroke=0, fill=1)
    return bx, by, bw, bh


def build() -> None:
    if not INTERIOR.exists():
        raise FileNotFoundError(INTERIOR)
    interior = fitz.open(INTERIOR)
    if len(interior) != PAGE_COUNT:
        raise ValueError(f"Interior has {len(interior)} pages; cover math is set for {PAGE_COUNT}.")
    for page in interior:
        if abs(page.rect.width - TRIM_W * PT) > 0.01 or abs(page.rect.height - TRIM_H * PT) > 0.01:
            raise ValueError("Interior trim changed; do not use this cover calculation.")
    interior.close()

    c = canvas.Canvas(str(OUT_PDF), pagesize=(W, H), pageCompression=1, invariant=1)
    c.setTitle(f"{TITLE} — Full-Wrap Paperback Cover")
    c.setAuthor(AUTHOR)
    c.setSubject("KDP paperback full-wrap cover; 8.5 x 11 in, 116-page B&W white-paper interior")
    c.setCreator("Original editable vector cover source")
    draw_background(c)
    bx, by, bw, bh = draw_back(c)
    draw_front(c)
    # No text, logos, or essential artwork is placed on the narrow spine.
    c.showPage()
    c.save()

    # ReportLab's PDF number formatter rounds page boxes to 0.001 pt. Restore the
    # six-decimal-point calculator dimensions in the final PDF's MediaBox/CropBox.
    reader = PdfReader(str(OUT_PDF))
    writer = PdfWriter()
    page = reader.pages[0]
    exact_box = RectangleObject([
        FloatObject("0"), FloatObject("0"),
        FloatObject(f"{W:.6f}"), FloatObject(f"{H:.6f}"),
    ])
    page.mediabox = exact_box
    page.cropbox = exact_box
    writer.add_page(page)
    writer.add_metadata({
        "/Title": f"{TITLE} — Full-Wrap Paperback Cover",
        "/Author": AUTHOR,
        "/Subject": "KDP paperback full-wrap cover; 8.5 x 11 in, 116-page B&W white-paper interior",
        "/Creator": "Original editable vector cover source",
    })
    temporary_pdf = OUT_PDF.with_suffix(".tmp.pdf")
    with temporary_pdf.open("wb") as stream:
        writer.write(stream)
    raw_pdf = temporary_pdf.read_bytes()
    # Keep the byte count unchanged so the classic PDF xref offsets stay valid:
    # shorten the two zero coordinates while adding the exact six-decimal width.
    replacements = 0
    for key in (b"/MediaBox", b"/CropBox"):
        old = key + b" [ 0.0 0.0 1260.8087 810 ]"
        new = key + b" [0.0 0.0 1260.808704 810]"
        if len(old) != len(new) or raw_pdf.count(old) != 1:
            raise RuntimeError(f"Could not patch exact {key.decode()} without shifting PDF offsets.")
        raw_pdf = raw_pdf.replace(old, new, 1)
        replacements += 1
    if replacements != 2:
        raise RuntimeError(f"Expected to set exact MediaBox and CropBox; changed {replacements} boxes.")
    temporary_pdf.write_bytes(raw_pdf)
    os.replace(temporary_pdf, OUT_PDF)

    # Independent output checks before writing the review image.
    cover = fitz.open(OUT_PDF)
    if len(cover) != 1:
        raise RuntimeError("Full-wrap cover must be one PDF page.")
    page = cover[0]
    if abs(page.rect.width - W) > 0.01 or abs(page.rect.height - H) > 0.01:
        raise RuntimeError(f"Unexpected cover PDF dimensions: {page.rect}")
    text = page.get_text()
    if TITLE not in " ".join(text.split()):
        # PDF extraction may preserve line-breaks, but the title should all be present.
        if not all(word in text for word in ("Espresso", "Dial-In", "Fieldbook", "Home Baristas")):
            raise RuntimeError("Cover title text is missing from the PDF.")
    if SUBTITLE not in " ".join(text.split()):
        raise RuntimeError("Cover subtitle text is missing from the PDF.")
    # Preview as a complete spread at 144 dpi (2 pixels per PDF point).
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False, colorspace=fitz.csRGB)
    pix.save(OUT_PREVIEW)
    print(f"Wrote {OUT_PDF}")
    print(f"Wrote {OUT_PREVIEW} ({pix.width} x {pix.height} px)")
    print(f"Trim {TRIM_W} x {TRIM_H} in; page count {PAGE_COUNT}; paper {PAPER_TYPE}; ink {INK}")
    print(f"Spine {SPINE_W:.6f} in; full wrap {COVER_W_IN:.6f} x {COVER_H_IN:.6f} in")
    print(f"Barcode reserve: {bw/PT:.1f} x {bh/PT:.1f} in at back local x={(bx-BACK_X)/PT:.3f}, y={(by-TRIM_BOTTOM)/PT:.3f} in")


if __name__ == "__main__":
    build()
