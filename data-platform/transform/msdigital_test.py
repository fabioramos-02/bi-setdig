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
    faixas_de_acesso,
    resumo,
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


if __name__ == "__main__":
    for nome, fn in list(globals().items()):
        if nome.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {nome}")
    print("todos passaram")
