"""Transform de dados do banco do Portal Único (controlador_prd)."""
from __future__ import annotations

from datetime import date

def build_cadastros_breakdown(contagens_brutas: dict[str, dict]) -> dict[str, list[dict]]:
    """Monta o breakdown {dia: [{referencia, valor, variacaoAbsoluta}], ...}."""
    out: dict[str, list[dict]] = {}
    for chave, dados in contagens_brutas.items():
        atual = dados["atual"]
        anterior = dados["anterior"]
        variacao = atual - anterior
        # A referência pode ser só a data atual.
        out[chave] = [{"referencia": date.today().isoformat(), "valor": atual, "variacaoAbsoluta": variacao}]
    return out
