"""One-off: adiciona `url` ao catálogo já publicado, sem precisar reler a
planilha `Total de serviços do app.xlsx` (não disponível nesta máquina).
Reusa a mesma `enriquecer_com_url()` de build_catalogo.py — próxima vez que
a planilha for reprocessada do zero, o enriquecimento já roda embutido.

    python data-platform/enriquecer_catalogo_com_url.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_catalogo import enriquecer_com_url  # noqa: E402
from publish.writer import publish  # noqa: E402
from validate.rules import validate_rows  # noqa: E402

DATASET_PATH = Path(__file__).resolve().parent.parent / "datasets" / "app" / "v1" / "catalogo-servicos.json"

if __name__ == "__main__":
    catalogo = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    enriquecido = enriquecer_com_url(catalogo)
    validate_rows(enriquecido, required=["categoria", "servico", "tipo", "ativo"], non_negative=[])
    out = publish("app", "catalogo-servicos", enriquecido)

    com_url = sum(1 for s in enriquecido if s.get("url"))
    web = sum(1 for s in enriquecido if s["tipo"] == "web")
    print(f"[app] catalogo-servicos enriquecido -> {out}")
    print(f"      {len(enriquecido)} serviços | {web} web | {com_url} com url cadastrada")
