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
from validate.rules import validate_period_breakdown, validate_rows

# Períodos fixos que o PeriodRadioGroup do portal oferece (ver ADR-007) —
# breakdowns (navegadores/dispositivos/horários/geografia) são extraídos só
# pra esses 4, não pra qualquer intervalo arbitrário (custo de API proibitivo).
PERIODOS_FIXOS = {
    "dia": ("day", "today"),
    "semana": ("week", "today"),
    "mes": ("month", "today"),
    "ano": ("year", "today"),
}


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
    period, date = "month", "today"  # usado só por páginas/busca (snapshot único)

    navegadores, dispositivos, horarios, cidades = {}, {}, {}, {}
    for chave, (p, d) in PERIODOS_FIXOS.items():
        navegadores[chave] = t_matomo.top_n_with_others(matomo.get_browsers(p, d), "navegador", 4)
        dispositivos[chave] = t_matomo.top_n_with_others(matomo.get_device_type(p, d), "dispositivo", 2)
        horarios[chave] = t_matomo.visit_time(matomo.get_visit_time(p, d))
        cidades[chave] = t_matomo.cities_ms(matomo.get_city(p, d, limit=200))

    validate_period_breakdown(navegadores, ["navegador", "visitas"], ["visitas"])
    publish("matomo", "navegadores", navegadores)
    print(f"[matomo] navegadores -> {[(k, len(v)) for k, v in navegadores.items()]}")

    validate_period_breakdown(dispositivos, ["dispositivo", "visitas"], ["visitas"])
    publish("matomo", "dispositivos", dispositivos)
    print(f"[matomo] dispositivos -> {[(k, len(v)) for k, v in dispositivos.items()]}")

    validate_period_breakdown(horarios, ["hora", "visitas"], ["visitas"])
    publish("matomo", "horarios", horarios)
    print(f"[matomo] horarios -> {[(k, len(v)) for k, v in horarios.items()]}")

    validate_period_breakdown(cidades, ["cidade", "visitas"], ["visitas"])
    publish("matomo", "geografia", cidades)
    print(f"[matomo] geografia -> {[(k, len(v)) for k, v in cidades.items()]}")

    page_urls_raw = matomo.get_page_urls(period, date, limit=-1)

    paginas = t_matomo.top_pages(page_urls_raw, n=20)
    validate_rows(paginas, required=["url", "visitas"], non_negative=["visitas"])
    publish("matomo", "paginas-mais-acessadas", paginas)
    print(f"[matomo] paginas -> {len(paginas)} paginas")

    # 920 dias cobre desde 01/01/2024 até hoje — usuário precisa comparar
    # "Ano" com o ano anterior completo, 370 dias só ia até jul/2025.
    diarias = t_matomo.visits_daily(matomo.get_visits_summary_daily(days=920))
    validate_rows(diarias, required=["data", "visitas"], non_negative=["visitas", "visitantesUnicos", "acoes"])
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


def run_ga4_perfil() -> None:
    # ponytail: snapshot fixo 30 dias, sem breakdown por período (dia/semana/
    # mes/ano) como o Matomo tem (ADR-007) — 4x o custo de API pra um domínio
    # que no dashboard legado também não tinha filtro dinâmico de período.
    start, end = "30daysAgo", "today"

    plataforma = ga4.get_platform(start, end)
    validate_rows(plataforma, required=["operatingSystem", "activeUsers"], non_negative=["activeUsers"])
    publish("ga4", "plataforma", plataforma)
    print(f"[ga4] plataforma -> {len(plataforma)} linhas")

    servicos = ga4.get_services(start, end)
    validate_rows(servicos, required=["servico", "acessos"], non_negative=["acessos"])
    publish("ga4", "servicos", servicos)
    print(f"[ga4] servicos -> {len(servicos)} linhas")

    funil = ga4.get_funnel(start, end)
    validate_rows(funil, required=["evento", "usuarios"], non_negative=["usuarios"])
    publish("ga4", "funil", funil)
    print(f"[ga4] funil -> {len(funil)} linhas")

    horarios = ga4.get_visit_time(start, end)
    validate_rows(horarios, required=["hora", "sessoes"], non_negative=["sessoes"])
    publish("ga4", "horarios", horarios)
    print(f"[ga4] horarios -> {len(horarios)} linhas")


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
        ("ga4_perfil", run_ga4_perfil),
        ("cartas", run_cartas),
    ]:
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 — fonte indisponível não derruba as outras
            print(f"[{nome}] FALHOU: {exc}")
