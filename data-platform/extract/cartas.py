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


_INVENTARIO_SQL = """
    SELECT s.id, s.titulo, s.slug, s.nome_popular, s.ativo, s.digital, s.online,
           s.agendavel, s.acesso_externo, s.url_externo, s.publico,
           s.publico_especifico, s.custo, s.tempo_total, s.tipo_tempo,
           s.destaque, s.updated_at, s.created_at,
           o.nome AS orgao, o.sigla AS orgao_sigla, st.nome AS setor,
           t.slug AS categoria_slug
    FROM gerenciamento_servicos s
    JOIN gerenciamento_setor st ON s.setor_id = st.id
    JOIN gerenciamento_orgaos o ON st.orgao_id = o.id
    LEFT JOIN gerenciamento_temas t ON s.tema_id = t.id
"""


def _query(sql: str) -> list[dict]:
    conn = psycopg2.connect(_connection_url(), connect_timeout=10)
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            colunas = [d[0] for d in cur.description]
            return [dict(zip(colunas, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def get_inventario() -> list[dict]:
    """Cartas de serviço + órgão + setor + categoria — base do domínio Serviços
    (ADR-005). `created_at` alimenta "Novos Serviços"; `setor` (nome da unidade)
    alimenta a análise de setor mais demandado."""
    return _query(_INVENTARIO_SQL)
