#!/usr/bin/env python3
"""Assemble the senior-friendly coloring book into a print-ready KDP PDF."""
from PIL import Image, ImageDraw, ImageFont
import os

BOOK_DIR = "/home/user/Parth-/book_images"
OUTPUT_PDF = "/home/user/Parth-/LARGE_PRINT_COLORING_BOOK_SENIORS.pdf"
PAGE_W, PAGE_H = 2550, 3300  # 8.5x11 at 300 DPI

def make_blank_page(name):
    """Create a pure white blank page."""
    img = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    img.save(os.path.join(BOOK_DIR, name), quality=95)
    print(f"Created blank: {name}")

def make_simple_page(name, subject_desc):
    """Create a simple bold-line coloring page programmatically."""
    img = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    draw = ImageDraw.Draw(img)
    
    cx, cy = PAGE_W // 2, PAGE_H // 2
    
    # Draw based on subject
    if "vase" in subject_desc:
        # Simple vase with flowers
        draw.rectangle([cx-60, cy+200, cx+60, cy+400], fill="black", width=0)  # vase body
        draw.rectangle([cx-30, cy+400, cx+30, cy+450], fill="black", width=0)  # base
        for i in range(3):
            x = cx + (i-1)*120
            draw.line([x, cy+200, x-80, cy-300], fill="black", width=15)  # stems
            draw.ellipse([x-100, cy-350, x+60, cy-230], outline="black", width=15)  # flower
    elif "open_book" in subject_desc:
        # Simple open book
        draw.rectangle([cx-400, cy-300, cx, cy+300], outline="black", width=15)  # left page
        draw.rectangle([cx, cy-300, cx+400, cy+300], outline="black", width=15)  # right page
        draw.line([cx, cy-300, cx, cy+300], fill="black", width=15)  # spine
    elif "beach_chair" in subject_desc:
        # Simple beach chair
        draw.rectangle([cx-150, cy+200, cx+150, cy+400], outline="black", width=15)  # seat
        draw.line([cx-150, cy+200, cx-100, cy-300], fill="black", width=15)  # left leg
        draw.line([cx+150, cy+200, cx+100, cy-300], fill="black", width=15)  # right leg
        draw.line([cx-100, cy-300, cx+100, cy-300], fill="black", width=15)  # back
    elif "moon_stars" in subject_desc:
        # Crescent moon and stars
        draw.ellipse([cx-150, cy-150, cx+150, cy+150], outline="black", width=15)  # full moon
        draw.ellipse([cx-80, cy-150, cx+220, cy+150], fill="white", width=0)  # cutout for crescent
        for sx, sy in [(cx-300, cy-300), (cx+300, cy-300), (cx, cy-200)]:
            draw.polygon([(sx, sy-60), (sx+25, sy-15), (sx+60, sy-15), (sx+35, sy+25), (sx+45, sy+60), (sx, sy+35), (sx-45, sy+60), (sx-35, sy+25), (sx-60, sy-15), (sx-25, sy-15)], outline="black", width=15)
    elif "heart" in subject_desc:
        # Simple heart
        draw.ellipse([cx-120, cy-120, cx, cy], outline="black", width=15)
        draw.ellipse([cx, cy-120, cx+120, cy], outline="black", width=15)
        draw.polygon([(cx-120, cy), (cx, cy+200), (cx+120, cy)], outline="black", width=15)
    elif "hot_air_balloon" in subject_desc:
        # Simple hot air balloon
        draw.ellipse([cx-150, cy-200, cx+150, cy+100], outline="black", width=15)  # balloon
        draw.line([cx, cy+100, cx, cy+250], fill="black", width=15)  # rope
        draw.rectangle([cx-40, cy+250, cx+40, cy+300], outline="black", width=15)  # basket
    
    img.save(os.path.join(BOOK_DIR, name), quality=95)
    print(f"Created simple page: {name}")

def make_title_page():
    """Create title page."""
    img = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 120)
    except:
        font = ImageFont.load_default()
    
    title = "LARGE PRINT COLORING BOOK FOR SENIORS"
    subtitle = "Easy Bold Lines - Flowers, Nature, and Simple Scenes"
    
    # Center text
    bbox = draw.textbbox((0, 0), title, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((PAGE_W - tw) // 2, PAGE_H // 2 - 100), title, fill="black", font=font)
    
    try:
        font2 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 60)
    except:
        font2 = ImageFont.load_default()
    bbox2 = draw.textbbox((0, 0), subtitle, font=font2)
    tw2 = bbox2[2] - bbox2[0]
    draw.text(((PAGE_W - tw2) // 2, PAGE_H // 2 + 100), subtitle, fill="black", font=font2)
    
    img.save(os.path.join(BOOK_DIR, "title_page.png"), quality=95)
    print("Created title page")

def make_copyright_page():
    """Create copyright page."""
    img = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 50)
    except:
        font = ImageFont.load_default()
    
    lines = [
        "Large Print Coloring Book for Seniors",
        "Easy Bold Lines - Flowers, Nature, and Simple Scenes",
        "",
        "Designed for seniors with low vision",
        "Bold thick outlines, large open spaces, single-sided pages",
        "",
        "Copyright 2026. All rights reserved.",
        "ISBN: [Assigned by KDP]",
        "",
        "Printed in the USA",
    ]
    y = PAGE_H // 2 - 200
    for line in lines:
        draw.text((PAGE_W // 4, y), line, fill="black", font=font)
        y += 80
    
    img.save(os.path.join(BOOK_DIR, "copyright_page.png"), quality=95)
    print("Created copyright page")

def fit_to_page(img_path):
    """Open image and fit to page dimensions, centered on white background."""
    img = Image.open(img_path).convert("RGB")
    # Fit within page with margins
    margin = 100
    max_w = PAGE_W - 2 * margin
    max_h = PAGE_H - 2 * margin
    
    img_w, img_h = img.size
    scale = min(max_w / img_w, max_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    
    canvas = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    canvas.paste(img, ((PAGE_W - new_w) // 2, (PAGE_H - new_h) // 2))
    return canvas

# Create blank pages
print("=== Creating blank pages ===")
make_blank_page("blank_front_inside.png")
make_blank_page("blank_back_inside.png")

# Create missing simple pages
print("\n=== Creating missing interior pages ===")
make_simple_page("page_vase.png", "vase")
make_simple_page("page_open_book.png", "open_book")
make_simple_page("page_beach_chair.png", "beach_chair")
make_simple_page("page_moon_stars.png", "moon_stars")
make_simple_page("page_heart.png", "heart")
make_simple_page("page_hot_air_balloon.png", "hot_air_balloon")

# Create title and copyright pages
print("\n=== Creating title and copyright pages ===")
make_title_page()
make_copyright_page()

# Build page order
# KDP PDF order: cover, blank, title, copyright, blank, then illustration/blank pairs, then back cover
page_files = [
    "sample_cover.png",           # Page 1: Front cover
    "blank_front_inside.png",     # Page 2: Blank (inside front cover)
    "title_page.png",             # Page 3: Title page
    "copyright_page.png",         # Page 4: Copyright page
    "blank_back_inside.png",      # Page 5: Blank
]

# Interior illustrations - 25 pages, each followed by a blank back
interior_pages = [
    "page_rose.png",
    "page_sunflower.png",
    "page_tulip.png",
    "page_daisy.png",
    "page_potted_plant.png",
    "page_watering_can.png",
    "page_garden_bench.png",
    "page_owl.png",
    "page_cat.png",
    "page_dog.png",
    "page_robin.png",
    "page_butterfly.png",
    "page_turtle.png",
    "page_teacup.png",
    "page_tree.png",
    "page_coffee_mug.png",
    "page_teapot.png",
    "page_apple.png",
    "page_cupcake.png",
    "page_vase.png",
    "page_open_book.png",
    "page_beach_chair.png",
    "page_moon_stars.png",
    "page_heart.png",
    "page_hot_air_balloon.png",
]

for ill in interior_pages:
    page_files.append(ill)           # Illustration on right side (odd page)
    page_files.append("blank_back_inside.png")  # Blank on left side (back of illustration)

page_files.append("back_cover.png")  # Last page: Back cover

print(f"\n=== Assembling PDF with {len(page_files)} pages ===")
all_pages = []
for pf in page_files:
    path = os.path.join(BOOK_DIR, pf)
    if os.path.exists(path):
        page = fit_to_page(path)
        all_pages.append(page)
        print(f"  Added: {pf}")
    else:
        print(f"  MISSING: {pf}")

if all_pages:
    all_pages[0].save(
        OUTPUT_PDF,
        save_all=True,
        append_images=all_pages[1:],
        resolution=300.0,
        quality=95,
    )
    print(f"\nPDF saved: {OUTPUT_PDF}")
    print(f"Total pages: {len(all_pages)}")
else:
    print("ERROR: No pages to assemble!")
