#!/usr/bin/env python3
"""
measure_amazon_us.py — reproducible capture of the two Amazon signals this research used.

Deliberately dependency-free (stdlib only) so it runs anywhere: a laptop, an Android
Termux shell, or this sandbox.

WHAT IT MEASURES (and what it refuses to measure)
-------------------------------------------------
1. autocomplete(prefix)  -> list of keyword suggestions Amazon returns for a prefix,
                            per marketplace + department alias. This is Amazon's own
                            suggestion service. It tells you a phrase EXISTS in Amazon's
                            query stream. It does NOT tell you how many people type it.
2. serp_count(query)     -> the "1-24 of over N results" number from a books search.
                            This is TITLE DENSITY, a competition metric. It is NOT demand.

This script will NOT emit a search-volume number. Amazon publishes none, and inventing
one from autocomplete position or result count is the single most common way KDP
"research" tools mislead people. If you need real volume, wire up the optional
DataForSEO client already present in backend/kdp_engine/ (see docs/API_GUIDE.md).

USAGE
-----
    python3 measure_amazon_us.py autocomplete "blood pressure"
    python3 measure_amazon_us.py serp "caregiver handoff binder"
    python3 measure_amazon_us.py both "aging parents caregiver"
    python3 measure_amazon_us.py batch seeds.txt

OUTPUT: JSON on stdout, with source URL and UTC timestamp per record.

NETWORK NOTE
------------
Amazon blocks datacentre egress aggressively. In this Arena sandbox bash egress is
allowlisted to GitHub/PyPI/npm, so every request here returns a connection error and the
script exits with NETWORK_BLOCKED. That is the honest outcome — the research in
../FINAL_REPORT.md was captured through a page-fetch path instead. Do not "fix" this by
substituting placeholder numbers.
"""
import json
import sys
import re
import urllib.parse
import urllib.request
import datetime

MID_US = "ATVPDKIKX0DER"
DEPTS = {"paperback": "stripbooks", "books": "stripbooks", "kindle": "digital-text", "all": "aps"}
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")


def _now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _get(url, timeout=15):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "application/json, text/html;q=0.9, */*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace"), r.status


def autocomplete(prefix, dept="paperback"):
    alias = DEPTS.get(dept, "stripbooks")
    url = ("https://completion.amazon.com/api/2017/suggestions"
           f"?mid={MID_US}&alias={alias}&prefix={urllib.parse.quote(prefix)}")
    try:
        body, status = _get(url)
        data = json.loads(body)
    except Exception as e:
        return {"query": prefix, "dept": dept, "status": "NETWORK_BLOCKED",
                "error": f"{type(e).__name__}: {e}", "source": url, "fetched_at": _now()}
    sugg = [s.get("value", "").strip().lower() for s in data.get("suggestions", [])]
    return {
        "query": prefix, "dept": dept, "status": "MEASURED",
        "suggestions": [s for s in sugg if s],
        "count": len([s for s in sugg if s]),
        "predictive_text": data.get("predictiveText"),
        "interpretation": "Phrase presence only. NOT a search-volume measure.",
        "source": url, "fetched_at": _now(),
    }


COUNT_RE = re.compile(r"of\s+(?:over\s+)?([\d,]+)\s+results", re.I)


def serp_count(query, dept="paperback"):
    alias = DEPTS.get(dept, "stripbooks")
    url = ("https://www.amazon.com/s?k=" + urllib.parse.quote_plus(query)
           + f"&i={alias}")
    try:
        html, status = _get(url)
    except Exception as e:
        return {"query": query, "status": "NETWORK_BLOCKED",
                "error": f"{type(e).__name__}: {e}", "source": url, "fetched_at": _now()}
    if "captcha" in html.lower() or "api-services-support" in html.lower():
        return {"query": query, "status": "BLOCKED_CAPTCHA", "source": url, "fetched_at": _now()}
    m = COUNT_RE.search(html)
    if not m:
        return {"query": query, "status": "PARSE_FAILED",
                "hint": "Amazon changed markup, or no results page returned",
                "source": url, "fetched_at": _now()}
    return {
        "query": query, "dept": dept, "status": "MEASURED",
        "result_count": int(m.group(1).replace(",", "")),
        "phrase": m.group(0),
        "interpretation": "Title density = competition metric. NOT demand.",
        "source": url, "fetched_at": _now(),
    }


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    mode, arg = argv[1], argv[2]
    if mode == "autocomplete":
        print(json.dumps(autocomplete(arg), indent=2))
    elif mode == "serp":
        print(json.dumps(serp_count(arg), indent=2))
    elif mode == "both":
        print(json.dumps({"autocomplete": autocomplete(arg), "serp": serp_count(arg)}, indent=2))
    elif mode == "batch":
        out = []
        with open(arg) as f:
            for line in f:
                q = line.strip()
                if q and not q.startswith("#"):
                    out.append(serp_count(q))
        print(json.dumps(out, indent=2))
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
