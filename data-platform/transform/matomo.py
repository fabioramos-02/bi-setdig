"""Normalização dos payloads Matomo — espelha utils/data_processor.py do repo matomo,
simplificado (sem pandas: só o necessário pra virar JSON de dataset)."""
from __future__ import annotations

import re
from urllib.parse import unquote


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
    """rows já vem flat=1 (get_page_urls) — 1 linha por URL, sem hierarquia."""
    flat = [{"url": r.get("url", r.get("label", "")), "visitas": r.get("nb_visits", 0)} for r in (rows or [])]
    flat.sort(key=lambda r: -r["visitas"])
    return flat[:n]


def search_keywords(rows: list) -> list[dict]:
    """Termos de busca interna (SiteSearch nativo) — filtra ruído de URL
    vazando como termo (mesma regra de
    utils/data_processor.py::process_search_keywords)."""
    out = []
    for r in rows or []:
        termo = (r.get("label") or "").strip()
        if not termo or termo.startswith("/"):
            continue
        out.append({"termo": termo, "buscas": r.get("nb_visits", 0)})
    out.sort(key=lambda r: -r["buscas"])
    return out[:20]


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


def merge_search(nativo: list[dict], de_urls: list[dict], n: int = 20) -> list[dict]:
    """Combina SiteSearch nativo + termos extraídos de URL, somando por termo."""
    somas: dict[str, int] = {}
    for r in [*nativo, *de_urls]:
        somas[r["termo"]] = somas.get(r["termo"], 0) + r["buscas"]
    out = [{"termo": t, "buscas": v} for t, v in somas.items()]
    out.sort(key=lambda r: -r["buscas"])
    return out[:n]


def entry_pages(rows: list, n: int = 10) -> list[dict]:
    """Porta de matomo-analytics-dashboard/views/portal/tab4_jornada.py:90-104 —
    Actions.getEntryPageUrls já devolve label/nb_visits prontos, sem processamento."""
    out = [
        {"pagina": "Home (Index)" if r.get("label") == "/" else r.get("label", ""), "entradas": r.get("nb_visits", 0)}
        for r in (rows or [])
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


def classificar_jornada(url: str) -> str:
    """Porta 1:1 de tab4_jornada.py:157-169 — profundidade de path + lista fixa
    de prefixos, nessa ordem de prioridade. Não é regex nem categoria curada."""
    if not url or url == "/":
        return "Recargas/Outros"
    partes = [p for p in url.split("/") if p]
    if not partes:
        return "Recargas/Outros"
    primeiro = partes[0].lower()
    if primeiro == "buscar" or "q=" in url:
        return "Busca Interna no Portal"
    if primeiro in ("workspace", "login"):
        return "Acesso a Sistemas (Login/Workspace)"
    if primeiro == "noticias":
        return "Notícias"
    if len(partes) == 1:
        return "Exploração por Categoria/Órgão"
    return "Acesso Direto ao Serviço"


def merge_following_pages(respostas: list[dict]) -> list[dict]:
    """Soma followingPages de várias respostas Transitions por label — usado só
    pra period=ano, que estoura no servidor Matomo mesmo com 1 URL fixa (Home);
    o pipeline chama a API mês a mês (12x) e agrega aqui em memória (porta de
    tab4_jornada.py::_load_transitions_annual, sem o progress bar do Streamlit)."""
    somas: dict[str, int] = {}
    for raw in respostas or []:
        for item in (raw or {}).get("followingPages") or []:
            label = item.get("label", "")
            somas[label] = somas.get(label, 0) + item.get("hits", item.get("referrals", 0))
    return [{"label": label, "hits": hits} for label, hits in sorted(somas.items(), key=lambda kv: -kv[1])]


def padrao_comportamental(following_pages: list[dict]) -> dict:
    """Porta de tab4_jornada.py:155-185 — followingPages de
    Transitions.getTransitionsForPageUrl (Home fixa) categorizado por
    classificar_jornada. Retorna distribuição (pro donut) + top-10 (pra
    tabela, exclui 'Recargas/Outros' como o legado faz)."""
    linhas = []
    for item in following_pages or []:
        pagina = (item.get("label") or "").replace("ms.gov.br", "") or "/"
        acessos = item.get("hits", item.get("referrals", 0))
        linhas.append({"pagina": pagina, "tipo": classificar_jornada(pagina), "acessos": acessos})

    total = sum(l["acessos"] for l in linhas) or 1
    por_tipo: dict[str, int] = {}
    for l in linhas:
        por_tipo[l["tipo"]] = por_tipo.get(l["tipo"], 0) + l["acessos"]

    distribuicao = sorted(
        [{"tipo": t, "acessos": v, "participacaoPct": round(v / total * 100, 2)} for t, v in por_tipo.items()],
        key=lambda r: -r["acessos"],
    )
    top_destinos = sorted(
        [l for l in linhas if l["tipo"] != "Recargas/Outros"],
        key=lambda r: -r["acessos"],
    )[:10]
    return {"distribuicao": distribuicao, "topDestinos": top_destinos}


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
