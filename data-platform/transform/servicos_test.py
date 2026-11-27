"""Testes de transform/servicos.py (acessos por carta) — rodar com pytest ou:
python data-platform/transform/servicos_test.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from transform.servicos import acessos_por_carta, demanda_por_orgao

INV = [
    {"slug": "ipva-a", "titulo": "IPVA", "orgao": "Fazenda", "orgaoSigla": "SEFAZ MS", "setor": "Arrecadação", "categoria": "financas-e-impostos", "ativo": True},
    {"slug": "guia-b", "titulo": "Guia", "orgao": "Trânsito", "orgaoSigla": "DETRAN", "setor": None, "categoria": "transito-e-transportes", "ativo": True},
    {"slug": "velha-c", "titulo": "Velha", "orgao": "Trânsito", "orgaoSigla": "DETRAN", "setor": None, "categoria": "transito-e-transportes", "ativo": False},
]
RAW = [
    {"label": "/financas-e-impostos/ipva-a", "nb_visits": 10},
    {"label": "/administracao-publica/ipva-a", "nb_visits": 5},  # mesma carta por outra categoria
    {"label": "/transito-e-transportes/guia-b", "nb_visits": 7},
    {"label": "/transito-e-transportes/velha-c", "nb_visits": 99},  # inativa: fora
    {"label": "/noticias/qualquer", "nb_visits": 50},
]


def test_agrupa_por_slug_e_ignora_inativa():
    linhas = acessos_por_carta(RAW, INV)
    assert [(l["slug"], l["visitas"]) for l in linhas] == [("ipva-a", 15), ("guia-b", 7)]
    assert linhas[0]["orgaoSigla"] == "SEFAZ MS" and linhas[0]["setor"] == "Arrecadação"


def test_soma_por_orgao_bate_com_demanda():
    linhas = acessos_por_carta(RAW, INV)
    por_orgao = {}
    for l in linhas:
        por_orgao[l["orgaoSigla"]] = por_orgao.get(l["orgaoSigla"], 0) + l["visitas"]
    assert por_orgao == {d["orgaoSigla"]: d["visitas"] for d in demanda_por_orgao(RAW, INV)}


if __name__ == "__main__":
    test_agrupa_por_slug_e_ignora_inativa(); test_soma_por_orgao_bate_com_demanda(); print("ok")
