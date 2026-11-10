"""
fro_content4.py — the last layer: pages that answer a question the earlier parts raise
but do not have room to answer themselves.

Every page here covers a distinct subject. Nothing is a repeat of an earlier worksheet.
"""
from reportlab.lib.pagesizes import inch
from reportlab.lib.colors import Color

from fro_layout import (
    CONTENT_W, CONTENT_BOT, INK, BODY, SOFT, LABEL, FAINT, RULE, RULE_LT, WASH, WASH_2,
    WHITE, DARK, text, hline, vline, box, label, checkbox, write_line, para, styles,
    MEASURE,
)
from fro_blocks import (
    section_head, sub_head, callout, two_fields, stack_fields, table, checklist,
    overflow_capture, ruled_writing, ST,
)
from fro_content import page


# ---------------------------------------------------------------- PART 2
def part2_extra(e, refs):
    def phone(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part two", "Telling people: what to say",
                         "The calls nobody is prepared for. These are openers, not scripts to "
                         "read out — the point is to have the first sentence ready so the "
                         "rest can follow.")
        y = para(c,
                 "Most people put this call off for hours because they do not know how to "
                 "begin it. Having a first sentence written down is usually enough. Say the "
                 "news once, plainly, then stop and let the other person speak.", x, y,
                 MEASURE, ST["body"])
        y -= 0.06 * inch

        rows = [
            ("A close relative",
             "\"I have some very bad news. It's about [name]. They died [when]. I'm so "
             "sorry. I wanted you to hear it from me.\""),
            ("A friend of theirs",
             "\"I'm calling with bad news. [Name] has died. I thought you would want to know "
             "before you heard it somewhere else.\""),
            ("Their employer",
             "\"I'm calling about [name]. They died on [date]. I'm sorry to tell you this "
             "over the phone. Who should I speak to about what happens next?\""),
            ("A neighbour or carer",
             "\"I wanted to let you know before you saw anything unusual. [Name] died on "
             "[date]. Thank you for everything you did for them.\""),
            ("A question you cannot answer",
             "\"I don't know yet. I'll tell you as soon as I do.\" — this is a complete "
             "answer, and it is allowed."),
        ]
        for head, line in rows:
            hline(c, x, y + 0.13 * inch, xr, RULE_LT, 0.7)
            text(c, x, y - 0.05 * inch, head, "Lora", 9.7, INK)
            y = para(c, line, x + 2.52 * inch, y + 0.05 * inch, CONTENT_W - 2.52 * inch,
                     ST["bodytight"])
            y -= 0.06 * inch

        y = sub_head(ee, "Who I asked to make the calls", y - 0.04 * inch)
        y = table(ee,
                  [("Call", 0.30), ("Who will make it", 0.34), ("Done", 0.14),
                   ("Notes", 0.22)],
                  6, y, row_h=0.38 * inch, reserve=0.9)
        y = para(c,
                 "One person making most of the calls, rather than several making some, "
                 "prevents the same person being told three times and prevents anyone being "
                 "told not at all.", x, y, MEASURE, ST["note"])

    page(e, "Part two · The first 48 hours", phone)
    e.marks["phone"] = e.n - 1

    def paperwork(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part two", "The paperwork in the first month",
                         "A plain list of what actually arrives, roughly when, and what it "
                         "asks for. Nothing here is a deadline you can set your watch by.")
        y = para(c,
                 "The volume of post in the first month surprises almost everyone. It is not "
                 "a sign that anything has gone wrong; it is the ordinary machinery of "
                 "institutions catching up. The useful habit is to open everything on one day "
                 "of the week, and to write on the envelope what you did about it.", x, y,
                 MEASURE, ST["body"])
        y -= 0.06 * inch

        rows = [
            ("Death certificate copies", "Arrive from the funeral home or the local "
             "department of health. Count them, and keep the spares together."),
            ("Letters from banks and insurers", "Usually a claims or bereavement team, with a "
             "form and a list of what to send. Keep the reference number."),
            ("A letter about benefits", "Social Security, Medicare, or a state agency, "
             "confirming that a payment has stopped or must be returned."),
            ("Bills addressed to the person who died", "These keep arriving. Paying them is "
             "usually the estate's job, not a family member's personal debt."),
            ("A letter from a debt collector", "You can ask in writing for verification, and "
             "a written dispute within 30 days stops collection contact until it is "
             "answered. Keep a copy of what you send."),
            ("A pension or annuity statement", "Usually with a survivors' section. Ask what "
             "a surviving spouse or dependant is entitled to."),
            ("A property tax or insurance notice", "These have real deadlines. Deal with them "
             "first if you deal with nothing else."),
            ("Something that looks like a scam", "Death records are public in many places, "
             "and fraudsters read them. Never pay a fee to 'release' a benefit."),
        ]
        for head, body in rows:
            hline(c, x, y + 0.13 * inch, xr, RULE_LT, 0.7)
            text(c, x, y - 0.05 * inch, head, "Lora", 9.8, INK)
            y = para(c, body, x, y - 0.26 * inch, MEASURE, ST["bodytight"])
            y -= 0.04 * inch

        y -= 0.02 * inch
        y = two_fields(ee, ("My paperwork day is", 0.5), ("Where unopened post goes", 0.5), y)

    page(e, "Part two · The first 48 hours", paperwork)
    e.marks["paperwork"] = e.n - 1


# ---------------------------------------------------------------- PART 3
def part3_extra(e, refs):
    def trades(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "People who help",
                         "The trades and services a household relies on. A family that has "
                         "never lived in the house will not know who to call when the boiler "
                         "stops, and a boiler always stops at the worst moment.")
        y -= 0.04 * inch
        y = table(ee,
                  [("Trade or service", 0.26), ("Name or firm", 0.26), ("Phone", 0.18),
                   ("What they look after", 0.30)],
                  7, y, row_h=0.38 * inch, fill=2.35,
                  hint="Boiler and heating, electrician, plumber, roofer, gardener, cleaner, "
                       "locksmith, chimney sweep, appliance repair, IT help.")
        y = sub_head(ee, "Contracts and guarantees", y - 0.02 * inch)
        y = two_fields(ee, ("Boiler or heating contract", 0.58), ("Renews", 0.42), y)
        y = two_fields(ee, ("Any warranty still running", 0.58), ("Paperwork is at", 0.42), y)
        y = stack_fields(ee, [("The one number a family should call first if something "
                               "breaks", 1.0)], y, row_h=0.44 * inch)
        y -= 0.02 * inch
        y = para(c,
                 "Write the trade's own mobile number rather than the office number where "
                 "you have it. In practice it is the person, not the firm, who remembers the "
                 "boiler.", x, y, MEASURE, ST["note"])

    page(e, "Part three · Family and personal records", trades)
    e.marks["trades"] = e.n - 1

    def claims(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part three", "Making an insurance claim",
                         "What an insurer will ask for, in the order they ask for it. Knowing "
                         "the list in advance turns a fortnight of letters into one envelope.")
        y = para(c,
                 "Every insurer is different, and none of this is a substitute for their own "
                 "letter. What follows is the shape of the request in almost every life or "
                 "property claim, which is useful to know before the letter arrives.", x, y,
                 MEASURE, ST["body"])
        y -= 0.06 * inch

        rows = [
            ("Proof of death", "Usually a certified copy of the death certificate. Some "
                               "insurers accept a funeral director's statement first."),
            ("The policy number", "From the schedule, not the certificate. This is why the "
                                  "insurance page in this book asks for it."),
            ("Proof that you are the claimant", "A beneficiary designation, a will, or a "
                                                "grant of probate — depending on the policy."),
            ("Identity documents", "Photo identification for the person claiming, and often "
                                   "proof of address."),
            ("The claim form", "Signed by the claimant, not by the estate, where a named "
                               "beneficiary exists."),
            ("Bank details", "For the payout, in the name of the claimant."),
            ("Anything else the policy requires", "Some ask for medical information or a "
                                                  "police report. Ask for the list in writing."),
        ]
        for head, body in rows:
            hline(c, x, y + 0.13 * inch, xr, RULE_LT, 0.7)
            checkbox(c, x, y - 0.055 * inch, 7.6)
            text(c, x + 0.19 * inch, y - 0.05 * inch, head, "Lora", 9.8, INK)
            y = para(c, body, x + 2.30 * inch, y + 0.03 * inch, CONTENT_W - 2.30 * inch,
                     ST["bodytight"])
            y -= 0.05 * inch

        y = sub_head(ee, "One claim worth checking first", y - 0.04 * inch)
        y = para(c,
                 "Where a policy names a beneficiary, the payout usually passes directly to "
                 "that person and does not go through a court process at all. Where it does "
                 "not, the money generally belongs to the estate and is dealt with by whoever "
                 "is administering it. That single difference decides who fills in the form, "
                 "and it is worth asking the insurer directly rather than guessing.", x, y,
                 MEASURE, ST["body"])

    page(e, "Part three · Family and personal records", claims)
    e.marks["claims"] = e.n - 1


# ---------------------------------------------------------------- PART 4
def part4_extra(e, refs):
    def keepsakes(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "Things I would like kept together",
                         "Not the valuable things — the ones that only make sense as a group. "
                         "Photographs, letters, a recipe book, a box of postcards.")
        y = para(c,
                 "Objects like these are the ones most often lost, not because nobody wanted "
                 "them but because they were split up before anyone realised they belonged "
                 "together. A sentence here prevents that, and it is the kind of sentence only "
                 "you can write.", x, y, MEASURE, ST["body"])
        y -= 0.04 * inch
        y = table(ee,
                  [("The set or group", 0.30), ("Where it is now", 0.22),
                   ("Who should have it", 0.26), ("Or who decides", 0.22)],
                  6, y, row_h=0.44 * inch, fill=2.4)
        y = sub_head(ee, "What should happen to the rest", y - 0.02 * inch)
        y = para(c,
                 "It helps to say what may be thrown away. Families keep far too much for fear "
                 "of discarding something that mattered, and a line saying 'the furniture in "
                 "the back room can go' is a genuine kindness.", x, y, MEASURE, ST["body"])
        y = ruled_writing(ee, y, lines=4, gap=0.32 * inch)

    page(e, "Part four · Wishes and preferences", keepsakes)
    e.marks["keepsakes"] = e.n - 1

    def donation(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part four", "Organ and tissue donation",
                         "A page of facts and a place to record a decision, because this is "
                         "the one question where a family is often asked to guess.")
        y = para(c,
                 "In many countries donation is decided by a register, and in some it is "
                 "presumed unless a person opted out. Whether a family is consulted, and how "
                 "much weight their view carries, differs by country and often by state. The "
                 "one thing that is consistent is that a family who know what the person "
                 "wanted find the conversation far easier.", x, y, MEASURE, ST["body"])
        y -= 0.04 * inch

        for lab, opts in [
            ("I have registered as a donor", ["Yes", "No", "Not sure"]),
            ("My family knows what I decided", ["Yes", "No", "Not sure"]),
            ("I would want my family to be asked first", ["Yes", "No", "Not sure"]),
        ]:
            label(c, x, y, lab)
            cx = x + CONTENT_W - 2.05 * inch
            for o in opts:
                checkbox(c, cx, y - 0.02 * inch, 8.0)
                text(c, cx + 0.15 * inch, y, o, "WorkSans", 8.0, BODY)
                cx += 0.15 * inch + len(o) * 0.049 * inch + 0.20 * inch
            y -= 0.34 * inch

        y = two_fields(ee, ("The register or record I am on", 0.60),
                       ("Checked on", 0.40), y)
        y = stack_fields(ee, [("Where that registration is recorded", 1.0)], y, row_h=0.44 * inch)
        y = stack_fields(ee, [("Anything I would want said to my family about this", 1.0)],
                         y, row_h=0.48 * inch)
        y -= 0.04 * inch
        y = callout(ee, "What this page is not.",
                    "It is not a consent form, and it does not override a register. It records "
                    "what you decided and where the record lives, so that a family asked to "
                    "decide at a hospital desk has something better than a guess.", y)

    page(e, "Part four · Wishes and preferences", donation)
    e.marks["donation"] = e.n - 1


# ---------------------------------------------------------------- PART 5
def part5_extra(e, refs):
    def home(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Home network and smart devices",
                         "The router, the hub, the cameras and the thermostat. A modern house "
                         "has a dozen accounts inside it and no paperwork to match.")
        y = para(c,
                 "These matter for two reasons. Some of them hold recordings or a record of "
                 "who came and went, which a family may want. All of them hold an account, and "
                 "an account nobody can reach is a device nobody can reset — which for a smart "
                 "lock or an alarm is more than an inconvenience.", x, y, MEASURE, ST["body"])
        y -= 0.04 * inch
        y = table(ee,
                  [("Device or system", 0.26), ("Who supplies it", 0.22),
                   ("Account registered to", 0.26), ("App on whose phone", 0.26)],
                  6, y, row_h=0.42 * inch, fill=2.2,
                  hint="Router and internet, alarm and cameras, doorbell, heating, locks, "
                       "solar or battery system, car charging, irrigation.")
        y = two_fields(ee, ("Broadband contract and account holder", 0.60),
                       ("Ends or renews", 0.40), y)
        y = two_fields(ee, ("Where the router and its label are", 0.60),
                       ("Network name, if unusual", 0.40), y)
        y = stack_fields(ee, [("Anything recorded by these devices that a family may want "
                               "kept", 1.0)], y, row_h=0.46 * inch)
        y -= 0.02 * inch
        y = para(c,
                 "The network name is not a secret. The password is, and it belongs in the "
                 "password manager with everything else — not here.", x, y, MEASURE,
                 ST["note"])

    page(e, "Part five · Digital assets", home)
    e.marks["dhome"] = e.n - 1


def part5_extra2(e, refs):
    def firstweeks(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part five", "Digital accounts in the first two weeks",
                         "The order in which to work through a digital life, if you are the "
                         "one doing it. The sequence matters more than the speed.")
        y = para(c,
                 "The instinct is to close everything at once. That is usually the wrong first "
                 "move, because the most valuable things in a digital life — photographs, "
                 "letters, a record of where money went — sit behind the accounts that are "
                 "easiest to cancel. Work in this order.", x, y, MEASURE, ST["body"])
        y -= 0.04 * inch

        steps = [
            ("Download before you change anything",
             "Photographs, documents, message archives, purchase histories. Every large "
             "service has an export or download option; use it first, while access still "
             "works normally."),
            ("Secure the primary email",
             "It is the recovery route for everything else. Do not close it. Keep it reachable "
             "and note who can get into it."),
            ("List before you close",
             "One pass through the bank statement and the app store finds almost every "
             "recurring charge. Cancel subscriptions only after that list exists."),
            ("Change nothing that a will or a policy refers to",
             "An account named in a beneficiary designation is part of an estate, not clutter. "
             "Ask before closing it."),
            ("Then deal with the accounts nobody needs",
             "Social accounts, shopping accounts, loyalty schemes. Slow, low-value, and safe "
             "to leave until the important things are done."),
        ]
        for i, (head, body) in enumerate(steps, 1):
            hline(c, x, y + 0.13 * inch, xr, RULE_LT, 0.7)
            text(c, x, y - 0.045 * inch, "%d" % i, "Lora", 10.4, RULE)
            text(c, x + 0.32 * inch, y - 0.045 * inch, head, "Lora", 10.0, INK)
            y = para(c, body, x + 0.32 * inch, y - 0.27 * inch, MEASURE - 0.32 * inch,
                     ST["bodytight"])
            y -= 0.04 * inch

        y = sub_head(ee, "What I would want done first", y - 0.10 * inch)
        y = stack_fields(ee, [("The one folder, album or archive that matters most", 1.0)],
                         y, row_h=0.44 * inch)
        y = two_fields(ee, ("Who should download it", 0.62), ("Where it should go", 0.38), y)
        y -= 0.04 * inch
        y = para(c,
                 "Naming one thing is more useful than naming ten.", x, y, MEASURE,
                 ST["note"])

    page(e, "Part five · Digital assets", firstweeks)
    e.marks["dfirst"] = e.n - 1


# ---------------------------------------------------------------- PART 6
def part6_extra(e, refs):
    def firsthour(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part six", "The first hour with this book",
                         "For the person who has just been handed it. Four places to look, in "
                         "this order, and nothing else to read yet.")
        y = para(c,
                 "You do not need to read this book. You need about six facts, and they are "
                 "all on four pages. Take them one at a time, and stop when you have what you "
                 "came for.", x, y, MEASURE, ST["body"])
        y -= 0.08 * inch

        rows = [
            ("1", "The first 48 hours", refs.get("f48", "--"),
             "What to do today, in order, and what can wait."),
            ("2", "The one-page summary", refs.get("summary", "--"),
             "Names, phone numbers, and where the originals are kept."),
            ("3", "The document locator", refs.get("loc1", "--"),
             "Where every document is, and who else knows it exists."),
            ("4", "Who to notify", refs.get("notify", "--"),
             "The list of organisations, and what each one needs."),
        ]
        for num, name, pg, why in rows:
            hline(c, x, y + 0.14 * inch, xr, RULE_LT, 0.7)
            text(c, x, y - 0.05 * inch, num, "Lora", 16, RULE)
            text(c, x + 0.40 * inch, y - 0.045 * inch, name, "Lora", 11.4, INK)
            text(c, x + 3.30 * inch, y - 0.045 * inch, "page %s" % pg, "Lora", 10.0, SOFT)
            y = para(c, why, x + 0.40 * inch, y - 0.27 * inch, MEASURE - 0.40 * inch,
                     ST["bodytight"])
            y -= 0.10 * inch

        y = callout(ee, "If the book is not where it should be.",
                    "Ask the person named on page %s, then the second person. Both names are "
                    "on the same page, and one of them will know. This is the reason the "
                    "second name exists at all." % refs.get("trusted", "--"), y)
        y -= 0.06 * inch
        y = para(c,
                 "Nothing in this book asks you to make a decision you are not ready to make. "
                 "Where a decision cannot wait, the page says so. Where it can, the page says "
                 "that too.", x, y, MEASURE, ST["note"])

    page(e, "Part six · The document locator", firsthour)
    e.marks["firsthour"] = e.n - 1


# ---------------------------------------------------------------- PART 7
def part7_extra(e, refs):
    def unable(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Part seven", "If I cannot manage this myself",
                         "A page for the possibility that the person who keeps this book "
                         "becomes unable to. It records who else can act, not what they should "
                         "decide.")
        y = para(c,
                 "A power of attorney is a legal document, and this book cannot create one. "
                 "What it can do is record that one exists, who holds it, where the original "
                 "is, and when it was signed — which is exactly what a bank or a hospital will "
                 "ask for when it is produced.", x, y, MEASURE, ST["body"])
        y -= 0.04 * inch
        y = two_fields(ee, ("Financial power of attorney — holder", 0.62),
                       ("Signed on", 0.38), y)
        y = two_fields(ee, ("Where the signed original is", 0.62), ("Copy held by", 0.38), y)
        y = two_fields(ee, ("Healthcare proxy or attorney", 0.62), ("Signed on", 0.38), y)
        y = two_fields(ee, ("Where that original is", 0.62), ("Copy held by", 0.38), y)
        y = two_fields(ee, ("Any restriction on when it takes effect", 0.62),
                       ("Documented where", 0.38), y)

        y = sub_head(ee, "What this book would need from someone else", y - 0.02 * inch)
        y = para(c,
                 "If the book has to be maintained by another person for a while, three things "
                 "make that possible: they know where it is, they know which parts are current, "
                 "and they know who to ask before changing anything. That is the whole handover.",
                 x, y, MEASURE, ST["body"])
        y = two_fields(ee, ("Who could maintain it if I could not", 0.62),
                       ("They know?", 0.38), y)
        y = stack_fields(ee, [("What they should not change without asking", 1.0)],
                         y, row_h=0.46 * inch)
        y -= 0.04 * inch
        y = para(c,
                 "Requirements for powers of attorney vary widely between states, including "
                 "whether they must be witnessed, notarised, or renewed. The professional who "
                 "prepared yours will know; this page only records it.", x, y, MEASURE,
                 ST["note"])

    page(e, "Part seven · Maintenance", unable)
    e.marks["unable"] = e.n - 1


# ---------------------------------------------------------------- BACK
def back_extra(e, refs):
    def worksheets(ee):
        c, x, xr = ee.c, *ee.frame()
        y = section_head(ee, "Back matter", "Every worksheet in this book",
                         "A checklist of the pages that expect writing, so you can see what is "
                         "done and what is not at a glance.")
        y -= 0.04 * inch
        groups = [
            ("Part one", [("Ten-minute start", "tenmin"), ("Trusted person", "trusted"),
                          ("Document system", "system"), ("One-page summary", "summary")]),
            ("Part two", [("Essentials", "essential"), ("Who to notify", "notify"),
                          ("Documents to order", "certificate"),
                          ("What goes back", "returns")]),
            ("Part three", [("About me", "aboutme"), ("Identification", "id"),
                            ("Family and contacts", "family"),
                            ("Financial institutions", "financial"),
                            ("Insurance", "insurance"), ("Property", "property"),
                            ("Vehicles", "vehicles"), ("Household", "household")]),
            ("Part four", [("Healthcare wishes", "health"), ("Funeral", "funeral"),
                           ("Obituary", "obit"), ("Belongings", "belongings"),
                           ("Dependants and pets", "pets"), ("Order of service", "service")]),
            ("Part five", [("Inventory", "dinv"), ("Locations of documents", "ddocs"),
                           ("Password manager", "dpm"), ("Devices", "devices"),
                           ("Subscriptions", "dsubs")]),
            ("Part six", [("Locator", "loc1"), ("Locator 2", "loc2"), ("Locator 3", "loc3"),
                          ("Locator 4", "loc4"), ("Locator 5", "loc5"),
                          ("Locator 6", "loc6")]),
            ("Part seven", [("Review record", "records"), ("Change log", "changelog"),
                            ("Family conversation", "meeting")]),
            ("Part eight", [("Notes", "lnotes"), ("Letters", "letters"),
                            ("Letter to the estate", "exletter")]),
        ]
        for name, items in groups:
            label(c, x, y, name, INK, 7.4, 1.1)
            y -= 0.14 * inch
            hline(c, x, y, xr, RULE_LT, 0.7)
            y -= 0.18 * inch
            colw = CONTENT_W / 2
            for i, (title, key) in enumerate(items):
                cx = x + (i % 2) * colw
                if i % 2 == 0 and i:
                    y -= 0.225 * inch
                checkbox(c, cx, y - 0.02 * inch, 7.6)
                text(c, cx + 0.18 * inch, y, title, "Lora", 9.4, BODY)
                text(c, cx + colw - 0.34 * inch, y, str(refs.get(key, "--")), "Lora", 9.4,
                     SOFT, align="R")
            y -= 0.26 * inch

        y = para(c,
                 "A book with four ticks in it is worth more than a book with none.", x, y,
                 MEASURE, ST["note"])

    page(e, "Back matter", worksheets)
    e.marks["worksheets"] = e.n - 1
