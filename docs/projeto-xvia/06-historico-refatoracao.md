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

## Rodada 5 (11/11/2026): cronograma por Feature

- O Fabio achou o cronograma de PBIs confuso e parcialmente errado: 19 PBIs apareciam como "atrasado", mas só 1 era atraso real. A situação agora vem com o motivo:
  - **Não iniciado:** sprint vencida, PBI em A fazer ou Área de Negócios.
  - **Esperando órgão/decisão:** PBI em Aguardando Validação do Órgão, Aguardando decisão ou Impedido.
  - **Atrasado:** PBI em desenvolvimento com a sprint vencida.
- `invertidas()` acusa as dependências planejadas ao contrário (vermelho tracejado).
- O cronograma abre por **Feature** (`montarPorFeature`): progresso prontos/total, a pior situação, as ligações entre Features, "O que fazer" e os ajustes a fazer no TFS (Feature concluída com PBI aberto, Feature sem PBI, Features sem data). Clicar abre os PBIs (`montarCronograma(..., featureId)`). As setas viraram degrau.
- O relatório do Secretário, seção 5, ganhou "X de Y Features prontas".

## Rodada 6 (11/11/2026): topo do Detalhamento A (UST)

- Os 4 cartões e o parágrafo deram lugar ao `UstResumo.tsx`, que mostra três coisas:
  - a frase com o concluído primeiro (553 UST, 2,4%), seguida das UST em tarefas abertas;
  - uma barra do contrato inteiro: concluído, em tarefas abertas e ainda sem tarefa;
  - os "Pontos de atenção no dado", cada um com a sua lista. São eles: atividades acima do previsto no ETP (DOC.07: 495 para 36 previstas), tarefas sem atividade marcada (198), atividades fora do ETP (72), tarefas fora da soma (162) e valor provisório.
- O "Como ler" ficou recolhido, em quatro tópicos.

## Rodada 7 (11/11/2026): fonte maior e aba Equipes

- **Cronograma:** com fonte maior no navegador (tamanho mínimo de fonte ou zoom de texto), os rótulos se sobrepunham. O `useEscalaTexto` (`GanttComum.tsx`) mede o aumento real do texto, e a grade dos dois Gantts cresce na mesma proporção; o gráfico rola dentro da caixa. Com aumento acima de 1,2, a data sai do cabeçalho e vai para o tooltip.
- **Equipes:** uma linha por pessoa, com abertos X-VIA, abertos SGD e abertos sem frente. Antes era uma linha por pessoa e por frente, e a mesma pessoa aparecia até 3 vezes. A tabela mostra os 10 primeiros e tem "Ver todos"; o número é clicável. O quadro do TFS ficou recolhido. O `OrigemBotao` ganhou a prop `rotulo`.

## Rodada 8 (11/11/2026): Start Date no cronograma

- Quando o PBI tem Start Date, a barra começa na sprint dessa data (`sprintDeInicio`), e a Feature acompanha. Um PBI em Em Desenvolvimento ou Em Homologação numa sprint futura aparece como **Em andamento**. O caso que motivou: #1337728, ajustado no TFS para Sprint 7, Em Desenvolvimento, Start Date 17/08 e Target Date 26/11.
- `publish/writer.py`: quando um dataset em lista passa de 2 MB no formato indentado, grava um registro por linha. O `tfs/itens` passou de 2.000 itens.

## Rodada 9 (11/11/2026): auditoria de UX e capa executiva

- Diagnóstico produzido antes das alterações: `08-auditoria-ux-storytelling.md`, com evidências por tela, componente e arquivo; matriz entre níveis e prioridades A01–A10.
- Secretário passa ao formato de capa em quatro blocos: veredito/contexto, três sinais, até três decisões e três próximos passos. Gerente e Detalhamento recebem o conteúdo analítico; relatório mensal de onze capítulos continua exportável.
- Corrigidos cortes do SVG pelo CSS do DS e das últimas colunas das tabelas; indicadores sem base X-VIA ficam neutros. Alcance dos registros financeiros e dos totais de sprints está explícito.
- Navegação contextual preserva filtros e conduz o foco à aba/linha. Módulo do cronograma usa o filtro da URL. Filtros recolhidos mantêm chips ativos visíveis.
- Tabelas extensas ganham pesquisa/paginação opt-in, ordenação por teclado e impressão integral. Modais são nomeados; texto/grade do Gantt crescem juntos, com alternativa em lista e fontes resolvidas no SVG exportado.
- Preparação isolada em `lib/xvia-resumo.ts`, `lib/xvia-prioridades.ts`, `lib/cronograma-lista.ts` e `lib/table-view.ts`. Sem alteração em `lib/tfs.ts`, `lib/cronograma.ts`, datasets, pipeline ou repositório irmão.
- Verificação: lint sem avisos, 298 testes e build aprovados; três níveis/11 abas em 375/1366px; 16 combinações de resolução/zoom, fonte ampliada, teclado, tema escuro, filtros e exportações conferidos. Resumo PDF em uma página A4 paisagem no caso CMS testado.
- Andamento e resultados de cada fase registrados no vault `conhecimento-obsidian`, nota `2026-11-11-ux-storytelling-bi-xvia.md`. `AGENTS.md` passa a preservar essa orientação nas próximas fases.
- Continuam pendentes de dados: detalhamento da decisão/impacto, registros financeiros, medição de SLA e conciliação documental das regras já apontada na auditoria. Nenhuma informação foi simulada.

## Rodada 10 (12/11/2026): central de gestão do Gerente

- Auditoria e wireframe produzidos antes do frontend em `09-auditoria-visao-gerente.md`, com jornada real, componentes, matriz pergunta/dado/componente, prioridades e riscos.
- Cinco áreas: Central de ação, Cronograma, Módulos, Sprint e acompanhamento, Execução e financeiro. A abertura mostra cinco problemas com motivo observado, ação, responsável do registro, tempo sem atualização e vínculos reais. Grupos, busca, paginação, CSV e impressão integral disponíveis.
- A nova união de problemas abertos soma 146 X-VIA/42 SGD e inclui risco e falta de sprint. A fila anterior 103/33 permanece consultável e exportável. Categoria, última alteração e ID ordenam a apresentação, sem score; contagens dos grupos podem se sobrepor.
- Cronograma começa pelos encaminhamentos; ligações invertidas mostram nomes/frentes/responsáveis e distinguem concluídos. Gantt macro e Feature/PBI mantidos; “Dados de 11/11” identifica a data efetiva da linha temporal.
- Módulos explicam situação e próxima ação, separando PBI+Bug dos PBIs do cronograma. Sprint 6 começa pelo observável: 13/26 em produção, 11 na fila, 1 em desenvolvimento e 1 esperando. Histórico e SLA continuam consultáveis.
- Execução mostra 583 UST/R$ 90.137,63 calculados e participação dos órgãos; ausência financeira é comunicada em uma mensagem, mantendo etapas e documentos disponíveis. Valor calculado não é apresentado como faturado ou pago.
- Nível, aba, quatro filtros e critérios de ação permanecem na URL. Aprofundamentos abrem o detalhe e conduzem foco; trocar aba por teclado preserva foco no seletor. Critério específico do Detalhamento não altera indicadores contratuais.
- Preparação em `lib/xvia-gestao.ts` e `lib/xvia-gestao-acoes.ts`; navegação em `lib/xvia-navegacao.ts`. Sem alteração em `lib/tfs.ts`, `lib/cronograma.ts`, datasets, pipeline ou repositório irmão.
- Validação: lint, 309 testes e build aprovados. Cinco abas × quatro resoluções × quatro níveis equivalentes de zoom (80 passagens), 375px com fonte 200%, tema escuro, filtros, vazio, teclado, origem, retorno, CSV, PNG/SVG e três formatos de PDF conferidos. Comparação antes/depois dos indicadores consta na auditoria.
- Fases e resultados registrados no vault `conhecimento-obsidian`, nota `2026-11-12-central-gestao-bi-xvia.md`. Mantidas as lacunas de financeiro, SLA, descrição da decisão e histórico, sem forecast ou responsabilização inventada. Concluído localmente, sem commit, push ou deploy.
