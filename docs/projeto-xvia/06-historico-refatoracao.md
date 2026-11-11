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
