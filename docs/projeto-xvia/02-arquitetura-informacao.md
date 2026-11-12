# 02 — Arquitetura da informação

A página `/projeto-xvia` tem três níveis de leitura (`ProjetoXviaClient.tsx`). Os filtros (módulo,
frente, órgão, sprint) ficam na URL e acompanham os itens nos três níveis. Registros financeiros e
widgets do quadro do time têm abrangência própria, explicitada na interface. Com filtro ativo, os números são do
recorte e **não** são comparados com o previsto do contrato inteiro (`temRecorte`).

**Regra comum:** os indicadores da contratada contam só a X-VIA (`soXvia`, `ehTarefaXvia`).
Abas de gestão e investigação também podem reunir frentes, sempre identificadas. A SGD aparece
separada nos indicadores e nas filas de prioridades (ADR-017).

## Nível 1 — Visão do Secretário (`VisaoExecutiva.tsx`)

**Público:** Secretário Executivo e alta gestão. **Formato:** capa executiva em quatro blocos.

| Bloco | Pergunta | Conteúdo e destino |
|---|---|---|
| Contexto e veredito | Como está o contrato? | Contrato, mês, data dos dados e conclusão antes dos números |
| Três sinais | Por que essa avaliação? | Entregas × prazo, execução × previsto e decisões/bloqueios, com origem e ação |
| Precisa da sua atenção | O que exige decisão? | Até três entregas em Aguardando decisão; Ver leva ao item em Gerente → Prioridades |
| Próximos passos | O que precisa acontecer agora? | Até três ações com acesso ao nível pertinente; pagamento e SLA sem registro são explícitos |

`lib/xvia-resumo.ts` prepara a apresentação reutilizando os cálculos existentes. Filtro sem entregas
ou tarefas X-VIA recebe estado neutro por indicador. Não se deduz impacto, decisão específica ou
executor a partir do título/AssignedTo. Na largura de desktop, os dois últimos blocos dividem a
linha; no mobile empilham. Os filtros começam recolhidos e os chips ativos permanecem visíveis.

### Relatório mensal completo (`RelatorioMensal.tsx`)

As 11 seções permanecem disponíveis em **Exportar → Relatório mensal completo**. A outra opção é
**Resumo executivo**. Nas visões Gerente/Detalhamento, a seleção de abas para PDF continua disponível.

| # | Seção | Pergunta | Indicador | Fonte |
|---|---|---|---|---|
| 1 | Contrato e período | De que contrato e mês estamos falando? | Mês N de 18, vigência, data do retrato | contrato.json, TFS |
| 2 | Resumo executivo | Como está o contrato? | `PainelSecretario`: veredito em uma frase + 3 sinais (Entregas × prazo, Execução × previsto no TR, Decisões), cada um com tom e palavra, comparação, ação e "De onde vem?" (`vereditoExecutivo`) | todos |
| 3 | Executado no mês | O que a X-VIA fez neste mês? | UST e R$ do mês e do anterior | TFS (Tasks X-VIA Done, Data da Execução; fechamento somente na ausência dela) |
| 4 | Entregas | O que ficou pronto? | Entregas X-VIA concluídas no mês; X de Y em produção | TFS |
| 5 | Marcos e cronograma | Estamos no prazo das entregas? | Atrasadas, em risco por dependência, previstas na próxima sprint | TFS (sprints, Predecessor/Sucessor) |
| 6 | Indicadores e SLA | Os níveis de serviço estão sendo cumpridos? | "Sem SLA medido" (explícito) | — |
| 7 | Pendências | O que está travado? | Aguardando decisão/impedidas/dependência; atrasadas | TFS |
| 8 | Fiscalização e aceite | O que foi aceito? | UST aceitas, ou "sem registro" | financeiro.json |
| 9 | Execução financeira | Quanto foi consumido, faturado e pago? | Cadeia de 8 etapas, cada uma com situação e fonte | TFS + financeiro.json |
| 10 | Riscos e decisões | O que precisa da minha decisão? | 5 entregas mais paradas, com quem resolve | TFS |
| 11 | Próximos passos | Quem faz o quê? | Atrasadas e pendentes, com o responsável | TFS |

O relatório completo preserva os onze capítulos; eles não ocupam mais a abertura executiva.
`ExportarProjeto` distingue resumo e completo; `ExportarRelatorioButton` mantém a seleção de abas.
A execução mensal também está em UST; a tabela integral de SLA está em Sprints, entregas e aceite.

## Nível 2 — Visão do Gerente

**Público:** Gerente de Projeto e Superintendência. **Pergunta:** onde agir hoje?

| Aba | Pergunta | Componente |
|---|---|---|
| Prioridades (abre aqui) | O que está parado ou atrasado, por quê, qual a ação e quem resolve? X-VIA e SGD em blocos separados | `PrioridadesTab` |
| Cronograma e dependências | Onde cada módulo está, o que atrasou e o que isso trava? (PBI #1348598). **Uma linha por Feature** (visão geral: uma por módulo): barra da primeira à última sprint das entregas, com a parte pronta pintada e a pior situação. No topo, "O que fazer" (replanejar, esperando, atrasos reais, dependências ao contrário). Clique na Feature para abrir as entregas. PNG/SVG | `CronogramaTab`, `GanttFeatures`, `GanttPbis` + `lib/cronograma.ts` (`montarPorFeature`) |
| Módulos e frentes | Como está cada módulo, X-VIA × SGD? | `ModulosTab` |
| Gasto por órgão e serviço | Quanto cada órgão e serviço consumiu, faturou e recebeu? Drill Órgão → Serviço e Órgão → OS → Medição → NF → Pagamento | `FinanceiroTab` |
| Sprints, entregas e aceite | O que a sprint priorizou, o que fechou no mês e o que falta para medir os prazos de atendimento? | `FiscalizacaoTab` |

## Nível 3 — Detalhamento

**Público:** analistas, fiscalização e quem valida os dados. **Pergunta:** de onde vem cada número?

| Dimensão | Aba | O que mostra |
|---|---|---|
| A. Execução contratual e UST | `UstTab` | UST lançada/executada × contratado, por atividade do catálogo, por mês; tarefas a classificar |
| B. Execução financeira | `RegistrosFinanceirosTab` | Cada registro do financeiro.json com a fonte; divergências |
| C. Entregas | `EntregasTab` | Todas as entregas: frente, módulo, sprint, situação, responsável, prazo, dependência |
| D. Órgãos e serviços | `StakeholdersTab` | Órgãos, pontos focais e módulos |
| E. Equipes e responsabilidades | `EquipesTab` (+ `AcompanhamentoTab`) | Responsáveis por frente; itens sem frente; quadro do time no TFS |
| F. Qualidade dos dados | `QualidadeTab` | Lacunas e divergências primeiro; documentos e atualização recolhidos |

Todo número tem "De onde vem?" (`OrigemBotao`). O modal mostra:

- o número no título;
- "Como chegamos neste número", a conta em passos (`Origem.passos`), e a fonte;
- os itens do TFS agrupados por módulo, coluna ou órgão, com subtotal (`Origem.valor`), busca e CSV.

Régua dos tons dos sinais:

- **Entregas:** entregue ÷ prazo, igual ao `ritmo()` do painel do TFS. Fica *no ritmo* com ≥ 0,9 e em *atenção* com ≥ 0,7.
- **Execução:** executado ÷ previsto. Fica *ok* com ≥ 0,8 e em *atenção* com ≥ 0,5.
- **Decisões:** sem nada parado = *ok*. Alguma entrega parada há mais de 30 dias = *crítico*.

## Navegação

`lib/xvia-navegacao.ts` descreve nível, aba e alvo de foco. Secretário → Cronograma/Prioridades/
Financeiro no Gerente ou UST/Registros no Detalhamento. Os quatro filtros são preservados.
Módulo do cronograma é o mesmo da URL; não existe seleção local concorrente. Abrir uma Feature
ou uma atividade UST leva foco ao detalhe. Gantt possui rolagem interna e alternativa em lista.
Tabelas extensas têm busca/paginação; ordenar considera a coleção inteira; CSV e impressão
continuam integrais. "De onde vem?" preserva conta, fonte, composição, busca, subtotais e CSV.

Auditoria e resultados da revisão: [08-auditoria-ux-storytelling.md](08-auditoria-ux-storytelling.md).
