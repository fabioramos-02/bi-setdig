"""Introspecção one-shot do BD MS_digital (SQL Server, exige VPN).

Roda local, gera docs/msdigital/schema-dump.md com tabelas, colunas, PKs e FKs
extraídos de INFORMATION_SCHEMA. NÃO integra ao run.py — é ferramenta de
levantamento (PBI 1). Rodar sempre que a estrutura do BD mudar.

Uso:
    python data-platform/scripts/introspect_msdigital.py

Requer envs MSDIGITAL_* no .env (ver .env.example).
"""
from __future__ import annotations

import os
import sys
from collections import defaultdict
from pathlib import Path

import pymssql
from dotenv import load_dotenv

load_dotenv()

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / "docs" / "msdigital" / "schema-dump.md"


def _conn():
    host = os.getenv("MSDIGITAL_HOST")
    port = int(os.getenv("MSDIGITAL_PORT", "1433"))
    user = os.getenv("MSDIGITAL_USER")
    password = os.getenv("MSDIGITAL_PASSWORD")
    banco = os.getenv("MSDIGITAL_BANCO", "MS_digital")
    if not (host and user and password):
        sys.exit("Faltam envs MSDIGITAL_HOST/USER/PASSWORD no .env — abortando.")
    return pymssql.connect(server=host, port=port, user=user, password=password,
                           database=banco, login_timeout=15, timeout=30)


def _fetch(sql: str) -> list[dict]:
    with _conn() as conn, conn.cursor(as_dict=True) as cur:
        cur.execute(sql)
        return list(cur.fetchall())


def _tabelas() -> list[dict]:
    return _fetch("""
        SELECT TABLE_SCHEMA AS schema_name, TABLE_NAME AS table_name, TABLE_TYPE AS table_type
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_SCHEMA, TABLE_NAME
    """)


def _colunas() -> list[dict]:
    return _fetch("""
        SELECT TABLE_SCHEMA AS schema_name, TABLE_NAME AS table_name,
               COLUMN_NAME AS column_name, DATA_TYPE AS data_type,
               CHARACTER_MAXIMUM_LENGTH AS max_len, IS_NULLABLE AS is_nullable,
               COLUMN_DEFAULT AS default_value, ORDINAL_POSITION AS pos
        FROM INFORMATION_SCHEMA.COLUMNS
        ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    """)


def _chaves() -> list[dict]:
    return _fetch("""
        SELECT tc.CONSTRAINT_TYPE AS tipo, kcu.TABLE_SCHEMA AS schema_name,
               kcu.TABLE_NAME AS table_name, kcu.COLUMN_NAME AS column_name,
               kcu.CONSTRAINT_NAME AS constraint_name
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
          ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
         AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
        WHERE tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'FOREIGN KEY')
        ORDER BY kcu.TABLE_SCHEMA, kcu.TABLE_NAME, tc.CONSTRAINT_TYPE
    """)


def _contagens(tabelas: list[dict]) -> dict[tuple[str, str], int]:
    # ponytail: COUNT(*) sequencial por tabela. Se >100 tabelas ou tabela >100M
    # linhas, trocar por sys.dm_db_partition_stats (aproximado, sem lock).
    resultado: dict[tuple[str, str], int] = {}
    with _conn() as conn, conn.cursor() as cur:
        for t in tabelas:
            fqn = f"[{t['schema_name']}].[{t['table_name']}]"
            try:
                cur.execute(f"SELECT COUNT(*) FROM {fqn}")
                resultado[(t["schema_name"], t["table_name"])] = int(cur.fetchone()[0])
            except Exception as exc:
                resultado[(t["schema_name"], t["table_name"])] = -1
                print(f"[warn] COUNT falhou em {fqn}: {exc}", file=sys.stderr)
    return resultado


def _render(tabelas, colunas, chaves, contagens) -> str:
    linhas: list[str] = [
        "# MS_digital — dump de schema",
        "",
        "Gerado por `data-platform/scripts/introspect_msdigital.py`. Nenhum dado",
        "sensível é incluído (só estrutura + contagens).",
        "",
        f"- Total de tabelas: **{len(tabelas)}**",
        f"- Total de colunas: **{len(colunas)}**",
        "",
        "## Índice de tabelas",
        "",
        "| Schema | Tabela | Linhas |",
        "|---|---|---:|",
    ]
    for t in tabelas:
        n = contagens.get((t["schema_name"], t["table_name"]), -1)
        n_str = f"{n:,}".replace(",", ".") if n >= 0 else "erro"
        linhas.append(f"| {t['schema_name']} | {t['table_name']} | {n_str} |")

    cols_por_tabela: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for c in colunas:
        cols_por_tabela[(c["schema_name"], c["table_name"])].append(c)

    chaves_por_tabela: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for k in chaves:
        chaves_por_tabela[(k["schema_name"], k["table_name"])].append(k)

    linhas += ["", "## Detalhe por tabela", ""]
    for t in tabelas:
        chave = (t["schema_name"], t["table_name"])
        linhas.append(f"### `{t['schema_name']}.{t['table_name']}`")
        linhas.append("")
        linhas.append("| # | Coluna | Tipo | Nulo | Default |")
        linhas.append("|---:|---|---|---|---|")
        for c in cols_por_tabela.get(chave, []):
            tipo = c["data_type"]
            if c["max_len"] and c["max_len"] > 0:
                tipo = f"{tipo}({c['max_len']})"
            default = c["default_value"] or ""
            linhas.append(
                f"| {c['pos']} | {c['column_name']} | {tipo} | {c['is_nullable']} | `{default}` |"
            )
        ks = chaves_por_tabela.get(chave, [])
        if ks:
            linhas.append("")
            linhas.append("**Chaves:**")
            for k in ks:
                linhas.append(f"- {k['tipo']} — `{k['column_name']}` ({k['constraint_name']})")
        linhas.append("")
    return "\n".join(linhas)


def main() -> None:
    print("Conectando ao MS_digital…", file=sys.stderr)
    tabelas = _tabelas()
    colunas = _colunas()
    chaves = _chaves()
    print(f"Coletando COUNT(*) de {len(tabelas)} tabelas…", file=sys.stderr)
    contagens = _contagens(tabelas)
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(_render(tabelas, colunas, chaves, contagens), encoding="utf-8")
    print(f"OK → {SAIDA}", file=sys.stderr)


if __name__ == "__main__":
    main()
