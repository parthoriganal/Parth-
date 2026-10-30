"""Content Gap Analyzer — compares competitor TOC/topics vs. keyword demand.
Uses TF-IDF heuristic on competitor titles/descriptions to find under-served subtopics.
"""
import re
import math
from collections import Counter

STOPWORDS = set("""a an the and or but in on at to for of with is are was were be been being has have had do does did will would could should may might must can this that these those it its as by from up out about into through during before after above below which when where who whom why how what if then than so such no nor not only own same than too very just""".split())

def tokenize(text):
    if not text:
        return []
    tokens = re.findall(r"[a-z]{3,}", text.lower())
    return [t for t in tokens if t not in STOPWORDS and len(t) >= 3]

def analyze_content_gap(keywords, competitors):
    """
    keywords: list of {keyword, position, ...}
    competitors: list of {title, description_snippet, categories}
    Returns gaps: topics present in keyword demand but weak in competitor coverage.
    """
    if not keywords or not competitors:
        return {"status": "unavailable", "reason": "Need both mined keywords and competitor ASINs to analyze content gaps.", "gaps": []}

    # Build competitor corpus
    corpus_texts = []
    for c in competitors:
        if c.get("status") != "ok":
            continue
        t = (c.get("title") or "") + " " + (c.get("description_snippet") or "") + " " + " ".join(c.get("categories", []))
        corpus_texts.append(t.lower())

    competitor_tokens_all = []
    for t in corpus_texts:
        competitor_tokens_all.extend(tokenize(t))
    comp_counter = Counter(competitor_tokens_all)
    total_comp_tokens = len(competitor_tokens_all) or 1

    # Extract keyword tokens weighted by demand rank
    kw_signals = []
    for kw in keywords:
        kw_text = kw.get("keyword", "")
        pos = kw.get("position", 10)
        demand_weight = (11 - min(pos, 10)) / 10  # high at pos1
        toks = tokenize(kw_text)
        for tok in toks:
            kw_signals.append((tok, demand_weight, kw_text))

    kw_counter = Counter()
    kw_weight_sum = Counter()
    for tok, w, _ in kw_signals:
        kw_counter[tok] += 1
        kw_weight_sum[tok] += w

    # Compute gap score: high demand weight but low competitor coverage
    gaps = []
    seen = set()
    for tok in kw_counter:
        if tok in seen:
            continue
        seen.add(tok)
        demand_freq = kw_counter[tok]
        demand_w = kw_weight_sum[tok]
        comp_freq = comp_counter.get(tok, 0)
        comp_coverage = comp_freq / total_comp_tokens  # proportion
        # TF-IDF-ish gap: demand * (1 - coverage)
        # normalize coverage 0-1
        gap_score = round(demand_w * (1 - min(1, comp_coverage * 200)) * 20, 2)
        # Only surface if demand >=2 and coverage low
        if demand_freq >= 1 and gap_score > 1.5:
            # find example keywords containing this token
            examples = [kw.get("keyword") for kw in keywords if tok in kw.get("keyword","").lower()][:3]
            gaps.append({
                "topic": tok,
                "demand_mentions": demand_freq,
                "demand_weight": round(demand_w, 2),
                "competitor_mentions": comp_freq,
                "competitor_coverage": round(comp_coverage * 100, 2),
                "gap_score": gap_score,
                "example_keywords": examples,
                "opportunity": "High" if gap_score > 8 else "Medium" if gap_score > 4 else "Low",
            })

    gaps.sort(key=lambda x: x["gap_score"], reverse=True)
    # top 15
    top = gaps[:15]

    summary = f"Analyzed {len(keywords)} keywords against {len(corpus_texts)} competitors. Found {len(top)} topic gaps where demand exists but competitors under-serve."
    if not top:
        summary = f"Analyzed {len(keywords)} keywords against {len(corpus_texts)} competitors. No strong gaps — competitors appear to cover these topics well. Try broader seed keywords."

    return {
        "status": "ok",
        "summary": summary,
        "total_keywords": len(keywords),
        "competitors_analyzed": len(corpus_texts),
        "gaps": top,
        "method": "Token frequency comparison: keyword demand tokens vs competitor title/description/categories. Gap = demand_weight × (1 - coverage). High gap = opportunity to differentiate.",
        "source": "Derived from mined keywords + scraped competitor metadata (no external API)",
    }
