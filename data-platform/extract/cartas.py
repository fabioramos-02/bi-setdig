"""Cliente Postgres (Cartas de Serviço) — exige VPN da SETDIG.

Fora da VPN, `get_inventory_count()` levanta exceção — quem chama decide se
aborta ou registra "fonte indisponível" no log de execução (ver
data-platform/publish/writer.py).
"""
from __future__ import annotations

import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def _connection_url() -> str:
    host = os.getenv("HOST", "localhost")
    port = os.getenv("PORT", "5432")
    user = os.getenv("USER", "")
    password = os.getenv("PASSWORD", "")
    database = os.getenv("BANCO", "postgres")
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


def get_inventory_count() -> int:
    """Consulta mínima de conectividade — conta linhas de gerenciamento_servicos."""
    conn = psycopg2.connect(_connection_url(), connect_timeout=10)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM gerenciamento_servicos")
            return cur.fetchone()[0]
    finally:
        conn.close()
