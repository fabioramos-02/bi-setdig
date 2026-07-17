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


def _carta_por_slug(inventario: list[dict]) -> dict[str, dict]:
    """slug (normalizado) -> carta ativa — mesma chave usada em
    lib/pagina-tipo.ts::construirContexto (ADR-012). Slug é único entre as
    cartas ativas; casar só por slug (não por categoria+slug) recupera cartas
    alcançáveis por mais de uma categoria no site real."""
    mapa: dict[str, dict] = {}
    for c in inventario:
        if not c.get("ativo") or not c.get("slug"):
            continue
        mapa[c["slug"].strip().lower()] = c
    return mapa


def top_servicos_acessados(page_urls_raw: list, inventario: list[dict] | None = None, n: int = 15) -> list[dict]:
    """Top N serviços do portal por visitas — [{servico, orgaoSigla, path, visitas}].

    Nome e órgão vêm do inventário de cartas (ADR-012) quando o slug casa —
    fonte única de verdade, em vez de derivar nome a partir do path. Sem
    inventário (ou slug sem match), cai no rótulo conhecido do filtro de
    Perfil ou, por último, no nome derivado do slug.
    """
    index = perfil._build_index(page_urls_raw)  # caminho-normalizado -> visitas
    conhecidos = _nomes_conhecidos()
    cartas = _carta_por_slug(inventario or [])

    linhas: list[dict] = []
    for path, visitas in index.items():
        partes = [p for p in path.split("/") if p]
        if len(partes) < 2 or partes[0] not in CATEGORIAS_SERVICO:
            continue
        slug = partes[1]
        # Pula buckets de agregação do Matomo (`/categoria/ - Others`) e slugs vazios.
        if slug.startswith("-") or _nome_do_slug(slug).lower() in ("", "others"):
            continue
        carta = cartas.get(slug.lower())
        nome = carta["titulo"] if carta else (conhecidos.get(path) or _nome_do_slug(slug))
        linhas.append({
            "servico": nome,
            "orgaoSigla": carta["orgaoSigla"] if carta else None,
            "path": path,
            "visitas": int(visitas),
        })

    linhas.sort(key=lambda r: -r["visitas"])
    return linhas[:n]


def demanda_por_orgao(page_urls_raw: list, inventario: list[dict]) -> list[dict]:
    """Demanda real por órgão — [{orgaoSigla, orgao, visitas, pct}], ordenado
    por visitas desc. Agrega TODAS as páginas de serviço que casam com uma
    carta do inventário (não só o top-15) — denominador correto pro `pct`.
    """
    index = perfil._build_index(page_urls_raw)
    cartas = _carta_por_slug(inventario)

    visitas_por_sigla: dict[str, int] = {}
    orgao_nome: dict[str, str] = {}
    total = 0
    for path, visitas in index.items():
        partes = [p for p in path.split("/") if p]
        if len(partes) < 2:
            continue
        carta = cartas.get(partes[1].lower())
        if not carta:
            continue
        sigla = carta["orgaoSigla"]
        visitas_por_sigla[sigla] = visitas_por_sigla.get(sigla, 0) + int(visitas)
        orgao_nome.setdefault(sigla, carta["orgao"])
        total += int(visitas)

    linhas = [
        {
            "orgaoSigla": sigla,
            "orgao": orgao_nome[sigla],
            "visitas": v,
            "pct": round(v / total * 100, 4) if total > 0 else 0.0,
        }
        for sigla, v in visitas_por_sigla.items()
    ]
    linhas.sort(key=lambda r: -r["visitas"])
    return linhas
