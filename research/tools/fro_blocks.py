"""
fro_blocks.py — the reusable page components.

Every worksheet in the book is assembled from the primitives here so that the design
system stays identical across 120 pages. Content modules never draw raw lines; they
compose these blocks.
"""
from reportlab.lib.pagesizes import inch
from reportlab.lib.colors import Color

from fro_layout import (
    CONTENT_W, PAGE_W, PAGE_H, CONTENT_TOP, CONTENT_BOT,
    INK, BODY, SOFT, LABEL, FAINT, RULE, RULE_LT, WASH, WASH_2, DARK, WHITE,
    SERIF, SANS, BODY_LEAD, MEASURE, BOX_SIDE, LABEL_SIZE, LABEL_TRACK,
    text, hline, vline, box, hairbox, label, checkbox, option, options,
    write_line, field, para, styles, TRACE, PAGE,
)

ST = styles()
EYEBROW = ""
LABEL_OVERFLOW = []   # (page, label, needed_in, allowed_in)
FIT = [0]        # temporary size reduction, in pt, applied to labels and table heads


def _fitted_label(c, x, y, s, color=LABEL, size=LABEL_SIZE, track=LABEL_TRACK,
                  font="WorkSans-B", align="L", box=None):
    """Label that shrinks to fit the space the caller actually has, down to 7.0 pt."""
    from reportlab.pdfbase import pdfmetrics as pm
    room = box if box is not None else 1e9
    sz, tr = size - FIT[0], track
    while sz > 7.0:
        w = pm.stringWidth(s.upper(), font, sz) + tr * max(len(s) - 1, 0)
        if w <= room:
            break
        sz -= 0.2
        tr = max(0.15, tr - 0.05)
    w = pm.stringWidth(s.upper(), font, sz) + tr * max(len(s) - 1, 0)
    if w > room + 0.5:
        LABEL_OVERFLOW.append((PAGE[0], s, round(w / 72.0, 2), round(room / 72.0, 2)))
    label(c, x, y, s, color, sz, tr, font, align=align)
EM = 0.0292 * inch      # letter-space for small caps eyebrows


# ---------------------------------------------------------------- part opener
def part_opener(e, num, title, standfirst, contents):
    """Full-page part divider: number, title, standfirst, what's inside."""
    c, x, xr = e.c, *e.frame()
    y = CONTENT_TOP - 1.20 * inch

    text(c, x, y, "PART  %02d" % num, "WorkSans-B", 8.6, FAINT, space=3.0)
    y -= 0.62 * inch
    text(c, x, y, "%02d" % num, "Lora", 54, INK)
    y -= 0.44 * inch
    hline(c, x, y + 0.14 * inch, x + 1.5 * inch, INK, 1.4)
    y -= 0.36 * inch

    text(c, x, y, title, "Lora", 27, INK)
    y -= 0.42 * inch
    y = para(c, standfirst, x, y, MEASURE, ST["lede"])

    # what's inside
    y -= 0.52 * inch
    label(c, x, y, "In this part")
    y -= 0.14 * inch
    hline(c, x, y, xr, RULE, 0.7)
    y -= 0.24 * inch
    for name, page in contents:
        text(c, x, y, name, "Lora", 10.4, BODY)
        text(c, xr, y, str(page), "Lora", 10.4, SOFT, align="R")
        y -= 0.235 * inch
    return y


# ---------------------------------------------------------------- section head
def section_head(e, eyebrow, title, lede=None, rule_to=None, need=None):
    """Section opening block at the top of a page. Returns y below it."""
    c, x, xr = e.c, *e.frame()
    y = CONTENT_TOP

    # The running head at the top of every page already names the part, so a second
    # eyebrow here would say it twice. The head is the title and the rule, nothing above.
    y = CONTENT_TOP - 0.14 * inch     # clear the running head above
    text(c, x, y, title, "Lora", 19.5, INK)
    y -= 0.10 * inch
    hline(c, x, y, x + (rule_to or 1.05) * inch, INK, 1.2)
    y -= 0.22 * inch

    if lede:
        y = para(c, lede, x, y, MEASURE, ST["lede"])
        y -= 0.10 * inch
    if need:
        y = need_strip(e, need, y)
    return y


def sub_head(e, title, y=None, note=None):
    c, x, xr = e.c, *e.frame()
    y = e.y if y is None else y
    label(c, x, y, title, INK, 8.2, 1.15)
    y -= 0.19 * inch
    hline(c, x, y, xr, RULE_LT, 0.8)
    if note:
        text(c, x, y - 0.155 * inch, note, "Lora", 8.9, SOFT)
        return y - 0.34 * inch
    return y - 0.20 * inch


# ---------------------------------------------------------------- strips
def need_strip(e, items, y):
    """'You will need' band. Fixed 3-line capacity, tinted, never more."""
    c, x, xr = e.c, *e.frame()
    h = 0.62 * inch
    box(c, x, y - h, CONTENT_W, h, fill=WASH)
    vline(c, x, y, y - h, RULE, 1.4)
    label(c, x + 0.20 * inch, y - 0.21 * inch, "You will need", Color(0.30, 0.30, 0.30))
    text(c, x + 1.32 * inch, y - 0.215 * inch, items, "Lora", 9.3, SOFT)
    return y - h - 0.20 * inch


def callout(e, heading, body, y=None, tone="note"):
    """Bordered note. tone: 'note' (tinted) or 'rule' (sharp left rule only)."""
    c, x, xr = e.c, *e.frame()
    y = e.y if y is None else y
    st = {"note": ST["bodytight"], "rule": ST["bodytight"]}[tone]
    # measure by wrapping first — never draw a throwaway paragraph to find the size
    from reportlab.platypus import Paragraph
    from reportlab.lib.styles import ParagraphStyle
    ps = ParagraphStyle("c", parent=st, fontName="Lora", fontSize=10.1, leading=15.0)
    par = Paragraph("<b>%s</b> &nbsp;%s" % (heading, body), ps)
    w, h = par.wrap(CONTENT_W - 0.44 * inch, 10000)
    h += 0.34 * inch
    if tone == "note":
        box(c, x, y - h, CONTENT_W, h, fill=WASH)
        vline(c, x, y, y - h, RULE_LT, 2.6)
    else:
        vline(c, x, y, y - h, RULE, 2.6)
    par.drawOn(c, x + 0.22 * inch, y - h + 0.17 * inch)
    TRACE.append({"p": PAGE[0], "x0": x / 72.0, "x1": (x + CONTENT_W) / 72.0,
                  "y0": (y - h) / 72.0, "y1": y / 72.0, "size": 10.0, "s": "\u00b6"})
    return y - h - 0.22 * inch


# ---------------------------------------------------------------- fields
def stack_fields(e, rows, y=None, gap=0.055 * inch, row_h=None):
    """rows: list of (label, width_fraction) or (label, frac, hint)."""
    c, x, xr = e.c, *e.frame()
    y = e.y if y is None else y
    for row in rows:
        lab, frac = row[0], row[1]
        hint = row[2] if len(row) > 2 else None
        w = CONTENT_W * frac
        if hint:
            _fitted_label(c, x, y, lab, box=w - 0.06 * inch)
            text(c, x + w - 0.02 * inch, y, hint, "Lora", 8.4, FAINT, align="R")
        else:
            _fitted_label(c, x, y, lab, box=w - 0.06 * inch)
        write_line(c, x, y - 0.185 * inch, w)
        y -= (row_h or 0.40 * inch)
    return y


def two_fields(e, left, right, y=None, gap=0.28 * inch):
    c, x, xr = e.c, *e.frame()
    y = e.y if y is None else y
    wl = (CONTENT_W - gap) * left[1]
    wr = (CONTENT_W - gap) * right[1]
    _fitted_label(c, x, y, left[0], box=wl - 0.06 * inch)
    _fitted_label(c, x + wl + gap, y, right[0], box=wr - 0.06 * inch)
    write_line(c, x, y - 0.185 * inch, wl)
    write_line(c, x + wl + gap, y - 0.185 * inch, wr)
    return y - 0.42 * inch


# ---------------------------------------------------------------- tables
def table(e, cols, rows, y=None, row_h=0.32 * inch, head_h=0.30 * inch,
          prefill=None, zebra=True, ref_col=None, hint=None, rows_hint=None,
          fill=None, max_row_h=0.62 * inch, stretch=True, reserve=0.62):
    """
    cols: list of (heading, width_fraction)
    rows: number of blank rows (ignored when prefill is given — the labels decide)
    prefill: list of strings for the first column (row labels printed for the reader)
    ref_col: if set, prints sequential refs in column 0 (e.g. "D1")
    """
    c, x, xr = e.c, *e.frame()
    y = e.y if y is None else y
    # Normalise the column fractions: a table whose fractions sum above 1 would run into
    # the outside margin, and that is a silent, easy mistake to make in a 40-row book.
    tot = sum(f for _, f in cols) or 1.0
    if abs(tot - 1.0) > 1e-9:
        cols = [(h, f / tot) for h, f in cols]
    if prefill:
        rows = len(prefill)          # the printed labels decide how many rows exist
    if rows and stretch:
        # Stretch the rows to use the page. A worksheet with two inches of dead space at
        # the foot is a worse worksheet: this is writing room, not margin. Callers that
        # put prose under the table pass stretch=False.
        pad = (fill if fill is not None else reserve)
        room = y - head_h - CONTENT_BOT - pad * inch
        row_h = max(row_h, min(max_row_h, room / rows))
    widths = [CONTENT_W * f for _, f in cols]

    box(c, x, y - head_h, CONTENT_W, head_h, fill=DARK)
    cx = x
    for (head, f), w in zip(cols, widths):
        _fitted_label(c, cx + 0.075 * inch, y - 0.195 * inch, head, WHITE, 7.0, 0.68,
                      box=w - 0.16 * inch)
        cx += w
    top = y - head_h
    # Never draw past the bottom of the text block. If the caller asked for more rows than
    # fit, keep the ones that do, record the clamp, and let the build fail loudly.
    room = top - CONTENT_BOT - (0.34 * inch if hint else 0.04 * inch)
    fit = max(0, int(room // row_h)) if rows else 0
    if rows and fit < rows:
        e.clamps.append((PAGE[0], rows, fit, "table"))
        rows = fit

    for i in range(rows):
        ry = top - (i + 1) * row_h
        if zebra and i % 2 == 0:
            box(c, x, ry, CONTENT_W, row_h, fill=WASH)
        hline(c, x, ry, x + CONTENT_W, RULE_LT, 0.65)
        cx = x
        for j, w in enumerate(widths):
            if j:
                vline(c, cx, ry, ry + row_h, RULE_LT, 0.55)
            cx += w
        if prefill and i < len(prefill):
            text(c, x + 0.075 * inch, ry + row_h / 2 - 0.038 * inch,
                 prefill[i], "WorkSans", 8.0, Color(0.30, 0.30, 0.30))
        if ref_col:
            text(c, x + widths[0] / 2, ry + row_h / 2 - 0.045 * inch,
                 "%s%d" % (ref_col, i + 1), "Lora", 9.2, SOFT, align="C")

    bottom = top - rows * row_h
    # close the table
    c.setStrokeColor(RULE)
    c.setLineWidth(0.7)
    c.rect(x, bottom, CONTENT_W, top - bottom + 0, stroke=1, fill=0)
    if hint:
        y2 = para(c, hint, x, bottom - 0.10 * inch, CONTENT_W, ST["note"], trailing=False)
        return y2 - 0.14 * inch
    return bottom - 0.16 * inch


# ---------------------------------------------------------------- checkbox rows
def tick_list(e, items, y=None, cols=1, step=0.255 * inch, notes=True):
    c, x, xr = e.c, *e.frame()
    y = e.y if y is None else y
    colw = CONTENT_W / cols
    for i, item in enumerate(items):
        col = i % cols
        row = i // cols
        bx = x + col * colw
        by = y - row * step
        checkbox(c, bx, by - 0.02 * inch)
        text(c, bx + 0.175 * inch, by, item, "Lora", 9.9, BODY)
    rows = (len(items) + cols - 1) // cols
    return y - (rows - 1) * step - 0.30 * inch


def checklist(e, items, y=None, step=0.30 * inch, dates=False, refs=False):
    """Checkbox + prompt, optional trailing date/ref columns. Wraps long prompts."""
    c, x, xr = e.c, *e.frame()
    y = e.y if y is None else y
    trail = 0.0
    if dates:
        trail = 1.05 * inch
        label(c, xr - trail + 0.10 * inch, y + 0.04 * inch, "Date", FAINT, 7.0, 0.6)
    if refs:
        trail = 0.95 * inch
        label(c, xr - trail + 0.10 * inch, y + 0.04 * inch, "Done", FAINT, 7.0, 0.6)

    maxw = CONTENT_W - 0.20 * inch - trail
    for item in items:
        from reportlab.pdfbase import pdfmetrics as pm
        checkbox(c, x, y - 0.015 * inch)
        words, line, lines = item.split(), "", []
        for wd in words:
            t = (line + " " + wd).strip()
            if pm.stringWidth(t, "Lora", 9.9) > maxw and line:
                lines.append(line); line = wd
            else:
                line = t
        if line:
            lines.append(line)
        yy = y
        for ln in lines:
            text(c, x + 0.20 * inch, yy, ln, "Lora", 9.9, BODY)
            yy -= 0.195 * inch
        if trail:
            write_line(c, xr - trail + 0.06 * inch, y - 0.02 * inch, trail - 0.14 * inch)
        y = yy - (step - 0.195 * inch)
    return y


# ---------------------------------------------------------------- record band
def band(e, ref, rows, y=None, h=None, chip=True):
    """
    A boxed record unit. `rows` is a list of field-row specs:
        ("full", label)                      one full-width write-on line
        ("split", [(label, frac), ...])      several write-on fields on one line
        ("opts",  label_spec, [options])     label + checkbox options
    Returns y below the band.
    """
    c, x, xr = e.c, *e.frame()
    y = e.y if y is None else y
    if h is None:
        h = 0.42 * inch * len(rows) + 0.30 * inch

    box(c, x, y - h, CONTENT_W, h, stroke=RULE_LT, lw=0.7)
    ix, iw = x, CONTENT_W
    if chip:
        cw = 0.44 * inch
        box(c, x, y - h, cw, h, fill=WASH)
        label(c, x + cw / 2, y - 0.235 * inch, "REF", SOFT, 7.0, 0.4, "WorkSans-B")
        text(c, x + cw / 2, y - 0.415 * inch, ref, "Lora", 11.5, INK, align="C")
        vline(c, x + cw, y, y - h, RULE_LT, 0.6)
        ix, iw = x + cw + 0.16 * inch, CONTENT_W - cw - 0.32 * inch

    yy = y - 0.235 * inch
    # Bands are never allowed to run past the text block: the content module picks the
    # band height, and a band that does not fit is a layout bug, not something to clip.
    if y - h < CONTENT_BOT - 0.02 * inch:
        raise ValueError("band %s on page %s runs past the bottom of the text block"
                         % (ref, PAGE[0]))

    for spec in rows:
        kind = spec[0]
        if kind == "full":
            if spec[1]:
                _fitted_label(c, ix, yy, spec[1], box=iw - 0.10 * inch)
            write_line(c, ix, yy - 0.175 * inch, iw)
            yy -= 0.42 * inch
        elif kind == "split":
            gap = 0.16 * inch
            total = sum(f for _, f in spec[1])
            avail = iw - gap * (len(spec[1]) - 1)
            cx = ix
            for lab, frac in spec[1]:
                w = avail * frac / total
                _fitted_label(c, cx, yy, lab, box=w - 0.06 * inch)
                write_line(c, cx, yy - 0.175 * inch, w)
                cx += w + gap
            yy -= 0.42 * inch
        elif kind == "opts":
            lab, opts, at = spec[1], spec[2], (spec[3] if len(spec) > 3 else None)
            if lab:
                _fitted_label(c, ix, yy, lab, box=iw - 0.10 * inch)
            oy = yy - (0.20 * inch if lab else 0)
            options(c, ix + (at or 0), oy, opts)
            yy -= (0.40 * inch if lab else 0.24 * inch)
    return y - h - 0.16 * inch


# ---------------------------------------------------------------- misc
def overflow_capture(e, y=None, lead="I need more space than this page provides",
                     label_a="I continued on a separate sheet, dated",
                     label_b="Number of entries recorded here"):
    c, x, xr = e.c, *e.frame()
    y = e.y if y is None else y
    h = 0.74 * inch
    hairbox(c, x, y - h, CONTENT_W, h)
    checkbox(c, x + 0.16 * inch, y - 0.27 * inch, BOX_SIDE, Color(0.40, 0.40, 0.40))
    text(c, x + 0.35 * inch, y - 0.255 * inch, lead.upper(), "WorkSans-B", 7.2, SOFT, space=0.45)
    wn = (CONTENT_W - 0.32 * inch) * 0.60
    label(c, x + 0.16 * inch, y - 0.50 * inch, label_a)
    write_line(c, x + 0.16 * inch, y - 0.665 * inch, wn)
    label(c, x + 0.16 * inch + wn + 0.24 * inch, y - 0.50 * inch, label_b)
    write_line(c, x + 0.16 * inch + wn + 0.24 * inch, y - 0.665 * inch,
               CONTENT_W - 0.32 * inch - wn - 0.24 * inch)
    return y - h - 0.18 * inch


def crossref_note(e, page, y=None, what="the Document Locator"):
    c, x, xr = e.c, *e.frame()
    y = e.y if y is None else y
    note = ("Every entry on this page has a matching row in %s (page %s). Fill in this page "
            "first; the Locator is a summary, not a second job." % (what, page))
    return para(c, note, x, y, CONTENT_W, ST["note"]) - 0.10 * inch


def ruled_writing(e, y=None, lines=None, gap=0.30 * inch, left=0.0, right=0.0):
    """Open ruled writing area. Deliberately generous line pitch for handwriting."""
    c, x, xr = e.c, *e.frame()
    y = e.y if y is None else y
    x0, x1 = x + left, xr - right
    n = lines if lines is not None else int((y - CONTENT_BOT) // gap)
    for i in range(n):
        ly = y - (i + 1) * gap + (gap - 0.22 * inch)
        write_line(c, x0, ly, x1 - x0, Color(0.84, 0.84, 0.84), 0.7)
    return y - n * gap


def page_break_note(e, nxt):
    """Small right-aligned continuation pointer at the foot of a section."""
    c, x, xr = e.c, *e.frame()
    label(c, xr, CONTENT_BOT + 0.14 * inch, "continued on page %s" % nxt, FAINT, 7.0, 0.7)
