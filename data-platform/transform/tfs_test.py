"""Testes de transform/tfs.py — rodar com pytest ou:
python data-platform/transform/tfs_test.py
"""
from datetime import date

from tfs import codigo_catalogo, frente, montar_itens, montar_sprints, orgao_da_feature

HOJE = date(2026, 10, 26)
SIGLAS = {"SES", "IMASUL", "DETRAN", "SEDMS"}
CATALOGO = {"data": [{"id": 343, "complexidades": [
    {"complexidade": "Simples", "valorUst": 3, "id": 563},
    {"complexidade": "Complexa", "valorUst": 9, "id": 565}]}]}


def _w(i, tipo, titulo, **campos):
    return {"id": i, "fields": {"System.WorkItemType": tipo, "System.Title": titulo,
                                "System.State": campos.pop("estado", "New"),
                                "System.AreaPath": campos.pop("area", "XVIA"),
                                "System.ChangedDate": "2026-10-20T10:00:00Z", **campos}}


def _itens():
    arvore = {1: None, 2: 1, 3: 2, 4: 3, 5: 2}
    brutos = [
        _w(1, "Epic", "Serviços - App e Portal"),
        _w(2, "Feature", "[SES] - Saúde"),
        _w(3, "Product Backlog Item", "Cartão do SUS", **{"System.BoardColumn": "Impedido"}),
        _w(4, "Task", "AS IS", estado="Done", area="XVIA\\SGD\\Interno",
           **{"Custom.SGI.LancamentoAtividadeID": "565", "Custom.SGI.AtividadeUST": "BI"}),
        _w(5, "Bug", "Erro", **{"System.BoardColumn": "Área de Negócios", "System.Tags": "Bug; Dependência"}),
    ]
    return {i["id"]: i for i in montar_itens(arvore, brutos, CATALOGO, SIGLAS, HOJE)}


def test_frente_pela_area():
    assert frente("XVIA\\SGD") == "SGD"
    assert frente("XVIA\\SGD\\Interno") == "SGD"
    assert frente("XVIA\\Customização UST") == "X-VIA"
    assert frente("XVIA\\SGDX") == "X-VIA"


def test_orgao_pelo_prefixo_da_feature():
    assert orgao_da_feature("[SES] - Saúde", SIGLAS) == "SES"
    assert orgao_da_feature("[SS] IMASUL", SIGLAS) == "IMASUL"
    assert orgao_da_feature("[SED] - Educação", SIGLAS) == "SEDMS"
    assert orgao_da_feature("[Portal] Home", SIGLAS) is None
    assert orgao_da_feature("Sem prefixo", SIGLAS) is None


def test_hierarquia_e_orgao():
    task = _itens()[4]
    assert (task["epico"], task["feature"], task["pbiId"], task["orgao"]) == (
        "Serviços - App e Portal", "[SES] - Saúde", 3, "SES")


def test_ust_pelo_lancamento():
    itens = _itens()
    assert itens[4]["ust"] == 9 and itens[4]["frente"] == "SGD"
    assert itens[3]["ust"] is None


def test_pendencia_por_coluna_ou_dependencia():
    itens = _itens()
    assert itens[3]["pendencia"] is True
    assert itens[5]["pendencia"] is True
    assert itens[4]["pendencia"] is False  # Task não entra


def test_tipo_entrega_task_herda_do_pbi():
    itens = _itens()
    assert itens[5]["tipoEntrega"] == "Negócio"
    assert itens[3]["tipoEntrega"] is None  # Impedido não é tipo de entrega
    assert itens[4]["tipoEntrega"] is None


def test_dias_sem_atualizar():
    assert _itens()[3]["diasSemAtualizar"] == 6


def test_codigo_catalogo_na_descricao():
    assert codigo_catalogo("<div>Validar.<br>Catálogo DOC.07 - Elaboração</div>") == "DOC.07"
    assert codigo_catalogo("Catalogo NEG.03/04/05 (definir)") == "NEG.03/04/05"
    assert codigo_catalogo("sem código") is None
    assert codigo_catalogo(None) is None


def test_sprints():
    s = montar_sprints([{"path": "XVIA\\Sprint 5", "name": "Sprint 5", "attributes": {
        "startDate": "2026-10-14T00:00:00Z", "finishDate": "2026-10-27T00:00:00Z", "timeFrame": "current"}}])
    assert s == [{"sprint": "XVIA\\Sprint 5", "nome": "Sprint 5", "inicio": "2026-10-14",
                  "fim": "2026-10-27", "situacao": "atual"}]


if __name__ == "__main__":
    for nome, fn in list(globals().items()):
        if nome.startswith("test_"):
            fn()
    print("ok")
