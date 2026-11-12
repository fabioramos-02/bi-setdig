# 08 — Auditoria de UX e storytelling do Projeto X-VIA

**Data:** 11/11/2026. **Base anterior às alterações:** commit `f504788`, aplicação em
`http://localhost:3000/projeto-xvia`, extração de 11/11/2026 às 18:38 UTC.
Responsável institucional: Secretaria-Executiva de Transformação Digital — SETDIG.

Fontes consultadas: documentos 01–07, ADR-014/017, notas do vault, componentes reais e
`lancar-demandas-xvia` (`CLAUDE.md`, dicionário, mapa do TR, painel, queries e cronograma).
Não houve alteração no TFS, nas fontes, nos datasets ou nas fórmulas durante a auditoria.

## 1. Resumo executivo

O topo já comunica um veredito, mas chega tarde e continua inserido num relatório de 11 capítulos.
Os problemas mais graves incluem dados cortados por CSS, e não apenas excesso de informação.

| ID | Prioridade | Evidência antes da alteração | Efeito / solução definida |
|---|---|---|---|
| A01 | P0 | `GanttFeatures.tsx:69`: SVG CMS de 1280×558 aparece com 1005×438. `styles/ds-sis/styles/main.css:81` aplica `max-width:100%;height:auto`, sem viewBox | Corta sprints e linhas. Preservar dimensões e rolar dentro do gráfico |
| A02 | P0 | `components/dashboard/DataTable.tsx:56`: contêiner `overflow-hidden`; tabela de Entregas tem 1166px e caixa de 1003px | Últimas colunas inacessíveis. Scroll no contêiner interno |
| A03 | P0 | `RelatorioMensal.tsx:48`: filtro `frente=SGD` ou CMS + FERTELEDUCATIVAMS gera “Entregas atrasadas”, “0 de 0” e “nada parado” | Ausência de base vira julgamento. Estado neutro por indicador, sem mudar contas |
| A04 | P0 | `RelatorioMensal.tsx:57–120`: 11 seções; painel inicia em y=514, decisões em y=3228, próximos passos em y=3429 (1366×768) | Decisão exige procurar no relatório. Capa de quatro blocos |
| A05 | P0 | `FinanceiroTab.tsx:57` diz “projeto inteiro” mesmo com filtro; registros financeiros não recebem os mesmos filtros dos itens | Bases diferentes parecem equivalentes. Identificar alcance de cada bloco |
| A06 | P1 | `CronogramaTab.tsx:24`: escolha local de módulo diverge do filtro da URL | Ao entrar no CMS, filtro global continua “Todos”. Unificar controle |
| A07 | P1 | `PrioridadesTab.tsx:46`: 103 linhas X-VIA antes de 33 SGD; `EntregasTab.tsx:31`: 363 linhas, página de cerca de 40.244px | Consulta lenta. Busca/paginação e foco no detalhe; exportação integral |
| A08 | P1 | `DataTable.tsx:63`: th clicável sem botão/aria-sort; `Modal.tsx`: dialog sem nome acessível; `GanttFeatures.tsx:50`: outline none | Mouse obrigatório para operações e foco invisível. Controles semânticos |
| A09 | P1 | `PainelSecretario.tsx:16`: 11px; seletor: 12px; `DashboardSection`: h2 chega a 32px por cascata do DS | Hierarquia irregular. Escala local de 14/16/24/32px em rem e tokens |
| A10 | P1 | Cinza auxiliar/branco: 3,28:1; branco/laranja do Gantt: 3,19:1; “Pronto” azul/fundo escuro: 2:1 | Contraste insuficiente. Texto legível nos dois temas e palavra junto da cor |

Valores observados: **583 UST executadas**, R$ 90.137,63, **87/251 entregas X-VIA em produção**,
12 aguardando decisão, 41 paradas e 64 após a sprint/prazo. São referências de conferência, nunca
números fixos na interface. O contexto anterior com 553 UST e 75/246 pertence a outra extração.

## 2. Jornada atual

`ProjetoXviaClient` monta: título de 88px → três seletores → filtros → conteúdo do nível.
Em 1366×768, os seletores ocupam 74px e os filtros 147px, antes do contrato e do veredito.
`irPara` só encaminha ao Gerente. Os filtros persistem na URL; o nível/aba são estado local.

Percurso realizado: as 11 seções do Secretário; as cinco abas do Gerente; as seis do Detalhamento;
CMS → CMS Cartas e CMS/Portal → entregas; Financeiro → SES → serviço; UST → DOC.07; Equipes →
19 pessoas e quadro do time; modais de entregas, execução, decisões, mês, QA e qualidade;
busca sem resultado; seleção de abas para impressão; filtros por módulo, frente, órgão, sprint e
combinação vazia. O relatório impresso exibe as abas escolhidas e oculta a navegação.

## 3. Problemas por visão

### Secretário — como está o contrato e o que precisa de decisão?

- Contexto contratual é uma seção separada antes da conclusão; cabeçalho repete datas.
- `PainelSecretario` já entrega comparação e origem; preservar esse mérito e compactar as três linhas.
- Execução mensal, SLA e cadeia financeira ocupam grandes blocos permanentes, embora tenham destinos
  analíticos adequados. Decisões e próximos passos só aparecem depois deles.
- Riscos lista cinco pendências gerais; próximos passos lista oito itens. Não distinguem o que exige
  decisão do Secretário do trabalho operacional. A capa mostrará até três em “Aguardando decisão”.
- Explicar UST na primeira aparição; fonte e cálculo continuam no “De onde vem?”.

### Gerente — onde agir para o projeto avançar?

- **Prioridades:** problema e ação existem, mas a fila é extensa e “Dias parada” mede última alteração.
  `AssignedTo` pode ser o dono do registro, não o decisor/executor (regra do CLI, CLAUDE.md:116).
- **Cronograma:** dois controles de módulo; corte real do SVG; cabeçalhos de 10–11px; nomes e situações
  necessários ficam truncados ou apenas em title. Entrada por teclado funciona, mas não há foco visível.
- **Módulos:** 11 colunas competem com a conclusão. A ajuda ainda classifica pela área e ignora o contrato.
  A legenda chama todo item fora de produção de “em andamento”, incluindo quem não começou.
- **Financeiro:** a distinção entre execução e pagamento está correta. O quadro de ausências se repete
  na cadeia e em cada órgão; a instrução para editar um caminho de arquivo não ajuda o gestor.
- **Sprints e aceite:** lista 152 entregas em produção, incluindo SGD, contra 87 no indicador X-VIA.
  Explicitar as frentes e manter as definições. A tabela completa do SLA pode residir aqui.

### Detalhamento — consigo conferir o número?

- **UST:** bom resumo com limitações próximas do dado. Gráfico mensal repete parte da informação de
  `ExecucaoMensal`. A tabela DOC.07 abre 168 tarefas abaixo de 50 atividades, fora do campo de visão.
- **Registros financeiros:** cinco caixas vazias e títulos grandes; reunir o estado vazio e permitir
  consultar os cinco grupos sem esconder que não existem registros.
- **Entregas:** 363 linhas e dez colunas, sem pesquisa/paginação e com corte horizontal.
- **Órgãos:** 12 sem ponto focal. O aviso é útil; o nome completo só no title precisa de acesso visível.
- **Equipes:** uma linha por pessoa e quadro recolhido são boas decisões; manter. Três cartões fixos
  precisam reorganizar em telas estreitas. O quadro não responde aos filtros e tem cadência manual.
- **Qualidade:** verificações acionáveis ficam depois do inventário de fontes. Priorizar lacunas,
  manter fontes consultáveis e deixar evidente que os itens sem frente ficam fora dos totais X-VIA.

## 4. Arquitetura da informação

| Informação | Secretário | Gerente | Detalhamento |
|---|---|---|---|
| Prazo | RESUMO | PRINCIPAL | DETALHE |
| UST | RESUMO | RESUMO | PRINCIPAL |
| Entregas | RESUMO | PRINCIPAL | DETALHE |
| Atrasos | RESUMO | PRINCIPAL | DETALHE |
| Pendências | PRINCIPAL | PRINCIPAL | DETALHE |
| Dependências | RESUMO | PRINCIPAL | DETALHE |
| Financeiro | RESUMO | PRINCIPAL | DETALHE |
| SLA | RESUMO | PRINCIPAL | DETALHE |
| Órgãos | NÃO DEVERIA APARECER | RESUMO | PRINCIPAL |
| Equipes | NÃO DEVERIA APARECER | RESUMO | PRINCIPAL |
| Qualidade do dado | RESUMO | RESUMO | PRINCIPAL |

Destinos: contexto → capa/UST; execução mensal → UST; entregas e SLA → Sprints e aceite;
marcos → Cronograma; pendências → Prioridades; aceite/cadeia → Financeiro; registros → Detalhamento.
O relatório mensal completo permanece exportável, separado da capa executiva.

## 5. Storytelling

Perguntas de entrada: Secretário = situação/decisão/direção; Gerente = problema/ação/acompanhamento;
analista = cálculo/composição/evidência. A capa tem veredito, três sinais, até três decisões e até
três próximos passos. Financeiro sem registro e SLA sem medição aparecem em linguagem simples.
Decisão específica e impacto não descritos no retrato não serão inventados. “Responsável no TFS”
identifica o campo real; não garante quem executa ou aprova.

**Problema de dados/regra — não corrigido nesta revisão de UX:**

- `04-regras-negocio.md` prioriza fechamento, mas `mesDaExecucao` usa Data da Execução; documentos
  mais recentes e o usuário confirmam esta última. Preservar o código.
- `diasSemAtualizar` não mede duração em determinada coluna. Esclarecer rótulo sem inventar histórico.
- Bases do cronograma, entregas e widgets diferem; não forçar igualdade de totais por mudança de regra.
- O financeiro não permite atribuição segura de todo registro aos quatro filtros. Explicitar o escopo,
  preservando os valores e os vínculos por órgão já implementados.
- Feature vazia é radar de planejamento no repositório de demandas, não erro automático.
- Descrições existem no espelho do CLI, mas não no dataset do BI; sem ampliar a publicação nesta revisão.
- Não há registro financeiro nem SLA medido. Ausência não é zero. Bugs do QA não são chamados de suporte.
- O cronograma Python ainda usa estados anteriores; não copiar sua classificação sobre a versão do BI.

## 6. Frontend

Hipóteses confirmadas: abertura dominada por controles; descrições pequenas; veredito baixo; ações
distantes; caixas aninhadas (`StoryCard`/`DashboardSection`/`DataTable`); densidade horizontal no Gantt;
auxiliares pequenos; hierarquia inconsistente. A tabela completa ganha peso maior que a conclusão.
Hipótese de overflow da página: **não confirmado na abertura**; isso não evita cortes internos,
confirmados nos gráficos e tabelas. Preservar dados exige testar alcance da última coluna/linha.

Medições: 1280×720, 1366×768, 1440×900 e 1920×1080, com zoom 100/125/150/200%. O zoom foi emulado
com viewport CSS reduzido e fator de escala correspondente. Em 1366×768/125%, o veredito inicia em
y=643 para uma área de 614px. Em texto ampliado pela raiz para 32px, textos fixos do SVG continuam
em 11px. Em 375px, a tabela UST tem 830px dentro de 284px; a de Entregas tem 1166px.

## 7. Tipografia

| Elemento | Medida anterior | Direção |
|---|---|---|
| Título da página | 40px (DS vence utility) | 28–32px |
| Descrição dos níveis | 12px, cinza de baixo contraste | descrição única de 14–16px |
| Seções | 16,8px no relatório; 32px nas abas | aproximadamente 24px |
| Texto principal | 14–16px | 16px |
| Tabelas e ajuda | cabeçalho 12px; células 14px | pelo menos 14px |
| Gantt | 10–13px | 14–16px com grade proporcional |
| Origem/estado | 11–12px | 14px e contraste adequado |

Escopo local, tokens do DS e rem; preservar CSS vendorizado. Não diminuir fonte para caber.

## 8. Componentes

| Grupo | Classificação / intervenção |
|---|---|
| StoryCard, DashboardSection, Select, Tabs, DataTable, Modal, exportadores | reutilizáveis; correções compatíveis e opções locais |
| PainelSecretario, ExecucaoMensal, SlaSecao, UstResumo | específicos; reutilizar, reorganizar e preservar origem |
| GanttFeatures/Pbis/Comum | específicos e complexos; reparar geometria/scroll/foco sem trocar motor |
| OrigemBotao/OrigemUi | responsabilidade de auditoria bem delimitada; preservar busca, subtotais, CSV e links |
| TabelaCadeia, ValorStatus, LinkItem | consolidações existentes a manter |
| RelatorioMensal, PrioridadesTab, EquipesTab | misturam preparação e apresentação; mover preparação tocada para lib, sem refatoração geral |
| ExecucaoMensal × ranking mensal UstTab | duplicação; usar a leitura mensal com referência no Detalhamento |
| Molduras, cartões e cabeçalhos locais | simplificar agrupamento; evitar criar biblioteca abstrata de widgets |

## 9. Acessibilidade

Preservar foco inicial na busca e retorno ao acionador dos modais. Nomear dialog pelo título; tornar
ordenadores botões e declarar aria-sort; manter semântica de tabela e ação explícita de detalhe.
Foco visível em SVG, controles de pelo menos 44px, siglas explicadas sem depender exclusivamente
de title, lista textual das dependências. Cor sempre acompanhada de palavra.
O teste com busca sem resultados funcionou. Escape pode primeiro limpar um input search: o botão
Fechar continua disponível. Não classificar esse comportamento nativo como falha do modal.

Console: 404 do script externo de analytics `PlausibleAnalytics`, fora do domínio X-VIA; registrar
separadamente, sem confundir com falha dos cálculos. Estados financeiros preenchidos e retrato
envelhecido foram inspecionados no código; não foram simulados em produção para a auditoria.

## 10. Plano de refatoração e acompanhamento

1. **Fase 0 — concluída:** investigação e este documento, antes das alterações visuais.
2. **Fase 1 — P0:** recuperar área do Gantt/tabelas; neutralizar ausência de base; identificar escopos.
3. **Fase 2 — capa:** quatro blocos, destinos contextuais e dois formatos de relatório.
4. **Fase 3 — P1:** pesquisa/paginação, tipografia, foco/teclado/contraste, detalhamento progressivo.
5. **Fase 4 — validação:** lint, testes, build; resoluções/zoom, indicadores, filtros, CSV/PDF/PNG/SVG.

P2: curadoria executiva enriquecida, unificação entre repositórios, expansão dos dados contratuais
e revisões gerais do DS ficam fora desta entrega.

Registro de execução por fase no vault: [[2026-11-11-ux-storytelling-bi-xvia]]. Os resultados finais
serão acrescentados abaixo após validação; o diagnóstico anterior permanece como evidência.

### Resultado da execução

**P0 e P1 A01–A10 implementados e verificados em 11/11/2026.** O diagnóstico acima descreve a base anterior; esta seção registra o resultado.

| Fase | Executado | Evidência de verificação |
|---|---|---|
| 0 — diagnóstico | Navegação completa, leitura de regras/documentação e inventário antes das mudanças | Este documento foi criado antes da alteração visual |
| 1 — P0 | Dimensões próprias do SVG e rolagem interna nas tabelas; ausência de base neutra; escopo financeiro explícito | Gantt CMS inteiro e última coluna alcançável; filtros SGD, Não identificado e vazio sem avaliação de 0/0; helpers originais preservados |
| 2 — capa | `VisaoExecutiva`, `PainelSecretario`, `ExportarProjeto`, filtros recolhidos e navegação tipada em `lib/xvia-navegacao.ts` | Em 1366×768: veredito em y≈280 (antes 514); atenção e passos em y≈576 (antes 3228/3429); links e foco chegam à aba/linha correta |
| 3 — P1 | Busca/paginação opt-in, ordenação acessível, foco e nomes de modais, fontes por tokens/rem; Gantt com lista de dependências; fontes e registros vazios simplificados | Enter ordena e atualiza `aria-sort`; diálogo tem nome acessível e devolve foco; textos completos e dependências podem ser consultados sem depender de `title` |
| 4 — verificação | Lint, 298 testes, build e conferência no navegador | Sem erros/avisos de lint, testes aprovados e build de produção aprovado; `git diff --check` limpo |

Arquivos novos de preparação: `lib/xvia-resumo.ts`, `lib/xvia-prioridades.ts`, `lib/cronograma-lista.ts` e `lib/table-view.ts`.
As fórmulas de `lib/tfs.ts`/`lib/cronograma.ts`, datasets, pipeline e repositório de demandas não foram alterados.

Conteúdo mantido acessível:
- Execução mensal com Data da Execução e comparação com o previsto em **Detalhamento → UST e contrato**.
- Tabela completa de SLA e qualidade do desenvolvimento em **Gerente → Sprints, entregas e aceite**.
- Cadeia financeira e documentos por órgão nas abas existentes; o quadro do time mantém abrangência própria.
- Relatório mensal com onze capítulos em **Exportar → Relatório mensal completo**; PDF de abas selecionadas preservado.
- `OrigemBotao` conserva conta, fonte, composição, busca, subtotais, CSV e links para o TFS.

Validação concreta:
- Todas as cinco abas do Gerente, seis do Detalhamento e a capa percorridas em 375 e 1366px, sem vazamento horizontal.
- Capa, Gantt e tabela de Entregas nas 16 combinações de 1280×720, 1366×768, 1440×900 e 1920×1080 com zoom equivalente de 100/125/150/200%. Zoom emulado por viewport CSS e fator de escala, não pelo menu do navegador.
- Fonte da raiz em 32px: SVG passa a texto de 28px e grade de 1840 para 3680px; rolagem interna preservada. Modal em 375px com fonte ampliada rola verticalmente sem cortar lateralmente.
- Filtros individuais e quatro combinados mantêm URL/chips; controles fechados não ocultam filtros aplicados. Navegar para UST, Prioridades, Cronograma, financeiro e SLA conserva esses parâmetros.
- CSV de Entregas: 363 registros + cabeçalho. Impressão expande de 25 para 363 linhas. Na seleção de Prioridades/CMS, imprime todas as 46 X-VIA e 3 SGD, sem outras abas.
- PDF do resumo: uma página A4 paisagem no caso CMS testado; completo: onze capítulos, cinco páginas nesse caso. Número de páginas varia com filtros, papel e conteúdo.
- PNG gerado; SVG exportado com fontes resolvidas e sem `var(...)` pendente. Dependências CMS/Portal renderizadas e lista textual conferida.
- Nome do modal e botões conferidos pela árvore de acessibilidade; busca vazia, teclado, retorno de foco, tema escuro e leitura da última coluna testados.
- Conferência das rotas Portal Único e MS Digital após alterações compatíveis dos componentes compartilhados, sem erro da aplicação.

Os testes novos protegem os indicadores em seis filtros, ausência de base versus zero real, fila sem duplicação, ligações na alternativa textual e ordenação antes da paginação.

**Limitações mantidas:** não há decisões específicas/impactos publicados para enriquecer as três situações executivas; não inventados. Financeiro sem registros e SLA sem medição continuam explícitos. As inconsistências documentais de regra listadas na seção 5 permanecem registradas separadamente. O 404 externo de analytics é anterior a esta revisão.

Acompanhamento de cada fase e resultados também gravados no vault em `20-projeto/dashboard-analytics-setdig/2026-11-11-ux-storytelling-bi-xvia.md`, ligado às notas principais do projeto.
Nenhum deploy, commit, push ou alteração no TFS foi realizado.

### Ajuste após avaliação do usuário — 11/11/2026

Retiradas as setas decorativas dos links, botões e etapas textuais do cálculo. A ação principal dos
cartões fica separada de "De onde vem?", que passa a peso normal e cor secundária. Decisões e
ações de linha usam "Detalhes"; paginação usa "Anterior"/"Próxima". A preferência foi registrada
no AGENTS.md e na fase 5 da nota de acompanhamento no Obsidian.

Verificado no navegador: capa e onze abas sem setas nas ações; destinos e foco preservados;
modal com etapas numeradas; 375/1366px sem vazamento horizontal. Lint, 298 testes e build aprovados.
