"""Cliente Matomo — porta mínima de matomo/matomo-analytics-dashboard/api/matomo_client.py.

Sem acoplamento a Streamlit. Lê credenciais do .env na raiz do repo.
"""
from __future__ import annotations

import os
import time
import urllib.parse

import requests
from dotenv import load_dotenv

load_dotenv()

MATOMO_URL = os.getenv("MATOMO_URL", "")
MATOMO_SITE_ID = os.getenv("MATOMO_SITE_ID", "")
MATOMO_TOKEN = os.getenv("MATOMO_TOKEN", "")

# Fila serial + rate limit — quebrar acessos-botao em 40 órgãos × 4 períodos × 2
# endpoints = 320 chamadas por rodada. Sem espaçamento estoura filter/rate limit
# do servidor (429 ou timeout). Delay default 250ms entre requests; ajustável via
# MATOMO_REQUEST_DELAY_MS. Envelope de retry: 3 tentativas com backoff exponencial
# em 5xx/429/timeout — 4xx (401/403 token, 400 param) NÃO retenta.
_REQUEST_DELAY_MS = int(os.getenv("MATOMO_REQUEST_DELAY_MS", "250") or "250")
_MAX_TENTATIVAS = 3
_ultima_chamada_ts = 0.0


def _throttle() -> None:
    """Serializa chamadas: garante _REQUEST_DELAY_MS entre requests
    consecutivas dentro do mesmo processo. Global — funciona pra qualquer
    ordem de chamada (batch por órgão, loop de períodos, etc)."""
    global _ultima_chamada_ts
    if _REQUEST_DELAY_MS <= 0:
        return
    delay_s = _REQUEST_DELAY_MS / 1000.0
    delta = time.monotonic() - _ultima_chamada_ts
    if delta < delay_s:
        time.sleep(delay_s - delta)
    _ultima_chamada_ts = time.monotonic()


def _call(method: str, period: str, date: str, extra: dict | None = None, site_id: str | None = None, timeout: int = 30):
    """Fila global (throttle) + retry com backoff exponencial. 3 tentativas
    em 5xx/429/timeout (servidor Matomo é instável em relatórios pesados —
    ver transform/perfil.py:20-31 e o run.py::run_matomo_acessos_botao).
    4xx que não seja 429 (401 token, 403 permissão, 400 param) NÃO retenta
    — falhou permanente, insistir só multiplica erro no log."""
    if not MATOMO_TOKEN:
        raise RuntimeError(
            "MATOMO_TOKEN vazio — .env não carregou ou token não configurado. "
            "Verifique arquivo .env na raiz do repo (chave MATOMO_TOKEN)."
        )

    params = {
        "module": "API",
        "method": method,
        "idSite": site_id or MATOMO_SITE_ID,
        "period": period,
        "date": date,
        "format": "JSON",
        "token_auth": MATOMO_TOKEN,
    }
    if extra:
        params.update(extra)
    url = f"{MATOMO_URL}index.php?{urllib.parse.urlencode(params)}"

    ultima_exc: Exception | None = None
    for tentativa in range(1, _MAX_TENTATIVAS + 1):
        _throttle()
        try:
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout as exc:
            ultima_exc = exc
            if tentativa == _MAX_TENTATIVAS:
                raise
            time.sleep(2 ** tentativa)  # 2s, 4s
        except requests.exceptions.HTTPError as exc:
            ultima_exc = exc
            status = exc.response.status_code if exc.response is not None else 0
            # 429 (rate limit) retenta com backoff mais longo (respeita
            # Retry-After se o servidor mandar). 5xx retenta backoff exponencial
            # normal. Demais 4xx (401/403/400) falha imediato — retry piora log.
            if status == 429:
                if tentativa == _MAX_TENTATIVAS:
                    raise
                retry_after = int(exc.response.headers.get("Retry-After", "0") or "0") if exc.response is not None else 0
                time.sleep(max(retry_after, 2 ** (tentativa + 1)))
                continue
            is_4xx = 400 <= status < 500
            if tentativa == _MAX_TENTATIVAS or is_4xx:
                raise
            time.sleep(2 ** tentativa)
    if ultima_exc is not None:
        raise ultima_exc


def get_visits_summary(period: str, date: str, site_id: str | None = None) -> dict:
    return _call("VisitsSummary.get", period, date, site_id=site_id)


def get_visits_summary_daily(days: int = 90, site_id: str | None = None) -> dict:
    """Série diária — base pro filtro de período client-side no portal."""
    return _call("VisitsSummary.get", "day", f"last{days}", site_id=site_id)


def get_city(period: str, date: str, site_id: str | None = None, limit: int = 100) -> list:
    return _call("UserCountry.getCity", period, date, {"filter_limit": limit}, site_id)


def get_visit_time(period: str, date: str, site_id: str | None = None) -> list:
    return _call("VisitTime.getVisitInformationPerServerTime", period, date, site_id=site_id)


def get_browsers(period: str, date: str, site_id: str | None = None, limit: int = 20) -> list:
    return _call("DevicesDetection.getBrowsers", period, date, {"filter_limit": limit}, site_id)


def get_device_type(period: str, date: str, site_id: str | None = None) -> list:
    return _call("DevicesDetection.getType", period, date, site_id=site_id)


def get_page_urls(period: str, date: str, site_id: str | None = None, limit: int = 500, timeout: int = 30) -> list:
    """flat=1 devolve a URL completa em cada linha, sem hierarquia de pastas
    (sem isso o Matomo só retorna label/nb_visits por nó, sem o campo 'url' —
    mesmo padrão de matomo/api/matomo_client.py::get_page_urls_trend).

    `timeout` opcional pra callers que pedem `limit=-1` (retorno enorme).
    Default 30s serve pras chamadas leves; runs pesados (acessos-botao,
    period=ano) devem passar 120s+."""
    return _call("Actions.getPageUrls", period, date, {"filter_limit": limit, "flat": 1, "expanded": 0}, site_id, timeout=timeout)


def get_site_search_keywords(period: str, date: str, site_id: str | None = None, limit: int = 50) -> list:
    return _call("Actions.getSiteSearchKeywords", period, date, {"filter_limit": limit}, site_id)


def get_entry_pages(period: str, date: str, site_id: str | None = None, limit: int = 20) -> list:
    """Porta de matomo-analytics-dashboard/api/matomo_client.py::get_entry_pages
    — flat=1 pra ranking de URL absoluta (não hierarquia de pastas)."""
    return _call("Actions.getEntryPageUrls", period, date, {"filter_limit": limit, "flat": 1}, site_id)


def get_outlinks(period: str, date: str, site_id: str | None = None, limit: int = 50) -> list:
    """Porta de matomo_client.py::get_outlinks — SEM flat=1 de propósito: o
    relatório hierárquico nativo do Matomo já agrupa outlinks por domínio no
    primeiro nível (ver transform/matomo.py::outlinks)."""
    return _call("Actions.getOutlinks", period, date, {"filter_limit": limit}, site_id)


def get_event_names(period: str, date: str, site_id: str | None = None, limit: int = 500, segment: str | None = None) -> list:
    """Extrai Eventos customizados agregados por Nome. 
    Ideal usar com segment (ex: 'eventCategory==Navegacao_Perfil,eventAction==Clique_Aba')."""
    extra = {"filter_limit": limit, "flat": 1}
    if segment:
        extra["segment"] = segment
    return _call("Events.getName", period, date, extra, site_id)


def get_outlinks_flat(period: str, date: str, site_id: str | None = None, limit: int = 5000, timeout: int = 60) -> list:
    """`Actions.getOutlinks` com `flat=1` — URL COMPLETA por linha (não
    domínio). Usado pra cruzar com `urlExterno` das cartas (relatório "Botão
    Acessar Serviço"). Uma chamada só devolve TODOS outlinks do site — em
    vez de Transitions por página (que exigia 100+ chamadas seriais).

    LEGADO: mantido pra script de análise (comparacao-metricas-carta). No
    pipeline de produção, `run_matomo_acessos_botao` usa
    `get_outlinks_segmented` — a chamada única com limit=5000 truncava
    period=ano (mais outlinks distintos que mês → ano < mês, impossível)."""
    return _call(
        "Actions.getOutlinks",
        period,
        date,
        {"filter_limit": limit, "flat": 1},
        site_id,
        timeout=timeout,
    )


def get_outlinks_segmented(
    period: str,
    date: str,
    segment: str,
    site_id: str | None = None,
    limit: int = -1,
    timeout: int = 90,
) -> list:
    """`Actions.getOutlinks?flat=1` restrito por `segment` (ex.:
    'outlinkUrl=@dominio1.gov.br,outlinkUrl=@dominio2.gov.br' — vírgula = OR
    no Matomo). Usado pra quebrar a extração de cliques nas cartas por órgão
    (1 chamada por órgão), evitando o teto de 5000 rows que corrompia
    period=ano no `get_outlinks_flat`. `limit=-1` remove filter_limit;
    timeout 90s pra period=ano seguro."""
    return _call(
        "Actions.getOutlinks",
        period,
        date,
        {"filter_limit": limit, "flat": 1, "segment": segment},
        site_id,
        timeout=timeout,
    )


def get_page_urls_segmented(
    period: str,
    date: str,
    segment: str,
    site_id: str | None = None,
    limit: int = -1,
    timeout: int = 90,
) -> list:
    """`Actions.getPageUrls?flat=1` restrito por `segment`
    (ex.: 'pageUrl=@servico1,pageUrl=@servico2'). Devolve pageviews +
    nb_visits + nb_uniq_visitors da carta em portal-ms.gov.br. Usado pra
    juntar com cliques no botão e calcular taxa de conversão."""
    return _call(
        "Actions.getPageUrls",
        period,
        date,
        {"filter_limit": limit, "flat": 1, "expanded": 0, "segment": segment},
        site_id,
        timeout=timeout,
    )


def get_transitions_for_action(period: str, date: str, action_url: str, site_id: str | None = None) -> dict:
    """Transições entrando/saindo de UMA página específica (não da sessão que
    passou por ela — `Actions.getOutlinks + segment=pageUrl==X` mede sessão,
    superestima atribuição). Devolve dict com `pageMetrics.pageviews`,
    `outlinks`, `followingPages`, `previousPages`, `referrers` — matéria-prima
    da aba "Botão Acessar Serviço" em /servicos.

    Instabilidade: `Transitions.getTransitionsForPageUrl` (variante agregada)
    já foi removido do pipeline por 500 em period=year (ver run.py::run_matomo_jornada).
    Esta variante (`ForAction`, 1 carta por chamada) é mais leve — testada OK
    em period=month; o orquestrador captura falha por carta e segue."""
    return _call(
        "Transitions.getTransitionsForAction",
        period,
        date,
        {"actionType": "url", "actionName": action_url},
        site_id,
    )


def get_sites(limit: int = 200) -> list:
    """Relação de sites monitorados no Matomo (SitesManager). `period`/`date`/
    `idSite` são ignorados por este método (lista sites, não métricas de um
    site) — passo valores dummy só porque `_call` os exige. `permission=view`
    = sites que o token consegue ao menos visualizar."""
    return _call(
        "SitesManager.getSitesWithMinimumAccess",
        "day",
        "today",
        {"permission": "view", "filter_limit": limit},
    )


