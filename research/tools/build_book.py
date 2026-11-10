"""
build_book.py — assembles the interior PDF.

Two passes: pass 1 renders the whole book with empty page references and records where
each section landed; pass 2 re-renders with those numbers resolved. A third pass confirms
the map did not move (a moved map means a "see page" line changed length and reflowed
something, which must be caught rather than shipped).

    python build_book.py            # writes build/fro_interior.pdf + build/trace.json
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from reportlab.lib.pagesizes import inch

import fro_layout
from fro_layout import Engine, register_fonts, TRACE, PAGE, styles
from fro_blocks import ST, LABEL_OVERFLOW
import fro_content as C1
import fro_content2 as C2
import fro_content3 as C3
import fro_content4 as C4

OUT_DIR = os.path.join(os.path.dirname(HERE), "build")
PDF = os.path.join(OUT_DIR, "fro_interior.pdf")
TRACEJSON = os.path.join(OUT_DIR, "trace.json")

TITLE = C1.TITLE
SUBTITLE = C1.SUBTITLE

# (part number, title, [ (key, label) ... ]) — drives both the contents pages and order
MANIFEST = [
    (1, "Getting started", [
        ("why", "Why this organizer exists"),
        ("how", "How this book works"),
        ("rules", "The four rules"),
        ("trusted", "Choosing your trusted person"),
        ("secure", "Keeping it secure"),
        ("limits", "What this can and cannot do"),
        ("system", "A simple document system"),
        ("tenmin", "The ten-minute start"),
        ("start", "Before you start"),
        ("summary", "The one-page summary"),
    ]),
    (2, "The first 48 hours", [
        ("f48", "How to use this part"),
        ("whocall", "Who to call first"),
        ("essential", "Where the essentials are"),
        ("notify", "Who to notify"),
        ("returns", "What goes back, and what stops"),
        ("twoweeks", "The first two weeks"),
        ("wait", "What can safely wait"),
        ("certificate", "Documents you will be asked for"),
        ("phone", "Telling people: what to say"),
        ("paperwork", "The paperwork in the first month"),
    ]),
    (3, "Family and personal records", [
        ("aboutme", "About me"),
        ("id", "Identification documents"),
        ("family", "Family and trusted contacts"),
        ("pros", "Professionals"),
        ("medical", "Medical contacts"),
        ("insurance", "Insurance"),
        ("property", "Property and household"),
        ("financial", "Financial institutions"),
        ("financial2", "Financial institutions — sheet 2"),
        ("debts", "Debts and regular payments"),
        ("debts2", "Debts and regular payments — sheet 2"),
        ("employment", "Employment and benefits"),
        ("vehicles", "Vehicles and titled property"),
        ("memberships", "Memberships and organisations"),
        ("household", "Household services and suppliers"),
        ("contents", "Home contents worth listing"),
        ("trades", "People who help"),
        ("claims", "Making an insurance claim"),
    ]),
    (4, "Wishes and preferences", [
        ("pline", "Preference is not instruction"),
        ("health", "My healthcare wishes"),
        ("funeral", "Funeral and disposition"),
        ("obit", "Obituary worksheet"),
        ("belongings", "Personal belongings"),
        ("pets", "Dependants and pets"),
        ("questions", "Questions to discuss with family"),
        ("pro", "What needs a professional"),
        ("nowill", "If there is no will"),
        ("service", "The order of service"),
        ("inperson", "People I would like told in person"),
        ("donation", "Organ and tissue donation"),
        ("keepsakes", "Things I would like kept together"),
    ]),
    (5, "Digital assets", [
        ("dwhy", "Why this part is different"),
        ("drule", "The one rule"),
        ("dinv", "Account and service inventory"),
        ("dlegacy", "Legacy and next-of-kin settings"),
        ("ddocs", "Where my digital documents live"),
        ("dpm", "Password manager and recovery kit"),
        ("dsecq", "Security questions"),
        ("dfirst", "Digital accounts in the first two weeks"),
        ("dclose", "Keep, close or memorialise"),
        ("dsubs", "Recurring digital charges"),
        ("dmail", "Email, messaging and social accounts"),
        ("dmoney", "Digital money and marketplaces"),
        ("dpurchases", "Things bought and licensed"),
        ("devices", "Devices, drives and backups"),
        ("dhome", "Home network and smart devices"),
        ("dreview", "Digital review dates"),
    ]),
    (6, "The document locator", [
        ("locwhy", "How the locator works"),
        ("loc1", "Locator — sheet 1"),
        ("loc2", "Locator — sheet 2"),
        ("loc3", "Locator — sheet 3"),
        ("loc4", "Locator — sheet 4"),
        ("loc5", "Locator — sheet 5"),
        ("loc6", "Locator — sheet 6"),
        ("firsthour", "The first hour with this book"),
        ("locmissing", "If a document is missing"),
    ]),
    (7, "Maintenance", [
        ("annreview", "The annual review"),
        ("records", "Review record"),
        ("changelog", "Change log"),
        ("telling", "Telling your trusted person"),
        ("meeting", "A family conversation, with an agenda"),
        ("circs", "If your circumstances change"),
        ("unable", "If I cannot manage this myself"),
    ]),
    (8, "Notes and letters", [
        ("lhow", "How to write these pages"),
        ("lnotes", "Notes and things to remember"),
        ("letters", "Letters"),
        ("exletter", "A letter to whoever settles my estate"),
        ("notes2", "Notes"),
    ]),
]

BACK = [("resources", "Where to get help"), ("worksheets", "Every worksheet in this book"), ("glossary", "Glossary"),
        ("index", "Index of this book"), ("sources", "Sources"),
        ("colophon", "Colophon")]


def body(e, refs):
    C1.p_title(e)
    e.new_page()
    C1.p_copyright(e, refs)
    e.furniture("", folio=False, rule=False)
    e.new_page()
    C1.p_contents(e, refs, contents_entries(refs))   # paginates itself
    e.furniture("", folio=False, rule=False)
    e.new_page()

    C1.build_part1(e, refs)
    C3.part1_extra(e, refs)
    C1.build_part2(e, refs)
    C3.part2_extra(e, refs)
    C4.part2_extra(e, refs)
    C1.build_part3(e, refs)
    C3.part3_extra_a(e, refs)
    C3.part3_extra_b(e, refs)
    C4.part3_extra(e, refs)
    C2.build_part4(e, refs)
    C3.part4_extra(e, refs)
    C4.part4_extra(e, refs)
    C2.build_part5(e, refs)
    C3.part5_extra(e, refs)
    C4.part5_extra(e, refs)
    C4.part5_extra2(e, refs)
    C2.build_part6(e, refs)
    C3.part6_extra(e, refs)
    C4.part6_extra(e, refs)
    C2.build_part7(e, refs)
    C3.part7_extra(e, refs)
    C4.part7_extra(e, refs)
    C2.build_part8(e, refs)
    C3.part8_extra(e, refs)
    C4.back_extra(e, refs)
    C2.build_back(e, refs, C1.SOURCES)
    return e


def contents_entries(refs):
    out = []
    for num, title, keys in MANIFEST:
        out.append(("part", "%02d" % num, title, refs.get("part%d" % num)))
        items = [(lab, refs.get(k)) for k, lab in keys]
        items.sort(key=lambda t: (t[1] is None, t[1] or 0))
        for lab, pg in items:
            out.append(("item", None, lab, pg))
    back = [(lab, refs.get(k)) for k, lab in BACK]
    back.sort(key=lambda t: (t[1] is None, t[1] or 0))
    out.append(("part", "", "Back matter", back[0][1] if back else None))
    for lab, pg in back:
        out.append(("item", None, lab, pg))
    return out


def publish_part_contents(refs):
    """Part dividers list what is actually in the part, in page order. Sorting by the
    resolved page number means a page added later cannot appear out of sequence."""
    out = {}
    for num, title, keys in MANIFEST:
        items = [(lab, refs.get(k)) for k, lab in keys]
        items.sort(key=lambda t: (t[1] is None, t[1] or 0))
        out[num] = items
    C1.set_part_contents(out)


def run(pass_no, refs):
    publish_part_contents(refs)
    del TRACE[:]
    e = Engine(PDF, TITLE, "", SUBTITLE)
    # record part opener pages as they are drawn by tagging marks after the fact
    body(e, refs)
    e.page_end[e.n] = round(e.y / inch, 3)
    # part opener page numbers: openers are the page before the first section of a part,
    # but simpler and exact — we record them in fro_content via e.marks["partN"].
    n = e.finish()
    return e, n


def build():
    os.makedirs(OUT_DIR, exist_ok=True)
    register_fonts()

    refs = {}
    maps = []
    for i in range(3):
        e, n = run(i + 1, refs)
        maps.append(dict(e.marks))
        refs = dict(e.marks)
        print("pass %d: %d pages, %d marks, %d clamped tables, %d overflow notes"
              % (i + 1, n, len(refs), len(e.clamps), len(e.overflows)))
        if e.clamps:
            for c in e.clamps:
                print("   clamp alt: page %d %s rows %d -> %d" % (c[0], c[3], c[1], c[2]))
        LABEL_OVERFLOW.clear() if i == 0 else None
        if LABEL_OVERFLOW:
            for o in LABEL_OVERFLOW[:12]:
                print("   LABEL TOO WIDE: page %d %r needs %.2f in, has %.2f in" % o)
        if e.overflows:
            for o in e.overflows:
                print("   OVERFLOW: page %d %s by %.2f in" % (o[0], o[2], o[1]))

    stable = maps[1] == maps[2]
    print("reference map stable:", stable)
    if not stable:
        diff = {k: (maps[1].get(k), maps[2].get(k)) for k in set(maps[1]) | set(maps[2])
                if maps[1].get(k) != maps[2].get(k)}
        print("unstable keys:", diff)
        raise SystemExit("page references did not converge")

    with open(TRACEJSON, "w") as fh:
        json.dump({"pages": n, "trace": TRACE, "marks": refs,
                   "page_end": e.page_end}, fh)
    print("wrote", PDF, TRACEJSON)
    return n


if __name__ == "__main__":
    build()
