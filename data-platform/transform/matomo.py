"""Normalização dos payloads Matomo — espelha utils/data_processor.py do repo matomo,
simplificado (sem pandas: só o necessário pra virar JSON de dataset)."""
from __future__ import annotations

import re


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
    flat = []

    def walk(nodes, prefix=""):
        for node in nodes or []:
            label = node.get("label", "")
            url = node.get("url") or (prefix + "/" + label if prefix else label)
            if "subtable" in node:
                walk(node["subtable"], url)
            else:
                flat.append({"url": url, "visitas": node.get("nb_visits", 0)})

    walk(rows)
    flat.sort(key=lambda r: -r["visitas"])
    return flat[:n]


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
