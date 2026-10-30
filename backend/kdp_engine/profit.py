"""Profit calculator — ebook / paperback / hardcover royalty per KDP tables."""
from config import PAPERBACK_COST, HARDCOVER_COST

def calc_ebook(price, delivery_cost=0.15):
    if price is None or price <= 0:
        return {"royalty": 0, "rate": 0, "rate_label": "—", "note": "Invalid price"}
    if 2.99 <= price <= 9.99:
        royalty = max(0, price * 0.70 - delivery_cost)
        return {"royalty": round(royalty, 2), "rate": 0.70, "rate_label": "70%", "delivery_cost": delivery_cost, "note": "70% royalty applies ($2.99-$9.99). Delivery cost estimated $0.15."}
    else:
        royalty = price * 0.35
        return {"royalty": round(royalty, 2), "rate": 0.35, "rate_label": "35%", "delivery_cost": 0, "note": "35% royalty — price outside $2.99-$9.99 window."}

def calc_paperback(price, pages=200, color=False, marketplace="us"):
    if price is None or price <= 0:
        return {"royalty": 0, "printing_cost": 0, "rate_label": "60%", "note": "Invalid price"}
    if not pages or pages < 1:
        pages = 200
    c = PAPERBACK_COST
    printing = c["fixed_color"] + pages * c["per_page_color"] if color else c["fixed_bw"] + pages * c["per_page_bw"]
    royalty = price * 0.60 - printing
    # Minimum list price enforcement (approx)
    min_price = printing / 0.60
    return {
        "royalty": round(max(royalty, 0), 2),
        "printing_cost": round(printing, 2),
        "rate_label": "60%",
        "min_price": round(min_price, 2),
        "note": f"Printing cost ${printing:.2f} ({pages}p {'color' if color else 'B&W'}). Royalty = 60% list - printing."
    }

def calc_hardcover(price, pages=200, color=False):
    if price is None or price <= 0:
        return {"royalty": 0, "printing_cost": 0, "rate_label": "60%", "note": "Invalid price"}
    if not pages or pages < 1:
        pages = 200
    c = HARDCOVER_COST
    printing = c["fixed_color"] + pages * c["per_page_color"] if color else c["fixed_bw"] + pages * c["per_page_bw"]
    royalty = price * 0.60 - printing
    min_price = printing / 0.60
    return {
        "royalty": round(max(royalty, 0), 2),
        "printing_cost": round(printing, 2),
        "rate_label": "60%",
        "min_price": round(min_price, 2),
        "note": f"Hardcover printing ${printing:.2f} ({pages}p {'color' if color else 'B&W'}). Royalty = 60% list - printing."
    }

def calc_all(price, pages=200, color=False, delivery_cost=0.15):
    return {
        "ebook": calc_ebook(price, delivery_cost),
        "paperback": calc_paperback(price, pages, color),
        "hardcover": calc_hardcover(price, pages, color),
    }

def profit_table(price_points, pages=200, color=False):
    rows = []
    for p in price_points:
        e = calc_ebook(p)
        pb = calc_paperback(p, pages, color)
        hc = calc_hardcover(p, pages, color)
        rows.append({"price": p, "ebook_royalty": e["royalty"], "paperback_royalty": pb["royalty"], "hardcover_royalty": hc["royalty"], "ebook_rate": e["rate_label"]})
    return rows
