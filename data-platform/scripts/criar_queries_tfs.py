"""Cria (ou atualiza) as queries do BI em Shared Queries/BI SETDIG no TFS.

Uso: python data-platform/scripts/criar_queries_tfs.py
Idempotente: query que já existe só tem a WIQL atualizada. A WIQL vem de
extract/tfs.py (QUERIES) — o extrator e quem abre o TFS veem o mesmo recorte.
"""
from __future__ import annotations

import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from extract.tfs import PASTA_QUERIES, QUERIES, TFS_URL, PROJETO, pedir  # noqa: E402

LINK = f"{TFS_URL}/{PROJETO}/_queries/query/"


def existente(caminho: str) -> dict | None:
    try:
        return pedir("GET", f"wit/queries/{caminho}")
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            return None
        raise


def main() -> int:
    pai, pasta = PASTA_QUERIES.rsplit("/", 1)
    if not existente(PASTA_QUERIES):
        pedir("POST", f"wit/queries/{pai}", json={"name": pasta, "isFolder": True})
        print(f"[criada] pasta {PASTA_QUERIES}")
    for nome, wiql in QUERIES.items():
        wiql = " ".join(wiql.split())
        atual = existente(f"{PASTA_QUERIES}/{nome}")
        if atual:
            pedir("PATCH", f"wit/queries/{atual['id']}", json={"wiql": wiql})
            print(f"[atualizada] {nome}  {LINK}{atual['id']}")
        else:
            nova = pedir("POST", f"wit/queries/{PASTA_QUERIES}", json={"name": nome, "wiql": wiql})
            print(f"[criada] {nome}  {LINK}{nova['id']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
