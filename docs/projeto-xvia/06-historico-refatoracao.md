# 06 — Histórico da refatoração (11/11/2026)

Branch `feat/bi-xvia-refatoracao`. Plano aprovado pelo Fabio em 11/11/2026, com estas decisões:
a frente vem do contrato, o financeiro é um arquivo manual, o mês é o civil com mês 18 = 228, e o
Gantt fica na Visão do Gerente. Durante o trabalho, o Fabio acrescentou que **só Task fatura e tem UST**.

## Dados e pipeline

| Arquivo | Mudança |
|---|---|
| `data-platform/transform/tfs.py` | `frente()` pelo contrato/área/título/épico, com "Não identificado"; UST só em Task; Task sem contrato na área faturada nunca usa o catálogo do Governo; `TIME_SGD` passa a ser só alerta |
| `data-platform/transform/tfs_test.py` | +5 testes (frente de entrega, frente da Task pelo contrato, área faturada sem Governo, frente ignora o responsável, só Task tem UST); o `__main__` foi para o fim (antes não rodava 4 testes) |
| `datasets/tfs/v1/contrato.json` | mês 18 = 228; nota corrigida |
| `datasets/tfs/v1/financeiro.json` + `schemas/tfs-financeiro.schema.json` | **novo**: OS → medição → NF → pagamento + glosas, vazio, com exemplo |
| `datasets/tfs/v1/itens.json`, `painel-time.json` | reextraídos do TFS em 11/11/2026 com a regra nova |
| `datasets/catalog.json` | entrada `financeiro`; `contrato` atualizado |

## Cálculo

| Arquivo | Mudança |
|---|---|
| `src/lib/tfs.ts` | tipo `Frente`, `soXvia`, `ehTarefaXvia` pela frente + trava do contrato; `ustDaTarefa` (regra única: total = soma por órgão); mês civil; `executadoPorMes`; `Financeiro`, `recorteFinanceiro`, `cadeiaFinanceira` (status confirmado/calculado/ausente/divergente); `FONTES_CONTRATO`; novas verificações de qualidade; `temRecorte`. **Removidos:** `resumoEntregas`, `FILTROS_VAZIOS`, `cadeiaMedicao` |
| `src/lib/cronograma.ts` | **novo**: porte de `lancar-demandas-xvia/src/cronograma.py` |
| `src/lib/data.ts` | `getTfsFinanceiro` |
| testes | `tfs-frentes.test.ts` (6) e `cronograma.test.ts` (3), novos; `tfs.test.ts` ajustado. 276 testes JS verdes |

## Interface (`src/app/(plataforma)/projeto-xvia/`)

| Componente | Situação |
|---|---|
| `RelatorioMensal.tsx` | **novo**, substitui `ExecutivoTab.tsx` (removido): relatório de 11 seções |
| `PrioridadesTab.tsx` | **novo**, substitui `PendenciasTab.tsx` (removido): motivo, ação e quem resolve; X-VIA e SGD separados |
| `CronogramaTab.tsx` | **novo**: Gantt por sprint com setas, linha HOJE, visão geral só com cadeias |
| `FinanceiroTab.tsx` | reescrito: cadeia de 8 etapas e drill Órgão → Serviço e Órgão → OS → Medição → NF → Pagamento |
| `EntregasTab.tsx`, `EquipesTab.tsx`, `RegistrosFinanceirosTab.tsx` | **novos** (Detalhamento C, E e B) |
| `CadeiaFinanceira.tsx`, `comum.tsx` | **novos**: tabela da cadeia; `LinkItem`, `Sigla` com glossário, `ValorStatus`, `SecaoRelatorio`, tons |
| `UstTab.tsx` | "% do ETP" → "% do contratado"; UST por mês; texto da regra |
| `QualidadeTab.tsx` | fontes de uma lista só; data do retrato com alerta; frente, divergências e soma × total |
| `FiltrosBar.tsx` | opção "Não identificado" |
| `ProjetoXviaClient.tsx`, `page.tsx` | três níveis reorganizados; financeiro e idade do retrato |
| `components/dashboard/MetricCard.tsx` | `cor` e `children` opcionais (unifica os 3 cartões de KPI) |
| `components/dashboard/FaixasDeAcessoCard.tsx` | **removido** (sem uso) |

## Funcionalidades preservadas

Filtros na URL, "De onde vem?", exportar relatório com capa, `StoryCard`, Módulos, Sprints e aceite,
Órgãos e pontos focais, quadro do time no TFS, CSVs.

## Repositório irmão (`lancar-demandas-xvia`)

`src/painel.py`: mês civil (= 6 em nov/2026), mês 18 = 228, UST pelo contrato sem lista de logins.
`tests/test_painel.py` atualizado (6 verdes). O quadro "Situação do contrato" do TFS passa a dizer o
mesmo que o BI.

## Rodada 2 (11/11/2026): topo do Secretário e "De onde vem?"

- O parágrafo-síntese e os 4 cartões deram lugar ao `PainelSecretario`: um veredito em uma frase e 3 sinais em semáforo, com o "Como ler" recolhido (e aberto na impressão). Ver `vereditoExecutivo` e os tons `tomEntregas`, `tomExecucao` e `tomDecisoes` em `src/lib/tfs.ts`; `sinteseExecutiva` foi removida.
- O modal "De onde vem?" foi reescrito. Agora mostra a conta em passos, a fonte, a busca, o CSV e os grupos com subtotal. O foco vai para a busca ao abrir.
- `Modal` ganhou `largura`, `subtitulo` e `data-autofocus`. `Origem` ganhou `numero`, `passos`, `fonte`, `valor` e `agruparPor`.
- Testes: `src/lib/tfs-veredito.test.ts` (3 testes). Ao todo, 279 testes JS passam.

## Rodada 3 (11/11/2026): seção 6, SLA

- A seção 6 virou "Prazos de atendimento (SLA)" (`SlaSecao.tsx`). Mostra a tabela do TR 4.3.1 (vinda de `contrato.json` → `ans`), explica por que o SLA ainda não é medido e lista o que falta para medir. As falhas do QA aparecem à parte, por módulo (`bugsDoQa`).
- A lista de fontes ganhou "Relatório de SLA da X-VIA (não recebido)". O glossário ganhou o termo SLA.
- No lancar-demandas, o `src/painel.py` parou de chamar bug do QA de "fora do SLA": agora conta as falhas abertas por módulo.

## Rodada 4 (11/11/2026): seção 3 e exportação do cronograma

- **Seção 3 ("O que foi executado no mês?"):** mostra o último mês fechado contra o previsto no TR e o mês corrente como "em andamento". Traz também uma régua mês a mês (a barra é o executado, o traço é o previsto) e um "De onde vem?" agrupado por mês (`execucaoMensal`, `ExecucaoMensal.tsx`).
- **O mês da execução passou a ser a Data da Execução** (`mesDaExecucao`). Antes era a data de fechamento no TFS, que a X-VIA preenche em lote: novembro aparecia com 500 UST, mas o correto é 62. Atinge a seção 3 e a aba UST.
- **Cronograma:** botões "Baixar PNG" e "Baixar SVG" (`lib/exportar-svg.ts`). O arquivo leva as cores já resolvidas, o fundo da página e o título com a data do retrato.
- **Testes:** `src/lib/tfs-execucao.test.ts`.
