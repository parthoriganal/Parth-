"""Build a genuine reflowable EPUB 3 from the canonical markdown.

Design rules for Kindle:
  * no fixed dimensions, no absolutely positioned elements
  * semantic XHTML5, one file per chapter
  * embedded Literata/Inter (OFL) with font-family fallbacks
  * linear nav document + landmarks + page-list-free
  * every heading carries a stable id for nav
"""
import os, re, glob, html, zipfile, uuid
from ebooklib import epub

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..")
FONT_DIR = os.path.join(HERE, "..", "..", "design", "fonts")
OUT = os.path.abspath(os.path.join(SRC, "..", "The_15_Minute_Fascial_Release_Plan_Final.epub"))

TITLE = "The 15-Minute Fascial Release Plan"
SUBTITLE = ("Self-Treatment for Stiff Necks, Tight Shoulders, and Aching Hips — "
            "Using Only a Tennis Ball, a Wall, and a Towel")

CSS = """
@font-face { font-family: "Literata"; font-weight: normal; font-style: normal;
  src: url("fonts/Literata-Regular.ttf"); }
@font-face { font-family: "Literata"; font-weight: bold; font-style: normal;
  src: url("fonts/Literata-SemiBold.ttf"); }
@font-face { font-family: "Literata"; font-weight: normal; font-style: italic;
  src: url("fonts/Literata-Italic.ttf"); }
@font-face { font-family: "Inter"; font-weight: normal; font-style: normal;
  src: url("fonts/Inter-Regular.ttf"); }
@font-face { font-family: "Inter"; font-weight: bold; font-style: normal;
  src: url("fonts/Inter-Bold.ttf"); }

html { font-size: 100%; }
body { font-family: "Literata", Georgia, "Times New Roman", serif;
       font-size: 1em; line-height: 1.55; margin: 0; padding: 0;
       color: #14140f; text-align: justify; hyphens: auto;
       -webkit-hyphens: auto; adobe-hyphenate: auto; }
p { margin: 0; text-indent: 1.2em; widows: 2; orphans: 2; }
p.first, h1 + p, h2 + p, h3 + p, .callout p, li p { text-indent: 0; }
p.first { text-indent: 0; }

h1, h2, h3 { font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
             text-align: left; page-break-after: avoid; break-after: avoid;
             color: #000; }
h1 { font-size: 1.55em; line-height: 1.2; margin: 0 0 0.7em 0;
     font-weight: bold; page-break-before: always; break-before: page; }
h1.nobreak { page-break-before: auto; break-before: auto; }
h2 { font-size: 1.12em; line-height: 1.3; margin: 1.5em 0 0.45em 0;
     font-weight: bold; }
h3 { font-size: 0.95em; margin: 1.2em 0 0.35em 0; font-weight: bold; }

.chapnum { font-family: "Inter", Arial, sans-serif; font-size: 0.7em;
           letter-spacing: 0.12em; text-transform: uppercase; color: #6b6b6b;
           margin: 0 0 0.6em 0; text-indent: 0; }

blockquote, .callout { margin: 1.2em 0; padding: 0.85em 1em;
                       background: #f4f2ec; border-left: 3px solid #d8d5cc; }
.callout p { text-indent: 0; margin: 0 0 0.6em 0; font-size: 0.94em; }
.callout p:last-child { margin-bottom: 0; }
.callout .chead { font-family: "Inter", Arial, sans-serif; font-size: 0.72em;
                  letter-spacing: 0.1em; text-transform: uppercase;
                  font-weight: bold; margin-bottom: 0.7em; }

ul { margin: 1em 0 1em 1.2em; padding: 0; }
li { margin: 0 0 0.45em 0; text-align: left; }

table { width: 100%; border-collapse: collapse; margin: 1.2em 0;
        page-break-inside: auto; break-inside: auto;
        font-family: "Inter", Arial, sans-serif; font-size: 0.78em;
        text-align: left; }
th, td { border: 1px solid #c9c6bd; padding: 0.32em 0.4em; vertical-align: top; }
tr { page-break-inside: avoid; break-inside: avoid; }
thead { display: table-header-group; }
th { background: #efece4; font-weight: bold; }

.ref { font-size: 0.86em; margin: 0 0 0.8em 0; padding-left: 1.4em;
       text-indent: -1.4em; text-align: left; line-height: 1.42; }
.caption { font-family: "Inter", Arial, sans-serif; font-size: 0.75em;
           color: #6b6b6b; text-indent: 0; margin: 0.3em 0 1em 0; }
.tp { text-align: center; margin-top: 22%; }
/* Display text must never break mid-word: no hyphenation on the title page,
   and the subtitle gets a non-breaking hyphen is handled in markup. */
.tp .t, .tp .s { hyphens: none; -webkit-hyphens: none; adobe-hyphenate: none; }
.tp .t { font-family: "Literata", Georgia, serif; font-size: 1.9em;
         font-weight: bold; line-height: 1.15; text-indent: 0; margin: 0 0 1em 0; }
.tp .s { font-style: italic; font-size: 1em; text-indent: 0; line-height: 1.45;
         color: #333; margin: 0 auto; max-width: 26em; text-wrap: balance; }
.rule { border: 0; border-top: 1px solid #c9c6bd; width: 22%;
        margin: 1.6em auto; }
.note { font-size: 0.86em; color: #4a4a44; text-indent: 0; }
"""


# --------------------------------------------------------------- markdown
def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"\u201c|\u201d", '"', text)
    return text


def slug(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:48] or "s"


def md_to_xhtml(md, chapnum=None, refmode=False):
    out, i, lines = [], 0, [l.rstrip() for l in md.split("\n")]
    first_after_heading = True
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1; continue

        if line.startswith("# "):
            title = line[2:].strip()
            # strip the "1 · " numeric prefix: the chapter number is rendered
            # separately as the kicker, so keeping it here duplicates it
            m = re.match(r"\d+\s*[·\u00b7]\s*(.+)", title)
            disp = m.group(1).strip() if m else title
            out.append(f'<h1 id="{slug(disp)}">{inline(disp)}</h1>')
            first_after_heading = True
            i += 1; continue

        if line.startswith("## "):
            t = line[3:].strip()
            out.append(f'<h2 id="{slug(t)}">{inline(t)}</h2>')
            first_after_heading = True
            i += 1; continue

        if line.startswith("### "):
            t = line[4:].strip()
            out.append(f'<h3 id="{slug(t)}">{inline(t)}</h3>')
            first_after_heading = True
            i += 1; continue

        if line.startswith("|"):
            block = []
            while i < len(lines) and lines[i].startswith("|"):
                block.append(lines[i]); i += 1
            rows = []
            for l in block:
                cells = [c.strip() for c in l.strip().strip("|").split("|")]
                if all(set(c) <= set("-: ") for c in cells):
                    continue
                rows.append(cells)
            if rows:
                out.append("<table>")
                out.append("<thead><tr>" + "".join(
                    f"<th>{inline(c)}</th>" for c in rows[0]) + "</tr></thead>")
                out.append("<tbody>")
                for r in rows[1:]:
                    out.append("<tr>" + "".join(
                        f"<td>{inline(c)}</td>" for c in r) + "</tr>")
                out.append("</tbody></table>")
            first_after_heading = True
            continue

        if line.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(lines[i][2:].strip()); i += 1
            out.append("<ul>")
            for it in items:
                out.append(f"<li>{inline(it)}</li>")
            out.append("</ul>")
            first_after_heading = True
            continue

        if line.startswith("> "):
            block = []
            while i < len(lines) and lines[i].startswith(">"):
                block.append(lines[i].lstrip("> ").strip()); i += 1
            block = [b for b in block if b]
            out.append('<div class="callout">')
            for idx, b in enumerate(block):
                if idx == 0 and b == b.upper() and any(c.isalpha() for c in b) and len(b) < 70:
                    out.append(f'<p class="chead">{inline(b)}</p>')
                else:
                    out.append(f"<p>{inline(b)}</p>")
            out.append("</div>")
            first_after_heading = True
            continue

        if set(line.strip()) <= set("-—*") and len(line.strip()) >= 3:
            out.append('<hr class="rule" />')
            i += 1; continue

        if refmode:
            out.append(f'<p class="ref">{inline(line.strip())}</p>')
        else:
            style = ' class="first"' if first_after_heading else ""
            out.append(f"<p{style}>{inline(line.strip())}</p>")
        first_after_heading = False
        i += 1
    return "\n".join(out)


def page(title, body, extra_class=""):
    # No XML declaration here: ebooklib parses this with lxml's HTML parser,
    # which rejects a unicode string carrying an encoding declaration and
    # silently returns an empty body. ebooklib adds the declaration on write.
    return f"""<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head><meta charset="utf-8"/><title>{html.escape(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head>
<body{(' class="' + extra_class + '"') if extra_class else ''}>
{body}
</body></html>"""


# --------------------------------------------------------------- build
def build():
    book = epub.EpubBook()
    book.set_identifier("urn:uuid:" + str(uuid.uuid5(uuid.NAMESPACE_URL,
                      "https://example.org/15-minute-fascial-release-plan")))
    book.set_title(TITLE)
    book.set_language("en")
    # NOTE: keep the order above. Calling set_identifier after set_title leaves
    # the book's XHTML content model in a state where every document body is
    # emitted empty; the identifiers must be established first.
    book.add_author("Anonymous")
    book.add_metadata("DC", "description", SUBTITLE)
    book.add_metadata("DC", "subject", "Health & Fitness")
    book.add_metadata("DC", "subject", "Pain Management")
    book.add_metadata("DC", "rights", "Copyright (c) 2026. All rights reserved.")
    # ebooklib emits its own single, correctly-formatted dcterms:modified.
    # Adding a second one is an OPF violation, so we do not.

    css = epub.EpubItem(uid="style", file_name="style.css",
                        media_type="text/css", content=CSS)
    book.add_item(css)

    for fn in ("Literata-Regular.ttf", "Literata-SemiBold.ttf", "Literata-Italic.ttf",
               "Inter-Regular.ttf", "Inter-Bold.ttf"):
        with open(os.path.join(FONT_DIR, fn), "rb") as f:
            item = epub.EpubItem(uid=fn.replace(".", "_"), file_name="fonts/" + fn,
                                 media_type="font/ttf", content=f.read())
        book.add_item(item)

    def add(name, title, body, cls=""):
        c = epub.EpubHtml(title=title, file_name=name, lang="en")
        c.content = page(title, body, cls)
        c.add_item(css)
        book.add_item(c)
        return c

    chapters = []

    # title page
    tp = f"""<div class="tp">
<p class="t">{html.escape(TITLE)}</p>
<p class="s">{html.escape(SUBTITLE)}</p>
</div>"""
    chapters.append(add("titlepage.xhtml", "Title Page", tp))

    # copyright + notice (from front matter, subset)
    fm = open(os.path.join(SRC, "00-front-matter.md")).read()
    def section(md, head):
        m = re.search(r"## " + re.escape(head) + r"\n(.*?)(?=\n## |\Z)", md, re.S)
        return m.group(1).strip() if m else ""
    copyright_body = (
        "<h1 class=\"nobreak\" id=\"copyright\">Copyright</h1>"
        "<p class=\"first\">Copyright © 2026. All rights reserved.</p>"
        "<p>No part of this book may be reproduced in any form without written permission, "
        "except brief quotations in a review.</p>"
        "<p>This book is an original work of research and commentary. It is not medical advice.</p>"
        "<hr class=\"rule\"/>"
        "<h2 id=\"notice\">Important Note to the Reader</h2>"
        "<div class=\"callout\">"
        "<p class=\"chead\">This book has not been reviewed by a doctor, physiotherapist, "
        "or other qualified clinician.</p>"
        "<p>It is written for general educational purposes. It is not a substitute for individual "
        "medical assessment, diagnosis, or treatment, and no book can examine you.</p>"
        "<p>Read Chapter 4 before attempting anything in Chapter 5. Do not begin if you have any "
        "condition on the contraindication list, are pregnant, have recently had surgery, take "
        "anticoagulant medication, or are unsure whether these techniques are appropriate for you.</p>"
        "<p>The information here reflects the published evidence available in 2026. Medicine "
        "changes. If your situation changes, or if you are uncertain, consult a qualified "
        "healthcare professional.</p></div>")
    chapters.append(add("copyright.xhtml", "Copyright and Notice", copyright_body))

    evidence_body = ("<h1 id=\"note-evidence\">A Note on the Evidence</h1>" +
                     md_to_xhtml(section(fm, "A Note on the Evidence").replace("## ", "### ")))
    chapters.append(add("evidence.xhtml", "A Note on the Evidence", evidence_body))

    # chapters
    for path in sorted(glob.glob(os.path.join(SRC, "0[1-7]-*.md"))):
        md = open(path).read()
        first = md.split("\n")[0]
        num = re.match(r"# (\d+)", first)
        title = re.match(r"# \d+\s*·\s*(.+)", first)
        t = title.group(1).strip() if title else os.path.basename(path)
        body = md_to_xhtml(md)
        if num:
            body = body.replace("<h1", '<p class="chapnum">Chapter ' + num.group(1) + '</p>\n<h1', 1)
        chapters.append(add(os.path.basename(path).replace(".md", ".xhtml"),
                            t, body))

    # references + back matter
    for path in ("08-references.md", "09-back-matter.md"):
        md = open(os.path.join(SRC, path)).read()
        first = md.split("\n")[0].lstrip("# ").strip()
        body = md_to_xhtml(md, refmode=(path == "08-references.md"))
        chapters.append(add(path.replace(".md", ".xhtml"), first, body))

    book.toc = tuple(chapters)
    book.spine = ["nav"] + chapters
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    epub.write_epub(OUT, book)
    _inject_landmarks(OUT)
    print("saved", OUT, os.path.getsize(OUT), "bytes")


LANDMARKS = (
    '<nav epub:type="landmarks" id="landmarks" hidden="hidden">'
    "<h2>Guide</h2><ol>"
    '<li><a epub:type="cover" href="titlepage.xhtml">Title Page</a></li>'
    '<li><a epub:type="copyright-page" href="copyright.xhtml">Copyright</a></li>'
    '<li><a epub:type="notice" href="copyright.xhtml#notice">Notice to the Reader</a></li>'
    '<li><a epub:type="bodymatter" href="01-the-morning-check.xhtml">Start of Content</a></li>'
    '<li><a epub:type="backmatter" href="08-references.xhtml">References</a></li>'
    "</ol></nav>"
)


def _inject_landmarks(path):
    """ebooklib builds nav.xhtml internally and ignores item content, so the
    landmarks nav has to be spliced into the finished archive. The mimetype
    entry must stay first and uncompressed."""
    import zipfile, shutil, tempfile
    tmp = tempfile.mktemp(suffix=".epub")
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w") as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename.endswith("nav.xhtml"):
                text = data.decode("utf-8")
                if "landmarks" not in text:
                    text = text.replace("</body>", LANDMARKS + "</body>")
                data = text.encode("utf-8")
            if item.filename == "mimetype":
                zout.writestr(zipfile.ZipInfo("mimetype"), data, zipfile.ZIP_STORED)
            else:
                zout.writestr(item, data, zipfile.ZIP_DEFLATED)
    shutil.move(tmp, path)


if __name__ == "__main__":
    build()
