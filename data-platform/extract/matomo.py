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


def _call(method: str, period: str, date: str, extra: dict | None = None, site_id: str | None = None, timeout: int = 30):
    params = {
        "module": "API",
        "method": method,
        "idSite": site_id or MATOMO_SITE_ID,
        "period": period,
        "date": date,
        "format": "JSON",
        "token_auth": MATOMO_TOKEN,
    }
    if extra:
        params.update(extra)
    url = f"{MATOMO_URL}index.php?{urllib.parse.urlencode(params)}"
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    return response.json()


def get_visits_summary(period: str, date: str, site_id: str | None = None) -> dict:
    return _call("VisitsSummary.get", period, date, site_id=site_id)


def get_visits_summary_daily(days: int = 90, site_id: str | None = None) -> dict:
    """Série diária — base pro filtro de período client-side no portal."""
    return _call("VisitsSummary.get", "day", f"last{days}", site_id=site_id)


def get_city(period: str, date: str, site_id: str | None = None, limit: int = 100) -> list:
    return _call("UserCountry.getCity", period, date, {"filter_limit": limit}, site_id)


def get_visit_time(period: str, date: str, site_id: str | None = None) -> list:
    return _call("VisitTime.getVisitInformationPerServerTime", period, date, site_id=site_id)


def get_browsers(period: str, date: str, site_id: str | None = None, limit: int = 20) -> list:
    return _call("DevicesDetection.getBrowsers", period, date, {"filter_limit": limit}, site_id)


def get_device_type(period: str, date: str, site_id: str | None = None) -> list:
    return _call("DevicesDetection.getType", period, date, site_id=site_id)


def get_page_urls(period: str, date: str, site_id: str | None = None, limit: int = 500) -> list:
    """flat=1 devolve a URL completa em cada linha, sem hierarquia de pastas
    (sem isso o Matomo só retorna label/nb_visits por nó, sem o campo 'url' —
    mesmo padrão de matomo/api/matomo_client.py::get_page_urls_trend)."""
    return _call("Actions.getPageUrls", period, date, {"filter_limit": limit, "flat": 1, "expanded": 0}, site_id)


def get_site_search_keywords(period: str, date: str, site_id: str | None = None, limit: int = 50) -> list:
    return _call("Actions.getSiteSearchKeywords", period, date, {"filter_limit": limit}, site_id)
