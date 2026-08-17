"""Cliente SQL Server (MS Digital cadastro) — exige VPN da SETDIG.

Alimenta datasets/msdigital-db/v1/*. Fora da VPN, `get_contas()` levanta
exceção — quem chama (run.py) registra "fonte indisponível" e segue,
mesmo padrão de extract/cartas.py.
"""
from __future__ import annotations

import os

import pymssql
from dotenv import load_dotenv

load_dotenv()


def _conn():
    host = os.getenv("MSDIGITAL_HOST")
    port = int(os.getenv("MSDIGITAL_PORT", "1433"))
    user = os.getenv("MSDIGITAL_USER")
    password = os.getenv("MSDIGITAL_PASSWORD")
    banco = os.getenv("MSDIGITAL_BANCO", "MS_digital")
    if not (host and user and password):
        raise RuntimeError("envs MSDIGITAL_HOST/USER/PASSWORD ausentes")
    return pymssql.connect(server=host, port=port, user=user, password=password,
                           database=banco, login_timeout=15, timeout=60)


def _fetch(sql: str) -> list[dict]:
    conn = _conn()
    try:
        with conn.cursor(as_dict=True) as cur:
            cur.execute(sql)
            return list(cur.fetchall())
    finally:
        conn.close()


# 1 SELECT amplo pra Conta + Usuario + Endereco — evita N+1 e mantém
# transform puro (recebe uma lista, gera N agregações).
_CONTAS_SQL = """
    SELECT
        c.cpf,
        c.ativo,
        c.ultimoLogin,
        c.createdAt AS conta_criada_em,
        c.contaGovBr,
        u.dataNascimento,
        e.cidade AS cidade_ibge,
        e.uf AS uf_ibge
    FROM dbo.Conta c
    LEFT JOIN dbo.Usuario u ON u.conta = c.cpf
    LEFT JOIN dbo.Endereco e ON e.cpf = c.cpf
"""


def get_contas() -> list[dict]:
    """Uma linha por conta com campos suficientes pra todas as agregações
    (KPIs, contas/ano, faixa etária, cidade, retenção). ~367k linhas atualmente,
    leitura em <10s no ambiente da SETDIG."""
    return _fetch(_CONTAS_SQL)


def get_matriculas_count() -> int:
    conn = _conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM dbo.CarteiraFuncional")
            return int(cur.fetchone()[0])
    finally:
        conn.close()
