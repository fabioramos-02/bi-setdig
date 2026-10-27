"""Carta de serviço completa (com as etapas) pela API do Portal Único.

Mesmo endpoint que o ms.gov.br usa para montar a página da carta. O inventário
(extract/cartas.py) não traz as etapas porque o texto longo estouraria o limite
de 2MB — aqui busca-se carta a carta, só para os slugs pedidos.

Exige `PORTAL_API_KEY` no .env (valor completo do header Authorization,
ex. "Api-Key ..."). Sem a chave, levanta exceção — quem chama aborta sem
publicar.
"""
from __future__ import annotations

import os

import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("PORTAL_API_URL", "https://admin.ms.gov.br/api")


def get_carta(slug: str, session: requests.Session | None = None) -> dict | None:
    """Carta pelo slug, ou None se o portal não achar. Campos usados no censo:
    `jornada` [{ordem, titulo, conteudo(HTML)}], `url_externo`,
    `acesso_externo`, `link_integrado`."""
    chave = os.getenv("PORTAL_API_KEY")
    if not chave:
        raise RuntimeError("PORTAL_API_KEY ausente no .env")
    http = session or requests
    resp = http.get(
        f"{API_URL}/cms/servicos/",
        params={"slug": slug},
        headers={"Authorization": chave},
        timeout=20,
    )
    resp.raise_for_status()
    dados = resp.json()
    # DRF paginado ({results: [...]}) ou lista crua — aceita os dois.
    itens = dados.get("results", []) if isinstance(dados, dict) else dados
    return next((c for c in itens if c.get("slug") == slug), None)
