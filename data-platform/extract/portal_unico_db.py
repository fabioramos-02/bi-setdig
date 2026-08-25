"""Cliente Postgres — banco `controlador_prd` (autenticação do Portal Único).

Fonte para o card "Cidadãos usando o Portal Único" da Visão Geral. Exige VPN
da SETDIG. Assume mesmo cluster que `admin_prd` (cartas.py) por padrão —
sobrescrever com CONTROLADOR_HOST/USER/PASSWORD/PORT quando não for o caso.

`authentication_historicologin` guarda 1 linha por login (não é tabela de
"cadastro" pura) — `count(distinct user_id)` = "usuários que já acessaram ao
menos uma vez", que é o proxy prático de "cidadão que usa o Portal Único" (o
cadastro sem primeiro login não vira uso). Ver ADR-013 e docstring do
`contar_usuarios_ate`.
"""
from __future__ import annotations

import os
from datetime import date

import psycopg2
from dotenv import load_dotenv

load_dotenv()

APP_ID_PORTAL_UNICO = 36


def _connection_url() -> str:
    """Cai nos vars da conexão de cartas quando CONTROLADOR_* não existem
    (mesmo cluster/user assumido) — só BANCO_CONTROLADOR é obrigatório."""
    host = os.getenv("CONTROLADOR_HOST") or os.getenv("HOST", "localhost")
    port = os.getenv("CONTROLADOR_PORT") or os.getenv("PORT", "5432")
    user = os.getenv("CONTROLADOR_USER") or os.getenv("USER", "")
    password = os.getenv("CONTROLADOR_PASSWORD") or os.getenv("PASSWORD", "")
    database = os.getenv("BANCO_CONTROLADOR", "controlador_prd")
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


_CONTAGEM_SQL = """
    SELECT count(distinct user_id) AS total
    FROM public.authentication_historicologin
    WHERE app_id = %s
      AND created_at <= %s
"""


def contar_usuarios_ate(fim_janela: date, app_id: int = APP_ID_PORTAL_UNICO) -> int:
    """`count(distinct user_id)` acumulado até `fim_janela` (inclusive).

    Formato ISO de data é passado como parâmetro (nunca interpolado em
    string) — o SQL original do ticket usava `'03/31/2026'`, formato
    ambíguo (MM/DD/YYYY vs DD/MM/YYYY) e sujeito ao locale do servidor.

    `fim_janela` é uma `date` — psycopg2 converte para o tipo `date` no
    Postgres, o `<=` compara `created_at::date`. Se precisar de precisão
    até fim-do-dia (23:59:59), passar `datetime` correspondente.
    """
    conn = psycopg2.connect(_connection_url(), connect_timeout=10, client_encoding="utf8")
    try:
        with conn.cursor() as cur:
            cur.execute(_CONTAGEM_SQL, (app_id, fim_janela))
            row = cur.fetchone()
            return int(row[0]) if row and row[0] is not None else 0
    finally:
        conn.close()
