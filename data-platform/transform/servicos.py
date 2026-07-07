"""Serviços mais acessados do portal (reais) — do snapshot Actions.getPageUrls.

Diferente de perfil.py (que mede só os serviços em destaque do filtro de Perfil),
aqui pega TODAS as páginas de serviço do portal e ranqueia por visitas. "Página de
serviço" = caminho `/<categoria-de-serviço>/<slug>` (as categorias oficiais do
www.ms.gov.br) — filtra home, login, notícias, /orgao, /workspace etc.

Nome amigável: reusa o rótulo oficial quando o caminho é um serviço conhecido
(perfil.HIGHLIGHTED_SERVICES); senão, deriva do slug. Referência de abordagem:
matomo-analytics-dashboard/utils/data_processor.py::identify_service_cards (que
cruza com o inventário PostgreSQL — aqui a versão enxuta, sem o banco).
"""
from __future__ import annotations

import re

from transform import perfil

# Categorias de serviço do portal (1º segmento da URL). Fonte: matomo
# data_processor.py::CATEGORIAS_MAPEAMENTO. Só páginas sob uma dessas contam
# como serviço — o resto (home, /orgao, /noticias, /login, /workspace) é ruído.
CATEGORIAS_SERVICO = {
    "administracao-publica",
    "agropecuaria-e-vida-rural",
    "arte-e-cultura",
    "assistencia-social",
    "ciencia-e-tecnologia",
    "comunicacao-e-transparencia",
    "direitos-e-cidadania",
    "educacao-e-pesquisa",
    "empresa-industria-e-comercio",
    "energia",
    "esporte-e-lazer",
    "financas-e-impostos",
    "forcas-armadas-e-defesa-civil",
    "habitacao",
    "infraestrutura",
    "justica",
    "meio-ambiente",
    "saude-e-cuidado",
    "seguranca",
    "trabalho-emprego-e-previdencia",
    "transito-e-transportes",
    "turismo",
}


def _nomes_conhecidos() -> dict[str, str]:
    """caminho-normalizado -> rótulo oficial (dos serviços em destaque)."""
    mapa: dict[str, str] = {}
    for services in perfil.HIGHLIGHTED_SERVICES.values():
        for label, path in services.items():
            mapa[perfil._normalize(path)] = label
    return mapa


def _nome_do_slug(slug: str) -> str:
    """`emitir-guia-de-licenciamento-anual100` -> `Emitir guia de licenciamento anual`."""
    s = re.sub(r"\d+$", "", slug)  # tira o id numérico do fim
    s = s.replace("-", " ").strip()
    return s[:1].upper() + s[1:] if s else slug


def top_servicos_acessados(page_urls_raw: list, n: int = 15) -> list[dict]:
    """Top N serviços do portal por visitas — [{servico, path, visitas}]."""
    index = perfil._build_index(page_urls_raw)  # caminho-normalizado -> visitas
    conhecidos = _nomes_conhecidos()

    linhas: list[dict] = []
    for path, visitas in index.items():
        partes = [p for p in path.split("/") if p]
        if len(partes) < 2 or partes[0] not in CATEGORIAS_SERVICO:
            continue
        slug = partes[1]
        # Pula buckets de agregação do Matomo (`/categoria/ - Others`) e slugs vazios.
        if slug.startswith("-") or _nome_do_slug(slug).lower() in ("", "others"):
            continue
        nome = conhecidos.get(path) or _nome_do_slug(slug)
        linhas.append({"servico": nome, "path": path, "visitas": int(visitas)})

    linhas.sort(key=lambda r: -r["visitas"])
    return linhas[:n]
