"""Erros, tempo de resolução e percepção do cidadão nas cartas de serviço
(ADR-005: domínio Qualidade).

Só agrega o dado cru do Postgres — sem filtro de período (é estado/série
histórica, não analytics de acesso ao vivo; mesma exceção já documentada
pro inventário de cartas no AGENTS.md).
"""
from __future__ import annotations

from datetime import datetime

_MAX_TEXTO = 2000  # rede de segurança contra outlier patológico — 300 chars truncava 12,5% das linhas reais (708 erros = 458KB, bem abaixo do limite de 2MB do publish()); exibição em tabela já trunca via CSS, isso aqui só protege contra texto absurdamente longo


def _truncar(texto: str | None) -> str | None:
    if not texto:
        return texto
    texto = texto.strip()
    return texto if len(texto) <= _MAX_TEXTO else texto[:_MAX_TEXTO] + "…"


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


def percepcao_por_orgao(votos: list[dict], avaliacoes_info: list[dict]) -> list[dict]:
    # Extrair map de sigla -> nome do orgao
    sigla_nome = {}
    for r in votos + avaliacoes_info:
        if r.get("orgao_sigla") and r.get("orgao"):
            sigla_nome[r["orgao_sigla"]] = r["orgao"]
            
    saida = []
    for sigla, nome in sigla_nome.items():
        v_orgao = [v for v in votos if v.get("orgao_sigla") == sigla]
        a_orgao = [a for a in avaliacoes_info if a.get("orgao_sigla") == sigla]
        
        resumo = resumo_percepcao(v_orgao, a_orgao)
        saida.append({
            "orgao": nome,
            "orgaoSigla": sigla,
            **resumo
        })
    return sorted(saida, key=lambda x: x["totalVotos"], reverse=True)


def relacao(rows: list[dict]) -> list[dict]:
    """1 linha por erro — mirror de servicos_cartas.py::relacao(). `diasAberto`
    é aproximação (`agora - created_at`), coerente com o resto do domínio
    (pipeline roda 1x/dia). `conteudo`/`resolucao` truncados (ver _MAX_TEXTO)."""
    if not rows:
        return []
    agora = datetime.now(rows[0]["created_at"].tzinfo)
    return [
        {
            "id": str(r["id"]),
            "servico": r["titulo_servico"],
            "slugServico": r["slug_servico"],
            "orgao": r["orgao"],
            "orgaoSigla": r["orgao_sigla"],
            "categoria": r.get("categoria_slug"),
            "conteudo": _truncar(r.get("conteudo")),
            "resolucao": _truncar(r.get("resolucao")),
            "atendido": r["atendido"],
            "diasAberto": (agora - r["created_at"]).days,
            "createdAt": r["created_at"].isoformat(),
            "updatedAt": r["updated_at"].isoformat(),
        }
        for r in rows
    ]
