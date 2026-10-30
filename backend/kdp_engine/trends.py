"""Trend analyzer — Google Trends via pytrends if available, else heuristic seasonal model labeled SIMULATED.
We attempt real pytrends; graceful fallback ensures app works without extra deps/keys.
"""
import logging
import random
import hashlib
import datetime

logger = logging.getLogger(__name__)

MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

def seasonal_baseline(keyword, marketplace="us"):
    """Deterministic pseudo-seasonal curve based on hash — clearly labeled SIMULATED."""
    h = int(hashlib.md5(keyword.lower().encode()).hexdigest()[:8], 16)
    random.seed(h)
    # pick a peak month (e.g., diet peaks Jan, romance Feb, holiday Nov-Dec)
    peak = h % 12
    trough = (peak + 6) % 12
    values = []
    for m in range(12):
        # distance to peak circular
        d_peak = min(abs(m - peak), 12 - abs(m - peak))
        # value decays with distance
        base = 100 - d_peak * 12 + random.randint(-6, 6)
        base = max(18, min(100, base))
        values.append(base)
    # add slight growth/decline trend
    trend_bias = (h % 7) - 3  # -3 to +3
    for i in range(12):
        values[i] = max(12, min(100, values[i] + int(trend_bias * (i / 11) * 4)))
    return values, peak, trough

def try_pytrends(keyword, geo="US"):
    """Attempt real Google Trends via pytrends. Return None if unavailable."""
    try:
        from pytrends.request import TrendReq
    except ImportError:
        return None
    try:
        pytrends = TrendReq(hl="en-US", tz=0, timeout=(10, 25))
        pytrends.build_payload([keyword], cat=0, timeframe="today 12-m", geo=geo, gprop="")
        df = pytrends.interest_over_time()
        if df is None or df.empty:
            return None
        # extract series
        series = df[keyword].tolist() if keyword in df.columns else df.iloc[:,0].tolist()
        # pytrends returns weekly; aggregate to monthly avg
        dates = df.index.tolist()
        # group by month
        monthly = {}
        for d, v in zip(dates, series):
            key = d.strftime("%Y-%m")
            monthly.setdefault(key, []).append(v)
        months_sorted = sorted(monthly.keys())
        values = [round(sum(monthly[k]) / len(monthly[k])) for k in months_sorted[-12:]]
        labels = [k for k in months_sorted[-12:]]
        status = "ACTUAL"
        source = "Google Trends (pytrends)"
        return {"values": values, "labels": labels, "status": status, "source": source}
    except Exception as e:
        logger.warning(f"pytrends failed for '{keyword}': {e}")
        return None

def get_trends(keyword, marketplace="us"):
    geo_map = {"us": "US", "uk": "GB", "de": "DE", "ca": "CA", "au": "AU", "in": "IN"}
    geo = geo_map.get(marketplace.lower(), "US")

    # try real
    real = try_pytrends(keyword, geo=geo)
    if real and real.get("values"):
        vals = real["values"]
        labels = real["labels"]
        # analyze
        avg = sum(vals) / len(vals) if vals else 0
        peak_v = max(vals) if vals else 0
        trough_v = min(vals) if vals else 0
        trend_dir = "Stable"
        if len(vals) >= 3:
            if vals[-1] > vals[0] * 1.20:
                trend_dir = "Rising"
            elif vals[-1] < vals[0] * 0.80:
                trend_dir = "Declining"
        return {
            "keyword": keyword,
            "values": vals,
            "labels": labels,
            "status": "ACTUAL",
            "source": real["source"],
            "avg": round(avg, 1),
            "peak": peak_v,
            "trough": trough_v,
            "trend_direction": trend_dir,
            "last_updated": datetime.datetime.utcnow().isoformat() + "Z",
            "note": "Data from Google Trends via pytrends (weekly interest, aggregated to monthly). 0-100 normalized.",
        }

    # fallback simulated
    values, peak_idx, trough_idx = seasonal_baseline(keyword, marketplace)
    avg = sum(values) / len(values)
    # trend direction from slope
    if values[-1] > values[0] + 12:
        trend_dir = "Rising (simulated)"
    elif values[-1] < values[0] - 12:
        trend_dir = "Declining (simulated)"
    else:
        trend_dir = "Stable (simulated)"
    return {
        "keyword": keyword,
        "values": values,
        "labels": MONTHS,
        "status": "SIMULATED",
        "source": "Simulated seasonal model (deterministic heuristic — clear label, not Google data)",
        "avg": round(avg, 1),
        "peak": max(values),
        "trough": min(values),
        "peak_month": MONTHS[peak_idx],
        "trough_month": MONTHS[trough_idx],
        "trend_direction": trend_dir,
        "last_updated": datetime.datetime.utcnow().isoformat() + "Z",
        "note": "⚠️ SIMULATED — install `pytrends` and set no extra key for ACTUAL Google Trends, or connect a DataForSEO key. This model is deterministic per keyword to demo seasonality UI.",
    }
