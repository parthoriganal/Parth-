"""Amazon autocomplete miner — ported from kdp-scout, adapted for Flask concurrency (requests per keyword)."""
import json
import logging
import random
import string
import time
import urllib.parse

import requests

logger = logging.getLogger(__name__)

DEPT_ALIASES = {"kindle": "digital-text", "books": "stripbooks", "all": "aps", "ebooks": "digital-text", "paperback": "stripbooks"}
UAS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
]

_backoff_until = 0
_backoff_delay = 0

def _headers():
    return {
        "User-Agent": random.choice(UAS),
        "Accept": "application/json, text/html, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
    }

def _query_one(prefix, alias, mp, session):
    global _backoff_until, _backoff_delay
    now = time.monotonic()
    if now < _backoff_until:
        wait = _backoff_until - now
        time.sleep(min(wait, 2))

    domain = mp["completion_domain"]
    mid = mp["mid"]
    url = f"https://{domain}/api/2017/suggestions"
    params = {"mid": mid, "alias": alias, "prefix": prefix}
    try:
        resp = session.get(url, params=params, headers=_headers(), timeout=12)
    except Exception as e:
        logger.warning(f"autocomplete network error for '{prefix}': {e}")
        # Bubble up as exception so caller can decide on mock fallback
        raise ConnectionError(f"Amazon autocomplete unreachable: {e}") from e

    if resp.status_code in (429, 503):
        _backoff_delay = min(max(_backoff_delay * 2 if _backoff_delay else 5, 5), 30)
        _backoff_until = time.monotonic() + _backoff_delay
        logger.warning(f"autocomplete {resp.status_code} for '{prefix}' backoff {_backoff_delay}s")
        raise RuntimeError(f"Amazon throttled ({resp.status_code})")
    if resp.status_code != 200:
        logger.warning(f"autocomplete {resp.status_code} for '{prefix}'")
        return []

    _backoff_delay = 0
    try:
        data = resp.json()
    except Exception:
        return []
    suggestions = data.get("suggestions", [])
    out = []
    for i, s in enumerate(suggestions):
        kw = (s.get("value") or "").strip().lower()
        if kw:
            out.append((kw, i + 1))
    return out

def mine_autocomplete(seed, department="kindle", depth=1, marketplace="us", progress_cb=None):
    """
    Mine long-tail keywords for a single seed.
    Returns list of (keyword, best_position) sorted by position then alpha.
    """
    from config import MARKETPLACES, DEPT_ALIASES as DA
    mp_code = (marketplace or "us").lower()
    mp = MARKETPLACES.get(mp_code)
    if not mp:
        raise ValueError(f"Unknown marketplace {marketplace}")
    alias = DA.get(department.lower(), department)

    session = requests.Session()
    all_kw = {}  # kw -> best pos
    prefixes = [seed] + [f"{seed} {c}" for c in string.ascii_lowercase]
    total = len(prefixes)
    for idx, pref in enumerate(prefixes):
        for kw, pos in _query_one(pref, alias, mp, session):
            if kw not in all_kw or pos < all_kw[kw]:
                all_kw[kw] = pos
        if progress_cb:
            progress_cb(idx + 1, total)
        # gentle throttle to respect Amazon
        time.sleep(0.18)

    if depth >= 2:
        depth1 = list(all_kw.keys())
        expansions = []
        for kw in depth1:
            for c in string.ascii_lowercase:
                expansions.append(f"{kw} {c}")
        # cap depth-2 to avoid thousands of requests — sample top 12 keywords only
        # to keep response time reasonable for web UI
        sample = depth1[:12]
        expansions = []
        for kw in sample:
            for c in string.ascii_lowercase:
                expansions.append(f"{kw} {c}")
        total = len(prefixes) + len(expansions)
        completed = len(prefixes)
        for pref in expansions:
            for kw, pos in _query_one(pref, alias, mp, session):
                if kw not in all_kw or pos < all_kw[kw]:
                    all_kw[kw] = pos
            completed += 1
            if progress_cb:
                progress_cb(completed, total)
            time.sleep(0.18)

    results = sorted(all_kw.items(), key=lambda x: (x[1], x[0]))
    logger.info(f"autocomplete '{seed}' depth={depth} marketplace={marketplace} -> {len(results)} keywords")
    return results

def mine_multiple(seeds, department="kindle", depth=1, marketplace="us", allow_mock=True):
    """Mine 1-10 seeds, dedupe across seeds, return aggregated results.
    If Amazon outbound is blocked (sandbox), falls back to labeled MOCK data so UI remains demoable.
    """
    aggregated = {}
    per_seed = {}
    errors = []
    mock_used = False
    for s in seeds:
        s_clean = s.strip().lower()
        if not s_clean:
            continue
        try:
            kws = mine_autocomplete(s_clean, department=department, depth=depth, marketplace=marketplace)
            per_seed[s_clean] = kws
            for kw, pos in kws:
                if kw not in aggregated or pos < aggregated[kw]["pos"]:
                    aggregated[kw] = {"kw": kw, "pos": pos, "seed": s_clean}
        except (ConnectionError, RuntimeError) as e:
            # Network/throttle failure — fallback to mock if allowed
            if allow_mock:
                from kdp_engine.mock_data import get_mock_keywords_for_seed
                mock_kws = get_mock_keywords_for_seed(s_clean)
                # assign positions 1..n
                kws = [(kw, idx+1) for idx, kw in enumerate(mock_kws)]
                per_seed[s_clean] = kws
                for kw, pos in kws:
                    if kw not in aggregated or pos < aggregated[kw]["pos"]:
                        aggregated[kw] = {"kw": kw, "pos": pos, "seed": s_clean}
                mock_used = True
                errors.append({"seed": s_clean, "error": f"MOCK fallback — {e}", "mock": True})
                logger.warning(f"Mock fallback for seed '{s_clean}' due to: {e}")
            else:
                errors.append({"seed": s_clean, "error": str(e)})
                per_seed[s_clean] = []
        except Exception as e:
            logger.exception(f"mine_multiple failed seed {s_clean}: {e}")
            errors.append({"seed": s_clean, "error": str(e)})
            per_seed[s_clean] = []

    out = []
    for kw, meta in aggregated.items():
        out.append({"keyword": kw, "position": meta["pos"], "seed": meta["seed"]})
    out.sort(key=lambda x: (x["position"], x["keyword"]))
    return {"keywords": out, "per_seed": per_seed, "errors": errors, "total_mined": len(out), "mock_used": mock_used}

# Heuristic: estimate search intent / demand score from autocomplete signals (not search volume)
def demand_heuristic(position, word_count, marketplace="us"):
    """
    Returns ESTIMATED demand signal 0-100 based solely on autocomplete position + keyword length.
    This is NOT monthly search volume — see docs.
    """
    # Position 1 => strong signal (Amazon suggests it first)
    pos_score = max(0, (11 - position)) / 10  # 1.0 for pos1, 0.1 for pos10
    # long-tail has higher buyer intent
    intent_bonus = 0.15 if word_count >= 4 else (0.08 if word_count >= 3 else 0)
    # short head terms get breadth bonus
    breadth_bonus = 0.10 if word_count <= 2 else 0
    score = (pos_score * 0.75 + intent_bonus + breadth_bonus) * 100
    return round(min(100, score), 1)

def categorize_intent(keyword):
    kw = keyword.lower()
    high_intent_tokens = ["best", "top", "buy", "cheap", "affordable", "review", "vs", "for", "with", "kindle", "paperback", "book", "guide", "how to", "workbook", "journal", "planner", "coloring"]
    informational_tokens = ["what is", "how to", "why", "when", "history of", "meaning", "explained", "guide to"]
    buyer_terms = ["buy", "best", "top", "cheap", "deal"]
    # simple rule-based bucket
    if any(kw.startswith(t) or f" {t} " in f" {kw} " for t in buyer_terms):
        return "High Commercial Intent"
    if any(t in kw for t in informational_tokens):
        return "Informational"
    if len(kw.split()) >= 4:
        return "Long-tail / Niche"
    return "General"
