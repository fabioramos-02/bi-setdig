# 01 — Diagnóstico do BI do Projeto X-VIA

Retrato de 11/11/2026, feito antes da refatoração. Dados: extração do TFS de 10/11/2026 21:05 UTC.
Base: análise em três frentes (arquitetura e código, dados e indicadores, UX), mais o PBI
[#1348598](https://tfs.sgi.ms.gov.br/tfs/Global/XVIA/_workitems/edit/1348598).

## Estrutura atual

| Camada | Onde | O que faz |
|---|---|---|
| Extração | `data-platform/extract/tfs.py` | Lê, do TFS on-prem (API 4.1), a árvore de Epics, os campos, os links, as sprints e o dashboard do time. Só funciona na rede do Governo/VPN, por isso roda à mão. |
| Transformação | `data-platform/transform/tfs.py` | Gera uma linha por work item: frente, órgão, UST, dependências. |
| Datasets | `datasets/tfs/v1/` | `itens`, `sprints`, `painel-time` (vêm do TFS); `contrato`, `etp-ust`, `catalogo-ust*`, `stakeholders` (preenchidos à mão). |
| Cálculo | `src/lib/tfs.ts`, `src/lib/tfs-painel.ts` | Funções puras de todos os indicadores. |
| Tela | `src/app/(plataforma)/projeto-xvia/` | 3 níveis: Secretário (1 aba), Gerente (4), Detalhamento (4). Filtros na URL. |
| Testes | `src/lib/tfs.test.ts` (node:test, no CI), `data-platform/transform/tfs_test.py` (pytest, **fora do CI**) | 268 testes JS verdes; 38 pytest. |

Stack: Next 16 (App Router), React 19, TypeScript, Tailwind 4, Recharts 3, Design System MS
vendorizado (ADR-006), mobile-first (ADR-009). Deploy na Vercel a cada push em `master`.

## O que funciona e fica

- A divisão em três níveis de leitura e os filtros na URL (`ProjetoXviaClient.tsx`).
- "De onde vem?" (`OrigemBotao`): cada número leva aos itens do TFS que o compõem.
- O padrão `StoryCard`: frase-âncora, legenda e "como ler".
- Faturado, aceite e pago aparecem como "Não informado", sem estimativa feita a partir da execução.
- A regra "consumo de UST não é % de conclusão" (`tfs.ts:342`).

## Problemas encontrados

### Separação X-VIA × SGD

| # | Problema | Evidência | Impacto |
|---|---|---|---|
| 1 | Entregas da SGD entram nos indicadores executivos da X-VIA | `andamentoEntregas`, `atrasadas`, `pendencias` não filtram a frente (`tfs.ts:373-400`) | Dos 138 itens "em produção", 63 são da SGD; das 358 entregas, 112 são da SGD |
| 2 | UST separada pelo **login** do responsável | `TIME_SGD` (`transform/tfs.py:113`) → `ehTarefaXvia` (`tfs.ts:267`) | Task sem responsável conta como X-VIA; Task reatribuída muda de lado; pessoa nova da SGD vaza |
| 3 | Área SGD com contrato X-VIA soma como X-VIA sem critério explícito | Task #1372987 (área `XVIA\SGD`, contrato X-VIA, 1 UST) | Regra implícita, sem teste |
| 4 | Título `[SGD]` fora da área SGD é classificado como X-VIA | 7 Tasks (#1338401, #1338540-42, #1353221, #1365563, #1365869) | Filtro "frente" erra |
| 5 | Não existe "Não identificado": todo item vira X-VIA ou SGD | `frente()` (`transform/tfs.py:47`) | Origem desconhecida entra nos totais |
| 6 | Vazamento possível do catálogo Governo | `transform/tfs.py:173`: Task sem empresa recebe UST do catálogo padrão | Hoje 0 casos; o caminho existe |

### Cálculo

| # | Problema | Evidência |
|---|---|---|
| 7 | A aba Financeiro não fecha: o KPI mostra 520 UST e a tabela por órgão soma 424 | `consumoPorOrgao` descarta código fora do ETP (`tfs.ts:483`); `execucaoXvia` conta esse código (`:289`) |
| 8 | `previsaoMensal` soma 23.416 | Mês 18 = 288 em `contrato.json`; o TR imprime 228, que fecha 23.356 (a nota do arquivo inverte a conclusão) |
| 9 | Mês do contrato diferente entre o BI e o painel do TFS | BI usa `floor(dias/30,44)+1` = 6 (`tfs.ts:133`); `lancar-demandas-xvia/src/painel.py` = 5 |
| 10 | Com filtro de módulo, órgão ou sprint, a UST do recorte é comparada com o previsto do contrato inteiro | `ExecutivoTab.tsx:58,79` |
| 11 | `dataExecucao` é extraída e não é usada: não há "executado no mês" | busca em `src/` |
| 12 | Regra código→ETP→valor duplicada | `execucaoXvia` (`:276-300`) e `consumoPorOrgao` (`:476-484`) |
| 13 | Rótulo "% do ETP" mostra o total do TR | `UstTab.tsx:64-66` |

### Dados ausentes

Não há fonte para Ordem de Serviço, medição, nota fiscal, faturamento, pagamento, glosa, aceite
e SLA. O campo `Custom.SGI.Faturado` está vazio nos 2.000 itens. Os itens 1 e 2 do contrato
(licença e implantação) não são acompanhados. 1.305 itens estão sem órgão.

### Interface

- "Em produção" aparece 5 vezes na tela do Secretário; a UST executada, 4 vezes.
- Siglas sem explicação: UST, TR, ETP, OS, "Item 3", "TR 9.3".
- Três implementações de cartão de indicador (`Indicador` local, KPIs inline, `MetricCard`); o link `#id título` está copiado em 6 lugares.
- Cinco cartões "Não informado" ocupam a tela sem responder a nada.
- Não há cronograma nem dependência visível. O PBI #1348598 pede o Gantt "publicado", e hoje ele sai fora do BI (`lancar-demandas-xvia/src/cronograma.py`).
- Nenhum cartão responde "o que atrasou e o que isso trava".

### Código sem uso

`resumoEntregas` e `FILTROS_VAZIOS` (`tfs.ts`), usados só em teste; `components/dashboard/FaixasDeAcessoCard.tsx`.
Fora do escopo X-VIA: `datasets/ga4/v1`, `datasets/logs` (1.018 arquivos), SVGs do scaffold em `public/`.

## PBI #1348598 × código

| Critério do PBI | Situação no BI |
|---|---|
| Dependências como Predecessor/Successor | **Parcial**: `dependeDe`/`trava` são extraídos e só contados ("Dependências ligadas") |
| Start/Target Date em Épicos e Features | **Parcial**: `inicioPrevisto`/`prazo` são extraídos; só o prazo é usado (atraso) |
| Gantt por módulo e geral publicado | **Não implementado** |
| Cronograma e Plano de Execução revisados | Fora do BI (tasks #1348599, #1348600 com a X-VIA) |

## Skills usadas

`storytelling-bi` (uma pergunta por bloco, frase antes do número), `frontend-design`
(hierarquia), `caveman` e `ponytail` (texto e código enxutos). Todas estavam disponíveis.
