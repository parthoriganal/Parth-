"""BSR → sales/royalty estimation — ported from kdp-scout collectors/bsr_model.py with extended markets."""
import logging
logger = logging.getLogger(__name__)

MODELS = {
    "us_kindle": {"k": 150000, "a": 0.82},
    "us_paperback": {"k": 80000, "a": 0.78},
    "uk_kindle": {"k": 80000, "a": 0.80},
    "in_kindle": {"k": 40000, "a": 0.78},
}

KDP_ROYALTY_HIGH = 0.70
KDP_ROYALTY_LOW = 0.35

def estimate_daily_sales(bsr, marketplace="us_kindle"):
    if bsr is None or bsr < 1:
        return 0.0
    m = MODELS.get(marketplace, MODELS["us_kindle"])
    return round(m["k"] * (bsr ** -m["a"]), 2)

def estimate_monthly_revenue(bsr, price, marketplace="us_kindle"):
    if bsr is None or bsr < 1 or price is None or price <= 0:
        return 0.0
    daily = estimate_daily_sales(bsr, marketplace)
    rate = KDP_ROYALTY_HIGH if 2.99 <= price <= 9.99 else KDP_ROYALTY_LOW
    return round(daily * 30 * price * rate, 2)

def sales_velocity_label(daily):
    if daily >= 50: return "Excellent"
    if daily >= 10: return "Strong"
    if daily >= 3: return "Moderate"
    if daily >= 0.5: return "Low"
    return "Minimal"

# Paperback/hardcover royalty after printing cost
def paperback_royalty(price, pages=200, color=False, marketplace="us"):
    from config import PAPERBACK_COST, HARDCOVER_COST
    # simplified: use USD table; other currencies approximated
    if pages is None or pages < 1:
        pages = 200
    # KDP paperback royalty = (price * 0.60) - printing_cost
    cost = PAPERBACK_COST["fixed_color"] + pages * PAPERBACK_COST["per_page_color"] if color else PAPERBACK_COST["fixed_bw"] + pages * PAPERBACK_COST["per_page_bw"]
    royalty = price * 0.60 - cost
    return round(max(royalty, 0), 2), round(cost, 2)

def hardcover_royalty(price, pages=200, color=False):
    from config import HARDCOVER_COST
    if pages is None or pages < 1:
        pages = 200
    cost = HARDCOVER_COST["fixed_color"] + pages * HARDCOVER_COST["per_page_color"] if color else HARDCOVER_COST["fixed_bw"] + pages * HARDCOVER_COST["per_page_bw"]
    royalty = price * 0.60 - cost
    return round(max(royalty, 0), 2), round(cost, 2)

def ebook_royalty(price, delivery_cost=0.15):
    # KDP ebook: 70% inside $2.99-$9.99 minus delivery; else 35%
    if price is None or price <= 0:
        return 0.0, 0, " — "
    if 2.99 <= price <= 9.99:
        rate = 0.70
        royalty = price * rate - delivery_cost
        label = "70%"
    else:
        rate = 0.35
        royalty = price * rate
        label = "35%"
    return round(max(royalty, 0), 2), rate, label
