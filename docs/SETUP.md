# Setup Guide

## Prerequisites
- Node 18+ / npm
- Python 3.10+

## 1) Backend (Flask + research engine)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # optional: add DataForSEO / Pangolinfo keys
python app.py  # -> http://localhost:5000  (health at /api/health)
```

**Optional integrations:**
- **DataForSEO** (search volume + reverse ASIN): set `DATAFORSEO_LOGIN` (email) and `DATAFORSEO_API_KEY` at dataforseo.com. Without it, demand is ESTIMATED heuristic and reverse ASIN shows UNAVAILABLE (no fake numbers).
- **Pangolinfo** (blue-ocean niches): set `PANGOLINFO_API_KEY` from tool.pangolinfo.com (200 free calls).
- **Google Trends actual**: `pip install pytrends` then trends endpoint returns ACTUAL instead of SIMULATED seasonal model.

## 2) Frontend (Vite + Chart.js)

```bash
npm install
npm run dev  # -> http://localhost:5173 (proxies /api to Flask 5000)
# build static for Flask to serve:
npm run build  # outputs dist/, Flask serves it at /
```

## 3) Full stack with one preview

In two terminals:
- Terminal 1: `python backend/app.py` (port 5000)
- Terminal 2: `npm run dev`   (port 5173, preview via Vite proxy)

Or production:
```bash
npm run build
PORT=5000 python backend/app.py  # serves both API + built frontend
```

## Android / Mobile
No install needed — open the preview URL in Chrome/Samsung Internet. All processing runs cloud-side (Flask), not on device.

## Verifying repositories (already done — see docs/COMPATIBILITY_REPORT.md)
The build ports core logic from `rxpelle/kdp-scout` (MIT, 35 commits, June 2026) as primary engine: autocomplete mining, product scraping, BSR model, scoring. `pangolinfoapi/amazon-niche-finder` is optional enrichment. Scout-app GUI not ported (PyQt6 desktop-only).

## API endpoints
- `GET /api/health` + `GET /api/marketplaces`
- `POST /api/mine` — {seeds, marketplace, department, depth}
- `POST /api/competition`, `POST /api/competition/bulk`, `POST /api/competitors`, `POST /api/categories`, `POST /api/reverse-asin`, `POST /api/profit`, `POST /api/trends`, `POST /api/content-gap`, `POST /api/score`, `POST /api/research` (orchestrated one-shot)

All responses include `source`, `status` (ACTUAL/ESTIMATED/SIMULATED/UNAVAILABLE/FAILED), `updated_at`, and never invent data for failing sources.

