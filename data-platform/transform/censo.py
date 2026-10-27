"""Censo de serviços digitais (SGD) — planilha unificada -> datasets/censo/v2.

Uma aba por órgão (`Serviços <SIGLA>`), questionário autodeclarado. O cabeçalho
muda de posição entre abas (AGRAER tem `Gerência`/`link` a mais, SAD tem
`Unidade`), então as colunas são achadas por palavra-chave, nunca por índice.
As 2 primeiras linhas de cada aba (nome/e-mail de quem preencheu) são ignoradas
de propósito — não vão pro dataset publicado.

Escala de grau de digitalização 0–5 — ver docs/censo-maturidade.md.
"""
from __future__ import annotations

import re
import unicodedata

# palavra-chave (normalizada) no texto do cabeçalho -> campo
_COLUNAS = [
    ("nome desta carta", "titulo"),
    ("solicitacoes", "demanda"),
    ("grau de digitalizacao", "grau"),
    ("etapa presencial", "etapaPresencial"),
    ("link", "link"),
    ("setor", "setor"),
]


def normalizar(s: str) -> str:
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(s.lower().split())


def achar_cabecalho(rows: list[tuple]) -> int | None:
    for i, r in enumerate(rows):
        if any(isinstance(c, str) and "nome desta carta" in normalizar(c) for c in r):
            return i
    return None


def mapear_colunas(header: tuple) -> dict[str, int]:
    """Campo -> índice. Primeira coluna que bate vence (o texto longo de
    'grau' em IAGRO cita 'presencialmente', por isso 'etapa presencial' é
    casado só no que ainda não foi atribuído)."""
    out: dict[str, int] = {}
    for i, c in enumerate(header):
        if not isinstance(c, str):
            continue
        h = normalizar(c)
        for chave, campo in _COLUNAS:
            if campo in out:
                continue
            if campo == "link" and h != "link":
                continue
            if campo == "setor" and not h.startswith("setor"):
                continue
            if chave in h:
                out[campo] = i
                break
    return out


def parse_nivel(v) -> int | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v) if 0 <= v <= 5 and float(v).is_integer() else None
    m = re.match(r"\s*([0-5])\b", str(v))
    return int(m.group(1)) if m else None


def _num_br(s: str) -> float:
    """'38.702' / '2,000' (milhar) -> 38702 / 2000; '4,75' -> 4.75."""
    if re.fullmatch(r"\d{1,3}([.,]\d{3})+", s):
        return float(re.sub(r"[.,]", "", s))
    return float(s.replace(",", "."))


def parse_demanda(v) -> tuple[float | None, str | None]:
    """Solicitações/mês -> (número, texto original quando não deu pra ler).

    ponytail: heurística sobre texto livre — pega número puro, milhar com
    ponto/vírgula, "N por ano"/"ao ano" (÷12) e o 1º número em frases curtas
    ("aprox 5500", "média mensal de 113"). Frase com mais de um número ou sem
    número vira None e o texto fica visível no painel. Se a SGD padronizar a
    coluna como número na próxima rodada, isso some.
    """
    if v is None:
        return None, None
    if isinstance(v, (int, float)):
        return round(float(v), 1), None
    texto = " ".join(str(v).split())
    if not re.search(r"\w", texto):  # vazio, "-", "—"
        return None, None
    nums = re.findall(r"\d+(?:[.,]\d+)*", texto)
    if len(nums) != 1:
        return None, texto
    n = _num_br(nums[0])
    t = normalizar(texto)
    if re.search(r"\b(por|ao) ano\b|anual", t):
        n = n / 12
    elif re.search(r"\b(por|ao) dia\b|diari", t):
        n = n * 30
    return round(n, 1), None


def sigla_da_aba(nome: str) -> str:
    return nome.replace("Serviços", "").strip().upper()


def _celula(r: tuple, cols: dict[str, int], campo: str):
    i = cols.get(campo)
    if i is None or i >= len(r):
        return None
    v = r[i]
    if isinstance(v, str):
        v = " ".join(v.split()) or None
    return v


def indice_inventario(inventario: list[dict]) -> tuple[dict, dict]:
    """(sigla, título normalizado) -> carta e sigla -> nome do órgão.
    Sigla do inventário vem como 'SEFAZ MS'/'CGE MS' — usa a 1ª palavra."""
    cartas: dict[tuple[str, str], dict] = {}
    nomes: dict[str, str] = {}
    for c in inventario:
        sigla = str(c.get("orgaoSigla") or "").split()[0].upper() if c.get("orgaoSigla") else ""
        nomes.setdefault(sigla, c.get("orgao") or sigla)
        cartas.setdefault((sigla, normalizar(c["titulo"])), c)
    return cartas, nomes


def montar_orgao(sigla: str, rows: list[tuple], cartas_idx: dict, nomes: dict) -> dict:
    cartas = []
    h = achar_cabecalho(rows)
    if h is not None:
        cols = mapear_colunas(rows[h])
        for r in rows[h + 1:]:
            titulo = _celula(r, cols, "titulo")
            if not titulo:
                continue
            demanda, demanda_texto = parse_demanda(_celula(r, cols, "demanda"))
            inv = cartas_idx.get((sigla, normalizar(titulo)))
            link = _celula(r, cols, "link")
            cartas.append({
                "id": f"{sigla.lower()}-{len(cartas) + 1}",
                "titulo": str(titulo),
                "setor": _celula(r, cols, "setor"),
                "nivel": parse_nivel(_celula(r, cols, "grau")),
                "etapaPresencial": _celula(r, cols, "etapaPresencial"),
                "demandaMensal": demanda,
                "demandaTexto": demanda_texto,
                "slug": inv["slug"] if inv else None,
                "urlServico": (
                    f"https://www.ms.gov.br/{inv['categoria']}/{inv['slug']}" if inv
                    else (link if isinstance(link, str) and link.startswith("http") else None)
                ),
            })
    return {"orgaoSigla": sigla, "orgaoNome": nomes.get(sigla, sigla), "cartas": cartas}
