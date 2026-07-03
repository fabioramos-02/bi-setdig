"""Cliente Matomo — porta mínima de matomo/matomo-analytics-dashboard/api/matomo_client.py.

Sem acoplamento a Streamlit. Lê credenciais do .env na raiz do repo.
"""
from __future__ import annotations

import os
import urllib.parse

import requests
from dotenv import load_dotenv

load_dotenv()

MATOMO_URL = os.getenv("MATOMO_URL", "")
MATOMO_SITE_ID = os.getenv("MATOMO_SITE_ID", "")
MATOMO_TOKEN = os.getenv("MATOMO_TOKEN", "")


def get_visits_summary(period: str, date: str, site_id: str | None = None) -> dict:
    params = {
        "module": "API",
        "method": "VisitsSummary.get",
        "idSite": site_id or MATOMO_SITE_ID,
        "period": period,
        "date": date,
        "format": "JSON",
        "token_auth": MATOMO_TOKEN,
    }
    url = f"{MATOMO_URL}index.php?{urllib.parse.urlencode(params)}"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json()
