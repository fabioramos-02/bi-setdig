"""Inventário de sistemas do Estado a partir da planilha unificada.

Fonte manual (não é API): consolidação dos inventários enviados pelos órgãos,
no modelo Racional Gartner. Rode quando chegar uma versão nova da planilha:

    python data-platform/build_inventario_sistemas.py [caminho_do_xlsx]

O xlsx NÃO é versionado (traz telefone dos gestores). Publica em
datasets/inventario-sistemas/v1/ — ver docs/inventario-sistemas.md.
"""
from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent / "transform"))

import openpyxl  # noqa: E402

from inventario_sistemas import (  # noqa: E402
    criterios,
    montar_indicacoes,
    montar_orgaos,
    montar_pendencias,
    montar_sistemas,
)
from publish.writer import publish  # noqa: E402
from validate.rules import validate_rows  # noqa: E402

DEFAULT_XLSX = Path.home() / "Downloads" / "Inventário de Sistemas MS - unificado 17-11-2026 v4.xlsx"
SOURCE = "inventario-sistemas"


def _aba(wb, nome: str) -> list[tuple]:
    if nome not in wb.sheetnames:
        raise ValueError(f"Aba {nome!r} não existe na planilha (abas: {wb.sheetnames}).")
    return list(wb[nome].iter_rows(values_only=True))


def _meta(xlsx: Path, wb) -> dict:
    """Versão e data saem do nome do arquivo ("... 17-11-2026 v4.xlsx")."""
    m_data = re.search(r"(\d{2})-(\d{2})-(\d{4})", xlsx.name)
    m_ver = re.search(r"\bv(\d+)\b", xlsx.stem)
    return {
        "arquivo": xlsx.name,
        "versao": f"v{m_ver.group(1)}" if m_ver else None,
        "dataReferencia": f"{m_data.group(3)}-{m_data.group(2)}-{m_data.group(1)}" if m_data else None,
        "criterios": criterios(_aba(wb, "Avaliação de Criticidade")),
    }


def build(xlsx: Path) -> dict:
    wb = openpyxl.load_workbook(xlsx, data_only=True, read_only=True)
    sistemas = montar_sistemas(_aba(wb, "Inventário"))
    orgaos = montar_orgaos(_aba(wb, "Por órgão"))
    indicacoes, sem_par = montar_indicacoes(_aba(wb, "Indicações"), sistemas)
    pendencias = montar_pendencias(_aba(wb, "Pendências"), sistemas)
    return {
        "sistemas": sistemas,
        "orgaos": orgaos,
        "indicacoes": indicacoes,
        "pendencias": pendencias,
        "meta": _meta(xlsx, wb),
        "sem_par": sem_par,
    }


if __name__ == "__main__":
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    d = build(xlsx)
    validate_rows(d["sistemas"], required=["id", "nome", "orgaoResponsavel"], non_negative=["nOrgaosQueUsam", "nIndicacoes"])
    validate_rows(d["orgaos"], required=["sigla"], non_negative=["sistemasResponsavel", "sistemasDeOutrosQueUsa", "orgaosQueUsamSeus"])
    validate_rows(d["indicacoes"], required=["sistemaId", "orgao", "tipo"], non_negative=["vezes"])
    ids = [s["id"] for s in d["sistemas"]]
    if len(ids) != len(set(ids)):
        raise ValueError(f"ids repetidos: {[k for k, v in Counter(ids).items() if v > 1]}")

    for nome in ("sistemas", "orgaos", "indicacoes", "pendencias"):
        out = publish(SOURCE, nome, d[nome], version="v1", frequency="manual")
        print(f"[inventario] {nome} -> {out}")
    publish(SOURCE, "meta", [d["meta"]], version="v1", frequency="manual")

    s, o, ind = d["sistemas"], d["orgaos"], d["indicacoes"]
    print(f"      {len(s)} sistemas | {len(o)} órgãos | {sum(1 for x in o if x['enviouInventario'])} enviaram")
    print(f"      indicações de uso de outro órgão: {sum(x['vezes'] for x in ind if x['tipo'] == 'outro')}"
          f" | do próprio órgão: {sum(x['vezes'] for x in ind if x['tipo'] == 'proprio')}")
    print(f"      avaliados (C1–C8 completos): {sum(1 for x in s if x['criticidade'])}")
    print(f"      pendências: {len(d['pendencias'])} | indicações sem sistema correspondente: {len(d['sem_par'])}")
    if d["sem_par"]:
        print(f"      sem par: {sorted(set(d['sem_par']))[:20]}")
