# 02 — Arquitetura da informação

A página `/projeto-xvia` tem três níveis de leitura (`ProjetoXviaClient.tsx`). Os filtros (módulo,
frente, órgão, sprint) ficam na URL e valem para todos os níveis. Com filtro ativo, os números são do
recorte e **não** são comparados com o previsto do contrato inteiro (`temRecorte`).

**Regra comum:** execução, entregas e financeiro mostram só a X-VIA (`soXvia`, `ehTarefaXvia`). A SGD
aparece em blocos próprios, rotulados (ADR-017).

## Nível 1 — Visão do Secretário (`RelatorioMensal.tsx`)

**Público:** Secretário Executivo e alta gestão. **Formato:** relatório mensal em 11 seções numeradas;
cada uma é uma pergunta com a resposta em texto, e o detalhe fica um clique adiante.

| # | Seção | Pergunta | Indicador | Fonte |
|---|---|---|---|---|
| 1 | Contrato e período | De que contrato e mês estamos falando? | Mês N de 18, vigência, data do retrato | contrato.json, TFS |
| 2 | Resumo executivo | Como está o contrato? | `PainelSecretario`: veredito em uma frase + 3 sinais (Entregas × prazo, Execução × previsto no TR, Decisões), cada um com tom e palavra, barra, ação e "De onde vem?" (`vereditoExecutivo`) | todos |
| 3 | Executado no mês | O que a X-VIA fez neste mês? | UST e R$ do mês e do anterior | TFS (Tasks X-VIA Done, data de fechamento) |
| 4 | Entregas | O que ficou pronto? | Entregas X-VIA concluídas no mês; X de Y em produção | TFS |
| 5 | Marcos e cronograma | Estamos no prazo das entregas? | Atrasadas, em risco por dependência, previstas na próxima sprint | TFS (sprints, Predecessor/Sucessor) |
| 6 | Indicadores e SLA | Os níveis de serviço estão sendo cumpridos? | "Sem SLA medido" (explícito) | — |
| 7 | Pendências | O que está travado? | Aguardando decisão/impedidas/dependência; atrasadas | TFS |
| 8 | Fiscalização e aceite | O que foi aceito? | UST aceitas, ou "sem registro" | financeiro.json |
| 9 | Execução financeira | Quanto foi consumido, faturado e pago? | Cadeia de 8 etapas, cada uma com situação e fonte | TFS + financeiro.json |
| 10 | Riscos e decisões | O que precisa da minha decisão? | 5 entregas mais paradas, com quem resolve | TFS |
| 11 | Próximos passos | Quem faz o quê? | Atrasadas e pendentes, com o responsável | TFS |

"Em produção" aparece uma vez (seção 4). O que não tem fonte diz isso em uma linha, sem cartão vazio.
Exportar relatório (`ExportarRelatorioButton`) imprime a seção com capa.

## Nível 2 — Visão do Gerente

**Público:** Gerente de Projeto e Superintendência. **Pergunta:** onde agir hoje?

| Aba | Pergunta | Componente |
|---|---|---|
| Prioridades (abre aqui) | O que está parado ou atrasado, por quê, qual a ação e quem resolve? X-VIA e SGD em blocos separados | `PrioridadesTab` |
| Cronograma e dependências | Onde cada módulo está, o que atrasou e o que isso trava? (PBI #1348598) | `CronogramaTab` + `lib/cronograma.ts` |
| Módulos e frentes | Como está cada módulo, X-VIA × SGD? | `ModulosTab` |
| Gasto por órgão e serviço | Quanto cada órgão e serviço consumiu, faturou e recebeu? Drill Órgão → Serviço e Órgão → OS → Medição → NF → Pagamento | `FinanceiroTab` |
| Sprints, entregas e aceite | O que a sprint priorizou e o que fechou no mês? | `FiscalizacaoTab` |

## Nível 3 — Detalhamento

**Público:** analistas, fiscalização e quem valida os dados. **Pergunta:** de onde vem cada número?

| Dimensão | Aba | O que mostra |
|---|---|---|
| A. Execução contratual e UST | `UstTab` | UST lançada/executada × contratado, por atividade do catálogo, por mês; tarefas a classificar |
| B. Execução financeira | `RegistrosFinanceirosTab` | Cada registro do financeiro.json com a fonte; divergências |
| C. Entregas | `EntregasTab` | Todas as entregas: frente, módulo, sprint, situação, responsável, prazo, dependência |
| D. Órgãos e serviços | `StakeholdersTab` | Órgãos, pontos focais e módulos |
| E. Equipes e responsabilidades | `EquipesTab` (+ `AcompanhamentoTab`) | Responsáveis por frente; itens sem frente; quadro do time no TFS |
| F. Qualidade dos dados | `QualidadeTab` | Fontes, data do retrato, lacunas, divergências, Não identificado |

Todo número tem "De onde vem?" (`OrigemBotao`). O modal mostra:

- o número no título;
- "Como chegamos neste número", a conta em passos (`Origem.passos`), e a fonte;
- os itens do TFS agrupados por módulo, coluna ou órgão, com subtotal (`Origem.valor`), busca e CSV.

Régua dos tons dos sinais:

- **Entregas:** entregue ÷ prazo, igual ao `ritmo()` do painel do TFS. Fica *no ritmo* com ≥ 0,9 e em *atenção* com ≥ 0,7.
- **Execução:** executado ÷ previsto. Fica *ok* com ≥ 0,8 e em *atenção* com ≥ 0,5.
- **Decisões:** sem nada parado = *ok*. Alguma entrega parada há mais de 30 dias = *crítico*.

## Navegação

Secretário → links "Ver cronograma", "Ver todas", "Ver por órgão e serviço" levam à aba do Gerente.
Gerente → clique em linha ou barra aplica filtro (URL). Detalhamento → "De onde vem?" chega ao item.
