"""Testes de transform/inventario_sistemas.py — rodar com pytest ou:
python data-platform/transform/inventario_sistemas_test.py
"""
from inventario_sistemas import (
    chave,
    criterios,
    montar_indicacoes,
    montar_orgaos,
    montar_pendencias,
    montar_sistemas,
    nivel_criticidade,
)

HEAD = ("#", "Nome do Sistema", "Descrição", "Órgão Responsável", "Nome do Gestor do Sistema", "Data da Avaliação",
        "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "Pts", "%", "Nível de Criticidade",
        "Indicado por quantos órgãos", "Quantas vezes foi indicado", "Órgãos que indicaram uso",
        "Contato do gestor", "Sigla", "Origem", "Fonte do órgão responsável")


def linha(n, nome, orgao, crit=(None,) * 8, usam=None, contato=None, n_orgaos=0):
    return (n, nome, None, orgao, "Fulano", None, *crit, None, None, None, n_orgaos, n_orgaos, usam,
            contato, None, "Estadual", "Declarado")


INVENTARIO = [
    ("Inventário de Aplicações",),
    (None, None, None, None, None, None, "Avaliação"),
    HEAD,
    linha(1, "Intranet", "AGEMS", contato="3025-0000"),
    linha(2, "Intranet", "SAD", usam="SEC; SES", n_orgaos=2),
    linha(3, "SISX", "SES", crit=("S", "S", "S", "S", "S", "N", "N", "N")),
    linha(None, None, None),
]


def test_regua():
    assert nivel_criticidade(None) is None
    assert nivel_criticidade(0)["rotulo"] == "Muito baixa"
    assert nivel_criticidade(20)["nivel"] == 1
    assert nivel_criticidade(21)["nivel"] == 2
    assert nivel_criticidade(62.5)["rotulo"] == "Alta"
    assert nivel_criticidade(100)["rotulo"] == "Crítica"


def test_sistemas_ids_e_campos():
    s = montar_sistemas(INVENTARIO)
    assert [x["id"] for x in s] == ["sis-001", "sis-002", "sis-003"]
    assert s[0]["temContato"] is True and "contato" not in s[0]
    assert s[1]["orgaosQueUsam"] == ["SEC", "SES"]
    assert s[0]["criticidade"] is None and s[0]["criteriosRespondidos"] == 0
    assert s[2]["pontos"] == 5 and s[2]["pct"] == 62 and s[2]["criticidade"]["rotulo"] == "Alta"


def test_indicacoes_ligam_por_nome_e_dono():
    s = montar_sistemas(INVENTARIO)
    def ind_row(nome, resp, indicou, como, arquivo="a.xlsx", linha=1, veio=None):
        return (nome, None, resp, indicou, como, veio or nome, None, None, None, None, arquivo, linha)

    rows = [("Sistema", "Sigla", "Resp", "Indicou", "Como"),
            ind_row("Intranet", "SAD", "SEC", "Usa sistema de outro órgão", "sec.xlsx", 9, "INTRANET SAD"),
            ind_row("Intranet", "SAD", "SEC", "Usa sistema de outro órgão", "sec.xlsx", 4),
            ind_row("Intranet", "AGEMS", "AGEMS", "Sistema do próprio órgão"),
            ind_row("Fantasma", "X", "Y", "Usa sistema de outro órgão")]
    ind, sem_par = montar_indicacoes(rows, s)
    sec = next(i for i in ind if i["sistemaId"] == "sis-002")
    assert (sec["orgao"], sec["tipo"], sec["vezes"]) == ("SEC", "outro", 2)
    assert sec["origens"] == [  # ordenado por arquivo e linha
        {"arquivo": "sec.xlsx", "linha": 4, "nomeComoVeio": "Intranet"},
        {"arquivo": "sec.xlsx", "linha": 9, "nomeComoVeio": "INTRANET SAD"},
    ]
    agems = next(i for i in ind if i["sistemaId"] == "sis-001")
    assert (agems["orgao"], agems["tipo"], agems["vezes"]) == ("AGEMS", "proprio", 1)
    assert sem_par == ["Fantasma"]
    assert chave(" Intranet ", "sad") == chave("intranet", "SAD")


def test_orgaos_pendencias_criterios():
    o = montar_orgaos([("Órgão",), ("SES", "Sim", 27, 5, 2), ("SEFAZ", "Não", 11, 0, 16), (None,)])
    assert o[0] == {"sigla": "SEFAZ", "enviouInventario": False, "sistemasResponsavel": 11,
                    "sistemasDeOutrosQueUsa": 0, "orgaosQueUsamSeus": 16}
    s = montar_sistemas(INVENTARIO)
    p = montar_pendencias([("Tipo",), ("Dono divergente", "SISX", "Ficou SES", "a.xlsx; b.xlsx"),
                           ("Dono do sistema", "Intranet", "?", None)], s)
    assert p[0]["sistemaId"] == "sis-003" and p[0]["fontes"] == ["a.xlsx", "b.xlsx"]
    assert p[1]["sistemaId"] is None  # nome ambíguo: não chuta
    c = criterios([(None, "ID", "Pergunta"), (None, "C1", "Interrompe serviço?", "Sim")])
    assert c == [{"id": "C1", "pergunta": "Interrompe serviço?"}]


if __name__ == "__main__":
    for nome, fn in list(globals().items()):
        if nome.startswith("test_"):
            fn()
            print("ok", nome)
