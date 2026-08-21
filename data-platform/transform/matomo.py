"""Normalização dos payloads Matomo — espelha utils/data_processor.py do repo matomo,
simplificado (sem pandas: só o necessário pra virar JSON de dataset)."""
from __future__ import annotations

import re
from urllib.parse import unquote

# Espelhado em src/lib/server/matomo-transform.ts (EXCLUIR_URLS) — manter em
# sincronia. "/login/callback" é o retorno técnico do SSO (OAuth), não página
# real acessada pelo cidadão — mesma classe de ruído filtrada de outlinks().
EXCLUIR_URLS = ("/login/callback",)


def top_n_with_others(rows: list[dict], label_field: str, n: int) -> list[dict]:
    """Mantém os N maiores por nb_visits e soma o resto em 'Outros' (mesma regra
    de utils/data_processor.py::process_browsers/process_device_types)."""
    if not rows:
        return []
    ordenado = sorted(rows, key=lambda r: r.get("nb_visits", 0), reverse=True)
    if len(ordenado) <= n:
        return [{label_field: r.get("label", ""), "visitas": r.get("nb_visits", 0)} for r in ordenado]
    top = ordenado[:n]
    outros = sum(r.get("nb_visits", 0) for r in ordenado[n:])
    result = [{label_field: r.get("label", ""), "visitas": r.get("nb_visits", 0)} for r in top]
    result.append({label_field: "Outros", "visitas": outros})
    return result


def cities_ms(rows: list) -> list[dict]:
    """Filtra só cidades de MS (mesma regra de process_cities_ms)."""
    out: dict[str, int] = {}
    for item in rows or []:
        label = item.get("label", "")
        if "Mato Grosso do Sul" not in label:
            continue
        city = re.sub(r"\s*\(.*?\)", "", label.split(",")[0]).strip()
        out[city] = out.get(city, 0) + item.get("nb_visits", 0)
    return sorted(
        [{"cidade": c, "visitas": v} for c, v in out.items()],
        key=lambda r: -r["visitas"],
    )


def visit_time(rows: list) -> list[dict]:
    return [{"hora": r.get("label", ""), "visitas": r.get("nb_visits", 0)} for r in (rows or [])]


def top_pages(rows: list, n: int = 20) -> list[dict]:
    """rows já vem flat=1 (get_page_urls) — 1 linha por URL, sem hierarquia.
    Exclui URLs técnicas (EXCLUIR_URLS) e nomeia a home de forma legível."""
    flat = [
        {"url": "Página inicial" if r.get("url", r.get("label", "")) == "/" else r.get("url", r.get("label", "")), "visitas": r.get("nb_visits", 0)}
        for r in (rows or [])
        if not any(p in r.get("url", r.get("label", "")) for p in EXCLUIR_URLS)
    ]
    flat.sort(key=lambda r: -r["visitas"])
    return flat[:n]


def search_keywords(rows: list) -> list[dict]:
    """Termos de busca interna (SiteSearch nativo) — filtra ruído de URL
    vazando como termo (mesma regra de
    utils/data_processor.py::process_search_keywords). Não trunca aqui: o
    corte pro top-20 é feito em merge_search, depois de somar com os termos
    extraídos de URL — truncar antes subestimaria o total real de buscas."""
    out = []
    for r in rows or []:
        termo = (r.get("label") or "").strip()
        if not termo or termo.startswith("/"):
            continue
        out.append({"termo": termo, "buscas": r.get("nb_visits", 0)})
    out.sort(key=lambda r: -r["buscas"])
    return out


_Q_RE = re.compile(r"[?/]q=([^&/]+)")


def search_from_urls(page_urls_raw: list) -> list[dict]:
    """Extrai termos de busca de URLs .../buscar/?q=* ou ?q=* (mesma regra de
    utils/data_processor.py::extract_search_from_page_urls) — complementa o
    SiteSearch nativo, que pode não estar habilitado no site. rows já vem
    flat=1, 1 URL completa por linha."""
    somas: dict[str, int] = {}
    for row in page_urls_raw or []:
        url = row.get("url", "")
        m = _Q_RE.search(url)
        if not m:
            continue
        termo = unquote(m.group(1)).strip().lower()
        if termo:
            somas[termo] = somas.get(termo, 0) + row.get("nb_visits", 0)
    out = [{"termo": t, "buscas": v} for t, v in somas.items()]
    out.sort(key=lambda r: -r["buscas"])
    return out


def merge_search(nativo: list[dict], de_urls: list[dict], n: int = 20) -> tuple[list[dict], int]:
    """Combina SiteSearch nativo + termos extraídos de URL, somando por termo.
    Devolve (top-N, total de buscas ANTES do corte) — o total é o que permite
    calcular participação real de um termo, não só sobre a lista truncada
    (ver AGENTS.md "BI de gestão": percentual precisa da base real)."""
    somas: dict[str, int] = {}
    for r in [*nativo, *de_urls]:
        somas[r["termo"]] = somas.get(r["termo"], 0) + r["buscas"]
    out = [{"termo": t, "buscas": v} for t, v in somas.items()]
    out.sort(key=lambda r: -r["buscas"])
    total = sum(somas.values())
    return out[:n], total


def entry_pages(rows: list, n: int = 10) -> list[dict]:
    """Porta de matomo-analytics-dashboard/views/portal/tab4_jornada.py:90-104 —
    Actions.getEntryPageUrls já devolve label/nb_visits prontos, sem processamento.
    Filtra EXCLUIR_URLS — validado contra o portal real (ms.gov.br): soma de
    milhares de callbacks OAuth com querystring distinta (sufixo "- Others" do
    Matomo), não Home nem página real acessada pelo cidadão. Path fica cru
    (sem traduzir "/" pra "Página inicial" aqui) — quem consome (FluxoNavegacaoTab)
    classifica com classificarPagina/ADR-012, que já resolve o rótulo cidadão
    E o tipo (serviço/órgão/página inicial); traduzir cedo demais quebrava
    esse classificador."""
    out = [
        {"pagina": r.get("label", ""), "entradas": r.get("nb_visits", 0)}
        for r in (rows or [])
        if not any(p in r.get("label", "") for p in EXCLUIR_URLS)
    ]
    out.sort(key=lambda r: -r["entradas"])
    return out[:n]


def outlinks(rows: list, n: int = 10) -> list[dict]:
    """Porta de tab4_jornada.py:106-121 — Actions.getOutlinks SEM flat=1 já
    agrupa por domínio no primeiro nível do relatório hierárquico do Matomo
    (não reimplementar parse de domínio via regex/urlparse). Filtra outlink
    espúrio pro próprio SSO (ms.gov.br/login)."""
    out = [
        {"dominio": r.get("label", ""), "saidas": r.get("nb_visits", 0)}
        for r in (rows or [])
        if "ms.gov.br/login" not in r.get("label", "")
    ]
    out.sort(key=lambda r: -r["saidas"])
    return out[:n]


def acessos_botao_servico_por_url(outlinks_flat: list[dict], inventario: list[dict]) -> list[dict]:
    """Cliques em "Acessar serviço" por carta — método `Actions.getOutlinks?flat=1`.

    1 chamada Matomo devolve `[{label, url, nb_visits}]` de TODOS outlinks do
    site (ex. www.meudetran.ms.gov.br/veiculo/consulta-debitos: 118 cliques).
    Cruza com `urlExterno` cadastrado no inventário → cliques por carta.

    Trade-off vs Transitions (método anterior): sem pageviews da carta →
    sem taxa de conversão. Ganho: 1 chamada em vez de N (100-400×). Cobre
    todas cartas com `urlExterno` cadastrado no banco, não só top-N."""
    # Mapa {url_normalizada: cliques} — dedup entre variantes trailing slash,
    # protocolo. Matomo já traz URL crua em `url` (não em `label`, que às vezes
    # perde o esquema — ver acessos-botao real: label="www.meudetran..." mas
    # url="https://www.meudetran...").
    def _norm(u: str | None) -> str:
        if not u:
            return ""
        return u.strip().lower().rstrip("/")

    cliques_por_url: dict[str, int] = {}
    for row in outlinks_flat or []:
        url = _norm(row.get("url") or row.get("label"))
        if not url:
            continue
        cliques_por_url[url] = cliques_por_url.get(url, 0) + int(row.get("nb_visits", 0))

    linhas: list[dict] = []
    for c in inventario:
        if not c.get("ativo") or not c.get("slug"):
            continue
        url_ext = c.get("urlExterno") or c.get("url_externo")
        if not url_ext:
            continue
        url_norm = _norm(url_ext)
        cliques = cliques_por_url.get(url_norm, 0)
        if cliques == 0:
            continue
        linhas.append(
            {
                "slug": c["slug"],
                "titulo": c.get("titulo") or c.get("nomePopular") or c["slug"],
                "orgaoSigla": c.get("orgaoSigla") or c.get("orgao_sigla"),
                "categoria": c.get("categoria") or c.get("categoria_slug"),
                "urlCarta": f"https://www.ms.gov.br/{c.get('categoria') or c.get('categoria_slug', '')}/{c['slug']}",
                "urlExterno": url_ext,
                "cliques": cliques,
            }
        )
    linhas.sort(key=lambda r: -r["cliques"])
    return linhas


def acessos_botao_servico(por_carta: dict[str, dict], inventario: list[dict], n_destinos: int = 5) -> list[dict]:
    """Cliques em links externos ("Acessar serviço") originados de cada carta.

    `por_carta`: {slug: transitions_raw} — 1 chamada Transitions.getTransitionsForAction
    por carta. `transitions_raw.pageMetrics.pageviews` é o denominador (views
    reais da carta); `transitions_raw.outlinks` são os destinos externos com
    `referrals`. `taxaConversaoPct` = cliques/views (regra "número nunca anda
    sozinho" do AGENTS.md — sem denominador, % não diz nada).

    Cartas com view 0 OU sem outlinks caem fora (nada a mostrar). Destinos
    truncados no top-N — resto vira "Outros" (mesmo padrão de top_n_with_others).
    Filtra outlink espúrio pro próprio SSO (ms.gov.br/login) — mesma regra de
    outlinks()."""
    por_slug = {c["slug"]: c for c in inventario if c.get("ativo")}
    linhas: list[dict] = []
    for slug, raw in por_carta.items():
        carta = por_slug.get(slug)
        if not carta or not isinstance(raw, dict):
            continue
        views = int((raw.get("pageMetrics") or {}).get("pageviews", 0))
        outlinks_raw = raw.get("outlinks") or []
        if views == 0 or not outlinks_raw:
            continue
        destinos_ordenados = sorted(
            (
                {"url": (r.get("label") or "").strip(), "cliques": int(r.get("referrals", 0))}
                for r in outlinks_raw
                if r.get("label") and "ms.gov.br/login" not in r.get("label", "")
            ),
            key=lambda r: -r["cliques"],
        )
        if not destinos_ordenados:
            continue
        cliques_totais = sum(d["cliques"] for d in destinos_ordenados)
        if len(destinos_ordenados) > n_destinos:
            top = destinos_ordenados[:n_destinos]
            outros = sum(d["cliques"] for d in destinos_ordenados[n_destinos:])
            destinos = [*top, {"url": "Outros destinos", "cliques": outros}]
        else:
            destinos = destinos_ordenados
        for d in destinos:
            d["pct"] = round(d["cliques"] / cliques_totais * 100, 2) if cliques_totais else 0.0
        linhas.append(
            {
                "slug": slug,
                "titulo": carta.get("titulo") or carta.get("nomePopular") or slug,
                "orgaoSigla": carta.get("orgaoSigla"),
                "categoria": carta.get("categoria"),
                "urlCarta": f"https://www.ms.gov.br/{carta.get('categoria', '')}/{slug}",
                "views": views,
                "cliquesTotais": cliques_totais,
                "taxaConversaoPct": round(cliques_totais / views * 100, 2) if views else 0.0,
                "destinos": destinos,
            }
        )
    linhas.sort(key=lambda r: -r["cliquesTotais"])
    return linhas


def sites(raw: list) -> list[dict]:
    """SitesManager.getSitesWithMinimumAccess -> [{idsite, nome, url}] ordenado
    por nome. Pula site sem main_url (não dá pra linkar). `idsite` vem string
    do Matomo — normaliza pra int."""
    out = []
    for s in raw or []:
        url = (s.get("main_url") or "").strip()
        nome = (s.get("name") or "").strip()
        if not url or not nome:
            continue
        out.append({"idsite": int(s.get("idsite", 0)), "nome": nome, "url": url})
    out.sort(key=lambda r: r["nome"].lower())
    return out


def visits_daily(raw: dict) -> list[dict]:
    """VisitsSummary.get com period=day&date=lastN retorna {data: {...}} por dia."""
    rows = []
    for date, values in (raw or {}).items():
        if not isinstance(values, dict):
            continue
        rows.append(
            {
                "data": date,
                "visitas": values.get("nb_visits", 0),
                "visitantesUnicos": values.get("nb_uniq_visitors", 0),
                "acoes": values.get("nb_actions", 0),
            }
        )
    rows.sort(key=lambda r: r["data"])
    return rows
