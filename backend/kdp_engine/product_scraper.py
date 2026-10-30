"""Product page scraper — simplified port from kdp-scout collectors/product_scraper.py
Fetches https://{domain}/dp/{ASIN} and extracts BSR, price, reviews, categories etc.
Handles CAPTCHA detection and multi-layout fallbacks.
"""
import re
import json
import logging
import random
import time

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

UAS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
]

def _browser_headers():
    return {
        "User-Agent": random.choice(UAS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.amazon.com/",
    }

CAPTCHA_MARKERS = ["captchacharacter", "api-services-support", "sp-cc", "Robot Check", "Type the characters you see"]

def _is_captcha(html: str) -> bool:
    low = html.lower()
    return any(m.lower() in low for m in CAPTCHA_MARKERS) and ("captcha" in low or "robot check" in low)

def scrape_product(asin, marketplace="us", timeout=15):
    from config import MARKETPLACES
    mp = MARKETPLACES.get(marketplace.lower())
    if not mp:
        raise ValueError(f"Unknown marketplace {marketplace}")
    domain = mp["domain"]
    url = f"https://{domain}/dp/{asin}"
    try:
        resp = requests.get(url, headers=_browser_headers(), timeout=timeout)
    except Exception as e:
        return {"asin": asin, "error": f"Network error: {e}", "status": "failed"}

    if resp.status_code != 200:
        return {"asin": asin, "error": f"HTTP {resp.status_code}", "status": "failed", "http_status": resp.status_code}

    html = resp.text
    if _is_captcha(html):
        return {"asin": asin, "error": "CAPTCHA / bot check detected — Amazon blocked the request. Try again later or use a proxy.", "status": "blocked"}

    soup = BeautifulSoup(html, "lxml")
    data = {"asin": asin, "marketplace": marketplace, "url": url, "status": "ok"}
    # title
    title = None
    for sel in ["#productTitle", "#title span", "h1 span#productTitle", ".product-title"]:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            title = el.get_text(strip=True)
            break
    data["title"] = title

    # author
    author = None
    for sel in [".author a", "#bylineInfo a", "a.contributorNameID"]:
        el = soup.select_one(sel)
        if el:
            author = el.get_text(strip=True)
            break
    data["author"] = author

    # price — try multiple selectors
    price = None
    price_text_raw = None
    for sel in [".a-price .a-offscreen", "#price", "#kindle-price", ".a-price-whole", "[data-testid='price']"]:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            price_text_raw = el.get_text(strip=True)
            # extract numeric
            m = re.search(r"[\d,.]+", price_text_raw.replace(",", ""))
            if m:
                try:
                    price = float(m.group(0))
                    break
                except: pass
    data["price"] = price
    data["price_text"] = price_text_raw

    # try JSON embedded price
    if price is None:
        for script in soup.find_all("script"):
            t = script.string or ""
            if "price" in t.lower() and "$" in t:
                m = re.search(r"\"price\"\s*:\s*\"?\$?([\d,.]+)", t)
                if m:
                    try:
                        price = float(m.group(1).replace(",", "")); data["price"] = price; break
                    except: pass

    # rating
    rating = None
    for sel in ["#acrPopover span.a-icon-alt", "span#acrPopover", "#averageCustomerReviews"]:
        el = soup.select_one(sel)
        if el:
            txt = el.get_text() if hasattr(el, "get_text") else str(el)
            m = re.search(r"(\d\.\d)\s*out of", txt)
            if m:
                try: rating = float(m.group(1)); break
                except: pass
            # also check attribute
            alt = el.get("alt", "") if hasattr(el, "get") else ""
            m2 = re.search(r"(\d\.\d)", alt)
            if m2:
                try: rating = float(m2.group(1)); break
                except: pass
    data["rating"] = rating

    # review count
    review_count = None
    for sel in ["#acrCustomerReviewText", "#acrCustomerReviewLink", "a#acrCustomerReviewLink span"]:
        el = soup.select_one(sel)
        if el:
            txt = el.get_text(strip=True)
            m = re.search(r"([\d,]+)\s*rating", txt, re.I)
            if not m:
                m = re.search(r"([\d,]+)", txt)
            if m:
                try: review_count = int(m.group(1).replace(",", "")); break
                except: pass
    data["review_count"] = review_count

    # BSR — search for Best Sellers Rank block
    bsr = None
    bsr_categories = {}
    bsr_text_full = None
    # look for detailBulletsWrapper
    for sel in ["#detailBulletsWrapper_feature_div", "#detailBullets_feature_div", "#SalesRank", "#productDetails_detailBullets_sections1", "#detailBullets"]:
        container = soup.select_one(sel)
        if container:
            txt = container.get_text(" ", strip=True)
            if "Best Sellers Rank" in txt or "Best sellers rank" in txt:
                bsr_text_full = txt
                break
    if not bsr_text_full:
        # fallback: search whole page for BSR pattern
        body_text = soup.get_text(" ", strip=True)
        if "Best Sellers Rank" in body_text:
            # extract nearby snippet
            idx = body_text.find("Best Sellers Rank")
            bsr_text_full = body_text[max(0, idx-200): idx+800]

    if bsr_text_full:
        # parse "#12,345 in Kindle Store" etc
        # overall BSR is first number
        m = re.search(r"#([\d,]+)\s+in\s+[^#]+?\(?Top", bsr_text_full)
        if not m:
            m = re.search(r"#([\d,]+)", bsr_text_full)
        if m:
            try:
                bsr = int(m.group(1).replace(",", ""))
            except: pass
        # categories: find all "#N in Category (See Top 100 in Category)"
        for mm in re.finditer(r"#([\d,]+)\s+in\s+([^#]+?)(?:\s*\(|$)", bsr_text_full):
            try:
                rank = int(mm.group(1).replace(",", ""))
                cat = mm.group(2).strip()[:120]
                if cat and rank:
                    bsr_categories[cat] = rank
            except: pass
        # also pattern with links
        # try to get categories from anchor texts inside BSR block
        # (fallback already done)

    data["bsr"] = bsr
    data["bsr_categories"] = bsr_categories
    data["bsr_text"] = bsr_text_full[:600] if bsr_text_full else None

    # categories breadcrumb
    categories = []
    bc = soup.select("#wayfinding-breadcrumbs_container ul li a")
    if bc:
        categories = [a.get_text(strip=True) for a in bc if a.get_text(strip=True)]
    else:
        bc2 = soup.select("[data-feature-name='wayfinding-breadcrumbs'] a")
        if bc2:
            categories = [a.get_text(strip=True) for a in bc2]
    data["categories"] = categories

    # page count
    pages = None
    for label in ["Print length", "Page count", "Length"]:
        # find in detail bullets
        txt = soup.get_text(" ", strip=True)
        m = re.search(rf"{label}.*?([\d,]+)\s*pages", txt, re.I)
        if m:
            try: pages = int(m.group(1).replace(",", "")); break
            except: pass
    data["pages"] = pages

    # publication date
    pub_date = None
    # look for Publisher line
    m = re.search(r"Publication date\s*:\s*([^<\n]+)", html, re.I)
    if m:
        pub_date = m.group(1).strip()[:80]
    else:
        m = re.search(r"Published\s*:\s*([^<\n]+)", html, re.I)
        if m:
            pub_date = m.group(1).strip()[:80]
    data["publication_date"] = pub_date

    # cover image
    img = soup.select_one("#landingImage")
    data["image"] = img.get("src") if img and img.get("src") else None
    if not data["image"]:
        img2 = soup.select_one("#imgTagWrapperId img")
        if img2:
            data["image"] = img2.get("src") or img2.get("data-old-hires")

    # description
    desc_el = soup.select_one("#bookDescription_feature_div") or soup.select_one("#feature-bullets")
    data["description_snippet"] = desc_el.get_text(" ", strip=True)[:600] if desc_el else None

    # sales estimates
    from kdp_engine.bsr_model import estimate_daily_sales, estimate_monthly_revenue
    mp_bsr_model = mp.get("bsr_model", "us_kindle")
    if bsr:
        data["est_daily_sales"] = estimate_daily_sales(bsr, mp_bsr_model)
        data["est_monthly_revenue_usd"] = estimate_monthly_revenue(bsr, price or 4.99, mp_bsr_model) if price else None
    else:
        data["est_daily_sales"] = None
        data["est_monthly_revenue_usd"] = None

    return data

def scrape_multiple(asins, marketplace="us", delay=1.2):
    results = []
    for a in asins:
        a = a.strip().upper()
        if not a:
            continue
        if not re.match(r"^[A-Z0-9]{10}$", a):
            results.append({"asin": a, "error": "Invalid ASIN format (must be 10 chars)", "status": "failed"})
            continue
        r = scrape_product(a, marketplace=marketplace)
        results.append(r)
        time.sleep(delay)
    return results

def scrape_search_results(keyword, marketplace="us", department="kindle", top_n=20):
    """Probe Amazon search page for keyword to get result count & top organic results (fallback competition data)."""
    from config import MARKETPLACES, DEPT_ALIASES
    mp = MARKETPLACES.get(marketplace.lower())
    if not mp:
        return {"error": f"Unknown marketplace {marketplace}", "status": "failed"}
    dept_alias = DEPT_ALIASES.get(department, "digital-text")
    url = f"https://{mp['domain']}/s"
    params = {"k": keyword, "i": dept_alias}
    headers = {
        "User-Agent": random.choice(UAS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
    }
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
    except Exception as e:
        return {"error": f"Network error: {e}", "status": "failed"}

    if resp.status_code != 200:
        return {"error": f"HTTP {resp.status_code}", "status": "failed", "http_status": resp.status_code}
    html = resp.text
    if any(m in html.lower() for m in ["captcha", "robot check"]) and "api-services-support" in html:
        return {"error": "CAPTCHA blocked on search page", "status": "blocked"}

    soup = BeautifulSoup(html, "lxml")
    # result count: "1-16 of over 10,000 results for"
    count = None
    count_text = None
    for sel in ["span[data-component-type='s-result-info-bar']", ".s-result-info-bar", "#search span.a-color-state"]:
        el = soup.select_one(sel)
        if el and "result" in el.get_text(lower=True):
            count_text = el.get_text(" ", strip=True)
            break
    if not count_text:
        # scan text
        m = re.search(r"([\d,]+)\s+results? for", html, re.I)
        if m:
            count_text = m.group(0)
    if count_text:
        m = re.search(r"over\s+([\d,]+)", count_text, re.I)
        if m:
            try: count = int(m.group(1).replace(",", "")); 
            except: pass
        else:
            m2 = re.search(r"([\d,]+)\s+results", count_text, re.I)
            if m2:
                try: count = int(m2.group(1).replace(",", ""))
                except: pass
        if not count:
            m3 = re.search(r"([\d,]+)", count_text)
            if m3:
                try: count = int(m3.group(1).replace(",", "")); 
                except: pass

    # parse organic results (skip sponsored if possible)
    results = []
    items = soup.select("div[data-component-type='s-search-result']")
    for item in items[:top_n]:
        asin = item.get("data-asin") or ""
        if not asin:
            continue
        # detect sponsored
        is_sponsored = bool(item.select_one(".puis-sponsored-label-text, .s-sponsored-label-info-icon, span:contains('Sponsored')"))
        # title
        title_el = item.select_one("h2 a span") or item.select_one("a h2 span") or item.select_one("h2 span")
        title = title_el.get_text(strip=True) if title_el else ""
        # price
        price_el = item.select_one(".a-price .a-offscreen")
        price = None
        if price_el:
            m = re.search(r"([\d,.]+)", price_el.get_text(strip=True).replace(",", ""))
            if m:
                try: price = float(m.group(1))
                except: pass
        # rating + review count
        rating = None
        reviews = None
        rating_el = item.select_one("i span.a-icon-alt")
        if rating_el:
            m = re.search(r"(\d\.\d)", rating_el.get_text())
            if m:
                try: rating = float(m.group(1))
                except: pass
        review_el = item.select_one("a[href*='#customerReviews'] span")
        if review_el:
            txt = review_el.get_text(strip=True).replace(",", "")
            try: reviews = int(re.search(r"(\d+)", txt).group(1))
            except: pass

        results.append({
            "asin": asin,
            "title": title[:180],
            "price": price,
            "rating": rating,
            "review_count": reviews,
            "sponsored": is_sponsored,
        })

    return {
        "status": "ok",
        "keyword": keyword,
        "marketplace": marketplace,
        "result_count": count,
        "result_count_text": count_text,
        "results": results,
        "total_parsed": len(results),
        "source": f"https://{mp['domain']}/s?k={keyword}",
    }
