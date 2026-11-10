"""
fro_content2.py — Parts four to eight, and the back matter.
"""
from reportlab.lib.pagesizes import inch
from reportlab.lib.colors import Color
from reportlab.pdfbase import pdfmetrics as pm

from fro_layout import (
    CONTENT_W, CONTENT_BOT, INK, BODY, SOFT, LABEL, FAINT, RULE, RULE_LT, WASH,
    WASH_2, WHITE, DARK, text, hline, vline, box, label, checkbox, write_line, para,
    styles, MEASURE,
)
from fro_blocks import (
    part_opener, section_head, sub_head, need_strip, callout, stack_fields, two_fields,
    table, tick_list, checklist, band, overflow_capture, crossref_note, ruled_writing,
    page_break_note, ST,
)
from fro_content import page, opener




def _fit_label(c, x, y, s, color, size, track, room):
    """Uppercase tracked label that shrinks rather than running into the next column."""
    from reportlab.pdfbase import pdfmetrics as pm
    sz, tr = size, track
    while sz > 7.0:
        w = pm.stringWidth(s.upper(), "WorkSans-B", sz) + tr * max(len(s) - 1, 0)
        if w <= room:
            break
        sz -= 0.2
        tr = max(0.1, tr - 0.06)
    label(c, x, y, s, color, sz, tr)


def labelled_rows(ee, y, rows, label_w=1.66, size=None):
    """Left column heading, right column body, hairline between. Used instead of a
    table wherever the second column is book copy rather than a place to write."""
    c, x, xr = ee.c, *ee.frame()
    st = ST["bodytight"] if size is None else size
    for head, body in rows:
        hline(c, x, y + 0.13 * inch, xr, RULE_LT, 0.7)
        text(c, x, y - 0.05 * inch, head, "Lora", 9.6, INK)
        y = para(c, body, x + label_w * inch, y + 0.06 * inch,
                 CONTENT_W - label_w * inch, st) - 0.09 * inch
    return y


# ---------------------------------------------------------------- PART 4
def build_part4(e, refs):
    opener(e, "", 4, "Wishes and preferences",
           "What you would like to happen. This part is written in the first person on "
           "purpose: these are your words, and the person reading them should hear your "
           "voice, not a form's.",
           [("Preference is not instruction", refs.get("pline")),
            ("My healthcare wishes", refs.get("health")),
            ("Funeral and disposition", refs.get("funeral")),
            ("Obituary worksheet", refs.get("obit")),
            ("Personal belongings", refs.get("belongings")),
            ("Dependants and pets", refs.get("pets")),
            ("Questions to discuss with family", refs.get("questions")),
            ("What needs a professional", refs.get("pro")),
            ("People I would like told in person", refs.get("inperson"))])
    e.marks["part4"] = e.n - 1

    def pline(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "Preference is not instruction",
                         "One distinction governs this entire part, and getting it right "
                         "is the difference between helping your family and misleading them.")
        y = para(c,
                 "A preference is what you would like. An instruction is what the law will "
                 "enforce. They can say the same thing, but only one of them is binding — "
                 "and which is which depends on documents prepared and signed the way your "
                 "state or country requires.", x, y, MEASURE, ST["body"])

        y -= 0.12 * inch
        hline(c, x, y + 0.14 * inch, xr, RULE_LT, 0.7)
        y -= 0.10 * inch
        label(c, x, y - 0.04 * inch, "Preference", INK, 7.4, 1.2)
        label(c, x + CONTENT_W * 0.52, y - 0.04 * inch, "Instruction", INK, 7.4, 1.2)
        y -= 0.26 * inch
        left = ("\"I would like my ashes scattered at the lake.\"<br/><br/>"
                "\"Please don't have a big service.\"<br/><br/>"
                "\"I want my daughter to have the piano.\"<br/><br/>"
                "Recorded here, and acted on because your family chooses to honour it.")
        right = ("\"My sister is to be the executor.\"<br/><br/>"
                 "\"The house passes to my children equally.\"<br/><br/>"
                 "\"My share of the business transfers to my partner.\"<br/><br/>"
                 "Recorded in a will, deed, beneficiary form or court filing — not here.")
        yl = para(c, left, x, y, CONTENT_W * 0.46, ST["bodytight"])
        yr = para(c, right, x + CONTENT_W * 0.54, y, CONTENT_W * 0.46, ST["bodytight"])

        y = min(yl, yr) - 0.34 * inch
        y = callout(ee, "What this means in practice.",
                    "Write freely in this part. It is genuinely valuable — families "
                    "overwhelmingly follow written wishes. But do not use it instead of a "
                    "will, and do not use it to change one. If you want something to be "
                    "binding, it has to be done the formal way, and page %s lists the items "
                    "that usually need that." % refs.get("pro", "--"), y)

        y -= 0.10 * inch
        label(c, x, y, "Three things worth knowing before you write")
        y -= 0.16 * inch
        hline(c, x, y, xr, RULE, 0.7)
        y -= 0.22 * inch
        for t in [
            "A will can generally be changed only by making another will, or by a formal "
            "amendment called a codicil. Writing a change in this book will not do it.",
            "Many financial accounts pass by beneficiary designation, which overrides "
            "what a will says. The name on the form is the one that counts.",
            "Requirements for witnessing, notarising and capacity differ between states. "
            "A document that is valid where it was signed may not be accepted elsewhere.",
        ]:
            box(c, x, y - 0.055 * inch, 0.05 * inch, 0.05 * inch, fill=SOFT)
            y = para(c, t, x + 0.19 * inch, y + 0.06 * inch, MEASURE - 0.19 * inch,
                     ST["bodytight"])
            y -= 0.16 * inch

    page(e, "Part four · Wishes and preferences", pline)
    e.marks["pline"] = e.n - 1

    def health(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "My healthcare wishes",
                         "Who speaks for me, and where the signed documents are. This page "
                         "records names and locations — it is not a medical directive and "
                         "carries no clinical instruction.")
        y -= 0.04 * inch
        y = two_fields(e, ("The person I want to speak for me", 0.62), ("Relationship", 0.38), y)
        y = two_fields(e, ("Phone", 0.40), ("Second choice, if they cannot", 0.60), y)
        y = two_fields(e, ("My doctor", 0.58), ("Phone", 0.42), y)
        y = stack_fields(e, [("Where my signed advance directive is kept", 1.0),
                             ("Who holds a copy", 1.0)], y, row_h=0.46 * inch)

        y = sub_head(ee, "What I have already told the people above", y - 0.02 * inch)
        y = para(c,
                 "The most useful thing on this page is not a legal reference. It is a note "
                 "saying that the conversation actually happened, so a family member does "
                 "not have to wonder whether they are guessing.", x, y, MEASURE, ST["body"])
        y = ruled_writing(ee, y, lines=5, gap=0.31 * inch)

        y -= 0.06 * inch
        y = callout(ee, "Where the form itself goes.",
                    "A living will, healthcare power of attorney or advance directive is "
                    "only useful if someone can produce it. Keep the signed original "
                    "somewhere you can name, give a copy to the person named, and ask your "
                    "doctor whether they want a copy for their file. Requirements for "
                    "witnesses and notaries vary by state; the professional preparing the "
                    "document will know.", y)

    page(e, "Part four · Wishes and preferences", health)
    e.marks["health"] = e.n - 1

    def funeral(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "Funeral and disposition",
                         "The practical decisions, written down before anyone has to make "
                         "them in a hurry and at a price.")
        y -= 0.06 * inch

        label(c, x, y, "Burial, cremation or donation")
        y -= 0.22 * inch
        cx = x
        for opt in ("Burial", "Cremation", "Donation to science", "Already arranged"):
            checkbox(c, cx, y, 8.4)
            text(c, cx + 0.155 * inch, y + 0.022 * inch, opt, "WorkSans", 8.2, BODY)
            cx += 0.155 * inch + pm.stringWidth(opt, "WorkSans", 8.2) + 0.24 * inch
        y -= 0.26 * inch
        checkbox(c, x, y, 8.4)
        text(c, x + 0.155 * inch, y + 0.022 * inch, "Not sure — ask my family", "WorkSans",
             8.2, BODY)
        y -= 0.34 * inch

        y = two_fields(e, ("If burial — cemetery or plot", 0.62), ("Plot reference", 0.38), y)
        y = two_fields(e, ("If cremation — what should happen to my ashes", 0.62),
                       ("Who decides", 0.38), y)
        y = two_fields(e, ("Funeral home, if already chosen", 0.62), ("Phone", 0.38), y)
        y = two_fields(e, ("Is a funeral plan already paid for?", 0.50),
                       ("Plan reference", 0.50), y)

        y = sub_head(ee, "The service", y - 0.02 * inch)
        y = two_fields(e, ("Where", 0.58), ("Who leads it", 0.42), y)
        y = two_fields(e, ("Music I would like", 0.55), ("Readings or words", 0.45), y)
        y = two_fields(e, ("Who should speak", 0.55), ("Who should not be asked to", 0.45), y)
        y = two_fields(e, ("Flowers, or donations to", 0.55), ("Charity and address", 0.45), y)

        y = sub_head(ee, "Anything else that matters to me", y - 0.02 * inch)
        y = ruled_writing(ee, y, lines=3, gap=0.31 * inch)

        y -= 0.02 * inch
        y = para(c,
                 "If you have prepaid a funeral plan, say so here and record where the "
                 "paperwork is. A paid plan that nobody knows about is often paid for twice.",
                 x, y, MEASURE, ST["note"])

    page(e, "Part four · Wishes and preferences", funeral)
    e.marks["funeral"] = e.n - 1

    def obit(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "Obituary worksheet",
                         "The facts a family would otherwise have to reconstruct from memory "
                         "in the worst possible week. Fill in what you can; leave the rest.")
        y -= 0.04 * inch
        y = two_fields(e, ("Full name", 0.60), ("Known as", 0.40), y)
        y = two_fields(e, ("Born — date", 0.40), ("Born — place", 0.60), y)
        y = two_fields(e, ("Parents' names", 0.62), ("", 0.38), y)
        y = two_fields(e, ("Schools and colleges", 0.55), ("Years", 0.45), y)
        y = two_fields(e, ("Career — main roles", 0.62), ("Employers", 0.38), y)
        y = two_fields(e, ("Military service, if any", 0.55), ("Branch and years", 0.45), y)
        y = two_fields(e, ("Memberships, clubs, volunteering", 0.62), ("", 0.38), y)

        y = sub_head(ee, "Family to be named", y - 0.02 * inch)
        y = table(ee, [("Name", 0.40), ("Relationship", 0.28), ("Living or deceased", 0.32)],
                  4, y, row_h=0.30 * inch)

        y = sub_head(ee, "What I would like said about me", y - 0.02 * inch)
        y = ruled_writing(ee, y, lines=3, gap=0.31 * inch)
        y -= 0.02 * inch
        y = two_fields(e, ("Charity for donations", 0.60), ("Where to send them", 0.40), y)

    page(e, "Part four · Wishes and preferences", obit)
    e.marks["obit"] = e.n - 1

    def belongings(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "Personal belongings",
                         "The things you would like particular people to have. This is a "
                         "record of wishes; it does not change a will, and it cannot.")
        y -= 0.04 * inch

        h = 0.44 * inch
        box(c, x, y - h, CONTENT_W, h, fill=WASH)
        vline(c, x, y, y - h, INK, 2.0)
        text(c, x + 0.20 * inch, y - 0.185 * inch,
             "This page records what I would like. It does not transfer ownership of "
             "anything.", "Lora", 9.6, BODY)
        text(c, x + 0.20 * inch, y - 0.345 * inch,
             "If an item must go to a specific person by law, it needs to be named in your "
             "will.", "Lora", 9.6, SOFT)
        y -= h + 0.24 * inch

        y = table(ee,
                  [("Item", 0.26), ("Where it is", 0.19), ("Who should have it", 0.23),
                   ("Promised?", 0.14), ("In my will?", 0.18)],
                  7, y, row_h=0.42 * inch,
                  hint="Start with the things people will actually argue about: jewellery, "
                       "tools, instruments, photographs, furniture with a story attached.")
        y -= 0.04 * inch
        y = callout(ee, "The photographs problem.",
                    "Photographs and letters are the possessions most families fall out "
                    "over and the ones least often mentioned in a will. If there is a set "
                    "you care about, say here who should have it — and if it should be "
                    "shared, say how, because 'they'll sort it out' rarely works.", y)

    page(e, "Part four · Wishes and preferences", belongings)
    e.marks["belongings"] = e.n - 1

    def pets(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "Dependants and pets",
                         "For anyone who would be left in someone else's care. Write the "
                         "routines down — the practical detail is what the person taking "
                         "them on will thank you for.")
        y -= 0.04 * inch
        y = sub_head(ee, "Pets", y)
        y = table(ee,
                  [("Name", 0.16), ("Kind and breed", 0.20), ("Age", 0.07),
                   ("Vet and phone", 0.27), ("Who should care for them", 0.30)],
                  3, y, row_h=0.38 * inch)
        y = two_fields(e, ("Feeding and medication routine", 0.60), ("Insurance policy", 0.40), y)
        y = two_fields(e, ("Microchip number", 0.44), ("Registered to", 0.56), y)
        y = stack_fields(e, [("Anything a new carer must know", 1.0)], y, row_h=0.46 * inch)
        y = ruled_writing(ee, y, lines=2, gap=0.31 * inch)

        y = sub_head(ee, "Dependants", y - 0.02 * inch)
        y = para(c,
                 "Whether arrangements for a dependant are legally binding depends on "
                 "documents prepared properly — guardianship named in a will, a trust, or a "
                 "court order. This page records your wishes and the practical detail; "
                 "page %s lists what needs a professional."
                 % refs.get("pro", "--"), x, y, MEASURE, ST["body"])
        y = two_fields(e, ("Who I would like to care for them", 0.62), ("Relationship", 0.38), y)
        y = two_fields(e, ("Second choice", 0.62), ("Relationship", 0.38), y)
        y = stack_fields(e, [("School, doctor and daily routine", 1.0),
                             ("Anything else the carer must know", 1.0)],
                         y, row_h=0.44 * inch)

    page(e, "Part four · Wishes and preferences", pets)
    e.marks["pets"] = e.n - 1

    def questions(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "Questions to discuss with family",
                         "The conversation is the point. These are prompts for it, and space "
                         "to write what was said, so the next person does not have to ask "
                         "again.")
        y = para(c,
                 "You do not have to answer these alone or in one sitting. The value is that "
                 "the conversation happened and somebody wrote it down. If you would rather "
                 "not write the answers, write the date you had the conversation and who was "
                 "there — that alone prevents a great deal of guessing.", x, y, MEASURE,
                 ST["body"])
        y -= 0.06 * inch

        prompts = [
            "Is there anything you would want us to do, or not do, that we would not guess?",
            "Who would you want making decisions if you could not? Have you asked them?",
            "Which of these decisions would you rather we made together, than you alone?",
            "Is there anything in this book you would rather certain people did not see?",
            "Is there anyone you would want contacted that we might not think of?",
            "What would you want us to do with your things that would feel wrong to guess at?",
            "Is there anything you have been meaning to say to someone?",
        ]
        for i, q in enumerate(prompts, 1):
            text(c, x, y - 0.03 * inch, str(i), "Lora", 9.6, RULE)
            y = para(c, q, x + 0.26 * inch, y + 0.02 * inch, CONTENT_W - 0.26 * inch,
                     ST["bodytight"])
            y -= 0.10 * inch
            write_line(c, x + 0.26 * inch, y + 0.06 * inch, CONTENT_W - 0.26 * inch,
                       RULE_LT, 0.7)
            write_line(c, x + 0.26 * inch, y - 0.19 * inch, CONTENT_W - 0.26 * inch,
                       RULE_LT, 0.7)
            y -= 0.34 * inch

        y -= 0.06 * inch
        y = two_fields(e, ("Conversation had on", 0.44), ("With", 0.56), y)

    page(e, "Part four · Wishes and preferences", questions)
    e.marks["questions"] = e.n - 1

    def pro(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "What needs a professional",
                         "The items that cannot be done in a book, who usually prepares them, "
                         "and the question worth asking before you pay anyone.")
        y -= 0.04 * inch
        y = labelled_rows(ee, y, [
            ("A will",
             "An attorney in your state, or a service that supplies one. Two requirements "
             "are not optional: the witnesses your state requires, and the signature "
             "formalities. Ask who witnesses it and what happens if one of them cannot be "
             "found later."),
            ("A trust",
             "An attorney. A trust is a legal structure with tax and reporting "
             "consequences, and a badly drafted one is worse than none. Ask what has to be "
             "transferred into it, because an empty trust does nothing."),
            ("Power of attorney — finances",
             "An attorney, or a form provided by your state. Ask which powers it grants, "
             "when it starts, and whether your state requires a notary or witnesses."),
            ("Healthcare directive",
             "Often a state form, sometimes completed with your doctor. Ask whether your "
             "state requires witnesses, a notary, or both, and whether your doctor will "
             "keep a copy."),
            ("Guardianship of a minor",
             "Normally named in a will, prepared by an attorney. Ask what the court will "
             "require, because a named guardian may still need court approval."),
            ("Beneficiary designations",
             "The institution holding the account, on their own form. Ask for a copy of the "
             "completed form and keep it with the account record — this is the document that "
             "usually overrides the will."),
            ("Property and titles",
             "An attorney, a title company or the county recorder. Ask how the property is "
             "currently held, because that determines what happens next."),
        ], label_w=2.30)
        y -= 0.06 * inch
        y = callout(ee, "One question that saves money.",
                    "If you are paying someone to prepare documents, ask two things: which of "
                    "these do I actually need for my situation, and what will it cost in total "
                    "including filing fees. Both are fair questions, and the answers belong in "
                    "the change log at the back.", y)
        y -= 0.06 * inch
        y = para(c,
                 "This book can record that each document exists and where the signed original "
                 "is kept, and that is genuinely useful. It cannot create any of them, and no "
                 "amount of careful writing here makes one binding.", x, y, MEASURE,
                 ST["body"])

    page(e, "Part four · Wishes and preferences", pro)
    e.marks["pro"] = e.n - 1

    def inperson(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "People I would like told in person",
                         "Not a notification list — the handful of people who should hear it "
                         "from someone, not read it.")
        y = para(c,
                 "A death reaches a wide circle quickly and unevenly. This page names the "
                 "people for whom the manner of hearing it matters, and who should be the one "
                 "to tell them.", x, y, MEASURE, ST["body"])
        y -= 0.06 * inch
        y = table(ee,
                  [("Name", 0.28), ("Relationship", 0.20), ("Who should tell them", 0.26),
                   ("Anything to say first", 0.26)],
                  6, y, row_h=0.44 * inch)
        y -= 0.02 * inch
        y = stack_fields(e, [("Anyone who should be told before the news spreads", 1.0)],
                         y, row_h=0.50 * inch)
        y = para(c,
                 "If there is someone you would rather were told kindly, by a particular "
                 "person, this is the page that makes that possible. It is a small thing to "
                 "write and it is worth a great deal later.", x, y - 0.06 * inch, MEASURE,
                 ST["note"])

    page(e, "Part four · Wishes and preferences", inperson)
    e.marks["inperson"] = e.n - 1


# ---------------------------------------------------------------- PART 5
def build_part5(e, refs):
    opener(e, "", 5, "Digital assets",
           "The part of an estate that did not exist thirty years ago. Nothing here asks "
           "you to write a secret. Everything here asks you to write a location.",
           [("Why this part is different", refs.get("dwhy")),
            ("The one rule", refs.get("drule")),
            ("Account and service inventory", refs.get("dinv")),
            ("Legacy and next-of-kin settings", refs.get("dlegacy")),
            ("Where my digital documents live", refs.get("ddocs")),
            ("Password manager and recovery kit", refs.get("dpm")),
            ("Security questions", refs.get("dsecq")),
            ("Accounts to keep, close or memorialise", refs.get("dclose")),
            ("Recurring digital charges", refs.get("dsubs")),
            ("Digital review dates", refs.get("dreview"))])
    e.marks["part5"] = e.n - 1

    def why(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Why this part is different",
                         "A house can be found. A photograph library cannot, if nobody knows "
                         "it exists.")
        y = para(c,
                 "Most of what a person owns today leaves no physical trace. There is no "
                 "drawer to open, no envelope to find, no key on a hook. There is an account "
                 "behind a sign-in that only one person has ever used, and the family has to "
                 "guess that it exists at all.", x, y, MEASURE, ST["body"])
        y = para(c,
                 "That has three consequences this part is built around.", x, y, MEASURE,
                 ST["body"])

        y -= 0.10 * inch
        rows = [
            ("Nobody can search for what they cannot name",
             "So the inventory on page %s lists services by name, with room to write the ones "
             "this book did not think of. That is the difference between a checklist and an "
             "inventory." % refs.get("dinv", "--")),
            ("Ownership is not the same as access",
             "A purchased film, an ebook library, a domain name and a currency balance are "
             "held on very different terms. This book records what each thing is for and "
             "what should happen to it, which is what a family needs."),
            ("Some things should be closed, and some should not",
             "A photo library is worth keeping. A subscription is worth cancelling. An "
             "account full of messages may be worth memorialising rather than deleting. "
             "Deciding that in advance is a gift, not a chore."),
        ]
        for head, body in rows:
            hline(c, x, y + 0.14 * inch, xr, RULE_LT, 0.7)
            text(c, x, y - 0.06 * inch, head, "Lora", 10.4, INK)
            y = para(c, body, x, y - 0.28 * inch, MEASURE, ST["bodytight"])
            y -= 0.20 * inch

        y -= 0.04 * inch
        y = callout(ee, "A word about what is not recorded.",
                    "There is no page in this part for a password, a PIN, a recovery phrase, a "
                    "private key or a one-time code, and there never will be. What is recorded "
                    "is where each of those is held and who can reach it. That is the only "
                    "version of this book that is safe to keep in a house.", y)

    page(e, "Part five · Digital assets", why)
    e.marks["dwhy"] = e.n - 1

    def drule(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "The one rule",
                         "Record the location, never the thing itself. The rest of the design "
                         "follows from that.", rule_to=1.2)
        y -= 0.04 * inch

        h = 1.34 * inch
        box(c, x, y - h, CONTENT_W, h, fill=WASH)
        vline(c, x, y, y - h, INK, 2.4)
        text(c, x + 0.24 * inch, y - 0.245 * inch, "DO NOT WRITE IN THIS BOOK",
             "WorkSans-B", 7.6, SOFT, space=1.2)
        lines = ["a password or PIN", "a recovery phrase or seed phrase",
                 "a private key, backup code or one-time code",
                 "an answer to a security question"]
        yy = y - 0.47 * inch
        for ln in lines:
            box(c, x + 0.24 * inch, yy + 0.015 * inch, 0.045 * inch, 0.045 * inch, fill=INK)
            text(c, x + 0.40 * inch, yy, ln, "Lora", 10.4, BODY)
            yy -= 0.205 * inch
        y -= h + 0.26 * inch

        y = para(c,
                 "This is not caution for its own sake. A book on a shelf is not a vault. It "
                 "can be left on a train, photographed by a visitor, read by a relative who "
                 "was not meant to see it, or sold in a house clearance. Anything written in "
                 "it should be safe to read aloud.", x, y, MEASURE, ST["body"])

        y = sub_head(ee, "What to record instead", y)
        y = labelled_rows(ee, y, [
            ("Instead of the password",
             "Which password manager holds it, and where that manager's recovery kit is kept."),
            ("Instead of the recovery phrase",
             "That a recovery phrase exists, and which sealed envelope or safe it is in — "
             "never the words themselves."),
            ("Instead of security answers",
             "The method you use for them, so a family knows they exist and knows not to "
             "guess."),
            ("Instead of the two-factor codes",
             "Which device or app receives them, and who else can reach that device."),
        ], label_w=2.18)
        y = para(c,
                 "The left column is what people write and should not. The middle column is "
                 "what this book asks for, and it is genuinely enough: a family that knows a "
                 "password manager exists, who administers it, and where its recovery kit is "
                 "kept can get into everything, without ever being handed a list of secrets.",
                 x, y, MEASURE, ST["bodytight"])

        y -= 0.08 * inch
        y = callout(ee, "If you have already written secrets somewhere.",
                    "Do not panic, and do not simply throw the book away — you would lose the "
                    "locations too. Move the secrets into a password manager, then destroy "
                    "the page. If the page was photographed or scanned, delete the image and "
                    "empty the bin. Part one covers where a password manager's own recovery "
                    "kit belongs, and it is not in this book.", y)

    page(e, "Part five · Digital assets", drule)
    e.marks["drule"] = e.n - 1

    def inv(ee):
        pages = []
        refs_list = [("D1", "D2", "D3"), ("D4", "D5", "D6"), ("D7", "D8", "D9")]

        def mk(refs3, sheet):
            def body(eee):
                c, x, xr = eee.c, *eee.frame()
                y = section_head(eee, "Part five", "Account and service inventory",
                                 None if sheet > 1 else
                                 "One band per service. Work from the app list on your phone "
                                 "and a recent bank statement — between them they will "
                                 "surface almost everything.", rule_to=2.2)
                y -= 0.02 * inch
                text(c, x, y, "Sheet %d of 3. If you need more bands, tick the box at the "
                              "foot of this page." % sheet, "Lora", 9.0, SOFT)
                y -= 0.30 * inch
                for r in refs3:
                    y = band(eee, r, [
                        ("full", "Service or account — for example a photo service, a bank "
                                 "app, a subscription"),
                        ("split", [("What my family needs it for", 0.46),
                                   ("Recorded in the Locator as", 0.30),
                                   ("Or held by", 0.24)]),
                        ("opts", "Sign-in details held where — tick one, never the value",
                         ["Password manager", "Sealed envelope", "With my attorney",
                          "Other, not in this book"]),
                        ("opts", "Next-of-kin or legacy setting in the service?",
                         ["Yes", "No", "Not sure"]),
                    ], y, h=1.86 * inch)
                    y -= 0.02 * inch
                # disposal choices on a shared line under each band is too cramped;
                # instead one short line per band is placed inside the band already.
                y = overflow_capture(eee, y, lead="I have more accounts than there are bands "
                                                  "in this part")
            return body

        for i, r in enumerate(refs_list, 1):
            page(e, "Part five · Digital assets", mk(r, i))
        e.marks["dinv"] = e.n - 3

    inv(e)

    def legacy(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Legacy and next-of-kin settings",
                         "Some services let you nominate someone in advance. The settings "
                         "change often, so this book asks you the question rather than "
                         "telling you the answer.")
        y = para(c,
                 "Several large services now offer a way to name a contact, or to decide in "
                 "advance what happens to an account. The names of these features, and which "
                 "services offer them, change from year to year — so writing them down here "
                 "would be wrong within a year. Instead, this page records the state of "
                 "yours, as you find it.", x, y, MEASURE, ST["body"])
        y -= 0.08 * inch

        y = table(ee,
                  [("Service", 0.28), ("Has a setting?", 0.16), ("Who I have named", 0.24),
                   ("Checked on", 0.14), ("Where I found it", 0.18)],
                  8, y, row_h=0.40 * inch, reserve=2.05,
                  hint="Look under account settings, privacy, or help. Searching the service "
                       "name plus 'what happens to my account' usually finds it in a minute.")
        y -= 0.04 * inch
        y = callout(ee, "Why this is worth ten minutes per service.",
                    "Where a service offers this, naming someone is the difference between a "
                    "family being able to download years of photographs and being permanently "
                    "locked out. Where it offers nothing, the family at least knows not to "
                    "waste weeks trying.", y)

    page(e, "Part five · Digital assets", legacy)
    e.marks["dlegacy"] = e.n - 1

    def ddocs(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Where my digital documents live",
                         "The scans, the photographs and the files that would be genuinely "
                         "hard to replace.")
        y -= 0.04 * inch
        y = table(ee,
                  [("What it is", 0.30), ("Account or service", 0.26),
                   ("Which folder", 0.22), ("Who else can open it", 0.22)],
                  8, y, row_h=0.40 * inch,
                  hint="Include the things that are not obviously 'documents': the family "
                       "photo archive, scanned certificates, the folder of tax returns.")
        y -= 0.04 * inch
        y = para(c,
                 "If a folder is shared with anyone, say so here. If it is not shared, say "
                 "that too — 'nobody else can see this' is exactly the fact a family needs and "
                 "exactly the fact nobody writes down.", x, y, MEASURE, ST["body"])
        y -= 0.06 * inch
        y = stack_fields(e, [("Anything in these folders that matters more than the rest", 1.0)],
                         y, row_h=0.50 * inch)

    page(e, "Part five · Digital assets", ddocs)
    e.marks["ddocs"] = e.n - 1

    def dpm(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Password manager and recovery kit",
                         "The single most useful page in this part — and the one where you "
                         "write the least.")
        y = para(c,
                 "If you use a password manager, almost everything a family needs is behind "
                 "one door. This page records which door it is, who administers it, and where "
                 "the emergency access or recovery kit is kept. It does not record anything "
                 "that would open it.", x, y, MEASURE, ST["body"])
        y -= 0.06 * inch

        y = two_fields(e, ("I use a password manager", 0.58), ("Which one", 0.42), y)
        y = two_fields(e, ("The account is registered to", 0.58), ("Email on the account",
                                                                   0.42), y)
        y = two_fields(e, ("Family or emergency access is set up?", 0.58),
                       ("Who is named", 0.42), y)
        y = stack_fields(e, [
            ("Where the recovery kit or emergency sheet is kept — be specific",
             1.0),
            ("Who else knows it is there", 1.0),
            ("If I do not use a password manager, where are sign-ins kept instead", 1.0),
        ], y, row_h=0.48 * inch)

        y -= 0.04 * inch
        y = callout(ee, "The one paper that must not be in this book.",
                    "Most password managers issue a recovery kit or emergency sheet when you "
                    "set them up. It usually contains the only thing that could unlock "
                    "everything else. Keep it somewhere physically separate from this book, "
                    "and make sure a second person knows where that place is — otherwise the "
                    "kit is just another secret nobody can find.", y)

        y -= 0.06 * inch
        y = sub_head(ee, "If there is no password manager", y)
        y = para(c,
                 "Then the sign-ins are wherever they are, and the useful thing to record is "
                 "the method, not the secrets: the notebook kept in a drawer, the browser's "
                 "saved passwords on a particular device, the one person who resets them all. "
                 "Write that on the line above in plain words. A family following a described "
                 "method can work things out; a family facing a locked device cannot.", x, y,
                 MEASURE, ST["bodytight"])

    page(e, "Part five · Digital assets", dpm)
    e.marks["dpm"] = e.n - 1

    def dsecq(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Security questions",
                         "The weakest link in most accounts, and the one thing people are "
                         "most tempted to write down. Here is how to handle it without "
                         "writing the answer.")
        y = para(c,
                 "Security questions usually ask for facts that are permanent, guessable, "
                 "and often publicly available — a mother's maiden name, a first school, a "
                 "first pet. That makes them a poor lock. It also makes them a poor thing to "
                 "record in a book, because the answer is the secret.", x, y, MEASURE,
                 ST["body"])

        y = sub_head(ee, "Three approaches that work", y)
        rows = [
            ("Use a nonsense answer",
             "Answer every security question with an unrelated phrase, stored in your "
             "password manager like any other password. Note here that you do this — not "
             "what the answers are."),
            ("Use the manager's notes field",
             "Most password managers have a notes field per entry. That is the right place "
             "for a security answer, protected by the manager rather than by a shelf."),
            ("Remove the question where you can",
             "Many services let you switch to a second factor such as an authenticator app "
             "instead. That is both safer and easier to hand over."),
        ]
        for i, (head, body) in enumerate(rows, 1):
            text(c, x, y - 0.03 * inch, str(i), "Lora", 10.4, RULE)
            text(c, x + 0.26 * inch, y - 0.02 * inch, head, "Lora", 10.2, INK)
            y = para(c, body, x + 0.26 * inch, y - 0.235 * inch, MEASURE - 0.26 * inch,
                     ST["bodytight"])
            y -= 0.16 * inch

        y = sub_head(ee, "What I do", y - 0.02 * inch)
        y = two_fields(e, ("My method for security questions", 0.66),
                       ("Recorded in my manager?", 0.34), y)
        y = stack_fields(e, [("Accounts where I have removed the question and use a "
                              "second factor instead", 1.0)], y, row_h=0.48 * inch)

        y -= 0.04 * inch
        y = para(c,
                 "If any of the answers you currently use are things a family member could "
                 "find out — a surname, a school, a street — that is worth changing rather "
                 "than recording. It is a ten-minute job and it removes the one part of "
                 "account security that a well-meaning relative could otherwise guess.",
                 x, y, MEASURE, ST["note"])

    page(e, "Part five · Digital assets", dsecq)
    e.marks["dsecq"] = e.n - 1

    def dclose(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Keep, close or memorialise",
                         "A decision per account, made now rather than guessed later. Most "
                         "problems here come from an absence of instructions, not from a "
                         "difficult choice.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Account or service", 0.30), ("Keep open", 0.12), ("Download", 0.13),
                   ("Memorialise", 0.14), ("Close", 0.13), ("Notes", 0.18)],
                  9, y, row_h=0.40 * inch,
                  hint="A helpful default: anything with photographs or writing in it should "
                       "be downloaded before it is closed.")
        y -= 0.04 * inch
        y = para(c,
                 "How each of these is done is a question for the service itself, and the "
                 "answer changes. What this page fixes is your intention, so a family member "
                 "does not have to decide what you would have wanted while also learning "
                 "where to click.", x, y, MEASURE, ST["body"])

    page(e, "Part five · Digital assets", dclose)
    e.marks["dclose"] = e.n - 1

    def dsubs(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Recurring digital charges",
                         "The quiet ones. A card can keep paying a subscription for months "
                         "after a death, and nobody notices until the statement is read.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Service", 0.28), ("What it is for", 0.24), ("Paid from", 0.18),
                   ("Renews", 0.13), ("Cancel", 0.09), ("Keep", 0.08)],
                  9, y, row_h=0.40 * inch,
                  hint="Check the app store subscriptions on a phone as well as the bank "
                       "statement. Store billing is easy to miss.")
        y -= 0.04 * inch
        y = callout(ee, "Where these hide.",
                    "Three places catch most of them: the recurring payments list on each "
                    "bank account, the subscriptions page in each app store, and the payment "
                    "methods page inside the services themselves. Between the three, almost "
                    "everything surfaces.", y)

    page(e, "Part five · Digital assets", dsubs)
    e.marks["dsubs"] = e.n - 1

    def dreview(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Digital review dates",
                         "Digital records go out of date faster than anything else in this "
                         "book. This page turns that into a small habit rather than a worry.")
        y = para(c,
                 "Two years is a reasonable interval for a full pass through this part: long "
                 "enough not to be tedious, short enough that a closed account or an abandoned "
                 "service has not had time to disappear entirely. Anything that involves "
                 "money or photographs is worth checking annually.", x, y, MEASURE, ST["body"])
        y -= 0.06 * inch

        y = table(ee,
                  [("What I reviewed", 0.34), ("Date", 0.16), ("What changed", 0.34),
                   ("Initials", 0.16)],
                  6, y, row_h=0.44 * inch)
        y -= 0.02 * inch
        y = two_fields(e, ("Next full review due", 0.5), ("Reminder set where", 0.5), y)
        y -= 0.04 * inch
        y = para(c,
                 "Write the reminder somewhere you will actually see it — a calendar entry, a "
                 "note on the inside of a cupboard door, the same place you keep your passport. "
                 "A review page nobody remembers to revisit is the most common way a good "
                 "organizer quietly becomes wrong.", x, y, MEASURE, ST["note"])

    page(e, "Part five · Digital assets", dreview)
    e.marks["dreview"] = e.n - 1


# ---------------------------------------------------------------- PART 6
def build_part6(e, refs):
    opener(e, "", 6, "The document locator",
           "One table, forty categories, one question per row: where is it. Everything else "
           "in this book points here, which means this is the part you fill in first and "
           "revisit most.",
           [("How the locator works", refs.get("locwhy")),
            ("Personal and identification", refs.get("loc1")),
            ("Financial and insurance", refs.get("loc2")),
            ("Property, legal and medical", refs.get("loc3")),
            ("Digital and household", refs.get("loc4")),
            ("If a document is missing", refs.get("locmissing"))])
    e.marks["part6"] = e.n - 1

    def locwhy(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part six", "How the locator works",
                         "Five columns, and one rule: a location, never a value.")
        y -= 0.04 * inch
        cols = [
            ("Ref", "A short code, so other pages can point at a row without writing the "
                    "whole name."),
            ("Document", "What it is. Pre-printed, so you are prompted rather than "
                         "remembering."),
            ("Where it is held", "The room, the box, the drawer, the folder. Specific enough "
                                 "that a person who has never been in your house could find "
                                 "it."),
            ("Who else knows", "The name of a person or a professional. This column is why "
                               "the table works when you are not there."),
            ("Verified on", "The date you last confirmed the row still points at something "
                            "real. A stale date is a warning, not a failure."),
        ]
        for i, (col, body) in enumerate(cols, 1):
            hline(c, x, y + 0.14 * inch, xr, RULE_LT, 0.7)
            label(c, x, y - 0.06 * inch, col, INK, 7.6, 1.1)
            y = para(c, body, x + 1.62 * inch, y + 0.06 * inch, CONTENT_W - 1.62 * inch,
                     ST["bodytight"])
            y -= 0.20 * inch

        y -= 0.14 * inch
        y = callout(ee, "Fill in the rows you cannot answer as 'none' or 'missing'.",
                    "A row that says 'I do not have this' is more useful than a blank row, "
                    "because it tells a family whether to look for it or to replace it. Part "
                    "six ends with where to get each one replaced.", y)
        y -= 0.10 * inch
        y = para(c,
                 "Do not write account numbers, policy numbers or digits in the locator. It "
                 "answers 'where', not 'which one exactly' — the record pages in Parts three "
                 "and five carry those, and a family can find them once they know where the "
                 "original is kept.", x, y, MEASURE, ST["body"])

    page(e, "Part six · The document locator", locwhy)
    e.marks["locwhy"] = e.n - 1

    def locpage(rows, first=False, sheet=1):
        def body(eee):
            c, x, xr = eee.c, *eee.frame()
            y = section_head(eee, "Part six", "The locator",
                             "Ten rows per page. Work steadily; there is no prize for "
                             "finishing the table in one sitting." if first else None,
                             rule_to=1.6)
            y -= 0.02 * inch
            text(c, x, y, "Sheet %d of 4" % sheet, "Lora", 9.2, SOFT)
            y -= 0.26 * inch
            y = table(eee,
                      [("Ref", 0.06), ("Document", 0.29), ("Where it is held", 0.31),
                       ("Who else knows", 0.20), ("Verified on", 0.14)],
                      0, y, row_h=0.415 * inch, rows_hint=1,
                      prefill=rows)
        return body

    sets = [
        ["Passport",
         "Driver licence or state ID",
         "Birth certificate",
         "Social Security card",
         "Marriage certificate",
         "Divorce or separation papers",
         "Adoption papers",
         "Naturalisation or citizenship certificate",
         "Military discharge (DD-214)",
         "Professional or trade licence"],
        ["Will — signed original",
         "Trust documents",
         "Power of attorney — finances",
         "Healthcare power of attorney",
         "Advance directive or living will",
         "Property deed",
         "Mortgage or loan agreement",
         "Vehicle title",
         "Lease or tenancy agreement",
         "Business formation documents"],
        ["Life insurance policy",
         "Other insurance policies",
         "Pension and retirement statements",
         "Tax returns — last three years",
         "Bank and account statements",
         "Investment and brokerage records",
         "Loan and credit agreements",
         "Employment contract and benefits",
         "Medical records and medication list",
         "Vaccination and immunisation records"],
        ["Photograph and family archive",
         "Password manager recovery kit",
         "Safe, lockbox or deposit box",
         "Keys and access cards",
         "Vehicle registration",
         "Pet records and microchip papers",
         "Warranties and receipts",
         "Memberships and season tickets",
         "Subscriptions and renewals",
         "Anything else that has no obvious home"],
    ]
    for i, s in enumerate(sets):
        page(e, "Part six · The document locator", locpage(s, first=(i == 0), sheet=i + 1))
        e.marks["loc%d" % (i + 1)] = e.n - 1

    def missing(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part six", "If a document is missing",
                         "Where each one is replaced. These are the official routes, and "
                         "they are free to look up.")
        y -= 0.04 * inch
        y = labelled_rows(ee, y, [
            ("Birth, death, marriage, divorce",
             "The state or territory where the event happened — never the federal "
             "government. The CDC publishes a directory of every issuing office, and most "
             "states accept requests online."),
            ("Passport",
             "The State Department, for a new or replacement passport. A passport belonging "
             "to someone who has died is returned to the State Department for cancellation, "
             "which also reduces the risk of identity theft."),
            ("Social Security card",
             "The Social Security Administration. A replacement card is free, and there are "
             "limits on how many you can get in a year."),
            ("Driver licence",
             "Your state licensing agency. If the licence was lost, the agency can usually "
             "confirm the details even if a replacement is not needed."),
            ("Military discharge",
             "The National Archives, for a DD-214 or equivalent. Veterans' service "
             "organisations can often help with the request at no cost."),
            ("Property deed",
             "The county recorder or land registry where the property is. Deeds are public "
             "records, so a copy is usually obtainable without the original."),
            ("Vehicle title",
             "Your state motor vehicle agency. A duplicate title usually requires an "
             "application and a fee, and the rules differ by state."),
            ("A will",
             "Nobody reissues a will. If the original cannot be found, the attorney who "
             "prepared it, or the court where it was filed, is the place to start."),
        ], label_w=2.30)
        y -= 0.16 * inch
        y = para(c,
                 "Birth, death, marriage and divorce records are held by the state or "
                 "territory where the event happened, not by the federal government — the "
                 "CDC publishes a directory of every issuing office. Death certificates are "
                 "usually ordered through the funeral home, or directly from the local "
                 "department of health if there is no funeral home involved.", x, y, MEASURE,
                 ST["body"])
        y -= 0.06 * inch
        y = para(c,
                 "Some records release only to certain family members, and some become public "
                 "after a set number of years that differs by state. If a request is refused, "
                 "ask the issuing office why rather than assuming.", x, y, MEASURE,
                 ST["bodytight"])

    page(e, "Part six · The document locator", missing)
    e.marks["locmissing"] = e.n - 1


# ---------------------------------------------------------------- PART 7
def build_part7(e, refs):
    opener(e, "", 7, "Maintenance",
           "A record that is never updated stops being true. This part is deliberately "
           "short: one annual pass, one change log, one conversation.",
           [("The annual review", refs.get("annreview")),
            ("Review record", refs.get("records")),
            ("Change log", refs.get("changelog")),
            ("Telling your trusted person", refs.get("telling")),
            ("If your circumstances change", refs.get("circs"))])
    e.marks["part7"] = e.n - 1

    def annreview(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part seven", "The annual review",
                         "Ten minutes, once a year, on a date you choose. That is the whole "
                         "maintenance plan.")
        y = para(c,
                 "Pick a date you already notice — a birthday, a renewal, the first cold week "
                 "of the year. The date matters less than the fact that it is a date rather "
                 "than an intention.", x, y, MEASURE, ST["body"])
        y -= 0.06 * inch
        y = checklist(ee, [
            "Open the Document Locator and check each row still points at something real.",
            "Update any row whose document has moved, been replaced, or been lost.",
            "Check the 'who else knows' column — has anyone moved, died or become "
            "unreachable?",
            "Open Part five and check for accounts you have closed or services you have "
            "started.",
            "Check that no subscription is still being paid for something you no longer use.",
            "Confirm the password manager still exists and the recovery kit is where you "
            "wrote that it is.",
            "Check that your trusted person is still the right person, and still reachable.",
            "Re-read Part four. Does it still say what you mean?",
            "Enter the date on the review record overleaf.",
            "Tell your trusted person that you have reviewed it.",
        ], y, step=0.335 * inch, dates=True)

        y -= 0.06 * inch
        y = callout(ee, "If you do nothing else.",
                    "Check the trusted person's phone number and the location of the book. "
                    "Those two facts are the difference between a record that gets used and a "
                    "record that is never found. Everything else on this list can wait a "
                    "year.", y)

    page(e, "Part seven · Maintenance", annreview)
    e.marks["annreview"] = e.n - 1

    def records(ee):
        def rec(sheet, years):
            def body(eee):
                c, x, xr = eee.c, *eee.frame()
                y = section_head(eee, "Part seven", "Review record",
                                 "One line per year. Signing this is a promise to a person, "
                                 "not a formality." if sheet == 1 else None,
                                 rule_to=1.5)
                y -= 0.04 * inch
                y = table(eee,
                          [("Date reviewed", 0.16), ("What changed", 0.40),
                           ("Told whom", 0.24), ("Next due", 0.20)],
                          len(years), y, row_h=0.80 * inch,
                          prefill=years)
            return body
        page(e, "Part seven · Maintenance", rec(1, ["", "", "", ""]))
        page(e, "Part seven · Maintenance", rec(2, ["", "", "", "", ""]))
        e.marks["records"] = e.n - 2

    records(e)

    def changelog(ee):
        def log(sheet):
            def body(eee):
                c, x, xr = eee.c, *eee.frame()
                y = section_head(eee, "Part seven", "Change log",
                                 "The pages that stop you relying on memory. Write the change "
                                 "the day you make it — a house move, a closed account, a new "
                                 "policy." if sheet == 1 else None, rule_to=1.5)
                y -= 0.04 * inch
                y = table(eee,
                          [("Date", 0.12), ("Page or part", 0.17),
                           ("What changed", 0.38), ("Who I told", 0.22),
                           ("Initials", 0.12)],
                          9, y, row_h=0.46 * inch)
            return body
        page(e, "Part seven · Maintenance", log(1))
        page(e, "Part seven · Maintenance", log(2))
        e.marks["changelog"] = e.n - 2

    changelog(e)

    def telling(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part seven", "Telling your trusted person",
                         "A short script, so the conversation is easy to start. Say it once a "
                         "year; it takes two minutes.")
        y = para(c,
                 "Most people put this off because it feels like a conversation about death. "
                 "It is really a conversation about a book and a drawer. Framed that way, it "
                 "is unremarkable — and the second time you have it, it takes seconds.",
                 x, y, MEASURE, ST["body"])

        y = sub_head(ee, "What to say", y)
        script = [
            ("The book exists",
             "\"I have written something down — where the documents are, the accounts, who to "
             "call. It is in a book, and I want you to know it exists.\""),
            ("Where it is",
             "\"It is kept in the [room], in the [place]. If you ever need it, that is where "
             "it is.\""),
            ("What it does not contain",
             "\"There are no passwords in it, on purpose. It tells you where things are kept, "
             "not how to open them.\""),
            ("Who else knows",
             "\"[Name] knows as well. If you cannot reach me, ask them.\""),
            ("What you want them to do",
             "\"If something happens, read the section called The First 48 Hours first. The "
             "rest can wait.\""),
        ]
        for i, (head, line) in enumerate(script, 1):
            hline(c, x, y + 0.14 * inch, xr, RULE_LT, 0.7)
            _fit_label(c, x, y - 0.06 * inch, head, SOFT, 7.2, 0.55, 1.62 * inch)
            y = para(c, line, x + 1.76 * inch, y + 0.06 * inch, CONTENT_W - 1.76 * inch,
                     ST["bodytight"])
            y -= 0.18 * inch

        y -= 0.10 * inch
        y = two_fields(e, ("Conversation had on", 0.44), ("With", 0.56), y)
        y = stack_fields(e, [("What they asked me, and what I promised to change", 1.0)],
                         y, row_h=0.50 * inch)
        y -= 0.04 * inch
        y = para(c,
                 "If they asked a question you could not answer, write it on that line and "
                 "answer it next time. That single habit is what keeps this book honest.",
                 x, y, MEASURE, ST["note"])

    page(e, "Part seven · Maintenance", telling)
    e.marks["telling"] = e.n - 1

    def circs(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part seven", "If your circumstances change",
                         "Six events make a records organizer wrong quickly. None of them "
                         "require you to redo the whole book.")
        y = para(c,
                 "Each of these changes a specific set of pages. Fixing them the week they "
                 "happen takes less time than reconstructing them in five years.", x, y,
                 MEASURE, ST["body"])
        y -= 0.06 * inch

        events = [
            ("You move house",
             "Locator locations, the 'where the originals live' page, the book's own "
             "location, insurance and property pages. Tell your trusted person the new room "
             "and shelf."),
            ("A marriage, divorce or death in the family",
             "Beneficiary names, next of kin, the people-to-notify pages, and anything in "
             "Part four that named a person. Beneficiary designations usually need the "
             "institution, not this book."),
            ("You change job or retire",
             "Employment and benefits, pension details, death-in-service cover, and any "
             "life insurance that came with the job."),
            ("You open or close an account",
             "The financial pages, the digital inventory and the recurring charges list. "
             "Closing an account without updating the book is the most common way these "
             "pages go stale."),
            ("A named person dies or becomes unreachable",
             "Every page naming them: trusted person, executor, attorney, next of kin, "
             "guardian. This one matters most, and it is the easiest to overlook."),
            ("You make a new will or directive",
             "Locator row, the professional who prepared it, and anything in Part four that "
             "has now become binding. Note the date you signed it."),
        ]
        for head, body in events:
            hline(c, x, y + 0.14 * inch, xr, RULE_LT, 0.7)
            text(c, x, y - 0.06 * inch, head, "Lora", 10.4, INK)
            y = para(c, body, x, y - 0.28 * inch, MEASURE, ST["bodytight"])
            y -= 0.14 * inch

        y -= 0.04 * inch
        y = callout(ee, "The five-minute habit.",
                    "When you make any change to a document, a bank account or a person named "
                    "in this book, turn to the change log and write one line before you put "
                    "the pen down. That is the entire maintenance system, and it is enough.",
                    y)

    page(e, "Part seven · Maintenance", circs)
    e.marks["circs"] = e.n - 1


# ---------------------------------------------------------------- PART 8
def build_part8(e, refs):
    opener(e, "", 8, "Notes and letters",
           "Two kinds of writing. One is for the practical things that have no form — the "
           "notes, the questions, the things you keep meaning to mention. The other is for "
           "the people you would want to hear from you.",
           [("How to write these pages", refs.get("lhow")),
            ("Notes and things to remember", refs.get("lnotes")),
            ("Letters", refs.get("letters")),
            ("Notes", refs.get("notes2"))])
    e.marks["part8"] = e.n - 1

    def lhow(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part eight", "How to write these pages",
                         "There is no right way to do this, and nothing here is graded. A "
                         "short, awkward, honest note is worth more than a formal one.")
        y = para(c,
                 "If you have never written a letter like this, the blank page is the enemy "
                 "rather than the writing. Four things help.", x, y, MEASURE, ST["body"])

        y -= 0.08 * inch
        rows = [
            ("Write to one person", "Not to \"my family\". One name at the top, and write as "
                                    "though they are in the room."),
            ("Say the small things", "The phrase you always used, the thing you argued about, "
                                     "the song. Specific detail is what makes a letter last; "
                                     "sentiment on its own does not."),
            ("Short is fine", "Half a page is a real letter. A paragraph is a real letter. "
                              "Nobody has ever wished a letter like this had been longer."),
            ("Do not rewrite it", "Cross it out and carry on. The corrections are part of the "
                                  "record, and they are usually the most human thing on the "
                                  "page."),
        ]
        for i, (head, body) in enumerate(rows, 1):
            text(c, x, y - 0.03 * inch, str(i), "Lora", 10.4, RULE)
            text(c, x + 0.26 * inch, y - 0.02 * inch, head, "Lora", 10.2, INK)
            y = para(c, body, x + 0.26 * inch, y - 0.235 * inch, MEASURE - 0.26 * inch,
                     ST["bodytight"])
            y -= 0.16 * inch

        y -= 0.10 * inch
        y = callout(ee, "A note on the writing surface.",
                    "This is a paperback, and it will not lie flat on a table. If you want to "
                    "write at length, it is perfectly sensible to write on a loose sheet and "
                    "keep it folded inside the back cover — several of these pages are designed "
                    "with room for exactly that. The book is a container, not a constraint.",
                    y)
        y -= 0.06 * inch
        y = two_fields(e, ("Pages I have written separately and keep in this book", 0.66),
                       ("Added on", 0.34), y)

    page(e, "Part eight · Notes and letters", lhow)
    e.marks["lhow"] = e.n - 1

    def labelled_note_block(ee, y, title, lines):
        c, x, xr = ee.c, *ee.frame()
        label(c, x, y, title)
        y -= 0.14 * inch
        hline(c, x, y, xr, RULE_LT, 0.7)
        return ruled_writing(ee, y - 0.02 * inch, lines=lines, gap=0.315 * inch) - 0.10 * inch

    def lnotes(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part eight", "Notes and things to remember",
                         "Anything that has no form field: the instruction for the boiler, "
                         "the name of the man who services the car, the thing about the "
                         "photographs.")
        y -= 0.06 * inch
        y = labelled_note_block(ee, y, "About the house", 4)
        y = labelled_note_block(ee, y, "About money and paperwork", 4)
        y = labelled_note_block(ee, y, "About people", 3)

    page(e, "Part eight · Notes and letters", lnotes)
    e.marks["lnotes"] = e.n - 1

    def letters(ee):
        def letter(n, total, title):
            def body(eee):
                c, x, xr = eee.c, *eee.frame()
                y = section_head(eee, "Part eight", title,
                                 None if n > 1 else
                                 "One page per person. Write the name at the top; the rest is "
                                 "yours.", rule_to=1.5)
                y -= 0.06 * inch
                y = two_fields(eee, ("For", 0.62), ("Date", 0.38), y)
                y -= 0.06 * inch
                # generous, wide-ruled writing area — deliberate handicap for a stiff spine
                for i in range(13):
                    ly = y - 0.40 * inch - i * 0.44 * inch
                    write_line(c, x, ly, CONTENT_W, Color(0.855, 0.855, 0.855), 0.7)
                if n == total:
                    label(c, x, CONTENT_BOT + 0.10 * inch,
                          "continue on a separate sheet if you need to", FAINT, 7.0, 0.8)
            return body
        for i in range(1, 5):
            # these pages are a full writing surface already; a tail would double-rule them
            page(e, "Part eight · Notes and letters", letter(i, 4, "Letter"), tail=False)
        e.marks["letters"] = e.n - 4

    letters(e)

    def notes2(ee):
        def n(sheet):
            def body(eee):
                c, x, xr = eee.c, *eee.frame()
                y = section_head(eee, "Part eight", "Notes",
                                 "Blank ruled pages, deliberately. Not everything worth "
                                 "recording has a heading." if sheet == 1 else None,
                                 rule_to=1.2)
                y -= 0.04 * inch
                ruled_writing(eee, y, lines=22, gap=0.375 * inch)
            return body
        # these pages are already a writing surface end to end; no tail rules
        page(e, "Part eight · Notes and letters", n(1), tail=False)
        page(e, "Part eight · Notes and letters", n(2), tail=False)
        e.marks["notes2"] = e.n - 2

    notes2(e)


# ---------------------------------------------------------------- BACK MATTER
def build_back(e, refs, sources):
    def resources(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Back matter", "Where to get help",
                         "A short list of official starting points. All of them are free, and "
                         "none of them are selling anything.")
        y -= 0.04 * inch
        items = [
            ("Social Security Administration",
             "What to do when a family member dies, survivor benefits, and the one-time "
             "payment. Publication 05-10008 is downloadable, and the national number is "
             "1-800-772-1213."),
            ("USAGov — agencies to notify when someone dies",
             "The current list of which organisations must be told, what stops, and what is "
             "returned. This changes, so read it rather than relying on a printed list."),
            ("USAGov — certified copies of a death certificate",
             "Who may request one, where from, and how the rules differ for deaths abroad."),
            ("Centers for Disease Control and Prevention — Where to Write for Vital Records",
             "A directory of the office that issues birth, death, marriage and divorce records "
             "in every state and territory."),
            ("Consumer Financial Protection Bureau",
             "Free guidance on managing money after a death, and on what to do if a debt "
             "collector contacts you. Includes a step-by-step guide for surviving spouses."),
            ("Your state or territory's courts website",
             "The honest answer for anything about how an estate is administered where you "
             "live. Requirements vary, and no general book can summarise them."),
        ]
        for head, body in items:
            hline(c, x, y + 0.14 * inch, xr, RULE_LT, 0.7)
            text(c, x, y - 0.06 * inch, head, "Lora", 10.2, INK)
            y = para(c, body, x, y - 0.265 * inch, MEASURE, ST["bodytight"])
            y -= 0.14 * inch

        y -= 0.06 * inch
        y = para(c,
                 "This book does not reproduce these pages, and deliberately does not try to "
                 "keep up with them. A book is fixed on the day it is printed; a government "
                 "page is not. Where the two disagree, the official page is right.", x, y,
                 MEASURE, ST["note"])

    page(e, "Back matter", resources, folio=True)
    e.marks["resources"] = e.n - 1

    def glossary(ee):
        def g(n):
            def body(eee):
                c, x, xr = eee.c, *eee.frame()
                y = section_head(eee, "Back matter", "Glossary",
                                 "The words that appear in letters from institutions, in "
                                 "plain English. Where a term is defined differently by "
                                 "state law, this book says so rather than guessing."
                                 if n == 1 else None, rule_to=1.1)
                y -= 0.04 * inch
                terms = GLOSSARY[:12] if n == 1 else GLOSSARY[12:]
                for word, meaning in terms:
                    text(c, x, y, word, "Lora", 10.1, INK)
                    y2 = para(c, meaning, x + 1.72 * inch, y + 0.03 * inch,
                              CONTENT_W - 1.72 * inch, ST["bodytight"])
                    if y2 > y - 0.22 * inch:
                        pass
                    y = min(y - 0.26 * inch, y2 - 0.13 * inch)
            return body
        page(e, "Back matter", g(1))
        page(e, "Back matter", g(2))
        e.marks["glossary"] = e.n - 2

    glossary(e)

    def index_page(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Back matter", "Index of this book",
                         "Every section, with its page number. Useful when you are looking "
                         "for one thing and the contents page is too broad.")
        y -= 0.04 * inch
        rows = [(name, refs.get(key, "--")) for key, name in INDEX_ENTRIES]
        half = (len(rows) + 1) // 2
        colw = CONTENT_W / 2
        lowest = y
        for col, chunk in enumerate((rows[:half], rows[half:])):
            yy = y
            for name, pg in chunk:
                text(c, x + col * colw, yy, name, "Lora", 8.9, BODY)
                text(c, x + col * colw + colw - 0.34 * inch, yy, str(pg), "Lora", 8.9,
                     SOFT, align="R")
                yy -= 0.212 * inch
            lowest = min(lowest, yy)
        y = lowest - 0.24 * inch
        y = para(c,
                 "Write the date you last checked a section in the margin beside it, or in the "
                 "change log — a reader who can see that the locator was verified last spring "
                 "can judge for themselves how much to rely on it.", x, y, MEASURE, ST["note"])

    page(e, "Back matter", index_page)
    e.marks["index"] = e.n - 1

    def sources_page(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Back matter", "Sources",
                         "Every factual claim in this book traces to one of these. Nothing "
                         "here is invented, estimated or quoted from another book.")
        y -= 0.04 * inch
        y = para(c,
                 "This organizer is deliberately thin on facts and heavy on places to write. "
                 "Where it does state something as fact — the existence of a benefit, the "
                 "office that issues a record, the way a copy is ordered — the source is one "
                 "of the following, all official and all free.", x, y, MEASURE, ST["body"])
        y -= 0.10 * inch
        for i, (cite, url) in enumerate(sources, 1):
            text(c, x, y - 0.02 * inch, str(i), "Lora", 9.4, RULE)
            y2 = para(c, cite, x + 0.28 * inch, y + 0.02 * inch, MEASURE - 0.28 * inch,
                      ST["bodytight"])
            text(c, x + 0.28 * inch, y2 - 0.155 * inch, url, "WorkSans", 8.0, FAINT)
            y = y2 - 0.36 * inch

        y -= 0.04 * inch
        y = para(c,
                 "Anything this book cannot source, it does not claim. Where a rule varies by "
                 "state or country — which is most of the interesting questions — it says so "
                 "and points to a professional instead of guessing.", x, y, MEASURE,
                 ST["note"])

    page(e, "Back matter", sources_page)
    e.marks["sources"] = e.n - 1

    def colophon(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "", "Colophon", None, rule_to=0.9)
        y = para(c,
                 "The Family Records Organizer was set in Lora, by Cyreal, for reading, and "
                 "Work Sans, by Wei Huang, for labels and tables. Both are licensed under the "
                 "SIL Open Font License 1.1, which permits embedding and commercial printing.",
                 x, y, MEASURE, ST["body"])
        y = para(c,
                 "The interior was laid out as a print-ready PDF at 8.5 × 11 inches, black "
                 "ink on white paper, with mirrored margins sized for a perfect-bound spine. "
                 "It contains no colour, no bleed and no images, so that it prints identically "
                 "on every press KDP uses.", x, y, MEASURE, ST["body"])
        y = para(c,
                 "Acknowledgement of a limitation, stated plainly: this is a paperback, and a "
                 "paperback of this thickness does not lie flat. The margins and the page "
                 "design were set with that in mind, and the writing areas avoid the inner "
                 "edge — but the book will not sit open on a table by itself, and nothing in "
                 "it pretends otherwise.", x, y, MEASURE, ST["body"])
        y = para(c,
                 "First edition.", x, y, MEASURE, ST["note"])

    page(e, "Back matter", colophon, folio=False, tail=False)
    e.marks["colophon"] = e.n - 1


GLOSSARY = [
    ("Administrator",
     "The person a court appoints to manage an estate when there is no will, or no executor "
     "named and able to act."),
    ("Advance directive",
     "A document stating your wishes about medical treatment in advance. Its name, and what "
     "it must contain, differ by state."),
    ("Beneficiary",
     "A person or organisation named to receive something — usually on an insurance policy, "
     "a retirement account or a will."),
    ("Codicil",
     "A formal amendment to an existing will. A note in a book is not a codicil."),
    ("Death certificate",
     "The official record of death, issued by the state or territory where it occurred. "
     "Certified copies are usually what institutions ask for."),
    ("Estate",
     "Everything a person owns at death, including property, accounts and possessions."),
    ("Executor",
     "The person named in a will to carry out its instructions. Also called a personal "
     "representative in some states."),
    ("Guardian",
     "The person named to care for a minor child. Naming one is normally done in a will, and "
     "the court's approval may still be required."),
    ("Healthcare proxy",
     "The person you authorise to make medical decisions if you cannot. The document naming "
     "them has different names in different states."),
    ("Intestate",
     "Dying without a valid will. What happens then is set by state law, not by preference."),
    ("Joint account",
     "An account held in more than one name. How it passes on death depends on how it is "
     "held and where you live."),
    ("Letters testamentary",
     "A court document confirming an executor's authority. Institutions often ask for it "
     "before releasing assets."),
    ("Notary",
     "A public official who witnesses signatures and confirms identity. Some documents must "
     "be notarised; which ones varies by state."),
    ("Payable on death (POD)",
     "A designation naming who receives an account when the owner dies, usually without a "
     "court process."),
    ("Personal representative",
     "A general term for the person administering an estate — an executor or an "
     "administrator."),
    ("Power of attorney",
     "A document authorising someone to act on your behalf. It usually ends at death, which "
     "is why an executor is a different role."),
    ("Probate",
     "The court process for validating a will and settling an estate. Whether it is needed, "
     "and how long it takes, varies enormously."),
    ("Revocable trust",
     "A trust you can change or cancel during your life, often used to avoid probate. "
     "Preparing one is legal work, not administrative work."),
    ("Survivor benefits",
     "Payments some family members may be entitled to after a death, for example from Social "
     "Security. Eligibility rules are specific and worth asking about directly."),
    ("Transfer on death (TOD)",
     "A designation naming who receives securities or property when the owner dies."),
    ("Trustee",
     "The person or organisation responsible for managing a trust and carrying out its terms."),
    ("Two-factor authentication",
     "A second check at sign-in, such as a code from an app. It protects an account far "
     "better than a security question."),
    ("Will",
     "A document stating who should receive your property and who should act for your estate. "
     "Its formal requirements are set by state law."),
    ("Vital records",
     "Birth, death, marriage and divorce records, held by the state or territory where the "
     "event occurred."),
]

INDEX_ENTRIES = [
    ("why", "Why this organizer exists"),
    ("how", "How this book works"),
    ("rules", "The four rules"),
    ("trusted", "Choosing your trusted person"),
    ("secure", "Keeping it secure"),
    ("limits", "What this can and cannot do"),
    ("system", "A simple document system"),
    ("start", "Before you start"),
    ("f48", "The first 48 hours"),
    ("whocall", "Who to call first"),
    ("essential", "Where the essentials are"),
    ("notify", "Who to notify"),
    ("twoweeks", "The first two weeks"),
    ("wait", "What can safely wait"),
    ("aboutme", "About me"),
    ("id", "Identification documents"),
    ("family", "Family and trusted contacts"),
    ("pros", "Professionals"),
    ("medical", "Medical contacts"),
    ("insurance", "Insurance"),
    ("property", "Property and household"),
    ("financial", "Financial institutions"),
    ("debts", "Debts and regular payments"),
    ("employment", "Employment and benefits"),
    ("pline", "Preference is not instruction"),
    ("health", "My healthcare wishes"),
    ("funeral", "Funeral and disposition"),
    ("obit", "Obituary worksheet"),
    ("belongings", "Personal belongings"),
    ("pets", "Dependants and pets"),
    ("questions", "Questions to discuss with family"),
    ("pro", "What needs a professional"),
    ("inperson", "People I would like told"),
    ("dwhy", "Why digital assets are different"),
    ("drule", "The one rule"),
    ("dinv", "Account and service inventory"),
    ("dlegacy", "Legacy and next-of-kin settings"),
    ("ddocs", "Where digital documents live"),
    ("dpm", "Password manager and recovery kit"),
    ("dsecq", "Security questions"),
    ("dclose", "Keep, close or memorialise"),
    ("dsubs", "Recurring digital charges"),
    ("dreview", "Digital review dates"),
    ("locwhy", "How the locator works"),
    ("loc1", "Locator — sheet 1"),
    ("loc2", "Locator — sheet 2"),
    ("loc3", "Locator — sheet 3"),
    ("loc4", "Locator — sheet 4"),
    ("locmissing", "If a document is missing"),
    ("annreview", "The annual review"),
    ("records", "Review record"),
    ("changelog", "Change log"),
    ("telling", "Telling your trusted person"),
    ("circs", "If your circumstances change"),
    ("lhow", "How to write these pages"),
    ("lnotes", "Notes and things to remember"),
    ("letters", "Letters"),
    ("notes2", "Notes"),
    ("resources", "Where to get help"),
    ("glossary", "Glossary"),
    ("sources", "Sources"),
]
