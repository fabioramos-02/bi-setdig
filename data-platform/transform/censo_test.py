"""Testes de transform/censo.py — rodar com pytest ou:
python data-platform/transform/censo_test.py
"""
from censo import achar_cabecalho, indice_inventario, mapear_colunas, montar_orgao, parse_demanda, parse_nivel, sigla_da_aba

HEADER = ("Setor", "Qual é o nome desta carta de serviço?",
          "Qual o número de solicitações que este serviço recebe por mês?",
          "Quem são os principais usuários?", "Qual o grau de digitalização deste serviço?",
          "Caso haja etapa presencial, descreva-a.")
# AGRAER: 2 colunas a mais (Gerência no início, link depois do nome)
HEADER_AGRAER = ("Gerência", "Setor", "Qual é o nome desta carta de serviço?", "link",
                 "Qual o número de solicitações que este serviço recebe por mês?",
                 "Quem são os principais usuários?", "Qual o grau de digitalização deste serviço?",
                 "Caso haja etapa presencial, descreva-a.")


def test_mapeia_colunas_por_palavra_chave():
    assert mapear_colunas(HEADER) == {"setor": 0, "titulo": 1, "demanda": 2, "grau": 4, "etapaPresencial": 5}
    assert mapear_colunas(HEADER_AGRAER) == {
        "setor": 1, "titulo": 2, "link": 3, "demanda": 4, "grau": 6, "etapaPresencial": 7}


def test_cabecalho_depois_das_linhas_de_responsavel():
    rows = [(None, "Nome responsável pelo preenchimento:", "Fulana"), (None, "E-mail institucional:"), HEADER]
    assert achar_cabecalho(rows) == 2
    assert achar_cabecalho([("a",), ("b",)]) is None


def test_parse_nivel():
    assert parse_nivel("4 - 100% digital para o cidadão") == 4
    assert parse_nivel("0 - Informação e serviço prestados apenas presencialmente.") == 0
    assert parse_nivel(5) == 5
    assert parse_nivel(None) is None
    assert parse_nivel("Projeto Finalizado") is None
    assert parse_nivel(10) is None


def test_parse_demanda():
    assert parse_demanda(224) == (224.0, None)
    assert parse_demanda(0.41666666666666669) == (0.4, None)
    assert parse_demanda("2550") == (2550.0, None)
    assert parse_demanda("Em média 38.702") == (38702.0, None)
    assert parse_demanda("2,000") == (2000.0, None)
    assert parse_demanda("aprox 5500 autorizações") == (5500.0, None)
    assert parse_demanda("7 ao ano") == (round(7 / 12, 1), None)
    assert parse_demanda("Não é possível quantificar") == (None, "Não é possível quantificar")
    assert parse_demanda("2,000 análises, 550 solicitações") == (None, "2,000 análises, 550 solicitações")
    assert parse_demanda(None) == (None, None)


def test_sigla_da_aba():
    assert sigla_da_aba("Serviços fundesporte") == "FUNDESPORTE"
    assert sigla_da_aba("Serviços SEFAZ") == "SEFAZ"


def test_montar_orgao_casa_inventario_e_ignora_responsavel():
    inv = [{"titulo": "Solicitar Algo", "slug": "solicitar-algo1", "categoria": "fazenda",
            "orgao": "Secretaria de Fazenda", "orgaoSigla": "SEFAZ MS"}]
    cartas_idx, nomes = indice_inventario(inv)
    rows = [(None, "Nome responsável pelo preenchimento:", "Fulana"),
            (None, "E-mail institucional:", "fulana@x.ms.gov.br"),
            HEADER,
            ("Setor A", "Solicitar algo", "10", "Cidadão", "2 - Parte do processo digital", "Vistoria"),
            ("Setor B", "Outro serviço", None, "Empresa", None, None),
            (None, None, None)]
    o = montar_orgao("SEFAZ", rows, cartas_idx, nomes)
    assert o["orgaoNome"] == "Secretaria de Fazenda"
    assert len(o["cartas"]) == 2
    a, b = o["cartas"]
    assert a["nivel"] == 2 and a["demandaMensal"] == 10.0 and a["etapaPresencial"] == "Vistoria"
    assert a["urlServico"] == "https://www.ms.gov.br/fazenda/solicitar-algo1"
    assert b["nivel"] is None and b["urlServico"] is None
    assert "Fulana" not in str(o)


if __name__ == "__main__":
    for nome, fn in list(globals().items()):
        if nome.startswith("test_"):
            fn()
            print("ok", nome)
