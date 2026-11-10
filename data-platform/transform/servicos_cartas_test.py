"""Testes de transform/servicos_cartas.py (atualizações) — rodar com pytest ou:
python data-platform/transform/servicos_cartas_test.py
"""
from datetime import date

from servicos_cartas import atualizacoes_diarias, atualizacoes_por_ano

HIST = [
    {"orgao": "IAGRO", "orgao_sigla": "IAGRO", "servico_id": 1, "dia": date(2024, 3, 1), "acao": "Edição", "n": 3},
    {"orgao": "IAGRO", "orgao_sigla": "IAGRO", "servico_id": 1, "dia": date(2024, 3, 1), "acao": "Revisão", "n": 1},
    {"orgao": "IAGRO", "orgao_sigla": "IAGRO", "servico_id": 2, "dia": date(2025, 5, 2), "acao": "Criação/Edição da etapa", "n": 2},
    {"orgao": "Secretaria X", "orgao_sigla": None, "servico_id": 3, "dia": date(2025, 6, 9), "acao": "Revisão", "n": 1},
]


def test_por_ano():
    a24, a25 = atualizacoes_por_ano(HIST)
    assert (a24["ano"], a24["edicoes"], a24["revisoes"], a24["total"], a24["cartasAlteradas"], a24["cartasRevisadas"]) == (2024, 3, 1, 4, 1, 1)
    assert (a25["etapas"], a25["revisoes"], a25["total"], a25["cartasAlteradas"]) == (2, 1, 3, 2)


def test_diarias_junta_por_carta_e_dia():
    linhas = atualizacoes_diarias(HIST)
    assert linhas[0] == {"d": "2024-03-01", "s": 1, "o": "IAGRO", "a": 4, "r": 1}
    assert linhas[-1]["o"] == "Secretaria X"  # sem sigla, usa o nome
    assert len(linhas) == 3


if __name__ == "__main__":
    test_por_ano(); test_diarias_junta_por_carta_e_dia(); print("ok")
