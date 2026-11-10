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


def _eh_revisao(acao: str) -> bool:
    return acao == "Revisão"


def atualizacoes_por_ano(hist: list[dict]) -> list[dict]:
    """Por ano: cartas alteradas (distintas) e cartas revisadas (distintas).

    Volume bruto de alterações saiu do escopo: gerava confusão para o gestor
    (uma mesma carta mudada várias vezes aparecia como se fosse muito trabalho novo).
    """
    anos: dict[int, dict] = {}
    for r in hist:
        ano = r["dia"].year
        a = anos.setdefault(ano, {"ano": ano, "_cartas": set(), "_revisadas": set()})
        a["_cartas"].add(r["servico_id"])
        if _eh_revisao(r["acao"]):
            a["_revisadas"].add(r["servico_id"])
    return [
        {"ano": a["ano"], "cartasAlteradas": len(a["_cartas"]), "cartasRevisadas": len(a["_revisadas"])}
        for a in sorted(anos.values(), key=lambda x: x["ano"])
    ]


def atualizacoes_diarias(hist: list[dict]) -> list[dict]:
    """1 linha por carta e dia, compacta, para o front recortar pelo período do filtro.

    d = dia, s = id da carta, o = sigla do órgão, r = 1 se houve revisão nesse dia, 0 caso contrário.
    Só precisamos de distinct cartas e distinct revisadas no período — o volume de
    alterações não é mais exposto no BI (ver atualizacoes_por_ano).
    """
    dias: dict[tuple, dict] = {}
    for r in hist:
        k = (r["dia"].isoformat(), r["servico_id"])
        x = dias.setdefault(k, {"d": k[0], "s": r["servico_id"], "o": r["orgao_sigla"] or r["orgao"], "r": 0})
        if _eh_revisao(r["acao"]):
            x["r"] = 1
    return sorted(dias.values(), key=lambda x: (x["d"], x["s"]))
