"""Inventário de cartas de serviço (ADR-005: domínio Serviços).

Só agrega o inventário cru do Postgres em resumo/por-órgão/por-categoria/relação.
A DEMANDA (visitas) não vem daqui — é calculada ao vivo cruzando com o Matomo
(src/lib/server/cartas-visitas.ts, ADR-010), porque reage ao período.
"""
from __future__ import annotations


def resumo_geral(rows: list[dict]) -> dict:
    ativos = [r for r in rows if r["ativo"]]
    digitais = [r for r in ativos if r["digital"] or r["online"]]
    hibridos = [
        r for r in digitais if (r["digital"] or r["online"]) and (r["agendavel"] or r["acesso_externo"])
    ]
    total_ativos = len(ativos)
    return {
        "total": len(rows),
        "ativos": total_ativos,
        "inativos": len(rows) - total_ativos,
        "digitais": len(digitais),
        "presenciais": total_ativos - len(digitais),
        "hibridos": len(hibridos),
        "percentDigital": round(100 * len(digitais) / total_ativos, 1) if total_ativos else 0,
    }


def por_orgao(rows: list[dict]) -> list[dict]:
    agrupado: dict[str, list[dict]] = {}
    for r in rows:
        agrupado.setdefault(r["orgao"], []).append(r)

    saida = []
    for orgao, itens in agrupado.items():
        ativos = [r for r in itens if r["ativo"]]
        digitais = [r for r in ativos if r["digital"] or r["online"]]
        total_ativos = len(ativos)
        saida.append(
            {
                "orgao": orgao,
                "orgaoSigla": itens[0]["orgao_sigla"],
                "total": len(itens),
                "ativos": total_ativos,
                "digitais": len(digitais),
                "percentDigital": round(100 * len(digitais) / total_ativos, 1) if total_ativos else 0,
            }
        )
    return sorted(saida, key=lambda x: x["total"], reverse=True)


def por_categoria(rows: list[dict]) -> list[dict]:
    agrupado: dict[str, list[dict]] = {}
    for r in rows:
        categoria = r["categoria_slug"] or "sem-categoria"
        agrupado.setdefault(categoria, []).append(r)

    saida = []
    for categoria, itens in agrupado.items():
        ativos = [r for r in itens if r["ativo"]]
        digitais = [r for r in ativos if r["digital"] or r["online"]]
        total_ativos = len(ativos)
        saida.append(
            {
                "categoria": categoria,
                "total": len(itens),
                "ativos": total_ativos,
                "digitais": len(digitais),
                "percentDigital": round(100 * len(digitais) / total_ativos, 1) if total_ativos else 0,
            }
        )
    return sorted(saida, key=lambda x: x["total"], reverse=True)


def _iso(valor) -> str | None:
    return valor.isoformat() if valor else None


def relacao(rows: list[dict]) -> list[dict]:
    return [
        {
            "titulo": r["titulo"],
            "nomePopular": r["nome_popular"],
            "slug": r["slug"],
            "orgao": r["orgao"],
            "orgaoSigla": r["orgao_sigla"],
            "setor": r.get("setor"),
            "categoria": r["categoria_slug"],
            "publico": r["publico"],
            "publicoEspecifico": list(r["publico_especifico"]) if r["publico_especifico"] else [],
            "ativo": r["ativo"],
            "digital": r["digital"],
            "online": r["online"],
            "destaque": r["destaque"],
            "custo": r["custo"],
            "tempoTotal": r["tempo_total"],
            "tipoTempo": r["tipo_tempo"],
            "urlExterno": r.get("url_externo"),
            "createdAt": _iso(r.get("created_at")),
            "updatedAt": _iso(r["updated_at"]),
        }
        for r in rows
    ]


def _tipo(acao: str) -> str:
    # ações do Portal/Admin: Criação, Edição, Revisão, Criação/Edição da etapa
    if acao.endswith("etapa"):
        return "etapas"
    return {"Edição": "edicoes", "Revisão": "revisoes", "Criação": "criacoes"}.get(acao, "outras")


def atualizacoes_por_ano(hist: list[dict]) -> list[dict]:
    """Por ano: alterações aprovadas por tipo, cartas alteradas e cartas revisadas."""
    anos: dict[int, dict] = {}
    for r in hist:
        a = anos.setdefault(r["ano"], {"ano": r["ano"], "criacoes": 0, "edicoes": 0, "revisoes": 0,
                                       "etapas": 0, "outras": 0, "_cartas": set(), "_revisadas": set()})
        tipo = _tipo(r["acao"])
        a[tipo] += r["n"]
        a["_cartas"].add(r["servico_id"])
        if tipo == "revisoes":
            a["_revisadas"].add(r["servico_id"])
    saida = []
    for a in sorted(anos.values(), key=lambda x: x["ano"]):
        cartas, revisadas = a.pop("_cartas"), a.pop("_revisadas")
        total = a["criacoes"] + a["edicoes"] + a["revisoes"] + a["etapas"] + a["outras"]
        saida.append({**a, "total": total, "cartasAlteradas": len(cartas), "cartasRevisadas": len(revisadas)})
    return saida


def atualizacoes_por_orgao(hist: list[dict], inventario: list[dict]) -> list[dict]:
    """Órgão × ano: cartas ativas, alteradas e revisadas, e alterações aprovadas."""
    ativas: dict[str, int] = {}
    for r in inventario:
        if r["ativo"] and r.get("titulo"):
            ativas[r["orgao"]] = ativas.get(r["orgao"], 0) + 1
    grupos: dict[tuple, dict] = {}
    for r in hist:
        g = grupos.setdefault((r["ano"], r["orgao"]), {
            "ano": r["ano"], "orgao": r["orgao"], "orgaoSigla": r["orgao_sigla"] or "",
            "alteracoes": 0, "edicoes": 0, "revisoes": 0, "_cartas": set(), "_revisadas": set()})
        tipo = _tipo(r["acao"])
        g["alteracoes"] += r["n"]
        if tipo in ("edicoes", "revisoes"):
            g[tipo] += r["n"]
        g["_cartas"].add(r["servico_id"])
        if tipo == "revisoes":
            g["_revisadas"].add(r["servico_id"])
    saida = []
    for g in grupos.values():
        cartas, revisadas = g.pop("_cartas"), g.pop("_revisadas")
        total = ativas.get(g["orgao"], 0)
        saida.append({**g, "cartasAtivas": total, "cartasAlteradas": len(cartas),
                      "cartasRevisadas": len(revisadas),
                      "percentAlteradas": round(100 * len(cartas) / total, 1) if total else 0})
    return sorted(saida, key=lambda x: (x["ano"], -x["alteracoes"]))
