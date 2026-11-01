#!/usr/bin/env python3
"""
Build KDP Coloring Book Interior PDF - Large Print Coloring Book for Seniors
40 designs + front matter + thank you page
"""
from PIL import Image, ImageDraw, ImageFont
import os

BOOK_DIR = "/home/user/Parth-/book_images_v2"
OUTPUT_PDF = "/home/user/Parth-/LARGE_PRINT_COLORING_BOOK_INTERIOR_V2.pdf"

PAGE_W = 2550   # 8.5 in at 300 DPI
PAGE_H = 3300   # 11 in at 300 DPI
MARGIN = int(0.375 * 300)   # 112 px safe margin
CONTENT_MARGIN = int(0.5 * 300)  # 0.5 in for design scaling

def load_font(size, bold=True):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

def blank_page():
    return Image.new("RGB", (PAGE_W, PAGE_H), (255, 255, 255))

def draw_centered(draw, text, font, y, fill=(0,0,0)):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    x = (PAGE_W - w) // 2
    draw.text((x, y), text, font=font, fill=fill)

def draw_centered_at(draw, text, font, y, x_center):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    x = x_center - w // 2
    draw.text((x, y), text, font=font, fill=(0,0,0))

def fit_design_to_page(img_path):
    """Load design, force pure white bg, pure black lines, scale to fill page within margins."""
    img = Image.open(img_path).convert("L")  # grayscale
    # Threshold: anything dark becomes black, everything else pure white
    bw = img.point(lambda p: 0 if p < 140 else 255, mode="1")
    img_bw = bw.convert("L")
    
    # Invert check: if image is mostly black, invert it
    import numpy as np
    arr = np.array(img_bw)
    dark_frac = (arr < 128).mean()
    if dark_frac > 0.5:
        img_bw = Image.fromarray(255 - arr, mode="L")
    
    # Resize to fit within content margins
    img_w, img_h = img_bw.size
    scale = min((PAGE_W - 2*CONTENT_MARGIN) / img_w, (PAGE_H - 2*CONTENT_MARGIN) / img_h)
    new_w = max(1, int(img_w * scale))
    new_h = max(1, int(img_h * scale))
    img_bw = img_bw.resize((new_w, new_h), Image.LANCZOS)
    
    # Paste onto pure white page, centered
    canvas = Image.new("RGB", (PAGE_W, PAGE_H), (255, 255, 255))
    canvas.paste(img_bw, ((PAGE_W - new_w) // 2, (PAGE_H - new_h) // 2))
    return canvas

# ---------- Text Pages ----------

def make_title_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_big = load_font(140, bold=True)
    f_sub = load_font(70, bold=False)
    lines = ["LARGE PRINT", "COLORING BOOK", "FOR SENIORS"]
    y = PAGE_H // 2 - 300
    for line in lines:
        draw_centered(draw, line, f_big, y)
        y += 240
    draw_centered(draw, "Easy Bold Lines - Flowers, Nature, and Simple Scenes", f_sub, y + 60)
    return img

def make_copyright_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f = load_font(55, bold=False)
    lines = [
        "Copyright © 2026 Parth Gosara. All rights reserved.",
        "",
        "Designed for seniors with low vision.",
        "Bold thick outlines, large open spaces, single-sided pages.",
    ]
    y = PAGE_H // 2 - 160
    for line in lines:
        draw_centered(draw, line, f, y)
        y += 100
    return img

def make_how_to_use_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_title = load_font(75, bold=True)
    f_body = load_font(50, bold=False)
    draw_centered(draw, "How to Use This Book", f_title, PAGE_H // 4)
    lines = [
        "Welcome to your Large Print Coloring Book for Seniors.",
        "",
        "Each page has bold, thick black outlines and large open spaces",
        "designed to be easy to see and easy to color, even with low vision.",
        "",
        "Tips:",
        "  • Use markers, colored pencils, or crayons.",
        "  • Pages are single-sided - color one side at a time.",
        "  • Each picture has a blank page behind it to help prevent bleed-through.",
        "  • Take breaks and enjoy coloring at your own pace.",
        "",
        "Happy coloring!",
    ]
    y = PAGE_H // 4 + 200
    for line in lines:
        draw_centered(draw, line, f_body, y)
        y += 85
    return img

def make_color_test_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_title = load_font(75, bold=True)
    f_body = load_font(50, bold=False)
    draw_centered(draw, "Test Your Pens and Markers Here", f_title, PAGE_H // 4 - 50)
    
    swatch_w = 300
    swatch_h = 100
    gap = 60
    total_w = swatch_w * 3 + gap * 2
    x_start = (PAGE_W - total_w) // 2
    y_start = PAGE_H // 4 + 120
    
    for i in range(6):
        row = i // 3
        col = i % 3
        x = x_start + col * (swatch_w + gap)
        y = y_start + row * (swatch_h + 60)
        draw.rectangle([x, y, x + swatch_w, y + swatch_h], fill=(255,255,255), outline=(0,0,0), width=8)
        draw_centered_at(draw, f"Test {i+1}", f_body, y + swatch_h + 30, x + swatch_w//2)
    
    draw_centered(draw, "Color each box to try your pens and markers before coloring.", f_body, PAGE_H - 300)
    return img

def make_belongs_to_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_title = load_font(75, bold=True)
    f_body = load_font(60, bold=False)
    draw_centered(draw, "This Book Belongs To:", f_title, PAGE_H // 3)
    # Clean centered line
    line_w = 600
    x0 = (PAGE_W - line_w) // 2
    y_line = PAGE_H // 2
    draw.line([x0, y_line, x0 + line_w, y_line], fill=(0,0,0), width=8)
    return img

def make_thank_you_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_title = load_font(75, bold=True)
    f_body = load_font(50, bold=False)
    draw_centered(draw, "Thank You!", f_title, PAGE_H // 3)
    lines = [
        "Thank you for coloring with us.",
        "",
        "If you enjoyed this book, please leave a review on Amazon.",
        "Your review helps other seniors find this book too.",
    ]
    y = PAGE_H // 3 + 200
    for line in lines:
        draw_centered(draw, line, f_body, y)
        y += 90
    return img

# ---------- Build page sequence ----------
all_pages = []

# Page 1: Title
all_pages.append(("title", make_title_page()))
# Page 2: Blank (back of title)
all_pages.append(("blank", blank_page()))
# Page 3: Copyright
all_pages.append(("copyright", make_copyright_page()))
# Page 4: Blank
all_pages.append(("blank", blank_page()))
# Page 5: How to Use
all_pages.append(("howto", make_how_to_use_page()))
# Page 6: Color test
all_pages.append(("colortest", make_color_test_page()))
# Page 7: Belongs To
all_pages.append(("belongsto", make_belongs_to_page()))
# Page 8: Blank (so first illustration starts on right-hand odd page)
all_pages.append(("blank", blank_page()))

# 40 illustrations - alternate types for variety
# Order: flower, garden, landscape, bird, nostalgic, repeat
illustrations = [
    # 14 existing (kept)
    ("page_rose.png", "flower"),
    ("page_sunflower.png", "flower"),
    ("page_tulip.png", "flower"),
    ("page_daisy.png", "flower"),
    ("page_potted_plant.png", "garden"),
    ("page_watering_can.png", "garden"),
    ("page_garden_bench.png", "garden"),
    ("page_butterfly.png", "garden"),
    ("page_teacup.png", "nostalgic"),
    ("page_tree.png", "nature"),
    ("page_coffee_mug.png", "nostalgic"),
    ("page_teapot.png", "nostalgic"),
    ("page_apple.png", "nature"),
    ("page_cupcake.png", "nostalgic"),
    # 26 new
    ("page_hydrangea.png", "flower"),
    ("page_lily.png", "flower"),
    ("page_poppy.png", "flower"),
    ("page_birdhouse.png", "garden"),
    ("page_garden_gate.png", "garden"),
    ("page_lighthouse.png", "landscape"),
    ("page_country_cottage.png", "landscape"),
    ("page_red_barn.png", "landscape"),
    ("page_windmill.png", "landscape"),
    ("page_covered_bridge.png", "landscape"),
    ("page_sailboat.png", "landscape"),
    ("page_cardinal.png", "bird"),
    ("page_robin.png", "bird"),
    ("page_hummingbird.png", "bird"),
    ("page_swan.png", "nature"),
    ("page_rocking_chair.png", "nostalgic"),
    ("page_old_lantern.png", "nostalgic"),
    ("page_bicycle.png", "nostalgic"),
    ("page_vintage_car.png", "nostalgic"),
    ("page_sewing_machine.png", "nostalgic"),
    ("page_basket_apples.png", "nature"),
    ("page_daffodils.png", "flower"),
    ("page_wheelbarrow.png", "garden"),
    ("page_picnic_basket.png", "nostalgic"),
    ("page_kettle.png", "nostalgic"),
    ("page_pumpkin_patch.png", "nature"),
]

for fname, _ in illustrations:
    fpath = os.path.join(BOOK_DIR, fname)
    if os.path.exists(fpath):
        processed = fit_design_to_page(fpath)
        all_pages.append((fname, processed))
    else:
        print(f"WARNING: {fname} not found")
    all_pages.append((f"blank_after_{fname}", blank_page()))

# Thank You page
all_pages.append(("thankyou", make_thank_you_page()))

# Make total even
if len(all_pages) % 2 != 0:
    all_pages.append(("blank_end", blank_page()))

# Export
page_images = [img for _, img in all_pages]
page_images[0].save(
    OUTPUT_PDF,
    save_all=True,
    append_images=page_images[1:],
    resolution=300.0,
    quality=95,
)

print(f"PDF saved: {OUTPUT_PDF}")
print(f"Total pages: {len(all_pages)} (even: {len(all_pages) % 2 == 0})")
spine = len(all_pages) * 0.002252
print(f"Spine width (white paper): {spine:.5f} in")
print("\nPage order:")
for i, (name, _) in enumerate(all_pages, 1):
    print(f"  {i:3d}. {name}")
