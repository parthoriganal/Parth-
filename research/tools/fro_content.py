"""
fro_content.py — the book text and page assembly.

Contents are laid out page by page. Page numbers are resolved in two passes (see
build_book.py), so any reference to another page goes through `refs`.

Copy rules applied throughout:
  * No legal, financial, tax or medical advice. Questions, not instructions.
  * No field anywhere accepts a password, PIN, recovery phrase, key or code.
  * Facts are limited to those verified against the sources listed in SOURCES.
"""
from reportlab.lib.pagesizes import inch

from reportlab.lib.colors import Color

from fro_layout import (
    CONTENT_W, CONTENT_TOP, CONTENT_BOT, TRACE, FOOT_RULE_Y, PAGE_W, PAGE_H, INK, BODY, SOFT, LABEL, FAINT, RULE, RULE_LT, WASH, WASH_2,
    WHITE, DARK, text, hline, vline, box, label, checkbox, write_line, para, styles,
    PAGE, MEASURE, BODY_LEAD,
)
from fro_blocks import (
    part_opener, section_head, sub_head, need_strip, callout, stack_fields, two_fields,
    table, tick_list, checklist, band, overflow_capture, crossref_note, ruled_writing,
    page_break_note, ST,
)

TITLE = "The Family Records Organizer"
SUBTITLE = "Everything your family will need to know, and where to find it"

SOURCES = [
    ("Social Security Administration, <i>How Social Security Can Help You When a Family "
     "Member Dies</i> (Publication No. 05-10008)", "ssa.gov"),
    ("USAGov, <i>Agencies to notify when someone dies</i>", "usa.gov/report-a-death"),
    ("USAGov, <i>How to get a certified copy of a death certificate</i>", "usa.gov/death-certificate"),
    ("Centers for Disease Control and Prevention, <i>Where to Write for Vital Records</i>",
     "cdc.gov/nchs/w2w"),
    ("Consumer Financial Protection Bureau, <i>Taking Control of Your Finances: Help for "
     "Surviving Spouses</i>", "consumerfinance.gov"),
    ("Consumer Financial Protection Bureau, <i>When a loved one dies and debt collectors "
     "come calling</i>", "consumerfinance.gov"),
    ("Amazon Kindle Direct Publishing, trim, margin and printing specifications",
     "kdp.amazon.com"),
]


# ---------------------------------------------------------------- page wrappers
def page(e, running, body, folio=True, tail=True):
    """Draw one worksheet page, then close it.

    `tail` adds writing room at the foot when the page ran short. A page that stops three
    inches above the bottom margin wastes the space a paperback is least generous with, and
    in a book whose whole purpose is somewhere to write, that space is the product. The
    rules are drawn only where they genuinely fit and are never used to pad a full page.
    """
    body(e)
    if tail:
        # TRACE is in inches, the typographic constants are in points: convert once, here.
        # Ignore the page furniture itself: it is drawn after the body and would otherwise
        # make every page look full.
        body_boxes = [t["y0"] * 72.0 for t in TRACE
                      if t["p"] == e.n and t["y0"] * 72.0 > FOOT_RULE_Y + 0.14 * inch
                      and t["s"].strip() != str(e.n)]
        low = min(body_boxes or [CONTENT_BOT])
        gap = low - CONTENT_BOT
        pitch, lead_in = 0.32 * inch, 0.30 * inch
        n = int((gap - lead_in) // pitch)
        if n >= 3:
            c = e.c
            x, xr = e.frame()
            y0 = low - 0.42 * inch
            label(c, x, y0, "Notes", FAINT, 7.0, 1.0)
            hline(c, x, y0 - 0.10 * inch, xr, RULE_LT, 0.7)
            for i in range(n - 1):
                write_line(c, x, y0 - 0.10 * inch - (i + 1) * pitch, CONTENT_W,
                           Color(0.86, 0.86, 0.86), 0.6)
    e.page_end[e.n] = round(e.y / inch, 3)
    e.furniture(running, folio)
    e.new_page()


PART_CONTENTS = {}      # set by build_book from the manifest, so dividers never drift


def set_part_contents(mapping):
    PART_CONTENTS.clear()
    PART_CONTENTS.update(mapping)


def opener(e, running, num, title, standfirst, contents):
    """Part divider — no folio, no running head. The contents list comes from the build
    manifest rather than a hand-written copy, so a page added to a part cannot go missing
    from its divider."""
    contents = PART_CONTENTS.get(num, contents)
    part_opener(e, num, title, standfirst, contents)
    e.furniture("", folio=False, rule=False)
    e.new_page()


# ---------------------------------------------------------------- front matter
def p_title(e):
    c, x, xr = e.c, *e.frame()
    y = CONTENT_TOP - 1.55 * inch
    hline(c, x, y + 0.30 * inch, x + 1.5 * inch, INK, 1.2)
    label(c, x, y, "A records organizer", FAINT, 7.6, 1.6)
    y -= 0.62 * inch
    for line in ("The Family", "Records", "Organizer"):
        text(c, x, y, line, "Lora", 41, INK)
        y -= 0.72 * inch
    y -= 0.06 * inch
    hline(c, x, y + 0.16 * inch, x + 3.1 * inch, RULE, 0.8)
    y -= 0.30 * inch
    y = para(c, SUBTITLE, x, y, 3.9 * inch,
             styles()["lede"])
    y -= 1.10 * inch
    label(c, x, y, "Fill in once. Tell someone. Review it every year.", FAINT, 7.4, 1.1)


def p_copyright(e, refs):
    c, x, xr = e.c, *e.frame()
    y = CONTENT_TOP - 4.0 * inch
    label(c, x, y, "About this book")
    y -= 0.26 * inch
    y = para(c,
             "This is a record-keeping aid. It is a place to write down what you have, where "
             "it is kept, who should be told, and what you would prefer. It is not a legal, "
             "financial, tax or medical document, and completing it does not create a will, "
             "a trust, a power of attorney, a healthcare directive or an estate plan.",
             x, y, MEASURE, ST["bodytight"])
    y -= 0.08 * inch
    y = para(c,
             "Nothing in these pages should be read as advice about your own circumstances. "
             "Where a question can only be answered by a qualified professional, or by the "
             "rules of the state or country you live in, this book says so and leaves the "
             "answer to them.",
             x, y, MEASURE, ST["bodytight"])
    y -= 0.08 * inch
    y = para(c,
             "This book never asks you to write down a password, PIN, recovery phrase, "
             "private key or authentication code, and no page in it is designed to hold one. "
             "It records where such things are kept — nothing more.",
             x, y, MEASURE, ST["bodytight"])

    y -= 0.42 * inch
    hline(c, x, y + 0.16 * inch, xr, RULE_LT, 0.7)
    for line in (
        "First edition.",
        "Set in Lora and Work Sans, both licensed under the SIL Open Font License 1.1.",
        "Printed in black ink on white paper. Trim 8.5 × 11 in.",
    ):
        y -= 0.215 * inch
        text(c, x, y, line, "Lora", 8.8, FAINT)
    y -= 0.42 * inch
    y = para(c,
             "The interior is laid out for a perfect-bound paperback. It does not lie flat, "
             "and the book does not claim that it does. Page %s explains how to work with "
             "that." % refs.get("lhow", "--"), x, y, MEASURE, ST["note"])


def p_contents(e, refs, entries):
    """entries: [(kind, label, title, page_or_none)]. Paginates across as many pages as the
    list needs — a contents page that runs off the bottom is worse than a second page."""
    c = e.c
    x, xr = e.frame()
    y = section_head(e, "", "Contents", None, rule_to=0.95)
    y -= 0.06 * inch
    first = True
    for kind, lab, title, pg in entries:
        step = 0.34 * inch if kind == "part" else 0.205 * inch
        if y - step < CONTENT_BOT + 0.30 * inch:
            # finish this page and start another
            e.furniture("", folio=False, rule=False)
            e.new_page()
            c = e.c
            x, xr = e.frame()
            y = section_head(e, "", "Contents",
                             "continued" if not first else None, rule_to=0.95)
            y -= 0.06 * inch
        first = False
        if kind == "part":
            y -= 0.10 * inch
            hline(c, x, y + 0.15 * inch, xr, RULE_LT, 0.7)
            if lab:
                label(c, x, y, "Part %s" % lab, FAINT, 7.2, 1.4)
            text(c, x + 0.92 * inch, y, title, "Lora", 12.2, INK)
            if pg:
                text(c, xr, y, str(pg), "Lora", 10.4, SOFT, align="R")
            y -= 0.255 * inch
        else:
            text(c, x + 0.92 * inch, y, title, "Lora", 10.2, BODY)
            if pg:
                text(c, xr, y, str(pg), "Lora", 10.2, SOFT, align="R")
            y -= 0.205 * inch
    return y


# ---------------------------------------------------------------- PART 1
def build_part1(e, refs):
    e.marks["part1"] = e.n
    opener(e, "", 1, "Getting started",
           "Four decisions turn a blank book into a record your family can actually use. "
           "They take about twenty minutes, and everything else in this organizer depends "
           "on them.",
           [("Why this organizer exists", refs.get("why")),
            ("How this book works", refs.get("how")),
            ("The four rules", refs.get("rules")),
            ("Choosing your trusted person", refs.get("trusted")),
            ("Keeping it secure", refs.get("secure")),
            ("What this can and cannot do", refs.get("limits")),
            ("A simple document system", refs.get("system")),
            ("Before you start", refs.get("start"))])

    def why(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part one", "Why this organizer exists",
                         "Most families do not lose track of the house. They lose track of "
                         "everything that sits behind a sign-in, a filing cabinet, or a "
                         "memory nobody wrote down.")
        y = para(c,
                 "Ask someone where their will is kept and most people can answer. Ask where "
                 "the deed is, which insurer holds the life policy, whether the pension has a "
                 "named beneficiary, and what the password manager is secured with, and the "
                 "answers thin out quickly. None of that is a failure of care. It is simply "
                 "that no single place was ever given the job of holding it.", x, y, MEASURE,
                 ST["body"])
        y = para(c,
                 "This book is that place. It is not a diary and it is not a filing cabinet. "
                 "It is a map of both — a written record of what exists, where it lives, and "
                 "who is allowed to know.", x, y, MEASURE, ST["body"])
        y = para(c,
                 "It is worth being plain about what a few hours with this book saves. It "
                 "does not prevent anything. What it does is remove guesswork from a week "
                 "when nobody has the energy to guess.", x, y, MEASURE, ST["body"])

        y -= 0.26 * inch
        label(c, x, y, "Three things this book does")
        y -= 0.16 * inch
        hline(c, x, y, xr, RULE, 0.7)
        y -= 0.26 * inch
        rows = [
            ("It records locations, not secrets",
             "Where the document is, not what it says. Where the sign-in is held, not the "
             "sign-in. This keeps the book safe to leave in a house."),
            ("It gives the reader an order",
             "The First 48 Hours pages are written for the person who opens this book in "
             "the worst week of their life. They are not written for you."),
            ("It expects to be out of date",
             "Accounts close, insurers change, people move. A review page and a change log "
             "are built in, because a record that is never updated quietly becomes wrong."),
        ]
        for head, body in rows:
            box(c, x, y - 0.055 * inch, 0.055 * inch, 0.055 * inch, fill=INK)
            text(c, x + 0.17 * inch, y - 0.045 * inch, head, "Lora", 10.6, INK)
            y = para(c, body, x + 0.17 * inch, y - 0.28 * inch, MEASURE - 0.17 * inch,
                     ST["bodytight"])
            y -= 0.20 * inch

    page(e, "Part one · Getting started", why)
    e.marks["why"] = e.n - 1

    def how(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part one", "How this book works",
                         "Nine parts. One of them is for you; the rest is for whoever needs "
                         "it after you.")
        y = para(c, "The book has three layers, and it helps to know which one you are "
                    "writing in at any moment.", x, y, MEASURE, ST["body"])

        y -= 0.14 * inch
        layers = [
            ("THE RECORDS", "Parts 3 to 5",
             "What exists. Accounts, policies, property, documents, digital services. "
             "Written once, then corrected as things change."),
            ("THE LOCATOR", "Part six",
             "Where each of those things is physically or digitally kept, and who else "
             "knows. Every record page carries a reference back to it."),
            ("THE ROUTINE", "Parts 2, 7, 8",
             "What someone should do, in what order — at the beginning, and then every "
             "year afterwards."),
        ]
        for tag, wherepart, body in layers:
            hline(c, x, y + 0.16 * inch, xr, RULE_LT, 0.7)
            label(c, x, y - 0.06 * inch, tag, INK, 7.4, 1.3)  # short tags, fixed 1.3 in
            text(c, x + 1.30 * inch, y - 0.055 * inch, wherepart, "Lora", 9.4, SOFT)
            y = para(c, body, x + 2.80 * inch, y + 0.04 * inch, CONTENT_W - 2.62 * inch,
                     ST["bodytight"])
            y -= 0.22 * inch

        y -= 0.30 * inch
        y = callout(ee, "You do not have to finish this.",
                    "A half-filled organizer that someone knows about is worth far more than "
                    "a perfect one nobody has seen. Fill in Part two and Part six first. "
                    "Those two are what a family actually needs in a hurry. Everything else "
                    "can be added over months, and most people will add it in bursts.", y)

        y -= 0.10 * inch
        label(c, x, y, "A sensible order of work")
        y -= 0.16 * inch
        hline(c, x, y, xr, RULE, 0.7)
        y -= 0.22 * inch
        order = [
            ("First sitting, about 30 minutes", "The four rules, your trusted person, "
             "and the First 48 Hours page."),
            ("Second sitting, about an hour", "The Document Locator. Work from the "
             "documents you can actually put your hands on."),
            ("Third sitting, about two hours", "Records — banks, insurance, property, "
             "digital accounts. Do one section per evening."),
            ("Later, unhurried", "Final wishes, letters, and the maintenance pages."),
        ]
        for i, (when, what) in enumerate(order, 1):
            text(c, x, y, str(i), "Lora", 11, RULE)
            label(c, x + 0.30 * inch, y + 0.02 * inch, when, SOFT, 7.0, 0.9)
            y = para(c, what, x + 0.30 * inch, y - 0.20 * inch, CONTENT_W - 0.40 * inch,
                     ST["bodytight"])
            y -= 0.14 * inch

    page(e, "Part one · Getting started", how)
    e.marks["how"] = e.n - 1

    def rules(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part one", "The four rules",
                         "Four rules govern the whole book. They are short on purpose.")
        rules_ = [
            ("01", "Write in pencil, or very lightly in pen.",
             "This is a living record, not a certificate. Things change. A page you are "
             "willing to correct is worth more than a page you are afraid to touch."),
            ("02", "Never write a password, PIN, recovery phrase, private key or "
             "authentication code.",
             "Record where those are kept and who can reach them. Nothing in the physical "
             "world is private once it is written down. A book on a shelf is not a vault, "
             "and it should not pretend to be one."),
            ("03", "Tell at least two people this book exists, and where you keep it.",
             "The single most common way a records organizer fails is that nobody knew it "
             "was there. A perfect record that is never found is a blank page."),
            ("04", "Review it once a year, and write down that you did.",
             "The review pages in Part seven take ten minutes. An out-of-date locator sends "
             "someone to a drawer that was emptied three years ago."),
        ]
        for n, head, body in rules_:
            hline(c, x, y + 0.15 * inch, xr, RULE_LT, 0.7)
            text(c, x, y - 0.10 * inch, n, "Lora", 21, RULE)
            y = para(c, "<b>%s</b>" % head, x + 0.62 * inch, y + 0.02 * inch,
                     CONTENT_W - 0.62 * inch,
                     ST["bodytight"].clone("rh") if hasattr(ST["bodytight"], "clone") else ST["bodytight"])
            y = para(c, body, x + 0.62 * inch, y - 0.22 * inch, MEASURE - 0.62 * inch,
                     ST["bodytight"])
            y -= 0.40 * inch

        y -= 0.14 * inch
        y = para(c,
                 "Rule two deserves one more sentence, because it is the rule people "
                 "ignore. A password written in a book protects nothing once the book "
                 "leaves the house, is photographed by a visitor, or is sold in a house "
                 "clearance. What actually protects an account is a named setting inside "
                 "the account itself, or a password manager whose own access is held "
                 "somewhere deliberately. Part five deals with all of it without asking "
                 "you to write anything secret.", x, y, MEASURE, ST["body"])

    page(e, "Part one · Getting started", rules)
    e.marks["rules"] = e.n - 1

    def trusted(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part one", "Choosing your trusted person",
                         "This is the most important page in the book and it takes three "
                         "minutes. Everything else is admin by comparison.")
        y = para(c,
                 "The trusted person is the first person you would want to have this book "
                 "in their hands. They do not need to be your executor, your next of kin, "
                 "or your closest relative. They need to be three things: willing, "
                 "reachable, and able to keep something to themselves.", x, y, MEASURE,
                 ST["body"])

        y = sub_head(ee, "The three tests", y)
        tests = [
            ("Willing", "You have asked them, and they said yes. Not assumed. Asked."),
            ("Reachable", "If they changed their phone number tomorrow, you would still be "
             "able to reach them within a day."),
            ("Discreet", "They would not read this book for interest, and would not tell "
             "siblings, neighbours or family friends what is in it."),
        ]
        for head, body in tests:
            checkbox(c, x, y - 0.015 * inch)
            text(c, x + 0.21 * inch, y - 0.01 * inch, head, "Lora", 10.4, INK)
            y = para(c, body, x + 1.28 * inch, y + 0.02 * inch, CONTENT_W - 1.28 * inch,
                     ST["bodytight"])
            y -= 0.20 * inch

        y = sub_head(ee, "Your trusted person", y - 0.10 * inch)
        y = two_fields(e, ("Name", 0.52), ("Relationship to me", 0.48), y)
        y = two_fields(e, ("Phone", 0.40), ("Email", 0.60), y)
        y = stack_fields(e, [("Address", 1.0)], y)
        y = two_fields(e, ("They know this book is kept at", 0.62),
                       ("Date I asked them", 0.38), y)

        y -= 0.06 * inch
        y = callout(ee, "A second person.",
                    "Name one more person who should know this book exists, even if they "
                    "will never need to use it. If your first contact is on the same "
                    "flight, in the same house, or simply unreachable that week, a second "
                    "name turns a plan into a plan that works.", y)

        y = stack_fields(e, [("Second person — name", 0.55),
                             ("Second person — phone or email", 0.55),
                             ("Where this book is kept (be specific: room, shelf, box)", 1.0)],
                         y, row_h=0.44 * inch)

    page(e, "Part one · Getting started", trusted)
    e.marks["trusted"] = e.n - 1

    def secure(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part one", "Keeping it secure",
                         "This book is deliberately useful to a stranger, which is exactly "
                         "why it should be hard for a stranger to find.")
        y = para(c,
                 "Because the book records locations rather than contents, losing it is "
                 "inconvenient rather than catastrophic. It tells a burglar where your "
                 "documents are, not what is in them. Still, a little care is worth taking, "
                 "and most of it costs nothing.", x, y, MEASURE, ST["body"])

        y = sub_head(ee, "Physical security", y)
        y = checklist(ee, [
            "Keep the book somewhere you would remember in the dark — not in a safe you "
            "would have to remember a combination for.",
            "Keep it out of the room a visitor would naturally sit in.",
            "If you use a safe or a locked drawer, record its location in Part six, and "
            "not its combination anywhere in this book.",
            "Tell your trusted person the room and the shelf, not just the house.",
            "If you move house, update the location on the very next review page.",
        ], y)

        y = sub_head(ee, "Digital security, without overengineering it", y - 0.04 * inch)
        y = para(c,
                 "If any part of this book is photographed or scanned, store those images "
                 "the way you would store a passport scan. A useful rule of thumb: anything "
                 "you would not email to a stranger should not sit in an unencrypted folder "
                 "called 'Documents'.", x, y, MEASURE, ST["body"])
        y = checklist(ee, [
            "Do not photograph pages that name your bank, insurer or account references.",
            "Keep any scanned copy inside a password-protected account, not a shared drive.",
            "If you use a password manager, its recovery kit belongs somewhere physical and "
            "separate from this book — not inside it.",
            "Never send a photograph of these pages in a group message.",
        ], y - 0.04 * inch)

        y -= 0.10 * inch
        y = callout(ee, "A note on what is not here.",
                    "There is no page in this book for a password, a PIN, a recovery phrase, "
                    "a private key or a one-time code. That is a design decision, not an "
                    "omission. Part five shows you how to record everything a family "
                    "actually needs — which service, what it is for, and who can get to it "
                    "— without ever writing down the thing that unlocks it.", y)

    page(e, "Part one · Getting started", secure)
    e.marks["secure"] = e.n - 1

    def limits(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part one", "What this can and cannot do",
                         "An organizer that overstates itself is worse than no organizer, "
                         "because someone will rely on it.")
        y = sub_head(ee, "What it can do", y)
        y = tick_list(ee, [
            "Tell your family what exists and where it is kept.",
            "Give someone an order of work in the first two weeks.",
            "Record your preferences clearly enough to be acted on.",
            "Show which documents you have and which you do not.",
            "Point you at the official places to replace a missing record.",
        ], y, step=0.27 * inch)

        y = sub_head(ee, "What it cannot do", y - 0.02 * inch)
        y = tick_list(ee, [
            "It does not create a will, a trust, a power of attorney, a healthcare "
            "directive or an estate plan.",
            "It does not transfer ownership of anything to anyone.",
            "It does not override a will, a beneficiary designation or a court order.",
            "It does not prove identity, age or citizenship.",
            "It does not replace advice from a lawyer, accountant or financial adviser.",
        ], y, step=0.27 * inch)

        y -= 0.10 * inch
        y = callout(ee, "The line that matters.",
                    "What you write in Part four is a record of your preferences. Whether "
                    "any of it is legally binding depends on documents prepared and signed "
                    "in the way your state or country requires — not on anything written in "
                    "this book. Part four explains the difference and tells you which items "
                    "usually need a professional.", y)

        y -= 0.18 * inch
        label(c, x, y, "If you have no will at all")
        y -= 0.16 * inch
        hline(c, x, y, xr, RULE, 0.7)
        y -= 0.22 * inch
        y = para(c,
                 "Then this book is a starting point, not a substitute. It will help you "
                 "arrive at a lawyer's office knowing what you own, who you want to provide "
                 "for, and which documents already exist — which is most of the work. Rules "
                 "for who inherits when someone dies without a will vary by state and "
                 "country, and are decided by statute, not by preference. That is a "
                 "conversation for a qualified professional where you live.", x, y, MEASURE,
                 ST["body"])

    page(e, "Part one · Getting started", limits)
    e.marks["limits"] = e.n - 1

    def system(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part one", "A simple document system",
                         "You do not need a filing system. You need one place, one naming "
                         "habit, and one list that tells someone else where the place is.")
        y = para(c,
                 "Most people already have the documents. What they lack is a location "
                 "that someone else can be told. Three small decisions fix that.", x, y,
                 MEASURE, ST["body"])

        y -= 0.14 * inch
        steps = [
            ("1", "Choose one physical home",
             "A box, a drawer, a filing cabinet — one place, not four. It does not need to "
             "be locked. It needs to be findable. Write its location on the next page, and "
             "in the Locator in Part six."),
            ("2", "Choose one digital home",
             "A single folder for scans, named for what it is, inside an account that is "
             "password-protected. Not the desktop, not a camera roll, not a shared drive."),
            ("3", "Keep one list",
             "That is the Document Locator. One row per document: what it is, where the "
             "original is, and who else knows. Everything else in this book refers back to "
             "it."),
        ]
        for n, head, body in steps:
            text(c, x, y - 0.09 * inch, n, "Lora", 16, RULE)
            text(c, x + 0.34 * inch, y - 0.05 * inch, head, "Lora", 11.2, INK)
            y = para(c, body, x + 0.34 * inch, y - 0.26 * inch, MEASURE - 0.34 * inch,
                     ST["bodytight"])
            y -= 0.26 * inch

        y = sub_head(ee, "My two homes", y - 0.06 * inch)
        y = stack_fields(e, [
            ("Where the originals live — be specific enough that a stranger could find them",
             1.0),
        ], y, row_h=0.52 * inch)
        y = two_fields(e, ("Is it locked?", 0.34), ("If locked, who else has access", 0.66), y)
        y = stack_fields(e, [
            ("Where the digital copies live — which account, which folder", 1.0),
            ("Who else can open that account, and how would they know", 1.0),
        ], y, row_h=0.50 * inch)

        y -= 0.10 * inch
        y = callout(ee, "Do not reorganise your house today.",
                    "The temptation is to buy folders and start sorting. Don't. Choose the "
                    "box you already have, write down where it is, and move on. The value is "
                    "in the written location, not the tidiness.", y)

    page(e, "Part one · Getting started", system)
    e.marks["system"] = e.n - 1

    def start(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part one", "Before you start",
                         "A short checklist to close Part one. If you do these six things, "
                         "the book already works — everything after this is detail.")
        y -= 0.06 * inch
        y = checklist(ee, [
            "I have read the four rules and I understand why there are no password fields.",
            "I have asked a trusted person, and they said yes.",
            "I have written down where this book is kept.",
            "I have told a second person the book exists.",
            "I have written where my documents live and where my digital copies live.",
            "I have booked a date to come back to this book.",
        ], y, step=0.34 * inch, dates=True)

        y -= 0.14 * inch
        y = two_fields(e, ("My next sitting is on", 0.5), ("I will start at", 0.5), y)
        y -= 0.10 * inch
        y = stack_fields(e, [("The one thing I most want this book to solve", 1.0)],
                         y, row_h=0.52 * inch)
        y = stack_fields(e, [("", 1.0)], y, row_h=0.44 * inch)

        y -= 0.20 * inch
        y = para(c,
                 "One last thing before Part two. If you stop here and never write another "
                 "page, what you have already done still matters: two people know this book "
                 "exists, it says where your documents are, and it says where the copies "
                 "are. That is not nothing. It is most of the way.", x, y, MEASURE,
                 ST["note"])

    page(e, "Part one · Getting started", start)
    e.marks["start"] = e.n - 1


# ---------------------------------------------------------------- PART 2
def build_part2(e, refs):
    opener(e, "", 2, "The first 48 hours",
           "This part is not written for you. It is written for the person who opens this "
           "book the day after you die, when they are tired, upset, and being asked "
           "questions they cannot answer.",
           [("The first 48 hours", refs.get("f48")),
            ("Who to call first", refs.get("whocall")),
            ("Where the essentials are", refs.get("essential")),
            ("Who to notify", refs.get("notify")),
            ("The first two weeks", refs.get("twoweeks")),
            ("What can safely wait", refs.get("wait"))])
    e.marks["part2"] = e.n - 1

    def f48(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part two", "The first 48 hours",
                         "One page. Eight steps, in order. Nothing here is urgent that is "
                         "not marked urgent.", rule_to=1.4)
        y -= 0.02 * inch

        h = 0.50 * inch
        box(c, x, y - h, CONTENT_W, h, fill=WASH)
        vline(c, x, y, y - h, INK, 2.2)
        # these two lines must fit inside the tinted band, which is 7.0 in wide
        text(c, x + 0.22 * inch, y - 0.20 * inch,
             "If you are reading this because someone has died, start here. Work down the list.",
             "Lora", 9.9, BODY)
        text(c, x + 0.22 * inch, y - 0.375 * inch,
             "Do not read the rest of the book yet. Nothing here needs a decision today.",
             "Lora", 9.9, SOFT)
        y -= h + 0.26 * inch

        steps = [
            ("Call the first person named",
             "Their name and number are on the next page. You do not have to do this alone."),
            ("Find the will, if there is one",
             "Its location is in the Locator. Do not remove it from where it is kept unless "
             "you need to."),
            ("Get certified copies of the death certificate",
             "Usually arranged by the funeral home. Ask how many they recommend — several "
             "institutions will each want an original."),
            ("Secure the home, the vehicle and any pets",
             "Lock up, collect the post, and make sure animals are fed and safe."),
            ("Tell the employer, if there is one",
             "Ask them to hold final pay and to explain any death-in-service benefits."),
            ("Tell the bank, but do not empty the account",
             "Ask them to flag the account. Joint accounts and named beneficiaries may "
             "work differently — ask before you act."),
            ("Do not pay, promise or distribute anything yet",
             "Not a debt, not a bill, not an heirloom. You are not obliged to decide today, "
             "and some payments cannot be undone."),
            ("Nothing else is urgent",
             "Everything in the rest of this book can wait a week. So can most of the "
             "people who will contact you."),
        ]
        for i, (head, body) in enumerate(steps, 1):
            num_y = y
            text(c, x, num_y - 0.045 * inch, "%d" % i, "Lora", 12.5, RULE)
            text(c, x + 0.30 * inch, num_y - 0.04 * inch, head, "Lora", 10.9, INK)
            y = para(c, body, x + 0.30 * inch, y - 0.225 * inch, CONTENT_W - 0.30 * inch,
                     ST["bodytight"])
            y -= 0.145 * inch

        y -= 0.06 * inch
        hline(c, x, y + 0.10 * inch, xr, RULE_LT, 0.7)
        y -= 0.22 * inch
        y = para(c,
                 "If you are the person who wrote this book: read that list again and check "
                 "that each step can actually be completed from what you have written. If a "
                 "step says 'see the Locator' and the Locator row is blank, that is the "
                 "single most useful correction you can make today.", x, y, CONTENT_W,
                 ST["note"])

    page(e, "Part two · The first 48 hours", f48)
    e.marks["f48"] = e.n - 1

    def whocall(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part two", "Who to call first",
                         "Three people, in order. If the first cannot be reached, the "
                         "second is called. That is the whole instruction.")
        y -= 0.02 * inch

        for i, (tag, fields) in enumerate([
            ("First call", [("Name", 0.55), ("Relationship", 0.45)]),
            ("Second call", [("Name", 0.55), ("Relationship", 0.45)]),
            ("Third call", [("Name", 0.55), ("Relationship", 0.45)]),
        ]):
            label(c, x, y, tag, INK, 7.6, 1.2)
            y -= 0.10 * inch
            hline(c, x, y, xr, RULE, 0.7)
            y -= 0.24 * inch
            y = two_fields(e, fields[0], fields[1], y)
            y = two_fields(e, ("Phone", 0.45), ("Email or other", 0.55), y)
            y -= 0.12 * inch

        y = sub_head(ee, "Also useful in the first week", y - 0.06 * inch)
        y = two_fields(e, ("Employer — contact", 0.55), ("Phone", 0.45), y)
        y = two_fields(e, ("Funeral home, if already chosen", 0.62), ("Phone", 0.38), y)
        y = two_fields(e, ("Neighbour or building contact", 0.60), ("Phone", 0.40), y)
        y = two_fields(e, ("Pet carer, if any", 0.60), ("Phone", 0.40), y)

        y -= 0.14 * inch
        y = callout(ee, "Why three, and why in order.",
                    "In a crisis, a list of twelve names is a list of nobody. Three names "
                    "in a stated order removes the pause where someone wonders whether it "
                    "is their place to call.", y)

    page(e, "Part two · The first 48 hours", whocall)
    e.marks["whocall"] = e.n - 1

    def essential(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part two", "Where the essentials are",
                         "The short version of the Document Locator: the seven things a "
                         "family needs in the first week, and where each one is.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Document", 0.30), ("Exactly where it is", 0.40),
                   ("Who else knows", 0.18), ("Verified", 0.12)],
                  0, y, row_h=0.44 * inch, rows_hint=1,
                  prefill=["Will or trust",
                           "Death certificate instructions",
                           "Photo identification",
                           "Birth certificate",
                           "Deed or lease",
                           "Vehicle title",
                           "Insurance policies"],
                  hint="The full locator, with forty categories, begins on page %s."
                       % refs.get("loc1", "--"))
        y -= 0.06 * inch
        y = callout(ee, "If a row is empty, that is information too.",
                    "A blank row tells you which document you do not have before a crisis "
                    "forces the question. Part six shows where to get a replacement, and "
                    "which office issues it.", y)

    page(e, "Part two · The first 48 hours", essential)
    e.marks["essential"] = e.n - 1

    def notify(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part two", "Who to notify",
                         "Not everyone needs telling in the same week. Sorting your list by "
                         "when, rather than who, is the kindest thing you can do for the "
                         "person making the calls.")
        y -= 0.02 * inch

        y = sub_head(ee, "Tell in the first two days", y)
        y = table(ee, [("Name", 0.42), ("Relationship", 0.30), ("Phone", 0.20),
                       ("Told", 0.08)], 4, y, row_h=0.30 * inch)

        y = sub_head(ee, "Tell in the first two weeks", y - 0.02 * inch)
        y = table(ee, [("Name", 0.42), ("Relationship", 0.30), ("Phone", 0.20),
                       ("Told", 0.08)], 5, y, row_h=0.30 * inch)

        y -= 0.04 * inch
        y = para(c,
                 "Organisations are different. Their order and method change from year to "
                 "year, so this book does not reproduce it. The official list of who must be "
                 "told, and which benefits stop, is maintained by USAGov and is worth reading "
                 "on the day rather than trusting a printed version — see page %s."
                 % refs.get("resources", "--"), x, y, CONTENT_W, ST["note"])

    page(e, "Part two · The first 48 hours", notify)
    e.marks["notify"] = e.n - 1

    def twoweeks(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part two", "The first two weeks",
                         "A second checklist, for when the funeral is over and the admin "
                         "begins. Tick, date, and do not worry about the order.")
        y -= 0.04 * inch
        y = checklist(ee, [
            "Read the will and note who is named as executor or personal representative.",
            "Ask a lawyer whether the estate needs to go through a court process — this "
            "varies by state and cannot be answered from a book.",
            "Notify the bank, building society or credit union, and ask how each account "
            "is held.",
            "Ask each insurer what they need in order to start a claim.",
            "Contact the pension providers and ask about named beneficiaries.",
            "Notify any employer, and ask about final pay and death-in-service benefits.",
            "Notify the Social Security Administration, and ask about survivor benefits.",
            "If the person served, contact the Department of Veterans Affairs.",
            "Forward the post, or ask a neighbour to collect it.",
            "Notify the three credit reporting agencies.",
            "Find the subscriptions that are still being charged, and stop the ones you "
            "can reverse.",
            "Make a list of what you have found, and keep it with this book.",
        ], y, step=0.315 * inch, dates=True)

    page(e, "Part two · The first 48 hours", twoweeks)
    e.marks["twoweeks"] = e.n - 1

    def wait(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part two", "What can safely wait",
                         "Permission is part of the design. Most of what will feel urgent "
                         "in the first month is not.")
        y = para(c,
                 "Grief and administration arrive together, and administration is louder. "
                 "It helps to know which decisions have a deadline and which only feel as "
                 "though they do.", x, y, MEASURE, ST["body"])

        y = sub_head(ee, "Genuinely time-sensitive", y)
        y = tick_list(ee, [
            "Securing the home, the vehicle and any animals.",
            "Reporting the death where the law or an institution requires it.",
            "Stopping benefits that would otherwise be overpaid and later reclaimed.",
            "Telling the employer, if final pay depends on it.",
            "Any insurance claim with a stated notification window.",
        ], y, step=0.27 * inch)

        y = sub_head(ee, "Can wait weeks, or longer", y - 0.02 * inch)
        y = tick_list(ee, [
            "Sorting personal possessions.",
            "Deciding what to do with furniture and clothing.",
            "Closing social media accounts or memorialising them.",
            "Cancelling memberships that do not renew automatically.",
            "Reading the rest of this book.",
            "Making any decision you are not ready to make.",
        ], y, step=0.27 * inch)

        y -= 0.16 * inch
        y = callout(ee, "One thing to be careful of.",
                    "Debt collectors sometimes contact relatives who assume they are "
                    "responsible. Often they are not. The Consumer Financial Protection "
                    "Bureau publishes free guidance on this, including how to dispute a "
                    "debt and how to make a collector stop contacting you. It is worth "
                    "reading before paying anything that is not clearly yours.", y)

    page(e, "Part two · The first 48 hours", wait)
    e.marks["wait"] = e.n - 1


# ---------------------------------------------------------------- PART 3
def build_part3(e, refs):
    opener(e, "", 3, "Family and personal records",
           "What exists, and where it lives. This is the longest part of the book and the "
           "least urgent. Work through it one section at a time, with a statement or a "
           "policy in front of you.",
           [("About me", refs.get("aboutme")),
            ("Identification documents", refs.get("id")),
            ("Family and trusted contacts", refs.get("family")),
            ("Professionals", refs.get("pros")),
            ("Medical contacts", refs.get("medical")),
            ("Insurance", refs.get("insurance")),
            ("Property and household", refs.get("property")),
            ("Financial institutions", refs.get("financial")),
            ("Debts and regular payments", refs.get("debts")),
            ("Employment and benefits", refs.get("employment"))])
    e.marks["part3"] = e.n - 1

    def aboutme(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "About me",
                         "The facts that appear on forms. This is the section strangers "
                         "will ask for most often.")
        y -= 0.04 * inch
        y = two_fields(e, ("Full legal name", 0.62), ("Other names used", 0.38), y)
        y = two_fields(e, ("Date of birth", 0.36), ("Place of birth — town, state, country",
                                                   0.64), y)
        y = two_fields(e, ("Home address", 0.62), ("Since when", 0.38), y)
        y = two_fields(e, ("Phone", 0.34), ("Email", 0.66), y)
        y = two_fields(e, ("Country of citizenship", 0.50), ("Occupation", 0.50), y)
        y = two_fields(e, ("Employer, if any", 0.58), ("Employee or self-employed", 0.42), y)
        y = two_fields(e, ("Marital status", 0.44), ("Spouse or partner — full name", 0.56), y)
        y = two_fields(e, ("Mother's maiden name", 0.50), ("Father's full name", 0.50), y)

        y = sub_head(ee, "Children and dependants", y - 0.04 * inch)
        y = table(ee, [("Full name", 0.38), ("Date of birth", 0.18),
                       ("Where they live", 0.30), ("In my care?", 0.14)],
                  3, y, row_h=0.34 * inch,
                  hint="Continue on a separate sheet if there are more than three.")

        y -= 0.02 * inch
        y = callout(ee, "A note on the mother's maiden name question.",
                    "It appears on this page because it appears on forms, and because a "
                    "family member filling in a form later will otherwise have to guess. "
                    "If a website uses that answer as a security question, do not treat "
                    "this line as the place to record it — and consider changing the "
                    "question. Part five covers security questions properly.", y)

    page(e, "Part three · Family and personal records", aboutme)
    e.marks["aboutme"] = e.n - 1

    def idp(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Identification documents",
                         "Numbers, issuing offices and locations. Record the last four digits "
                         "where a number is sensitive — the family needs to know it exists, "
                         "not to memorise it.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Document", 0.26), ("Number — last 4", 0.18),
                   ("Issued by", 0.22), ("Expires", 0.11),
                   ("Original kept at", 0.23)],
                  0, y, row_h=0.42 * inch, rows_hint=1, max_row_h=0.44,
                  prefill=["Passport",
                           "Driver licence or state ID",
                           "Birth certificate",
                           "Social Security card",
                           "Marriage certificate",
                           "Divorce decree",
                           "Naturalisation or citizenship papers",
                           "Military discharge (DD-214)",
                           "Professional licence",
                           "Other identification"])

        y -= 0.04 * inch
        y = para(c,
                 "Replacing these has a route, and it is worth knowing before you need it. "
                 "Birth, death, marriage and divorce records are held by the state or "
                 "territory where the event happened, and the CDC maintains a directory of "
                 "every issuing office. Passports are handled by the State Department. A "
                 "Social Security card is replaced through the Social Security "
                 "Administration. Page %s lists where to start with each."
                 % refs.get("resources", "--"), x, y, MEASURE, ST["body"], trailing=False)

    page(e, "Part three · Family and personal records", idp)
    e.marks["id"] = e.n - 1

    def family(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Family and trusted contacts",
                         "The people a family will need to reach. Not a Christmas card list "
                         "— the names that will actually be called.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Name", 0.26), ("Relationship", 0.18), ("Phone", 0.20),
                   ("Email", 0.21), ("Knows book", 0.15)],
                  6, y, row_h=0.36 * inch, fill=3.62,
                  hint="Add a tick in the last column only for people who have actually been "
                       "told.")
        y -= 0.02 * inch
        y = sub_head(ee, "Who is who", y)
        y = two_fields(e, ("Executor or personal representative named in my will", 0.66),
                       ("They know?", 0.34), y)
        y = two_fields(e, ("Guardian named for any minor child", 0.66), ("They know?", 0.34), y)
        y = two_fields(e, ("Attorney holding my will, if any", 0.66), ("Firm", 0.34), y)
        y = two_fields(e, ("Next of kin for hospital purposes", 0.66), ("Relationship", 0.34), y)

        y -= 0.06 * inch
        y = para(c,
                 "If any of those named have not been told, that is the most valuable "
                 "correction available on this page. A named executor who does not know they "
                 "are named is a plan with a hole in it.", x, y, MEASURE, ST["note"])

    page(e, "Part three · Family and personal records", family)
    e.marks["family"] = e.n - 1

    def pros(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Professionals",
                         "The people who already hold a piece of the picture. One line each "
                         "on what they are for, so a family member knows who to call about "
                         "what.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Role", 0.20), ("Name", 0.18), ("Firm", 0.18), ("Phone", 0.15),
                   ("What they handle", 0.29)],
                  0, y, row_h=0.44 * inch, rows_hint=1,
                  prefill=["Lawyer — estate",
                           "Lawyer — other",
                           "Accountant or tax preparer",
                           "Financial adviser",
                           "Insurance agent",
                           "Banker or relationship manager",
                           "Doctor",
                           "Dentist",
                           "Other"])
        y -= 0.04 * inch
        y = para(c,
                 "This page is not about loyalty to a professional. It is about the two "
                 "questions a family will ask in week one: who has a copy of the will, and "
                 "who prepared the last tax return. If the answer is on this page, those "
                 "two conversations take minutes instead of weeks.", x, y, MEASURE,
                 ST["body"])

    page(e, "Part three · Family and personal records", pros)
    e.marks["pros"] = e.n - 1

    def medical(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Medical contacts",
                         "Where the records are and who holds them. This part records "
                         "contacts and locations only — it contains no medical advice and "
                         "nothing to be acted on clinically.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Practice or provider", 0.30), ("What for", 0.24), ("Phone", 0.18),
                   ("Records kept at", 0.28)],
                  5, y, row_h=0.34 * inch, max_row_h=0.42)

        y = sub_head(ee, "The documents a hospital may ask about", y - 0.02 * inch)
        y = table(ee,
                  [("Document", 0.38), ("Exists?", 0.13), ("Where kept", 0.31),
                   ("Copy with", 0.18)],
                  0, y, row_h=0.34 * inch, rows_hint=1,
                  prefill=["Advance directive or living will",
                           "Healthcare power of attorney",
                           "Do not resuscitate order, if any",
                           "Organ donation registration",
                           "Medication list, current"])
        y -= 0.02 * inch
        y = para(c,
                 "Whether these must be witnessed, notarised or signed by particular people "
                 "differs by state, and sometimes by hospital. Ask the professional preparing "
                 "them, not this book. This page only records that a document exists and "
                 "where the signed original is kept.",
                 x, y, MEASURE, ST["note"], trailing=False)

    page(e, "Part three · Family and personal records", medical)
    e.marks["medical"] = e.n - 1

    def insurance(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Insurance",
                         "The single most commonly missing fact in an estate is which "
                         "insurer holds which policy, and who is named as beneficiary.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Type", 0.16), ("Insurer", 0.18), ("Policy — last 4", 0.17),
                   ("Beneficiary", 0.17), ("Agent", 0.14), ("Where policy is", 0.18)],
                  0, y, row_h=0.44 * inch, rows_hint=1,
                  prefill=["Life",
                           "Life — through employer",
                           "Long-term care",
                           "Homeowners or renters",
                           "Motor vehicle",
                           "Health",
                           "Dental or vision",
                           "Travel",
                           "Umbrella or liability",
                           "Other"])

        y -= 0.04 * inch
        y = callout(ee, "Why the beneficiary column matters most.",
                    "A named beneficiary usually takes an insurance payout directly, without "
                    "going through a court process, and the policy is not governed by what a "
                    "will says. If the column is blank on your policy, or the person named "
                    "has died, ask the insurer what happens — that is a fact about your "
                    "policy, not a general rule. Checking it takes one phone call and is the "
                    "highest-value thing on this page.", y)

    page(e, "Part three · Family and personal records", insurance)
    e.marks["insurance"] = e.n - 1

    def property(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Real property",
                         "Land and buildings, and where the paperwork for each one lives. "
                         "Vehicles and household suppliers have their own pages.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Address or description", 0.30), ("How it is titled", 0.17),
                   ("Mortgage / lender", 0.20), ("Deed is at", 0.17),
                   ("Insurance", 0.16)],
                  4, y, row_h=0.54 * inch, fill=4.3,
                  hint="'How it is titled' means sole, joint, tenants in common, in trust. It "
                       "decides what happens next, and it is worth confirming with the deed "
                       "rather than from memory.")

        y = sub_head(ee, "If you rent or lease", y - 0.02 * inch)
        y = two_fields(ee, ("Landlord or agent", 0.56), ("Phone", 0.44), y)
        y = two_fields(ee, ("Lease ends", 0.34), ("Deposit held by", 0.66), y)
        y = two_fields(ee, ("Where the signed lease is", 0.56), ("Notice period", 0.44), y)

        y = sub_head(ee, "Anything attached to the property", y - 0.02 * inch)
        y = two_fields(ee, ("Rights of way, easements or shared access", 0.60),
                       ("Documented where", 0.40), y)
        y = two_fields(ee, ("Service charges or ground rent", 0.60),
                       ("Paid to", 0.40), y)
        y = stack_fields(ee, [("Anything a buyer, a surveyor or a family would need to know "
                               "about this property", 1.0)], y, row_h=0.46 * inch)
        y -= 0.04 * inch
        y = para(c,
                 "Two facts usually decide everything else about a property: how it is titled, "
                 "and whether there is a mortgage. Both are on the deed and the mortgage "
                 "statement, neither is reliably in anyone's memory.", x, y, MEASURE,
                 ST["note"])

    page(e, "Part three · Family and personal records", property)
    e.marks["property"] = e.n - 1

    def financial(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Financial institutions",
                         "Which institution, which type of account, and who is named on it. "
                         "Last four digits only — a family needs to know the account exists, "
                         "not its number.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Institution", 0.22), ("Type", 0.15),
                   ("Last 4", 0.09), ("Held with", 0.12),
                   ("Beneficiary or TOD", 0.22), ("Branch or adviser", 0.19)],
                  8, y, row_h=0.40 * inch,
                  hint="'Held with' means joint owner, or sole. This single word decides how "
                       "much of the rest of the process applies.")
        y -= 0.02 * inch
        y = para(c,
                 "How an account is held — sole, joint, 'payable on death', in trust — "
                 "usually matters more than what the will says, because many accounts pass "
                 "outside a will entirely. This book cannot tell you what applies to your "
                 "own accounts; your bank can, in one conversation, and the answer is worth "
                 "writing on this page.", x, y, MEASURE, ST["note"])

    page(e, "Part three · Family and personal records", financial)
    e.marks["financial"] = e.n - 1

    def debts(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Debts and regular payments",
                         "What goes out every month, so that a family can tell a necessary "
                         "payment from a forgotten one.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Who is paid", 0.24), ("For what", 0.25), ("Frequency", 0.13),
                   ("Auto?", 0.10), ("Cancel / keep", 0.15), ("Reference", 0.13)],
                  8, y, row_h=0.40 * inch,
                  hint="Include rent or mortgage, utilities, insurance premiums, "
                       "subscriptions, loans and anything that renews without asking.")
        y -= 0.04 * inch
        y = callout(ee, "The most expensive forgotten thing.",
                    "Automatic renewals keep charging after a death, and a card can run up "
                    "an overdraft for months before anyone notices. The 'cancel or keep' "
                    "column is the one a family will actually use — decide it now, while you "
                    "are calm, rather than leaving it to be guessed later.", y)
        y = stack_fields(e, [("Anything a family should know before paying a bill here", 1.0)],
                         y, row_h=0.50 * inch)

    page(e, "Part three · Family and personal records", debts)
    e.marks["debts"] = e.n - 1

    def employment(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Employment and benefits",
                         "Where the final pay, the pension and the death-in-service cover "
                         "come from — and who at the organisation to ask.")
        y -= 0.04 * inch
        y = two_fields(e, ("Current or last employer", 0.62), ("Employee number", 0.38), y)
        y = two_fields(e, ("HR contact", 0.55), ("Phone or email", 0.45), y)
        y = two_fields(e, ("Pension scheme — provider", 0.60), ("Scheme reference", 0.40), y)
        y = two_fields(e, ("Named beneficiary on the pension", 0.66), ("Where recorded", 0.34), y)
        y = two_fields(e, ("Death-in-service benefit", 0.44), ("Multiple of salary", 0.30), y)
        y = two_fields(e, ("Union or professional body", 0.55), ("Membership number", 0.45), y)

        y = sub_head(ee, "Other benefits to check", y - 0.04 * inch)
        y = checklist(ee, [
            "Final salary or wages still owed.",
            "Untaken holiday pay.",
            "Company shares, options or profit share.",
            "A retirement account held through an employer.",
            "A life insurance policy arranged through work.",
            "A trade or professional association death benefit.",
            "Any state or federal benefit currently being received.",
        ], y, step=0.30 * inch)

        y -= 0.02 * inch
        y = para(c,
                 "Benefits and pension rules change, and this book deliberately does not "
                 "restate them. What it records is where to ask. The employer and the pension "
                 "provider will both want a death certificate reference; the funeral home "
                 "usually supplies it.", x, y, MEASURE, ST["note"])

    page(e, "Part three · Family and personal records", employment)
    e.marks["employment"] = e.n - 1
