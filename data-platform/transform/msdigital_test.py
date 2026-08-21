"""Testes de transform/msdigital.py — rodar com pytest ou:
python data-platform/transform/msdigital_test.py
"""
from datetime import date, datetime, timezone

from msdigital import (
    FAIXA_SEM_INFO,
    FAIXAS_ACESSO_ORDEM,
    _faixa,
    _idade,
    contas_ativas_por_cidade,
    contas_por_ano,
    contas_por_faixa_etaria,
    contas_por_faixa_etaria_no_periodo,
    contas_por_tipo_login,
    contas_por_tipo_login_no_periodo,
    faixas_de_acesso,
    faixas_de_acesso_no_periodo,
    faixas_de_acesso_por_tipo,
    faixas_de_acesso_por_tipo_no_periodo,
    resumo,
    resumo_periodo,
)

HOJE = date(2026, 8, 17)


def _dt(y, m=1, d=1):
    return datetime(y, m, d, tzinfo=timezone.utc)


def test_idade_none():
    assert _idade(None, HOJE) is None
    assert _idade("string qualquer", HOJE) is None


def test_idade_conta_aniversario():
    assert _idade(_dt(2000, 8, 17), HOJE) == 26
    assert _idade(_dt(2000, 8, 18), HOJE) == 25  # aniversário amanhã


def test_faixa():
    assert _faixa(None) == FAIXA_SEM_INFO
    assert _faixa(17) == "0-17"
    assert _faixa(18) == "18-24"
    assert _faixa(65) == "65+"
    # gate de idade absurda vive em _idade(), não em _faixa()
    assert _idade(_dt(1800), HOJE) is None


def test_resumo_vazio():
    assert resumo([], 0) == {"contasTotal": 0, "contasAtivas": 0, "matriculas": 0, "taxaAtivacaoPct": 0.0}


def test_resumo_calcula_taxa():
    r = resumo([{"ativo": True}, {"ativo": True}, {"ativo": False}], matriculas=42)
    assert r == {"contasTotal": 3, "contasAtivas": 2, "matriculas": 42, "taxaAtivacaoPct": 66.67}


def test_contas_por_ano_cobre_buracos():
    contas = [
        {"conta_criada_em": _dt(2020), "ativo": True},
        {"conta_criada_em": _dt(2022), "ativo": True},
        {"conta_criada_em": _dt(2022), "ativo": False},
    ]
    out = contas_por_ano(contas)
    assert [r["ano"] for r in out] == [2020, 2021, 2022]
    assert out[1] == {"ano": 2021, "criadas": 0, "ativas": 0}
    assert out[2] == {"ano": 2022, "criadas": 2, "ativas": 1}


def test_faixa_etaria_sem_info_sempre_presente():
    out = contas_por_faixa_etaria([{"dataNascimento": None}])
    nomes = [r["faixa"] for r in out]
    assert nomes[-1] == FAIXA_SEM_INFO
    assert out[-1]["quantidade"] == 1


def test_cidade_ignora_inativos_e_agrupa_fora_ms():
    contas = [
        {"ativo": True, "cidade_ibge": 5002704},   # Campo Grande
        {"ativo": True, "cidade_ibge": 5002704},
        {"ativo": True, "cidade_ibge": 3550308},   # São Paulo — fora de MS
        {"ativo": False, "cidade_ibge": 5002704},  # inativo, ignora
        {"ativo": True, "cidade_ibge": None},      # sem endereço, ignora
    ]
    out = contas_ativas_por_cidade(contas)
    cg = [r for r in out if r["cidade"] == "Campo Grande"][0]
    assert cg["ativas"] == 2
    fora = [r for r in out if r["cidade"].startswith("Outros")][0]
    assert fora["ativas"] == 1


def test_faixas_de_acesso_soma_igual_total():
    from datetime import timedelta as td
    hoje = datetime.now(timezone.utc)
    contas = [
        {"ultimoLogin": None, "conta_criada_em": None},                              # uma vez apenas (nunca logou)
        {"ultimoLogin": hoje, "conta_criada_em": hoje},                              # uma vez apenas (mesmo dia)
        {"ultimoLogin": hoje - td(days=30), "conta_criada_em": hoje - td(days=90)}, # 6m
        {"ultimoLogin": hoje - td(days=365), "conta_criada_em": hoje - td(days=800)},# 6m-2a
        {"ultimoLogin": hoje - td(days=1000), "conta_criada_em": hoje - td(days=1200)},# 2-4a
        {"ultimoLogin": hoje - td(days=1800), "conta_criada_em": hoje - td(days=1900)},# 4a+
    ]
    out = faixas_de_acesso(contas)
    assert sum(r["quantidade"] for r in out) == len(contas)
    assert [r["faixa"] for r in out] == FAIXAS_ACESSO_ORDEM


def test_faixas_de_acesso_uma_vez_apenas_pega_null_e_mesmo_dia():
    from datetime import timedelta as td
    hoje = datetime.now(timezone.utc)
    contas = [
        {"ultimoLogin": None, "conta_criada_em": hoje},
        {"ultimoLogin": hoje, "conta_criada_em": hoje},
    ]
    out = faixas_de_acesso(contas)
    uma_vez = next(r for r in out if r["faixa"] == "Uma vez apenas")
    assert uma_vez["quantidade"] == 2


def test_faixas_de_acesso_percent_soma_100():
    from datetime import timedelta as td
    hoje = datetime.now(timezone.utc)
    contas = [{"ultimoLogin": hoje - td(days=i * 30), "conta_criada_em": hoje - td(days=i * 30 + 500)} for i in range(20)]
    out = faixas_de_acesso(contas)
    soma = sum(r["percentPct"] for r in out)
    assert 99.5 <= soma <= 100.5, f"soma percent {soma}"


def test_faixas_de_acesso_vazio():
    out = faixas_de_acesso([])
    assert all(r["quantidade"] == 0 and r["percentPct"] == 0.0 for r in out)
    assert len(out) == 5


# ---------------------------------------------------------------------------
# Novos: filtros por período (breakdown dia/semana/mês/ano)
# ---------------------------------------------------------------------------

INI = date(2026, 8, 1)
FIM = date(2026, 8, 31)


def _contas_ativas_e_fora():
    """Base: 3 dentro do período (ago/2026), 2 fora (jul/2026 e set/2026),
    1 sem ultimoLogin."""
    return [
        {"ultimoLogin": _dt(2026, 8, 1), "conta_criada_em": _dt(2024, 1, 1),
         "contaGovBr": True, "dataNascimento": _dt(1990, 1, 1)},
        {"ultimoLogin": _dt(2026, 8, 15), "conta_criada_em": _dt(2023, 1, 1),
         "contaGovBr": False, "dataNascimento": _dt(1980, 1, 1)},
        {"ultimoLogin": _dt(2026, 8, 31), "conta_criada_em": _dt(2022, 1, 1),
         "contaGovBr": True, "dataNascimento": _dt(2005, 1, 1)},
        {"ultimoLogin": _dt(2026, 7, 31), "conta_criada_em": _dt(2020, 1, 1),
         "contaGovBr": False, "dataNascimento": _dt(1970, 1, 1)},
        {"ultimoLogin": _dt(2026, 9, 1), "conta_criada_em": _dt(2020, 1, 1),
         "contaGovBr": True, "dataNascimento": _dt(1970, 1, 1)},
        {"ultimoLogin": None, "conta_criada_em": _dt(2024, 6, 1),
         "contaGovBr": None, "dataNascimento": None},
    ]


def test_resumo_periodo_conta_ativos_no_bucket():
    r = resumo_periodo(_contas_ativas_e_fora(), INI, FIM)
    assert r["ativosNoPeriodo"] == 3
    assert r["totalCadastro"] == 6
    assert r["participacaoPct"] == 50.0


def test_resumo_periodo_borda_de_dia():
    contas = [
        {"ultimoLogin": _dt(2026, 7, 31), "conta_criada_em": None},  # fora, dia antes
        {"ultimoLogin": _dt(2026, 8, 1), "conta_criada_em": None},   # dentro, primeiro dia
        {"ultimoLogin": _dt(2026, 8, 31), "conta_criada_em": None},  # dentro, último dia
        {"ultimoLogin": _dt(2026, 9, 1), "conta_criada_em": None},   # fora, dia depois
    ]
    r = resumo_periodo(contas, INI, FIM)
    assert r["ativosNoPeriodo"] == 2


def test_resumo_periodo_vazio():
    assert resumo_periodo([], INI, FIM) == {
        "ativosNoPeriodo": 0, "totalCadastro": 0, "participacaoPct": 0.0,
    }


def test_faixas_de_acesso_no_periodo_filtra_por_ultimo_login():
    out = faixas_de_acesso_no_periodo(_contas_ativas_e_fora(), INI, FIM)
    # 3 ativos no período, todos com ultimoLogin recente (relativo a fim=31/ago)
    assert sum(r["quantidade"] for r in out) == 3


def test_contas_por_tipo_login_no_periodo():
    out = contas_por_tipo_login_no_periodo(_contas_ativas_e_fora(), INI, FIM)
    # 3 ativos no bucket: 2 govbr, 1 próprio
    govbr = next(r for r in out if r["tipo"] == "Gov.BR")
    proprio = next(r for r in out if r["tipo"] == "Login Próprio")
    assert govbr["quantidade"] == 2
    assert proprio["quantidade"] == 1


def test_faixas_de_acesso_por_tipo_no_periodo():
    out = faixas_de_acesso_por_tipo_no_periodo(_contas_ativas_e_fora(), INI, FIM)
    # soma total = 3 ativos no bucket
    assert sum(r["total"] for r in out) == 3


def test_contas_por_faixa_etaria_no_periodo_ignora_fora():
    out = contas_por_faixa_etaria_no_periodo(_contas_ativas_e_fora(), INI, FIM)
    # 3 ativos no bucket: 36 anos (35-44), 46 anos (45-54), 21 anos (18-24)
    assert sum(r["quantidade"] for r in out) == 3


if __name__ == "__main__":
    for nome, fn in list(globals().items()):
        if nome.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {nome}")
    print("todos passaram")
