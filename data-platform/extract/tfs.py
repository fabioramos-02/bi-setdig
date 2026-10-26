"""Cliente do TFS on-prem (Azure DevOps Server) — backlog do projeto XVIA.

Lê credenciais do .env na raiz do repo: TFS_URL (coleção) e TFS_PAT. O
servidor responde pelo IP público, então o runner do GitHub alcança sem VPN.

As consultas vivem no TFS, em `Shared Queries/BI SETDIG` (criadas por
scripts/criar_queries_tfs.py): quem abre o TFS vê o mesmo recorte do BI. Se a
query salva não existir (sem permissão para criar), roda a mesma WIQL inline.
"""
from __future__ import annotations

import os
import time

import requests
from dotenv import load_dotenv

load_dotenv()

TFS_URL = os.getenv("TFS_URL", "https://tfs.sgi.ms.gov.br/tfs/Global").rstrip("/")
TFS_PAT = os.getenv("TFS_PAT", "")
PROJETO = "XVIA"
TIME = "XVIA Team"
API = "4.1"
PASTA_QUERIES = "Shared Queries/BI SETDIG"

CAMPOS = [
    "System.Id", "System.WorkItemType", "System.Title", "System.State", "System.Description",
    "System.BoardColumn", "System.AreaPath", "System.IterationPath", "System.Tags",
    "System.CreatedDate", "System.ChangedDate", "Microsoft.VSTS.Common.ClosedDate",
    "Microsoft.VSTS.Scheduling.TargetDate", "Microsoft.VSTS.Scheduling.Effort",
    "Custom.SGI.AtividadeUST", "Custom.SGI.ComplexidadeUST",
    "Custom.SGI.LancamentoAtividadeID", "Custom.SGI.DataExecucao",
]

# Nome -> WIQL. "Backlog completo" é a que o extrator usa; as outras são o
# mesmo recorte das abas da página, para conferir no próprio TFS.
QUERIES = {
    "Backlog completo": """
        SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.BoardColumn]
        FROM WorkItemLinks
        WHERE ([Source].[System.TeamProject] = @project
               AND [Source].[System.WorkItemType] = 'Epic'
               AND [Source].[System.State] <> 'Removed')
          AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward')
          AND ([Target].[System.State] <> 'Removed')
        MODE (Recursive)
    """,
    "Pendências": """
        SELECT [System.Id], [System.WorkItemType], [System.Title], [System.BoardColumn], [System.Tags]
        FROM WorkItems
        WHERE [System.TeamProject] = @project
          AND [System.WorkItemType] IN ('Product Backlog Item', 'Bug')
          AND [System.State] NOT IN ('Done', 'Removed')
          AND ([System.BoardColumn] IN ('Aguardando decisão', 'Impedido')
               OR [System.Tags] CONTAINS 'Dependência')
        ORDER BY [System.ChangedDate]
    """,
    "Sprint atual": """
        SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.BoardColumn]
        FROM WorkItems
        WHERE [System.TeamProject] = @project
          AND [System.IterationPath] = @CurrentIteration('[XVIA]\\XVIA Team')
          AND [System.WorkItemType] IN ('Product Backlog Item', 'Bug')
          AND [System.State] <> 'Removed'
    """,
    "Em Produção": """
        SELECT [System.Id], [System.WorkItemType], [System.Title], [Microsoft.VSTS.Common.ClosedDate]
        FROM WorkItems
        WHERE [System.TeamProject] = @project
          AND [System.BoardColumn] = 'Em Produção'
        ORDER BY [Microsoft.VSTS.Common.ClosedDate] DESC
    """,
    "Tasks com UST": """
        SELECT [System.Id], [System.Title], [System.State], [Custom.SGI.AtividadeUST], [Custom.SGI.ComplexidadeUST]
        FROM WorkItems
        WHERE [System.TeamProject] = @project
          AND [System.WorkItemType] = 'Task'
          AND [Custom.SGI.AtividadeUST] <> ''
    """,
}


def _sessao() -> requests.Session:
    if not TFS_PAT:
        raise RuntimeError("TFS_PAT não definido no .env / secrets")
    s = requests.Session()
    s.auth = ("", TFS_PAT)
    s.headers["Accept"] = "application/json"
    return s


def pedir(metodo: str, caminho: str, *, raiz: str | None = None, **kwargs) -> dict:
    """caminho relativo a `{raiz}/_apis/`; 3 tentativas em 5xx/429."""
    url = f"{raiz or f'{TFS_URL}/{PROJETO}'}/_apis/{caminho}"
    params = {"api-version": API, **kwargs.pop("params", {})}
    s = _sessao()
    for tentativa in range(3):
        r = s.request(metodo, url, params=params, timeout=60, allow_redirects=False, **kwargs)
        if r.status_code in (429, 500, 502, 503, 504) and tentativa < 2:
            time.sleep(2 ** tentativa)
            continue
        if r.status_code in (301, 302, 401) or "html" in r.headers.get("Content-Type", ""):
            raise RuntimeError(f"TFS recusou o PAT em {url} (HTTP {r.status_code})")
        r.raise_for_status()
        return r.json() if r.content else {}
    raise RuntimeError(f"TFS indisponível em {url}")


def query_salva(nome: str) -> str | None:
    """Id da query em Shared Queries/BI SETDIG, ou None se não existe."""
    try:
        return pedir("GET", f"wit/queries/{PASTA_QUERIES}/{nome}")["id"]
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            return None
        raise


def rodar_query(nome: str) -> dict:
    qid = query_salva(nome)
    if qid:
        return pedir("GET", f"wit/wiql/{qid}")
    print(f"[tfs] aviso: query {nome!r} não está em {PASTA_QUERIES} — usando WIQL inline")
    return pedir("POST", "wit/wiql", json={"query": QUERIES[nome]})


def get_arvore() -> dict[int, int | None]:
    """{id: pai_id} de tudo que pendura nos Epics abertos (raiz = None)."""
    resp = rodar_query("Backlog completo")
    arvore: dict[int, int | None] = {}
    for rel in resp.get("workItemRelations", []):
        alvo, origem = rel.get("target"), rel.get("source")
        if alvo:
            arvore[alvo["id"]] = origem["id"] if origem else None
    return arvore


def get_itens(ids: list[int]) -> list[dict]:
    """Campos de CAMPOS em lotes de 200 (limite da API)."""
    saida = []
    for i in range(0, len(ids), 200):
        fatia = ids[i:i + 200]
        resp = pedir("GET", "wit/workitems", raiz=TFS_URL, params={
            "ids": ",".join(map(str, fatia)), "fields": ",".join(CAMPOS)})
        saida.extend(resp.get("value", []))
    return saida


def get_sprints() -> list[dict]:
    raiz = f"{TFS_URL}/{PROJETO}/{requests.utils.quote(TIME)}"
    return pedir("GET", "work/teamsettings/iterations", raiz=raiz).get("value", [])
