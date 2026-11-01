#!/usr/bin/env python3
"""
Fix KDP Coloring Book Interior PDF for "Large Print Coloring Book for Seniors"
Requirements:
1. Interior only - no front/back cover
2. Remove broken end pages
3. Fix title page (wrapped, centered, large bold)
4. Rewrite copyright page (no ISBN, no "Printed in USA", centered)
5. Add front matter: How to Use, Color Test, Belongs To
6. 19 good illustrations, each on right-hand page with blank behind
7. Improve artwork: thicker outlines, pure white bg, scale landscape up
8. Add Thank You page at end
9. Even page count, 0.375" margins, PDF with embedded fonts
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import os
import numpy as np

BOOK_DIR = "/home/user/Parth-/book_images"
OUTPUT_PDF = "/home/user/Parth-/LARGE_PRINT_COLORING_BOOK_INTERIOR.pdf"

PAGE_W = 2550   # 8.5 in at 300 DPI
PAGE_H = 3300   # 11 in at 300 DPI
MARGIN = int(0.375 * 300)   # 112 px minimum margin
CONTENT_MARGIN = int(0.5 * 300)  # 0.5 in for scaling landscape images

# ----------------------------------------------------------------
# Helper: load font
# ----------------------------------------------------------------
def load_font(size, bold=True):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf" if bold else "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

# ----------------------------------------------------------------
# Helper: create pure white blank page
# ----------------------------------------------------------------
def blank_page():
    return Image.new("RGB", (PAGE_W, PAGE_H), (255, 255, 255))

# ----------------------------------------------------------------
# Helper: center text on page
# ----------------------------------------------------------------
def draw_centered_text(draw, text, font, y, fill=(0,0,0)):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    x = (PAGE_W - w) // 2
    draw.text((x, y), text, font=font, fill=fill)

# ----------------------------------------------------------------
# Image processing: thicken outlines, force pure white, scale landscape
# ----------------------------------------------------------------
def process_illustration(img_path, is_landscape=False):
    """Load illustration, thicken outlines, force pure white bg, scale to fit."""
    img = Image.open(img_path).convert("RGB")
    arr = np.array(img)

    # Force pure white background: anything not near-black becomes white
    # Black pixels: R<100, G<100, B<100
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    is_black = (r < 100) & (g < 100) & (b < 100)
    is_near_white = (r > 240) & (g > 240) & (b > 240)

    out = np.full_like(arr, 255)
    out[is_black] = [0, 0, 0]
    # Anything gray/off-white -> white
    out[~is_black & ~is_near_white] = [255, 255, 255]

    img = Image.fromarray(out, "RGB")

    # Thicken outlines: dilate black pixels slightly
    # Convert to grayscale, threshold, dilate, convert back
    gray = img.convert("L")
    # Threshold: black = 0, white = 255
    bw = gray.point(lambda p: 0 if p < 128 else 255, mode="1")
    # Dilate using MaxFilter (3x3 = slight thickening, 5x5 = more)
    bw_thick = bw.filter(ImageFilter.MaxFilter(5))  # ~3-4 pt at 300 DPI
    # Convert back to RGB: black where bw_thick is 0
    thick_arr = np.array(bw_thick.convert("L"))
    result = np.full((PAGE_H, PAGE_W, 3), 255, dtype=np.uint8)
    # Place the thickened artwork centered, scaled to fit
    h, w = thick_arr.shape
    scale = min((PAGE_W - 2*CONTENT_MARGIN) / w, (PAGE_H - 2*CONTENT_MARGIN) / h)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))
    small = Image.fromarray(255 - thick_arr, "L").resize((new_w, new_h), Image.LANCZOS)
    small_arr = np.array(small)
    # Create mask where artwork is (black = 0 in small_arr means artwork)
    artwork_mask = small_arr < 128
    y_off = (PAGE_H - new_h) // 2
    x_off = (PAGE_W - new_w) // 2
    result[y_off:y_off+new_h, x_off:x_off+new_w][artwork_mask] = [0, 0, 0]

    return Image.fromarray(result, "RGB")

# ----------------------------------------------------------------
# Build text pages
# ----------------------------------------------------------------
def make_title_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_big = load_font(150, bold=True)
    f_sub = load_font(70, bold=False)

    # Title wrapped on 3 lines
    lines = ["LARGE PRINT", "COLORING BOOK", "FOR SENIORS"]
    y = PAGE_H // 2 - 250
    for line in lines:
        draw_centered_text(draw, line, f_big, y)
        y += 220

    # Subtitle
    draw_centered_text(draw, "Easy Bold Lines - Flowers, Nature, and Simple Scenes", f_sub, y + 60)
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
    y = PAGE_H // 2 - 180
    for line in lines:
        draw_centered_text(draw, line, f, y)
        y += 100
    return img

def make_how_to_use_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_title = load_font(80, bold=True)
    f_body = load_font(55, bold=False)

    draw_centered_text(draw, "How to Use This Book", f_title, PAGE_H // 4)

    lines = [
        "Welcome to your Large Print Coloring Book for Seniors.",
        "",
        "Each page has bold, thick black outlines and large open spaces",
        "designed to be easy to see and easy to color, even with low vision.",
        "",
        "Tips:",
        "  • Use markers, colored pencils, or crayons.",
        "  • Pages are single-sided - color one side at a time.",
        "  • Place a blank sheet behind your page to prevent bleed-through.",
        "  • Take breaks and enjoy coloring at your own pace.",
        "",
        "Happy coloring!",
    ]
    y = PAGE_H // 4 + 180
    for line in lines:
        draw_centered_text(draw, line, f_body, y)
        y += 85
    return img

def make_color_test_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_title = load_font(80, bold=True)
    f_body = load_font(60, bold=False)

    draw_centered_text(draw, "Test Your Pens and Markers Here", f_title, PAGE_H // 4)

    # Draw some large test swatches
    swatch_w = 400
    swatch_h = 120
    colors = [(0,0,0), (255,0,0), (0,128,0), (0,0,255), (255,165,0), (128,0,128)]
    y_start = PAGE_H // 4 + 150
    x_start = (PAGE_W - (swatch_w * 3 + 100)) // 2

    for i, c in enumerate(colors):
        row = i // 3
        col = i % 3
        x = x_start + col * (swatch_w + 50)
        y = y_start + row * (swatch_h + 60)
        draw.rectangle([x, y, x + swatch_w, y + swatch_h], fill=c, outline=(0,0,0), width=5)
        draw_centered_text_at(draw, f"Test {i+1}", f_body, y + swatch_h + 40, x_center=x + swatch_w//2)

    draw_centered_text(draw, "Color each box to try your pens and markers before coloring.", f_body, PAGE_H - 300)
    return img

def draw_centered_text_at(draw, text, font, y, x_center):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    x = x_center - w // 2
    draw.text((x, y), text, font=font, fill=(0,0,0))

def make_belongs_to_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_title = load_font(80, bold=True)
    f_body = load_font(70, bold=False)

    draw_centered_text(draw, "This Book Belongs To:", f_title, PAGE_H // 3)
    # Long underline
    draw.line([PAGE_W//4, PAGE_H//2, PAGE_W*3//4, PAGE_H//2], fill=(0,0,0), width=8)
    draw_centered_text(draw, "_________________________________", f_body, PAGE_H//2 + 40)
    return img

def make_thank_you_page():
    img = blank_page()
    draw = ImageDraw.Draw(img)
    f_title = load_font(80, bold=True)
    f_body = load_font(55, bold=False)

    draw_centered_text(draw, "Thank You!", f_title, PAGE_H // 3)
    lines = [
        "Thank you for coloring with us.",
        "",
        "If you enjoyed this book, please leave a review on Amazon.",
        "Your review helps other seniors find this book too.",
    ]
    y = PAGE_H // 3 + 200
    for line in lines:
        draw_centered_text(draw, line, f_body, y)
        y += 90
    return img

# ----------------------------------------------------------------
# Build the interior page sequence
# ----------------------------------------------------------------
illustrations = [
    ("page_rose.png", False),
    ("page_sunflower.png", False),
    ("page_tulip.png", False),
    ("page_daisy.png", False),
    ("page_potted_plant.png", False),
    ("page_watering_can.png", True),   # landscape
    ("page_garden_bench.png", True),   # landscape
    ("page_owl.png", False),
    ("page_cat.png", False),
    ("page_dog.png", False),
    ("page_robin.png", False),          # bird
    ("page_butterfly.png", True),       # landscape
    ("page_turtle.png", True),          # landscape
    ("page_teacup.png", True),          # landscape
    ("page_tree.png", False),
    ("page_coffee_mug.png", False),     # mug
    ("page_teapot.png", True),          # landscape
    ("page_apple.png", False),
    ("page_cupcake.png", False),
]

all_pages = []

# 1. Title page
all_pages.append(("title", make_title_page()))
# 2. Copyright page
all_pages.append(("copyright", make_copyright_page()))
# 3. How to Use
all_pages.append(("howto", make_how_to_use_page()))
# 4. Color test
all_pages.append(("colortest", make_color_test_page()))
# 5. Belongs To
all_pages.append(("belongsto", make_belongs_to_page()))

# 6-43: 19 illustrations, each followed by a blank page (right-hand illustration, blank verso)
for fname, is_land in illustrations:
    fpath = os.path.join(BOOK_DIR, fname)
    if os.path.exists(fpath):
        processed = process_illustration(fpath, is_landscape=is_land)
        all_pages.append((fname, processed))
    else:
        print(f"WARNING: {fname} not found, skipping")
    all_pages.append((f"blank_after_{fname}", blank_page()))

# 44. Thank You page
all_pages.append(("thankyou", make_thank_you_page()))

# Make total page count even
if len(all_pages) % 2 != 0:
    all_pages.append(("blank_end", blank_page()))

# ----------------------------------------------------------------
# Export as PDF
# ----------------------------------------------------------------
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
print(f"Spine width (white paper): {len(all_pages) * 0.002252:.5f} in")
print(f"\nPage breakdown:")
for i, (name, _) in enumerate(all_pages, 1):
    print(f"  {i:2d}. {name}")
