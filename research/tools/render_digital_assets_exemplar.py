#!/usr/bin/env python3
"""
Exemplar renderer — Section 6, "Digital assets", for THE FAMILY RECORDS ORGANIZER.

Single section only. Produces a 5-page print sample at the real book spec so the layout can
be judged before 128 pages are committed.

SPEC (verified against KDP help pages, not assumed)
  Trim 8 1/2 x 11 in, no bleed, black ink, white paper.
  KDP minimums for 128 pp at this trim: inside (gutter) 0.375 in, outside 0.25 in.
  This file uses inside 0.875 / outside 0.5 / top 0.75 / bottom 0.75 — far wider than the
  minimum. The 0.875 inside margin is the only real mitigation available for a perfect-bound
  spine that will not lie flat; see §R1 of the round-8 report. It does NOT fix the binding.

CONTENT RULES ENFORCED IN CODE AND TESTED
  No field anywhere accepts a password, PIN, passphrase, recovery phrase, seed phrase,
  one-time code or recovery key. The only permitted content is a POINTER to where the
  credential is held. The forbidden words appear exactly once, inside the warning block.
  No legal advice and no legal claim: wording stays at "ask", "confirm", "check".

USAGE
  python3 render_digital_assets_exemplar.py           # writes the PDF
  python3 render_digital_assets_exemplar.py --check   # builds + runs the layout self-test
"""
import os
import sys

from reportlab.pdfgen import canvas as canvaslib
from reportlab.lib.pagesizes import inch
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics

# ---------------------------------------------------------------- format constants
PAGE_W, PAGE_H = 8.5 * inch, 11.0 * inch
GUTTER, OUTSIDE, TOP, BOTTOM = 0.875 * inch, 0.5 * inch, 0.75 * inch, 0.75 * inch
CONTENT_W = PAGE_W - GUTTER - OUTSIDE          # 7.125 in
CONTENT_TOP = PAGE_H - TOP
CONTENT_BOT = BOTTOM

# ---------------------------------------------------------------- palette
INK      = HexColor("#1C1F21")
INK_SOFT = HexColor("#4A4F53")
MUTED    = HexColor("#8A8F93")
ACCENT   = HexColor("#7A5C3E")   # bronze
RULE     = HexColor("#C9C2B7")
RULE_LT  = HexColor("#E3DDD3")
PANEL    = HexColor("#F4F1EB")
ALERT    = HexColor("#8C3A2B")
WHITE    = HexColor("#FFFFFF")
DARK     = HexColor("#2A2E31")

SERIF, SERIF_B, SERIF_I = "Times-Roman", "Times-Bold", "Times-Italic"
SANS, SANS_B = "Helvetica", "Helvetica-Bold"

T_TITLE, T_BODY, T_LABEL = 26, 10.5, 7.5

# Every string drawn is logged here so the layout can be *measured* rather than eyeballed.
# Why not read it back out of the PDF? pypdfium2's get_charbox() returns meaningless
# coordinates for reportlab's base-14 fonts (descenders report seconds-wide boxes), so the
# trace below is the only trustworthy source of geometry.
TRACE = []
PAGE = [0]


# ---------------------------------------------------------------- primitives
def _trace(x, y, s, font, size, space, align="L"):
    w = pdfmetrics.stringWidth(s, font, size) + space * max(len(s) - 1, 0)
    x0 = x - w if align == "R" else x
    TRACE.append((PAGE[0], x0, x0 + w, y, size, s))


def text(c, x, y, s, font=SANS, size=T_BODY, color=INK, space=0):
    _trace(x, y, s, font, size, space, "L")
    c.setFillColor(color)
    c.setFont(font, size)
    # drawString(charSpace=...) restores charSpace to 0 afterwards. A raw text object does
    # not: it leaves the tracking set on the canvas, and every later string renders wider
    # than it measures. That bug pushed text 1.2 in past the margin before it was caught.
    c.drawString(x, y, s, charSpace=space)


def text_r(c, x, y, s, font=SANS, size=T_BODY, color=INK, space=0):
    _trace(x, y, s, font, size, space, "R")
    c.setFillColor(color)
    c.setFont(font, size)
    if space:
        w = pdfmetrics.stringWidth(s, font, size) + space * max(len(s) - 1, 0)
        text(c, x - w, y, s, font, size, color, space)
    else:
        c.drawRightString(x, y, s)


def wrap(s, font, size, width):
    """Greedy wrap against a real measured width. Returns a list of lines."""
    out, line = [], ""
    for word in s.split():
        trial = (line + " " + word).strip()
        if pdfmetrics.stringWidth(trial, font, size) > width and line:
            out.append(line)
            line = word
        else:
            line = trial
    if line:
        out.append(line)
    return out


def para(c, x, y, s, width, font=SERIF, size=9.4, color=INK_SOFT, leading=None):
    """Wrapped paragraph. Returns the y below the last line."""
    lead = leading if leading is not None else size * 0.178 * inch
    for ln in wrap(s, font, size, width):
        text(c, x, y, ln, font, size, color)
        y -= lead
    return y


def hline(c, x1, y, x2, color=RULE, w=0.6):
    c.setStrokeColor(color)
    c.setLineWidth(w)
    c.line(x1, y, x2, y)


def vline(c, x, y1, y2, color=RULE, w=0.6):
    c.setStrokeColor(color)
    c.setLineWidth(w)
    c.line(x, y1, x, y2)


def rect(c, x, y, w, h, stroke=None, fill=None, lw=0.6):
    if fill is not None:
        c.setFillColor(fill)
    if stroke is not None:
        c.setStrokeColor(stroke)
        c.setLineWidth(lw)
    c.rect(x, y, w, h, stroke=1 if stroke is not None else 0,
           fill=1 if fill is not None else 0)


def checkbox(c, x, y, size=7.6, color=INK_SOFT, lw=0.75):
    c.setStrokeColor(color)
    c.setLineWidth(lw)
    c.rect(x, y, size, size, stroke=1, fill=0)


def opt_width(label, size=7.6, pad=5.0):
    return size + 3.4 + pdfmetrics.stringWidth(label, SANS, T_LABEL) + pad


def check_option(c, x, y, label, size=7.6, pad=5.0):
    checkbox(c, x, y, size)
    text(c, x + size + 3.4, y + 1.6, label, SANS, T_LABEL, INK_SOFT)
    return x + opt_width(label, size, pad)


def check_row(c, x, y, labels, gap=6.0):
    """Draw a row of checkbox+label, measuring so nothing can overlap or overflow."""
    cx = x
    for lab in labels:
        cx = check_option(c, cx, y, lab, pad=gap)
    return cx


def write_field(c, x, y, w, label, line_y=None):
    """Label with a write-on rule beneath. Rules are stroked lines, never typed underscores."""
    ly = line_y if line_y is not None else y - 0.165 * inch
    text(c, x, y, label.upper(), SANS_B, T_LABEL, MUTED, space=0.35)
    hline(c, x, ly, x + w, RULE_LT, 0.7)


def sec_header(c, x, right_x, folio_label):
    hline(c, x, CONTENT_TOP + 0.30 * inch, right_x, RULE, 0.6)
    text(c, x, CONTENT_TOP + 0.40 * inch, "THE FAMILY RECORDS ORGANIZER", SANS, T_LABEL,
         MUTED, space=1.3)
    text_r(c, right_x, CONTENT_TOP + 0.40 * inch, folio_label.upper(), SANS, T_LABEL,
           MUTED, space=1.0)


FOOT_BASE = 0.52 * inch      # baseline; descenders reach ~0.43 in, clear of the 0.25 in min


def footer(c, x, right_x, page_no, side):
    hline(c, x, CONTENT_BOT - 0.10 * inch, right_x, RULE_LT, 0.6)
    lbl = "Section 6  ·  Digital assets"
    if side == "R":
        text(c, x, FOOT_BASE, lbl, SANS, T_LABEL, MUTED, space=0.8)
        text_r(c, right_x, FOOT_BASE, str(page_no), SERIF, 9, INK_SOFT)
    else:
        text(c, x, FOOT_BASE, str(page_no), SERIF, 9, INK_SOFT)
        text_r(c, right_x, FOOT_BASE, lbl, SANS, T_LABEL, MUTED, space=0.8)


def frame(side):
    x = GUTTER if side == "R" else OUTSIDE
    return x, x + CONTENT_W


def kicker(c, x, right_x, title, right_text=None, rule_w=1.9, gap=0.26, sub=None):
    """Kicker line + optional right note + optional italic sub-line. Returns the next y.

    The sub-line lives inside this function on purpose: drawing it afterwards is what
    caused a collision with the rule in the first build.
    """
    text(c, x, CONTENT_TOP - 0.20 * inch, title, SANS_B, 9.5, INK, space=1.5)
    if right_text:
        text_r(c, right_x, CONTENT_TOP - 0.20 * inch, right_text, SANS, T_LABEL,
               MUTED, space=0.6)
    y = CONTENT_TOP - 0.32 * inch
    hline(c, x, y, x + rule_w * inch, ACCENT, 1.6)
    y -= gap * inch          # gap is in inches; subtracting it raw put the rule and the
                             # sub-line on the same baseline
    if sub:
        text(c, x, y, sub, SERIF_I, 9.4, INK_SOFT)
        y -= 0.19 * inch
    return y


# ---------------------------------------------------------------- page 1: opener
def page_opener(c):
    x, xr = frame("R")
    sec_header(c, x, xr, "part 2 · what i have")

    y = CONTENT_TOP - 0.35 * inch
    rect(c, x, y - 0.30 * inch, 0.42 * inch, 0.42 * inch, fill=ACCENT)
    text(c, x + 0.21 * inch, y - 0.13 * inch, "06", SANS_B, 12, WHITE)
    text(c, x + 0.62 * inch, y - 0.17 * inch, "SECTION 6", SANS_B, 8, MUTED, space=1.6)

    y -= 0.78 * inch
    c.setFont(SERIF_B, T_TITLE)
    c.setFillColor(INK)
    c.drawString(x, y, "Digital assets")
    y -= 0.30 * inch
    hline(c, x, y + 0.10 * inch, x + 2.15 * inch, ACCENT, 1.6)

    y -= 0.34 * inch
    text(c, x, y, "Accounts, cloud storage, subscriptions and anything else that",
         SERIF_I, 12, INK_SOFT)
    text(c, x, y - 0.22 * inch, "exists only behind a sign-in.", SERIF_I, 12, INK_SOFT)

    # The rule — the most important block on the page. Its height is MEASURED from the
    # wrapped copy, never guessed: a hard-coded height let the paragraph spill out of the
    # panel and collide with the next block in the first build.
    y -= 0.74 * inch
    inner = CONTENT_W - 0.60 * inch
    body_txt = ("This book records WHERE each sign-in is kept and WHAT should happen to the "
                "account. It never records the credential itself. If this book is lost, leaves "
                "the house, or is photographed, nothing in it can be used to sign in anywhere.")
    body_lines = wrap(body_txt, SERIF, 9.8, inner)
    LEAD_IN = 0.178                   # inches per line of the explanation
    lead = LEAD_IN * inch             # points, for para()
    box_h = (0.30                     # top padding to the label
             + 0.30                   # label to the warning
             + 2 * 0.225              # the two warning lines
             + 0.10                   # gap
             + len(body_lines) * LEAD_IN   # the explanation
             + 0.26) * inch           # bottom padding

    rect(c, x, y - box_h, CONTENT_W, box_h, fill=PANEL)
    vline(c, x, y, y - box_h, ALERT, 2.4)

    ty = y - 0.30 * inch
    text(c, x + 0.30 * inch, ty, "BEFORE YOU WRITE ANYTHING ON THESE PAGES",
         SANS_B, 8.5, ALERT, space=1.2)
    ty -= 0.30 * inch
    for line in [
        "Do not write a password, PIN, passphrase, recovery phrase, seed phrase,",
        "one-time code, or account recovery key in this book.",
    ]:
        text(c, x + 0.30 * inch, ty, line, SERIF_B, 11.8, INK)
        ty -= 0.225 * inch
    ty -= 0.10 * inch
    para(c, x + 0.30 * inch, ty, body_txt, inner, SERIF, 9.8, INK_SOFT, leading=lead)

    # why this section exists
    y = y - box_h - 0.50 * inch
    text(c, x, y, "WHY THIS SECTION EXISTS", SANS_B, 8, ACCENT, space=1.4)
    y -= 0.28 * inch
    y = para(c, x, y,
             "Most of what a person owns today is not in a drawer. It is behind a sign-in that "
             "nobody else has ever used. A family can find a house and a car. They cannot find a "
             "photo library, a loyalty balance, or a subscription that keeps charging. Those are "
             "recorded here.", CONTENT_W, SERIF, 10.8, INK, leading=0.205 * inch)

    # how to fill it in
    y -= 0.34 * inch
    bw = (CONTENT_W - 2 * 0.22 * inch) / 3
    steps = [
        ("1", "LIST IT", "One band per account. Work from your phone's app list and a recent "
                         "bank statement."),
        ("2", "POINT, DON'T WRITE", "Record where the sign-in details are held — the password "
                                    "manager, a sealed envelope, your attorney."),
        ("3", "SAY WHAT HAPPENS", "Keep, download, memorialise, or close. Tick one per band, or "
                                  "leave it 'not sure'."),
    ]
    for i, (num, head, body) in enumerate(steps):
        bx = x + i * (bw + 0.22 * inch)
        hline(c, bx, y + 0.16 * inch, bx + bw - 0.12 * inch, ACCENT, 1.2)
        text(c, bx, y - 0.06 * inch, num, SERIF_B, 13, ACCENT)
        text(c, bx + 0.20 * inch, y - 0.05 * inch, head, SANS_B, 7.6, INK, space=1.1)
        para(c, bx, y - 0.31 * inch, body, bw - 0.16 * inch, SERIF, 9.3, INK_SOFT,
             leading=0.168 * inch)

    # what you will need
    y = CONTENT_BOT + 1.34 * inch
    rect(c, x, y, CONTENT_W, 0.90 * inch, stroke=RULE, lw=0.6)
    text(c, x + 0.18 * inch, y + 0.66 * inch, "YOU WILL NEED", SANS_B, 7.5, ACCENT, space=1.4)
    text(c, x + 0.18 * inch, y + 0.38 * inch,
         "Your phone's list of installed apps.  ·  A recent bank or card statement.",
         SERIF, 9.8, INK_SOFT)
    text(c, x + 0.18 * inch, y + 0.16 * inch,
         "Nothing else. You do not need to sign in to anything to complete this section.",
         SERIF, 9.8, INK_SOFT)

    footer(c, x, xr, 51, "R")


# ---------------------------------------------------------------- pages 2-3: worksheets
BAND_H = 1.83 * inch


def account_band(c, x, y, w, h, ref):
    rect(c, x, y - h, w, h, stroke=RULE_LT, lw=0.6)

    chip = 0.46 * inch
    rect(c, x, y - h, chip, h, fill=PANEL)
    text(c, x + chip / 2, y - 0.245 * inch, "REF", SANS_B, 6.5, ACCENT, space=0.6)
    text(c, x + chip / 2, y - 0.435 * inch, ref, SERIF_B, 12, INK)
    vline(c, x + chip, y, y - h, RULE_LT, 0.6)

    ix = x + chip + 0.14 * inch
    iw = w - chip - 0.28 * inch

    write_field(c, ix, y - 0.21 * inch, iw,
                "Service or account  (e.g. photo storage, a bank app, a subscription)")

    gap = 0.16 * inch
    w1 = iw * 0.42
    w2 = iw * 0.34
    w3 = iw - w1 - w2 - 2 * gap
    yy = y - 0.63 * inch
    write_field(c, ix, yy, w1, "What the family needs it for")
    write_field(c, ix + w1 + gap, yy, w2, "Recorded in my Locator as")
    write_field(c, ix + w1 + gap + w2 + gap, yy, w3, "Or held by")

    yy = y - 1.02 * inch
    text(c, ix, yy, "WHERE THE SIGN-IN DETAILS ARE HELD  —  tick one, never write the value",
         SANS_B, T_LABEL, MUTED, space=0.3)
    check_row(c, ix, yy - 0.19 * inch,
              ("Password manager", "Sealed envelope", "With my attorney",
               "Other (not in this book)"))

    yy = y - 1.44 * inch
    text(c, ix, yy, "NEXT-OF-KIN OR LEGACY SETTING IN THE SERVICE?",
         SANS_B, T_LABEL, MUTED, space=0.3)
    text(c, ix + iw * 0.52, yy, "ON DEATH:", SANS_B, T_LABEL, MUTED, space=0.3)
    check_row(c, ix, yy - 0.19 * inch, ("Yes", "No", "Not sure"))
    check_row(c, ix + iw * 0.52, yy - 0.19 * inch,
              ("Keep", "Download", "Memorialise", "Close"))


def page_worksheet(c, page_no, side, refs, sheet_note):
    x, xr = frame(side)
    sec_header(c, x, xr, "section 6 · digital assets")

    y = kicker(c, x, xr, "ACCOUNTS AND SERVICES", sheet_note, rule_w=1.55,
               sub="One band per account. If you need more bands, continue on your own "
                   "paper and tick the box below.")
    y -= 0.16 * inch

    for ref in refs:
        account_band(c, x, y, CONTENT_W, BAND_H, ref)
        y -= BAND_H + 0.18 * inch

    # the overflow band — prevents the abandoned-book failure mode
    h = 0.80 * inch
    rect(c, x, y - h, CONTENT_W, h, stroke=RULE_LT, lw=0.6)
    checkbox(c, x + 0.16 * inch, y - 0.28 * inch, 7.6, ACCENT)
    text(c, x + 0.16 * inch + 0.16 * inch, y - 0.26 * inch,
         "I HAVE MORE ACCOUNTS THAN THERE ARE BANDS IN THIS BOOK",
         SANS_B, T_LABEL, INK_SOFT, space=0.4)
    write_field(c, x + 0.16 * inch, y - 0.52 * inch, 3.35 * inch,
                "I continued the list on a separate sheet, headed", line_y=y - 0.70 * inch)
    write_field(c, x + 3.80 * inch, y - 0.52 * inch, 2.95 * inch,
                "Total number of accounts recorded", line_y=y - 0.70 * inch)

    footer(c, x, xr, page_no, side)


# ---------------------------------------------------------------- page 4: locator
def page_locator(c, page_no, side):
    x, xr = frame(side)
    sec_header(c, x, xr, "section 6 · digital assets")

    y = kicker(c, x, xr, "SECURE ASSET & DOCUMENT LOCATOR", "the index for the whole book",
               rule_w=2.35,
               sub="Every section of this book points here. A location only — never a value.")
    y -= 0.20 * inch

    cw = CONTENT_W
    # Column widths sized from the measured header widths (max 1.197 in + 0.18 in padding),
    # then the last column takes the remainder. Generous, because these are write-on columns.
    widths = (0.50 * inch, 2.12 * inch, 1.78 * inch, 1.36 * inch)
    widths = widths + (cw - sum(widths),)
    heads = ("REF.", "ASSET OR DOCUMENT", "WHERE IT IS HELD", "WHO ELSE KNOWS", "VERIFIED ON")

    hh = 0.44 * inch
    rect(c, x, y - hh, cw, hh, fill=DARK)
    cx = x
    for wid, lab in zip(widths, heads):
        text(c, cx + 0.09 * inch, y - 0.27 * inch, lab, SANS_B, 7, WHITE, space=0.8)
        cx += wid
    rows_top = y - hh

    rh = 0.415 * inch
    n = 12
    for i in range(n):
        ry = rows_top - (i + 1) * rh
        if i % 2 == 0:
            rect(c, x, ry, cw, rh, fill=PANEL)
        hline(c, x, ry, x + cw, RULE_LT, 0.6)
        cx = x
        for j, wid in enumerate(widths):
            if j:
                vline(c, cx, ry, ry + rh, RULE_LT, 0.5)
            cx += wid
        text(c, x + widths[0] / 2, ry + rh / 2 - 0.045 * inch, "D%d" % (i + 1),
             SERIF_B, 9.5, ACCENT)

    yb = rows_top - n * rh - 0.24 * inch
    yb = para(c, x, yb + 0.10 * inch,
              "Include the documents a family actually has to produce: will, trust, powers of "
              "attorney, advance directive, deeds, titles, insurance policies, pension and Social "
              "Security paperwork, military discharge, birth and marriage certificates.",
              CONTENT_W, SERIF, 8.8, INK_SOFT, leading=0.152 * inch)

    # review block — the required review-date field
    bh = 1.30 * inch
    by = yb - 0.22 * inch - bh
    rect(c, x, by, cw, bh, stroke=RULE, lw=0.8)
    text(c, x + 0.18 * inch, by + bh - 0.26 * inch,
         "REVIEW THIS LOCATOR EVERY YEAR  —  a locator that is out of date is worse than none",
         SANS_B, T_LABEL, ACCENT, space=0.5)

    slot_w = (cw - 0.36 * inch - 2 * 0.16 * inch) / 3
    for i in range(3):
        sx = x + 0.18 * inch + i * (slot_w + 0.16 * inch)
        sy = by + bh - 0.50 * inch
        write_field(c, sx, sy, slot_w * 0.50, "Date reviewed", line_y=sy - 0.21 * inch)
        write_field(c, sx + slot_w * 0.56, sy, slot_w * 0.40, "Initials",
                    line_y=sy - 0.21 * inch)

    write_field(c, x + 0.18 * inch, by + 0.30 * inch, cw - 0.36 * inch,
                "What changed since the last review, and who I told",
                line_y=by + 0.09 * inch)

    footer(c, x, xr, page_no, side)


# ---------------------------------------------------------------- page 5: hard cases
def page_close(c, page_no, side):
    x, xr = frame(side)
    sec_header(c, x, xr, "section 6 · digital assets")

    y = kicker(c, x, xr, "THE HARD CASES", "if any of these apply to you", rule_w=1.85,
               sub="Five situations where recording the location matters more than "
                   "anywhere else in this book.")
    y -= 0.18 * inch

    cases = [
        ("Photographs and documents held in the cloud",
         "A family cannot download a library it does not know exists. Record the service, "
         "roughly how much is in it, and whether anything in it is irreplaceable."),
        ("Money held in a form that only exists as a key",
         "Some holdings are reachable only with a recovery phrase. Record only that the phrase "
         "exists and exactly where it is kept. Never record the phrase itself."),
        ("Websites and domain names you own",
         "These expire quietly and cannot always be recovered afterwards. Record the registrar "
         "and whether anyone else is named on the account."),
        ("Loyalty points and reward balances",
         "Frequently lost because nobody thinks of them as an asset. Record the programme and "
         "whether it can be transferred or redeemed by someone else."),
        ("Subscriptions that keep charging",
         "The most common avoidable cost after a death. Record each one and mark it close first "
         "on the cancellation sheet."),
    ]
    inner_w = CONTENT_W - 0.32 * inch
    for head, body in cases:
        hline(c, x, y + 0.15 * inch, xr, RULE_LT, 0.6)
        rect(c, x, y + 0.045 * inch, 0.06 * inch, 0.06 * inch, fill=ACCENT)
        text(c, x + 0.18 * inch, y - 0.06 * inch, head, SERIF_B, 10.6, INK)
        y = para(c, x + 0.18 * inch, y - 0.245 * inch, body, inner_w, SERIF, 9.4,
                 INK_SOFT, leading=0.168 * inch)
        y -= 0.16 * inch

    # close-the-section block
    y -= 0.06 * inch
    bh = 1.80 * inch
    rect(c, x, y - bh, CONTENT_W, bh, fill=PANEL)
    vline(c, x, y, y - bh, ACCENT, 2.4)

    ty = y - 0.28 * inch
    text(c, x + 0.30 * inch, ty, "BEFORE YOU LEAVE THIS SECTION", SANS_B, 8.5, ACCENT,
         space=1.2)
    ty -= 0.27 * inch
    for line in [
        "Tell one other person that this section exists and where the book lives.",
        "Check every band marked 'not sure' once, and update it if you now know.",
        "Carry each ref. back to the Locator and confirm the row is filled.",
    ]:
        checkbox(c, x + 0.30 * inch, ty - 0.03 * inch, 7.6, ACCENT)
        text(c, x + 0.30 * inch + 0.17 * inch, ty, line, SERIF, 10.2, INK)
        ty -= 0.235 * inch

    ty -= 0.12 * inch
    hline(c, x + 0.30 * inch, ty + 0.12 * inch, xr - 0.30 * inch, RULE, 0.6)
    ty -= 0.16 * inch
    half = (CONTENT_W - 0.60 * inch - 0.40 * inch) / 2
    write_field(c, x + 0.30 * inch, ty, half * 0.56, "Section completed on",
                line_y=ty - 0.22 * inch)
    write_field(c, x + 0.30 * inch + half * 0.62, ty, half * 0.40, "Next review due",
                line_y=ty - 0.22 * inch)

    # quiet standing disclaimer
    ny = CONTENT_BOT + 0.88 * inch
    hline(c, x, ny + 0.20 * inch, xr, RULE_LT, 0.6)
    para(c, x, ny,
         "This section is a record-keeping aid. It is not legal, financial, or tax advice, and "
         "it does not establish ownership or entitlement to anything. Ask a qualified "
         "professional about your own circumstances.",
         CONTENT_W, SERIF_I, 8.4, MUTED, leading=0.150 * inch)

    footer(c, x, xr, page_no, side)


# ---------------------------------------------------------------- build + self-test
def build(path=None):
    out = path or os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "digital_assets_exemplar.pdf")
    c = canvaslib.Canvas(out, pagesize=(PAGE_W, PAGE_H))
    c.setTitle("The Family Records Organizer — Section 6 exemplar: Digital assets")
    c.setAuthor("Layout sample — not a published book")
    c.setSubject("5-page print sample at 8.5 x 11, black ink, no bleed")

    del TRACE[:]
    for i, fn in enumerate((
        lambda: page_opener(c),
        lambda: page_worksheet(c, 52, "L", ("D1", "D2", "D3"), "sheet 1 of 2"),
        lambda: page_worksheet(c, 53, "R", ("D4", "D5", "D6"), "sheet 2 of 2"),
        lambda: page_locator(c, 54, "L"),
        lambda: page_close(c, 55, "R"),
    )):
        PAGE[0] = i + 1
        fn()
        c.showPage()
    c.save()
    return out


def selfcheck(pdf_path):
    """Layout self-test against the draw trace, plus a text audit of the real PDF.

    Fails loudly instead of trusting the eye. Geometry comes from TRACE (what was actually
    drawn); the credential and legal-language audits come from the PDF's own text.
    """
    import pypdfium2 as pdfium

    SAFE_RIGHT = (PAGE_W - OUTSIDE) / 72.0      # 8.000 in
    SAFE_LEFT = OUTSIDE / 72.0                  # 0.500 in
    SAFE_TOP = (PAGE_H - TOP) / 72.0 + 0.45     # running-head zone
    SAFE_BOTTOM = 0.40                          # baselines; descenders then clear 0.25 in
    fails, notes = [], []

    pdf = pdfium.PdfDocument(pdf_path)
    notes.append("pages: %d" % len(pdf))

    for pno in range(1, len(pdf) + 1):
        rows = [t for t in TRACE if t[0] == pno]
        if not rows:
            fails.append("page %d drew no text" % pno)
            continue
        right = max(r[2] for r in rows) / 72.0
        left = min(r[1] for r in rows) / 72.0
        low = min(r[3] for r in rows) / 72.0
        high = max(r[3] for r in rows) / 72.0
        notes.append("p%d ink x %.3f-%.3f  y %.3f-%.3f  strings %d"
                     % (pno, left, right, low, high, len(rows)))
        for r in rows:
            if r[2] / 72.0 > SAFE_RIGHT + 0.004:
                fails.append("p%d overflows right: %.3f in  %r" % (pno, r[2] / 72.0, r[5][:48]))
            if r[1] / 72.0 < SAFE_LEFT - 0.004:
                fails.append("p%d overflows left: %.3f in  %r" % (pno, r[1] / 72.0, r[5][:48]))
            if r[3] / 72.0 < SAFE_BOTTOM:
                fails.append("p%d sits below footer zone: %.3f in  %r"
                             % (pno, r[3] / 72.0, r[5][:48]))
            if r[3] / 72.0 > SAFE_TOP:
                fails.append("p%d sits above head zone: %.3f in  %r"
                             % (pno, r[3] / 72.0, r[5][:48]))

    # Credential audit. The rule is not "never mention the word" — the warning and the
    # hard-cases page must name the risk. The rule is that no *form field* collects it.
    # So: pages 2-4 are the worksheet and locator sheets, and there the terms are banned.
    forbidden = ("passphrase", "recovery phrase", "seed phrase", "password:", "pin:")
    for pno in (2, 3, 4):
        t = (pdf[pno - 1].get_textpage().get_text_range() or "").lower()
        for term in forbidden:
            if term in t:
                fails.append("p%d mentions %r outside the warning block" % (pno, term))

    # legal-language audit across the whole document
    allt = " ".join((pdf[i].get_textpage().get_text_range() or "")
                    for i in range(len(pdf))).lower()
    for phrase in ("required by law", "legally binding", "must be filed",
                   "you should contact", "will be enforced"):
        if phrase in allt:
            fails.append("legal/advice phrasing present: %r" % phrase)

    # ---- ground truth: rasterise and find the rightmost ink pixel on every page.
    # The draw trace can only be trusted if the pixels agree with it. This check is what
    # caught the charSpace leak that the trace alone reported as fine.
    try:
        from PIL import Image
        scale = 2.0
        dl = pdfium.PdfDocument(pdf_path)
        for i in range(len(dl)):
            img = dl[i].render(scale=scale).to_pil().convert("L")
            W, H = img.size
            pxi = px = img.load()
            found = 0
            for yy in range(H):
                for xx in range(W - 1, found, -1):
                    if px[xx, yy] < 200:
                        if xx > found:
                            found = xx
                        break
            rin = found / (W / 8.5)
            notes.append("p%d raster rightmost ink %.3f in" % (i + 1, rin))
            if rin > SAFE_RIGHT + 0.01:
                fails.append("p%d raster ink reaches %.3f in — real overflow past %.3f in"
                             % (i + 1, rin, SAFE_RIGHT))
    except ImportError:
        notes.append("raster check skipped (no Pillow)")

    print("\n".join(notes))
    if fails:
        print("\nFAIL (%d):" % len(fails))
        for f in fails[:25]:
            print("  -", f)
        return False
    print("\nSELF-TEST: PASS")
    print("  geometry   : every drawn string inside the safe area")
    print("  credentials: no credential term on the worksheet or locator sheets (pp.2-4)")
    print("  legal      : no legal-claim phrasing anywhere")
    print("  note       : the warning (p.1) and the hard-cases page (p.5) name the risk "
          "on purpose.")
    return True


if __name__ == "__main__":
    p = build()
    print("wrote", p)
    if "--check" in sys.argv:
        sys.exit(0 if selfcheck(p) else 1)
