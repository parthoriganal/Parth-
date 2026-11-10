#!/usr/bin/env python3
"""
rank_niches.py — comparative ranking for round 3.

IMPORTANT HONESTY NOTE
----------------------
The three inputs `organic`, `evergreen`, `diff_score` in round3_evidence.csv are ANALYST
RUBRIC scores (0-5), NOT measurements. They are derived from the MEASURED columns in the same
row (autocomplete status, serp count, category-rank evidence) by the rules in RUBRIC below,
but a human chose the anchors. `competition` and `confidence` ARE computed mechanically from
measured fields. The report labels every column accordingly.

No column here is a search volume, and no column is a sales estimate.
"""

import csv
import os
import sys

RUBRIC = """
ORGANIC (0-5) - from measured autocomplete behaviour only
   0  no book-index suggestion at all (alias=aps fallback, or zero suggestions)
   2  book-index suggestion exists but is only the bare echo of the query
   3  book-index suggestion exists and EXTENDS the query (a real long-tail)
   4  three or more book-index suggestions
   5  four or more book-index suggestions including a distinct product-type phrase

EVERGREEN (0-5) - structural reasoning, stated per row in `evergreen_basis`
   5  permanent human need (demographic/biological/legal), no trend dependence
   4  recurring hobby/practice with stable participation
   3  recurring but sensitive to participation swings or technology substitution
   2  demonstrable boom-bust history
   1  seasonal or event-driven
   0  trend / viral dependent

DEMAND EVIDENCE (0-5) - how much proof of actual buying exists, independent of review counts
   5  a same-genre title holds a sustained top-5 category bestseller rank
   4  same-genre titles appear deep in a category (top 100) with measurable review velocity
   3  category exists and contains the genre, but no rank/velocity captured
   2  category exists but genre absent from it
   1  no relevant category identified
   0  no evidence

COMPETITION (0-5, higher = more room) - computed from measured serp_count:
   serp <= 1,000        -> 5
   serp <= 3,000        -> 4
   serp <= 8,000        -> 3
   serp <= 25,000       -> 2
   serp >  25,000       -> 1
   unknown              -> 0 and flagged

CONFIDENCE (0-5, higher = more of the chain actually measured) - computed:
   +2 serp_count measured
   +2 autocomplete measured
   +1 category rank evidence captured
   (volume is NEVER obtainable free, so 5/5 here still means "no volume number")
"""

WEIGHTS = {
    "organic": 0.20,
    "evergreen": 0.20,
    "demand": 0.25,
    "competition": 0.15,
    "differentiation": 0.10,
    "confidence": 0.10,
}


def tier(score):
    if score >= 4.2:
        return "A-range"
    if score >= 3.5:
        return "B-range"
    if score >= 2.5:
        return "C-range"
    return "D-range"


def load(path):
    with open(path, encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def main():
    import argparse
    ap = argparse.ArgumentParser(description="Rank niches from an evidence CSV.")
    ap.add_argument("--input", default=None,
                    help="evidence CSV (default: data/round3_evidence.csv)")
    ap.add_argument("--output", default=None, help="ranking CSV output path")
    args = ap.parse_args()

    here = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.dirname(here)
    path = args.input or os.path.join(data_dir, "data", "round3_evidence.csv")
    rows = load(path)
    out = []
    for r in rows:
        serp = num(r["serp_count"])
        comp = num(r.get("competition_score"))
        if comp is None:
            if serp is None:
                comp = 0.0
            elif serp <= 1000:
                comp = 5.0
            elif serp <= 3000:
                comp = 4.0
            elif serp <= 8000:
                comp = 3.0
            elif serp <= 25000:
                comp = 2.0
            else:
                comp = 1.0
        subs = {
            "organic": num(r["organic_score"]) or 0.0,
            "evergreen": num(r["evergreen_score"]) or 0.0,
            "demand": num(r["demand_score"]) or 0.0,
            "competition": comp,
            "differentiation": num(r["diff_score"]) or 0.0,
            "confidence": num(r["confidence_score"]) or 0.0,
        }
        total = sum(subs[k] * WEIGHTS[k] for k in WEIGHTS)
        # Gate: a _fb_ fallback means the phrase is not book language -> cannot win.
        gate = r["book_index"].strip().lower() != "fallback"
        out.append({**r, **{f"_{k}": v for k, v in subs.items()},
                    "total": round(total, 2), "tier": tier(total), "eligible": gate})

    out.sort(key=lambda x: (x["eligible"], x["total"]), reverse=True)

    hdr = (f"{'#':>2} {'niche':34} {'org':>4}{'evg':>4}{'dem':>4}{'cmp':>4}"
           f"{'dif':>4}{'cnf':>4} {'total':>6} {'tier':>8}  gate")
    print(hdr)
    print("-" * len(hdr))
    for i, r in enumerate(out, 1):
        print(f"{i:>2} {r['niche'][:34]:34} "
              f"{r['_organic']:>4.0f}{r['_evergreen']:>4.0f}{r['_demand']:>4.0f}"
              f"{r['_competition']:>4.0f}{r['_differentiation']:>4.0f}{r['_confidence']:>4.0f} "
              f"{r['total']:>6.2f} {r['tier']:>8}  {'PASS' if r['eligible'] else 'FAIL(_fb_)'}")

    elig = [r for r in out if r["eligible"]]
    if elig:
        top = elig[0]
        print(f"\nTop eligible: {top['niche']}  ({top['total']:.2f}, {top['tier']})")
    print(f"\nEligible (book-index confirmed): {len(elig)}/{len(out)}")

    outp = args.output or os.path.join(data_dir, "data", "round3_ranking.csv")
    with open(outp, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["rank", "niche", "organic", "evergreen", "demand", "competition",
                    "differentiation", "confidence", "weighted_total", "tier", "book_index_gate"])
        for i, r in enumerate(out, 1):
            w.writerow([i, r["niche"], r["_organic"], r["_evergreen"], r["_demand"],
                        r["_competition"], r["_differentiation"], r["_confidence"],
                        r["total"], r["tier"], "PASS" if r["eligible"] else "FAIL(_fb_)"])
    print(f"wrote {outp}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
