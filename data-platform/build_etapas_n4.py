"""Etapas das cartas de nível 4 do censo, direto do Portal Único.

Nível 4 = "100% online com servidor analisando", mas é autodeclarado: parte
das cartas manda o cidadão baixar formulário e mandar por e-mail. Este script
pega as etapas publicadas de cada carta nível 4 (que tenha slug) para o painel
aba "Nível 4 na prática" de `/censo-digital` classificar (src/lib/censo-n4.ts).

Lê o censo já publicado (não precisa do xlsx). Rode depois de build_censo.py:

    python data-platform/build_etapas_n4.py

Publica datasets/censo/v2/etapas-n4.json. Se alguma carta falhar (rede, 401),
aborta sem publicar — arquivo velho fica.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

from extract.portal_cartas import get_carta  # noqa: E402
from publish.writer import DATASETS_DIR, publish  # noqa: E402

CENSO = DATASETS_DIR / "censo" / "v2" / "censo.json"
_LINK = re.compile(r"""<a\b[^>]*href=["']([^"']+)["'][^>]*>""", re.I)
_TAG = re.compile(r"<[^>]+>")


def texto_limpo(conteudo_html: str | None) -> str:
    """HTML da etapa -> texto. Links viram texto (`texto (url)`) porque o
    destino (.pdf, forms.ms.gov.br, e-mail) é justamente o que classifica."""
    if not conteudo_html:
        return ""
    s = _LINK.sub(r" \1 ", conteudo_html)
    s = re.sub(r"<br\s*/?>|</p>|</li>", " ", s, flags=re.I)
    s = html.unescape(_TAG.sub(" ", s))
    return re.sub(r"\s+", " ", s).strip()


def etapas_da_carta(carta: dict) -> dict:
    jornada = sorted(carta.get("jornada") or [], key=lambda e: e.get("ordem") or 0)
    return {
        "etapas": [
            {"titulo": (e.get("titulo") or "").strip(), "texto": texto_limpo(e.get("conteudo"))}
            for e in jornada
        ],
        # "Acessar serviço" do portal: só vale se a carta habilita o botão.
        "linkAcesso": carta.get("url_externo") if carta.get("acesso_externo") else None,
        "linkIntegrado": bool(carta.get("link_integrado")),
    }


def build() -> list[dict]:
    orgaos = json.loads(CENSO.read_text(encoding="utf-8"))
    alvos = [c for o in orgaos for c in o["cartas"] if c["nivel"] == 4 and c["slug"]]
    saida, nao_achadas = [], []
    with requests.Session() as s:
        for i, c in enumerate(alvos, 1):
            carta = get_carta(c["slug"], s)
            if carta is None:
                nao_achadas.append(c["slug"])
                continue
            saida.append({"id": c["id"], "slug": c["slug"], **etapas_da_carta(carta)})
            if i % 50 == 0:
                print(f"      {i}/{len(alvos)}")
    print(f"      slugs sem carta no portal: {len(nao_achadas)} {nao_achadas[:5]}")
    return saida


if __name__ == "__main__":
    linhas = build()
    out = publish("censo", "etapas-n4", linhas, version="v2", frequency="manual")
    print(f"[censo] etapas-n4 -> {out}")
    print(f"      {len(linhas)} cartas | sem etapa publicada: {sum(1 for l in linhas if not l['etapas'])}")
