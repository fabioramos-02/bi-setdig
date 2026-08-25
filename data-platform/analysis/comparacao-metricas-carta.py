"""Task 3 SGD — comparar nb_visits (visitas) vs nb_uniq_visitors (visitantes
únicos) por carta pra decidir qual métrica vai pro painel do Portal Único.

Roda 1× após publicar `acessos-cartas-completo.json`; gera CSV que alimenta
o ADR-013. Sem argumentos.

Uso: python data-platform/analysis/comparacao-metricas-carta.py

Saída: datasets/_analysis/comparacao-visitas-vs-uniq.csv
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path
from statistics import mean, median

REPO_ROOT = Path(__file__).resolve().parents[2]
DATASET = REPO_ROOT / "datasets" / "matomo" / "v1" / "acessos-cartas-completo.json"
SAIDA_DIR = REPO_ROOT / "datasets" / "_analysis"
SAIDA_CSV = SAIDA_DIR / "comparacao-visitas-vs-uniq.csv"

TOP_N = 100


def _razao(num: int, den: int) -> float | None:
    if den <= 0:
        return None
    return round(num / den, 3)


def main() -> None:
    if not DATASET.exists():
        print(f"ERRO: {DATASET} não existe — rode `python data-platform/run.py` primeiro.", file=sys.stderr)
        sys.exit(1)

    dados = json.loads(DATASET.read_text(encoding="utf-8"))
    SAIDA_DIR.mkdir(parents=True, exist_ok=True)

    linhas_csv: list[dict] = []
    resumo_por_periodo: dict[str, dict] = {}

    for periodo, lista in dados.items():
        # Top-N por visitas absolutas dentro do período.
        top = sorted(lista or [], key=lambda r: -r.get("visitas", 0))[:TOP_N]
        razoes_uniq_visits: list[float] = []
        for c in top:
            visits = int(c.get("visitas", 0))
            uniq = int(c.get("visitantesUnicos", 0))
            pageviews = int(c.get("pageviews", 0))
            cliques = int(c.get("cliques", 0))
            r_uniq_visits = _razao(uniq, visits)
            if r_uniq_visits is not None:
                razoes_uniq_visits.append(r_uniq_visits)

            linhas_csv.append(
                {
                    "periodo": periodo,
                    "slug": c.get("slug", ""),
                    "titulo": c.get("titulo", ""),
                    "orgaoSigla": c.get("orgaoSigla") or "",
                    "pageviews": pageviews,
                    "visits": visits,
                    "uniq_visitors": uniq,
                    "cliques": cliques,
                    "ratio_uniq_por_visit": r_uniq_visits if r_uniq_visits is not None else "",
                    "ratio_visits_por_pageview": _razao(visits, pageviews) or "",
                    "taxa_conversao_pct": c.get("taxaConversaoPct") if c.get("taxaConversaoPct") is not None else "",
                }
            )

        if razoes_uniq_visits:
            resumo_por_periodo[periodo] = {
                "n_cartas": len(razoes_uniq_visits),
                "media_uniq_por_visit": round(mean(razoes_uniq_visits), 3),
                "mediana_uniq_por_visit": round(median(razoes_uniq_visits), 3),
                "min": round(min(razoes_uniq_visits), 3),
                "max": round(max(razoes_uniq_visits), 3),
            }

    with open(SAIDA_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "periodo", "slug", "titulo", "orgaoSigla",
                "pageviews", "visits", "uniq_visitors", "cliques",
                "ratio_uniq_por_visit", "ratio_visits_por_pageview", "taxa_conversao_pct",
            ],
        )
        writer.writeheader()
        writer.writerows(linhas_csv)

    print(f"CSV: {SAIDA_CSV} ({len(linhas_csv)} linhas)")
    print("\nResumo por período (razão visitante único / visita):")
    for periodo, r in resumo_por_periodo.items():
        print(
            f"  {periodo:>8}: n={r['n_cartas']:>3}  "
            f"média={r['media_uniq_por_visit']:.2f}  mediana={r['mediana_uniq_por_visit']:.2f}  "
            f"[{r['min']:.2f} … {r['max']:.2f}]"
        )
    print("\nRegistrar leitura + decisão em docs/architecture/ADR-013-metrica-uso-cartas.md")


if __name__ == "__main__":
    main()
