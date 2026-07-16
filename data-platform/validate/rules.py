"""Regras de avaliação da carta — ver docs/architecture/convencoes.md.

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


def validate_period_breakdown(data: dict[str, list[dict]], required: list[str], non_negative: list[str]) -> None:
    """Dataset com 1 chave por período fixo (dia/semana/mes/ano) — ver
    docs/architecture/ADR-007-breakdown-por-periodo.md."""
    for periodo, rows in data.items():
        try:
            validate_rows(rows, required, non_negative)
        except ValidationError as exc:
            raise ValidationError(f"período {periodo!r}: {exc}") from exc
