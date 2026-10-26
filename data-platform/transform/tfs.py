"""Backlog do TFS (projeto XVIA) -> linhas prontas para a página Projeto X-VIA.

Funções puras: recebem o que extract/tfs.py devolve e o catálogo de UST.
Regras combinadas com a SGD em 26/10/2026 (nota do vault
20-projeto/dashboard-analytics-setdig/2026-10-26-bi-projeto-xvia-tfs.md).
"""
from __future__ import annotations

import re
from datetime import date, datetime

# Coluna do board -> tipo de entrega do relatório. Só PBI e Bug têm coluna;
# Task herda do PBI pai.
TIPO_ENTREGA = {
    "Área de Negócios": "Negócio",
    "Aguardando Validação do Órgão": "Órgão",
    "Em Desenvolvimento": "Desenvolvimento X-VIA",
    "Em Homologação": "Desenvolvimento X-VIA",
    "Em Produção": "Desenvolvimento X-VIA",
}
COLUNAS_PENDENCIA = {"Aguardando decisão", "Impedido"}
TAG_DEPENDENCIA = "Dependência"
PREFIXO = re.compile(r"^\[([^\]]+)\]\s*-?\s*(\S*)")
# Sigla usada no título da Feature -> sigla da nota do órgão no vault.
ALIAS_ORGAO = {"SED": "SEDMS", "CGE": "CGEMS", "ENTRETENIMENTO": "FERTELEDUCATIVAMS"}


def frente(area: str) -> str:
    return "SGD" if area == "XVIA\\SGD" or area.startswith("XVIA\\SGD\\") else "X-VIA"


def orgao_da_feature(titulo: str, siglas: set[str]) -> str | None:
    """`[SES] - Saúde` -> SES; `[SS] IMASUL` -> IMASUL; `[Portal] …` -> None."""
    m = PREFIXO.match(titulo or "")
    if not m:
        return None
    for candidato in (m.group(1), m.group(2)):
        sigla = candidato.strip().upper()
        sigla = ALIAS_ORGAO.get(sigla, sigla)
        if sigla in siglas:
            return sigla
    return None


def valores_ust(catalogo: dict) -> dict[str, float]:
    """{id da complexidade: valorUst} — LancamentoAtividadeID aponta a complexidade."""
    return {str(c["id"]): c["valorUst"]
            for a in catalogo.get("data", []) for c in a["complexidades"]}


def _data(valor) -> str | None:
    if not valor:
        return None
    return str(valor)[:10]


def montar_itens(arvore: dict[int, int | None], brutos: list[dict],
                 catalogo: dict, siglas: set[str], hoje: date) -> list[dict]:
    """1 linha por work item, com épico/Feature/PBI resolvidos subindo a árvore."""
    por_id = {w["id"]: w.get("fields", {}) for w in brutos}
    ust = valores_ust(catalogo)

    def ancestral(item_id: int, tipo: str) -> int | None:
        atual = item_id
        while atual is not None:
            if por_id.get(atual, {}).get("System.WorkItemType") == tipo:
                return atual
            atual = arvore.get(atual)
        return None

    def titulo(item_id: int | None) -> str | None:
        return por_id.get(item_id, {}).get("System.Title") if item_id else None

    linhas = []
    for item_id, f in por_id.items():
        tipo = f.get("System.WorkItemType", "")
        epico_id = ancestral(item_id, "Epic")
        feature_id = ancestral(item_id, "Feature")
        pbi_id = ancestral(item_id, "Product Backlog Item") or ancestral(item_id, "Bug")
        coluna = f.get("System.BoardColumn") or None
        if tipo == "Task":  # Task não tem coluna: herda o tipo de entrega do PBI
            coluna_ref = por_id.get(pbi_id, {}).get("System.BoardColumn") if pbi_id else None
        else:
            coluna_ref = coluna
        tags = [t.strip() for t in (f.get("System.Tags") or "").split(";") if t.strip()]
        alterado = _data(f.get("System.ChangedDate"))
        lancamento = f.get("Custom.SGI.LancamentoAtividadeID")
        aberto = f.get("System.State") not in ("Done", "Removed")
        linhas.append({
            "id": item_id,
            "tipo": tipo,
            "titulo": f.get("System.Title", ""),
            "estado": f.get("System.State", ""),
            "coluna": coluna,
            "area": f.get("System.AreaPath", ""),
            "frente": frente(f.get("System.AreaPath", "")),
            "sprint": f.get("System.IterationPath", ""),
            "epicoId": epico_id,
            "epico": titulo(epico_id),
            "featureId": feature_id,
            "feature": titulo(feature_id),
            "pbiId": pbi_id if tipo == "Task" else None,
            "orgao": orgao_da_feature(titulo(feature_id) or "", siglas),
            "tags": tags,
            "tipoEntrega": TIPO_ENTREGA.get(coluna_ref or ""),
            "pendencia": aberto and tipo in ("Product Backlog Item", "Bug") and (
                coluna in COLUNAS_PENDENCIA or TAG_DEPENDENCIA in tags),
            "criadoEm": _data(f.get("System.CreatedDate")),
            "alteradoEm": alterado,
            "fechadoEm": _data(f.get("Microsoft.VSTS.Common.ClosedDate")),
            "prazo": _data(f.get("Microsoft.VSTS.Scheduling.TargetDate")),
            "diasSemAtualizar": (hoje - date.fromisoformat(alterado)).days if alterado else None,
            "atividadeUst": f.get("Custom.SGI.AtividadeUST") or None,
            "complexidadeUst": f.get("Custom.SGI.ComplexidadeUST") or None,
            "ust": ust.get(str(lancamento)) if lancamento else None,
            "dataExecucao": _data(f.get("Custom.SGI.DataExecucao")),
        })
    linhas.sort(key=lambda x: x["id"])
    return linhas


def montar_sprints(brutos: list[dict]) -> list[dict]:
    return [{
        "sprint": s["path"],
        "nome": s["name"],
        "inicio": _data(s.get("attributes", {}).get("startDate")),
        "fim": _data(s.get("attributes", {}).get("finishDate")),
        "situacao": {"past": "encerrada", "current": "atual", "future": "futura"}.get(
            s.get("attributes", {}).get("timeFrame", ""), "futura"),
    } for s in brutos]


def hoje_utc() -> date:
    return datetime.utcnow().date()
