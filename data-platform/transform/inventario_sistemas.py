"""Inventário unificado de sistemas do Estado (planilha manual) -> datasets.

Funções puras sobre as linhas cruas (tuplas do openpyxl) de cada aba da
planilha "Inventário de Sistemas MS - unificado". Quem lê o xlsx e publica é
data-platform/build_inventario_sistemas.py.

O telefone do gestor NÃO é publicado: só o fato de existir (temContato), que é
o que a análise de completude precisa.
"""
from __future__ import annotations

import re
from datetime import date, datetime

CRITERIOS = [f"C{i}" for i in range(1, 9)]

# Régua da aba "Régua Criticidade" (limite superior inclusivo, em %).
REGUA = [
    (20, 1, "Muito baixa"),
    (40, 2, "Baixa"),
    (60, 3, "Média"),
    (80, 4, "Alta"),
    (100, 5, "Crítica"),
]

DONO_DESCONHECIDO = "A IDENTIFICAR"


def _txt(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def _int(v) -> int:
    try:
        return int(v or 0)
    except (TypeError, ValueError):
        return 0


def _lista(v, sep: str = ";") -> list[str]:
    s = _txt(v)
    if not s:
        return []
    return [p.strip() for p in s.split(sep) if p.strip()]


def _sn(v) -> str | None:
    s = (_txt(v) or "").upper()
    if s in ("S", "SIM"):
        return "S"
    if s in ("N", "NAO", "NÃO"):
        return "N"
    return None


def _data(v) -> str | None:
    if isinstance(v, (datetime, date)):
        return v.strftime("%Y-%m-%d")
    return _txt(v)


def chave(nome: str | None, orgao: str | None) -> str:
    """Liga linhas de abas diferentes: nome unificado + órgão responsável
    (há nomes repetidos em órgãos diferentes, ex. "Intranet")."""
    norm = lambda s: re.sub(r"\s+", " ", (s or "").strip().lower())  # noqa: E731
    return f"{norm(nome)}|{norm(orgao)}"


def nivel_criticidade(pct: float | None) -> dict | None:
    """pct em 0–100. None quando o sistema ainda não foi avaliado."""
    if pct is None:
        return None
    for teto, nivel, rotulo in REGUA:
        if pct <= teto:
            return {"nivel": nivel, "rotulo": rotulo}
    return {"nivel": 5, "rotulo": "Crítica"}


def achar_cabecalho(rows: list[tuple], primeira: str) -> int | None:
    for i, r in enumerate(rows):
        if r and _txt(r[0]) == primeira:
            return i
    return None


def montar_sistemas(rows: list[tuple]) -> list[dict]:
    """Aba Inventário: título, linha de grupo e cabeçalho com '#' na col. A."""
    h = achar_cabecalho(rows, "#")
    if h is None:
        raise ValueError("Cabeçalho da aba Inventário não encontrado (coluna '#').")
    head = [(_txt(c) or "") for c in rows[h]]
    col = {nome: i for i, nome in enumerate(head) if nome}

    def get(r, nome):
        i = col.get(nome)
        return r[i] if i is not None and i < len(r) else None

    sistemas = []
    for r in rows[h + 1:]:
        nome = _txt(get(r, "Nome do Sistema"))
        if not nome:
            continue
        crit = {c: _sn(get(r, c)) for c in CRITERIOS}
        respondidos = [v for v in crit.values() if v]
        avaliado = len(respondidos) == len(CRITERIOS)
        pontos = sum(1 for v in respondidos if v == "S") if respondidos else None
        pct = round(pontos / len(CRITERIOS) * 100) if avaliado else None
        orgao = _txt(get(r, "Órgão Responsável")) or DONO_DESCONHECIDO
        sistemas.append({
            "id": f"sis-{_int(get(r, '#')):03d}",
            "nome": nome,
            "sigla": _txt(get(r, "Sigla")),
            "descricao": _txt(get(r, "Descrição")),
            "orgaoResponsavel": orgao,
            "gestor": _txt(get(r, "Nome do Gestor do Sistema")),
            "temContato": _txt(get(r, "Contato do gestor")) is not None,
            "setor": _txt(get(r, "Setor responsável")),
            "operadora": _txt(get(r, "Operadora")),
            "origem": _txt(get(r, "Origem")),
            "fonteDono": _txt(get(r, "Fonte do órgão responsável")),
            "responsavelInformado": _txt(get(r, "Responsável informado pelos órgãos")),
            "dataAvaliacao": _data(get(r, "Data da Avaliação")),
            "criterios": crit,
            "criteriosRespondidos": len(respondidos),
            "pontos": pontos if avaliado else None,
            "pct": pct,
            "criticidade": nivel_criticidade(pct),
            "orgaosQueUsam": _lista(get(r, "Órgãos que indicaram uso")),
            "nOrgaosQueUsam": _int(get(r, "Indicado por quantos órgãos")),
            "nIndicacoes": _int(get(r, "Quantas vezes foi indicado")),
            "arquivosOrigem": _lista(get(r, "Arquivos de origem")),
        })
    return sistemas


def montar_orgaos(rows: list[tuple]) -> list[dict]:
    """Aba Por órgão: cabeçalho na 1ª linha."""
    orgaos = []
    for r in rows[1:]:
        sigla = _txt(r[0]) if r else None
        if not sigla:
            continue
        orgaos.append({
            "sigla": sigla,
            "enviouInventario": (_txt(r[1]) or "").lower().startswith("s"),
            "sistemasResponsavel": _int(r[2]),
            "sistemasDeOutrosQueUsa": _int(r[3]),
            "orgaosQueUsamSeus": _int(r[4]),
        })
    return sorted(orgaos, key=lambda o: o["sigla"])


def montar_indicacoes(rows: list[tuple], sistemas: list[dict]) -> tuple[list[dict], list[str]]:
    """Aba Indicações (uma linha por linha de inventário). Devolve as indicações
    agregadas por (sistema, órgão que indicou, tipo) e os nomes que não casaram."""
    idx = {chave(s["nome"], s["orgaoResponsavel"]): s["id"] for s in sistemas}
    agg: dict[tuple[str, str, str], int] = {}
    sem_par: list[str] = []
    for r in rows[1:]:
        nome, orgao_resp, orgao_ind, como = (_txt(r[0]), _txt(r[2]), _txt(r[3]), _txt(r[4]))
        if not nome or not orgao_ind:
            continue
        sid = idx.get(chave(nome, orgao_resp or DONO_DESCONHECIDO))
        if sid is None:
            sem_par.append(nome)
            continue
        tipo = "proprio" if (como or "").lower().startswith("sistema do pr") else "outro"
        k = (sid, orgao_ind, tipo)
        agg[k] = agg.get(k, 0) + 1
    out = [{"sistemaId": s, "orgao": o, "tipo": t, "vezes": n} for (s, o, t), n in agg.items()]
    return sorted(out, key=lambda x: (x["sistemaId"], x["orgao"], x["tipo"])), sem_par


def montar_pendencias(rows: list[tuple], sistemas: list[dict]) -> list[dict]:
    por_nome: dict[str, list[str]] = {}
    for s in sistemas:
        por_nome.setdefault(s["nome"].strip().lower(), []).append(s["id"])
    out = []
    for r in rows[1:]:
        tipo, item = (_txt(r[0]), _txt(r[1]) if len(r) > 1 else None)
        if not tipo or not item:
            continue
        ids = por_nome.get(item.strip().lower(), [])
        out.append({
            "tipo": tipo,
            "item": item,
            "oQueFalta": _txt(r[2]) if len(r) > 2 else None,
            "fontes": _lista(r[3]) if len(r) > 3 else [],
            "sistemaId": ids[0] if len(ids) == 1 else None,
        })
    return out


def criterios(rows: list[tuple]) -> list[dict]:
    """Aba Avaliação de Criticidade: linhas com 'C1'..'C8' na col. B e a pergunta na C."""
    out = []
    for r in rows:
        if len(r) > 2 and _txt(r[1]) in CRITERIOS and _txt(r[2]):
            out.append({"id": _txt(r[1]), "pergunta": _txt(r[2])})
    return out
