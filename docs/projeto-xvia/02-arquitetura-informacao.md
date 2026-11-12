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

**Público:** Gerente de Projeto e Superintendência. **Pergunta:** onde agir para o projeto avançar?

| Área | Pergunta e comportamento | Componente |
|---|---|---|
| Central de ação (abre aqui; ID `prioridades`) | Decisão, motivo observado, ação, responsável no registro, tempo sem atualização e dependências reais; cinco problemas iniciais, busca, consulta completa e CSV. Sínteses de módulos, sprint e execução abaixo. Fila anterior preservada e recolhida | `PrioridadesTab`, `FilaGestao`, `ProblemaGestaoItem`, `AcompanhamentoGerente`, `FilaAnterior` |
| Cronograma (`cronograma`) | Ações de replanejamento, espera e atraso real antes do gráfico. Inversões com nomes e frentes; módulo, Feature e histórias no Gantt existente. PNG/SVG preservados | `CronogramaTab`, `AcoesCronograma`, `DependenciasGerente`, Gantts |
| Módulos (`modulos`) | Situação existente, motivos e próxima ação; distingue PBI/Bug de histórias do cronograma. Nome aplica filtro; ações abrem Central ou cronograma. Distribuição/tabela anteriores consultáveis | `ModulosTab` |
| Sprint e acompanhamento (`fiscalizacao`) | Produção, fila, execução e espera na sprint do retrato, sem forecast. Lista de entregas, histórico, produção e SLA completos sob demanda | `FiscalizacaoTab` |
| Execução e financeiro (`financeiro`) | Consumo em UST/valor calculado e concentração por órgão/serviço. Não confunde esforço com faturamento. Sem registros, mensagem única e cadeia completa consultável; documentos por órgão quando cadastrados | `FinanceiroTab`, `DocumentosOrgao` |

Preparação: `lib/xvia-gestao.ts` e `lib/xvia-gestao-acoes.ts`, sobre os motores existentes de TFS e cronograma.
Não há score de saúde, forecast ou inferência de decisor. Motivo/causa específica ausente continua explícito.
A fila de gestão inclui riscos e falta de sprint e, portanto, não substitui nem deve ser confundida com os
totais da fila anterior por prazo/pendência. Ordenamento e abrangências documentados na auditoria 09.
## Nível 3 — Detalhamento

**Público:** analistas, fiscalização e quem valida os dados. **Pergunta:** de onde vem cada número?

| Dimensão | Aba | O que mostra |
|---|---|---|
| UST e contrato | `UstTab` | UST lançada/executada × contratado, por atividade do catálogo, por mês; tarefas a classificar |
| Registros financeiros | `RegistrosFinanceirosTab` | Cada registro do financeiro.json com a fonte; divergências |
| Entregas | `EntregasTab` | Todas as entregas: frente, módulo, sprint, situação, responsável, prazo, dependência |
| Órgãos e serviços | `StakeholdersTab` | Órgãos, pontos focais e módulos |
| Equipes | `EquipesTab` (+ `AcompanhamentoTab`) | Responsáveis por frente; itens sem frente; quadro do time no TFS |
| Qualidade dos dados | `QualidadeTab` | Lacunas e divergências primeiro; documentos e atualização recolhidos |

Todo número tem "De onde vem?" (`OrigemBotao`). O modal mostra:

- o número no título;
- "Como chegamos neste número", a conta em passos (`Origem.passos`), e a fonte;
- os itens do TFS agrupados por módulo, coluna ou órgão, com subtotal (`Origem.valor`), busca e CSV.

Régua dos tons dos sinais:

- **Entregas:** entregue ÷ prazo, igual ao `ritmo()` do painel do TFS. Fica *no ritmo* com ≥ 0,9 e em *atenção* com ≥ 0,7.
- **Execução:** executado ÷ previsto. Fica *ok* com ≥ 0,8 e em *atenção* com ≥ 0,5.
- **Decisões:** sem nada parado = *ok*. Alguma entrega parada há mais de 30 dias = *crítico*.

## Navegação

`lib/xvia-navegacao.ts` descreve nível, aba e alvo de foco. Nível e aba também ficam na URL (`visao`/`aba`). Secretário → Cronograma/Prioridades/
Financeiro no Gerente ou UST/Registros no Detalhamento. Os quatro filtros são preservados. O parâmetro `grupo` seleciona um critério na Central; `acao` seleciona uma lista no Detalhamento → Entregas. Esses critérios são visíveis e não alteram os indicadores contratuais de outras abas. Limpar os filtros globais preserva a área de trabalho. Os aprofundamentos permitem retorno pelo histórico e aguardam a URL correta antes de transferir o foco.
Módulo do cronograma é o mesmo da URL; não existe seleção local concorrente. Abrir uma Feature
ou uma atividade UST leva foco ao detalhe. Gantt possui rolagem interna e alternativa em lista.
Tabelas extensas têm busca/paginação; ordenar considera a coleção inteira; CSV e impressão
continuam integrais. "De onde vem?" preserva conta, fonte, composição, busca, subtotais e CSV.

Auditorias e resultados: [08 — página e Secretário](08-auditoria-ux-storytelling.md) e [09 — central de gestão do Gerente](09-auditoria-visao-gerente.md).

Apresentação compartilhada: [10 — hierarquia tipográfica](10-auditoria-tipografica.md) e ADR-018. Abas sem prefixos visuais A–F, com IDs preservados; corpo 16px, tabelas 15px e apoio 14px, todos por tokens. Narrativas têm largura limitada e gráficos/tabelas mantêm largura própria.
