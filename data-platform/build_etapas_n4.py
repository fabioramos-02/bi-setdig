"""Etapas das cartas de nível 4 do censo, direto do banco das Cartas.

Nível 4 = "100% online com servidor analisando", mas é autodeclarado: parte
das cartas manda o cidadão baixar formulário e mandar por e-mail. Este script
pega as etapas publicadas (`gerenciamento_jornada`) de cada carta nível 4 que
tenha slug, para a aba "Nível 4 na prática" de `/censo-digital` classificar
(src/lib/censo-n4.ts).

Lê o censo já publicado (não precisa do xlsx). Exige VPN da SETDIG, como o
resto de extract/cartas.py. Rode depois de build_censo.py:

    python data-platform/build_etapas_n4.py

Publica datasets/censo/v2/etapas-n4.json. Sem conexão, a exceção sobe e nada
é publicado — o arquivo velho fica.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from extract.cartas import get_jornadas  # noqa: E402
from publish.writer import DATASETS_DIR, publish  # noqa: E402

CENSO = DATASETS_DIR / "censo" / "v2" / "censo.json"
_LINK = re.compile(r"""<a\b[^>]*href=["']([^"']+)["'][^>]*>""", re.I)
_TAG = re.compile(r"<[^>]+>")


def texto_limpo(conteudo_html: str | None) -> str:
    """HTML da etapa -> texto. Links viram texto (`url texto`) porque o
    destino (.pdf, forms.ms.gov.br, e-mail) é justamente o que classifica."""
    if not conteudo_html:
        return ""
    s = _LINK.sub(r" \1 ", conteudo_html)
    s = re.sub(r"<br\s*/?>|</p>|</li>", " ", s, flags=re.I)
    s = html.unescape(_TAG.sub(" ", s))
    return re.sub(r"\s+", " ", s).strip()


def agrupar(linhas: list[dict]) -> dict[str, dict]:
    """1 linha por etapa (vinda do JOIN) -> 1 registro por slug."""
    por_slug: dict[str, dict] = {}
    for l in linhas:
        carta = por_slug.setdefault(l["slug"], {
            "etapas": [],
            # "Acessar serviço" do portal: só vale se a carta habilita o botão.
            "linkAcesso": l["url_externo"] if l["acesso_externo"] else None,
            "linkIntegrado": bool(l["link_integrado"]),
        })
        if l["ordem"] is None and l["titulo"] is None:
            continue  # carta sem etapa (LEFT JOIN)
        carta["etapas"].append({
            "titulo": (l["titulo"] or "").strip(),
            "texto": texto_limpo(l["conteudo"]),
            "canais": list(l["canal_prestacao"] or []),
        })
    return por_slug


def build() -> list[dict]:
    orgaos = json.loads(CENSO.read_text(encoding="utf-8"))
    alvos = [c for o in orgaos for c in o["cartas"] if c["nivel"] == 4 and c["slug"]]
    por_slug = agrupar(get_jornadas(sorted({c["slug"] for c in alvos})))
    nao_achadas = [c["slug"] for c in alvos if c["slug"] not in por_slug]
    print(f"      slugs sem carta no banco: {len(nao_achadas)} {nao_achadas[:5]}")
    return [{"id": c["id"], "slug": c["slug"], **por_slug[c["slug"]]} for c in alvos if c["slug"] in por_slug]


if __name__ == "__main__":
    linhas = build()
    out = publish("censo", "etapas-n4", linhas, version="v2", frequency="manual")
    print(f"[censo] etapas-n4 -> {out}")
    print(f"      {len(linhas)} cartas | sem etapa publicada: {sum(1 for l in linhas if not l['etapas'])}")
