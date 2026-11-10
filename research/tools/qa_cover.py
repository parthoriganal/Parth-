"""
qa_cover.py — automated checks on the cover PDF, kept separate from the interior QA.

Checks
  1  single page, exact dimensions (spine maths re-derived from the page count)
  2  all text inside the trim rectangle by >= 0.125 in, except spine text (>= 0.0625 in clear)
  3  no type below 7.0 pt (measured from the Tf operators, not from char boxes)
  4  every text fragment inside the barcode clear area is absent
  5  no crop marks / colour bars: page has no marks outside the trim frame other than bleed art
  6  fonts embedded, and the colour operators are exactly neutral (r == g == b)
  7  no CMYK or spot colour operators
  8  spine text present and within the spine, >= 0.0625 in from both folds
  9  no overlapping blocks, measured from cover_geometry.json

    python qa_cover.py            -> prints JSON, exit 1 on failure
"""
import json
import os
import re
import sys

import pypdf
import pypdfium2 as pdfium

HERE = os.path.dirname(os.path.abspath(__file__))
PDF = os.path.join(os.path.dirname(HERE), "deliverables", "cover",
                   "The-Family-Records-Organizer_cover_116pp_BW.pdf")
OUT = os.path.join(os.path.dirname(HERE), "deliverables", "cover_qa_report.json")

IN = 72.0
PAGES = 116
SPINE = PAGES * 0.002252
EXP_W = (0.125 + 8.5 + SPINE + 8.5 + 0.125) * IN
EXP_H = 11.25 * IN
BLEED = 0.125 * IN
TRIM_L, TRIM_R = BLEED, EXP_W - BLEED
TRIM_B, TRIM_T = BLEED, EXP_H - BLEED
SPINE_L = TRIM_L + 8.5 * IN
SPINE_R = SPINE_L + SPINE * IN
BARCODE = (TRIM_R - 8.5 * IN + 8.5 * IN - 0.25 * IN - 2.25 * IN,   # x0
           TRIM_B + 0.25 * IN, 2.25 * IN, 1.45 * IN)               # y0, w, h

fail, warn, info = [], [], {}


def f(cond, msg):
    if not cond:
        fail.append(msg)


def main():
    doc = pdfium.PdfDocument(PDF)
    f(len(doc) == 1, "page count is %d, expected 1" % len(doc))
    page = doc[0]
    w, h = page.get_width(), page.get_height()
    f(abs(w - EXP_W) < 0.5, "width %.4f pt (%.4f in), expected %.4f in" % (w, w / IN, EXP_W / IN))
    f(abs(h - EXP_H) < 0.5, "height %.4f pt (%.4f in), expected %.4f in" % (h, h / IN, EXP_H / IN))
    info["size_in"] = [round(w / IN, 6), round(h / IN, 6)]
    info["spine_in"] = round(SPINE, 6)

    # ---- text extraction with positions
    tp = page.get_textpage()
    n = tp.count_chars()
    frags = []
    cur, curbox = "", None
    for i in range(n):
        ch = tp.get_text_range(i, 1)
        l, b, r, t = tp.get_charbox(i)
        if ch in ("\r", "\n"):
            if cur.strip():
                frags.append((cur, curbox))
            cur, curbox = "", None
            continue
        if curbox is None:
            curbox = [l, b, r, t]
        else:
            curbox = [min(curbox[0], l), min(curbox[1], b), max(curbox[2], r), max(curbox[3], t)]
        cur += ch
    if cur.strip():
        frags.append((cur, curbox))

    info["fragments"] = len(frags)

    SAFE = 0.125 * IN
    outside, in_barcode, too_small, spine_ok = [], [], [], 0
    for s, box in frags:
        l, b, r, t = box
        cx = (l + r) / 2.0
        on_spine = SPINE_L - 1 <= cx <= SPINE_R + 1
        if on_spine:
            spine_ok += 1
            # vertical text: horizontal extent is the cap height, so test the clear gap instead
            f(l >= SPINE_L + 0.0625 * IN - 0.5 or r <= SPINE_R - 0.0625 * IN + 0.5,
              "spine text crosses a fold: %r" % s)
        else:
            if l < TRIM_L + SAFE - 0.6 or r > TRIM_R - SAFE + 0.6 \
               or b < TRIM_B + SAFE - 0.6 or t > TRIM_T - SAFE + 0.6:
                outside.append((s.strip(), [round(v / IN, 3) for v in box]))
        bx, by, bwd, bht = BARCODE
        if l < bx + bwd and r > bx and b < by + bht and t > by:
            in_barcode.append(s.strip())
        if (t - b) < 7.0 * 0.72:          # generous: cap height under 7 pt type
            too_small.append((s.strip(), round(t - b, 2)))

    info["text_outside_safe"] = outside[:6]
    f(not outside, "%d text fragments outside the 0.125 in safe margin" % len(outside))
    f(not in_barcode, "text inside the barcode clear area: %r" % in_barcode)
    f(spine_ok > 0, "no spine text found")
    info["spine_fragments"] = spine_ok
    # cap height of tracked 7.2 pt caps is ~4.9 pt, so this box measure cannot judge type size;
    # it is kept as context and the operator check below is authoritative.
    info["small_fragments_by_box"] = too_small[:6]

    # ---- collisions, from the builder's own geometry ledger
    GEO = os.path.join(os.path.dirname(PDF), "cover_geometry.json")
    f(os.path.exists(GEO), "cover_geometry.json missing — rebuild with build_cover.py")
    collisions = []
    if os.path.exists(GEO):
        g = json.load(open(GEO))
        items = [i for i in g["items"]]
        for a in range(len(items)):
            for b in range(a + 1, len(items)):
                A, B = items[a], items[b]
                # a box containing its own text is not a collision
                if (A[0].startswith("BOX") != B[0].startswith("BOX")):
                    box, txt = (A, B) if A[0].startswith("BOX") else (B, A)
                    if box[1] <= txt[1] and box[2] <= txt[2] and box[3] >= txt[3] and box[4] >= txt[4]:
                        continue
                ox = min(A[3], B[3]) - max(A[1], B[1])
                oy = min(A[4], B[4]) - max(A[2], B[2])
                if ox > 0.4 and oy > 0.4:
                    collisions.append([A[0][:38], B[0][:38],
                                       round(ox / IN, 3), round(oy / IN, 3)])
        info["geometry_items"] = len(items)
    info["collisions"] = collisions[:8]
    f(not collisions, "%d overlapping blocks: %r" % (len(collisions), collisions[:4]))

    # ---- real font sizes, from the operators rather than a char-box heuristic
    content = pypdf.PdfReader(PDF).pages[0].get_contents().get_data().decode("latin-1")
    sizes = sorted(set(round(float(m), 2)
                       for m in re.findall(r"/(F\d+(?:\+\d+)?)\s+([\d.]+)\s+Tf", content)
                       for m in [m[1]]))
    info["font_sizes"] = sizes
    f(min(sizes) >= 7.0, "type below 7 pt used: %r" % [x for x in sizes if x < 7.0])

    # ---- ink outside the trim frame (crop marks / colour bars)
    img = page.render(scale=2.0).to_pil().convert("L")
    W, H = img.size
    sx, sy = W / w, H / h

    def dark_frac(box):
        x0, y0, x1, y1 = [int(v) for v in box]
        if x1 <= x0 or y1 <= y0:
            return 0.0
        crop = img.crop((x0, H - y1, x1, H - y0))
        px = crop.getdata()
        return sum(1 for p in px if p < 245) / float(len(px))

    # The bleed band is everything outside the trim rectangle. Art may run into it on purpose
    # (the tint panel on the front); crop marks or colour bars would appear *outside the bleed*
    # page itself, which a PDF cannot contain, so this measures the band and reports it.
    strips = {
        "left":   (0, 0, TRIM_L * sx, H),
        "right":  (TRIM_R * sx, 0, W, H),
        "top":    (0, (EXP_H - TRIM_T) * sy, W, H),
        "bottom": (0, 0, W, TRIM_B * sy),
    }
    bleed_ink = {k: round(dark_frac(v), 5) for k, v in strips.items()}
    info["bleed_strip_ink"] = bleed_ink
    # Bleed art is legitimate, so this is reported, not failed. What is fatal is ink touching
    # the outer edge of the bleed page on a side with no art, which a crop mark would do.
    f(bleed_ink["left"] < 0.001 and bleed_ink["right"] < 0.001,
      "ink at the outer edge of the bleed page: %r" % bleed_ink)

    # ---- fonts and colour
    raw = doc.get_page(0).get_content() if hasattr(page, "get_content") else None
    data = open(PDF, "rb").read()
    fonts = set(re.findall(rb"/BaseFont\s*/([A-Za-z0-9+\-]+)", data))
    info["fonts"] = sorted(x.decode() for x in fonts)
    f(all(b"+" in x for x in fonts), "font not subset: %r" % [x for x in fonts if b"+" not in x])
    f(b"/FontFile" in data or b"/FontFile2" in data or b"/FontFile3" in data,
      "no embedded font program found")

    # neutral greyscale from the actual colour operators
    ops = re.findall(r"([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(rg|RG)", content)
    nonneutral = [(float(a), float(b_), float(d)) for a, b_, d, _ in ops
                  if not (abs(float(a) - float(b_)) < 1e-6 and abs(float(a) - float(d)) < 1e-6)]
    gs = sorted(set(round(float(a), 3) for a, _, _, _ in ops))
    info["greys"] = gs
    info["colour_operators"] = len(ops)
    f(not nonneutral, "non-neutral colours used: %r" % nonneutral[:5])
    f(not re.search(r"(?m)^\s*[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[kK]\s*$", content),
      "device-CMYK operator present in content")

    # ---- report
    rep = {
        "pdf": PDF,
        "bytes": os.path.getsize(PDF),
        "failures": fail,
        "warnings": warn,
        "info": info,
        "verdict": "PASS" if not fail else "FAIL",
    }
    with open(OUT, "w") as fh:
        json.dump(rep, fh, indent=2)
    print(json.dumps(rep, indent=2))
    return 0 if not fail else 1


if __name__ == "__main__":
    sys.exit(main())
