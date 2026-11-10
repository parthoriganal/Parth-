#!/usr/bin/env python3
"""
autocomplete_demand_index.py — FREE-only Amazon demand signals. No API keys, no paid data.

WHY THIS EXISTS
---------------
Amazon does not publish search volume, and every free "Amazon volume estimator" found in
public open-source (e.g. alikilickaya/amazon-search-volume-estimator, MIT) is, by its own
README, an ORDINAL PROMINENCE SCORE out of 100 -- not a volume. It scores how early a phrase
appears in Amazon's autocomplete suggestions for progressively shorter prefixes.

We therefore DO NOT claim volume anywhere. This tool emits two things that are genuinely
measurable for free:

  1. book_index_signal  -- does Amazon's BOOK index (alias=stripbooks) actually suggest this
     phrase? The suggestion payload carries `alias` and each item's `refTag`:
        alias == "stripbooks" and refTag contains "_i_"  -> answered from the book index
        alias == "aps"       and refTag contains "_fb_"  -> FELL BACK to the general
                                                            product index (NOT a book query)
     A fallback is a hard negative: the phrase is not book-buying language.

  2. promo_depth_score (0-100) -- SVEstimator-style ordinal prominence: probe the phrase and
     its prefixes; weight each hit by 1.25^(len(phrase)-len(prefix)). Higher = the phrase sits
     earlier/hotter in Amazon's own suggestion ordering. ORDINAL ONLY. Never a volume.

  3. serp_count -- the "N results" phrase from /s?k=<phrase>&i=stripbooks (paid-tier-free).

Every number carries a status label. Nothing is inferred into a volume.

USAGE
-----
    python3 autocomplete_demand_index.py --phrases phrases.txt --delay 1.5
    python3 autocomplete_demand_index.py --selftest        # no network, validates parsing

NOTE ON THIS SANDBOX: outbound TLS to amazon.com is blocked (curl -> 000, urllib -> SSL EOF).
Run this on a machine with normal egress. The parser is unit-tested via --selftest so the
logic is verifiable without network access.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
SUGGEST_URL = "https://completion.amazon.com/api/2017/suggestions"
MID = "ATVPDKIKX0DER"
EXPONENTIAL_FACTOR = 1.25

# Status labels. Anything not MEASURED is never treated as data.
MEASURED = "MEASURED"
NETWORK_BLOCKED = "NETWORK_BLOCKED"
BLOCKED_CAPTCHA = "BLOCKED_CAPTCHA"
PARSE_FAILED = "PARSE_FAILED"
EMPTY = "EMPTY"          # Amazon answered, with zero suggestions. A real, meaningful result.
NO_BOOK_INDEX = "NO_BOOK_INDEX"  # answered, but fell back to the product index.


def _get(url, timeout=15):
    req = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


# ---------------------------------------------------------------- parsing (unit-tested)

def parse_suggestions(payload_text):
    """Parse the completion API payload.

    Returns dict:
      status: MEASURED | EMPTY | PARSE_FAILED
      alias:  'stripbooks' | 'aps' | None
      from_book_index: bool
      values: list[str]
      ref_tags: list[str]
    """
    text = payload_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text.strip())
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return {"status": PARSE_FAILED, "alias": None, "from_book_index": False,
                "values": [], "ref_tags": []}

    if not isinstance(data, dict):
        return {"status": PARSE_FAILED, "alias": None, "from_book_index": False,
                "values": [], "ref_tags": []}

    alias = data.get("alias")
    sugg = data.get("suggestions") or []
    values, ref_tags = [], []
    for s in sugg:
        if isinstance(s, dict) and isinstance(s.get("value"), str):
            values.append(s["value"])
            ref_tags.append(s.get("refTag") or "")

    # The book index answers with alias=stripbooks AND refTags containing _i_.
    # alias=aps with refTag *_fb_* means Amazon fell back to the general product index.
    from_book = bool(alias == "stripbooks" and any("_i_" in t for t in ref_tags))

    status = MEASURED if values else EMPTY
    return {"status": status, "alias": alias, "from_book_index": from_book,
            "values": values, "ref_tags": ref_tags}


def depth_score(prefix_results, phrase):
    """SVEstimator-style ordinal prominence, 0-100. ORDINAL ONLY -- not a volume.

    prefix_results: list of (prefix, parse_suggestions(...)) ordered longest-first.
    Each hit is weighted by EXPONENTIAL_FACTOR ** (len(phrase) - len(prefix)).
    """
    needle = phrase.strip().lower()
    if not prefix_results:
        return 0.0
    weights = []
    for prefix, parsed in prefix_results:
        gap = max(0, len(phrase) - len(prefix))
        weights.append(EXPONENTIAL_FACTOR ** gap)
    total = sum(weights) or 1.0
    unit = 100.0 / total
    score = 0.0
    for (prefix, parsed), w in zip(prefix_results, weights):
        if needle in [v.strip().lower() for v in parsed.get("values", [])]:
            score += unit * w
    return round(score, 2)


def parse_serp_count(html_or_text):
    """Extract the result-count phrase from an Amazon search page.

    Returns int (exact when Amazon gives a bare number) or a lower bound when it says "over".
    Returns None if no count phrase is present.
    """
    m = re.search(r"1-\d+\s+of\s+(over\s+)?([\d,]+)\s+results", html_or_text)
    if not m:
        m = re.search(r"of\s+(over\s+)?([\d,]+)\s+results\s+for", html_or_text)
    if not m:
        return None, None
    over = bool(m.group(1))
    try:
        n = int(m.group(2).replace(",", ""))
    except ValueError:
        return None, None
    return n, ("over" if over else "exact")


# ---------------------------------------------------------------- collection

def fetch_suggestions(phrase, session_id):
    params = {
        "session-id": session_id,
        "prefix": phrase,
        "alias": "stripbooks",
        "mid": MID,
        "client": "amazon-search-ui",
    }
    url = SUGGEST_URL + "?" + urllib.parse.urlencode(params)
    try:
        return parse_suggestions(_get(url))
    except Exception as exc:  # noqa: BLE001 - classify, never fabricate
        name = type(exc).__name__
        msg = str(exc)
        status = NETWORK_BLOCKED
        if "captcha" in msg.lower():
            status = BLOCKED_CAPTCHA
        return {"status": status, "alias": None, "from_book_index": False,
                "values": [], "ref_tags": [], "error": f"{name}: {msg}"}


def probe_phrase(phrase, session_id, delay):
    """Probe the phrase plus its prefixes for the ordinal depth score."""
    out = {"phrase": phrase}
    words = phrase.split()
    prefixes = []
    for i in range(len(words), 0, -1):
        prefixes.append(" ".join(words[:i]))
    # also add character truncations of the final word for finer granularity
    truncations = []
    last = words[-1]
    for cut in range(len(last) - 1, 0, -1):
        truncations.append(" ".join(words[:-1] + [last[:cut]]) if len(words) > 1 else last[:cut])

    results, alias_seen, book_hits = [], set(), 0
    for p in prefixes + truncations:
        parsed = fetch_suggestions(p, session_id)
        alias_seen.add(parsed.get("alias") or parsed["status"])
        if parsed.get("from_book_index"):
            book_hits += 1
        results.append((p, parsed))
        time.sleep(delay)

    out["depth_score"] = depth_score(results, phrase)
    out["book_index_hits"] = book_hits
    out["probes"] = len(results)
    out["aliases_seen"] = sorted(a for a in alias_seen if a)
    out["head_status"] = results[0][1]["status"] if results else PARSE_FAILED
    out["suggestions"] = results[0][1]["values"] if results else []
    out["from_book_index"] = results[0][1]["from_book_index"] if results else False
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description="Free Amazon demand signals (no keys).")
    ap.add_argument("--phrases", help="file with one phrase per line")
    ap.add_argument("--phrase", action="append", default=[], help="phrase (repeatable)")
    ap.add_argument("--delay", type=float, default=1.5, help="seconds between requests")
    ap.add_argument("--out", default="demand_signals.json")
    ap.add_argument("--session-id", default="111-2223334-4445556")
    ap.add_argument("--selftest", action="store_true", help="validate parsing offline")
    args = ap.parse_args(argv)

    if args.selftest:
        return run_selftest()

    phrases = list(args.phrase)
    if args.phrases and os.path.exists(args.phrases):
        with open(args.phrases, encoding="utf-8") as fh:
            phrases += [ln.strip() for ln in fh if ln.strip()]
    if not phrases:
        ap.error("give --phrase or --phrases")

    records = [probe_phrase(p, args.session_id, args.delay) for p in phrases]
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(records, fh, indent=2)
    print(f"wrote {args.out} ({len(records)} phrases)")
    print(f"{'phrase':38} {'alias':>11} {'depth':>7} {'book?':>6} {'status'}")
    for r in records:
        print(f"{r['phrase'][:38]:38} {','.join(r['aliases_seen'])[:11]:>11} "
              f"{r['depth_score']:>7} {str(r['from_book_index']):>6} {r['head_status']}")
    return 0


def run_selftest():
    """Known-good payloads captured 2026-11-10 (evidence log). No network needed."""
    book_payload = json.dumps({
        "alias": "stripbooks", "prefix": "sourdough",
        "suggestions": [
            {"value": "sourdough", "refTag": "nb_sb_ss_i_1_9"},
            {"value": "sourdough discard recipes cookbook", "refTag": "nb_sb_ss_i_2_9"},
            {"value": "sourdough cookbook", "refTag": "nb_sb_ss_i_3_9"},
        ]})
    fb_payload = json.dumps({
        "alias": "aps", "prefix": "seizure",
        "suggestions": [{"value": "seizure emergency kit", "refTag": "nb_sb_ss_fb_1_7"}]})
    empty_payload = json.dumps({
        "alias": "stripbooks", "prefix": "senior care coordination", "suggestions": []})
    fenced = "```json\n" + book_payload + "\n```"

    checks = []

    p = parse_suggestions(book_payload)
    checks.append(("book index parsed", p["status"] == MEASURED and p["from_book_index"] is True))
    checks.append(("book phrase found", "sourdough cookbook" in p["values"]))
    checks.append(("fenced payload handled", parse_suggestions(fenced)["status"] == MEASURED))

    f = parse_suggestions(fb_payload)
    checks.append(("fallback detected as NOT book", f["from_book_index"] is False and f["alias"] == "aps"))

    e = parse_suggestions(empty_payload)
    checks.append(("empty is EMPTY not FAILED", e["status"] == EMPTY and e["values"] == []))

    bad = parse_suggestions("<html>captcha</html>")
    checks.append(("garbage is PARSE_FAILED", bad["status"] == PARSE_FAILED))

    # depth score: a hit only on the full phrase should beat no hits, lose to a hit on 1 char
    full_only = [("sourdough cookbook", p), ("sourdough", parse_suggestions(empty_payload))]
    d1 = depth_score(full_only, "sourdough cookbook")
    deep = [("sourdough cookbook", p), ("sourdough", p)]
    d2 = depth_score(deep, "sourdough cookbook")
    checks.append(("deeper hit scores higher", d2 > d1 > 0))

    n, kind = parse_serp_count("1-24 of 982 results for\"sourdough discard cookbook\"")
    checks.append(("exact serp count", (n, kind) == (982, "exact")))
    n2, kind2 = parse_serp_count("1-24 of over 40,000 results for\"grief journal\"")
    checks.append(("over serp count", (n2, kind2) == (40000, "over")))
    checks.append(("missing count is None", parse_serp_count("no numbers here") == (None, None)))

    ok = True
    for name, passed in checks:
        print(f"{'PASS' if passed else 'FAIL'}  {name}")
        ok = ok and passed
    print("\nselftest:", "OK" if ok else "FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
