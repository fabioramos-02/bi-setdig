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


def uso_retencao(contas: list[dict]) -> dict:
    """Ver docs/msdigital/indicadores-inatividade.md — sem loginCount, os
    3 recortes usam ultimoLogin como proxy."""
    hoje = datetime.now(timezone.utc)
    dois_anos = hoje - timedelta(days=730)  # ponytail: ano bissexto ±1 dia irrelevante
    seis_meses_atras = hoje - timedelta(days=182)
    nunca = 0
    inativos_2a = 0
    recorrentes = 0
    for c in contas:
        ul = c.get("ultimoLogin")
        if ul is None:
            nunca += 1
            continue
        # pymssql devolve datetime aware (datetimeoffset)
        if ul < dois_anos:
            inativos_2a += 1
        if ul > seis_meses_atras:
            recorrentes += 1
    return {
        "nuncaAcessou": nunca,
        "inativos2Anos": inativos_2a,
        "recorrentes6Meses": recorrentes,
        "totalContas": len(contas),
    }
