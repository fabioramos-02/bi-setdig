"""Publica dataset validado em datasets/, atualiza catalog.json e grava log.

Ver docs/architecture/ADR-004-json-datasets.md — contrato do catalog.json.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATASETS_DIR = REPO_ROOT / "datasets"
CATALOG_PATH = DATASETS_DIR / "catalog.json"
LOGS_DIR = DATASETS_DIR / "logs"

MAX_DATASET_BYTES = 2 * 1024 * 1024  # meta de convencoes.md: <2MB por dataset


def _load_catalog() -> list[dict]:
    if not CATALOG_PATH.exists():
        return []
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def _save_catalog(entries: list[dict]) -> None:
    CATALOG_PATH.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")


def publish(
    source: str,
    dataset: str,
    rows: list[dict] | dict[str, list[dict]],
    version: str = "v1",
    frequency: str = "daily",
    owner: str = "SETDIG",
) -> Path:
    """`rows` aceita lista simples ou dict com 1 chave por período fixo
    (dia/semana/mes/ano) — ver ADR-007. Contagem de linhas no catálogo soma
    as 4 chaves nesse segundo caso."""
    n_rows = sum(len(v) for v in rows.values()) if isinstance(rows, dict) else len(rows)
    now = datetime.now(timezone.utc).isoformat()

    out_dir = DATASETS_DIR / source / version
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{dataset}.json"

    payload = json.dumps(rows, ensure_ascii=False, indent=2)
    size = len(payload.encode("utf-8"))
    if size > MAX_DATASET_BYTES:
        raise ValueError(
            f"{dataset}.json tem {size} bytes, acima da meta de {MAX_DATASET_BYTES} "
            "(ver convencoes.md) — agregar no transform antes de publicar."
        )
    out_path.write_text(payload, encoding="utf-8")

    entries = _load_catalog()
    key = f"{source}/{dataset}"
    entries = [e for e in entries if f"{e['source']}/{e['dataset']}" != key]
    entries.append(
        {
            "dataset": dataset,
            "source": source,
            "owner": owner,
            "updatedAt": now,
            "frequency": frequency,
            "version": version,
            "schema": f"data-platform/schemas/{source}-{dataset}.schema.json",
            "rows": n_rows,
            "bytes": size,
        }
    )
    _save_catalog(entries)

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_path = LOGS_DIR / f"{now.replace(':', '-')}_{source}-{dataset}.json"
    log_path.write_text(
        json.dumps({"startedAt": now, "source": source, "dataset": dataset, "rows": len(rows), "bytes": size, "ok": True}, indent=2),
        encoding="utf-8",
    )
    return out_path
