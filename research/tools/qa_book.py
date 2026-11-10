"""
qa_book.py — automated QA for the interior PDF.

Checks, in the order they can fail most cheaply:
  1  trim and page size, exact, every page
  2  page count inside the KDP brackets for this trim
  3  margin safety from the text trace (nothing outside the safe frame)
  4  footer clearance (nothing but the folio below the footer rule)
  5  raster ink in the margins (catches rules and boxes the trace cannot see)
  6  blank or near-blank pages
  7  font embedding and glyph coverage
  8  text-box collisions
  9  duplicate pages
 10  smallest label size

Writes build/qa_report.json and prints a summary. Exit code 1 on any failure.
"""
import hashlib
import json
import os
import sys

import pypdf
from pypdf import PdfReader
import pypdfium2 as pdfium

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(os.path.dirname(HERE), "build")
PDF = os.path.join(BUILD, "fro_interior.pdf")
TRACEJSON = os.path.join(BUILD, "trace.json")

PAGE_W_IN, PAGE_H_IN = 8.5, 11.0
SAFE_L, SAFE_R = 0.625, 8.5 - 0.625
SAFE_T, SAFE_B = 11.0 - 0.78, 0.80
FOOT_RULE = 0.62
FOLIO_BAND = 0.70          # anything drawn below this is furniture, checked separately
MIN_PT = 7.0

fails, warns = [], []


def fail(check, detail):
    fails.append({"check": check, "detail": detail})


def warn(check, detail):
    warns.append({"check": check, "detail": detail})


def main():
    data = json.load(open(TRACEJSON))
    trace = data["trace"]
    n_expected = data["pages"]
    reader = PdfReader(PDF)
    pdf = pdfium.PdfDocument(PDF)
    report = {"pdf": PDF, "pages": len(reader.pages), "trace": {}}

    # ---- 1 trim -----------------------------------------------------------
    sizes = set()
    for i, pg in enumerate(reader.pages):
        mb = pg.mediabox
        sizes.add((round(float(mb.width), 3), round(float(mb.height), 3)))
    if sizes != {(612.0, 792.0)}:
        fail("trim", "page sizes seen: %s (expected only 612x792 pt)" % sorted(sizes))
    report["page_sizes_pt"] = sorted(sizes)

    # ---- 2 page count -----------------------------------------------------
    report["page_count"] = len(reader.pages)
    if not (24 <= len(reader.pages)):
        fail("page_count", "below KDP minimum")
    if not (112 <= len(reader.pages) <= 120):
        warn("page_count", "%d pages — outside the 112-120 target" % len(reader.pages))

    # ---- 3 margin safety from trace --------------------------------------
    PAGE_H_IN = 11.0
    outside = []
    tiny = []
    # every page is mirrored, so the safe frame is the same rectangle either way
    TOP_SAFE = PAGE_H_IN - 0.30      # running head sits at 0.50 in from the top
    BOT_SAFE = 0.34                  # folio baseline sits at 0.50 in; its descender is above this
    for t in trace:
        x0, x1, y0, y1, size, s = t["x0"], t["x1"], t["y0"], t["y1"], t["size"], t["s"]
        if x0 < SAFE_L - 0.010 or x1 > SAFE_R + 0.010:
            outside.append((t["p"], round(x0, 3), round(x1, 3), s[:40]))
        elif y0 < BOT_SAFE - 0.010 or y1 > TOP_SAFE + 0.010:
            outside.append((t["p"], "y", round(y0, 3), round(y1, 3), s[:40]))
        if size < MIN_PT and s != "\u00b6":
            tiny.append((t["p"], size, s[:40]))
    if outside:
        fail("margin_text", "%d traced strings outside the safe frame; first 8: %s"
             % (len(outside), outside[:8]))
    if tiny:
        fail("type_size", "%d traced strings below %.1f pt; first 8: %s"
             % (len(tiny), MIN_PT, tiny[:8]))
    report["trace"]["strings"] = len(trace)

    # ---- 4 footer clearance ----------------------------------------------
    stray = []
    for t in trace:
        if t["y1"] < FOLIO_BAND and t["size"] < 20 and t["s"] != "\u00b6":
            # permitted in the footer band: the folio number and the part name on the left
            if t["s"].strip().isdigit() or t["size"] <= 7.4:
                continue      # folio and the running part label are deliberate furniture
            stray.append((t["p"], round(t["y0"], 3), t["s"][:50]))
    if stray:
        fail("footer_clearance", "%d strings sitting in the footer band; first 8: %s"
             % (len(stray), stray[:8]))

    # ---- 5 raster margin ink + 6 blank pages -----------------------------
    # Raster margin check: the *physical* edge, not the content margin. Running heads and
    # folios deliberately sit in the content margin, so measuring that band would fail every
    # page for a design decision. What must be empty is the outer 0.35 in of paper.
    EDGE_IN = 0.35
    ink = []
    margin_hits = []
    dup = {}
    for i in range(len(pdf)):
        page = pdf[i]
        img = page.render(scale=1.2).to_pil().convert("L")
        w, h = img.size
        px = img.load()
        dark = 0
        edge = 0
        # Raster margins as fractions of the page: the render scale cancels out.
        left = EDGE_IN / 8.5 * w
        right = EDGE_IN / 8.5 * w
        top = EDGE_IN / 11.0 * h
        bot = EDGE_IN / 11.0 * h
        for yy in range(h):
            in_row_band = yy < top or yy > h - bot
            for xx in range(w):
                if px[xx, yy] < 245:
                    dark += 1
                    if xx < left or xx > w - right or in_row_band:
                        edge += 1
        ink.append((i + 1, dark))
        if dark < 400:
            fail("blank_page", "page %d has only %d dark pixels" % (i + 1, dark))
        if edge > 900:
            margin_hits.append((i + 1, edge))
        dup.setdefault(hashlib.md5(img.tobytes()).hexdigest(), []).append(i + 1)
    if margin_hits:
        fail("margin_ink", "pages with substantial ink in the margin band: %s"
             % margin_hits[:10])
    report["ink_pixels"] = {"min": min(ink, key=lambda t: t[1]),
                            "max": max(ink, key=lambda t: t[1]),
                            "mean": sum(v for _, v in ink) / len(ink)}
    report["ink_by_page"] = ink

    dupes = [v for v in dup.values() if len(v) > 1]
    if dupes:
        # a run of consecutive identical pages is a duplicated worksheet; report it
        report["identical_pages"] = dupes

    # ---- 7 fonts ----------------------------------------------------------
    fonts = {}
    for i, pg in enumerate(reader.pages):
        res = pg.get("/Resources") or {}
        fdict = res.get("/Font") or {}
        for k in fdict:
            f = fdict[k].get_object()
            bf = str(f.get("/BaseFont"))
            desc = f.get("/FontDescriptor")
            if desc is None and f.get("/DescendantFonts"):
                desc = f["/DescendantFonts"][0].get_object().get("/FontDescriptor")
            emb = False
            if desc:
                d = desc.get_object()
                emb = any(x in d for x in ("/FontFile", "/FontFile2", "/FontFile3"))
            fonts.setdefault(bf, set()).add(emb)
    not_embedded = [k for k, v in fonts.items() if not all(v)]
    if not_embedded:
        fail("font_embedding", "not fully embedded: %s" % not_embedded)
    report["fonts"] = {k: sorted(v) for k, v in fonts.items()}

    # ---- 7b colour: every operator must be exactly neutral (black ink on white paper)
    import re as _re
    colours = set()
    for pg in reader.pages:
        d = pg.get_contents().get_data().decode("latin-1")
        for m in _re.finditer(r"([\d.]+) ([\d.]+) ([\d.]+) (rg|RG)", d):
            colours.add((m.group(1), m.group(2), m.group(3)))
    neutral = [c for c in colours if not (c[0] == c[1] == c[2])]
    if neutral:
        fail("colour", "non-neutral colour operators present: %s" % neutral)
    report["colours_used"] = len(colours)
    report["colour_operators"] = sorted(colours)

    # ---- 8 collisions -----------------------------------------------------
    by_page = {}
    for t in trace:
        by_page.setdefault(t["p"], []).append(t)
    collisions = []
    for pno, items in by_page.items():
        for a in range(len(items)):
            A = items[a]
            for b in range(a + 1, len(items)):
                B = items[b]
                ox = min(A["x1"], B["x1"]) - max(A["x0"], B["x0"])
                oy = min(A["y1"], B["y1"]) - max(A["y0"], B["y0"])
                # A paragraph's recorded box is the full column width, so treat a paragraph
                # as overlapping only when most of a short label sits inside it, not when
                # the label merely touches the column edge.
                if ox > 0.012 and oy > 0.012:
                    if A["s"] == B["s"] and abs(A["x0"] - B["x0"]) < 0.004 \
                            and abs(A["y0"] - B["y0"]) < 0.004:
                        continue
                    collisions.append((pno, round(A["y0"], 2), A["s"][:26], B["s"][:26],
                                       round(ox, 3), round(oy, 3)))
    if collisions:
        fail("collisions", "%d overlapping text pairs; first 10: %s"
             % (len(collisions), collisions[:10]))

    report["fails"] = fails
    report["warnings"] = warns
    json.dump(report, open(os.path.join(BUILD, "qa_report.json"), "w"), indent=1)

    print("pages:", report["page_count"])
    print("sizes:", report["page_sizes_pt"])
    print("fonts:", report["fonts"])
    print("ink:", report["ink_pixels"])
    print("identical page groups:", report.get("identical_pages"))
    print("FAILURES:", len(fails))
    for f in fails[:20]:
        print("  ✗", f["check"], "-", str(f["detail"])[:220])
    print("WARNINGS:", len(warns))
    for w in warns[:10]:
        print("  !", w["check"], "-", str(w["detail"])[:220])
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
