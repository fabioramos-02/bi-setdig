"""Censo de serviços digitais (SGD) a partir da planilha unificada.

Fonte manual (não é API): questionário autodeclarado pelos órgãos, uma aba por
órgão. Rode quando chegar uma rodada nova do censo:

    python data-platform/build_censo.py [caminho_do_xlsx]

O xlsx NÃO é versionado (traz nome e e-mail de quem preencheu). Publica
datasets/censo/v2/censo.json — shape em datasets/censo/README.md, escala em
docs/censo-maturidade.md.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent / "transform"))

import openpyxl  # noqa: E402

from censo import indice_inventario, montar_orgao, sigla_da_aba  # noqa: E402
from publish.writer import DATASETS_DIR, publish  # noqa: E402
from validate.rules import validate_rows  # noqa: E402

DEFAULT_XLSX = Path.home() / "Downloads" / "planilha unificada.xlsx"
INVENTARIO = DATASETS_DIR / "cartas" / "v1" / "inventario-relacao.json"


def build(xlsx_path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(xlsx_path, data_only=True, read_only=True)
    cartas_idx, nomes = indice_inventario(json.loads(INVENTARIO.read_text(encoding="utf-8")))
    orgaos = []
    for ws in wb.worksheets:
        if not ws.title.startswith("Serviços"):
            continue
        rows = list(ws.iter_rows(values_only=True))
        orgaos.append(montar_orgao(sigla_da_aba(ws.title), rows, cartas_idx, nomes))
    return sorted(orgaos, key=lambda o: o["orgaoSigla"])


if __name__ == "__main__":
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    orgaos = build(xlsx)
    cartas = [c for o in orgaos for c in o["cartas"]]
    validate_rows(orgaos, required=["orgaoSigla", "orgaoNome", "cartas"], non_negative=[])
    validate_rows(cartas, required=["titulo"], non_negative=["demandaMensal"])
    out = publish("censo", "censo", orgaos, version="v2", frequency="manual")

    niveis = Counter(c["nivel"] for c in cartas)
    print(f"[censo] censo -> {out}")
    print(f"      {len(orgaos)} órgãos | {len(cartas)} serviços")
    print(f"      por nível: {dict(sorted(niveis.items(), key=lambda kv: (kv[0] is None, kv[0] or 0)))}")
    print(f"      com link no portal: {sum(1 for c in cartas if c['urlServico'])}")
    print(f"      demanda lida como número: {sum(1 for c in cartas if c['demandaMensal'] is not None)}"
          f" | texto livre: {sum(1 for c in cartas if c['demandaTexto'])}")
    print(f"      órgãos sem serviço: {[o['orgaoSigla'] for o in orgaos if not o['cartas']]}")
