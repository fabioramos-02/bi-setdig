"""POC do pipeline extract -> validate -> publish, 1 dataset por fonte.

Uso: python data-platform/run.py

Prova o padrão de ponta a ponta contra as fontes reais antes de generalizar
pros ~15 datasets do Fase 2 completo (ver docs/fases/03-fase-2-data-platform.md).
Cartas (Postgres) exige VPN da SETDIG — se falhar, o script registra e segue
(fonte indisponível não deve derrubar as outras duas).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from extract import ga4, matomo
from publish.writer import publish
from transform import matomo as t_matomo
from validate.rules import validate_rows


def run_matomo() -> None:
    raw = matomo.get_visits_summary(period="month", date="today")
    rows = [
        {
            "date": "current-month",
            "visitas": raw.get("nb_visits", 0),
            "visitantesUnicos": raw.get("nb_uniq_visitors", 0),
            "acoes": raw.get("nb_actions", 0),
        }
    ]
    validate_rows(rows, required=["date", "visitas"], non_negative=["visitas", "visitantesUnicos", "acoes"])
    out = publish("matomo", "visitas-resumo", rows)
    print(f"[matomo] ok -> {out} ({rows})")


def run_matomo_perfil() -> None:
    period, date = "month", "today"

    cidades = t_matomo.cities_ms(matomo.get_city(period, date, limit=200))
    validate_rows(cidades, required=["cidade", "visitas"], non_negative=["visitas"])
    publish("matomo", "geografia", cidades)
    print(f"[matomo] geografia -> {len(cidades)} cidades MS")

    navegadores = t_matomo.top_n_with_others(matomo.get_browsers(period, date), "navegador", 4)
    validate_rows(navegadores, required=["navegador", "visitas"], non_negative=["visitas"])
    publish("matomo", "navegadores", navegadores)
    print(f"[matomo] navegadores -> {navegadores}")

    dispositivos = t_matomo.top_n_with_others(matomo.get_device_type(period, date), "dispositivo", 2)
    validate_rows(dispositivos, required=["dispositivo", "visitas"], non_negative=["visitas"])
    publish("matomo", "dispositivos", dispositivos)
    print(f"[matomo] dispositivos -> {dispositivos}")

    horarios = t_matomo.visit_time(matomo.get_visit_time(period, date))
    validate_rows(horarios, required=["hora", "visitas"], non_negative=["visitas"])
    publish("matomo", "horarios", horarios)
    print(f"[matomo] horarios -> {len(horarios)} pontos")

    page_urls_raw = matomo.get_page_urls(period, date, limit=-1)

    paginas = t_matomo.top_pages(page_urls_raw, n=20)
    validate_rows(paginas, required=["url", "visitas"], non_negative=["visitas"])
    publish("matomo", "paginas-mais-acessadas", paginas)
    print(f"[matomo] paginas -> {len(paginas)} paginas")

    diarias = t_matomo.visits_daily(matomo.get_visits_summary_daily(days=370))
    validate_rows(diarias, required=["data", "visitas"], non_negative=["visitas", "visitantesUnicos"])
    publish("matomo", "visitas-diarias", diarias)
    print(f"[matomo] visitas-diarias -> {len(diarias)} dias")

    busca_nativa = t_matomo.search_keywords(matomo.get_site_search_keywords(period, date, limit=50))
    busca_urls = t_matomo.search_from_urls(page_urls_raw)
    busca = t_matomo.merge_search(busca_nativa, busca_urls, n=20)
    validate_rows(busca, required=["termo", "buscas"], non_negative=["buscas"])
    publish("matomo", "busca", busca)
    print(f"[matomo] busca -> {len(busca)} termos ({len(busca_nativa)} nativos + {len(busca_urls)} de URL)")


def run_ga4() -> None:
    rows = ga4.get_overview(start_date="30daysAgo", end_date="today")
    validate_rows(rows, required=["newVsReturning", "activeUsers"], non_negative=["activeUsers", "sessions", "screenPageViews"])
    out = publish("ga4", "visao-geral", rows)
    print(f"[ga4] ok -> {out} ({len(rows)} linhas)")


def run_cartas() -> None:
    from extract import cartas

    count = cartas.get_inventory_count()
    rows = [{"totalCartas": count}]
    validate_rows(rows, required=["totalCartas"], non_negative=["totalCartas"])
    out = publish("cartas", "inventario-count", rows)
    print(f"[cartas] ok -> {out} ({rows})")


if __name__ == "__main__":
    for nome, fn in [
        ("matomo", run_matomo),
        ("matomo_perfil", run_matomo_perfil),
        ("ga4", run_ga4),
        ("cartas", run_cartas),
    ]:
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 — fonte indisponível não derruba as outras
            print(f"[{nome}] FALHOU: {exc}")
