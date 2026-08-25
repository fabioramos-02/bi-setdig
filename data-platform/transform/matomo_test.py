"""Self-check do transform de acessos completos por carta (Tasks 1+2 SGD).

Roda com: python data-platform/transform/matomo_test.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from transform.matomo import acessos_completos_por_carta


def _carta(slug, orgao="DETRAN", url_externo="https://meudetran.ms.gov.br/veiculo/x"):
    return {
        "slug": slug,
        "titulo": f"Serviço {slug}",
        "orgaoSigla": orgao,
        "categoria": "veiculo",
        "urlExterno": url_externo,
        "ativo": True,
    }


def test_junta_pageviews_e_cliques():
    cartas = [_carta("consultar-multas"), _carta("agendar-vistoria")]
    pageviews_raw = [
        {"url": "https://www.ms.gov.br/veiculo/consultar-multas", "nb_hits": 500, "nb_visits": 400, "nb_uniq_visitors": 320},
    ]
    linhas_cliques = [
        {"slug": "consultar-multas", "titulo": "Consultar multas", "cliques": 100},
    ]
    saida = acessos_completos_por_carta(pageviews_raw, linhas_cliques, cartas)
    por_slug = {r["slug"]: r for r in saida}
    assert por_slug["consultar-multas"]["pageviews"] == 500
    assert por_slug["consultar-multas"]["cliques"] == 100
    assert por_slug["consultar-multas"]["taxaConversaoPct"] == 20.0
    assert por_slug["consultar-multas"]["visitas"] == 400
    assert por_slug["consultar-multas"]["visitantesUnicos"] == 320


def test_carta_sem_pageview_tem_taxa_null():
    cartas = [_carta("consultar-multas")]
    linhas_cliques = [{"slug": "consultar-multas", "titulo": "x", "cliques": 5}]
    saida = acessos_completos_por_carta([], linhas_cliques, cartas)
    assert saida[0]["pageviews"] == 0
    assert saida[0]["cliques"] == 5
    assert saida[0]["taxaConversaoPct"] is None, "sem pageview → taxa null, nunca 0 falso"


def test_carta_com_pageview_e_zero_cliques():
    cartas = [_carta("consultar-multas")]
    pageviews_raw = [
        {"url": "https://www.ms.gov.br/veiculo/consultar-multas", "nb_hits": 200, "nb_visits": 150, "nb_uniq_visitors": 120},
    ]
    saida = acessos_completos_por_carta(pageviews_raw, [], cartas)
    assert saida[0]["pageviews"] == 200
    assert saida[0]["cliques"] == 0
    assert saida[0]["taxaConversaoPct"] == 0.0


def test_ignora_pageview_de_slug_de_outro_orgao():
    cartas = [_carta("consultar-multas", orgao="DETRAN")]
    pageviews_raw = [
        {"url": "https://www.ms.gov.br/veiculo/consultar-multas", "nb_hits": 100, "nb_visits": 90, "nb_uniq_visitors": 80},
        {"url": "https://www.ms.gov.br/saude/agendar-consulta", "nb_hits": 999, "nb_visits": 999, "nb_uniq_visitors": 999},
    ]
    saida = acessos_completos_por_carta(pageviews_raw, [], cartas)
    assert len(saida) == 1
    assert saida[0]["slug"] == "consultar-multas"
    assert saida[0]["pageviews"] == 100


def test_ordenado_por_cliques_desc():
    cartas = [_carta("a"), _carta("b"), _carta("c")]
    linhas_cliques = [
        {"slug": "a", "titulo": "A", "cliques": 5},
        {"slug": "b", "titulo": "B", "cliques": 50},
        {"slug": "c", "titulo": "C", "cliques": 15},
    ]
    saida = acessos_completos_por_carta([], linhas_cliques, cartas)
    assert [r["slug"] for r in saida] == ["b", "c", "a"]


if __name__ == "__main__":
    for nome, fn in list(globals().items()):
        if nome.startswith("test_") and callable(fn):
            fn()
            print(f"OK {nome}")
    print("Todos os testes passaram.")
