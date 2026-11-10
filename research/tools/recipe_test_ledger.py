#!/usr/bin/env python3
"""
recipe_test_ledger.py — anti-fabrication gate for cookbook production.

WHY THIS EXISTS
---------------
The single biggest integrity risk in a cookbook project is claiming a recipe "works" when
nobody cooked it. This tool refuses to certify a manuscript as production-ready unless every
recipe has an attached test record with a date, a taster and a result. It cannot make a recipe
work; it can only stop an untested one from being called tested.

It also answers the round-4 question "what needs kitchen testing vs what can be researched"
in machine-readable form: every recipe carries `requires_kitchen_test` (true for anything with
proportions/times/temps) and `researchable_fields` (technique prose, safety notes, conversions).

USAGE
-----
    python3 recipe_test_ledger.py --init recipes.csv          # write an empty template
    python3 recipe_test_ledger.py --check recipes.csv         # gate: exit 1 if not certifiable
    python3 recipe_test_ledger.py --summary recipes.csv
    python3 recipe_test_ledger.py --selftest
"""

import argparse
import csv
import os
import sys
from datetime import date

FIELDS = [
    "recipe_id", "title", "chapter", "requires_kitchen_test",
    "tested", "test_date", "taster", "result", "notes",
]

RESULT_VALUES = {"", "works", "needs_tweak", "failed"}


def load(path):
    with open(path, encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def is_true(v):
    return str(v).strip().lower() in {"1", "true", "yes", "y"}


def audit(rows):
    """Return (errors, warnings, stats). Errors block certification."""
    errors, warnings = [], []
    stats = {"total": len(rows), "tested": 0, "untested": 0,
             "works": 0, "needs_tweak": 0, "failed": 0, "not_required": 0}

    seen = set()
    for i, r in enumerate(rows, start=2):  # 2 = first data row in a CSV
        rid = (r.get("recipe_id") or "").strip()
        if not rid:
            errors.append(f"row {i}: missing recipe_id")
        elif rid in seen:
            errors.append(f"row {i}: duplicate recipe_id {rid!r}")
        seen.add(rid)

        if not (r.get("title") or "").strip():
            errors.append(f"row {i} ({rid}): missing title")

        res = (r.get("result") or "").strip().lower()
        if res not in RESULT_VALUES:
            warnings.append(f"row {i} ({rid}): unknown result {res!r}")
        if res == "failed":
            stats["failed"] += 1
            errors.append(f"row {i} ({rid}): result is 'failed' — a failed recipe must be "
                          f"rewritten and retested, not shipped")

        needs = is_true(r.get("requires_kitchen_test"))
        tested = is_true(r.get("tested"))

        if not needs:
            stats["not_required"] += 1
            continue  # e.g. a conversion table or safety note — no cooking needed

        if tested:
            stats["tested"] += 1
            if res == "works":
                stats["works"] += 1
            elif res == "needs_tweak":
                stats["needs_tweak"] += 1
            if not (r.get("test_date") or "").strip():
                errors.append(f"row {i} ({rid}): marked tested but has no test_date")
            if not (r.get("taster") or "").strip():
                errors.append(f"row {i} ({rid}): marked tested but has no taster named")
            if not res:
                errors.append(f"row {i} ({rid}): marked tested but has no result")
            td = (r.get("test_date") or "").strip()
            if td:
                try:
                    if date.fromisoformat(td) > date.today():
                        errors.append(f"row {i} ({rid}): test_date {td} is in the future")
                except ValueError:
                    errors.append(f"row {i} ({rid}): test_date {td!r} is not ISO YYYY-MM-DD")
        else:
            stats["untested"] += 1
            errors.append(f"row {i} ({rid}): requires kitchen testing but is NOT tested")

    return errors, warnings, stats


def certify(rows):
    errors, warnings, stats = audit(rows)
    return (not errors), errors, warnings, stats


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--init")
    ap.add_argument("--check")
    ap.add_argument("--summary")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args(argv)

    if a.selftest:
        return run_selftest()

    if a.init:
        if os.path.exists(a.init):
            print(f"refusing to overwrite {a.init}", file=sys.stderr)
            return 1
        with open(a.init, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=FIELDS)
            w.writeheader()
        print(f"wrote empty ledger {a.init}")
        return 0

    target = a.check or a.summary
    if not target:
        ap.error("give --init, --check, --summary or --selftest")
    rows = load(target)
    ok, errors, warnings, stats = certify(rows)

    print(f"recipes: {stats['total']}  (kitchen-tested: {stats['tested']}, "
          f"untested: {stats['untested']}, no-test-needed: {stats['not_required']})")
    print(f"results: works={stats['works']} needs_tweak={stats['needs_tweak']} "
          f"failed={stats['failed']}")
    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"BLOCK {e}")
    print("\nCERTIFIABLE:", "YES" if ok else "NO")
    if not ok:
        print("A cookbook with untested recipes must not be described as tested anywhere "
              "in its listing, front matter or marketing.")
    return 0 if (ok or a.summary) else 1


def run_selftest():
    base = {"recipe_id": "r1", "title": "Pancakes", "chapter": "Breakfast",
            "requires_kitchen_test": "true", "tested": "true",
            "test_date": "2026-11-01", "taster": "self", "result": "works", "notes": ""}
    checks = []

    ok, errs, _, _ = certify([dict(base)])
    checks.append(("fully tested recipe certifies", ok and not errs))

    bad = dict(base); bad["tested"] = "false"
    ok, errs, _, _ = certify([bad])
    checks.append(("untested recipe blocks", (not ok) and any("NOT tested" in e for e in errs)))

    bad = dict(base); bad["test_date"] = ""
    ok, errs, _, _ = certify([bad])
    checks.append(("tested without date blocks", (not ok) and any("no test_date" in e for e in errs)))

    bad = dict(base); bad["taster"] = ""
    ok, errs, _, _ = certify([bad])
    checks.append(("tested without taster blocks", (not ok) and any("no taster" in e for e in errs)))

    bad = dict(base); bad["test_date"] = "2099-01-01"
    ok, errs, _, _ = certify([bad])
    checks.append(("future test date blocks", (not ok) and any("future" in e for e in errs)))

    bad = dict(base); bad["test_date"] = "01/11/2026"
    ok, errs, _, _ = certify([bad])
    checks.append(("non-ISO date blocks", (not ok) and any("not ISO" in e for e in errs)))

    bad = dict(base); bad["result"] = "failed"
    ok, errs, _, _ = certify([bad])
    checks.append(("failed recipe blocks", (not ok) and any("'failed'" in e for e in errs)))

    dup = [dict(base), dict(base)]
    ok, errs, _, _ = certify(dup)
    checks.append(("duplicate id blocks", (not ok) and any("duplicate" in e for e in errs)))

    nt = dict(base); nt["requires_kitchen_test"] = "false"; nt["tested"] = "false"
    nt["title"] = "Gram conversion table"
    ok, errs, _warns, stats = certify([nt])
    checks.append(("no-test-needed item passes", ok and stats["not_required"] == 1))

    ok_all = True
    for name, passed in checks:
        print(f"{'PASS' if passed else 'FAIL'}  {name}")
        ok_all = ok_all and passed
    print("\nselftest:", "OK" if ok_all else "FAILED")
    return 0 if ok_all else 1


if __name__ == "__main__":
    sys.exit(main())
