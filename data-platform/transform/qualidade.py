"""Erros, tempo de resolução e percepção do cidadão nas cartas de serviço
(ADR-005: domínio Qualidade).

Só agrega o dado cru do Postgres — sem filtro de período (é estado/série
histórica, não analytics de acesso ao vivo; mesma exceção já documentada
pro inventário de cartas no AGENTS.md).
"""
from __future__ import annotations


def _tempo_medio_dias(atendidos: list[dict]) -> float:
    """Aproximação: `updated_at - created_at` só nos erros já atendidos —
    não existe `resolved_at` dedicado no schema real."""
    if not atendidos:
        return 0.0
    dias = [(r["updated_at"] - r["created_at"]).total_seconds() / 86400 for r in atendidos]
    return round(sum(dias) / len(dias), 1)


def resumo_erros(rows: list[dict]) -> dict:
    atendidos = [r for r in rows if r["atendido"]]
    total = len(rows)
    return {
        "total": total,
        "atendidos": len(atendidos),
        "pendentes": total - len(atendidos),
        "percentAtendido": round(100 * len(atendidos) / total, 1) if total else 0,
        "tempoMedioResolucaoDias": _tempo_medio_dias(atendidos),
    }


def por_orgao(rows: list[dict]) -> list[dict]:
    agrupado: dict[str, list[dict]] = {}
    for r in rows:
        agrupado.setdefault(r["orgao_sigla"], []).append(r)

    saida = []
    for sigla, itens in agrupado.items():
        atendidos = [r for r in itens if r["atendido"]]
        total = len(itens)
        saida.append(
            {
                "orgao": itens[0]["orgao"],
                "orgaoSigla": sigla,
                "total": total,
                "atendidos": len(atendidos),
                "pendentes": total - len(atendidos),
                "percentAtendido": round(100 * len(atendidos) / total, 1) if total else 0,
                "tempoMedioResolucaoDias": _tempo_medio_dias(atendidos),
            }
        )
    return sorted(saida, key=lambda x: x["total"], reverse=True)


def evolucao_mensal(rows: list[dict]) -> list[dict]:
    abertos: dict[str, int] = {}
    resolvidos: dict[str, int] = {}
    for r in rows:
        mes_aberto = r["created_at"].strftime("%Y-%m")
        abertos[mes_aberto] = abertos.get(mes_aberto, 0) + 1
        if r["atendido"]:
            mes_resolvido = r["updated_at"].strftime("%Y-%m")
            resolvidos[mes_resolvido] = resolvidos.get(mes_resolvido, 0) + 1

    meses = sorted(set(abertos) | set(resolvidos))
    return [{"mes": mes, "abertos": abertos.get(mes, 0), "resolvidos": resolvidos.get(mes, 0)} for mes in meses]


def resumo_percepcao(votos: list[dict], avaliacoes_info: list[dict]) -> dict:
    notas = [v["avaliacao"] for v in votos if v.get("avaliacao")]
    distribuicao = {str(n): notas.count(n) for n in range(1, 6)}

    total_clareza = len(avaliacoes_info)
    positivas = sum(1 for a in avaliacoes_info if a["avaliacao"])

    return {
        "csatMedia": round(sum(notas) / len(notas), 1) if notas else 0,
        "csatDistribuicao": distribuicao,
        "totalVotos": len(notas),
        "clarezaPositivaPct": round(100 * positivas / total_clareza, 1) if total_clareza else 0,
        "totalAvaliacoesClareza": total_clareza,
    }
