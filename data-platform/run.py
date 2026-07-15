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

# GA4 não tem period=week/month nativo — usa faixas relativas (Data API). Mapeia
# os 4 períodos fixos do portal (ADR-007) pra janelas equivalentes, pra o filtro
# funcionar em /analytics/ms-digital igual ao Portal Único.
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
    navegadores, dispositivos, horarios, cidades = {}, {}, {}, {}
    paginas, buscas = {}, {}
    for chave, (p, d) in PERIODOS_FIXOS.items():
        navegadores[chave] = t_matomo.top_n_with_others(matomo.get_browsers(p, d), "navegador", 4)
        dispositivos[chave] = t_matomo.top_n_with_others(matomo.get_device_type(p, d), "dispositivo", 2)
        horarios[chave] = t_matomo.visit_time(matomo.get_visit_time(p, d))
        cidades[chave] = t_matomo.cities_ms(matomo.get_city(p, d, limit=200))

        # Páginas/busca precisam reagir ao filtro de período igual aos acima —
        # antes ficavam fixas em period="month" (bug: aba não mudava com o
        # radio da sidebar). page_urls_raw é reusado por ambas, 1 chamada.
        page_urls_raw = matomo.get_page_urls(p, d, limit=-1)
        paginas[chave] = t_matomo.top_pages(page_urls_raw, n=20)
        busca_nativa = t_matomo.search_keywords(matomo.get_site_search_keywords(p, d, limit=50))
        busca_urls = t_matomo.search_from_urls(page_urls_raw)
        buscas[chave] = t_matomo.merge_search(busca_nativa, busca_urls, n=20)

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

    validate_period_breakdown(paginas, ["url", "visitas"], ["visitas"])
    publish("matomo", "paginas-mais-acessadas", paginas)
    print(f"[matomo] paginas -> {[(k, len(v)) for k, v in paginas.items()]}")

    validate_period_breakdown(buscas, ["termo", "buscas"], ["buscas"])
    publish("matomo", "busca", buscas)
    print(f"[matomo] busca -> {[(k, len(v)) for k, v in buscas.items()]}")

    # 920 dias cobre desde 01/01/2024 até hoje — usuário precisa comparar
    # "Ano" com o ano anterior completo, 370 dias só ia até jul/2025.
    diarias = t_matomo.visits_daily(matomo.get_visits_summary_daily(days=920))
    validate_rows(diarias, required=["data", "visitas"], non_negative=["visitas", "visitantesUnicos", "acoes"])
    publish("matomo", "visitas-diarias", diarias)
    print(f"[matomo] visitas-diarias -> {len(diarias)} dias")


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


def run_matomo_jornada() -> None:
    """Fluxo de navegação — 2 relatórios leves (não N+1), porta de
    matomo-analytics-dashboard/views/portal/tab4_jornada.py:
    - Portas de Entrada: Actions.getEntryPageUrls, 1 chamada por período.
    - Fuga do Hub: Actions.getOutlinks, 1 chamada por período.
    ("Padrão Comportamental" via Transitions.getTransitionsForPageUrl foi
    removido — endpoint instável no Matomo e period=ano exigia 12 chamadas
    mensais sequenciais, dominando o tempo do run inteiro. Portas de Entrada
    já cobre a mesma pergunta central — por onde o cidadão começa a navegar.)"""
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


def run_sites() -> None:
    """Relação de sites monitorados no Matomo (SitesManager) — alimenta o menu
    "Sites". Estático (a lista muda pouco), sem recorte por período."""
    dados = t_matomo.sites(matomo.get_sites())
    validate_rows(dados, required=["idsite", "nome", "url"], non_negative=["idsite"])
    out = publish("matomo", "sites", dados)
    print(f"[matomo] sites -> {out} ({len(dados)} sites)")


def run_cartas() -> None:
    from extract import cartas
    from transform import servicos_cartas as t_servicos

    raw = cartas.get_inventario()

    resumo = t_servicos.resumo_geral(raw)
    validate_rows([resumo], required=["total", "ativos"], non_negative=["total", "ativos", "inativos", "digitais"])
    out = publish("cartas", "inventario-resumo", [resumo])
    print(f"[cartas] resumo -> {out} ({resumo})")

    orgaos = t_servicos.por_orgao(raw)
    validate_rows(orgaos, required=["orgao", "total"], non_negative=["total", "ativos", "digitais", "percentDigital"])
    out2 = publish("cartas", "inventario-por-orgao", orgaos)
    print(f"[cartas] por-orgao -> {out2} ({len(orgaos)} órgãos)")

    categorias = t_servicos.por_categoria(raw)
    validate_rows(categorias, required=["categoria", "total"], non_negative=["total", "ativos", "digitais", "percentDigital"])
    out3 = publish("cartas", "inventario-por-categoria", categorias)
    print(f"[cartas] por-categoria -> {out3} ({len(categorias)} categorias)")

    relacao = t_servicos.relacao(raw)
    validate_rows(relacao, required=["titulo", "orgao"], non_negative=[])
    out4 = publish("cartas", "inventario-relacao", relacao)
    print(f"[cartas] relacao -> {out4} ({len(relacao)} cartas)")


def run_qualidade() -> None:
    from extract import qualidade
    from transform import qualidade as t_qualidade

    erros = qualidade.get_erros()

    resumo = t_qualidade.resumo_erros(erros)
    validate_rows([resumo], required=["total", "atendidos"], non_negative=["total", "atendidos", "pendentes", "tempoMedioResolucaoDias"])
    out = publish("cartas", "erros-resumo", [resumo])
    print(f"[qualidade] erros-resumo -> {out} ({resumo})")

    por_orgao = t_qualidade.por_orgao(erros)
    validate_rows(por_orgao, required=["orgao", "orgaoSigla", "total"], non_negative=["total", "atendidos", "pendentes", "tempoMedioResolucaoDias"])
    out2 = publish("cartas", "erros-por-orgao", por_orgao)
    print(f"[qualidade] erros-por-orgao -> {out2} ({len(por_orgao)} órgãos)")

    evolucao = t_qualidade.evolucao_mensal(erros)
    validate_rows(evolucao, required=["mes"], non_negative=["abertos", "resolvidos"])
    out3 = publish("cartas", "erros-evolucao-mensal", evolucao)
    print(f"[qualidade] erros-evolucao-mensal -> {out3} ({len(evolucao)} meses)")

    relacao = t_qualidade.relacao(erros)
    validate_rows(relacao, required=["id", "servico", "slugServico", "orgao", "orgaoSigla", "atendido", "diasAberto"], non_negative=["diasAberto"])
    out5 = publish("cartas", "erros-relacao", relacao)
    print(f"[qualidade] erros-relacao -> {out5} ({len(relacao)} erros)")

    votos = qualidade.get_votos()
    avaliacoes_info = qualidade.get_avaliacao_informacao()
    percepcao = t_qualidade.resumo_percepcao(votos, avaliacoes_info)
    validate_rows([percepcao], required=["totalVotos", "totalAvaliacoesClareza"], non_negative=["csatMedia", "totalVotos", "clarezaPositivaPct", "totalAvaliacoesClareza"])
    out4 = publish("cartas", "percepcao-resumo", [percepcao])
    print(f"[qualidade] percepcao-resumo -> {out4} ({percepcao})")

    percepcao_orgao = t_qualidade.percepcao_por_orgao(votos, avaliacoes_info)
    validate_rows(percepcao_orgao, required=["orgao", "orgaoSigla", "totalVotos"], non_negative=["totalVotos"])
    out_po = publish("cartas", "percepcao-por-orgao", percepcao_orgao)
    print(f"[qualidade] percepcao-por-orgao -> {out_po} ({len(percepcao_orgao)} órgãos)")


if __name__ == "__main__":
    for nome, fn in [
        ("matomo", run_matomo),
        ("matomo_perfil", run_matomo_perfil),
        ("matomo_perfil_filtro", run_matomo_perfil_filtro),
        ("matomo_jornada", run_matomo_jornada),
        ("ga4", run_ga4),
        ("ga4_perfil", run_ga4_perfil),
        ("sites", run_sites),
        ("cartas", run_cartas),
        ("qualidade", run_qualidade),
    ]:
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 — fonte indisponível não derruba as outras
            print(f"[{nome}] FALHOU: {exc}")
