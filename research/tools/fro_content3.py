"""
fro_content3.py — the second layer of pages.

These are not filler and they are not repeats: each one covers a subject the first pass
left out, and each is inserted at the point in its part where a reader would look for it.
The multi-sheet inventories (banks, debts, contacts, locator) are the one deliberate
exception, and they carry consecutive reference numbers so no two sheets are the same page.
"""
from reportlab.lib.pagesizes import inch
from reportlab.lib.colors import Color

from fro_layout import (
    CONTENT_W, CONTENT_BOT, INK, BODY, SOFT, LABEL, FAINT, RULE, RULE_LT, WASH, WASH_2,
    WHITE, DARK, text, hline, vline, box, label, checkbox, write_line, para, styles,
    MEASURE, TRACE, FOOT_RULE_Y,
)
from fro_blocks import (
    section_head, sub_head, callout, two_fields, stack_fields, table, checklist, band,
    overflow_capture, ruled_writing, ST,
)
from fro_content import page


# ---------------------------------------------------------------- PART 1
def part1_extra(e, refs):
    def summary(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part one", "The one-page summary",
                         "If a family member opens this book and has five minutes, this is "
                         "the page to read. Fill it in last, from what you have already "
                         "written.")
        y -= 0.04 * inch

        h = 0.86 * inch
        box(c, x, y - h, CONTENT_W, h, fill=WASH)
        vline(c, x, y, y - h, INK, 2.2)
        text(c, x + 0.22 * inch, y - 0.24 * inch,
             "Everything below is repeated somewhere else in this book.", "Lora", 9.9, BODY)
        text(c, x + 0.22 * inch, y - 0.42 * inch,
             "This page exists so nobody has to read the whole thing to find it.", "Lora", 9.9,
             SOFT)
        y -= h + 0.28 * inch

        y = two_fields(ee, ("This book belongs to", 0.58), ("Date completed", 0.42), y)
        y = two_fields(ee, ("It is kept at", 0.62), ("Second copy, if any", 0.38), y)
        y = two_fields(ee, ("Trusted person", 0.58), ("Phone", 0.42), y)
        y = two_fields(ee, ("Second person who knows", 0.58), ("Phone", 0.42), y)
        y = two_fields(ee, ("My will is held by", 0.58), ("Page in this book", 0.42), y)
        y = two_fields(ee, ("The document locator starts on page", 0.58), ("Digital records on",
                                                                          0.42), y)
        y = two_fields(ee, ("Who to call first", 0.58), ("Page in this book", 0.42), y)

        y = sub_head(ee, "Three things a reader should know about me", y - 0.02 * inch)
        y = ruled_writing(ee, y, lines=4, gap=0.32 * inch)

        y -= 0.02 * inch
        y = para(c,
                 "Keep this page current. When anything on it changes, change it here first "
                 "and then on the page it came from — this is the page that will actually be "
                 "read.", x, y, MEASURE, ST["note"])

    page(e, "Part one · Getting started", summary)
    e.marks["summary"] = e.n - 1

    def tenmin(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part one", "The ten-minute start",
                         "For the reader who has opened this book and does not want to read "
                         "three pages before writing anything. Do these four things and stop.")
        y -= 0.06 * inch
        steps = [
            ("Write where this book will live",
             "One place, described well enough that a stranger could find it. Not 'the "
             "study' — the second shelf of the bookcase by the window."),
            ("Write one name",
             "The person you would want holding this book. You do not have to ask them "
             "today, but the name is the hard part and it takes a minute."),
            ("Write one phone number",
             "The person above. Without a number, a name in a book is only half useful."),
            ("Write one line about your will",
             "Who holds the signed original, or 'I do not have one'. Either answer is worth "
             "more than a blank line."),
        ]
        for i, (head, body) in enumerate(steps, 1):
            text(c, x, y - 0.07 * inch, "%d" % i, "Lora", 15, RULE)
            text(c, x + 0.34 * inch, y - 0.04 * inch, head, "Lora", 11.2, INK)
            y = para(c, body, x + 0.34 * inch, y - 0.26 * inch, MEASURE - 0.34 * inch,
                     ST["bodytight"])
            y -= 0.18 * inch

        y = sub_head(ee, "Write them here", y - 0.04 * inch)
        y = stack_fields(ee, [("This book lives at", 1.0)], y, row_h=0.46 * inch)
        y = two_fields(ee, ("Name", 0.58), ("Phone", 0.42), y)
        y = stack_fields(ee, [("My will is held by", 1.0)], y, row_h=0.46 * inch)

        y -= 0.10 * inch
        y = callout(ee, "Then stop.",
                    "Four lines is a real start, and it is more than most people ever do. The "
                    "rest of this book is designed to be added to over months. Come back when "
                    "you have an hour, not when you feel guilty.", y)

    page(e, "Part one · Getting started", tenmin)
    e.marks["tenmin"] = e.n - 1


# ---------------------------------------------------------------- PART 2
def part2_extra(e, refs):
    def returns(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part two", "What goes back, and what stops",
                         "Some things must be returned or cancelled, and a surprising number "
                         "of them carry a penalty for delay. This page is a list to work "
                         "down, not a set of instructions.")
        y = para(c,
                 "The rules differ by country and, in the United States, by agency and by "
                 "state. What follows is what the official guidance says at the time of "
                 "writing; where it can change, the book points you at the source rather than "
                 "guaranteeing an answer.", x, y, MEASURE, ST["body"])

        y -= 0.06 * inch
        rows = [
            ("A passport", "Returned to the State Department for cancellation. This also "
                           "reduces the risk of identity theft, which is the main reason to "
                           "do it promptly rather than eventually."),
            ("A driving licence", "Usually returned to the state licensing agency, though "
                                  "practice varies. Ask when you notify them."),
            ("A Social Security payment", "Benefits stop at death, and the payment for the "
                                          "month of death must be returned. If it arrived by "
                                          "direct deposit, ask the bank to return it; if it "
                                          "arrived as a cheque, do not cash it."),
            ("A Medicare card", "No return needed. Social Security notifies Medicare, and "
                                "coverage ends automatically."),
            ("A pension payment", "Paid after the death, it is usually recovered. The "
                                  "administrator will tell you how, and whether a survivor "
                                  "benefit is due."),
            ("A benefit claim", "SNAP, housing assistance and similar state benefits usually "
                                "end at death, and the state agency will say what it needs."),
            ("A lease or tenancy", "Not returned, but it does need attention: notice periods "
                                   "and liability differ, and the landlord is a creditor of "
                                   "the estate."),
            ("A vehicle registration", "Returned or transferred, depending on the state. The "
                                       "motor vehicle agency will say which."),
            ("Post and deliveries", "Redirected, not returned. A mail redirection is one of "
                                    "the cheapest ways to stop identity theft."),
        ]
        for head, body in rows:
            hline(c, x, y + 0.13 * inch, xr, RULE_LT, 0.7)
            checkbox(c, x, y - 0.055 * inch, 7.6)
            text(c, x + 0.19 * inch, y - 0.045 * inch, head, "Lora", 9.7, INK)
            y = para(c, body, x + 1.92 * inch, y + 0.03 * inch, CONTENT_W - 1.92 * inch,
                     ST["bodytight"])
            y -= 0.06 * inch

        y -= 0.18 * inch
        y = stack_fields(ee, [("What I was told, and by whom", 1.0)], y, row_h=0.46 * inch)
        y = para(c,
                 "Nothing on this page is a deadline you can calculate from the book. Ask the "
                 "agency, in one call, and write the answer above.", x, y, MEASURE, ST["note"])

    page(e, "Part two · The first 48 hours", returns)
    e.marks["returns"] = e.n - 1

    def certificate(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part two", "Documents you will be asked for",
                         "Institutions ask for the same short list, in the same order, and "
                         "each wants its own copy. Working out how many you need before you "
                         "start saves a second round of requests.")
        y = para(c,
                 "Certified copies of a death certificate are the ones that matter — "
                 "photocopies are not accepted. Funeral homes usually order them, and the "
                 "local department of health issues them where no funeral home is involved. "
                 "Only certain family members may obtain one in most states, and some records "
                 "become public after a set number of years that differs by state.", x, y,
                 MEASURE, ST["body"])

        y = sub_head(ee, "A working estimate", y)
        est = [
            ("Social Security Administration", "1"),
            ("Bank and building society", "1 each"),
            ("Life insurance — each policy", "1 each"),
            ("Pension and retirement providers", "1 each"),
            ("Employer and HR", "1"),
            ("Motor vehicle agency", "1"),
            ("Property, deeds and mortgage", "1–2"),
            ("Probate court", "1–2"),
            ("Tax authority", "1"),
            ("Each utility you are closing", "1"),
            ("Each investment or brokerage account", "1 each"),
        ]
        label(c, x + 4.40 * inch, y + 0.02 * inch, "Typical number", FAINT, 7.0, 0.6)
        label(c, x + 5.70 * inch, y + 0.02 * inch, "Ordered", FAINT, 7.0, 0.6)
        y -= 0.14 * inch
        hline(c, x, y + 0.04 * inch, xr, RULE_LT, 0.7)
        y -= 0.10 * inch
        for name, n in est:
            text(c, x, y, name, "Lora", 9.7, BODY)
            text(c, x + 4.40 * inch, y, n, "Lora", 9.7, SOFT)
            write_line(c, x + 5.70 * inch, y - 0.03 * inch, 0.62 * inch, RULE_LT, 0.6)
            y -= 0.275 * inch

        y -= 0.04 * inch
        y = callout(ee, "Ask for more than you think.",
                    "The usual advice is to request ten to twelve certified copies, and most "
                    "families who run out wish they had asked for two or three more while "
                    "they were already at the counter. The extra copies are cheaper than a "
                    "second application, and no institution will accept a photocopy.", y)

        y -= 0.02 * inch
        y = two_fields(ee, ("Copies ordered", 0.34), ("From", 0.66), y)
        y = two_fields(ee, ("Ordered on", 0.34), ("Arrived", 0.66), y)
        y = stack_fields(ee, [("Where the spare copies are kept", 1.0)], y, row_h=0.44 * inch)

    page(e, "Part two · The first 48 hours", certificate)
    e.marks["certificate"] = e.n - 1


# ---------------------------------------------------------------- PART 3
def part3_extra_a(e, refs):
    def vehicles(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Vehicles and titled property",
                         "Anything with a title, a registration or a lien. These are the items "
                         "that cause the most paperwork and the least warning.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Vehicle or item", 0.22), ("Reg. no.", 0.12), ("Titled to", 0.15),
                   ("Loan or lien", 0.16), ("Title is at", 0.18), ("Keys are at", 0.17)],
                  5, y, row_h=0.42 * inch, fill=2.5,
                  hint="Include boats, trailers, caravans, motorcycles and anything else the "
                       "state registers. A vehicle nobody knew about becomes a letter from the "
                       "motor vehicle agency six months later.")
        y = two_fields(ee, ("Where the spare keys are", 0.52), ("Insurance on the vehicles", 0.48), y)
        y = two_fields(ee, ("Is any vehicle on a finance agreement?", 0.62),
                       ("With whom", 0.38), y)
        y -= 0.04 * inch
        y = para(c,
                 "Who the vehicle is registered or titled to decides what happens to it, and "
                 "a car titled to two people is not handled the same way as one titled to one. "
                 "The motor vehicle agency can confirm it in a minute, and the answer belongs "
                 "on this page.", x, y, MEASURE, ST["note"])

    page(e, "Part three · Family and personal records", vehicles)
    e.marks["vehicles"] = e.n - 1

    def memberships(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Memberships and organisations",
                         "The bodies that hold a record of you, pay out on your death, or "
                         "expect to be told. Trade unions and professional bodies are the most "
                         "commonly forgotten.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Organisation", 0.27), ("Member no.", 0.16),
                   ("What it provides", 0.25), ("Contact", 0.17), ("Told?", 0.15)],
                  7, y, row_h=0.40 * inch, fill=2.9,
                  hint="Look for death benefits, funeral payments, continuing cover for a "
                       "spouse, and any pension attached to membership.")
        y = sub_head(ee, "Education and qualifications", y - 0.02 * inch)
        y = table(ee,
                  [("Institution", 0.32), ("Qualification", 0.30), ("Year", 0.12),
                   ("Where the certificate is", 0.26)],
                  3, y, row_h=0.38 * inch, max_row_h=0.43)
        y -= 0.02 * inch
        y = para(c,
                 "Certificates matter less than people expect, but proof of a professional "
                 "qualification sometimes matters a great deal — particularly where a licence "
                 "or registration is tied to it. If that applies to you, note it here and put "
                 "the certificate somewhere you can name.", x, y, MEASURE, ST["note"])

    page(e, "Part three · Family and personal records", memberships)
    e.marks["memberships"] = e.n - 1

    def household(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Household services and suppliers",
                         "The people who keep a house running, and the codes and contracts "
                         "that go with it. Record where the code is held, never the code.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Service", 0.25), ("Provider", 0.25), ("Account", 0.18),
                   ("Phone", 0.17), ("Ends", 0.15)],
                  7, y, row_h=0.36 * inch, fill=2.05,
                  hint="Electricity, gas, water, internet, phone, waste collection, garden, "
                       "cleaning, maintenance contracts, security monitoring.")
        y = sub_head(ee, "Access and codes", y - 0.02 * inch)
        y = two_fields(ee, ("Alarm company", 0.56), ("Code held where", 0.44), y)
        y = two_fields(ee, ("Safe or lockbox — make and location", 0.56),
                       ("Who can open it", 0.44), y)
        y = two_fields(ee, ("Storage unit or locker", 0.56), ("Contract and key", 0.44), y)
        y -= 0.04 * inch
        y = para(c,
                 "An alarm code is a lock, not a record. The useful facts are the company and "
                 "who else holds a key — both on the lines above, without a code in a book.",
                 x, y, MEASURE, ST["note"])

    page(e, "Part three · Family and personal records", household)
    e.marks["household"] = e.n - 1

    def contents(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Home contents worth listing",
                         "Not an insurance schedule. A short list of the things a family would "
                         "otherwise have to guess about — what is valuable, and where the "
                         "proof of it lives.")
        y -= 0.04 * inch
        y = table(ee,
                  [("What it is", 0.29), ("Where it is", 0.19), ("Rough value", 0.15),
                   ("Receipt or photo at", 0.20), ("Insured?", 0.14)],
                  9, y, row_h=0.40 * inch, fill=3.3,
                  hint="Only the items that matter: jewellery, instruments, tools, art, "
                       "collectibles, anything with a serial number.")
        y = two_fields(ee, ("Where the photographs of these are kept", 0.62),
                       ("Policy covering them", 0.38), y)
        y -= 0.02 * inch
        y = para(c,
                 "A photograph of a room is worth more than a description of it. If you do "
                 "nothing else on this page, photograph the rooms where the valuable things "
                 "are and put the images with your other digital records — then write on this "
                 "line where that folder is.", x, y, MEASURE, ST["note"])

    page(e, "Part three · Family and personal records", contents)
    e.marks["contents"] = e.n - 1


def part3_extra_b(e, refs):
    """Second sheets for the two records that always overflow."""
    def banks2(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Financial institutions",
                         "Sheet two of two. Continue from the previous page; the reference "
                         "letters run on.", rule_to=2.4)
        y -= 0.02 * inch
        text(c, x, y, "Continue only if you ran out of rows on the first sheet.", "Lora", 9.2,
             SOFT)
        y -= 0.30 * inch
        y = table(ee,
                  [("Institution", 0.21), ("Account type", 0.15),
                   ("Last 4", 0.09), ("Held with", 0.12),
                   ("Beneficiary or TOD", 0.24), ("Branch/adviser", 0.19)],
                  9, y, row_h=0.42 * inch, fill=0.5)
        y = overflow_capture(ee, y, lead="I have more accounts than there are rows here")
        y = para(c,
                 "Two sheets is deliberate. Most households have between three and eight "
                 "accounts that matter; a third sheet is a sign that the list should be split "
                 "by institution rather than continued line by line.", x, y, MEASURE,
                 ST["note"])

    page(e, "Part three · Family and personal records", banks2)
    e.marks["financial2"] = e.n - 1

    def debts2(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Debts and regular payments",
                         "Sheet two of two. Anything that renews without asking, and anything "
                         "with a balance.", rule_to=2.4)
        y -= 0.30 * inch
        y = table(ee,
                  [("Who is paid", 0.23), ("For what", 0.24), ("Balance", 0.13),
                   ("Due", 0.11), ("Auto?", 0.10), ("Cancel / keep", 0.19)],
                  9, y, row_h=0.42 * inch, fill=0.5)
        y = overflow_capture(ee, y, lead="I have more regular payments than rows here")
        y = para(c,
                 "Debts do not disappear at death, and they do not become the family's "
                 "personal responsibility either. What helps is a list: who is owed, how "
                 "much, and whether the account was in one name or two. That is all this "
                 "page is for.", x, y, MEASURE, ST["note"])

    page(e, "Part three · Family and personal records", debts2)
    e.marks["debts2"] = e.n - 1


# ---------------------------------------------------------------- PART 4
def part4_extra(e, refs):
    def service(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "The order of service",
                         "The shape of the day itself, written down. Nobody has to follow it "
                         "— but having something to follow is a kindness to whoever is "
                         "organising it.")
        y -= 0.04 * inch
        y = two_fields(ee, ("Where", 0.58), ("Date and time", 0.42), y)
        y = two_fields(ee, ("Who leads", 0.58), ("Approximate length", 0.42), y)

        y = sub_head(ee, "Running order", y - 0.02 * inch)
        items = ["Music as people arrive", "Opening words", "Reading or poem",
                 "Music or a song", "Remembrance — who speaks", "Reading or poem",
                 "Closing words", "Music as people leave"]
        for i, it in enumerate(items, 1):
            text(c, x, y, "%d" % i, "Lora", 9.4, RULE)
            text(c, x + 0.30 * inch, y, it, "Lora", 9.7, BODY)
            write_line(c, x + 2.06 * inch, y - 0.03 * inch, CONTENT_W - 2.06 * inch,
                       RULE_LT, 0.65)
            y -= 0.30 * inch

        y = sub_head(ee, "Music and readings", y - 0.02 * inch)
        y = two_fields(ee, ("First piece", 0.62), ("Who plays it", 0.38), y)
        y = two_fields(ee, ("Second piece", 0.62), ("Who plays it", 0.38), y)
        y = stack_fields(ee, [("Reading I would like, and who should read it", 1.0)],
                         y, row_h=0.46 * inch)
        y = stack_fields(ee, [("What I would rather was left out", 1.0)], y, row_h=0.44 * inch)

    page(e, "Part four · Wishes and preferences", service)
    e.marks["service"] = e.n - 1

    def nowill(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "If there is no will",
                         "A page for the reader who has not made one, is not sure, or is "
                         "putting it off. It is written to be useful rather than alarming.")
        y = para(c,
                 "Dying without a valid will is called dying intestate. What happens then is "
                 "decided by the law of the state where you live, not by what anyone "
                 "remembers you saying. The rules are specific and they are not intuitive — "
                 "in many places a spouse does not automatically receive everything, and an "
                 "unmarried partner usually receives nothing at all.", x, y, MEASURE,
                 ST["body"])
        y = para(c,
                 "This book cannot tell you what those rules are for your situation. It can "
                 "do two things: record whether you have a will, and give you the questions "
                 "worth asking before you pay anyone to make one.", x, y, MEASURE, ST["body"])

        y = sub_head(ee, "The honest position, today", y)
        for lab, opts in [
            ("I have a signed will, and I know where the original is",
             ["Yes", "No", "Not sure"]),
            ("It was reviewed in the last five years", ["Yes", "No", "Not sure"]),
            ("The people named in it are still the right people", ["Yes", "No", "Not sure"]),
            ("I have told someone where the original is kept", ["Yes", "No"]),
        ]:
            _fitted_label(c, x, y, lab, box=CONTENT_W - 2.30 * inch)
            cx = x + CONTENT_W - 2.18 * inch
            for o in opts:
                checkbox(c, cx, y - 0.02 * inch, 8.0)
                text(c, cx + 0.15 * inch, y, o, "WorkSans", 8.0, BODY)
                cx += 0.15 * inch + len(o) * 0.049 * inch + 0.18 * inch
            y -= 0.34 * inch

        y = sub_head(ee, "Questions worth asking before you pay for one", y - 0.02 * inch)
        qs = [
            "Do I need a will, or would a beneficiary designation do the job?",
            "Who will act for my estate, and have I asked them?",
            "If I have children, who should care for them, and does that need a court's approval?",
            "Does my state require witnesses, a notary, or both?",
            "Where should the signed original be kept, and who else will know?",
            "What will this cost in total, including any filing fee?",
        ]
        for q in qs:
            checkbox(c, x, y - 0.01 * inch)
            y = para(c, q, x + 0.21 * inch, y + 0.02 * inch, MEASURE - 0.21 * inch,
                     ST["bodytight"])
            y -= 0.06 * inch

        y -= 0.02 * inch
        y = para(c,
                 "One thing this page will not do is reassure you that a note in a book is "
                 "enough. It is not, and no amount of careful writing here changes that.",
                 x, y, MEASURE, ST["note"])

    page(e, "Part four · Wishes and preferences", nowill)
    e.marks["nowill"] = e.n - 1


def _fitted_label(c, x, y, s, box):
    """Uppercase label that shrinks to fit a given width."""
    from reportlab.pdfbase import pdfmetrics as pm
    sz, tr = 7.6, 0.3
    while sz > 7.0:
        w = pm.stringWidth(s.upper(), "WorkSans-B", sz) + tr * max(len(s) - 1, 0)
        if w <= box:
            break
        sz -= 0.2
        tr = max(0.1, tr - 0.05)
    label(c, x, y, s, LABEL, sz, tr)


# ---------------------------------------------------------------- PART 5
def part5_extra(e, refs):
    def devices(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Devices, drives and backups",
                         "The physical half of a digital life. A phone in a drawer can hold "
                         "more of a person than a filing cabinet, and it is the object most "
                         "likely to be locked.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Device", 0.22), ("Where it is", 0.20), ("What is on it", 0.24),
                   ("Locked how", 0.14), ("Who can unlock it", 0.20)],
                  6, y, row_h=0.42 * inch, fill=2.6,
                  hint="Phone, laptop, tablet, desktop, external drive, camera card, NAS, "
                       "smartwatch. 'Locked how' means the method, never the value.")
        y = sub_head(ee, "Backups", y - 0.02 * inch)
        y = two_fields(ee, ("Where the main backup lives", 0.56), ("How often it runs", 0.44), y)
        y = two_fields(ee, ("Second copy, if any", 0.56), ("Where that copy is", 0.44), y)
        y = two_fields(ee, ("Backup password or key held where", 0.62),
                       ("Account it belongs to", 0.38), y)
        y -= 0.04 * inch
        y = callout(ee, "The one thing worth doing today.",
                    "If a phone or laptop holds photographs nobody has copied, copy them. An "
                    "archive that exists on one device exists zero times, and a locked device "
                    "is not a record — it is a locked box with no key on this page.", y)

    page(e, "Part five · Digital assets", devices)
    e.marks["devices"] = e.n - 1

    def purchases(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Things bought and licensed",
                         "Digital purchases usually cannot be inherited — they are licensed, "
                         "not owned. That makes them worth listing precisely because a family "
                         "will otherwise assume they can simply be passed on.")
        y = para(c,
                 "A film bought from a store, an ebook library, a music collection, a piece "
                 "of software and a domain name are held on very different terms. Some can be "
                 "transferred, some cannot, and some have a formal process for it. This page "
                 "records what exists and what you would like to happen to it; the terms "
                 "themselves are the service's to state.", x, y, MEASURE, ST["body"])
        y -= 0.04 * inch
        y = table(ee,
                  [("What it is", 0.27), ("Where it lives", 0.23), ("Account", 0.17),
                   ("Transfer?", 0.13), ("What I would like", 0.20)],
                  9, y, row_h=0.34 * inch, max_row_h=0.40, reserve=2.1,
                  hint="Include domain names, website hosting, software licences, "
                       "marketplace seller accounts, and subscriptions with a paid balance.")
        y = two_fields(ee, ("Anything here that is worth real money", 0.62),
                       ("Where the proof of purchase is", 0.38), y)
        y -= 0.02 * inch
        y = para(c,
                 "Where a service offers a way to nominate someone, use it and note it in the "
                 "legacy table on page %s. Where it does not, writing your intention here "
                 "still tells a family whether to spend an afternoon trying."
                 % refs.get("dlegacy", "--"), x, y, MEASURE, ST["note"])

    page(e, "Part five · Digital assets", purchases)
    e.marks["dpurchases"] = e.n - 1

    def mail(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Email, messaging and social accounts",
                         "The accounts that hold the correspondence. They are also the keys "
                         "to everything else, because almost every other service sends its "
                         "password reset to one of them.")
        y = para(c,
                 "That last point is why this page comes before the password manager page. An "
                 "email account is not just a mailbox; it is the recovery route for a dozen "
                 "others. What a family needs to know is which address is the primary one, who "
                 "administers it, and whether a second person could get into it.", x, y,
                 MEASURE, ST["body"])
        y -= 0.04 * inch
        y = table(ee,
                  [("Service", 0.24), ("Address or handle", 0.28), ("Primary?", 0.12),
                   ("What it unlocks", 0.20), ("Handling", 0.16)],
                  7, y, row_h=0.38 * inch, fill=1.55,
                  hint="Handling: keep open, download and close, memorialise, delete. Note "
                       "that a memorialised account often cannot be logged into at all.")
        y = two_fields(ee, ("The address most things are registered to", 0.62),
                       ("Who else can access it", 0.38), y)
        y -= 0.02 * inch
        y = callout(ee, "Why the primary address matters more than the rest.",
                    "A family who can reach that address can usually recover the rest through "
                    "ordinary account recovery, without anyone writing a password down.", y)

    page(e, "Part five · Digital assets", mail)
    e.marks["dmail"] = e.n - 1

    def money(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Digital money and marketplaces",
                         "Wallets, payment apps, trading accounts and seller accounts. Small "
                         "balances, large consequences: money in an app is easy to overlook "
                         "and hard to claim.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Service", 0.21), ("What it is for", 0.23), ("Held by", 0.16),
                   ("Linked to", 0.18), ("Approx. balance", 0.22)],
                  6, y, row_h=0.40 * inch, fill=1.75,
                  hint="Payment apps, digital wallets, trading and crypto accounts, "
                       "marketplace seller accounts, loyalty balances with a cash value.")
        y = sub_head(ee, "What a family would need", y - 0.02 * inch)
        y = para(c,
                 "Unlike a bank account, these usually have no branch and no named contact, "
                 "and their process for a death is often handled entirely inside the app. The "
                 "two facts that help most are which email address the account is registered "
                 "to, and whether a second person is named on it.", x, y, MEASURE, ST["body"])
        y = two_fields(ee, ("Email these are registered to", 0.58),
                       ("Second person named on any", 0.42), y)
        y = stack_fields(ee, [("Where the recovery or security settings for these are "
                               "documented", 1.0)], y, row_h=0.46 * inch)
        y -= 0.04 * inch
        y = para(c,
                 "Nothing on this page asks for a balance to the penny, a wallet address or a "
                 "key. An approximate figure tells a family whether it is worth pursuing, "
                 "which is the only question this book can answer.", x, y, MEASURE,
                 ST["note"])

    page(e, "Part five · Digital assets", money)
    e.marks["dmoney"] = e.n - 1


# ---------------------------------------------------------------- PART 6
def part6_extra(e, refs):
    """Two further locator sheets, continuing the reference series."""
    def sheet(rows, sheet_no, last=False):
        def body(eee):
            c, x, xr = eee.c, *eee.frame()
            y = section_head(eee, "Part six", "The locator", None, rule_to=1.6)
            y -= 0.02 * inch
            text(c, x, y, "Sheet %d of 6" % sheet_no, "Lora", 9.2, SOFT)
            y -= 0.26 * inch
            y = table(eee,
                      [("Ref", 0.06), ("Document", 0.29), ("Where it is held", 0.31),
                       ("Who else knows", 0.20), ("Verified on", 0.14)],
                      0, y, row_h=0.415 * inch, prefill=rows)
            if last:
                y = para(c,
                         "If you still need rows, write the document name on a sheet of paper, "
                         "number it 'L' with the next number in this series, and keep it folded "
                         "inside the back cover. The series is what makes the cross-references "
                         "in the rest of the book work, not the paper it is printed on.",
                         x, y - 0.02 * inch, MEASURE, ST["note"])
        return body

    sets = [
        (["Account statements — last 12 months",
          "Loan and credit agreements",
          "Pension and retirement statements",
          "Beneficiary designation forms",
          "Tax returns and notices",
          "Business accounts and filings",
          "Trust deeds and amendments",
          "Court orders and settlements",
          "Immigration and visa documents",
          "Custody or guardianship orders"], 5),
        (["Medication list and prescriptions",
          "Immunisation and vaccination records",
          "Hospital and specialist reports",
          "Dental records",
          "Optician and hearing records",
          "Insurance claim files",
          "Correspondence with a professional",
          "Anything I have not been able to place",
          "Anything a family should not open alone",
          "Anything that needs a password to read"], 6),
    ]
    for rows, no in sets:
        page(e, "Part six · The document locator", sheet(rows, no, last=(no == 6)))
        e.marks["loc%d" % no] = e.n - 1


# ---------------------------------------------------------------- PART 7
def part7_extra(e, refs):
    def meeting(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part seven", "A family conversation, with an agenda",
                         "One hour, once. Not a crisis meeting — a short one where the book "
                         "is opened in front of the people it is for.")
        y = para(c,
                 "Most families never do this, and the ones who do almost never regret it. "
                 "The point is not to discuss death. It is to make sure two people can find "
                 "one book and know what is in it. An agenda makes that easy to start and, "
                 "more importantly, easy to finish.", x, y, MEASURE, ST["body"])
        y -= 0.06 * inch

        agenda = [
            ("Where the book is", "Open it. Show them. Then put it back."),
            ("The one-page summary", "Read it aloud. It takes a minute."),
            ("Who the trusted person is", "And the second name, if the first is unreachable."),
            ("Where the documents are", "The physical place, and the digital folder."),
            ("What this book does not contain", "No passwords. Say this out loud."),
            ("Who else should know", "Anyone not in the room who should be told the book exists."),
            ("What is missing", "The gaps you both noticed. Write them in the change log."),
            ("When you will do this again", "A date, not an intention."),
        ]
        for i, (head, body) in enumerate(agenda, 1):
            hline(c, x, y + 0.13 * inch, xr, RULE_LT, 0.7)
            text(c, x, y - 0.045 * inch, "%d" % i, "Lora", 9.6, RULE)
            text(c, x + 0.30 * inch, y - 0.045 * inch, head, "Lora", 9.9, INK)
            text(c, x + 2.60 * inch, y - 0.045 * inch, body, "Lora", 9.4, SOFT)
            y -= 0.30 * inch

        y = sub_head(ee, "What was said", y - 0.04 * inch)
        y = ruled_writing(ee, y, lines=4, gap=0.32 * inch)
        y = two_fields(ee, ("Present", 0.62), ("Date", 0.38), y)
        y -= 0.02 * inch
        y = para(c,
                 "If the conversation went badly, that is worth writing down too. A family "
                 "that disagreed about something in 2026 will not be surprised by it in 2031, "
                 "and the note is what makes that possible.", x, y, MEASURE, ST["note"])

    page(e, "Part seven · Maintenance", meeting)
    e.marks["meeting"] = e.n - 1


# ---------------------------------------------------------------- PART 8
def part8_extra(e, refs):
    def executor_letter(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part eight", "A letter to whoever settles my estate",
                         "Not a will. A note to the person who will have to work through the "
                         "paperwork, saying the things a legal document has no room for.")
        y = para(c,
                 "This letter has no legal effect, and that is the point. It can say what a "
                 "will cannot: that you are sorry about the paperwork, that the second drawer "
                 "is a mess, that you would rather they paid someone to help than did it alone. "
                 "It can also point them at the pages of this book that matter most.", x, y,
                 MEASURE, ST["body"])
        y -= 0.04 * inch
        y = two_fields(ee, ("To", 0.62), ("Date", 0.38), y)
        y -= 0.02 * inch
        for i in range(11):
            write_line(c, x, y - 0.40 * inch - i * 0.44 * inch, CONTENT_W,
                       Color(0.855, 0.855, 0.855), 0.7)
        y = y - 0.40 * inch - 10 * 0.44 * inch
        label(c, x, y - 0.30 * inch,
              "the pages that will save you the most time are 13, %s and %s"
              % (refs.get("loc1", "--"), refs.get("summary", "--")), FAINT, 7.0, 0.6)

    page(e, "Part eight · Notes and letters", executor_letter, tail=False)
    e.marks["exletter"] = e.n - 1
