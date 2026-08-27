"""POC do pipeline extract -> validate -> publish, 1 dataset por fonte.

Uso: python data-platform/run.py

Prova o padrão de ponta a ponta contra as fontes reais antes de generalizar
pros ~15 datasets do Fase 2 completo (ver docs/fases/03-fase-2-data-platform.md).
Cartas (Postgres) exige VPN da SETDIG — se falhar, o script registra e segue
(fonte indisponível não deve derrubar as outras duas).
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

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
    paginas, buscas, buscas_total = {}, {}, {}
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
        # limit=-1 (não 50): o total de buscas só é real se a extração não
        # truncar na origem — senão buscas_total ainda sairia subestimado.
        busca_nativa = t_matomo.search_keywords(matomo.get_site_search_keywords(p, d, limit=-1))
        busca_urls = t_matomo.search_from_urls(page_urls_raw)
        buscas[chave], buscas_total[chave] = t_matomo.merge_search(busca_nativa, busca_urls, n=20)

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

    # Total de buscas ANTES do corte pro top-20 (aditivo — busca.json não
    # muda de shape) — sem ele, participacaoPct do termo líder era calculado
    # só sobre os 20 mais buscados (ver AGENTS.md "BI de gestão").
    publish("matomo", "busca-total", buscas_total)
    print(f"[matomo] busca-total -> {buscas_total}")

    # 920 dias cobre desde 01/01/2024 até hoje — usuário precisa comparar
    # "Ano" com o ano anterior completo, 370 dias só ia até jul/2025.
    diarias = t_matomo.visits_daily(matomo.get_visits_summary_daily(days=920))
    validate_rows(diarias, required=["data", "visitas"], non_negative=["visitas", "visitantesUnicos", "acoes"])
    publish("matomo", "visitas-diarias", diarias)
    print(f"[matomo] visitas-diarias -> {len(diarias)} dias")


def _ler_inventario_cartas() -> list[dict]:
    """Lê o inventário de cartas JÁ PUBLICADO em datasets/ (não o Postgres) —
    não exige VPN e não acopla esta função ao job de cartas (run_cartas). Sem
    o arquivo ainda publicado (1ª execução), segue sem inventário: os dois
    datasets aqui caem no fallback sem nome/órgão resolvido (ADR-012)."""
    caminho = Path(__file__).resolve().parent.parent / "datasets" / "cartas" / "v1" / "inventario-relacao.json"
    if not caminho.exists():
        print("[matomo] aviso: inventario-relacao.json ainda não publicado — servicos-mais-acessados/demanda-por-orgao sem nome/órgão resolvido")
        return []
    return json.loads(caminho.read_text(encoding="utf-8"))


def run_matomo_perfil_filtro() -> None:
    """Adoção do filtro de Perfil do Portal Único (estudo portado do bench-carta).

    1 snapshot getPageUrls por período fixo (ADR-007) — leve mesmo em period=year.
    O cálculo (catálogo de serviços, atribuíveis, taxa corrigida) vive em
    transform/perfil.py; aqui só orquestra extract -> transform -> validate -> publish.
    """
    from transform import perfil as t_perfil
    from transform import servicos as t_servicos

    inventario = _ler_inventario_cartas()

    saida = {}
    mais_acessados = {}
    demanda_orgao = {}
    for chave, (p, d) in PERIODOS_FIXOS.items():
        raw = matomo.get_page_urls(p, d, limit=-1)
        saida[chave] = t_perfil.build_periodo(raw)
        # Reusa o mesmo snapshot pra ranquear os serviços REAIS mais acessados
        # do portal (não só os do filtro de Perfil) e pra medir demanda por órgão.
        mais_acessados[chave] = t_servicos.top_servicos_acessados(raw, inventario, n=15)
        demanda_orgao[chave] = t_servicos.demanda_por_orgao(raw, inventario)

    t_perfil.validar(saida)
    publish("matomo", "perfil-filtro", saida)
    print(f"[matomo] perfil-filtro -> {[(k, saida[k]['resumo']['usoRealPct']) for k in saida]}")

    validate_period_breakdown(mais_acessados, ["servico", "path", "visitas"], ["visitas"])
    publish("matomo", "servicos-mais-acessados", mais_acessados)
    print(f"[matomo] servicos-mais-acessados -> {[(k, len(v)) for k, v in mais_acessados.items()]}")

    validate_period_breakdown(demanda_orgao, ["orgaoSigla", "orgao", "visitas"], ["visitas"])
    publish("matomo", "demanda-por-orgao", demanda_orgao)
    print(f"[matomo] demanda-por-orgao -> {[(k, len(v)) for k, v in demanda_orgao.items()]}")


_LOGS_DIR = Path(__file__).resolve().parent.parent / "datasets" / "_logs"


def _dominios_por_orgao(cartas: list[dict]) -> dict[str, list[str]]:
    """Agrupa domínio-base de `urlExterno` por `orgaoSigla` — monta o segment
    do Matomo (1 chamada por órgão, `outlinkUrl=@dominio` em OR)."""
    out: dict[str, set[str]] = {}
    for c in cartas:
        url = (c.get("urlExterno") or c.get("url_externo") or "").strip()
        sigla = c.get("orgaoSigla") or c.get("orgao_sigla") or "SEM_ORGAO"
        if not url:
            continue
        try:
            dom = urlparse(url).netloc.lower().strip()
        except Exception:  # noqa: BLE001
            continue
        if not dom:
            continue
        out.setdefault(sigla, set()).add(dom)
    return {k: sorted(v) for k, v in out.items()}


def _cartas_por_orgao(cartas: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for c in cartas:
        sigla = c.get("orgaoSigla") or c.get("orgao_sigla") or "SEM_ORGAO"
        out.setdefault(sigla, []).append(c)
    return out


def _logar_falha_orgao(orgao: str, periodo: str, contexto: str, erro: Exception) -> None:
    """Falha de UMA chamada Matomo (órgão × período) — grava JSONL append.
    Serve pro time saber quais órgãos ficaram sem dado na rodada; painel
    trata órgão ausente como 'sem dado', padrão existente."""
    _LOGS_DIR.mkdir(parents=True, exist_ok=True)
    linha = json.dumps(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "contexto": contexto,
            "orgao": orgao,
            "periodo": periodo,
            "erro": f"{type(erro).__name__}: {erro}",
        },
        ensure_ascii=False,
    )
    with open(_LOGS_DIR / "matomo-cartas-falhas.jsonl", "a", encoding="utf-8") as f:
        f.write(linha + "\n")


def run_matomo_acessos_botao(_legacy_kwarg: int | None = None) -> None:
    """Cliques em "Acessar serviço" + pageviews/visitas da carta, quebrado em
    1 chamada Matomo por órgão × período. Fix do bug de 2026-08 (ano < mes):
    `get_outlinks_flat` site-wide com `filter_limit=5000` truncava period=ano
    (mais outlinks distintos que mês → cartas fora do top-5000 sumiam).

    Agora: `outlinkUrl=@dominio-do-orgao` em segment, `filter_limit=-1`, 1
    chamada por órgão. Falha em um órgão grava linha em
    `datasets/_logs/matomo-cartas-falhas.jsonl` e segue os demais (publish
    parcial — órgão ausente vira "sem dado" no painel, padrão existente).

    Publica dois datasets:
      * `acessos-botao-servico.json` (legado, só cliques) — mantido por 1
        rodada pra transição do frontend.
      * `acessos-cartas-completo.json` (novo) — pageviews + visitas +
        visitantes únicos + cliques + taxa de conversão por carta.

    `_legacy_kwarg`: aceita mas ignora o antigo `min_views`.
    """
    inventario = _ler_inventario_cartas()
    if not inventario:
        print("[matomo] acessos-botao: pulando (inventário ausente)")
        return

    com_url_externo = [
        c for c in inventario
        if c.get("ativo") and c.get("slug") and (c.get("urlExterno") or c.get("url_externo"))
    ]
    if not com_url_externo:
        print("[matomo] acessos-botao: nenhuma carta ativa tem `urlExterno` — rode `run_cartas` primeiro.")
        return

    dominios_orgao = _dominios_por_orgao(com_url_externo)
    cartas_orgao = _cartas_por_orgao(com_url_externo)
    print(
        f"[matomo] acessos-botao: {len(com_url_externo)} cartas ativas, "
        f"{len(dominios_orgao)} órgãos, {sum(len(v) for v in dominios_orgao.values())} domínios únicos"
    )

    acessos_legado = {"dia": [], "semana": [], "mes": [], "ano": []}
    acessos_completo = {"dia": [], "semana": [], "mes": [], "ano": []}
    total_cliques_orgao: dict[str, dict[str, int]] = {}

    for chave, (p, d) in PERIODOS_FIXOS.items():
        for sigla, dominios in dominios_orgao.items():
            segment_out = ",".join(f"outlinkUrl=@{dom}" for dom in dominios)
            try:
                outlinks = matomo.get_outlinks_segmented(p, d, segment_out)
            except Exception as exc:  # noqa: BLE001
                _logar_falha_orgao(sigla, chave, "outlinks", exc)
                print(f"[matomo] acessos-botao {chave}/{sigla}: outlinks FALHOU -> {exc}")
                continue

            linhas_cliques = t_matomo.acessos_botao_servico_por_url(outlinks, cartas_orgao[sigla])
            acessos_legado[chave].extend(linhas_cliques)

            # Pageviews da carta em portal-ms.gov.br: 1 segment por órgão,
            # slugs das cartas do órgão em OR. Se falhar, publica só cliques
            # pra esse órgão (pageviews=0, taxaConversao=null).
            slugs = [c["slug"] for c in cartas_orgao[sigla]]
            try:
                segment_page = ",".join(f"pageUrl=@{slug}" for slug in slugs)
                pageviews_raw = matomo.get_page_urls_segmented(p, d, segment_page)
            except Exception as exc:  # noqa: BLE001
                _logar_falha_orgao(sigla, chave, "pageviews", exc)
                print(f"[matomo] acessos-botao {chave}/{sigla}: pageviews FALHOU -> {exc}")
                pageviews_raw = []

            linhas_completas = t_matomo.acessos_completos_por_carta(
                pageviews_raw, linhas_cliques, cartas_orgao[sigla]
            )
            acessos_completo[chave].extend(linhas_completas)

            total_cliques_orgao.setdefault(sigla, {})[chave] = sum(l["cliques"] for l in linhas_cliques)

        acessos_legado[chave].sort(key=lambda r: -r["cliques"])
        acessos_completo[chave].sort(key=lambda r: -r.get("cliques", 0))
        print(f"[matomo] acessos-botao {chave} -> {len(acessos_legado[chave])} cartas com cliques")

    if all(len(v) == 0 for v in acessos_legado.values()):
        print("[matomo] acessos-botao-servico: abortando publish (todas chaves vazias — Matomo indisponível). Dataset anterior preservado.")
        return

    # Invariante: ano >= mes por órgão (bug reportado). Tolera 5% de drift
    # (cliques novos podem entrar no Matomo entre a chamada de mes e ano).
    violacoes = []
    for sigla, por_periodo in total_cliques_orgao.items():
        ano = por_periodo.get("ano", 0)
        mes = por_periodo.get("mes", 0)
        if ano < mes * 0.95:
            violacoes.append(f"{sigla}: ano={ano} < mes={mes} (>5% drift)")
    if violacoes:
        print("[matomo] acessos-botao: VIOLAÇÃO invariante ano>=mes:\n  " + "\n  ".join(violacoes))
        for v in violacoes:
            _logar_falha_orgao(v.split(":")[0], "ano", "invariante", RuntimeError(v))

    validate_period_breakdown(
        acessos_legado,
        ["slug", "titulo", "urlExterno", "cliques"],
        ["cliques"],
    )
    publish("matomo", "acessos-botao-servico", acessos_legado)
    print(f"[matomo] acessos-botao-servico -> {[(k, len(v)) for k, v in acessos_legado.items()]}")

    validate_period_breakdown(
        acessos_completo,
        ["slug", "titulo", "urlExterno", "cliques", "pageviews", "visitas", "visitantesUnicos"],
        ["cliques", "pageviews", "visitas", "visitantesUnicos"],
    )
    publish("matomo", "acessos-cartas-completo", acessos_completo)
    print(f"[matomo] acessos-cartas-completo -> {[(k, len(v)) for k, v in acessos_completo.items()]}")


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

    # Geografia GA4 — cidades onde o app foi aberto (dimension `city`). Aparece
    # em PerfilTab, separado do mapa BD (aba Contas). Ver Ext5 no plano.
    geografia_ga4 = {}
    for chave, (start, end) in GA4_PERIODOS.items():
        geografia_ga4[chave] = ga4.get_city(start, end)
    validate_period_breakdown(geografia_ga4, ["cidade", "visitas"], ["visitas"])
    publish("ga4", "geografia", geografia_ga4, version="v2")
    print(f"[ga4] geografia -> {[(k, len(v)) for k, v in geografia_ga4.items()]}")

    # Cadência de retorno: DAU/WAU/MAU + retenção cohort D1/D7/D30 (ver plano
    # ~/.claude/plans/feature-levantamento-e-sequential-pie.md § Extensão 1).
    from transform import frequencia as t_freq
    sticky = ga4.get_ativos_janela()
    cohort = ga4.get_cohort_semanal_retencao()
    freq = t_freq.calcular_cadencia(sticky, cohort)
    validate_rows([freq], required=["ativosMes"], non_negative=[
        "ativosHoje", "ativosSemana", "ativosMes", "totalUsuariosMes", "sessoesMes",
        "stickinessPct", "fidelidadeSemanaPct", "sessoesPorUsuario",
        "cohortTamanho", "retencaoD1Pct", "retencaoD7Pct", "retencaoD30Pct",
    ])
    publish("ga4", "frequencia-acesso", [freq], version="v2")
    print(f"[ga4] frequencia-acesso -> {freq}")


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


def run_msdigital_db() -> None:
    """Cadastro do app MS Digital (SQL Server) — exige VPN.

    Alimenta a aba "Contas" em analytics/ms-digital/. Snapshot único (não
    reage ao filtro de período — ver decisão no plano
    ~/.claude/plans/feature-levantamento-e-sequential-pie.md e
    docs/msdigital/spec-contas.md).
    """
    from extract import msdigital_db
    from transform import msdigital as t_ms

    contas = msdigital_db.get_contas()
    matriculas = msdigital_db.get_matriculas_count()

    diarias = t_ms.contas_por_dia(msdigital_db.get_contas_por_dia())
    validate_rows(diarias, required=["data", "criadas", "ativas"],
                  non_negative=["criadas", "ativas"])
    publish("msdigital-db", "contas-criadas-por-dia", diarias)
    print(f"[msdigital-db] diarias -> {len(diarias)} dias")

    r = t_ms.resumo(contas, matriculas)
    validate_rows([r], required=["contasTotal", "contasAtivas", "matriculas"],
                  non_negative=["contasTotal", "contasAtivas", "matriculas", "taxaAtivacaoPct"])
    publish("msdigital-db", "contas-resumo", [r])
    print(f"[msdigital-db] resumo -> {r}")

    por_ano = t_ms.contas_por_ano(contas)
    validate_rows(por_ano, required=["ano", "criadas", "ativas"],
                  non_negative=["criadas", "ativas"])
    publish("msdigital-db", "contas-por-ano", por_ano)
    print(f"[msdigital-db] por-ano -> {len(por_ano)} anos")

    faixa = t_ms.contas_por_faixa_etaria(contas)
    validate_rows(faixa, required=["faixa", "quantidade"], non_negative=["quantidade"])
    publish("msdigital-db", "contas-por-faixa-etaria", faixa)
    print(f"[msdigital-db] faixa-etaria -> {len(faixa)} buckets")

    cidades = t_ms.contas_ativas_por_cidade(contas)
    validate_rows(cidades, required=["cidade", "ativas"], non_negative=["ativas"])
    publish("msdigital-db", "contas-por-cidade", cidades)
    print(f"[msdigital-db] cidades -> {len(cidades)} municípios")

    faixas = t_ms.faixas_de_acesso(contas)
    validate_rows(faixas, required=["faixa", "quantidade", "percentPct"],
                  non_negative=["quantidade", "percentPct"])
    publish("msdigital-db", "faixas-de-acesso", faixas)
    print(f"[msdigital-db] faixas-de-acesso -> {[(r['faixa'], r['quantidade']) for r in faixas]}")

    tipo_login = t_ms.contas_por_tipo_login(contas)
    validate_rows(tipo_login, required=["tipo", "quantidade"], non_negative=["quantidade"])
    publish("msdigital-db", "tipo-login", tipo_login)
    print(f"[msdigital-db] tipo-login -> {tipo_login}")

    faixas_por_tipo = t_ms.faixas_de_acesso_por_tipo(contas)
    validate_rows(faixas_por_tipo, required=["faixa", "govbr", "proprio", "total"],
                  non_negative=["govbr", "proprio", "total"])
    publish("msdigital-db", "faixas-de-acesso-por-tipo", faixas_por_tipo)
    print(f"[msdigital-db] faixas-de-acesso-por-tipo -> {[(r['faixa'], r['govbr'], r['proprio']) for r in faixas_por_tipo]}")


def run_portal_unico_db() -> None:
    """Total de usuários únicos que já acessaram o Portal Único (app_id=36).

    Fonte: `controlador_prd.public.authentication_historicologin` (Postgres,
    VPN). Um número absoluto histórico — sem filtro de data, sem breakdown
    por período. Alimenta card na Visão Geral do Portal Único (não reage
    ao filtro).
    """
    from extract import portal_unico_db as pu

    total = pu.contar_usuarios_total()
    payload = {"total": total, "referencia": datetime.now(timezone.utc).isoformat()}
    validate_rows([payload], required=["total", "referencia"], non_negative=["total"])
    publish("portal-unico", "cadastros", [payload])
    print(f"[portal-unico-db] cadastros -> {total} usuários únicos")


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


def run_portal_unico() -> None:
    from extract import portal_unico_db
    from transform import portal_unico as t_pu
    from dateutil.relativedelta import relativedelta
    
    hoje = datetime.now(timezone.utc).date()
    
    # Define as janelas anteriores
    janelas = {
        "dia": hoje - relativedelta(days=1),
        "semana": hoje - relativedelta(weeks=1),
        "mes": hoje - relativedelta(months=1),
        "ano": hoje - relativedelta(years=1)
    }
    
    try:
        total_hoje = portal_unico_db.contar_usuarios_ate(hoje)
        
        contagens = {}
        for chave, data_anterior in janelas.items():
            total_anterior = portal_unico_db.contar_usuarios_ate(data_anterior)
            contagens[chave] = {
                "atual": total_hoje,
                "anterior": total_anterior
            }
    except Exception as exc:
        print(f"[portal-unico] Falha na conexão com banco (sem VPN?): {exc}")
        caminho = Path(__file__).resolve().parent.parent / "datasets" / "portal-unico" / "v1" / "cadastros.json"
        if not caminho.exists():
            print("[portal-unico] cadastros.json ainda não publicado.")
        else:
            print("[portal-unico] usando fallback do JSON existente.")
        return

    breakdown = t_pu.build_cadastros_breakdown(contagens)
    
    for k, v in breakdown.items():
        validate_rows(v, required=["referencia", "valor"], non_negative=["valor"])
        
    out = publish("portal-unico", "cadastros", breakdown)
    print(f"[portal-unico] cadastros -> {out}")


def run_matomo_eventos_perfil() -> None:
    from extract import matomo
    from transform import eventos_perfil as t_eventos
    
    eventos_aba_brutos = {}
    eventos_servico_brutos = {}
    
    for chave, (period, date) in PERIODOS_FIXOS.items():
        abas = matomo.get_event_names(period, date, segment="eventCategory==Navegacao_Perfil,eventAction==Clique_Aba")
        servicos = matomo.get_event_names(period, date, segment="eventCategory==Navegacao_Perfil,eventAction==Clique_Servico")
        eventos_aba_brutos[chave] = abas
        eventos_servico_brutos[chave] = servicos
        
    breakdown = t_eventos.build_eventos_breakdown(eventos_aba_brutos, eventos_servico_brutos)
    
    t_eventos.validar(breakdown)
    
    out = publish("matomo", "eventos-perfil-navegacao", breakdown)
    print(f"[matomo] eventos-perfil-navegacao -> {out}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", type=str, help="Domínio específico para rodar")
    args = parser.parse_args()

    todas_as_funcoes = [
        ("matomo", run_matomo),
        ("matomo_perfil", run_matomo_perfil),
        ("matomo_perfil_filtro", run_matomo_perfil_filtro),
        ("matomo_eventos_perfil", run_matomo_eventos_perfil),
        ("matomo_jornada", run_matomo_jornada),
        ("matomo_acessos_botao", run_matomo_acessos_botao),
        ("matomo-cartas", run_matomo_acessos_botao), # alias para o plano SGD
        ("ga4", run_ga4),
        ("ga4_perfil", run_ga4_perfil),
        ("sites", run_sites),
        ("cartas", run_cartas),
        ("qualidade", run_qualidade),
        ("msdigital_db", run_msdigital_db),
        ("portal_unico_db", run_portal_unico_db),
        ("portal_unico", run_portal_unico),
    ]
    
    if args.domain:
        alvo = [item for item in todas_as_funcoes if item[0] == args.domain]
        if not alvo:
            print(f"Domínio {args.domain} não encontrado.")
            sys.exit(1)
        todas_as_funcoes = alvo

    for nome, fn in todas_as_funcoes:
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 — fonte indisponível não derruba as outras
            print(f"[{nome}] FALHOU: {exc}")
