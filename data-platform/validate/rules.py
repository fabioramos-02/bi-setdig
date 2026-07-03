"""Regras de qualidade — ver docs/architecture/convencoes.md.

Sem dependência de jsonschema: as checagens do POC (campo obrigatório,
não-negativo) são simples o bastante pra função pura. Adicionar jsonschema
quando o número de datasets/regras justificar um motor genérico.
"""
from __future__ import annotations


class ValidationError(Exception):
    pass


def require_fields(row: dict, fields: list[str]) -> None:
    missing = [f for f in fields if row.get(f) is None]
    if missing:
        raise ValidationError(f"Campos obrigatórios ausentes: {missing} em {row}")


def require_non_negative(row: dict, fields: list[str]) -> None:
    for f in fields:
        val = row.get(f)
        if val is not None and isinstance(val, (int, float)) and val < 0:
            raise ValidationError(f"Campo {f!r} negativo ({val}) em {row}")


def validate_rows(rows: list[dict], required: list[str], non_negative: list[str]) -> None:
    for row in rows:
        require_fields(row, required)
        require_non_negative(row, non_negative)
