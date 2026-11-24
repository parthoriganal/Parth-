from reportlab.pdfgen import canvas
from reportlab.lib.colors import CMYKColor, HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import Drawing, Circle, Rect, Line, String, Path, Group
from reportlab.graphics import shapes
import os, io, math
from PIL import Image, ImageDraw, ImageFont

BASE = '/home/user/Parth-/books/espresso-dial-in-fieldbook'
OUT_PDF = os.path.join(BASE, 'espresso-dial-in-fieldbook-full-wrap-cover.pdf')
OUT_FRONT = os.path.join(BASE, 'espresso-dial-in-fieldbook-front-cover.png')
OUT_THUMB = os.path.join(BASE, 'espresso-dial-in-fieldbook-thumbnail-100px.png')
OUT_GUIDE = os.path.join(BASE, 'espresso-dial-in-fieldbook-cover-guide-overlay.pdf')

# Fonts
pdfmetrics.registerFont(TTFont('PlayfairBlack', '/tmp/PlayfairDisplay-Black.ttf'))
pdfmetrics.registerFont(TTFont('FiraSemiBold', '/tmp/google-fonts/ofl/firasans/FiraSans-SemiBold.ttf'))
pdfmetrics.registerFont(TTFont('FiraRegular', '/tmp/google-fonts/ofl/firasans/FiraSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('FiraBold', '/tmp/google-fonts/ofl/firasans/FiraSans-Bold.ttf'))

# Canvas
W_IN, H_IN = 17.511, 11.25
W, H = W_IN * inch, H_IN * inch
BLEED = 0.125 * inch
TRIM_W, TRIM_H = 8.5 * inch, 11.0 * inch
SPINE_W = 0.261 * inch

# Panel x ranges (from left edge of canvas)
BACK_X0, BACK_X1 = 0.125 * inch, 8.625 * inch
SPINE_X0, SPINE_X1 = 8.625 * inch, 8.886 * inch
FRONT_X0, FRONT_X1 = 8.886 * inch, 17.386 * inch
TRIM_BOTTOM = 0.125 * inch
TRIM_TOP = 11.125 * inch

# Colors (CMYK approximations, print-safe)
CREAM = HexColor('#F4ECDD')      # warm cream
ESPRESSO = HexColor('#2B1A12')    # espresso brown
INK = HexColor('#1E120C')         # espresso black
ACCENT = HexColor('#A85412')      # crema orange (darkened for 4.5:1 on cream)
WHITE = HexColor('#FFFFFF')

# Safe margins
SAFE = 0.4 * inch  # inside trim edge for front/back text
SPINE_CLEAR = 0.0625 * inch

def draw_frame(c):
    # Background
    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # 0.25 in espresso-brown frame band at very edge
    b = 0.25 * inch
    c.setFillColor(ESPRESSO)
    # top
    c.rect(0, H-b, W, b, fill=1, stroke=0)
    # bottom
    c.rect(0, 0, W, b, fill=1, stroke=0)
    # left
    c.rect(0, 0, b, H, fill=1, stroke=0)
    # right
    c.rect(W-b, 0, b, H, fill=1, stroke=0)

def draw_spine(c):
    # Solid espresso-brown spine band for contrast
    c.setFillColor(ESPRESSO)
    c.rect(SPINE_X0, 0, SPINE_W, H, fill=1, stroke=0)
    # Spine text top-to-bottom
    c.saveState()
    c.setFillColor(CREAM)
    c.setFont('FiraBold', 9.5)
    # center of spine
    cx = (SPINE_X0 + SPINE_X1) / 2
    c.translate(cx, H/2)
    c.rotate(270)  # top to bottom reading
    text = 'Espresso Dial-In Fieldbook  •  Parth Gosara'
    # ensure within spine clearances - use small size
    c.drawCentredString(0, -3, text)
    c.restoreState()

def draw_front(c):
    # Front safe area
    fx0 = FRONT_X0 + SAFE
    fx1 = FRONT_X1 - SAFE
    fy0 = TRIM_BOTTOM + SAFE
    fy1 = TRIM_TOP - SAFE
    fw = fx1 - fx0

    # Title: upper 45% of front, left-aligned, 3 lines
    # "Espresso / Dial-In / Fieldbook"
    title_lines = ['Espresso', 'Dial-In', 'Fieldbook']
    title_size = 74  # large, heavy; ~24% cover height
    leading = title_size * 0.95
    # Position in upper 45% of front trim
    title_top = TRIM_TOP - 0.75*inch
    c.setFillColor(INK)
    c.setFont('PlayfairBlack', title_size)
    y = title_top
    for ln in title_lines:
        c.drawString(fx0, y - title_size*0.8, ln)
        y -= leading
    title_block_bottom = y

    # Subtitle
    sub_y = title_block_bottom - 0.35*inch
    c.setFillColor(INK)
    c.setFont('FiraSemiBold', 20)
    c.drawString(fx0, sub_y, 'for Home Baristas')
    # rest smaller but >=16pt
    c.setFillColor(INK)
    c.setFont('FiraSemiBold', 16)
    c.drawString(fx0, sub_y - 28, 'Compare 4 Shots per Bean, Track Grind, Dose,')
    # highlight keyword "Taste" in accent? "subtitle keyword" - use accent for Taste
    line2 = 'Yield, Time & Taste'
    c.drawString(fx0, sub_y - 48, 'Yield, Time & ')
    tw = pdfmetrics.stringWidth('Yield, Time & ', 'FiraSemiBold', 16)
    c.setFillColor(ACCENT)
    c.drawString(fx0 + tw, sub_y - 48, 'Taste')

    # Accent rule
    c.setStrokeColor(ACCENT)
    c.setLineWidth(2.5)
    c.line(fx0, sub_y - 64, fx0 + 2.2*inch, sub_y - 64)

    # Hero: four cup shapes of rising fill labeled 1 BASE, 2 TEST A, 3 TEST B, 4 CONFIRM
    hero_cx = FRONT_X0 + TRIM_W * 0.62
    hero_y = TRIM_BOTTOM + 3.2*inch
    cup_w = 0.85*inch
    cup_h = 0.95*inch
    gap = 0.28*inch
    total_w = 4*cup_w + 3*gap
    start_x = hero_cx - total_w/2
    labels = [('1', 'BASE', INK, 0.35), ('2', 'TEST A', INK, 0.55), ('3', 'TEST B', INK, 0.75), ('4', 'CONFIRM', ACCENT, 0.95)]
    for i, (num, lab, col, fill_pct) in enumerate(labels):
        x = start_x + i*(cup_w+gap)
        draw_cup(c, x, hero_y, cup_w, cup_h, fill_pct, col, num, lab)

    # Thin connected line under cups for step labels alignment
    line_y = hero_y - 0.55*inch
    c.setStrokeColor(HexColor('#B8A898'))
    c.setLineWidth(1)
    c.line(start_x + cup_w/2, line_y + 16, start_x + 3*(cup_w+gap) + cup_w/2, line_y + 16)
    for i, (num, lab, col, _) in enumerate(labels):
        x = start_x + i*(cup_w+gap) + cup_w/2
        c.setFillColor(INK)
        c.circle(x, line_y + 16, 3, fill=1, stroke=0)
        c.setFillColor(col)
        c.setFont('FiraBold', 14)
        c.drawCentredString(x, line_y - 2, f'{num} {lab}')

    # Author bottom of front
    c.setFillColor(INK)
    c.setFont('FiraBold', 20)
    c.drawString(fx0, fy0 + 0.1*inch, 'Parth Gosara')

    # breathing room: layout leaves upper-right/center areas open

def draw_cup(c, x, y, w, h, fill_pct, label_color, num, lab):
    # Simple flat vector cup
    c.saveState()
    c.setStrokeColor(INK)
    c.setLineWidth(2)
    c.setFillColor(WHITE)
    # cup body (tapered)
    p = c.beginPath()
    p.moveTo(x + w*0.15, y + h)
    p.lineTo(x + w*0.85, y + h)
    p.lineTo(x + w*0.75, y)
    p.lineTo(x + w*0.25, y)
    p.close()
    c.drawPath(p, fill=1, stroke=1)
    # fill
    fill_h = h * fill_pct * 0.85
    inset = 0.03*w
    p2 = c.beginPath()
    yb = y + 0.05*h
    yt = yb + fill_h
    # tapered fill
    left_bot = x + w*0.25 + inset
    right_bot = x + w*0.75 - inset
    t_ratio = (yt - y) / h
    left_top = x + w*0.15 + (w*0.10)* (1-t_ratio) + inset
    right_top = x + w*0.85 - (w*0.10)*(1-t_ratio) - inset
    p2.moveTo(left_bot, yb)
    p2.lineTo(right_bot, yb)
    p2.lineTo(right_top, yt)
    p2.lineTo(left_top, yt)
    p2.close()
    c.setFillColor(HexColor('#D4A574') if label_color != ACCENT else ACCENT)
    c.drawPath(p2, fill=1, stroke=0)
    # handle
    c.setStrokeColor(INK)
    c.setLineWidth(2)
    c.arc(x + w*0.72, y + h*0.25, x + w*1.05, y + h*0.75, 270, 180)
    # saucer
    c.setLineWidth(2)
    c.line(x, y-3, x+w, y-3)
    c.restoreState()

def draw_back(c):
    bx0 = BACK_X0 + SAFE
    bx1 = BACK_X1 - SAFE
    by0 = TRIM_BOTTOM + SAFE
    by1 = TRIM_TOP - SAFE
    bw = bx1 - bx0

    # Headline
    c.setFillColor(INK)
    c.setFont('PlayfairBlack', 32)
    c.drawString(bx0, by1 - 40, 'Make each shot teach you')
    c.drawString(bx0, by1 - 76, 'something.')

    # Paragraph
    c.setFont('FiraRegular', 12.5)
    c.setFillColor(INK)
    para = (
        'A practical fieldbook for home espresso owners who want a repeatable recipe for each bean. '
        'Log four shots side by side, change one variable at a time, and keep what tastes right to you.'
    )
    y = by1 - 120
    y = draw_wrapped(c, para, bx0, y, bw * 0.92, 12.5, 'FiraRegular', 18.1)

    # Bullets
    bullets = [
        'Compare four shots side by side for each bean',
        'Track grind, dose, yield, time, and taste in one record',
        'Test one change at a time; keep what tastes right to you',
        'Save repeatable recipes for each coffee',
    ]
    y -= 18
    for b in bullets:
        c.setFillColor(ACCENT)
        c.circle(bx0 + 4, y - 4, 2.5, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont('FiraRegular', 12.5)
        c.drawString(bx0 + 16, y - 8, b)
        y -= 24

    # Trust note
    y -= 10
    c.setFillColor(HexColor('#3A2A20'))
    c.setFont('FiraSemiBold', 11)
    note = 'Includes a filled-in example, quick-start guide, troubleshooting chart, and 14 bean sessions.'
    draw_wrapped(c, note, bx0, y, bw*0.92, 11, 'FiraSemiBold', 15.4)

    # Author bottom-left
    c.setFillColor(INK)
    c.setFont('FiraBold', 12.5)
    c.drawString(bx0, by0 + 0.1*inch, 'Parth Gosara')

    # Barcode box: 2 x 1.2 in, 0.25 in from spine and bottom trim, nothing touching
    box_w, box_h = 2.0*inch, 1.2*inch
    box_x1 = BACK_X1 - 0.25*inch
    box_x0 = box_x1 - box_w
    box_y0 = TRIM_BOTTOM + 0.25*inch
    c.setFillColor(WHITE)
    c.rect(box_x0, box_y0, box_w, box_h, fill=1, stroke=0)

def draw_wrapped(c, text, x, y, max_w, size, font, leading):
    words = text.split()
    line = ''
    for w in words:
        test = (line + ' ' + w).strip()
        if pdfmetrics.stringWidth(test, font, size) <= max_w:
            line = test
        else:
            c.drawString(x, y, line)
            y -= leading
            line = w
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y

def build_cover(path, guide=False):
    c = canvas.Canvas(path, pagesize=(W, H))
    draw_frame(c)
    draw_spine(c)
    draw_front(c)
    draw_back(c)
    if guide:
        draw_guide(c)
    c.showPage()
    c.save()

def draw_guide(c):
    c.saveState()
    # Bleed boundary (canvas edge already) - draw trim, spine, safe zones
    # Trim lines
    c.setStrokeColor(HexColor('#00AAFF'))
    c.setLineWidth(0.5)
    c.rect(BACK_X0, TRIM_BOTTOM, TRIM_W, TRIM_H, fill=0, stroke=1)
    c.rect(FRONT_X0, TRIM_BOTTOM, TRIM_W, TRIM_H, fill=0, stroke=1)
    # Spine
    c.setStrokeColor(HexColor('#FF6600'))
    c.rect(SPINE_X0, TRIM_BOTTOM, SPINE_W, TRIM_H, fill=0, stroke=1)
    # Safe zones
    c.setStrokeColor(HexColor('#00CC66'))
    c.setDash(3,3)
    c.rect(BACK_X0+SAFE, TRIM_BOTTOM+SAFE, TRIM_W-2*SAFE, TRIM_H-2*SAFE, fill=0, stroke=1)
    c.rect(FRONT_X0+SAFE, TRIM_BOTTOM+SAFE, TRIM_W-2*SAFE, TRIM_H-2*SAFE, fill=0, stroke=1)
    c.rect(SPINE_X0+SPINE_CLEAR, TRIM_BOTTOM+SAFE, SPINE_W-2*SPINE_CLEAR, TRIM_H-2*SAFE, fill=0, stroke=1)
    # Barcode
    box_w, box_h = 2.0*inch, 1.2*inch
    box_x1 = BACK_X1 - 0.25*inch
    box_x0 = box_x1 - box_w
    box_y0 = TRIM_BOTTOM + 0.25*inch
    c.setStrokeColor(HexColor('#CC00CC'))
    c.setDash(2,2)
    c.rect(box_x0, box_y0, box_w, box_h, fill=0, stroke=1)
    # Labels
    c.setDash()
    c.setFillColor(HexColor('#00AAFF'))
    c.setFont('FiraBold', 8)
    c.drawString(BACK_X0+2, TRIM_TOP+2, 'BACK TRIM')
    c.drawString(FRONT_X0+2, TRIM_TOP+2, 'FRONT TRIM')
    c.setFillColor(HexColor('#FF6600'))
    c.drawString(SPINE_X0-2, TRIM_TOP+2, 'SPINE')
    c.setFillColor(HexColor('#00CC66'))
    c.drawString(FRONT_X0+SAFE+2, TRIM_TOP-SAFE-10, 'SAFE ZONE')
    c.setFillColor(HexColor('#CC00CC'))
    c.drawString(box_x0+2, box_y0+box_h+2, 'BARCODE BOX')
    c.restoreState()

def export_previews():
    import fitz
    doc = fitz.open(OUT_PDF)
    page = doc[0]
    # full front cover preview - crop front trim area
    # front trim in inches: x 8.886-17.386, y 0.125-11.125 from bottom; fitz uses top-left
    mat = fitz.Matrix(300/72, 300/72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes('png')))
    # crop front trim
    scale = 300/72
    left = int(FRONT_X0 * scale)
    top = int((H - TRIM_TOP) * scale)
    right = int(FRONT_X1 * scale)
    bottom = int((H - TRIM_BOTTOM) * scale)
    front = img.crop((left, top, right, bottom))
    front.save(OUT_FRONT, 'PNG')

    # 100px tall thumbnail test image (front cover)
    thumb_h = 100
    thumb_w = int(front.size[0] * thumb_h / front.size[1])
    thumb = front.resize((thumb_w, thumb_h), Image.LANCZOS)
    thumb.save(OUT_THUMB, 'PNG')

    # 86x111 test
    test = front.resize((86, 111), Image.LANCZOS)
    test.save(os.path.join(BASE, 'espresso-dial-in-fieldbook-thumbnail-86x111.png'), 'PNG')
    doc.close()
    return thumb_w

if __name__ == '__main__':
    build_cover(OUT_PDF, guide=False)
    build_cover(OUT_GUIDE, guide=True)
    tw = export_previews()
    print('built', OUT_PDF)
    print('thumb', tw)
