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
            }
        )
    rows.sort(key=lambda r: r["data"])
    return rows
