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
    for nome, fn in [("matomo", run_matomo), ("ga4", run_ga4), ("cartas", run_cartas)]:
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 — fonte indisponível não derruba as outras
            print(f"[{nome}] FALHOU: {exc}")
