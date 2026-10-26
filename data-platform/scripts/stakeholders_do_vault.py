"""Gera datasets/tfs/v1/stakeholders.json a partir das notas de secretarias do vault.

Uso: python data-platform/scripts/stakeholders_do_vault.py <pasta 10-conhecimento/secretarias>

Do vault vêm sigla, nome, secretário e site. Ponto focal, contato, papel
(piloto | parceiro) e módulos são preenchidos à mão no JSON — rodar de novo
preserva o que já foi preenchido (casa pela sigla).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from publish.writer import DATASETS_DIR, publish  # noqa: E402

MANUAIS = {"pontoFocal": None, "contato": None, "papel": None, "modulos": []}


def frontmatter(texto: str) -> dict[str, str]:
    """Só `chave: valor` simples — as notas de secretaria não têm aninhamento."""
    if not texto.startswith("---"):
        return {}
    bloco = texto.split("---", 2)[1]
    campos = {}
    for linha in bloco.splitlines():
        if ":" in linha and not linha.startswith(" "):
            chave, valor = linha.split(":", 1)
            campos[chave.strip()] = valor.strip().strip('"')
    return campos


def main(pasta: str) -> int:
    atual_path = DATASETS_DIR / "tfs" / "v1" / "stakeholders.json"
    atuais = {s["sigla"]: s for s in json.loads(atual_path.read_text(encoding="utf-8"))} \
        if atual_path.exists() else {}
    linhas = []
    for nota in sorted(Path(pasta).glob("*.md")):
        fm = frontmatter(nota.read_text(encoding="utf-8"))
        if not fm.get("sigla"):
            continue
        manual = {k: atuais.get(fm["sigla"], {}).get(k, v) for k, v in MANUAIS.items()}
        linhas.append({
            "sigla": fm["sigla"],
            "nome": fm.get("nome", ""),
            "secretario": fm.get("secretario") or None,
            "site": fm.get("url_site") or None,
            **manual,
        })
    publish("tfs", "stakeholders", linhas, frequency="manual")
    print(f"[tfs] stakeholders -> {len(linhas)} órgãos")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
