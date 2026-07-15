"""Cliente Postgres (Qualidade das Cartas) — exige VPN da SETDIG.

Espelha extract/cartas.py: mesma conexão, mesmo padrão de query crua.
`conteudo`/`resolucao` (texto livre do cidadão) alimentam o detalhamento
operacional (transform/qualidade.py::relacao, truncado antes de publicar).
`ip`, `reportado_por_id`/`corrigido_por_id` (FK de pessoa) continuam de fora —
PII, nunca selecionados.
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


_ERROS_SQL = """
    SELECT e.id, e.servico_id, s.titulo AS titulo_servico,
           t.slug AS categoria_slug, o.sigla AS orgao_sigla, o.nome AS orgao,
           e.atendido, e.conteudo, e.resolucao, e.created_at, e.updated_at
    FROM gerenciamento_servicoserros e
    JOIN gerenciamento_servicos s ON e.servico_id = s.id
    JOIN gerenciamento_setor st ON s.setor_id = st.id
    JOIN gerenciamento_orgaos o ON st.orgao_id = o.id
    LEFT JOIN gerenciamento_temas t ON s.tema_id = t.id
"""

_VOTOS_SQL = """
    SELECT id, servicos_id AS servico_id, avaliacao, created_at
    FROM gerenciamento_votosservicos
"""

_AVALIACAO_INFO_SQL = """
    SELECT id, servico_id, avaliacao, created_at
    FROM gerenciamento_avaliacaoinformacaoservicos
"""


def _query(sql: str) -> list[dict]:
    # client_encoding explícito: sem isso, psycopg2 nesta máquina negocia um
    # encoding que corrompe acento (Ag�ncia, Sa�de) mesmo com o banco em
    # UTF-8 — mesmo achado de extract/cartas.py.
    conn = psycopg2.connect(_connection_url(), connect_timeout=10, client_encoding="utf8")
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            colunas = [d[0] for d in cur.description]
            return [dict(zip(colunas, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def get_erros() -> list[dict]:
    """Erros reportados pelo cidadão nas cartas de serviço. `atendido` é o
    único status estruturado (sem gravidade/categoria/reincidência no
    schema real) — "tempo de resolução" só dá pra aproximar via
    `updated_at - created_at` nos erros com `atendido=true` (não existe
    `resolved_at` dedicado)."""
    return _query(_ERROS_SQL)


def get_votos() -> list[dict]:
    """Nota 1-5 dada pelo cidadão ao serviço (CSAT) — satisfação, não erro
    técnico."""
    return _query(_VOTOS_SQL)


def get_avaliacao_informacao() -> list[dict]:
    """Avaliação booleana de se a DESCRIÇÃO da carta (não o serviço em si)
    ficou clara — dado extraído no legado mas nunca virou gráfico."""
    return _query(_AVALIACAO_INFO_SQL)
