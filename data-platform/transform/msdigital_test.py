"""Testes de transform/msdigital.py — rodar com pytest ou:
python data-platform/transform/msdigital_test.py
"""
from datetime import date, datetime, timezone

from msdigital import (
    FAIXA_SEM_INFO,
    _faixa,
    _idade,
    contas_ativas_por_cidade,
    contas_por_ano,
    contas_por_faixa_etaria,
    resumo,
    uso_retencao,
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


def test_uso_retencao_categoriza_ultimo_login():
    hoje = datetime.now(timezone.utc)
    contas = [
        {"ultimoLogin": None},                                             # nunca
        {"ultimoLogin": hoje.replace(year=hoje.year - 3)},                 # inativo 2a+
        {"ultimoLogin": hoje.replace(day=1, month=max(1, hoje.month - 1))},  # recorrente
    ]
    out = uso_retencao(contas)
    assert out["nuncaAcessou"] == 1
    assert out["inativos2Anos"] == 1
    assert out["recorrentes6Meses"] == 1
    assert out["totalContas"] == 3


if __name__ == "__main__":
    for nome, fn in list(globals().items()):
        if nome.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {nome}")
    print("todos passaram")
