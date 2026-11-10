"""Backlog do TFS (projeto XVIA) -> linhas prontas para a página Projeto X-VIA.

Funções puras: recebem o que extract/tfs.py devolve e o catálogo de UST.
Regras combinadas com a SGD em 26/10/2026 (nota do vault
20-projeto/dashboard-analytics-setdig/2026-10-26-bi-projeto-xvia-tfs.md).
"""
from __future__ import annotations

import json
import re
from collections import Counter
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


# A X-VIA não preenche a atividade UST do TFS: escreve o código do catálogo
# dela na descrição ("Catálogo DOC.07 - …"). Faixa vem como "NEG.03/04/05".
CODIGO_CATALOGO = re.compile(r"Cat[aá]logo\s+([A-Z]+\.\d+(?:/\d+)*)")


def codigo_catalogo(descricao: str | None) -> str | None:
    m = CODIGO_CATALOGO.search(descricao or "")
    return m.group(1) if m else None


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


def eh_contrato_xvia(contrato: str | None) -> bool:
    """No TFS o contrato vem como "004/2026 - 30524 - XVIA TECNOLOGIA LTDA"."""
    return "xvia" in (contrato or "").lower().replace("-", "")


CODIGO_ATIVIDADE = re.compile(r"^([A-Z]+\.\d+)")


def ust_por_codigo(catalogo: dict) -> dict[str, float]:
    """{código: valorUst} das atividades com uma só complexidade. Serve à Task
    que só traz o código na descrição: sem complexidade marcada, atividade com
    mais de uma fica sem valor (a classificar)."""
    saida = {}
    for a in catalogo.get("data", []):
        m = CODIGO_ATIVIDADE.match(a.get("descricaoAtividade", ""))
        if m and len(a["complexidades"]) == 1:
            saida[m.group(1)] = a["complexidades"][0]["valorUst"]
    return saida


def _data(valor) -> str | None:
    if not valor:
        return None
    return str(valor)[:10]


def montar_itens(arvore: dict[int, int | None], brutos: list[dict],
                 catalogos: list[dict], siglas: set[str], hoje: date) -> list[dict]:
    """1 linha por work item, com épico/Feature/PBI resolvidos subindo a árvore.

    `catalogos`: um por contrato (`{"contrato": nome, "data": [...]}`). A UST da
    Task sai do catálogo do contrato gravado nela (`Custom.SGI.Empresa`) — o id
    da complexidade só vale dentro do catálogo daquele contrato. Task sem
    contrato (anterior a 21/10/2026) usa o primeiro catálogo (Governo do Estado),
    como era antes."""
    por_id = {w["id"]: w.get("fields", {}) for w in brutos}
    ust_por_contrato = {c.get("contrato", ""): valores_ust(c) for c in catalogos}
    padrao = catalogos[0].get("contrato", "") if catalogos else ""
    xvia = next((c for c in catalogos if eh_contrato_xvia(c.get("contrato"))), {})
    ust_xvia_id, ust_xvia_codigo = valores_ust(xvia), ust_por_codigo(xvia)

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
        empresa = (f.get("Custom.SGI.Empresa") or "").strip() or None
        tabela = ust_xvia_id if eh_contrato_xvia(empresa) else ust_por_contrato.get(empresa or padrao, {})
        valor_ust = tabela.get(str(lancamento)) if lancamento else None
        atividade = f.get("Custom.SGI.AtividadeUST") or None
        # Código do catálogo X-VIA: da atividade marcada ("DOC.07 - …") quando a
        # Task tem o contrato X-VIA; senão do que a X-VIA escreveu na descrição.
        codigo = None
        if tipo == "Task":
            m = CODIGO_ATIVIDADE.match(atividade or "") if eh_contrato_xvia(empresa) else None
            codigo = m.group(1) if m else codigo_catalogo(f.get("System.Description"))
        if valor_ust is None and not empresa and codigo:
            valor_ust = ust_xvia_codigo.get(codigo)
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
            "empresa": empresa,
            "atividadeUst": atividade,
            "complexidadeUst": f.get("Custom.SGI.ComplexidadeUST") or None,
            "ust": valor_ust,
            "dataExecucao": _data(f.get("Custom.SGI.DataExecucao")),
            "codigoCatalogo": codigo,
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


def ler_widget(w: dict) -> dict | None:
    """Widget do dashboard -> {titulo, queryId, groupBy, ordem}, ou None se não
    tem consulta (membros do time, links). Card de consulta traz `queryId`;
    gráfico traz `transformOptions.filter` (id da consulta) + `groupBy`."""
    try:
        s = json.loads(w.get("settings") or "{}")
    except ValueError:
        return None
    if not isinstance(s, dict):
        return None
    opcoes = s.get("transformOptions") or {}
    query = s.get("queryId") or opcoes.get("filter")
    if not query:
        return None
    pos = w.get("position") or {}
    return {
        "titulo": (w.get("name") or s.get("queryName") or "").strip(),
        "queryId": query,
        "groupBy": opcoes.get("groupBy") or None,
        "ordem": (pos.get("row", 0), pos.get("column", 0)),
    }


def agrupar(valores: list, campo: str = "") -> list[dict]:
    """Contagem por valor do campo do gráfico, maior primeiro. Caminho de
    sprint/área vira o último trecho ("XVIA\\Sprint 7" -> "Sprint 7"); sprint
    na raiz do projeto ("XVIA") = item sem sprint."""
    def rotulo(v) -> str:
        if not v:
            return "Sem valor"
        if campo == "System.IterationPath" and "\\" not in str(v):
            return "Sem sprint"
        return str(v).rsplit("\\", 1)[-1]
    rotulos = [rotulo(v) for v in valores]
    return [{"rotulo": r, "qtd": n} for r, n in Counter(rotulos).most_common()]


def hoje_utc() -> date:
    return datetime.utcnow().date()
