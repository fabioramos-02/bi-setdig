# 10 — Auditoria e revisão tipográfica

Data: 12/11/2026. Solicitação: hierarquia confortável para leitura prolongada, com escala semântica compartilhada. Continuidade da Central do Gerente e da capa do Secretário. Dados de 11/11/2026 mantidos.

## Diagnóstico antes do código

Percorridos os três níveis e as doze áreas em `localhost:3000/projeto-xvia`, em 1366×768. Capturas e medidas em `C:/Users/framos/AppData/Local/Temp/codex-bi-xvia-tipografia-20261112/`.

| Tela/componente real | Evidência medida ou inspecionada | Ajuste |
|---|---|---|
| `UstResumo.tsx` | Conclusão de 20,8px reúne UST, reais, percentual e base na mesma frase; nomes truncados entre parênteses nos alertas | Conclusão em linha própria, referência separada, apoio 16px; atividades em linhas, nomes completos consultáveis |
| UST, incluindo `UstTab`/`DataTable` | 453 trechos visíveis de 14px e só nove de 16px no painel; alertas sem headings | Tabelas 15px, corpo 16px, títulos distintos, apoio 14px |
| `ExecucaoMensal.tsx` | Vários negritos na frase; mês 14px e número do mês com classe 11px elevada pelo CSS local a 14px; valores sem unidade explícita por linha | Uma conclusão de 20px, evidência de 16px, mês 16px, apoio 14px, valores com UST |
| `Tabs.tsx` | Usa `ds-button--sm` e `ds-button--ghost`; itens inativos parecem links; A–F sem função na navegação | Abas 15px, altura/padding próprios, separação e seleção claras; rótulos do Detalhamento sem letras |
| `gestao.module.css` | Conclusão 16px; contexto, grupos, responsáveis e impactos majoritariamente 14px; títulos de problemas 18px | Conclusão 20px, corpo/responsáveis/impacto 16px; metadados 14px e títulos de registros 17px |
| `projeto-xvia.module.css` | Sobrescreve tokens locais e aumenta classes pequenas; não existe papel semântico para cada texto; narrativas usam toda a área | Migrar para papéis compartilhados e limitar texto narrativo, mantendo gráficos e tabelas amplos |
| `ChartTooltip`, `MetricCard`, `StoryCard`, `DashboardSection`, `ContentTopBar`, `Modal` | Tamanhos escolhidos localmente; tooltip 12px; cards com apoio `text-xs`; DS sem camada pode vencer utilitários | Aplicar tokens semânticos nos componentes comuns, com CSS próprio e precedência verificável |
| Gantts | Grade já escala junto com o texto; rótulos 14px por tokens locais | Preservar escala/geometria e tornar fonte parte da escala compartilhada; conferir exportação |

Não há texto visível abaixo de 14px no estado inicial das doze áreas: a rodada anterior já instalou um piso local. O problema atual é o excesso de conteúdo tratado como auxiliar. Fora da página, o tooltip comum ainda usa 12px. Essa diferença de alcance precisa ser corrigida na camada compartilhada, sem editar o DS vendorizado.

## Direção e escolhas

Adotada a escala detalhada no anexo do Fabio. Escolha de implementação: tokens semânticos globais em CSS, componentes compartilhados consumindo esses papéis e migração dos textos da página. Ajustes apenas locais deixariam tooltip/abas/tabelas divergentes entre domínios; substituir o Design System exigiria mudança de marca e infraestrutura sem benefício para esta solicitação.

| Papel | Tamanho-base | Uso |
|---|---|---|
| display | 28–32px | título da página/visão |
| heading-1 | 24px | seção |
| heading-2 | 20px | subseção |
| headline | 20px, semibold | conclusão principal |
| metric | 32px, semibold | valor principal |
| card-title | 17px, semibold | título de registro/alerta |
| body | 16px | explicação e ação |
| table / label | 15px | dados tabulares e controles |
| body-small / caption | 14px | apoio e metadados |

Unidades relativas, entrelinhas por papel, peso 400 no corpo e 600 nos pontos dominantes. Narrativa limitada a aproximadamente 60rem; tabelas/gráficos conservam largura e rolagem próprias. Uma mensagem dominante por bloco. Fonte nunca diminui para caber.

Esboço da UST:

```text
Quanto do contrato já foi executado?
A X-VIA concluiu 583 UST
2,5% das 23.356 UST contratadas · R$ 90.137,63 em valor calculado
Outras 2.601 UST estão em tarefas abertas. Ainda não há tarefas para 20.172 UST.
[barra do contrato e legenda legível]

Pontos de atenção no dado
2 atividades passaram do previsto no ETP
DOC.07: 504 UST lançadas para 36 previstas.
DEV.15: 82 UST lançadas para 44 previstas.
[Nomes completos consultáveis]    [De onde vem? secundário]

Como a execução mensal se compara ao previsto?
Outubro fechou com 18% do previsto.
346 UST de 1.970 previstas, equivalentes a R$ 53.495,06 calculados.
[comparação mensal com rótulos maiores]
```

Os números do esboço são referências do anexo; a interface continuará lendo os valores calculados atuais, sem fixá-los no JSX. Não mudar regras, populações, datas, filtros, navegação ou indicadores. Não adicionar setas decorativas.

## Plano de execução

1. Auditoria e direção documentadas antes do código; abrir registro no Obsidian.
2. Criar escala global e migrar componentes compartilhados; preservar DS vendorizado.
3. Revisar UST, execução mensal, narrativas, alertas, tabelas, abas e demais áreas de `/projeto-xvia`.
4. Validar lint, testes, build, medidas reais, mobile, zoom 100/125/150/200%, fonte ampliada, filtros, foco e exportações; registrar resultados e limitações.

## Execução e evidências

As quatro fases foram concluídas em 12/11/2026. Registro de execução e resultados: [[2026-11-12-tipografia-bi-xvia]].

| Fase | Entrega |
|---|---|
| 1 — auditoria e direção | Doze áreas navegadas, medidas e capturas anteriores; diagnóstico e esboço deste documento gravados antes do código |
| 2 — escala e comuns | `src/styles/bi-typography.css`, importação global, compatibilidade dos utilitários via tokens, componentes comuns e rótulos dos gráficos. DS vendorizado preservado |
| 3 — X-VIA | Papéis semânticos nas doze áreas, UST e execução mensal reorganizadas, alertas legíveis, responsáveis/ações maiores, narrativas limitadas e abas sem prefixos A–F |
| 4 — validação | Lint, testes, build, matriz de resolução/zoom/fonte, fluxos, exportações, outros domínios e versão de produção conferidos; documentação e Obsidian atualizados |

### Medidas finais e comparação

Em 1366×768, `UstResumo` passou de uma frase de 20,8px com quatro informações misturadas para conclusão de **20px**, seguida de referência e explicação de **16px**. Alertas têm títulos de **17px**, corpo **16px** e origem **14px** com peso normal. Os nomes completos de DOC.07 e DEV.15 continuam acessíveis por expansão; não foram eliminados.

No painel UST, a contagem de trechos a 14px caiu de **453 para 48**; a maior parte da consulta passa a **15px** (384 trechos de tabelas/labels), com explicações a 16px. Títulos de seção permanecem a 24px. Isso muda o papel do texto sem ampliar tudo indiscriminadamente. A contagem usa nós com texto visível; ícones não são tratados como texto.

Abas medidas em **15px**, com aproximadamente **50px de altura**, peso 400 nas inativas e 600 na ativa. Bordas e fundo identificam seleção; as abas deixam de usar a aparência de botão pequeno/ghost do DS. IDs e navegação mantidos. Home/End também passam a levar foco à aba selecionada, além das setas já existentes.

Em 1920px, a conclusão da UST mede **960px de largura**, enquanto tabelas e gráficos mantêm a área disponível. Mês do gráfico: 16px; referência “Mês N”: 14px; valores: 15px com UST explícita e percentual em linha secundária. Outubro continua com **346/1.970 UST e 18%**; novembro, **92 UST em andamento** no retrato de 11/11.

Os totais **583 UST / R$ 90.137,63 calculados / 2,5% de 23.356**, **2.601 UST em tarefas abertas** e **20.172 UST ainda sem tarefa** foram preservados. Bibliotecas de regras, datasets e pipeline não foram alterados nesta revisão.

### Verificações executadas

- **216 estados de tela:** doze áreas × quatro resoluções (1280×720, 1366×768, 1440×900, 1920×1080) × quatro áreas úteis equivalentes a zoom 100/125/150/200%, mais as doze áreas em 375px e novamente em 375px com fonte raiz de 32px. Resultado final sem largura excedente da página e sem texto abaixo do piso de 14px, proporcional à ampliação.
- A primeira matriz identificou **29px de excesso na legenda de UST** em 375px/fonte 200%. A legenda agora permite quebra, mantendo a fonte. UST foi conferida novamente nas dezoito combinações; histórico anterior e resultado final estão salvos separadamente. Ícones gráficos de ordenação ficam fora da medição do piso de texto.
- Teclado: End, Home e seta direita conservam foco e seleção na mesma aba, após a atualização do endereço. Abrir uma atividade da UST foca seu título de 20px. Origem abre com a busca focalizada, inclusive no mobile com fonte 200%; diálogo sem corte horizontal. Filtros nativos de CMS, X-VIA, SES e Sprint 6 atualizam endereço e contexto visível; vazio continua sem avaliação positiva.
- Fonte ampliada mantém a grade do Gantt proporcional ao texto e a rolagem interna. Tema escuro e fonte de origem secundária conferidos. PNG e SVG exportados, com fontes/cores resolvidas e sem `var()` pendente no arquivo. Imagem inspecionada visualmente.
- PDFs reais do caso CMS: **resumo em uma página A4 paisagem**, **completo em cinco páginas com os onze capítulos**, **UST em oito páginas com a consulta integral**. CSV de atividades: **50 registros e cabeçalho**, independentemente da paginação. Nenhum texto narrativo ultrapassou a largura no estado de impressão observado.
- Componentes compartilhados conferidos nas telas iniciais de Página inicial, Portal Único, MS Digital, Carta de Serviços, Levantamento de Serviços Digitais, Sites e Avaliação da Carta, em 1366px e 375px: **14 passagens sem vazamento horizontal e sem texto visível abaixo de 14px**. Isso é conferência de regressão dessas telas, não auditoria de todas as abas dos outros domínios.
- Versão de produção aberta em servidor local temporário: seis áreas nos três níveis, com título 32px/conclusão 20px/tabela 15px e largura correta; UST em 375px/fonte 200% também passou. Conferência resolve o risco de ordenação de CSS entre desenvolvimento e build. Servidor temporário encerrado; localhost:3000 preservado.
- **309 testes aprovados**, lint sem avisos, build de produção aprovado e `git diff --check` sem problemas. Fluxos e matrizes não registraram exceções JavaScript.

### Sustentação

ADR-018 e `docs/architecture/convencoes.md` documentam os papéis. `Tabs`, `DataTable`, `StoryCard`, `MetricCard`, `DashboardSection`, `ContentTopBar`, `Modal`, `ChartTooltip`, legendas e gráficos comuns consomem a escala; utilitários legados também recebem valores centrais. Tabelas têm rolagem horizontal habilitada por padrão, para preservar acesso às colunas com fonte maior. Rótulos dos rankings podem quebrar linha.

Evidências temporárias no diretório indicado no diagnóstico: `auditoria-antes.json`, `auditoria-depois.json`, `matriz-tipografia.json`, capturas, `fluxos-retestes.json`, `dominios-e-csv.json`, `build-producao.json`, PDFs e cronograma exportado. Sem commit, push, deploy ou alteração no TFS. Lacunas financeiras, SLA sem medição e divergências de regra já documentadas continuam explícitas.
