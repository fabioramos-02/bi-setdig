"""Transformação dos eventos de navegação do Perfil do Cidadão.

Lê os eventos customizados da categoria 'Navegacao_Perfil' e monta a contagem
de cliques nas abas de categorias e cliques nos serviços dentro dessas abas.
"""
from __future__ import annotations

from validate.rules import ValidationError, validate_rows

def build_eventos_breakdown(
    eventos_aba_brutos: dict[str, list],
    eventos_servico_brutos: dict[str, list]
) -> dict[str, dict]:
    """Monta o breakdown por período para os eventos.
    
    Espera:
    eventos_aba_brutos = {'dia': [{'label': 'Cidadão', 'nb_events': 10}], ...}
    eventos_servico_brutos = {'dia': [{'label': 'Cidadão - Serviço X', 'nb_events': 5}], ...}
    
    Retorna:
    {
      'dia': {
        'cliquesAba': [{'perfil': 'Cidadão', 'cliques': 10}],
        'cliquesServico': [{'perfil': 'Cidadão', 'servico': 'Serviço X', 'cliques': 5}]
      }
    }
    """
    out: dict[str, dict] = {}
    
    # Ambos os dicionários terão as mesmas chaves de período (PERIODOS_FIXOS)
    for periodo in eventos_aba_brutos.keys():
        abas_bruto = eventos_aba_brutos.get(periodo) or []
        servicos_bruto = eventos_servico_brutos.get(periodo) or []
        
        cliques_aba = []
        for row in abas_bruto:
            cliques_aba.append({
                "perfil": row.get("label", "Desconhecido"),
                "cliques": int(row.get("nb_events", 0))
            })
            
        cliques_servico = []
        for row in servicos_bruto:
            label = row.get("label", "")
            # O formato esperado no Name do evento é "Perfil - Serviço"
            partes = label.split(" - ", 1)
            if len(partes) == 2:
                perfil, servico = partes
            else:
                perfil = "Desconhecido"
                servico = label
                
            cliques_servico.append({
                "perfil": perfil,
                "servico": servico,
                "cliques": int(row.get("nb_events", 0))
            })
            
        # Ordenar por mais cliques
        cliques_aba.sort(key=lambda x: -x["cliques"])
        cliques_servico.sort(key=lambda x: -x["cliques"])
        
        out[periodo] = {
            "cliquesAba": cliques_aba,
            "cliquesServico": cliques_servico
        }
        
    return out


def validar(saida: dict[str, dict]) -> None:
    """Valida o formato de saída do breakdown de eventos de navegação."""
    for periodo, bloco in saida.items():
        try:
            validate_rows(bloco.get("cliquesAba", []), ["perfil", "cliques"], ["cliques"])
            validate_rows(bloco.get("cliquesServico", []), ["perfil", "servico", "cliques"], ["cliques"])
        except ValidationError as exc:
            raise ValidationError(f"período {periodo!r}: {exc}") from exc
