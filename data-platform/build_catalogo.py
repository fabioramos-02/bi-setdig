"""Catálogo de serviços do app MS Digital (nativo × web) a partir da planilha.

Fonte manual (não é API): `Total de serviços do app.xlsx`. Diferente do resto do
pipeline (Matomo/GA4), aqui a extração é de um xlsx mantido à mão. Rode quando a
planilha mudar:

    python data-platform/build_catalogo.py [caminho_do_xlsx]

Colunas: A=Área de Atuação (forward-fill), B=Serviço, C=Status (Ativo/Inativo),
D=Tipo (nativo/web). Publica datasets/app/v1/catalogo-servicos.json.
"""
from __future__ import annotations

import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import openpyxl  # noqa: E402

from publish.writer import publish  # noqa: E402
from reference.ms_digital_catalogo_urls import CATALOGO as URLS_CATALOGO  # noqa: E402
from validate.rules import validate_rows  # noqa: E402

DEFAULT_XLSX = Path.home() / "Downloads" / "Total de serviços do app.xlsx"


def _normalizar(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().strip()


def _folha(servico: str) -> str:
    """'Submenu > Serviço' -> 'Serviço' (planilha às vezes guarda o caminho
    completo do menu; a referência de URL só conhece o nome-folha)."""
    return servico.split(">")[-1].strip()


def _indice_urls() -> dict[str, str]:
    """nome-normalizado -> url, dos serviços tipo 'redirect' na referência
    (por nome E pelo rótulo `ga4`, quando presente e diferente do nome)."""
    indice: dict[str, str] = {}
    for dados in URLS_CATALOGO.values():
        for s in dados["servicos"]:
            if not s.get("url"):
                continue
            indice[_normalizar(s["nome"])] = s["url"]
            if s.get("ga4"):
                indice.setdefault(_normalizar(s["ga4"]), s["url"])
    return indice


def enriquecer_com_url(catalogo: list[dict]) -> list[dict]:
    """Adiciona `url: str | None` a cada item — casa (nome exato -> segmento-
    folha após '>') contra data-platform/reference/ms_digital_catalogo_urls.py.
    Cobertura esperada ~83% dos itens tipo 'web' (o resto fica None — catálogos
    transcritos manualmente em momentos diferentes, drift natural)."""
    indice = _indice_urls()
    out = []
    for item in catalogo:
        chave = _normalizar(_folha(item["servico"]))
        out.append({**item, "url": indice.get(chave)})
    return out


def build(xlsx_path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb["Planilha1"]
    rows = list(ws.iter_rows(values_only=True))

    catalogo: list[dict] = []
    area = None
    for r in rows[1:]:  # pula cabeçalho
        a, b, c, d = r[0], r[1], r[2], r[3]
        if a:
            area = str(a).strip()
        if not b:
            continue
        tipo = (str(d).strip().lower() if d else "web")
        tipo = "nativo" if tipo == "nativo" else "web"  # tudo que não é nativo = web
        catalogo.append(
            {
                "categoria": area or "(sem categoria)",
                "servico": str(b).strip(),
                "tipo": tipo,
                "ativo": (str(c).strip().lower() == "ativo") if c else False,
            }
        )
    return catalogo


if __name__ == "__main__":
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    catalogo = enriquecer_com_url(build(xlsx))
    validate_rows(catalogo, required=["categoria", "servico", "tipo", "ativo"], non_negative=[])
    out = publish("app", "catalogo-servicos", catalogo)
    com_url = sum(1 for s in catalogo if s.get("url"))
    print(f"      {com_url} serviços com url cadastrada")

    nativo = sum(1 for s in catalogo if s["tipo"] == "nativo")
    ativo = sum(1 for s in catalogo if s["ativo"])
    cats = len({s["categoria"] for s in catalogo})
    print(f"[app] catalogo-servicos -> {out}")
    print(f"      {len(catalogo)} serviços | {nativo} nativo / {len(catalogo) - nativo} web | {ativo} ativo | {cats} categorias")
