"""
audit_fill.py — how much of each text block a page actually uses.

The trace cannot answer this: content modules keep their own y cursor, so the engine's
cursor stays at the top of the page. The honest measure is ink on the raster — where the
lowest non-furniture mark sits on each page.

    python audit_fill.py [--png DIR]

Prints pages whose ink stops more than 1.6 in above the bottom margin, i.e. pages with a
visible dead band at the foot. Those are the pages to either fill with writing room or
re-cut; a 120-page book should not have them.
"""
import os
import sys

import pypdfium2 as pdfium

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(os.path.dirname(HERE), "build")
PDF = os.path.join(BUILD, "fro_interior.pdf")

CONTENT_BOT_IN = 0.80
FOOT_BAND_IN = 0.70      # everything below this is page furniture
SCALE = 1.2
THRESH = 240


def main():
    pdf = pdfium.PdfDocument(PDF)
    rows = []
    for i in range(len(pdf)):
        img = pdf[i].render(scale=SCALE).to_pil().convert("L")
        w, h = img.size
        px = img.load()
        # ignore the footer band (rule + folio) so it cannot flatter the measurement
        y_cut = int(h - FOOT_BAND_IN * 72 * SCALE)
        lowest = None
        for yy in range(y_cut):
            hit = False
            for xx in range(w):
                if px[xx, yy] < THRESH:
                    hit = True
                    break
            if hit:
                lowest = yy          # keep the last (lowest on the page) hit
        if lowest is None:
            rows.append((i + 1, 11.0, 11.0, 0.0))
            continue
        y_in = (h - 1 - lowest) / (72.0 * SCALE)
        rows.append((i + 1, round(y_in, 2), round(y_in - CONTENT_BOT_IN, 2), 0.0))

    print("%-6s %-8s %-8s" % ("page", "ink_bot", "dead_in"))
    short = [r for r in rows if r[2] > 1.60]
    for r in rows:
        print("%-6d %-8.2f %-8.2f %s" % (r[0], r[1], r[2],
                                         "<-- dead band" if r[2] > 1.60 else ""))
    print()
    print("pages: %d" % len(rows))
    print("pages with more than 1.6 in of dead space at the foot: %d" % len(short))
    print("  %s" % [r[0] for r in short])
    return 0


if __name__ == "__main__":
    sys.exit(main())
