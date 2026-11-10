"""
content_audit.py — the compliance sweep the brief demands.

Checks the finished PDF's text, not the source, for the things the book promised not to do:
  * any field labelled password / PIN / recovery phrase / key / code / security answer
  * language that implies completing a page creates a will, POA, directive or estate plan
  * medical instruction
  * unqualified legal claims (must/always/guaranteed)
  * dangling page references ("page --")
  * spiral / lay-flat claims
  * trademark clearance claims
"""
import re, sys, os
import pypdf

PDF = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "build", "fro_interior.pdf")

text = []
r = pypdf.PdfReader(PDF)
for i, pg in enumerate(r.pages, 1):
    text.append((i, pg.extract_text() or ""))
full = "\n".join(t for _, t in text)

BANNED_FIELDS = [
    r"\bwrite your password\b", r"\byour password:\s*_", r"\bPIN number\s*_",
    r"recovery phrase:\s*_", r"private key:\s*_", r"security answer:\s*_",
    r"password here", r"enter your password",
]
IMPLIED_LEGAL = [
    r"this (page|book|document) (creates|constitutes|is) (a|your) (valid )?(will|power of attorney|directive|estate plan)",
    r"by completing this (book|page) you (create|make|have made) a will",
    r"legally binding organizer",
]
MEDICAL = [
    r"\btake \d+ ?mg\b", r"\badminister\b", r"\bdo not resuscitate unless\b",
    r"you should (take|stop taking)",
]
FLAT_CLAIM = [r"lies flat", r"lay[- ]flat", r"spiral[- ]bound", r"lies? open flat"]
TM_CLAIM = [r"trademark[- ]clear", r"trademark search (was|has been) (done|conducted)"]

def scan(name, patterns, flags=re.I):
    hits = []
    for pat in patterns:
        for m in re.finditer(pat, full, flags):
            # find the page
            upto = full[:m.start()]
            page = full[:m.start()].count("\x0c") + 1
            hits.append((pat, m.group(0)[:60]))
    return hits

problems = []
for name, pats in (("banned_field", BANNED_FIELDS), ("implied_legal", IMPLIED_LEGAL),
                   ("medical_advice", MEDICAL), ("flat_claim", FLAT_CLAIM),
                   ("trademark_claim", TM_CLAIM)):
    for pat, hit in scan(name, pats):
        problems.append((name, pat, hit))

dangling = [m.group(0) for m in re.finditer(r"page\s*--", full, re.I)]
plain_dangling = [m.group(0) for m in re.finditer(r"\bpage\s+(None|NaN)\b", full, re.I)]

# the phrase "lies flat" is allowed only in an explicit denial
denials = 0
for m in re.finditer(r"[^.]*lies flat[^.]*\.", full, re.I):
    seg = m.group(0).lower()
    if "not" in seg or "will not" in seg or "does not" in seg:
        denials += 1

print("pages scanned:", len(text))
print("banned field patterns:", sum(1 for p in problems if p[0] == "banned_field"))
print("implied-legal patterns:", sum(1 for p in problems if p[0] == "implied_legal"))
print("medical-instruction patterns:", sum(1 for p in problems if p[0] == "medical_advice"))
print("flat-binding claims:", sum(1 for p in problems if p[0] == "flat_claim"))
print("trademark claims:", sum(1 for p in problems if p[0] == "trademark_claim"))
print("dangling 'page --':", len(dangling), " 'page None':", len(plain_dangling))
print("'lies flat' occurrences that are denials:", denials)
for p in problems[:20]:
    print("  !", p)
sys.exit(1 if problems or dangling or plain_dangling else 0)
