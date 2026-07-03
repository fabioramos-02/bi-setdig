"""Cliente GA4 — porta mínima de matomo/matomo-analytics-dashboard/api/google_analytics_client.py.

OAuth2 com refresh token (mesmo padrão já usado em produção nos BIs antigos).
Trocar por service account é um risco listado na Fase 2 — não bloqueia isto.
"""
from __future__ import annotations

import os

from dotenv import load_dotenv
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest
from google.oauth2.credentials import Credentials

load_dotenv()


def _client() -> BetaAnalyticsDataClient:
    credentials = Credentials(
        token=None,
        refresh_token=os.getenv("GOOGLE_REFRESH_TOKEN", ""),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
        scopes=["https://www.googleapis.com/auth/analytics.readonly"],
    )
    return BetaAnalyticsDataClient(credentials=credentials)


def get_overview(start_date: str, end_date: str) -> list[dict]:
    client = _client()
    property_id = os.getenv("GOOGLE_PROPERTY_ID", "")
    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="newVsReturning")],
        metrics=[
            Metric(name="activeUsers"),
            Metric(name="sessions"),
            Metric(name="screenPageViews"),
        ],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
    )
    response = client.run_report(request)
    rows = []
    for row in response.rows:
        rows.append(
            {
                "newVsReturning": row.dimension_values[0].value,
                "activeUsers": int(row.metric_values[0].value),
                "sessions": int(row.metric_values[1].value),
                "screenPageViews": int(row.metric_values[2].value),
            }
        )
    return rows
