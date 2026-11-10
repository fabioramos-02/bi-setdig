"""Testes de transform/servicos_cartas.py (atualizações) — rodar com pytest ou:
python data-platform/transform/servicos_cartas_test.py
"""
from servicos_cartas import atualizacoes_por_ano, atualizacoes_por_orgao

HIST = [
    {"orgao": "IAGRO", "orgao_sigla": "IAGRO", "servico_id": 1, "ano": 2024, "acao": "Edição", "n": 3},
    {"orgao": "IAGRO", "orgao_sigla": "IAGRO", "servico_id": 1, "ano": 2024, "acao": "Revisão", "n": 1},
    {"orgao": "IAGRO", "orgao_sigla": "IAGRO", "servico_id": 2, "ano": 2025, "acao": "Criação/Edição da etapa", "n": 2},
    {"orgao": "SAD", "orgao_sigla": "SAD", "servico_id": 3, "ano": 2025, "acao": "Revisão", "n": 1},
]
INV = [{"orgao": "IAGRO", "ativo": True, "titulo": "a"}, {"orgao": "IAGRO", "ativo": True, "titulo": "b"},
       {"orgao": "IAGRO", "ativo": False, "titulo": "c"}, {"orgao": "SAD", "ativo": True, "titulo": "d"}]


def test_por_ano():
    a24, a25 = atualizacoes_por_ano(HIST)
    assert (a24["ano"], a24["edicoes"], a24["revisoes"], a24["total"], a24["cartasAlteradas"], a24["cartasRevisadas"]) == (2024, 3, 1, 4, 1, 1)
    assert (a25["etapas"], a25["revisoes"], a25["total"], a25["cartasAlteradas"]) == (2, 1, 3, 2)


def test_por_orgao():
    linhas = {(r["ano"], r["orgao"]): r for r in atualizacoes_por_orgao(HIST, INV)}
    iagro24 = linhas[(2024, "IAGRO")]
    assert (iagro24["cartasAtivas"], iagro24["cartasAlteradas"], iagro24["alteracoes"], iagro24["percentAlteradas"]) == (2, 1, 4, 50.0)
    assert linhas[(2025, "SAD")]["cartasRevisadas"] == 1


if __name__ == "__main__":
    test_por_ano(); test_por_orgao(); print("ok")
