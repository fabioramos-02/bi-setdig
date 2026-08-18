"""Cliente GA4 — porta mínima de matomo/matomo-analytics-dashboard/api/google_analytics_client.py.

OAuth2 com refresh token (mesmo padrão já usado em produção nos BIs antigos).
Trocar por service account é um risco listado na Fase 2 — não bloqueia isto.
"""
from __future__ import annotations

import os

from datetime import date, timedelta

from dotenv import load_dotenv
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    Cohort,
    CohortSpec,
    CohortsRange,
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
)
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


def get_platform(start_date: str, end_date: str) -> list[dict]:
    """Split iOS/Android/Web — porta de views/ms_digital/tab1_overview.py."""
    client = _client()
    property_id = os.getenv("GOOGLE_PROPERTY_ID", "")
    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="operatingSystem")],
        metrics=[Metric(name="activeUsers")],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
    )
    response = client.run_report(request)
    return [
        {"operatingSystem": row.dimension_values[0].value, "activeUsers": int(row.metric_values[0].value)}
        for row in response.rows
        if row.dimension_values[0].value != "(not set)"
    ]


# Dimensões candidatas pra identificar telas/serviços, em ordem de preferência
# — porta de GoogleAnalyticsAPI._get_screen_dim() do dashboard legado. Nem
# toda property GA4 popula a mesma dimensão de tela.
_SCREEN_DIM_CANDIDATES = [
    "unifiedScreenName",
    "customEvent:unified_screen_name",
    "screenPageTitle",
    "screenName",
    "pageTitle",
]
_EXCLUIR_TELA = {"(not set)", "", "(other)"}


def _detectar_dimensao_servico(client, property_id: str, start_date: str, end_date: str) -> list[dict]:
    for dim in _SCREEN_DIM_CANDIDATES:
        try:
            request = RunReportRequest(
                property=f"properties/{property_id}",
                dimensions=[Dimension(name=dim)],
                metrics=[Metric(name="screenPageViews")],
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                limit=100,
            )
            response = client.run_report(request)
            rows = [
                {"servico": row.dimension_values[0].value, "acessos": int(row.metric_values[0].value)}
                for row in response.rows
            ]
            if any(r["servico"] not in _EXCLUIR_TELA and r["acessos"] > 0 for r in rows):
                return rows
        except Exception:
            continue
    return []


def get_services(start_date: str, end_date: str, limit: int = 100) -> list[dict]:
    """Ranking de funcionalidades mais usadas (top N) — porta de
    views/ms_digital/tab2_funcionalidades.py."""
    client = _client()
    property_id = os.getenv("GOOGLE_PROPERTY_ID", "")
    rows = [r for r in _detectar_dimensao_servico(client, property_id, start_date, end_date) if r["servico"] not in _EXCLUIR_TELA]
    rows.sort(key=lambda r: r["acessos"], reverse=True)
    return rows[:limit]


# Ordem do funil aquisição -> ativação -> navegação -> retenção — porta de
# _EVENTOS_SISTEMA em views/ms_digital/tab4_jornada.py.
_ORDEM_FUNIL = ["first_open", "session_start", "screen_view", "user_engagement"]


def get_funnel(start_date: str, end_date: str) -> list[dict]:
    client = _client()
    property_id = os.getenv("GOOGLE_PROPERTY_ID", "")
    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="eventName")],
        metrics=[Metric(name="totalUsers")],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        limit=100,
    )
    response = client.run_report(request)
    por_evento = {row.dimension_values[0].value: int(row.metric_values[0].value) for row in response.rows}
    return [{"evento": e, "usuarios": por_evento[e]} for e in _ORDEM_FUNIL if e in por_evento]


def get_ativos_janela() -> dict:
    """DAU/WAU/MAU + sessões dos últimos 28 dias. Uma chamada, janelas fixas.

    GA4 calcula cada janela sticky sobre o range da consulta (28 dias) — sem
    dimensões, retorna 1 linha só. Alimenta a métrica de cadência de retorno
    no bloco "De quanto em quanto tempo os usuários voltam" (JornadaTab).
    """
    client = _client()
    property_id = os.getenv("GOOGLE_PROPERTY_ID", "")
    request = RunReportRequest(
        property=f"properties/{property_id}",
        metrics=[
            Metric(name="active1DayUsers"),
            Metric(name="active7DayUsers"),
            Metric(name="active28DayUsers"),
            Metric(name="sessions"),
            Metric(name="totalUsers"),
        ],
        date_ranges=[DateRange(start_date="28daysAgo", end_date="today")],
    )
    response = client.run_report(request)
    if not response.rows:
        return {"dau": 0, "wau": 0, "mau": 0, "sessoes28d": 0, "totalUsuarios28d": 0}
    row = response.rows[0]
    return {
        "dau": int(row.metric_values[0].value),
        "wau": int(row.metric_values[1].value),
        "mau": int(row.metric_values[2].value),
        "sessoes28d": int(row.metric_values[3].value),
        "totalUsuarios28d": int(row.metric_values[4].value),
    }


def get_cohort_semanal_retencao() -> dict:
    """Retenção D1/D7/D30 dos novos usuários da semana passada (cohortSpec).

    Cohort de referência: 7 dias completos anteriores a hoje. Métrica:
    cohortActiveUsers por cohortNthDay. Ver
    https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport#CohortSpec
    """
    client = _client()
    property_id = os.getenv("GOOGLE_PROPERTY_ID", "")
    hoje = date.today()
    fim = hoje - timedelta(days=1)
    inicio = fim - timedelta(days=6)
    semana_referencia = f"{inicio.isoformat()} a {fim.isoformat()}"
    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[
            Dimension(name="cohort"),
            Dimension(name="cohortNthDay"),
        ],
        metrics=[Metric(name="cohortActiveUsers")],
        cohort_spec=CohortSpec(
            cohorts=[
                Cohort(
                    name="semana_passada",
                    dimension="firstSessionDate",
                    date_range=DateRange(start_date=inicio.isoformat(), end_date=fim.isoformat()),
                )
            ],
            cohorts_range=CohortsRange(
                granularity="DAILY",
                start_offset=0,
                end_offset=30,
            ),
        ),
    )
    response = client.run_report(request)
    por_dia: dict[int, int] = {}
    tamanho = 0
    for row in response.rows:
        try:
            nth = int(row.dimension_values[1].value)
        except (ValueError, IndexError):
            continue
        ativos = int(row.metric_values[0].value)
        por_dia[nth] = ativos
        if nth == 0:
            tamanho = ativos
    def _pct(dia: int) -> float:
        if not tamanho:
            return 0.0
        return round(100 * por_dia.get(dia, 0) / tamanho, 1)
    return {
        "semanaReferencia": semana_referencia,
        "tamanho": tamanho,
        "d1Pct": _pct(1),
        "d7Pct": _pct(7),
        "d30Pct": _pct(30),
    }


def get_city(start_date: str, end_date: str, limit: int = 200) -> list[dict]:
    """De onde o app foi aberto (GA4 dimension `city`). Complementar ao mapa
    de cadastros da aba Contas — aqui é o LOCAL DE ACESSO no período, não o
    endereço declarado. Filtra "(not set)" e cidades vazias."""
    client = _client()
    property_id = os.getenv("GOOGLE_PROPERTY_ID", "")
    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="city")],
        metrics=[Metric(name="activeUsers")],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        limit=limit,
    )
    response = client.run_report(request)
    saida: list[dict] = []
    for row in response.rows:
        cidade = row.dimension_values[0].value.strip()
        if not cidade or cidade in {"(not set)", "(other)"}:
            continue
        usuarios = int(row.metric_values[0].value)
        if usuarios <= 0:
            continue
        # Reusa formato Cidade (cidade/visitas) do ChoroplethMap — "visitas" aqui
        # é usuários ativos GA4, semântica documentada no comoLer do StoryCard.
        saida.append({"cidade": cidade, "visitas": usuarios})
    return saida


def get_visit_time(start_date: str, end_date: str) -> list[dict]:
    client = _client()
    property_id = os.getenv("GOOGLE_PROPERTY_ID", "")
    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="hour")],
        metrics=[Metric(name="sessions")],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
    )
    response = client.run_report(request)
    # GA4 pode devolver '(other)' como bucket da dimensão hour — descarta (não é hora).
    rows = [
        {"hora": row.dimension_values[0].value, "sessoes": int(row.metric_values[0].value)}
        for row in response.rows
        if row.dimension_values[0].value.isdigit()
    ]
    return sorted(rows, key=lambda r: int(r["hora"]))
