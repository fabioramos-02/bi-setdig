"""Inventário de cartas de serviço + maturidade digital (ADR-005: domínio Serviços).

Maturidade 0-4: 210 cartas (IAGRO/DETRAN/SEAD) têm classificação REAL, feita
por rubrica humana/LLM com justificativa (vendorizada em
data-platform/reference/maturidade-classificada/, ver README.md lá — fonte é
mapeamento-inicial-servicos-digitais/data/rubrica_maturidade.md). O restante
das cartas usa `nivel_maturidade()`, uma APROXIMAÇÃO determinística a partir
dos booleanos já cadastrados em gerenciamento_servicos — não é classificação
por rubrica. `origem` em cada linha diz qual dos dois foi usado; nunca
esconder isso no front (StoryCard.comoLer).
"""
from __future__ import annotations

import json
from pathlib import Path

REFERENCE_DIR = Path(__file__).resolve().parents[1] / "reference" / "maturidade-classificada"
_ORGAOS_CLASSIFICADOS = ["iagro", "detran", "sead"]


def carregar_classificados() -> dict[int, int]:
    """{id_carta: nivel} a partir dos JSONs vendorizados (chave = id da carta)."""
    classificados: dict[int, int] = {}
    for orgao in _ORGAOS_CLASSIFICADOS:
        path = REFERENCE_DIR / f"{orgao}.json"
        if not path.exists():
            continue
        dados = json.loads(path.read_text(encoding="utf-8"))
        for id_str, entrada in dados.items():
            classificados[int(id_str)] = entrada["nivel"]
    return classificados


def nivel_maturidade(row: dict, classificados: dict[int, int]) -> tuple[int, str]:
    if row["id"] in classificados:
        return classificados[row["id"]], "classificada"

    digital_ou_online = row["digital"] or row["online"]
    agendavel_ou_externo = row["agendavel"] or row["acesso_externo"]

    if not digital_ou_online:
        return (1 if row["url_externo"] else 0), "heuristica"
    if not agendavel_ou_externo:
        return 2, "heuristica"
    return (4 if row["acesso_externo"] else 3), "heuristica"


def resumo_geral(rows: list[dict], classificados: dict[int, int]) -> dict:
    ativos = [r for r in rows if r["ativo"]]
    digitais = [r for r in ativos if r["digital"] or r["online"]]
    hibridos = [
        r for r in digitais if (r["digital"] or r["online"]) and (r["agendavel"] or r["acesso_externo"])
    ]
    total_ativos = len(ativos)

    buckets = {n: 0 for n in range(5)}
    n_classificadas = 0
    for r in ativos:
        nivel, origem = nivel_maturidade(r, classificados)
        buckets[nivel] += 1
        if origem == "classificada":
            n_classificadas += 1

    return {
        "total": len(rows),
        "ativos": total_ativos,
        "inativos": len(rows) - total_ativos,
        "digitais": len(digitais),
        "presenciais": total_ativos - len(digitais),
        "hibridos": len(hibridos),
        "percentDigital": round(100 * len(digitais) / total_ativos, 1) if total_ativos else 0,
        "maturidade": [{"nivel": n, "total": buckets[n]} for n in range(5)],
        "classificadas": n_classificadas,
    }


def por_orgao(rows: list[dict], classificados: dict[int, int]) -> list[dict]:
    agrupado: dict[str, list[dict]] = {}
    for r in rows:
        agrupado.setdefault(r["orgao"], []).append(r)

    saida = []
    for orgao, itens in agrupado.items():
        ativos = [r for r in itens if r["ativo"]]
        digitais = [r for r in ativos if r["digital"] or r["online"]]
        total_ativos = len(ativos)
        niveis_origens = [nivel_maturidade(r, classificados) for r in ativos]
        niveis = [n for n, _ in niveis_origens]
        n_classificadas = sum(1 for _, o in niveis_origens if o == "classificada")
        saida.append(
            {
                "orgao": orgao,
                "orgaoSigla": itens[0]["orgao_sigla"],
                "total": len(itens),
                "ativos": total_ativos,
                "digitais": len(digitais),
                "percentDigital": round(100 * len(digitais) / total_ativos, 1) if total_ativos else 0,
                "maturidadeMedia": round(sum(niveis) / len(niveis), 2) if niveis else 0,
                "classificadas": n_classificadas,
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


def relacao(rows: list[dict], classificados: dict[int, int]) -> list[dict]:
    saida = []
    for r in rows:
        nivel, origem = nivel_maturidade(r, classificados)
        saida.append(
            {
                "titulo": r["titulo"],
                "nomePopular": r["nome_popular"],
                "slug": r["slug"],
                "orgao": r["orgao"],
                "orgaoSigla": r["orgao_sigla"],
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
                "nivelMaturidade": nivel,
                "maturidadeOrigem": origem,
                "updatedAt": r["updated_at"].isoformat() if r["updated_at"] else None,
            }
        )
    return saida


def jornada_resumo(etapas: list[dict]) -> dict:
    por_servico: dict[int, int] = {}
    por_canal: dict[str, int] = {}
    for e in etapas:
        canal = e["canal_prestacao"] or "não informado"
        por_canal[canal] = por_canal.get(canal, 0) + 1
        por_servico[e["servico_id"]] = por_servico.get(e["servico_id"], 0) + 1

    n_servicos = len(por_servico)
    media_etapas = round(sum(por_servico.values()) / n_servicos, 2) if n_servicos else 0

    return {
        "totalEtapas": len(etapas),
        "servicosComJornada": n_servicos,
        "mediaEtapasPorServico": media_etapas,
        "porCanal": [{"canal": c, "total": t} for c, t in sorted(por_canal.items(), key=lambda x: -x[1])],
    }
