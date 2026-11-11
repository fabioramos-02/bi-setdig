"""Testes de transform/tfs.py — rodar com pytest ou:
python data-platform/transform/tfs_test.py
"""
from datetime import date

from tfs import agrupar, codigo_catalogo, frente, ler_widget, montar_itens, montar_sprints, orgao_da_feature

HOJE = date(2026, 10, 26)
SIGLAS = {"SES", "IMASUL", "DETRAN", "SEDMS"}
CATALOGO = {"contrato": "Governo do Estado", "data": [{"id": 343, "complexidades": [
    {"complexidade": "Simples", "valorUst": 3, "id": 563},
    {"complexidade": "Complexa", "valorUst": 9, "id": 565}]}]}
# Mesmo id de complexidade (565) com outro valor no catálogo do contrato X-VIA.
XVIA = "004/2026 - 30524 - XVIA TECNOLOGIA LTDA"
CATALOGO_XVIA = {"contrato": XVIA, "data": [
    {"id": 900, "descricaoAtividade": "DEV.08 - Desenvolvimento de funcionalidade", "complexidades": [
        {"complexidade": "Complexa", "valorUst": 20, "id": 565}]},
    {"id": 901, "descricaoAtividade": "NEG.03 - Diagrama", "complexidades": [
        {"complexidade": "Simples", "valorUst": 4, "id": 601}, {"complexidade": "Complexa", "valorUst": 8, "id": 602}]}]}


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
    return {i["id"]: i for i in montar_itens(arvore, brutos, [CATALOGO, CATALOGO_XVIA], SIGLAS, HOJE)}


def _task(**campos):
    return montar_itens({1: None}, [_w(1, "Task", "T", **campos)], [CATALOGO, CATALOGO_XVIA], SIGLAS, HOJE)[0]


def test_ust_pelo_catalogo_do_contrato_da_task():
    def ust(empresa):
        campos = {"Custom.SGI.LancamentoAtividadeID": "565"}
        if empresa:
            campos["Custom.SGI.Empresa"] = empresa
        item = _task(**campos)
        return item["empresa"], item["ust"]
    assert ust(XVIA) == (XVIA, 20)
    assert ust("Governo do Estado") == ("Governo do Estado", 9)
    assert ust(None) == (None, 9)  # Task antiga sem contrato: catálogo padrão


def test_codigo_da_atividade_x_via_e_fallback_da_descricao():
    marcada = _task(**{"Custom.SGI.Empresa": XVIA, "Custom.SGI.LancamentoAtividadeID": "565",
                       "Custom.SGI.AtividadeUST": "DEV.08 - Desenvolvimento de funcionalidade"})
    assert (marcada["codigoCatalogo"], marcada["ust"]) == ("DEV.08", 20)
    # sem contrato: código da descrição, valor do catálogo X-VIA se a atividade tem 1 complexidade
    so_descricao = _task(**{"System.Description": "Catálogo DEV.08 - tela de login"})
    assert (so_descricao["codigoCatalogo"], so_descricao["ust"]) == ("DEV.08", 20)
    # atividade com várias complexidades e nenhuma marcada: sem valor (a classificar)
    assert _task(**{"System.Description": "Catálogo NEG.03 - diagrama"})["ust"] is None


def test_frente_pela_area():
    assert frente("XVIA\\SGD") == "SGD"
    assert frente("XVIA\\SGD\\Interno") == "SGD"
    assert frente("XVIA\\Customização UST") == "X-VIA"
    assert frente("XVIA\\SGDX") == "X-VIA"


def test_frente_entrega_por_area_prefixo_ou_epico_sgd():
    pbi = "Product Backlog Item"
    assert frente("XVIA", pbi, "[SGD] - Cronograma") == "SGD"  # título [SGD] fora da área SGD
    assert frente("XVIA", pbi, "Tela de login", epico_id=1333593) == "SGD"
    assert frente("XVIA", pbi, "Tela de login") == "X-VIA"


def test_frente_da_task_e_o_contrato():
    t = "Task"
    # #1372987: área SGD (herdou do PBI [SGD]), contrato X-VIA -> X-VIA (conta UST)
    assert frente("XVIA\\SGD", t, "[SGD] - Integrar", XVIA) == "X-VIA"
    # contrato Governo do Estado em área X-VIA -> SGD (nunca soma na X-VIA)
    assert frente("XVIA\\Customização UST", t, "Doc", "Governo do Estado") == "SGD"
    assert frente("XVIA\\Customização UST", t, "Doc") == "X-VIA"  # sem contrato, área faturada
    assert frente("XVIA\\SGD\\Interno", t, "Reunião") == "SGD"
    assert frente("XVIA", t, "Protótipo") == "Não identificado"  # sem contrato, sem pista


def test_task_sem_contrato_na_area_ust_nao_recebe_ust_do_governo():
    # id 565 vale 9 no catálogo Governo e 20 no X-VIA: na área faturada, só o X-VIA vale.
    item = _task(**{"System.AreaPath": "XVIA\\Customização UST", "Custom.SGI.LancamentoAtividadeID": "565"})
    assert (item["frente"], item["ust"]) == ("X-VIA", 20)


def test_so_task_tem_ust():
    pbi = montar_itens({1: None}, [_w(1, "Product Backlog Item", "P", **{
        "Custom.SGI.Empresa": XVIA, "Custom.SGI.LancamentoAtividadeID": "565"})], [CATALOGO, CATALOGO_XVIA], SIGLAS, HOJE)[0]
    assert pbi["ust"] is None


def test_frente_ignora_o_responsavel():
    sgd_com_contrato_xvia = _task(**{"Custom.SGI.Empresa": XVIA, "System.AssignedTo": "Fabio <SEGOV\\framos>"})
    assert (sgd_com_contrato_xvia["frente"], sgd_com_contrato_xvia["timeSgd"]) == ("X-VIA", True)
    sem_resp = _task(**{"Custom.SGI.Empresa": "Governo do Estado"})
    assert sem_resp["frente"] == "SGD"


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


def test_ler_widget():
    card = {"name": "BUG", "position": {"row": 2, "column": 3}, "settings": '{"queryId": "q1", "queryName": "Bugs"}'}
    grafico = {"name": "PACOTES DE ENTREGA", "position": {"row": 3, "column": 4},
               "settings": '{"transformOptions": {"filter": "q2", "groupBy": "System.BoardColumn"}}'}
    assert ler_widget(card) == {"titulo": "BUG", "queryId": "q1", "groupBy": None, "ordem": (2, 3)}
    assert ler_widget(grafico)["groupBy"] == "System.BoardColumn"
    assert ler_widget({"name": "XVIA Team", "settings": '{"members": []}'}) is None
    assert ler_widget({"name": "Work", "settings": "não é json"}) is None


def test_agrupar():
    assert agrupar(["XVIA\\Sprint 7", "XVIA\\Sprint 7", "XVIA", None], "System.IterationPath") == [
        {"rotulo": "Sprint 7", "qtd": 2}, {"rotulo": "Sem sprint", "qtd": 1}, {"rotulo": "Sem valor", "qtd": 1}]
    assert agrupar(["Em Produção", "A fazer", "Em Produção"], "System.BoardColumn")[0] == {"rotulo": "Em Produção", "qtd": 2}


def test_responsavel_datas_e_dependencias():
    from tfs import PRED, SUCC
    url = "https://tfs/_apis/wit/workItems/"
    brutos = [_w(1, "Product Backlog Item", "A", **{
        "System.AssignedTo": "Maycon Renato <FAZENDA/malisboa>",
        "Microsoft.VSTS.Scheduling.StartDate": "2026-11-01T00:00:00Z"})]
    rel = {1: [{"rel": PRED, "url": url + "7"}, {"rel": SUCC, "url": url + "9"},
               {"rel": "System.LinkTypes.Related", "url": url + "8"}]}
    item = montar_itens({1: None}, brutos, [CATALOGO], SIGLAS, HOJE, rel)[0]
    assert item["responsavel"] == "Maycon Renato"
    assert item["inicioPrevisto"] == "2026-11-01"
    assert (item["dependeDe"], item["trava"]) == ([7], [9])
    sem = montar_itens({1: None}, [_w(1, "Task", "T")], [CATALOGO], SIGLAS, HOJE)[0]
    assert (sem["responsavel"], sem["dependeDe"], sem["trava"]) == (None, [], [])


def test_time_sgd_pelo_login_do_responsavel():
    from tfs import login
    assert login("Daniele Lins Ichiy <SEGOV\\dichiy>") == "segov\\dichiy"
    assert login({"displayName": "Fabio", "uniqueName": "SEGOV\\framos"}) == "segov\\framos"
    assert login(None) is None
    assert _task(**{"System.AssignedTo": "Glaucia <SEGOV\\goliveira>"})["timeSgd"] is True
    assert _task(**{"System.AssignedTo": "Maycon Renato <FAZENDA/malisboa>"})["timeSgd"] is False


def test_orgao_do_campo_vence_o_prefixo_da_feature_e_financeiro_passa_direto():
    arvore = {1: None, 2: 1, 3: 2}
    brutos = [_w(1, "Epic", "Serviços"), _w(2, "Feature", "[SES] - Saúde"),
              _w(3, "Task", "T", **{"Custom.SGD.OrgaosSecretarias": "detran",
                                     "Custom.SGI.Faturado": "Sim",
                                     "Custom.SGI.DataFaturamento": "2026-11-05T00:00:00Z"})]
    por_id = {i["id"]: i for i in montar_itens(arvore, brutos, [CATALOGO], SIGLAS, HOJE)}
    assert (por_id[3]["orgao"], por_id[3]["orgaoOrigem"]) == ("DETRAN", "campo")
    assert (por_id[2]["orgao"], por_id[2]["orgaoOrigem"]) == ("SES", "feature")
    assert (por_id[3]["faturado"], por_id[3]["dataFaturamento"]) == ("Sim", "2026-11-05")
    assert (por_id[1]["orgao"], por_id[1]["orgaoOrigem"], por_id[1]["faturado"]) == (None, None, None)


def test_task_herda_orgao_do_campo_do_pbi():
    arvore = {1: None, 2: 1, 3: 2, 4: 3}
    brutos = [_w(1, "Epic", "Minha Área"), _w(2, "Feature", "Painel Saúde"),
              _w(3, "Product Backlog Item", "Cartão SUS",
                 **{"Custom.SGD.OrgaosSecretarias": "SES: Secretaria de Estado de Saúde de Mato Grosso do Sul"}),
              _w(4, "Task", "Protótipo")]
    por_id = {i["id"]: i for i in montar_itens(arvore, brutos, [CATALOGO], SIGLAS, HOJE)}
    assert (por_id[4]["orgao"], por_id[4]["orgaoOrigem"]) == ("SES", "campo")
    assert por_id[2]["orgao"] is None  # a Feature não herda de filho


def test_sigla_do_campo_da_lista_do_tfs():
    from tfs import sigla_do_campo
    assert sigla_do_campo("CGE MS: Controladoria Geral do Estado de Mato Grosso do Sul") == "CGEMS"
    assert sigla_do_campo("FERTEL - Rede Educativa MS: Fundação Estadual…") == "FERTELEDUCATIVAMS"
    assert sigla_do_campo("detran") == "DETRAN"
    assert sigla_do_campo(None) is None


if __name__ == "__main__":
    for nome, fn in list(globals().items()):
        if nome.startswith("test_"):
            fn()
    print("ok")
