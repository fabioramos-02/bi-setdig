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
"""


def contar_usuarios_total(app_id: int = APP_ID_PORTAL_UNICO) -> int:
    """`count(distinct user_id)` histórico completo do Portal Único.

    Sem filtro de data — retorna 1 número absoluto: quantos cidadãos
    distintos já fizeram login ao menos uma vez desde o início da tabela.
    Espelha exatamente o SQL do ticket SGD (versão simplificada 2026-08)."""
    conn = psycopg2.connect(_connection_url(), connect_timeout=10, client_encoding="utf8")
    try:
        with conn.cursor() as cur:
            cur.execute(_CONTAGEM_SQL, (app_id,))
            row = cur.fetchone()
            return int(row[0]) if row and row[0] is not None else 0
    finally:
        conn.close()


def contar_aplicacoes_oauth() -> int:
    """`count(*)` da tabela `oauth2_provider_application` — número de sistemas
    que fazem login único via Portal Único (Gov.BR / SSO). Snapshot absoluto,
    sem filtro temporal — mesmo padrão de `contar_usuarios_total`. Card
    'Sistemas integrados ao Gov.BR' na Visão Geral do Portal Único."""
    conn = psycopg2.connect(_connection_url(), connect_timeout=10, client_encoding="utf8")
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM public.oauth2_provider_application")
            row = cur.fetchone()
            return int(row[0]) if row and row[0] is not None else 0
    finally:
        conn.close()


def listar_sistemas_com_assinador() -> list[dict]:
    """Sistemas integrados ao Assinador Gov.BR — apps com callback ativo em
    `authentication_assinaturaredirecionamento`. Config estática (cadastro
    manual pela SGD). Dedupe por app_id (mesmo app pode ter N callbacks).
    Retorna [{appId, nome, callback}] ordenado por nome."""
    conn = psycopg2.connect(_connection_url(), connect_timeout=10, client_encoding="utf8")
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.id, a.name, r.redirect_to
                FROM public.oauth2_provider_application a
                JOIN public.authentication_assinaturaredirecionamento r ON r.app_id = a.id
                WHERE r.ativo = true
                ORDER BY a.name
                """
            )
            vistos = set()
            saida: list[dict] = []
            for id_, nome, callback in cur.fetchall():
                if id_ in vistos:
                    continue
                vistos.add(id_)
                saida.append({"appId": int(id_), "nome": nome, "callback": callback})
            return saida
    finally:
        conn.close()
