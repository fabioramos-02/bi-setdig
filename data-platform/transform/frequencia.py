"""Transform de cadência de retorno ao app (frequência de acesso).

Combina métricas sticky (DAU/WAU/MAU + sessões) e cohort D1/D7/D30 em um
único snapshot. Puro — recebe dicts do extract/ga4, devolve dict pronto
pra publish.
"""
from __future__ import annotations


def calcular_cadencia(sticky: dict, cohort: dict) -> dict:
    """Combina sticky (DAU/WAU/MAU) + sessões + cohort.

    Denominador de sessões/usuário é `totalUsuarios28d`, NÃO `mau`. Motivo:
    `active28DayUsers` inclui client_ids que dispararam eventos "leves"
    (ex.: first_open sem session_start pós-instalação, screen_view sem
    engagement), inflando o denominador — sessoes/mau ficava <1, gerando
    "intervalo médio > 28 dias", matematicamente impossível para quem
    abriu no período. `totalUsers` reflete quem iniciou sessão de fato.
    """
    dau = int(sticky.get("dau") or 0)
    wau = int(sticky.get("wau") or 0)
    mau = int(sticky.get("mau") or 0)
    sessoes = int(sticky.get("sessoes28d") or 0)
    total_users = int(sticky.get("totalUsuarios28d") or 0)
    stickiness = round(100 * dau / mau, 1) if mau else 0.0
    fidelidade = round(100 * wau / mau, 1) if mau else 0.0
    sessoes_por_user = round(sessoes / total_users, 2) if total_users else 0.0
    dias_entre = round(28 / sessoes_por_user, 1) if sessoes_por_user > 0 else None
    return {
        "ativosHoje": dau,
        "ativosSemana": wau,
        "ativosMes": mau,
        "totalUsuariosMes": total_users,
        "sessoesMes": sessoes,
        "stickinessPct": stickiness,
        "fidelidadeSemanaPct": fidelidade,
        "sessoesPorUsuario": sessoes_por_user,
        "diasEntreAcessos": dias_entre,
        "cohortSemana": cohort.get("semanaReferencia", ""),
        "cohortTamanho": int(cohort.get("tamanho") or 0),
        "retencaoD1Pct": float(cohort.get("d1Pct") or 0.0),
        "retencaoD7Pct": float(cohort.get("d7Pct") or 0.0),
        "retencaoD30Pct": float(cohort.get("d30Pct") or 0.0),
    }
