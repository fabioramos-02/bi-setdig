"""POC do pipeline extract -> validate -> publish, 1 dataset por fonte.

Uso: python data-platform/run.py

Prova o padrão de ponta a ponta contra as fontes reais antes de generalizar
pros ~15 datasets do Fase 2 completo (ver docs/fases/03-fase-2-data-platform.md).
Cartas (Postgres) exige VPN da SETDIG — se falhar, o script registra e segue
(fonte indisponível não deve derrubar as outras duas).
"""
from __future__ import annotations

import sys
from datetime import date as dt_date
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

# GA4 não tem period=week/month nativo — usa faixas relativas (Data API). Mapeia
# os 4 períodos fixos do portal (ADR-007) pra janelas equivalentes, pra o filtro
# funcionar em /analytics/ms-digital igual ao Portal MS.
GA4_PERIODOS = {
    "dia": ("today", "today"),
    "semana": ("7daysAgo", "today"),
    "mes": ("30daysAgo", "today"),
    "ano": ("365daysAgo", "today"),
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


def run_matomo_perfil_filtro() -> None:
    """Adoção do filtro de Perfil do Portal Único (estudo portado do bench-carta).

    1 snapshot getPageUrls por período fixo (ADR-007) — leve mesmo em period=year.
    O cálculo (catálogo de serviços, atribuíveis, taxa corrigida) vive em
    transform/perfil.py; aqui só orquestra extract -> transform -> validate -> publish.
    """
    from transform import perfil as t_perfil
    from transform import servicos as t_servicos

    saida = {}
    mais_acessados = {}
    for chave, (p, d) in PERIODOS_FIXOS.items():
        raw = matomo.get_page_urls(p, d, limit=-1)
        saida[chave] = t_perfil.build_periodo(raw)
        # Reusa o mesmo snapshot pra ranquear os serviços REAIS mais acessados
        # do portal (não só os do filtro de Perfil).
        mais_acessados[chave] = t_servicos.top_servicos_acessados(raw, n=15)

    t_perfil.validar(saida)
    publish("matomo", "perfil-filtro", saida)
    print(f"[matomo] perfil-filtro -> {[(k, saida[k]['resumo']['usoRealPct']) for k in saida]}")

    validate_period_breakdown(mais_acessados, ["servico", "path", "visitas"], ["visitas"])
    publish("matomo", "servicos-mais-acessados", mais_acessados)
    print(f"[matomo] servicos-mais-acessados -> {[(k, len(v)) for k, v in mais_acessados.items()]}")


# URL da Home do portal rastreado no Matomo (idSite=MATOMO_SITE_ID) — porta de
# matomo-analytics-dashboard/views/portal/tab4_jornada.py:126.
HOME_URL = "https://www.ms.gov.br/"


def _transitions_home_ano(home_url: str) -> list[dict]:
    """period=year estoura 504 no servidor Matomo mesmo com 1 URL fixa (Home)
    — contorna com 12 chamadas period=month, agregadas em memória (porta de
    tab4_jornada.py::_load_transitions_annual, sem a progress bar do Streamlit).

    Cada mês tem seu próprio try/except: 1 mês instável não pode descartar os
    outros 11 (antes, exceção em qualquer mês esvaziava o ano inteiro)."""
    hoje = dt_date.today()
    respostas = []
    for mes in range(1, 13):
        primeiro_dia = dt_date(hoje.year, mes, 1)
        if primeiro_dia > hoje:
            break
        try:
            respostas.append(matomo.get_transitions_for_page_url("month", primeiro_dia.isoformat(), home_url))
        except Exception as exc:  # noqa: BLE001 — mesma instabilidade documentada em run_matomo_jornada
            print(f"[matomo] padrao-comportamental ano, mês {mes:02d} FALHOU (pulado): {exc}")
    return respostas


def run_matomo_jornada() -> None:
    """Fluxo de navegação — 3 relatórios leves (não N+1), porta de
    matomo-analytics-dashboard/views/portal/tab4_jornada.py:
    - Portas de Entrada: Actions.getEntryPageUrls, 1 chamada por período.
    - Fuga do Hub: Actions.getOutlinks, 1 chamada por período.
    - Padrão Comportamental: Transitions.getTransitionsForPageUrl fixo na Home,
      1 chamada por período (exceto period=ano, que precisa do chunking mensal
      acima — o timeout é do período, não de N páginas)."""
    entradas, saidas = {}, {}
    for chave, (p, d) in PERIODOS_FIXOS.items():
        entradas[chave] = t_matomo.entry_pages(matomo.get_entry_pages(p, d, limit=20))
        saidas[chave] = t_matomo.outlinks(matomo.get_outlinks(p, d, limit=50))

    validate_period_breakdown(entradas, ["pagina", "entradas"], ["entradas"])
    publish("matomo", "portas-entrada", entradas)
    print(f"[matomo] portas-entrada -> {[(k, len(v)) for k, v in entradas.items()]}")

    validate_period_breakdown(saidas, ["dominio", "saidas"], ["saidas"])
    publish("matomo", "fuga-hub", saidas)
    print(f"[matomo] fuga-hub -> {[(k, len(v)) for k, v in saidas.items()]}")

    padrao: dict[str, dict] = {}
    for chave, (p, d) in PERIODOS_FIXOS.items():
        try:
            if chave == "ano":
                following = t_matomo.merge_following_pages(_transitions_home_ano(HOME_URL))
            else:
                raw = matomo.get_transitions_for_page_url(p, d, HOME_URL)
                following = raw.get("followingPages") or []
            padrao[chave] = t_matomo.padrao_comportamental(following)
        except Exception as exc:  # noqa: BLE001 — Transitions é instável (504 documentado em
            # transform/perfil.py:20-31, confirmado ao vivo até em period=month); 1 período
            # falho não pode derrubar portas-entrada/fuga-hub (já publicados acima) nem os
            # outros períodos que deram certo — front já trata lista vazia (EmptyCard).
            print(f"[matomo] padrao-comportamental período {chave!r} FALHOU (Transitions instável): {exc}")
            padrao[chave] = {"distribuicao": [], "topDestinos": []}

    validate_period_breakdown(
        {k: v["distribuicao"] for k, v in padrao.items()}, ["tipo", "acessos", "participacaoPct"], ["acessos", "participacaoPct"]
    )
    validate_period_breakdown({k: v["topDestinos"] for k, v in padrao.items()}, ["pagina", "tipo", "acessos"], ["acessos"])
    publish("matomo", "padrao-comportamental", padrao)
    print(f"[matomo] padrao-comportamental -> {[(k, len(padrao[k]['topDestinos'])) for k in padrao]}")


def run_ga4() -> None:
    # visao-geral vira breakdown por período (v2) — o filtro do MS Digital
    # precisa recortar os KPIs por dia/semana/mes/ano (ADR-007).
    visao = {}
    for chave, (start, end) in GA4_PERIODOS.items():
        visao[chave] = ga4.get_overview(start_date=start, end_date=end)
    validate_period_breakdown(visao, ["newVsReturning", "activeUsers"], ["activeUsers", "sessions", "screenPageViews"])
    out = publish("ga4", "visao-geral", visao, version="v2")
    print(f"[ga4] visao-geral -> {out} ({[(k, len(v)) for k, v in visao.items()]})")


def run_ga4_perfil() -> None:
    # Breakdown por período fixo (v2), espelhando run_matomo_perfil — 4x o custo
    # de API, agora justificado: o filtro de período vale pra todas as abas.
    plataforma, servicos, funil, horarios = {}, {}, {}, {}
    for chave, (start, end) in GA4_PERIODOS.items():
        plataforma[chave] = ga4.get_platform(start, end)
        servicos[chave] = ga4.get_services(start, end)
        funil[chave] = ga4.get_funnel(start, end)
        horarios[chave] = ga4.get_visit_time(start, end)

    validate_period_breakdown(plataforma, ["operatingSystem", "activeUsers"], ["activeUsers"])
    publish("ga4", "plataforma", plataforma, version="v2")
    print(f"[ga4] plataforma -> {[(k, len(v)) for k, v in plataforma.items()]}")

    validate_period_breakdown(servicos, ["servico", "acessos"], ["acessos"])
    publish("ga4", "servicos", servicos, version="v2")
    print(f"[ga4] servicos -> {[(k, len(v)) for k, v in servicos.items()]}")

    validate_period_breakdown(funil, ["evento", "usuarios"], ["usuarios"])
    publish("ga4", "funil", funil, version="v2")
    print(f"[ga4] funil -> {[(k, len(v)) for k, v in funil.items()]}")

    validate_period_breakdown(horarios, ["hora", "sessoes"], ["sessoes"])
    publish("ga4", "horarios", horarios, version="v2")
    print(f"[ga4] horarios -> {[(k, len(v)) for k, v in horarios.items()]}")


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
        ("matomo_perfil_filtro", run_matomo_perfil_filtro),
        ("matomo_jornada", run_matomo_jornada),
        ("ga4", run_ga4),
        ("ga4_perfil", run_ga4_perfil),
        ("cartas", run_cartas),
    ]:
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 — fonte indisponível não derruba as outras
            print(f"[{nome}] FALHOU: {exc}")
