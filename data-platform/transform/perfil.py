"""Estudo de adoção do filtro de Perfil do Portal Único (porta do bench-carta).

Porta enxuta de bench-carta/src/{profiles,analysis/metrics,matomo/queries}.py:
recebe o snapshot bruto de Actions.getPageUrls (flat) de um período e devolve
o objeto já agregado que o portal exibe — sem I/O, sem cálculo de métrica
espalhado. Mede quantos visitantes da home chegam a um serviço pelo filtro de
Perfil (ver docs do bench-carta e ADR-005 → domínio Governança).
"""
from __future__ import annotations

from collections import Counter

from validate.rules import ValidationError, validate_rows

# --- Regra de decisão (bench-carta/src/config.py:68,74) -----------------------
ADOPTION_THRESHOLD = 0.02  # 2% dos visitantes da home
# Fração média das visitas a serviços que de fato vêm da home (amostra Transitions
# 2025: DEVIR 2,47% / CNH 1,53% / CRLV 0,95%). Corrige o proxy ingênuo. Ainda é
# limite superior — a home inclui menu e busca, não só o card de Perfil.
HOME_REFERRAL_FRACTION = 0.015

PROFILE_LABEL = {
    "CIDADAO": "Cidadão",
    "SERVIDOR_PUBLICO": "Servidor Público",
    "EMPRESA": "Empresa",
    "GESTAO_PUBLICA": "Gestão Pública",
}

# perfil -> { rótulo do serviço: caminho relativo no portal }
# Fonte única de verdade, capturada ao vivo em www.ms.gov.br (bench-carta/src/profiles.py).
HIGHLIGHTED_SERVICES: dict[str, dict[str, str]] = {
    "CIDADAO": {
        "Certidão tributária estadual": "/financas-e-impostos/certidao-tributaria-estadual-emissao-certidao-circunstanciada-de-debitos-estaduais174",
        "Consultar Fila ambulatorial": "/saude-e-cuidado/consultar-fila-ambulatorial118",
        "Emitir CRLV-e (licenciamento digital)": "/transito-e-transportes/emissao-de-crlv-e-licenciamento-digital13",
        "Emissão da CNH": "/transito-e-transportes/emissao-da-carteira-nacional-de-habilitacao174",
        "Boletim on-line de acidente sem vítimas": "/seguranca/051-boletim-on-line-de-acidente-de-transito-atendimento-sem-vitimas170",
        "Delegacia Virtual (DEVIR)": "/seguranca/delegacia-virtual-devir105",
        "2ª via de conta de água/esgoto": "/empresa-industria-e-comercio/solicitar-emissao-de-2a-via-de-conta-de-agua-e-esgoto113",
        "Inclusão no Programa Mais Social": "/assistencia-social/solicitacao-de-inclusao-no-programa-mais-social118",
    },
    "SERVIDOR_PUBLICO": {
        "Conceder acesso ao Matomo": "/ciencia-e-tecnologia/conceder-acesso-ao-matomo70",
        "Consultar Fila ambulatorial": "/saude-e-cuidado/consultar-fila-ambulatorial118",
        "Solicitar acesso ao Grafana": "/ciencia-e-tecnologia/solicitar-acesso-ao-grafana21",
        "Primeiro acesso aos canais institucionais": "/ciencia-e-tecnologia/solicitar-primeiro-acesso-aos-canais-institucionais-oficiais9",
        "Aumento de quota de e-mail oficial": "/ciencia-e-tecnologia/solicitar-aumento-de-quota-de-e-mail-oficial87",
        "Liberação/bloqueio de acesso à internet": "/ciencia-e-tecnologia/solicitar-liberacao-ou-bloqueio-de-acesso-a-conteudo-da-internet93",
        "Acesso aos sistemas institucionais SETDIG": "/ciencia-e-tecnologia/solicitar-acesso-aos-sistemas-institucionais-mantidos-pela-setdig91",
        "Treinamento do WordPress": "/ciencia-e-tecnologia/solicitar-treinamento-do-wordpress70",
    },
    "EMPRESA": {
        "Certidão tributária estadual": "/financas-e-impostos/certidao-tributaria-estadual-emissao-certidao-circunstanciada-de-debitos-estaduais174",
        "Emitir CRLV-e (licenciamento digital)": "/transito-e-transportes/emissao-de-crlv-e-licenciamento-digital13",
        "2ª via de conta de água/esgoto": "/empresa-industria-e-comercio/solicitar-emissao-de-2a-via-de-conta-de-agua-e-esgoto113",
        "Termo de Verificação Fiscal (TVF)/Apreensão (TA)": "/financas-e-impostos/termo-de-verificacao-fiscal-tvf-ou-termo-de-apreensao-ta-baixa-ou-alteracao99",
    },
    "GESTAO_PUBLICA": {
        "Certidão tributária estadual": "/financas-e-impostos/certidao-tributaria-estadual-emissao-certidao-circunstanciada-de-debitos-estaduais174",
        "Termo de Verificação Fiscal (TVF)/Apreensão (TA)": "/financas-e-impostos/termo-de-verificacao-fiscal-tvf-ou-termo-de-apreensao-ta-baixa-ou-alteracao99",
    },
}


# Prefixo do path -> categoria legível (bench-carta/src/ui/cards.py). O ícone
# fica no portal (lucide-react), mapeado por categoriaSlug — não nos dados.
_CATEGORIA = {
    "financas-e-impostos": "Finanças e Impostos",
    "saude-e-cuidado": "Saúde e Cuidado",
    "transito-e-transportes": "Trânsito e Transportes",
    "seguranca": "Segurança",
    "empresa-industria-e-comercio": "Empresa, Indústria e Comércio",
    "assistencia-social": "Assistência Social",
    "ciencia-e-tecnologia": "Ciência e Tecnologia",
}


def _categoria(path: str) -> tuple[str, str]:
    """(slug, rótulo legível) a partir do 1º segmento do path."""
    slug = path.strip("/").split("/", 1)[0]
    return slug, _CATEGORIA.get(slug, slug.replace("-", " ").title())


def _path_frequency() -> Counter:
    counter: Counter = Counter()
    for services in HIGHLIGHTED_SERVICES.values():
        counter.update(set(services.values()))
    return counter


def unique_services() -> dict[str, dict[str, str]]:
    """Serviços exclusivos de UM perfil — base atribuível da medição."""
    freq = _path_frequency()
    return {
        profile: {label: path for label, path in services.items() if freq[path] == 1}
        for profile, services in HIGHLIGHTED_SERVICES.items()
    }


def shared_services() -> set[str]:
    """Caminhos presentes em 2+ perfis — não atribuíveis a um perfil único."""
    return {path for path, n in _path_frequency().items() if n > 1}


def _normalize(url: str) -> str:
    """Caminho limpo e comparável (porta de queries.py::_normalize)."""
    u = (url or "").strip().lower().rstrip("/")
    for scheme in ("https://", "http://"):
        if u.startswith(scheme):
            u = u[len(scheme):]
    for host in ("www.ms.gov.br", "ms.gov.br"):
        if u.startswith(host):
            u = u[len(host):]
    if u.startswith("/index"):
        u = u[len("/index"):]
    return "/" + u.lstrip("/")


def _build_index(page_urls_raw: list) -> dict[str, int]:
    """Mapa caminho-normalizado -> visitas (porta de queries.py::fetch_page_index)."""
    index: dict[str, int] = {}
    for row in page_urls_raw if isinstance(page_urls_raw, list) else []:
        key = _normalize(row.get("label") or row.get("url") or "")
        visits = int(row.get("nb_visits") or row.get("nb_hits") or 0)
        index[key] = index.get(key, 0) + visits
    return index


def _home_visits(index: dict[str, int]) -> int:
    return index.get("/", 0) or index.get("/index", 0)


def _service_visits(index: dict[str, int], path: str) -> int:
    return index.get(_normalize(path), 0)


def _pct(parte: float, total: float) -> float:
    return round(parte / total * 100, 4) if total > 0 else 0.0


def build_periodo(page_urls_raw: list) -> dict:
    """Snapshot bruto de um período -> objeto pronto para o portal.

    Retorna {resumo, distribuicao, topServicos}. Núcleo reune a lógica de
    run_study.py::{_collect_rows,_attributable_totals} + metrics.build_result.
    """
    index = _build_index(page_urls_raw)
    home = _home_visits(index)
    shared = shared_services()

    # Uma linha por (perfil, serviço) — proxy de uso do filtro.
    servicos: list[dict] = []
    for profile, services in HIGHLIGHTED_SERVICES.items():
        for label, path in services.items():
            servicos.append(
                {
                    "servico": label,
                    "perfil": profile,
                    "perfilLabel": PROFILE_LABEL.get(profile, profile),
                    "path": path,
                    "visitas": _service_visits(index, path),
                    "exclusivo": path not in shared,
                }
            )

    # Atribuíveis: só serviços exclusivos, somados por perfil.
    totais: dict[str, int] = {}
    for profile, services in unique_services().items():
        if not services:
            continue
        totais[profile] = sum(_service_visits(index, p) for p in services.values())
    atribuiveis = sum(totais.values())

    proxy = atribuiveis / home if home > 0 else 0.0
    uso_real = proxy * HOME_REFERRAL_FRACTION
    resumo = {
        "homeVisitors": home,
        "atribuiveis": atribuiveis,
        "proxyRatePct": round(proxy * 100, 4),
        "usoRealPct": round(uso_real * 100, 4),
        "umACada": round(1 / uso_real) if uso_real > 0 else 0,
        "limiarPct": round(ADOPTION_THRESHOLD * 100, 4),
    }

    distribuicao = sorted(
        (
            {
                "perfil": perfil,
                "perfilLabel": PROFILE_LABEL.get(perfil, perfil),
                "visitas": visitas,
                "participacaoPct": _pct(visitas, atribuiveis),
            }
            for perfil, visitas in totais.items()
        ),
        key=lambda r: -r["visitas"],
    )

    # Top serviços: dedup por path mantendo o de maior visita, top 10.
    vistos: set[str] = set()
    top_servicos: list[dict] = []
    for row in sorted(servicos, key=lambda r: -r["visitas"]):
        if row["path"] in vistos:
            continue
        vistos.add(row["path"])
        top_servicos.append(row)
    top_servicos = top_servicos[:10]

    # Todos os serviços por perfil, na ordem do portal (não reordenar por visita) —
    # alimenta o grid "Serviços em destaque" (cards estilo ms.gov.br).
    servicos_por_perfil = {}
    for profile, services in HIGHLIGHTED_SERVICES.items():
        cards: list[dict] = []
        for label, path in services.items():
            slug, categoria = _categoria(path)
            cards.append(
                {
                    "servico": label,
                    "categoria": categoria,
                    "categoriaSlug": slug,
                    "path": path,
                    "visitas": _service_visits(index, path),
                    "exclusivo": path not in shared,
                }
            )
        servicos_por_perfil[profile] = cards

    return {
        "resumo": resumo,
        "distribuicao": distribuicao,
        "topServicos": top_servicos,
        "servicosPorPerfil": servicos_por_perfil,
    }


def validar(saida: dict[str, dict]) -> None:
    """Valida o dataset (1 objeto por período fixo — ver ADR-007).

    Reusa validate_rows nas sub-listas; checa o objeto `resumo` à parte porque
    validate_period_breakdown espera arrays por chave, não objetos.
    """
    for periodo, bloco in saida.items():
        try:
            validate_rows(bloco["distribuicao"], ["perfil", "visitas"], ["visitas"])
            validate_rows(bloco["topServicos"], ["servico", "visitas"], ["visitas"])
            for perfil, cards in bloco["servicosPorPerfil"].items():
                validate_rows(cards, ["servico", "categoria", "visitas"], ["visitas"])
            resumo = bloco["resumo"]
            faltando = [k for k, v in resumo.items() if v is None]
            if faltando:
                raise ValidationError(f"resumo com campos nulos: {faltando}")
            if resumo["homeVisitors"] < 0 or resumo["atribuiveis"] < 0:
                raise ValidationError(f"contagem negativa no resumo: {resumo}")
        except ValidationError as exc:
            raise ValidationError(f"período {periodo!r}: {exc}") from exc
