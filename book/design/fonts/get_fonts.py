"""Fetch OFL variable fonts from google/fonts via the GitHub contents API, then
instantiate static weights with fontTools. Run with the book venv."""
import urllib.request, urllib.parse, json, base64, os, sys

def api(u):
    req = urllib.request.Request(u, headers={"User-Agent": "bookbuild", "Accept": "application/vnd.github+json"})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

def blob(url):
    req = urllib.request.Request(url, headers={"User-Agent": "bookbuild", "Accept": "application/vnd.github+json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())

OUT = os.path.dirname(os.path.abspath(__file__))
FAMILIES = {
    "ofl/literata": ["Literata[opsz,wght].ttf", "Literata-Italic[opsz,wght].ttf"],
    "ofl/inter":    ["Inter[opsz,wght].ttf",    "Inter-Italic[opsz,wght].ttf"],
}

def fetch():
    os.chdir(OUT)
    for d, files in FAMILIES.items():
        for f in files:
            if os.path.exists(f):
                print("  have", f); continue
            meta = api("https://api.github.com/repos/google/fonts/contents/%s/%s" % (d, urllib.parse.quote(f)))
            raw = base64.b64decode(blob(meta["git_url"])["content"])
            open(f, "wb").write(raw)
            print("  saved", f, "%.0f KB" % (len(raw) / 1024))

INSTANCES = [
    ("Literata[opsz,wght].ttf",        "Literata", "Regular",  {"wght": 400, "opsz": 11}),
    ("Literata[opsz,wght].ttf",        "Literata", "SemiBold", {"wght": 600, "opsz": 11}),
    ("Literata-Italic[opsz,wght].ttf", "Literata", "Italic",   {"wght": 400, "opsz": 11}),
    ("Inter[opsz,wght].ttf",           "Inter",    "Medium",   {"wght": 500, "opsz": 16}),
    ("Inter[opsz,wght].ttf",           "Inter",    "Bold",     {"wght": 700, "opsz": 16}),
    ("Inter[opsz,wght].ttf",           "Inter",    "Regular",  {"wght": 400, "opsz": 16}),
]

def instantiate():
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
    os.chdir(OUT)
    for src, fam, style, loc in INSTANCES:
        out = "%s-%s.ttf" % (fam, style)
        if os.path.exists(out):
            print("  have", out); continue
        f = TTFont(src)
        inst = instantiateVariableFont(f, loc, updateFontNames=False, inplace=False)
        inst.save(out)
        print("  built %-26s %6.0f KB" % (out, os.path.getsize(out) / 1024))

if __name__ == "__main__":
    fetch()
    instantiate()
    print("FONTS OK")
