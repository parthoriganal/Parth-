"""Opportunity scorer — transparent 0-100 composite from 5 pillars.
Demand (30) + Competition (25) + Differentiation (15) + Buyer Intent (15) + Profitability (15) = 100
Each subscore explains its inputs. No invented search volumes — uses ESTIMATED heuristics labeled accordingly.
"""
import math
import re

# Weights for 5 pillars (sum to 100)
PILLAR_WEIGHTS = {
    "demand": 30,
    "competition": 25,
    "differentiation": 15,
    "buyer_intent": 15,
    "profitability": 15,
}

def _score_demand(position, result_count, has_dataforseo_volume=False):
    """
    Demand 0-30.
    Inputs: autocomplete position (1 best), result_count (proxy for supply, high count = high demand+supply), optional DataForSEO volume.
    Position is primary signal — Amazon shows it high because shoppers type it.
    """
    if position is None:
        return 0, "No autocomplete position — demand unknown"
    pos_score = max(0, (11 - position) / 10)  # 1.0 at pos1
    # result_count boosts demand belief: >10k = active marketplace
    demand_boost = 0
    explain = f"Autocomplete position {position} (1=highest visibility). "
    if result_count is not None:
        if result_count >= 10000:
            demand_boost = 0.15
            explain += f"Amazon shows {result_count:,} results → strong marketplace demand. "
        elif result_count >= 1000:
            demand_boost = 0.05
            explain += f"{result_count:,} results → moderate demand. "
        else:
            explain += f"{result_count:,} results → niche demand. "
    else:
        explain += "Result count unavailable — using position only. "
    if has_dataforseo_volume:
        explain += "DataForSEO volume available (actual). "
    else:
        explain += "Volume is ESTIMATED from autocomplete heuristics, NOT monthly searches."

    raw = pos_score * 0.85 + demand_boost
    score = round(min(1.0, raw) * PILLAR_WEIGHTS["demand"], 1)
    return score, explain

def _score_competition(result_count, avg_bsr=None, avg_reviews=None, competitor_count=None):
    """
    Competition 0-25 (inverted: lower competition = higher score).
    Inputs: result_count, avg BSR, avg reviews of top competitors.
    """
    if result_count is None and avg_bsr is None and avg_reviews is None:
        return 12.5, "Insufficient competition data — neutral 50% assigned. Provide competitor ASINs for accurate score."
    
    # Base on result count
    comp_score = 0.5
    explain_parts = []
    if result_count is not None:
        # fewer results = less competition = higher opportunity
        # normalize: 0-5k=high opportunity, 50k+=low
        norm = 1.0 / (1.0 + result_count / 15000)  # 0-1, high when count low
        comp_score = norm
        explain_parts.append(f"{result_count:,} competing titles")
    if avg_bsr is not None:
        # higher avg BSR = competitors sell less = less competitive
        bsr_norm = max(0, 1 - math.log10(max(1, avg_bsr)) / 6)
        # bsr_norm low means competitive (low BSR = high sales); invert: high BSR => low competition => high opportunity
        # So bsr opportunity = 1 - competitiveness; competitiveness = 1 - bsr_norm? Let's compute directly:
        # BSR 1k => avg sales strong => competitive => lower opportunity
        # BSR 100k => weak => higher opportunity
        # bsr_norm already is 1 (good opportunity) when BSR low? Check: bsr 100 => log10 2 /6=0.33 => 0.67 opportunity. BSR 100k => log10 5/6=0.83 => 0.17 opportunity — inverted!
        # So we actually want: high BSR => high opportunity. So invert bsr_norm:
        # Correct: opportunity_from_bsr = 1 - demand_from_bsr? Simpler: use log gap.
        opp_bsr = min(1, math.log10(max(1, avg_bsr)) / 6)  # 0.33 at 100, 0.83 at 100k => higher when weaker
        comp_score = (comp_score * 0.6 + opp_bsr * 0.4)
        explain_parts.append(f"avg BSR {avg_bsr:,.0f} ({'high competition' if avg_bsr < 20000 else 'moderate' if avg_bsr < 100000 else 'low competition'})")
    if avg_reviews is not None:
        # fewer reviews = easier to compete
        review_opp = 1.0 / (1.0 + avg_reviews / 400)  # 0.5 at 400 reviews
        comp_score = (comp_score * 0.7 + review_opp * 0.3)
        explain_parts.append(f"avg {avg_reviews:,.0f} reviews")
    if competitor_count is not None:
        explain_parts.append(f"{competitor_count} competitors analyzed")

    score = round(comp_score * PILLAR_WEIGHTS["competition"], 1)
    explain = "; ".join(explain_parts) + f". Lower competition → higher score."
    return score, explain

def _score_differentiation(keyword, categories=None, content_gap_score=None):
    """
    Differentiation 0-15 — can you stand out?
    Inputs: keyword uniqueness (word count, specificity), content gap if available.
    """
    if not keyword:
        return 0, "No keyword"
    words = keyword.strip().split()
    word_count = len(words)
    explain_parts = []
    # Longer = more specific = easier to differentiate
    if word_count >= 5:
        base = 0.85
        explain_parts.append(f"{word_count} words — highly specific, strong differentiation angle")
    elif word_count >= 4:
        base = 0.70
        explain_parts.append(f"{word_count} words — good specificity")
    elif word_count >= 3:
        base = 0.50
        explain_parts.append(f"{word_count} words — moderate specificity")
    else:
        base = 0.25
        explain_parts.append(f"{word_count} words — broad term, harder to differentiate")
    
    if content_gap_score is not None:
        # 0-1 gap score already
        base = base * 0.6 + content_gap_score * 0.4
        explain_parts.append(f"content gap {content_gap_score:.0%}")
    else:
        explain_parts.append("Content gap analysis available when competitor ASINs provided")

    score = round(base * PILLAR_WEIGHTS["differentiation"], 1)
    return score, "; ".join(explain_parts) + "."

def _score_buyer_intent(keyword, position=None):
    """Buyer intent 0-15 — commercial vs informational."""
    if not keyword:
        return 0, "No keyword"
    kw_low = keyword.lower()
    commercial_tokens = ["best", "buy", "top", "review", "for", "workbook", "journal", "planner", "coloring", "activity", "log book", "notebook", "cookbook", "diet", "guide", "how to", "beginners", "kids", "adults"]
    transactional_tokens = ["buy", "best", "cheap", "deal", "discount"]
    high_intent = ["workbook", "journal", "planner", "coloring book", "log book", "cookbook", "guide", "for beginners", "for kids", "activity book"]

    score = 0.35
    reasons = []
    matched_high = [t for t in high_intent if t in kw_low]
    if matched_high:
        score = 0.85
        reasons.append(f"high buyer intent format: {', '.join(matched_high)}")
    elif any(t in kw_low for t in transactional_tokens):
        score = 0.75
        reasons.append("transactional modifier (buy/best/cheap)")
    elif any(t in kw_low for t in commercial_tokens):
        score = 0.60
        reasons.append("commercial format/occasion term")
    else:
        reasons.append("general informational — weaker purchase intent")

    # position bonus: pos1 keywords are what buyers actually type
    if position and position <= 3:
        score = min(1.0, score + 0.10)
        reasons.append(f"autocomplete top-3 (position {position}) — strong buyer signal")

    final = round(score * PILLAR_WEIGHTS["buyer_intent"], 1)
    return final, "; ".join(reasons) + "."

def _score_profitability(price, marketplace="us", pages=200, avg_competitor_price=None):
    """Profitability 0-15 — based on selling price & royalty model."""
    if price is None or price <= 0:
        return 7.5, "No price provided — neutral 50% assigned. Enter your planned selling price for accurate score."
    explain_parts = []
    # ebook royalty efficiency
    if 2.99 <= price <= 9.99:
        ebook_eff = 0.85
        explain_parts.append(f"${price:.2f} qualifies for 70% ebook royalty — excellent margin")
    elif price < 2.99:
        ebook_eff = 0.35
        explain_parts.append(f"${price:.2f} below $2.99 → 35% royalty — low ebook margin")
    else:
        ebook_eff = 0.40
        explain_parts.append(f"${price:.2f} above $9.99 → 35% royalty — capped upside")

    # price competitiveness vs avg
    if avg_competitor_price:
        if abs(price - avg_competitor_price) < 1:
            explain_parts.append(f"in line with avg competitor ${avg_competitor_price:.2f}")
        elif price < avg_competitor_price - 1:
            explain_parts.append(f"below avg competitor ${avg_competitor_price:.2f} — price advantage")
            ebook_eff = min(1.0, ebook_eff + 0.10)
        else:
            explain_parts.append(f"above avg competitor ${avg_competitor_price:.2f} — need differentiation")

    score = round(ebook_eff * PILLAR_WEIGHTS["profitability"], 1)
    return score, "; ".join(explain_parts) + "."

def score_keyword(keyword, position=None, result_count=None, avg_bsr=None, avg_reviews=None, competitor_count=None, price=None, marketplace="us", categories=None, content_gap_score=None):
    """Score a single keyword, return pillar breakdown + total 0-100."""
    demand_s, demand_e = _score_demand(position, result_count)
    comp_s, comp_e = _score_competition(result_count, avg_bsr, avg_reviews, competitor_count)
    diff_s, diff_e = _score_differentiation(keyword, categories, content_gap_score)
    intent_s, intent_e = _score_buyer_intent(keyword, position)
    profit_s, profit_e = _score_profitability(price, marketplace)

    total = round(demand_s + comp_s + diff_s + intent_s + profit_s, 1)
    # label
    if total >= 75:
        label = "Excellent Opportunity"
        color = "#10b981"
    elif total >= 60:
        label = "Good Opportunity"
        color = "#22c55e"
    elif total >= 45:
        label = "Moderate"
        color = "#eab308"
    elif total >= 30:
        label = "Challenging"
        color = "#f97316"
    else:
        label = "High Risk"
        color = "#ef4444"

    return {
        "keyword": keyword,
        "total": total,
        "label": label,
        "color": color,
        "pillars": {
            "demand": {"score": demand_s, "max": PILLAR_WEIGHTS["demand"], "explain": demand_e},
            "competition": {"score": comp_s, "max": PILLAR_WEIGHTS["competition"], "explain": comp_e},
            "differentiation": {"score": diff_s, "max": PILLAR_WEIGHTS["differentiation"], "explain": diff_e},
            "buyer_intent": {"score": intent_s, "max": PILLAR_WEIGHTS["buyer_intent"], "explain": intent_e},
            "profitability": {"score": profit_s, "max": PILLAR_WEIGHTS["profitability"], "explain": profit_e},
        }
    }

def score_all(keywords, price=None, marketplace="us", competitor_stats=None):
    """Score a list of keyword dicts: each {keyword, position, result_count, ...}"""
    results = []
    for kw in keywords:
        s = score_keyword(
            keyword=kw.get("keyword"),
            position=kw.get("position"),
            result_count=kw.get("result_count"),
            avg_bsr=competitor_stats.get("avg_bsr") if competitor_stats else None,
            avg_reviews=competitor_stats.get("avg_reviews") if competitor_stats else None,
            competitor_count=competitor_stats.get("count") if competitor_stats else None,
            price=price,
            marketplace=marketplace,
        )
        results.append(s)
    results.sort(key=lambda x: x["total"], reverse=True)
    # overall niche score = weighted avg top 10
    if results:
        top = results[:10]
        overall = round(sum(r["total"] for r in top) / len(top), 1)
    else:
        overall = 0
    if overall >= 75:
        overall_label = "Excellent Niche"
    elif overall >= 60:
        overall_label = "Good Niche"
    elif overall >= 45:
        overall_label = "Moderate — needs angle"
    elif overall >= 30:
        overall_label = "Challenging"
    else:
        overall_label = "High Risk"
    return {"keywords": results, "overall": overall, "overall_label": overall_label, "formula": "Demand 30 + Competition 25 + Differentiation 15 + Buyer Intent 15 + Profitability 15 = 100. Each pillar is 0-max; sum = total 0-100. Demand from autocomplete position+results; Competition from result count/BSR/reviews (more = lower); Differentiation from specificity+content gap; Intent from commercial tokens; Profitability from KDP royalty window."}
