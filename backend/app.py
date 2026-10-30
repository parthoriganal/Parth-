"""KDP Keyword & Niche Research Platform — Flask API
Ported logic from rxpelle/kdp-scout + pangolinfo niche-finder + scorer.
Respects Amazon ToS: rate-limited, UA rotation, backoff, disclaimer.
"""
import os
import sys
import json
import time
import logging
import datetime
import hashlib
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# ensure imports work
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import MARKETPLACES, get_marketplace
from kdp_engine.autocomplete import mine_multiple, demand_heuristic, categorize_intent, mine_autocomplete
from kdp_engine.product_scraper import scrape_multiple, scrape_search_results
from kdp_engine.bsr_model import estimate_daily_sales, estimate_monthly_revenue, sales_velocity_label
from kdp_engine.profit import calc_all, profit_table
from kdp_engine.scorer import score_all, score_keyword
from kdp_engine.trends import get_trends
from kdp_engine.content_gap import analyze_content_gap

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder="../dist", static_url_path="")
CORS(app, resources={r"/api/*": {"origins": "*"}})

VERSION = "1.0.0"
START_TIME = datetime.datetime.utcnow().isoformat() + "Z"

def marketplace_meta(code):
    mp = get_marketplace(code)
    return {"code": code, "domain": mp["domain"], "currency": mp["currency"], "symbol": mp["symbol"], "locale": mp["locale"]}

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "version": VERSION,
        "started_at": START_TIME,
        "marketplaces": list(MARKETPLACES.keys()),
        "dataforseo_configured": bool(os.environ.get("DATAFORSEO_LOGIN") and os.environ.get("DATAFORSEO_API_KEY")),
        "pangolinfo_configured": bool(os.environ.get("PANGOLINFO_API_KEY")),
        "features": {
            "keyword_miner": "actual — Amazon autocomplete",
            "search_volume": "estimated heuristic unless DataForSEO key set",
            "competition": "actual — Amazon search result count + BSR scrape",
            "reverse_asin": "via DataForSEO if configured, else unavailable",
            "competitor_analyzer": "actual scrape with fallback",
            "category_analyzer": "from product scrape",
            "trend_analyzer": "Google Trends via pytrends if installed else simulated (labeled)",
            "content_gap": "TF-IDF heuristic on mined keywords vs competitor text",
            "profit_calculator": "KDP royalty tables (actual formulas)",
            "opportunity_scorer": "transparent 100-pt composite",
        }
    })

@app.route("/api/marketplaces", methods=["GET"])
def list_marketplaces():
    return jsonify({k: {"domain": v["domain"], "currency": v["currency"], "symbol": v["symbol"]} for k, v in MARKETPLACES.items()})

# ── Autocomplete proxy (CORS-safe, rate-limited) ──
@app.route("/api/autocomplete", methods=["GET"])
def autocomplete_proxy():
    prefix = request.args.get("prefix", "").strip()
    marketplace = request.args.get("marketplace", "us").lower()
    alias = request.args.get("alias", "digital-text")
    if not prefix:
        return jsonify({"error": "prefix required"}), 400
    try:
        mp = get_marketplace(marketplace)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    import requests, random
    UAS = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"]
    domain = mp["completion_domain"]
    url = f"https://{domain}/api/2017/suggestions"
    try:
        resp = requests.get(url, params={"mid": mp["mid"], "alias": alias, "prefix": prefix}, headers={"User-Agent": random.choice(UAS)}, timeout=10)
        if resp.status_code in (429, 503):
            return jsonify({"error": f"Amazon throttled ({resp.status_code}) — try again in a minute", "status": "throttled", "source": url, "updated_at": datetime.datetime.utcnow().isoformat()+"Z"}), 429
        resp.raise_for_status()
        data = resp.json()
        suggestions = [{"value": s.get("value",""), "type": s.get("type","")} for s in data.get("suggestions",[])]
        return jsonify({"prefix": prefix, "marketplace": marketplace, "alias": alias, "suggestions": suggestions, "source": f"Amazon autocomplete {domain}", "status": "ACTUAL", "updated_at": datetime.datetime.utcnow().isoformat()+"Z"})
    except Exception as e:
        logger.exception(f"autocomplete proxy failed: {e}")
        return jsonify({"error": str(e), "status": "failed"}), 500

# ── Keyword Miner ──
@app.route("/api/mine", methods=["POST"])
def mine():
    body = request.get_json(force=True) or {}
    seeds = body.get("seeds") or body.get("seed_keywords") or []
    if isinstance(seeds, str):
        seeds = [s.strip() for s in seeds.split(",") if s.strip()]
    marketplace = (body.get("marketplace") or "us").lower()
    department = (body.get("department") or body.get("category") or "kindle").lower()
    depth = int(body.get("depth") or 1)
    if not seeds:
        return jsonify({"error": "Provide 1-10 seed keywords"}), 400
    if len(seeds) > 10:
        seeds = seeds[:10]
    # validate marketplace
    try:
        get_marketplace(marketplace)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    started = time.time()
    result = mine_multiple(seeds, department=department, depth=depth, marketplace=marketplace, allow_mock=True)
    elapsed = round(time.time() - started, 1)
    mock_used = result.get("mock_used", False)

    # enrich with heuristics
    enriched = []
    for kw in result["keywords"]:
        wc = len(kw["keyword"].split())
        enriched.append({
            "keyword": kw["keyword"],
            "position": kw["position"],
            "seed": kw["seed"],
            "word_count": wc,
            "intent_bucket": categorize_intent(kw["keyword"]),
            "demand_signal": demand_heuristic(kw["position"], wc, marketplace),
            "demand_note": "ESTIMATED — Amazon autocomplete position heuristic, NOT monthly search volume",
        })
    # sort by demand_signal desc then position
    enriched.sort(key=lambda x: (-x["demand_signal"], x["position"]))

    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    return jsonify({
        "seeds": seeds,
        "marketplace": marketplace,
        "department": department,
        "depth": depth,
        "keywords": enriched,
        "per_seed_counts": {k: len(v) for k, v in result["per_seed"].items()},
        "total": len(enriched),
        "errors": result["errors"],
        "timing_s": elapsed,
        "source": f"Amazon autocomplete ({get_marketplace(marketplace)['completion_domain']})" + (" — MOCK/DEMO (Amazon unreachable in sandbox; showing curated sample data)" if mock_used else ""),
        "status": "MOCK" if mock_used else ("ACTUAL" if not result["errors"] else "PARTIAL"),
        "mock": mock_used,
        "updated_at": timestamp,
        "data_warning": ("⚠️ MOCK MODE — Amazon outbound is blocked in this sandbox (only github.com/pypi allowed). Showing curated demo keywords labeled MOCK so you can test the full pipeline. Deploy to any VPS (or allow Amazon domains) for ACTUAL autocomplete." if mock_used else "Search volume shown as ESTIMATED demand signal (0-100) derived from autocomplete position + keyword specificity. It is NOT monthly search volume. For actual volumes, configure DataForSEO (see Setup Guide)."),
    })

# ── Competitor Analyzer ──
@app.route("/api/competitors", methods=["POST"])
def competitors():
    body = request.get_json(force=True) or {}
    asins = body.get("asins") or body.get("competitor_asins") or []
    if isinstance(asins, str):
        asins = [a.strip() for a in asins.replace(",", " ").split() if a.strip()]
    marketplace = (body.get("marketplace") or "us").lower()
    if not asins:
        return jsonify({"error": "Provide 1-10 ASINs"}), 400
    asins = asins[:10]
    started = time.time()
    results = scrape_multiple(asins, marketplace=marketplace, delay=1.0)
    elapsed = round(time.time() - started, 1)
    ok = [r for r in results if r.get("status") == "ok"]
    # aggregate stats
    bsr_vals = [r["bsr"] for r in ok if r.get("bsr")]
    price_vals = [r["price"] for r in ok if r.get("price") is not None]
    review_vals = [r["review_count"] for r in ok if r.get("review_count") is not None]
    rating_vals = [r["rating"] for r in ok if r.get("rating") is not None]
    stats = {
        "count": len(ok),
        "failed": len([r for r in results if r.get("status") != "ok"]),
        "avg_bsr": round(sum(bsr_vals)/len(bsr_vals)) if bsr_vals else None,
        "avg_price": round(sum(price_vals)/len(price_vals), 2) if price_vals else None,
        "avg_reviews": round(sum(review_vals)/len(review_vals)) if review_vals else None,
        "avg_rating": round(sum(rating_vals)/len(rating_vals), 2) if rating_vals else None,
        "min_price": min(price_vals) if price_vals else None,
        "max_price": max(price_vals) if price_vals else None,
    }
    return jsonify({
        "marketplace": marketplace,
        "books": results,
        "stats": stats,
        "timing_s": elapsed,
        "source": f"Amazon product pages ({get_marketplace(marketplace)['domain']})",
        "status": "ACTUAL" if ok else "FAILED",
        "updated_at": datetime.datetime.utcnow().isoformat()+"Z",
        "warning": "Scraping Amazon product pages is subject to bot detection. If blocked, the API returns status=blocked — retry later or configure a proxy via PROXY_URL env." if any(r.get("status")=="blocked" for r in results) else None,
    })

# ── Competition probe (search result count) ──
@app.route("/api/competition", methods=["POST"])
def competition():
    body = request.get_json(force=True) or {}
    keyword = (body.get("keyword") or "").strip()
    marketplace = (body.get("marketplace") or "us").lower()
    department = (body.get("department") or "kindle").lower()
    if not keyword:
        return jsonify({"error": "keyword required"}), 400
    res = scrape_search_results(keyword, marketplace=marketplace, department=department, top_n=20)
    res["updated_at"] = datetime.datetime.utcnow().isoformat()+"Z"
    if res.get("status") == "ok":
        res["source"] = f"Amazon search ({get_marketplace(marketplace)['domain']}/s?k={keyword})"
        res["status_label"] = "ACTUAL"
    return jsonify(res)

# ── Bulk competition for keyword list (for scatter plot) ──
@app.route("/api/competition/bulk", methods=["POST"])
def competition_bulk():
    body = request.get_json(force=True) or {}
    keywords = body.get("keywords") or []
    marketplace = (body.get("marketplace") or "us").lower()
    if not keywords:
        return jsonify({"error": "keywords array required"}), 400
    # limit to 20 to avoid hammering
    keywords = keywords[:15]
    results = []
    for kw in keywords:
        kw_str = kw.get("keyword") if isinstance(kw, dict) else kw
        r = scrape_search_results(kw_str, marketplace=marketplace, top_n=10)
        results.append({
            "keyword": kw_str,
            "result_count": r.get("result_count"),
            "status": r.get("status"),
            "error": r.get("error"),
        })
        time.sleep(0.9)
    return jsonify({"results": results, "updated_at": datetime.datetime.utcnow().isoformat()+"Z", "source": f"Amazon search ({get_marketplace(marketplace)['domain']}/s)", "status": "ACTUAL"})

# ── Profit Calculator ──
@app.route("/api/profit", methods=["POST"])
def profit():
    body = request.get_json(force=True) or {}
    price = body.get("price")
    try:
        price = float(price) if price is not None else None
    except:
        return jsonify({"error": "Invalid price"}), 400
    pages = body.get("pages") or body.get("page_count") or 200
    try:
        pages = int(pages)
    except:
        pages = 200
    color = bool(body.get("color") or body.get("is_color"))
    delivery = float(body.get("delivery_cost") or 0.15)
    marketplace = (body.get("marketplace") or "us").lower()

    breakdown = calc_all(price, pages=pages, color=color, delivery_cost=delivery)
    # price ladder 0.99 to 14.99
    ladder = [0.99, 1.99, 2.99, 3.99, 4.99, 5.99, 6.99, 7.99, 9.99, 12.99, 14.99]
    table = profit_table(ladder, pages=pages, color=color)
    return jsonify({
        "price": price,
        "pages": pages,
        "color": color,
        "breakdown": breakdown,
        "ladder": table,
        "source": "KDP royalty tables (70% $2.99-$9.99 else 35% ebook; 60% minus printing for paperback/hardcover)",
        "status": "CALCULATED",
        "updated_at": datetime.datetime.utcnow().isoformat()+"Z",
    })

# ── Trends ──
@app.route("/api/trends", methods=["POST"])
def trends():
    body = request.get_json(force=True) or {}
    keyword = (body.get("keyword") or "").strip()
    if not keyword:
        return jsonify({"error": "keyword required"}), 400
    marketplace = (body.get("marketplace") or "us").lower()
    data = get_trends(keyword, marketplace=marketplace)
    return jsonify(data)

@app.route("/api/trends/bulk", methods=["POST"])
def trends_bulk():
    body = request.get_json(force=True) or {}
    keywords = body.get("keywords") or []
    marketplace = (body.get("marketplace") or "us").lower()
    if not keywords:
        return jsonify({"error": "keywords required"}), 400
    keywords = keywords[:5]
    out = []
    for kw in keywords:
        kw_str = kw.get("keyword") if isinstance(kw, dict) else kw
        out.append(get_trends(kw_str, marketplace=marketplace))
        time.sleep(0.2)
    return jsonify({"trends": out})

# ── Content Gap ──
@app.route("/api/content-gap", methods=["POST"])
def content_gap():
    body = request.get_json(force=True) or {}
    keywords = body.get("keywords") or []
    competitors = body.get("competitors") or body.get("books") or []
    res = analyze_content_gap(keywords, competitors)
    res["updated_at"] = datetime.datetime.utcnow().isoformat()+"Z"
    return jsonify(res)

# ── Category Analyzer ──
@app.route("/api/categories", methods=["POST"])
def categories():
    body = request.get_json(force=True) or {}
    marketplace = (body.get("marketplace") or "us").lower()
    asins = body.get("asins") or []
    keyword = (body.get("keyword") or "").strip()
    # if ASINs provided, use their BSR categories
    cats = []
    sources = []
    if asins:
        if isinstance(asins, str):
            asins = [a.strip() for a in asins.split(",") if a.strip()]
        books = scrape_multiple(asins[:5], marketplace=marketplace, delay=0.8)
        for b in books:
            if b.get("status") == "ok":
                for cat, rank in (b.get("bsr_categories") or {}).items():
                    cats.append({"category": cat, "rank": rank, "asin": b["asin"], "title": (b.get("title") or "")[:80]})
                sources.append(b["asin"])
        # also collect browsing categories
        for b in books:
            if b.get("categories"):
                for c in b["categories"]:
                    cats.append({"category": c, "rank": None, "asin": b["asin"], "title": (b.get("title") or "")[:80]})
    # enrich with Amazon category explorer suggestions
    from config import CATEGORY_EXPLORER
    suggested = []
    if keyword:
        kw_low = keyword.lower()
        for cat, subs in CATEGORY_EXPLORER.items():
            if any(tok in kw_low for tok in cat.lower().split()) or any(tok in kw_low for sub in subs for tok in sub.lower().split()):
                suggested.append({"category": cat, "subcategories": subs, "relevance": "matched keyword"})
        if not suggested:
            # fallback: top 8 general
            suggested = [{"category": k, "subcategories": v[:3]} for k, v in list(CATEGORY_EXPLORER.items())[:8]]

    # dedupe
    seen = set()
    uniq = []
    for c in cats:
        key = c["category"]
        if key not in seen:
            seen.add(key)
            uniq.append(c)
    # sort by rank
    uniq.sort(key=lambda x: x["rank"] if x["rank"] else 9999999)

    return jsonify({
        "keyword": keyword,
        "marketplace": marketplace,
        "from_competitors": uniq[:30],
        "suggested": suggested,
        "source": "Amazon BSR category trees + browsing breadcrumbs (when ASINs provided); suggestion engine when keyword provided",
        "status": "ACTUAL" if uniq else "SUGGESTED",
        "updated_at": datetime.datetime.utcnow().isoformat()+"Z",
    })

# ── Reverse ASIN (DataForSEO) ──
@app.route("/api/reverse-asin", methods=["POST"])
def reverse_asin():
    body = request.get_json(force=True) or {}
    asin = (body.get("asin") or "").strip().upper()
    marketplace = (body.get("marketplace") or "us").lower()
    if not asin or len(asin) != 10:
        return jsonify({"error": "Valid 10-char ASIN required"}), 400

    login = os.environ.get("DATAFORSEO_LOGIN")
    api_key = os.environ.get("DATAFORSEO_API_KEY")
    if not login or not api_key:
        # fallback: try to mine from competitor title if available — but explain limitation
        return jsonify({
            "asin": asin,
            "keywords": [],
            "status": "UNAVAILABLE",
            "source": "DataForSEO (not configured)",
            "updated_at": datetime.datetime.utcnow().isoformat()+"Z",
            "message": "Reverse ASIN requires DataForSEO credentials. Set DATAFORSEO_LOGIN and DATAFORSEO_API_KEY in backend/.env to enable. Without it, the app cannot discover ranking keywords for an ASIN. As a workaround, use Keyword Miner with the competitor's title words as seeds.",
            "workaround": "Use the competitor's title (e.g., 'cozy murder mystery') as seed keywords in Research → seeds to mine related demand.",
        })

    # DataForSEO call: Amazon ranked keywords live
    import base64, requests as req
    creds = base64.b64encode(f"{login}:{api_key}".encode()).decode()
    # marketplace mapping for DataForSEO location_code
    loc_map = {"us": 2840, "uk": 2826, "de": 276, "ca": 124, "au": 36, "in": 356}
    loc = loc_map.get(marketplace, 2840)
    payload = [{"asin": asin, "location_code": loc, "language_code": "en"}]
    url = "https://api.dataforseo.com/v3/dataforseo_labs/amazon/ranked_keywords/live"
    try:
        resp = req.post(url, json=payload, headers={"Authorization": f"Basic {creds}", "Content-Type": "application/json"}, timeout=20)
        if resp.status_code == 401:
            return jsonify({"asin": asin, "keywords": [], "status": "FAILED", "error": "DataForSEO authentication failed (401) — check credentials", "updated_at": datetime.datetime.utcnow().isoformat()+"Z"}), 500
        data = resp.json()
        # parse tasks result
        items = []
        try:
            tasks = data.get("tasks", [])
            if tasks and tasks[0].get("result"):
                items = tasks[0]["result"][0].get("items", []) if isinstance(tasks[0]["result"], list) else []
        except Exception as e:
            logger.exception(f"DataForSEO parse failed: {e}")
        kws = []
        for it in items[:50]:
            kws.append({
                "keyword": it.get("keyword") or it.get("keyword_data", {}).get("keyword"),
                "search_volume": it.get("keyword_data", {}).get("keyword_info", {}).get("search_volume"),
                "rank_group": it.get("ranked_serp_element", {}).get("rank_group"),
                "rank_absolute": it.get("ranked_serp_element", {}).get("rank_absolute"),
            })
        return jsonify({"asin": asin, "keywords": kws, "status": "ACTUAL", "source": "DataForSEO Amazon ranked_keywords/live", "updated_at": datetime.datetime.utcnow().isoformat()+"Z", "cost_note": "~$0.01 per ASIN lookup"})
    except Exception as e:
        logger.exception(f"DataForSEO reverse ASIN failed: {e}")
        return jsonify({"asin": asin, "keywords": [], "status": "FAILED", "error": str(e), "source": "DataForSEO", "updated_at": datetime.datetime.utcnow().isoformat()+"Z"}), 500

# ── Opportunity Scorer ──
@app.route("/api/score", methods=["POST"])
def score():
    body = request.get_json(force=True) or {}
    keywords = body.get("keywords") or []
    price = body.get("price")
    try:
        price = float(price) if price is not None and price != "" else None
    except:
        price = None
    marketplace = (body.get("marketplace") or "us").lower()
    competitor_stats = body.get("competitor_stats")
    if not keywords:
        return jsonify({"error": "keywords array required"}), 400
    # enrich result_count if competition data supplied
    # competitor_stats shape: {avg_bsr, avg_reviews, count, avg_price}
    res = score_all(keywords, price=price, marketplace=marketplace, competitor_stats=competitor_stats)
    res["updated_at"] = datetime.datetime.utcnow().isoformat()+"Z"
    res["status"] = "CALCULATED"
    res["source"] = "Heuristic composite (see formula)"
    return jsonify(res)


# ── Full Research pipeline (orchestrated) ──
@app.route("/api/research", methods=["POST"])
def research():
    body = request.get_json(force=True) or {}
    title = (body.get("title") or "").strip()
    subtitle = (body.get("subtitle") or "").strip()
    seeds = body.get("seeds") or body.get("seed_keywords") or []
    if isinstance(seeds, str):
        seeds = [s.strip() for s in seeds.split(",") if s.strip()]
    marketplace = (body.get("marketplace") or "us").lower()
    book_format = (body.get("format") or body.get("book_format") or "ebook").lower()
    price = body.get("price")
    try:
        price = float(price) if price is not None and str(price).strip() != "" else None
    except:
        price = None
    pages = body.get("pages") or 200
    try:
        pages = int(pages)
    except:
        pages = 200
    asins = body.get("asins") or body.get("competitor_asins") or []
    if isinstance(asins, str):
        asins = [a.strip().upper() for a in asins.replace(",", " ").split() if a.strip()]
    asins = [a.upper().strip() for a in asins if a.strip()][:8]
    depth = int(body.get("depth") or 1)
    department = (body.get("department") or ("kindle" if book_format in ("ebook","kindle") else "books")).lower()

    if not seeds:
        if title:
            seeds = [title.lower()]
        else:
            return jsonify({"error": "Provide at least 1 seed keyword (or a title to derive from)"}), 400
    seeds = seeds[:10]
    try:
        get_marketplace(marketplace)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    t0 = time.time()
    errors = []
    warnings = []

    # 1) Mine keywords
    try:
        mined = mine_multiple(seeds, department=department, depth=depth, marketplace=marketplace, allow_mock=True)
    except Exception as e:
        logger.exception(f"mine failed: {e}")
        return jsonify({"error": f"Keyword mining failed: {e}"}), 500

    mock_used = mined.get("mock_used", False)
    if mock_used:
        warnings.append("⚠️ MOCK keyword data — Amazon autocomplete blocked in sandbox (egress allowlist). Showing curated demo keywords so full pipeline is testable. Deploy to VPS / allow amazon.com for ACTUAL.")

    enriched = []
    for kw in mined["keywords"]:
        wc = len(kw["keyword"].split())
        enriched.append({
            "keyword": kw["keyword"],
            "position": kw["position"],
            "seed": kw["seed"],
            "word_count": wc,
            "intent_bucket": categorize_intent(kw["keyword"]),
            "demand_signal": demand_heuristic(kw["position"], wc, marketplace),
        })
    enriched.sort(key=lambda x: (-x["demand_signal"], x["position"]))

    # enrichment with competition for top 12
    for kw in enriched[:12]:
        try:
            comp = scrape_search_results(kw["keyword"], marketplace=marketplace, department=department, top_n=8)
            if comp.get("status") == "ok":
                kw["result_count"] = comp.get("result_count")
                kw["result_count_text"] = comp.get("result_count_text")
                kw["competition_status"] = "ACTUAL"
            else:
                kw["competition_status"] = comp.get("status", "failed")
                kw["competition_error"] = comp.get("error")
                # mock competition numbers when search blocked, so charts have data
                if comp.get("status") in ("blocked","failed"):
                    import hashlib
                    h=int(hashlib.md5(kw["keyword"].encode()).hexdigest()[:6],16)
                    kw["result_count"] = 5000 + (h % 25000)
                    kw["competition_status"] = "MOCK"
                    kw["competition_note"] = "Amazon search blocked in sandbox — showing synthetic result count (labeled MOCK)"
            if comp.get("status") in ("blocked","failed") and kw.get("competition_status")=="MOCK":
                pass  # already mocked
        except Exception as e:
            kw["competition_status"] = "failed"
            kw["competition_error"] = str(e)
        time.sleep(0.3)

    for kw in enriched:
        if "result_count" not in kw:
            kw["result_count"] = None
            kw["competition_status"] = "not_probed"

    # 2) Competitor books if ASINs provided
    competitor_books = []
    competitor_stats = None
    competitor_mock = False
    if asins:
        try:
            competitor_books = scrape_multiple(asins, marketplace=marketplace, delay=0.7)
            if competitor_books and all(b.get("status") in ("failed","blocked") for b in competitor_books):
                from kdp_engine.mock_data import get_mock_product
                from kdp_engine.bsr_model import estimate_daily_sales, estimate_monthly_revenue
                mocks=[]
                for b in competitor_books:
                    mp = get_mock_product(b["asin"])
                    if mp:
                        m = dict(mp); m["asin"]=b["asin"]; m["marketplace"]=marketplace; m["url"]=f"https://{get_marketplace(marketplace)['domain']}/dp/{b['asin']}"
                        m["est_daily_sales"]=estimate_daily_sales(m["bsr"], get_marketplace(marketplace).get("bsr_model","us_kindle"))
                        m["est_monthly_revenue_usd"]=estimate_monthly_revenue(m["bsr"], m["price"], get_marketplace(marketplace).get("bsr_model","us_kindle"))
                        mocks.append(m)
                    else:
                        # generic synthetic product so UI not empty
                        mocks.append({"asin": b["asin"], "title": f"Sample Book for {b['asin']}", "author": "Demo Author", "bsr": 80000, "price": 4.99, "rating": 4.2, "review_count": 180, "pages": 220, "categories": ["Books > Mystery"], "bsr_categories": {"Kindle > Mystery > Cozy": 1500}, "status": "ok", "marketplace": marketplace, "url": f"https://{get_marketplace(marketplace)['domain']}/dp/{b['asin']}", "est_daily_sales": 1.2, "est_monthly_revenue_usd": 45.0})
                if mocks:
                    competitor_books = mocks
                    competitor_mock = True
                    warnings.append("⚠️ MOCK competitor data — Amazon product pages blocked in sandbox (egress allowlist). Showing curated sample books (labeled MOCK).")
        except Exception as e:
            errors.append(f"competitor scrape: {e}")
        # stats
        if competitor_books:
            ok = [b for b in competitor_books if b.get("status") == "ok"]
            if ok:
                bsr_vals = [b["bsr"] for b in ok if b.get("bsr")]
                price_vals = [b["price"] for b in ok if b.get("price") is not None]
                review_vals = [b["review_count"] for b in ok if b.get("review_count") is not None]
                rating_vals = [b["rating"] for b in ok if b.get("rating") is not None]
                competitor_stats = {
                    "count": len(ok),
                    "avg_bsr": round(sum(bsr_vals)/len(bsr_vals)) if bsr_vals else None,
                    "avg_price": round(sum(price_vals)/len(price_vals),2) if price_vals else None,
                    "avg_reviews": round(sum(review_vals)/len(review_vals)) if review_vals else None,
                    "avg_rating": round(sum(rating_vals)/len(rating_vals),2) if rating_vals else None,
                }
            else:
                warnings.append("All competitor ASIN scrapes failed or blocked — competition pillar will use result_count only.")

    # 3) Score keywords
    scored = score_all(enriched, price=price, marketplace=marketplace, competitor_stats=competitor_stats)

    # 4) Profit
    profit_data = calc_all(price, pages=pages) if price else None

    # 5) Categories
    cat_res = {"from_competitors": [], "suggested": []}
    try:
        from config import CATEGORY_EXPLORER
        kw_join = " ".join(seeds) + " " + title + " " + subtitle
        kw_low = kw_join.lower()
        for cat, subs in CATEGORY_EXPLORER.items():
            if any(tok in kw_low for tok in cat.lower().split()) or any(tok in kw_low for sub in subs for tok in sub.lower().split()):
                cat_res["suggested"].append({"category": cat, "subcategories": subs})
        if not cat_res["suggested"]:
            cat_res["suggested"] = [{"category": k, "subcategories": v[:3]} for k, v in list(CATEGORY_EXPLORER.items())[:6]]
        if competitor_books:
            seen = set()
            for b in competitor_books:
                if b.get("status") == "ok":
                    for cat, rank in (b.get("bsr_categories") or {}).items():
                        if cat not in seen:
                            seen.add(cat)
                            cat_res["from_competitors"].append({"category": cat, "rank": rank, "asin": b["asin"]})
                    for c in (b.get("categories") or []):
                        if c not in seen:
                            seen.add(c)
                            cat_res["from_competitors"].append({"category": c, "rank": None, "asin": b["asin"]})
            cat_res["from_competitors"].sort(key=lambda x: x["rank"] if x["rank"] else 999999)
    except Exception as e:
        errors.append(f"categories: {e}")

    # 6) Content gap
    gap = None
    try:
        gap = analyze_content_gap(enriched, competitor_books)
    except Exception as e:
        errors.append(f"content_gap: {e}")

    # 7) Low-competition
    low_comp = [k for k in scored["keywords"] if k["total"] >= 55 and (next((e["result_count"] for e in enriched if e["keyword"]==k["keyword"] and e.get("result_count") is not None), 999999) < 20000)]
    low_comp = low_comp[:12]

    # 8) Top 20
    top20 = []
    if enriched:
        try:
            sr = scrape_search_results(enriched[0]["keyword"], marketplace=marketplace, department=department, top_n=20)
            if sr.get("status") == "ok":
                top20 = sr.get("results", [])
            else:
                # mock top20 when blocked so table not empty
                import hashlib
                top20 = []
                for i in range(12):
                    h=int(hashlib.md5(f"{enriched[0]['keyword']}{i}".encode()).hexdigest()[:6],16)
                    top20.append({"asin": f"B0MOCK{i:06d}", "title": f"{enriched[0]['keyword'].title()} - Book {i+1}", "price": round(2.99 + (h%600)/100,2), "rating": round(3.8 + (h%70)/100,1), "review_count": 50 + h%2000, "sponsored": i==2})
                warnings.append("⚠️ MOCK top-20 — Amazon search blocked in sandbox (labeled MOCK).")
        except Exception as e:
            errors.append(f"top20: {e}")

    elapsed = round(time.time() - t0, 1)
    ts = datetime.datetime.utcnow().isoformat() + "Z"

    return jsonify({
        "input": {"title": title, "subtitle": subtitle, "seeds": seeds, "marketplace": marketplace, "format": book_format, "price": price, "pages": pages, "asins": asins, "department": department, "depth": depth},
        "meta": {"elapsed_s": elapsed, "updated_at": ts, "marketplace_meta": marketplace_meta(marketplace), "total_mined": len(enriched), "mock": mock_used or competitor_mock},
        "mined": enriched,
        "per_seed_counts": {k: len(v) for k, v in mined["per_seed"].items()},
        "scored": scored,
        "competitors": {"books": competitor_books, "stats": competitor_stats, "mock": competitor_mock},
        "profit": profit_data,
        "categories": cat_res,
        "content_gap": gap,
        "low_competition": low_comp,
        "top20": top20,
        "warnings": warnings,
        "errors": errors + mined.get("errors", []),
        "sources": {
            "keywords": f"Amazon autocomplete ({get_marketplace(marketplace)['completion_domain']})" + (" — MOCK (sandbox blocked, demo data)" if mock_used else " — ACTUAL"),
            "competition": "Amazon search result count + BSR scrape" + (" — MOCK (sandbox blocked)" if any(k.get("competition_status")=="MOCK" for k in enriched[:3]) else " — ACTUAL (when not blocked)"),
            "profit": "KDP royalty tables — CALCULATED",
            "score": "Heuristic composite 0-100 (Demand30+Competition25+Differentiation15+Intent15+Profit15) — CALCULATED",
            "trends": "Google Trends via pytrends if installed else simulated (labeled)",
            "volume_note": "Monthly search volume is ESTIMATED heuristic unless DataForSEO configured. Autocomplete ≠ volume.",
        }
    })

# ── Fallback: serve frontend dist if exists ──
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    dist = Path(__file__).parent.parent / "dist"
    if dist.exists():
        if path and (dist / path).exists():
            return send_from_directory(dist, path)
        if (dist / "index.html").exists():
            return send_from_directory(dist, "index.html")
    return jsonify({"message": "KDP Research Platform API — frontend not built yet. Run `npm run build` or visit /api/health"}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    print(f"🚀 KDP Platform v{VERSION} on http://0.0.0.0:{port} — marketplaces: {', '.join(MARKETPLACES)}")
    app.run(host="0.0.0.0", port=port, debug=debug, threaded=True)
