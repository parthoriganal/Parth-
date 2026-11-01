#!/usr/bin/env python3
"""
Build KDP Coloring Book Interior PDF v3 - Large Print Coloring Book for Seniors
40 designs + front matter + thank you page
All fixes applied per user requirements.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import numpy as np

BOOK_DIR = "/home/user/Parth-/book_images_v3"
OUTPUT_PDF = "/home/user/Parth-/LARGE_PRINT_COLORING_BOOK_INTERIOR_V3.pdf"

PAGE_W = 2550   # 8.5 in at 300 DPI
PAGE_H = 3300   # 11 in at 300 DPI
MARGIN = int(0.375 * 300)   # 112 px safe margin
CONTENT_MARGIN = int(0.5 * 300)  # 0.5 in for design scaling
PT_4_5 = int(4.5 * 300 / 72)  # ~19 px for 4.5 pt outline thickness

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

def process_design(img_path):
    """Load design, force pure white bg, pure black lines, thicken outlines to 4-5 pt, scale to fill page."""
    img = Image.open(img_path).convert("L")
    # Threshold: dark becomes black, everything else pure white
    bw = img.point(lambda p: 0 if p < 140 else 255, mode="1")
    img_bw = bw.convert("L")
    
    # Check if image is mostly black (inverted), invert if needed
    arr = np.array(img_bw)
    dark_frac = (arr < 128).mean()
    if dark_frac > 0.5:
        img_bw = Image.fromarray(255 - arr, mode="L")
    
    # Thicken outlines: dilate black pixels using MaxFilter
    # 4-5 pt at 300 DPI = ~17-21 px thick
    # MaxFilter(19) gives ~18-20 px thick lines from thin originals
    thick = img_bw.filter(ImageFilter.MaxFilter(19))
    
    # Resize to fit within content margins
    img_w, img_h = thick.size
    scale = min((PAGE_W - 2*CONTENT_MARGIN) / img_w, (PAGE_H - 2*CONTENT_MARGIN) / img_h)
    
    # For landscape images, try rotating 90 degrees if it lets them print larger
    if img_w > img_h:
        scale_rotated = min((PAGE_W - 2*CONTENT_MARGIN) / img_h, (PAGE_H - 2*CONTENT_MARGIN) / img_w)
        if scale_rotated > scale:
            thick = thick.rotate(-90, expand=True)
            img_w, img_h = thick.size
            scale = min((PAGE_W - 2*CONTENT_MARGIN) / img_w, (PAGE_H - 2*CONTENT_MARGIN) / img_h)
    
    new_w = max(1, int(img_w * scale))
    new_h = max(1, int(img_h * scale))
    thick = thick.resize((new_w, new_h), Image.LANCZOS)
    
    # Paste onto pure white page, centered
    canvas = Image.new("RGB", (PAGE_W, PAGE_H), (255, 255, 255))
    canvas.paste(thick, ((PAGE_W - new_w) // 2, (PAGE_H - new_h) // 2))
    return canvas

# ---------- Text Pages ----------

def make_title_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_big = load_font(140, bold=True)
    f_sub = load_font(65, bold=False)
    lines = ["LARGE PRINT", "COLORING BOOK", "FOR SENIORS"]
    y = PAGE_H // 2 - 300
    for line in lines:
        draw_centered(draw, line, f_big, y)
        y += 240
    draw_centered(draw, "40 Bold & Easy Designs: Flowers, Gardens, Birds & Cozy Nostalgic Scenes", f_sub, y + 60)
    return img

def make_copyright_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f = load_font(55, bold=False)
    lines = [
        "Copyright \u00a9 2026 Parth Gosara. All rights reserved.",
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
    f_body = load_font(75, bold=False)  # 18 pt body text
    draw_centered(draw, "How to Use This Book", f_title, PAGE_H // 4)
    lines = [
        "Welcome to your Large Print Coloring Book for Seniors.",
        "",
        "Each page has bold, thick black outlines and large open spaces",
        "designed to be easy to see and easy to color, even with low vision.",
        "",
        "Tips:",
        "  Use markers, colored pencils, or crayons.",
        "  Pages are single-sided - color one side at a time.",
        "  Each picture has a blank page behind it to help prevent bleed-through.",
        "  Take breaks and enjoy coloring at your own pace.",
        "",
        "Happy coloring!",
    ]
    y = PAGE_H // 4 + 220
    for line in lines:
        draw_centered(draw, line, f_body, y)
        y += 100
    return img

def make_color_test_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_title = load_font(75, bold=True)
    f_body = load_font(55, bold=False)
    draw_centered(draw, "Test Your Pens and Markers Here", f_title, PAGE_H // 4 - 80)
    
    swatch_w = 340
    swatch_h = 130
    gap = 120
    cols = 2
    rows = 3
    total_w = swatch_w * cols + gap * (cols - 1)
    x_start = (PAGE_W - total_w) // 2
    y_start = PAGE_H // 4 + 60
    clear_space = int(0.3 * 300)  # 90 px
    
    for i in range(6):
        row = i // cols
        col = i % cols
        x = x_start + col * (swatch_w + gap)
        y = y_start + row * (swatch_h + clear_space + 60 + 60)  # box + clear + label + gap
        draw.rectangle([x, y, x + swatch_w, y + swatch_h], fill=(255,255,255), outline=(0,0,0), width=10)
        # Label below box with 0.3 in clear space
        label_y = y + swatch_h + clear_space
        draw_centered_at(draw, f"Test {i+1}", f_body, label_y, x + swatch_w//2)
    
    draw_centered(draw, "Color each box to try your pens and markers before coloring.", f_body, PAGE_H - 350)
    return img

def make_belongs_to_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_title = load_font(75, bold=True)
    draw_centered(draw, "This Book Belongs To:", f_title, PAGE_H // 3)
    # Clean centered line, 4 in wide = 1200 px
    line_w = 1200
    x0 = (PAGE_W - line_w) // 2
    y_line = PAGE_H // 2
    draw.line([x0, y_line, x0 + line_w, y_line], fill=(0,0,0), width=10)
    return img

def make_thank_you_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_title = load_font(75, bold=True)
    f_body = load_font(55, bold=False)
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

# Front matter - each on right-hand (odd) page with blank behind
all_pages.append(("title", make_title_page()))           # Page 1 (odd)
all_pages.append(("blank", blank_page()))                # Page 2
all_pages.append(("copyright", make_copyright_page()))   # Page 3 (odd)
all_pages.append(("blank", blank_page()))                # Page 4
all_pages.append(("howto", make_how_to_use_page()))      # Page 5 (odd)
all_pages.append(("blank", blank_page()))                # Page 6
all_pages.append(("colortest", make_color_test_page()))  # Page 7 (odd)
all_pages.append(("blank", blank_page()))                # Page 8
all_pages.append(("belongsto", make_belongs_to_page()))  # Page 9 (odd)
all_pages.append(("blank", blank_page()))                # Page 10

# 40 illustrations - alternate types for variety
# Order: flower, garden, landscape, bird, nostalgic, repeat
# Replacements: coffee mug → birdbath, kettle → picket fence
final_40 = [
    # 14 existing (kept from v2)
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
    ("page_birdbath.png", "garden"),        # replaces coffee mug
    ("page_teapot.png", "nostalgic"),
    ("page_apple.png", "nature"),
    ("page_cupcake.png", "nostalgic"),
    # 26 new (some redrawn simpler)
    ("page_hydrangea.png", "flower"),       # redrawn simpler
    ("page_lily.png", "flower"),
    ("page_poppy.png", "flower"),           # redrawn simpler
    ("page_birdhouse.png", "garden"),
    ("page_garden_gate.png", "garden"),     # redrawn simpler
    ("page_lighthouse.png", "landscape"),
    ("page_country_cottage.png", "landscape"),
    ("page_red_barn.png", "landscape"),
    ("page_windmill.png", "landscape"),     # redrawn
    ("page_covered_bridge.png", "landscape"), # redrawn simpler
    ("page_sailboat.png", "landscape"),     # redrawn
    ("page_cardinal.png", "bird"),
    ("page_robin.png", "bird"),
    ("page_hummingbird.png", "bird"),
    ("page_swan.png", "nature"),
    ("page_rocking_chair.png", "nostalgic"),
    ("page_old_lantern.png", "nostalgic"),
    ("page_bicycle.png", "nostalgic"),      # redrawn simpler
    ("page_vintage_car.png", "nostalgic"),
    ("page_sewing_machine.png", "nostalgic"),
    ("page_basket_apples.png", "nature"),
    ("page_daffodils.png", "flower"),
    ("page_wheelbarrow.png", "garden"),     # redrawn
    ("page_picnic_basket.png", "nostalgic"),
    ("page_picket_fence.png", "garden"),    # replaces kettle
    ("page_pumpkin_patch.png", "nature"),   # redrawn simpler
]

print(f"Total illustrations: {len(final_40)}")

for fname, _ in final_40:
    fpath = os.path.join(BOOK_DIR, fname)
    if os.path.exists(fpath):
        processed = process_design(fpath)
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
