"""Agregações sobre contas do MS Digital.

Funções puras (recebem lista de dicts do extract, devolvem lista/dict pra
publish). Dicionário IBGE→nome carregado de reference/ibge_ms.json (extraído
de public/geo/ms-municipios.geojson).

Regras:
- Faixa etária: buckets fechados; NULL/data inválida → "não informado".
- Cidade fora do dicionário MS: agrupa em "Outros municípios / fora de MS"
  (só 1,8% das contas têm endereço no banco de qualquer forma).
- Ano corrente é parcial — dado publicado, quem lê deve ressalvar.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

_REF_IBGE = Path(__file__).resolve().parent.parent / "reference" / "ibge_ms.json"
_IBGE_MS: dict[str, str] = json.loads(_REF_IBGE.read_text(encoding="utf-8"))

FAIXAS = [
    ("0-17", 0, 17),
    ("18-24", 18, 24),
    ("25-34", 25, 34),
    ("35-44", 35, 44),
    ("45-54", 45, 54),
    ("55-64", 55, 64),
    ("65+", 65, 200),
]
FAIXA_SEM_INFO = "Não informado"


def _hoje() -> date:
    return datetime.now(timezone.utc).date()


def _idade(nasc, hoje: date | None = None) -> int | None:
    if nasc is None:
        return None
    if hasattr(nasc, "date"):
        nasc = nasc.date()
    if not isinstance(nasc, date):
        return None
    hoje = hoje or _hoje()
    anos = hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))
    if anos < 0 or anos > 130:
        return None
    return anos


def _faixa(idade: int | None) -> str:
    if idade is None:
        return FAIXA_SEM_INFO
    for nome, mn, mx in FAIXAS:
        if mn <= idade <= mx:
            return nome
    return FAIXA_SEM_INFO


def resumo(contas: list[dict], matriculas: int) -> dict:
    total = len(contas)
    ativas = sum(1 for c in contas if c.get("ativo"))
    taxa = round(100 * ativas / total, 2) if total else 0.0
    return {
        "contasTotal": total,
        "contasAtivas": ativas,
        "matriculas": int(matriculas),
        "taxaAtivacaoPct": taxa,
    }


def contas_por_ano(contas: list[dict]) -> list[dict]:
    por_ano: dict[int, dict[str, int]] = {}
    for c in contas:
        criada = c.get("conta_criada_em")
        if criada is None:
            continue
        ano = criada.year
        d = por_ano.setdefault(ano, {"criadas": 0, "ativas": 0})
        d["criadas"] += 1
        if c.get("ativo"):
            d["ativas"] += 1
    if not por_ano:
        return []
    # cobrir buracos (ano com 0)
    anos = list(range(min(por_ano), max(por_ano) + 1))
    return [
        {"ano": a, "criadas": por_ano.get(a, {}).get("criadas", 0),
         "ativas": por_ano.get(a, {}).get("ativas", 0)}
        for a in anos
    ]


def contas_por_faixa_etaria(contas: list[dict]) -> list[dict]:
    hoje = _hoje()
    contagem: dict[str, int] = {nome: 0 for nome, _, _ in FAIXAS}
    contagem[FAIXA_SEM_INFO] = 0
    for c in contas:
        contagem[_faixa(_idade(c.get("dataNascimento"), hoje))] += 1
    ordem = [nome for nome, _, _ in FAIXAS] + [FAIXA_SEM_INFO]
    return [{"faixa": nome, "quantidade": contagem[nome]} for nome in ordem]


def contas_ativas_por_cidade(contas: list[dict]) -> list[dict]:
    contagem: dict[str, tuple[str, int]] = {}  # nome -> (codIbge, qtd)
    fora_ms = 0
    for c in contas:
        if not c.get("ativo"):
            continue
        cod = c.get("cidade_ibge")
        if cod is None:
            continue
        nome = _IBGE_MS.get(str(cod))
        if nome:
            _, qtd = contagem.get(nome, (str(cod), 0))
            contagem[nome] = (str(cod), qtd + 1)
        else:
            fora_ms += 1
    linhas = [
        {"cidade": nome, "codigoIbge": cod, "ativas": qtd}
        for nome, (cod, qtd) in contagem.items()
    ]
    linhas.sort(key=lambda r: r["ativas"], reverse=True)
    if fora_ms:
        linhas.append({"cidade": "Outros municípios / fora de MS",
                       "codigoIbge": "", "ativas": fora_ms})
    return linhas


def contas_por_dia(raw: list[dict]) -> list[dict]:
    """Normaliza pra {data: 'YYYY-MM-DD', criadas, ativas} — cliente agrega em
    semana/mês/ano via lib/period-filter.ts."""
    saida = []
    for r in raw:
        d = r.get("data")
        if d is None:
            continue
        iso = d.isoformat() if hasattr(d, "isoformat") else str(d)
        saida.append({"data": iso[:10], "criadas": int(r.get("criadas") or 0),
                      "ativas": int(r.get("ativas") or 0)})
    return saida


FAIXAS_ACESSO_ORDEM = [
    "Nos últimos 6 meses",
    "Entre 6 meses e 2 anos",
    "Entre 2 e 4 anos",
    "Mais de 4 anos",
    "Uma vez apenas",
]


def faixas_de_acesso(contas: list[dict]) -> list[dict]:
    """5 faixas mutuamente exclusivas por ultimoLogin. Soma = len(contas).

    'Uma vez apenas' é proxy — banco não tem loginCount. Captura contas que
    nunca logaram (ultimoLogin NULL) OU logaram apenas no mesmo dia do
    cadastro. Ver docs/msdigital/indicadores-inatividade.md.

    Ordem visual (retornada): recente → antigo → 'uma vez apenas' (categoria
    à parte, exibida por último no gráfico).
    """
    hoje = datetime.now(timezone.utc)
    seis_meses = hoje - timedelta(days=182)
    dois_anos = hoje - timedelta(days=730)
    quatro_anos = hoje - timedelta(days=1461)
    contagem = {r: 0 for r in FAIXAS_ACESSO_ORDEM}
    for c in contas:
        ul = c.get("ultimoLogin")
        criada = c.get("conta_criada_em")
        mesmo_dia = (
            ul is not None
            and criada is not None
            and hasattr(ul, "date")
            and hasattr(criada, "date")
            and ul.date() == criada.date()
        )
        if ul is None or mesmo_dia:
            contagem["Uma vez apenas"] += 1
        elif ul > seis_meses:
            contagem["Nos últimos 6 meses"] += 1
        elif ul > dois_anos:
            contagem["Entre 6 meses e 2 anos"] += 1
        elif ul > quatro_anos:
            contagem["Entre 2 e 4 anos"] += 1
        else:
            contagem["Mais de 4 anos"] += 1
    total = len(contas)
    return [
        {
            "faixa": r,
            "quantidade": contagem[r],
            "percentPct": round(100 * contagem[r] / total, 1) if total else 0.0,
        }
        for r in FAIXAS_ACESSO_ORDEM
    ]
