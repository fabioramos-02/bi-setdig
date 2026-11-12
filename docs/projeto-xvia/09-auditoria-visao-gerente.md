# 09 — Auditoria e refatoração da Visão do Gerente

Data: 12/11/2026. Base: commit `bea6a74`, árvore limpa ao iniciar. Aplicação real: `http://localhost:3000/projeto-xvia`.
Dados observados: extração de 11/11/2026; “hoje” nos cálculos é o dia desse retrato, conforme `page.tsx`.

## 1. Objetivo da visão

Permitir que o gerente escolha o que cobrar, decidir, replanejar e acompanhar. A abertura deve mostrar trabalho acionável, motivos observáveis, ligações afetadas e responsável no registro. A capa do Secretário e a auditoria do Detalhamento têm funções distintas e permanecem preservadas.

## 2. Jornada atual

Percorridas as cinco abas reais, filtros individuais e combinados, vazio, CMS e Feature CMS/Portal, PBIs no Gantt, origem dos números, linhas de módulos e órgão/serviço. Lidos documentos 01–08 e ADR-014/017.

| Aba / arquivo | Evidência observada em 1366×768 | Consequência |
|---|---|---|
| `PrioridadesTab.tsx` | 103 X-VIA + 33 SGD; primeira linha em y≈700, SGD começa em y=2426; página 4445px | A tabela ocupa a abertura; causa, impacto e próxima cobrança exigem cruzamento mental |
| `CronogramaTab.tsx` | 31 replanejar, 26 esperando, 2 atrasos reais, 6 ligações invertidas; gráfico em y=698 | Ações existem, mas cada número leva à origem em vez de organizar o trabalho; escopo das inversões não está destacado |
| `ModulosTab.tsx` | CMS: 78 entregas/22 produção/43 após prazo; cronograma CMS: 54 PBIs/22 prontos; tabela com 12 colunas em y=1662 | Volumes e tipos diferentes parecem comparáveis; destaque é maior módulo, não onde intervir |
| `FinanceiroTab.tsx` | 8 etapas com ausências, seguidas de 7 órgãos com 9 colunas; órgão só começa em y=1188 | Ausência financeira ocupa o espaço que deveria explicar concentração do esforço contratado |
| `FiscalizacaoTab.tsx` | Sprint 6: 26 planejadas, 13 em produção, 11 em A fazer/Área de Negócios, 1 em desenvolvimento, 1 decisão; página 7131px | Retrospectiva e SLA competem com a leitura do que falta na sprint |

Gantt e tabelas já possuem rolagem interna, teclado, fontes ampliáveis e modais nomeados: aproveitar essas correções da rodada anterior. Não reconstruir o motor.

## 3. Perguntas que o Gerente precisa responder

1. Qual problema pede ação primeiro e o que devo fazer?
2. Há atraso de desenvolvimento, espera ou trabalho que nem começou?
3. Quais entregas dependem desse item?
4. Quem consta no registro e qual contexto de módulo/órgão?
5. Em quais módulos esses problemas aparecem?
6. O que ainda está aberto na sprint acompanhada?
7. Onde estão concentrados os serviços contratados?
8. Que informação falta para acompanhar aceite e pagamento?

## 4. Dados disponíveis para responder cada pergunta

| Pergunta | Dados existentes | Componente atual | Problema | Solução |
|---|---|---|---|---|
| O que exige ação? | `linhasPrioridades`, coluna, prazo, sprint, última alteração | Prioridades | fila única com “Replanejar ou concluir” genérico | prévia de problemas ordenados, critérios explícitos e fila consultável |
| O que desvia do planejamento? | `montarPorFeature.aFazer`, `situacoes`, `invertidas` | Cronograma | números separados do trabalho | listas de ações antes do gráfico, ligação com nomes e situação |
| O que o problema afeta? | `arestas`, Predecessor/Sucessor entre PBIs | Gantt/coluna de IDs | nomes/efeito não aparecem nas prioridades | exibir sucessores abertos efetivamente ligados; sem inferir impacto fora da relação |
| Qual módulo pede intervenção? | `porModulo`, pior situação existente, contagens do cronograma | Módulos | ordenação por volume, totais diferentes | comparar motivos, ação e produção; explicitar PBI versus PBI+Bug |
| Como está a sprint? | `sprintAtual`, `entregasDaSprint`, coluna/estado | Fiscalização | mistura mês/sprint e histórico extenso | síntese do que permanece na fila/espera, lista sob demanda |
| Onde está o esforço? | `execucaoXvia`, `consumoPorOrgao` | Financeiro | várias colunas ausentes | UST e valor calculado com referência ao total; órgão e serviço como exploração |
| Quanto foi aceito/pago? | `cadeiaFinanceira`, registros independentes | Financeiro/Registros | ausência repetida | uma mensagem de falta de registros; etapas completas consultáveis |

Inventário real: 2028 itens; 335 PBIs e 28 Bugs não removidos; 251 entregas X-VIA, 87 em produção (35%); 583 UST, R$ 90.137,63 calculados. Fila anterior: 103 X-VIA e 33 SGD. Cronograma X-VIA: 31 não iniciados, 26 esperando (12 decisão, 10 impedidos, 4 órgão), 2 atrasados, 3 em risco, 46 sem sprint. Ligações invertidas: 6 pares (3 X-VIA, 3 SGD). Há 79 ligações no conjunto de PBIs. Os cinco grupos financeiros estão vazios.

Não há descrição da decisão, causa histórica, permanência em coluna, decisor, forecast ou marco formal de aceite. Responsável é `AssignedTo`; squad só pode ser exibida quando uma etiqueta existente o informar.

## 5. Problemas de arquitetura da informação

- Cinco abas têm uso legítimo, mas falta uma abertura que conecte a agenda diária ao acompanhamento. Mantê-las como áreas de trabalho com nomes curtos, sem acrescentar um sexto nível.
- A Central de ação passa a reunir triagem, foco por módulo, sprint e execução em sínteses curtas; cronograma, módulos, sprint e financeiro continuam como aprofundamentos.
- Detalhamento continua com registros completos. Fila antiga, histórico mensal, produção e cadeia financeira não serão removidos: ficam consultáveis de forma progressiva.
- Ações de gestão precisam alcançar Entregas/UST/Qualidade já com os quatro filtros preservados e, quando pertinente, uma seleção explícita de ação.

## 6. Problemas de storytelling

- “103 pedem ação” não distingue desenvolvimento atrasado de planejamento vencido. Os dois conceitos continuam calculados separadamente.
- “Nenhuma entrega da X-VIA está parada” em filtro SGD/vazio dá sensação indevida de normalidade: mostrar ausência de base.
- CMS 78 na aba Módulos e 54 no cronograma não é regressão: primeiro inclui Bugs, segundo só PBIs.
- Maior consumo não é problema; usar proporção sobre a execução real, sem sinal vermelho por volume.
- Explicar o motivo registrado e recomendar uma ação compatível; não fabricar a decisão pendente ou a causa do atraso.

## 7. Problemas de frontend

Abertura de Prioridades privilegia tabela e ajuda extensa. Módulos repete lista, gráfico e tabela com contexto distribuído. Financeiro repete “Não informado”. Fiscalização põe compromissos de suporte e histórico antes do acompanhamento. A escala local 14/16/24/32px, tokens, foco e rolagem corrigidos na rodada anterior serão mantidos.

## 8. Problemas de componentes

| Componente | Classificação / intervenção |
|---|---|
| `Tabs`, `DataTable`, `Modal`, exportadores, `OrigemBotao` | reutilizáveis; preservar acessibilidade, busca, impressão e rastreabilidade |
| `PrioridadesTab` | específico; substituir abertura por triagem de problemas e manter fila anterior consultável |
| `CronogramaTab` | específico/complexo; separar preparação de ações da geometria existente |
| `GanttFeatures`, `GanttPbis`, `GanttComum` | específicos/complexos; preservar motor, escala, exportação e lista textual |
| `ModulosTab` | regra de apresentação misturada ao JSX; preparar leitura/ordenamento em lib |
| `FiscalizacaoTab` | mistura acompanhamento e histórico; síntese da sprint antes das listas |
| `FinanceiroTab` | mistura síntese e documento; reduzir ausências e dar foco ao consumo |
| novas peças | problema de gestão, resumo de ações, contexto e sínteses; apenas responsabilidades concretas, sem biblioteca genérica |

## 9. Problemas de acessibilidade

Manter controles nativos, foco no destino e nomes acessíveis. Toda situação terá palavra e motivo. As novas listas precisam manter busca, acesso a todos os registros e retorno ao item selecionado. Não depender de hover/title para impacto e responsável. Reavaliar impressão das listas e abertura de detalhes antes de focar. Sem setas decorativas nas ações, conforme avaliação do Fabio.

## 10. Proposta de nova arquitetura

Cinco áreas: **Central de ação**, **Cronograma**, **Módulos**, **Sprint e acompanhamento**, **Execução e financeiro**. IDs de abas existentes preservados para compatibilidade.

A Central apresenta grupos observáveis e cinco problemas, com consulta à lista completa. Decisões e impedimentos precedem atraso de desenvolvimento, inversão, espera do órgão, risco, replanejamento e falta de sprint. Desempate por última alteração e ID estável. É ordenação de apresentação, não pontuação de saúde. A fila antiga continua com seus totais e CSV.

Grupos podem compartilhar entregas: não somar contagens como se fossem um total único. Inversões medem pares, não itens. Frentes sempre identificadas e consultáveis separadamente. Na ausência de base, não mostrar avaliação positiva.

Módulos usam a pior situação já calculada, com motivo e ação observáveis; não criar score. Mostrar quantidade em produção PBI+Bug e referência distinta dos PBIs do cronograma. Dependências somente entre PBIs presentes nos filtros, com ressalva para ligações externas.

Sprint usa a sprint marcada no retrato; “A fazer/Área de Negócios” na sprint corrente significa “ainda na fila”, não o estado formal “não iniciado” de sprint vencida. Sem previsão de conclusão.

Financeiro separa execução técnica de documento financeiro. Sem registro: mensagem única e acesso à composição; com registros: cadeia existente disponível, sem deduzir uma etapa da outra.

## 11. Wireframe textual

```text
GERENTE DE PROJETO — contexto dos filtros e data dos dados
Central de ação | Cronograma | Módulos | Sprint e acompanhamento | Execução e financeiro

PRECISA DE AÇÃO
Conclusão sobre os problemas observáveis e o primeiro encaminhamento
Grupos: decisões / impedimentos / atraso real / órgão / replanejar / risco / sem sprint
Frente da fila: X-VIA ou SGD

Cinco problemas iniciais; cada registro:
  Situação e tempo sem atualização
  Título legível
  Motivo registrado + ação necessária
  Responsável no registro, módulo, órgão e sprint
  Entregas abertas que dependem deste item, quando cadastradas
  Abrir registro / consultar entregas relacionadas
Buscar e consultar todas as prioridades; consultar a fila anterior e seu CSV

ACOMPANHAR
  Módulos com motivos de intervenção e ação
  Sprint do retrato: o que ainda está na fila, em execução ou esperando
  Execução contratual: trabalho consumido e o que falta para medir pagamento

APROFUNDAMENTOS
Cronograma: ações, dependências com nomes, Gantt macro e detalhe da Feature
Módulos: comparação de situação, referência de produção e próxima ação
Sprint: leitura atual, entregas sob demanda, histórico e suporte recolhidos
Execução: concentração por órgão/serviço, etapas financeiras consultáveis
```

## 12. Componentes que serão alterados

`ProjetoXviaClient`, `PrioridadesTab`, `CronogramaTab`, `ModulosTab`, `FiscalizacaoTab`, `FinanceiroTab`, `EntregasTab`, navegação e CSS local. Preparação em bibliotecas específicas de gestão; reaproveitar `OrigemBotao`, Gantts e tabelas existentes. Novas seleções de ação terão contexto visível e não alterarão os indicadores contratuais.

## 13. Riscos

**Problema de dado/regra identificado — não corrigido silenciosamente pela refatoração de UX.**

- `diasSemAtualizar` não informa permanência em coluna: não exibir “aguardando decisão há N dias”.
- O retrato é de 11/11; não atualizar a sprint ou os atrasos usando o relógio de 12/11.
- `04-regras-negocio.md` e partes de 03/07 ainda descrevem fechamento/Start Date de forma antiga; o código atual usa Data da Execução e respeita Start Date. Preservar e apontar a divergência.
- `atrasadas` inclui PBI/Bug por prazo/sprint; `situacoes` é de PBI e tem outro propósito. Nunca renomear um como o outro.
- O cronograma macro inclui duas situações atrasadas antigas SGD que o detalhe pode tratar como legado. Não equalizar os dois motores.
- Inversões incluem as duas frentes; produção não é necessariamente o mesmo que estado Done.
- Financeiro tem abrangência do contrato, diferente dos itens filtrados. Nota compartilhada entre órgãos ainda não permite rateio seguro.
- Sem descrição e histórico não há suporte para causa específica, accountability, impacto contratual ou forecast.
- Atualização manual na rede do Governo; nenhuma API em runtime nem alteração no TFS será adicionada.

## 14. Plano de implementação

| Prioridade | Mudança | Fase | Critério |
|---|---|---|---|
| P0 | Explicar bases, neutralizar vazio, distinguir espera/replanejamento/atraso e frentes das inversões | 1 | valores originais comparados em testes |
| P0 | Central de ação com motivo, responsável real e impacto por ligações | 2 | primeira leitura aciona trabalho, sem inferência não registrada |
| P1 | Módulos ordenados por situação explicável e cronograma orientado a ações | 3 | padrão/detalhe claros sem trocar regras |
| P1 | Sprint antes da retrospectiva e consumo antes das ausências financeiras | 3 | andamento observável, documentos acessíveis |
| P1 | Navegação entre níveis e seleções preservadas, teclado/zoom/impressão | 4 | contexto explícito e retorno rastreável |
| P2 | Descrições da decisão, histórico em coluna, forecast, marcos formais | futuro/dados | dependem de fonte e regra, não serão inventados |

Fases: 0 auditoria (este documento antes do código); 1 preparação/testes; 2 Central e navegação; 3 aprofundamentos; 4 validação final e documentação. Após cada grupo: lint, testes, build e navegador.

Cobertura final: cinco abas do Gerente, ligações ao Detalhamento, filtros individuais/combinados/vazio, origem, Feature/PBI, impressão/CSV/imagens, teclado, temas; 375px e quatro resoluções × zoom equivalente 100/125/150/200%.

## Execução e evidências

As fases 0–4 foram concluídas em 12/11/2026. Auditoria e wireframe foram gravados antes das alterações no frontend. Registro de andamento e resultados no vault: [[2026-11-12-central-gestao-bi-xvia]].

| Fase | Resultado executado |
|---|---|
| 0 — diagnóstico | Navegação nas cinco abas, inspeção dos filtros e componentes, inventário de dados, matrizes e wireframe deste documento |
| 1 — preparação | `lib/xvia-gestao.ts` e `lib/xvia-gestao-acoes.ts` reaproveitam os cálculos existentes; testes comparam os resultados em oito combinações de filtros |
| 2 — Central e navegação | Cinco problemas iniciais, grupos observáveis, frente explícita, busca, consulta paginada, CSV integral e fila anterior preservada. Nível, aba, quatro filtros e critério de ação ficam na URL |
| 3 — acompanhamento | Ações antes do Gantt; módulos com situação explicável; sprint antes do histórico; consumo antes da ausência financeira; documentos e tabelas anteriores consultáveis |
| 4 — validação | Lint, 309 testes e build aprovados; navegador, filtros, teclado, impressão, exportações, temas, resoluções, zoom e fonte ampliada conferidos; arquitetura, histórico e Obsidian atualizados |

### Antes × depois: indicadores e alcance

Valores sem filtro, com a mesma extração de 11/11/2026:

| Indicador existente | Antes | Depois |
|---|---:|---:|
| Entregas X-VIA (PBI + Bug) | 251 | 251 |
| Em produção X-VIA | 87 (35%) | 87 (35%) |
| UST executadas X-VIA | 583 | 583 |
| Valor consumido calculado | R$ 90.137,63 | R$ 90.137,63 |
| Fila anterior X-VIA / SGD | 103 / 33 | 103 / 33 |
| Itens X-VIA após prazo/sprint, pela função `atrasadas` | 64 | 64 |
| Cronograma X-VIA: não iniciados / esperando / atrasados / em risco | 31 / 26 / 2 / 3 | 31 / 26 / 2 / 3 |
| PBIs X-VIA sem sprint | 46 | 46 |
| Dependências invertidas, pares X-VIA / SGD | 3 / 3 | 3 / 3 |
| CMS: entregas PBI + Bug / produção | 78 / 22 | 78 / 22 |
| CMS no cronograma: PBIs / Done | 54 / 22 | 54 / 22 |
| Sprint 6: planejadas / produção / ainda na fila / desenvolvimento / espera | 26 / 13 / 11 / 1 / 1 | 26 / 13 / 11 / 1 / 1 |
| Grupos financeiros com registros | 0 de 5 | 0 de 5 |

A **nova fila de gestão**, união de problemas abertos, possui **146 X-VIA e 42 SGD**. Ela inclui risco e falta de sprint, tem contagens de grupos que podem se sobrepor e não substitui o indicador da fila anterior. A comparação dessa nova população com 103/33 não representa crescimento de pendências. A fila usa a ordem de categorias declarada em `ACAO_GESTAO`, depois a alteração mais antiga e o ID; o critério está disponível na própria tela. “Tempo sem atualização” não foi transformado em permanência na coluna.

`CronogramaTab` conserva o Gantt macro e o aprofundamento da Feature. A legenda informa que o conjunto inclui as duas frentes e que a frente da Feature/módulo não determina a de cada história vinculada. Os pares invertidos mostram nomes, responsáveis do registro e situações; casos concluídos não são apresentados como bloqueio atual. A linha temporal passou de “HOJE” para “Dados de 11/11”, mantendo a mesma coordenada e data de cálculo.

### Componentes e navegação entregues

- `FilaGestao`, `ProblemaGestaoItem` e `FilaAnterior` separam problema acionável da consulta anterior; `AcompanhamentoGerente` conecta a triagem a módulos, sprint e execução.
- `AcoesCronograma` e `DependenciasGerente` tornam os encaminhamentos e os vínculos legíveis antes do gráfico; nenhuma geometria ou classificação do motor foi substituída.
- `ModulosTab`, `FiscalizacaoTab` e `FinanceiroTab` usam preparação em biblioteca. `DocumentosOrgao` mantém OS, medição, NF e pagamentos consultáveis quando registrados.
- `ProjetoXviaClient` aplica a seleção específica de entregas a partir do critério na URL. Os indicadores contratuais continuam usando os quatro filtros globais, sem receber esse critério adicional. A troca de aba preserva foco de teclado; um aprofundamento move o foco somente quando o endereço completo corresponde ao destino solicitado e abre os detalhes ancestrais necessários.
- `gestao.module.css` usa tokens e unidades relativas; tabelas mantêm rolagem interna, e palavras longas não alargam a página em fonte ampliada. Não foram adicionadas setas decorativas às ações. “De onde vem?” permanece separado e visualmente secundário.

### Verificação no navegador e exportações

- Cinco áreas conferidas em 1280×720, 1366×768, 1440×900 e 1920×1080, com área útil equivalente a zoom de 100/125/150/200%: **80 passagens, sem excesso de largura da página**. Teste adicional em 375px com fonte raiz a 200% passou nas cinco abas; tabelas e Gantt conservam rolagem própria. Tema escuro também conferido.
- Filtros de módulo, frente, órgão e sprint testados individualmente, combinados, vazios e com frente não identificada. Limpar filtros mantém a área atual. CMS aplica chip e abre Feature CMS/Portal; SES abre os serviços do órgão com foco no título.
- A ação de replanejamento abre **31 entregas** no Detalhamento com critério visível; recarregar o endereço conserva as 31. Retorno do navegador, grupo da fila, destino vindo do Secretário e abertura do SLA recolhido foram conferidos.
- Teclado: navegação entre abas sem perder o foco; Enter na ordenação da tabela; modais de origem nomeados e busca focalizada; destino de aprofundamento focalizado. Rótulos acompanham as cores das situações.
- CSV da nova fila sem filtro: **147 linhas, incluindo cabeçalho**, mesmo com dez registros visíveis. Impressão expande os **146 registros** e inclui referências de item/frente; a listagem de produção também passa de 25 visíveis para os **152 registros** na impressão.
- Exportação do caso CMS: resumo executivo com **uma página A4 paisagem**, relatório completo com **cinco páginas e onze capítulos**, Gerente com **17 páginas e os 51 registros da fila CMS**. O documento do Gerente contém a área selecionada; os aprofundamentos recolhidos continuam opcionais. PNG e SVG do cronograma gerados, com cores resolvidas, última coluna e marcador de data legíveis.
- Lint sem avisos, **309 testes aprovados** e build de produção aprovado. Casos financeiros preenchidos/parciais foram validados com fixtures de teste; o JSON publicado continua vazio. Reaberturas dos fluxos verificados não registraram exceções JavaScript. Portal Único e MS Digital passaram por conferência de navegação e largura.

Evidências locais de navegador: `C:/Users/framos/AppData/Local/Temp/codex-bi-xvia-gerente-20261112/`, com capturas antes/depois, `matriz-final.json`, três PDFs e imagem exportada do cronograma. São artefatos temporários de verificação, não dados publicados.

### Limites e preservação

`lib/tfs.ts`, `lib/cronograma.ts`, datasets, pipeline e repositório irmão não foram alterados. Não houve atualização do retrato nem escrita no TFS. Ausências financeiras e SLA sem medição permanecem explícitos. Causas específicas, decisor, histórico de coluna, forecast e marcos formais continuam dependentes de dados. As divergências documentais e de população registradas na seção 13 não foram corrigidas silenciosamente. Trabalho concluído localmente, sem commit, push ou deploy.
