# ADR-013 — Métrica de uso da carta de serviço: visitas × visitantes únicos

**Status:** proposto — dados a preencher rodando `python data-platform/analysis/comparacao-metricas-carta.py` após publicar `acessos-cartas-completo.json`.

## Contexto

O ticket SGD (2026-08) pediu que o painel do Portal Único traga o número de "cidadãos que usam a carta de serviço". O Matomo oferece duas contagens candidatas por página:

| Métrica Matomo | Nome no dataset | O que conta |
|---|---|---|
| `nb_visits` | `visitas` | 1 sessão = 1. Se a mesma pessoa volta 3× no mês, conta 3. |
| `nb_uniq_visitors` | `visitantesUnicos` | 1 pessoa = 1 (dentro do período consultado), independente de quantas sessões. |
| `nb_hits` | `pageviews` | Toda vez que a carta é aberta. Se a pessoa recarrega 5×, conta 5. |

Antes desta rodada, `acessos-botao-servico.json` publicava só `cliques` (via `Actions.getOutlinks`) — nem visita nem visitante único apareciam. O novo dataset `acessos-cartas-completo.json` traz os três de uma vez, o que permite comparar sem custo de nova extração.

O gestor precisa de **um** número principal por carta, não três. Publicar todos deixa o painel ilegível ("qual é o certo?") e alimenta interpretações inconsistentes entre reuniões diferentes.

## Alternativas

### A. `visitas` (nb_visits)

**A favor:**
- Mede *intenção acumulada*: mesma pessoa buscando o serviço 3× no mês → 3 chances de sucesso ou 3 tentativas frustradas. Faz sentido pra medir volume de interação.
- Base histórica: relatórios Matomo antigos do time já falavam em "visitas".
- Estável em janela longa (ano): mesma pessoa que voltou 12× no ano é contada 12×, o número não colapsa.

**Contra:**
- Não responde "quantos cidadãos usaram" — responde "quantas idas ao balcão". Um cidadão insistente infla o número.
- Confunde-se com "usuários" na leitura leiga (o próprio Matomo já teve que trocar o rótulo por isso).

### B. `visitantesUnicos` (nb_uniq_visitors)

**A favor:**
- Responde diretamente "quantas pessoas distintas usaram esta carta no período" — a pergunta do ticket SGD.
- Alinhado ao vocabulário do gestor ("quantos cidadãos").
- Coerente com o KPI "Usuários cadastrados no Portal Único" da Task 4 (ambos contam pessoas, não sessões).

**Contra:**
- **Não é aditivo entre períodos.** Uniq de janeiro + uniq de fevereiro ≠ uniq de jan+fev (pessoa que aparece nos dois é contada 2× na soma, mas 1× no agregado).
- **Uniq de janela longa (ano) tem cap prático.** O Matomo identifica o visitante por cookie/fingerprint dentro do período consultado — quanto maior a janela, maior a chance de o mesmo cidadão receber IDs diferentes (troca de dispositivo, cookies limpos). O número pode subestimar em period=ano.
- Comparação entre períodos exige cuidado: uniq/mês pode subir e uniq/ano ficar estável, sem contradição real.

### C. `pageviews` (nb_hits)

**Contra:**
- Reload da página conta como uso — inflaciona indiscriminadamente. Não descreve "cidadão", nem "sessão", nem "tentativa" — só "carregamentos". Fora da discussão como métrica principal.
- Mantido no dataset apenas como **denominador da taxa de conversão** (cliques / pageviews).

## Decisão

*a preencher depois de rodar o script — deixar o número observado abaixo antes de fechar:*

```
Rodar: python data-platform/analysis/comparacao-metricas-carta.py

Preencher aqui:
- Razão média uniq/visits nas top 100 cartas: ______
- Razão mediana:                              ______
- Faixa observada:                            [___ … ___]

Interpretação:
- Se razão média ≈ 1.0 → cidadão volta pouco à mesma carta; as duas métricas
  são quase equivalentes. Escolher pela clareza de linguagem: `visitantesUnicos`.
- Se razão < 0.7 → cidadão volta várias vezes à mesma carta no período; a
  diferença entre "quantas pessoas" e "quantas idas" importa e precisa ser
  narrada. Escolher `visitantesUnicos` como métrica principal + expor
  `visitas` como métrica secundária ("... com N sessões totais").
```

**Recomendação inicial (a confirmar com dado):** `visitantesUnicos` como métrica principal do painel — responde à pergunta do ticket em português direto ("cidadãos que usaram") e casa com a Task 4 (cadastros). `visitas` fica no dataset e pode aparecer em drill-down/tooltip, nunca como número principal do card. `pageviews` só como denominador de conversão.

## Consequências

- Um único número por carta no painel, com rótulo cidadão ("Pessoas que usaram esta carta no período").
- Não somar `visitantesUnicos` entre períodos no cliente — se o painel precisar de "uniq ano", pega direto do bucket `ano`, não soma 12 meses.
- Ranking "cartas mais usadas" ordena por `visitantesUnicos`, não `visitas` — pode reordenar em relação ao rankeamento anterior. Documentar no `comoLer` do StoryCard: "Ordenado por quantas pessoas distintas usaram no período. Uma carta com pouca gente que retorna muito pode aparecer abaixo de outra com muita gente que só entrou uma vez."
- `acessos-cartas-completo.json` continua trazendo `visitas` e `pageviews` — os campos são baratos, custo zero manter, e são necessários pra taxa de conversão e pra este próprio ADR ser reexaminável no futuro.

## Referências

- Script de análise: `data-platform/analysis/comparacao-metricas-carta.py`
- CSV de saída: `datasets/_analysis/comparacao-visitas-vs-uniq.csv` (não versionado — regerar sempre)
- Dataset base: `datasets/matomo/v1/acessos-cartas-completo.json`
- Ticket SGD 2026-08: "Comparar usuário único e acesso geral para definir a métrica do painel"
