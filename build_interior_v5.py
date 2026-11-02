#!/usr/bin/env python3
"""
Build KDP Coloring Book Interior PDF v5
- Extract raw artwork from V4 PDF pages, save as PNG
- Use img2pdf for reliable image-to-PDF conversion
- Paste at original size (already full page 2550x3300)
- Fix title page subtitle position
"""
from PIL import Image, ImageDraw, ImageFont
import os
import io
import numpy as np
import img2pdf
from PyPDF2 import PdfReader, PdfWriter

V4_PDF = "/home/user/Parth-/LARGE_PRINT_COLORING_BOOK_INTERIOR_V4.pdf"
OUTPUT_PDF = "/home/user/Parth-/LARGE_PRINT_COLORING_BOOK_INTERIOR_V5.pdf"

PAGE_W = 2550
PAGE_H = 3300
SIDE_MARGIN = int(0.75 * 300)
SUB_GAP = int(0.6 * 300)

def load_font(size, bold=True):
    for c in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

def blank_img():
    return Image.new("RGB", (PAGE_W, PAGE_H), (255, 255, 255))

def draw_centered(draw, text, font, y, fill=(0,0,0)):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    draw.text(((PAGE_W - w) // 2, y), text, font=font, fill=fill)

def wrap_text(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for word in words:
        t = (cur + " " + word) if cur else word
        if draw.textbbox((0, 0), t, font=font)[2] <= max_w:
            cur = t
        else:
            if cur: lines.append(cur)
            cur = word
    if cur: lines.append(cur)
    return lines

# ---------- Extract raw art images from V4 ----------
reader = PdfReader(V4_PDF)
print(f"V4 pages: {len(reader.pages)}")

art_images = []
for i in range(10, 89, 2):
    page = reader.pages[i]
    if len(page.images) > 0:
        img = Image.open(io.BytesIO(page.images[0].data)).convert("RGB")
        art_images.append(img)
    else:
        print(f"WARNING: Page {i+1} has no image!")
        art_images.append(blank_img())

print(f"Extracted {len(art_images)} art images")

for i, img in enumerate(art_images):
    arr = np.array(img.convert("L"))
    dark = (arr < 128).mean()
    if dark < 0.0001:
        print(f"WARNING: Art image {i+1} is blank (dark={dark:.6f})")

# ---------- Front matter ----------
def title_page():
    img = blank_img()
    d = ImageDraw.Draw(img)
    fb = load_font(140, True)
    fs = load_font(70, False)
    y = PAGE_H//2 - 300
    for line in ["LARGE PRINT", "COLORING BOOK", "FOR SENIORS"]:
        draw_centered(d, line, fb, y)
        y += 240
    sub_y = y + SUB_GAP
    sub = "40 Bold & Easy Designs: Flowers, Gardens, Birds & Cozy Nostalgic Scenes"
    for line in wrap_text(d, sub, fs, PAGE_W - 2*SIDE_MARGIN):
        draw_centered(d, line, fs, sub_y)
        sub_y += 100
    return img

def copyright_page():
    img = blank_img()
    d = ImageDraw.Draw(img)
    f = load_font(55, False)
    y = PAGE_H//2 - 160
    for line in ["Copyright \u00a9 2026 Parth Gosara. All rights reserved.", "",
                 "Designed for seniors with low vision.",
                 "Bold thick outlines, large open spaces, single-sided pages."]:
        draw_centered(d, line, f, y)
        y += 100
    return img

def howto_page():
    img = blank_img()
    d = ImageDraw.Draw(img)
    ft = load_font(75, True)
    fb = load_font(60, False)
    draw_centered(d, "How to Use This Book", ft, PAGE_H//4)
    mw = PAGE_W - 2*SIDE_MARGIN
    y = PAGE_H//4 + 180
    for line in ["Welcome to your Large Print Coloring Book for Seniors.", "",
        "Each page has bold, thick black outlines and large open spaces designed to be easy to see and easy to color, even with low vision.",
        "", "Tips:",
        "\u2022 Use markers, colored pencils, or crayons.",
        "\u2022 Pages are single-sided - color one side at a time.",
        "\u2022 Each picture has a blank page behind it to help prevent bleed-through.",
        "\u2022 Take breaks and enjoy coloring at your own pace.",
        "", "Happy coloring!"]:
        if line == "":
            y += 60; continue
        for wl in wrap_text(d, line, fb, mw):
            draw_centered(d, wl, fb, y)
            y += 85
        y += 20
    return img

def colortest_page():
    img = blank_img()
    d = ImageDraw.Draw(img)
    ft = load_font(75, True)
    fb = load_font(55, False)
    draw_centered(d, "Test Your Pens and Markers Here", ft, PAGE_H//4 - 80)
    sw, sh = 340, 130
    gap = 120
    x0 = (PAGE_W - (sw*2 + gap)) // 2
    y0 = PAGE_H//4 + 60
    cs = int(0.3*300)
    for i in range(6):
        r_, c_ = i//2, i%2
        x = x0 + c_*(sw+gap)
        y = y0 + r_*(sh + cs + 120)
        d.rectangle([x, y, x+sw, y+sh], fill=(255,255,255), outline=(0,0,0), width=10)
        lt = f"Test {i+1}"
        lb = d.textbbox((0,0), lt, font=fb)
        d.text((x + sw//2 - (lb[2]-lb[0])//2, y + sh + cs), lt, font=fb, fill=(0,0,0))
    draw_centered(d, "Color each box to try your pens and markers before coloring.", fb, PAGE_H - 350)
    return img

def belongsto_page():
    img = blank_img()
    d = ImageDraw.Draw(img)
    f = load_font(75, True)
    draw_centered(d, "This Book Belongs To:", f, PAGE_H//3)
    d.line([(PAGE_W-1200)//2, PAGE_H//2, (PAGE_W+1200)//2, PAGE_H//2], fill=(0,0,0), width=10)
    return img

def thankyou_page():
    img = blank_img()
    d = ImageDraw.Draw(img)
    ft = load_font(75, True)
    fb = load_font(55, False)
    draw_centered(d, "Thank You!", ft, PAGE_H//3)
    y = PAGE_H//3 + 200
    for line in ["Thank you for coloring with us.", "",
                 "If you enjoyed this book, please leave a review on Amazon.",
                 "Your review helps other seniors find this book too."]:
        draw_centered(d, line, fb, y)
        y += 90
    return img

# ---------- Save all pages as PNGs ----------
os.makedirs("/tmp/_v5_pages", exist_ok=True)

page_files = []

# Front matter
front_imgs = [
    title_page(), blank_img(), copyright_page(), blank_img(),
    howto_page(), blank_img(), colortest_page(), blank_img(),
    belongsto_page(), blank_img(),
]
for i, img in enumerate(front_imgs):
    p = f"/tmp/_v5_pages/front_{i:03d}.png"
    img.save(p)
    page_files.append(p)

# Art pages (each on odd page with blank behind)
for i, img in enumerate(art_images):
    c = blank_img()
    iw, ih = img.size
    c.paste(img, ((PAGE_W - iw) // 2, (PAGE_H - ih) // 2))
    p = f"/tmp/_v5_pages/art_{i:03d}.png"
    c.save(p)
    page_files.append(p)
    p = f"/tmp/_v5_pages/blank_{i:03d}.png"
    blank_img().save(p)
    page_files.append(p)

# Thank You
p = f"/tmp/_v5_pages/thankyou.png"
thankyou_page().save(p)
page_files.append(p)

# Make even
total = len(page_files)
if total % 2 != 0:
    p = f"/tmp/_v5_pages/end_blank.png"
    blank_img().save(p)
    page_files.append(p)
    total += 1

print(f"Total page files: {total} (even: {total % 2 == 0})")

# ---------- Convert to PDF with img2pdf ----------
# img2pdf converts each image to a PDF page at its natural size
# We need to specify the page size to match 8.5x11 at 300 DPI
layout_fun = img2pdf.get_layout_fun((PAGE_W, PAGE_H))

with open(OUTPUT_PDF, "wb") as f:
    f.write(img2pdf.convert(page_files, layout_fun=layout_fun))

print(f"Saved: {OUTPUT_PDF}")
print(f"Total pages: {total} (even: {total % 2 == 0})")
print(f"Spine width: {total * 0.002252:.5f} in")
