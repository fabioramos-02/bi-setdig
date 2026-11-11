# ADR-014 — TFS como fonte do painel Projeto X-VIA, via extrator

**Status:** aceito (2026-10-26)

## Contexto

O Secretário Executivo pediu um relatório para acompanhar o contrato X-VIA:
- prazo;
- frentes X-VIA e SGD por módulo;
- UST consumidas frente ao Termo de Referência;
- pendências, entregas da sprint e o que está em produção;
- órgãos e pontos focais.

Tudo isso, menos o TR e os pontos focais, mora no backlog do TFS on-prem (`tfs.sgi.ms.gov.br`, projeto XVIA).

O TFS tem API REST com PAT e responde pelo IP público, sem VPN. A tentação era ler ao vivo na Vercel. O ADR-001, porém, manda a página ler `datasets/` em build-time, e o ADR-010 só abre exceção para intervalo de datas arbitrário. O backlog não é esse caso: é um retrato do dia.

## Decisão

- **Extrator no `data-platform`:** `extract/tfs.py` + `transform/tfs.py` → `datasets/tfs/v1/{itens,sprints}.json`. Roda no cron diário (`run.py --domain tfs`), e o PAT fica só no GitHub Secret `TFS_PAT`.
- **Consultas salvas no TFS:** as consultas ficam em `Shared Queries/BI SETDIG` (`scripts/criar_queries_tfs.py`). O extrator executa a query salva *Backlog completo*; sem ela, roda a mesma WIQL inline. Quem abre o TFS vê o mesmo recorte do painel.
- **Datasets manuais**, com `frequency: manual`:
  - `catalogo-ust` (catálogo de atividades do contrato);
  - `contrato` (UST do TR, R$/UST, vigência);
  - `stakeholders`: gerado das notas de secretarias do vault por `scripts/stakeholders_do_vault.py`; ponto focal e papel são preenchidos à mão.
- **Regras de negócio** (transform/tfs.py e lib/tfs.ts):
  - **frente**: área `XVIA\SGD*` = SGD, resto = X-VIA;
  - **módulo** = épico;
  - **órgão** = prefixo da Feature;
  - **tipo de entrega** pela coluna do quadro (Área de Negócios → Negócio; Aguardando Validação do Órgão → Órgão; Em Desenvolvimento/Homologação/Produção → Desenvolvimento X-VIA);
  - **pendência** = coluna Aguardando decisão/Impedido ou tag Dependência;
  - **UST** = `valorUst` da complexidade apontada por `Custom.SGI.LancamentoAtividadeID`.
- **Visibilidade:** a página é gestão interna do contrato. Tem `robots: noindex` e fica fora do sitemap e do índice em markdown do `proxy.ts`.

## Consequências

- O dado tem até um dia de atraso; para atualizar na hora, use o disparo manual do workflow.
- O consumo de UST depende de a tarefa ter a atividade do contrato vinculada. Em 26/10, só 54 de ~1.376 tarefas tinham, e a página avisa isso.
- Se o runner do GitHub não alcançar o TFS (firewall por origem), roda-se `python data-platform/run.py --domain tfs` na rede da SETDIG e commita-se o resultado.
- `itens.json` tem ~1,5 MB, perto do teto de 2 MB. Se o backlog crescer, cortar campos ou separar as Tasks num dataset próprio (v2).

## Adendo (2026-10-26) — UST da X-VIA vem do ETP, não do TFS

As tarefas da X-VIA (área `XVIA\Customização UST`, 617 em 26/10) **não** têm os campos `Custom.SGI.*`. A X-VIA escreve o código do catálogo dela na descrição ("Catálogo DOC.07 …"). Por isso:

- `transform/tfs.py` grava `codigoCatalogo`, lido da descrição. A descrição em si não é publicada.
- `datasets/tfs/v1/etp-ust.json` (manual) transcreve a memória de cálculo do ETP (pp. 68–71). Cada tarefa vale a UST unitária do código, e o total é 23.356 UST. O ETP declara "Total Estrutural 15.355", mas as linhas somam 15.560, e é esse valor que fecha o consolidado; vale a soma das linhas.
- Tarefa sem código, com faixa (`NEG.03/04/05`) ou com código fora do ETP fica "a classificar": não entra na soma e aparece listada.
- A UST da SGD (catálogo "Governo do Estado") saiu do painel, que mostra só o que a X-VIA fatura.
- Filtros (módulo, frente, órgão, sprint) ficam na URL e valem para todas as abas.

## Adendo (2026-11-03) — quadro do time espelhado e refresh que avisa quando para

**Problema:** o refresh diário (`refresh-datasets.yml`) ficou parado de 27/08 a 03/11 sem ninguém perceber. Os secrets `TFS_PAT`, `MATOMO_TOKEN` e `GOOGLE_REFRESH_TOKEN` estavam vazios, e toda fonte falhava. O `run.py` isola a falha de cada fonte e saía com código 0, então o job ficava verde e não commitava nada.

**Decisões:**
- **O refresh falha alto.** Se alguma fonte falhar, o `run.py` sai com código 1 depois de publicar as que funcionaram. O passo de commit do workflow roda com `if: always()`: o que deu certo é publicado e o job fica vermelho, e o GitHub avisa por e-mail.
- **`--sem-vpn` no CI.** Cartas, qualidade, MS Digital e Portal Único (banco) exigem VPN e nunca rodam no GitHub. O workflow pula essas fontes, para o vermelho significar "algo que deveria funcionar parou".
- **Quadro do time = consultas do próprio dashboard.** O dashboard do time no TFS (`DASHBOARD_TIME` em `extract/tfs.py`) é lido pela API.
  - Para cada card ou gráfico com consulta salva, roda-se a consulta (`wit/wiql/{id}`).
  - Card guarda o total. Gráfico guarda a contagem pelo campo agrupado (`groupBy`), buscando só esse campo.
  - Publica `datasets/tfs/v1/painel-time.json`, na ordem do dashboard.
  - Card novo no TFS aparece no BI sem mudar código.
  - "Reunião", "Aplicativo", "Pacotes de entrega" etc. são consultas, não campos. Por isso não dava para derivá-los do `itens.json`.
- **Leitura de gestão** (`src/lib/tfs-painel.ts`): os cards são separados pelo nome em três grupos.
  - **pede ação** = impedido, aguardando decisão, bug;
  - **em andamento ou fora da fila** = em desenvolvimento, despriorizado, descontinuado;
  - **tamanho do trabalho** = o resto.
  - Card com nome novo cai em "tamanho" até alguém acrescentar a palavra na regra.
- **Aba "Acompanhamento do time"** em `/projeto-xvia`. Os filtros da página não se aplicam a ela, e a aba diz isso. Com mais de 2 dias sem atualizar, mostra aviso visível.

**Consequências:**
- O PAT precisa ler Work Items **e** Dashboards.
- Enquanto Matomo e GA4 seguirem sem secret, o job fica vermelho todo dia. É o aviso correto.

## Adendo (2026-11-03) — UST da X-VIA só pelo contrato da X-VIA

**Pedido:** a aba de UST deve contar só o catálogo do contrato da X-VIA, nunca o do Governo do Estado.

**Achado:**
- Desde 21/10 cada Task grava o contrato em `Custom.SGI.Empresa`. No TFS os valores são `Governo do Estado` e `004/2026 - 30524 - XVIA TECNOLOGIA LTDA`.
- A Task também grava a atividade daquele contrato (`AtividadeUST` "DOC.07 - …" e `LancamentoAtividadeID`).
- Na extração de 03/11: 13 Tasks com o contrato da X-VIA, 171 com o do Governo e 1.228 sem contrato. Das 580 Tasks da área `Customização UST`, 570 ainda não tinham contrato. É o "Tasks sem UST" do quadro do time.

**Decisões:**
- O extrator passa a ler `Custom.SGI.Empresa`, e o item ganha o campo `empresa`.
- A `ust` da Task sai do catálogo **do contrato dela**. O id da complexidade só vale dentro do catálogo daquele contrato.
  - Catálogo do Governo: `catalogo-ust.json`.
  - Catálogo da X-VIA: `catalogo-ust-xvia.json`, colado à mão do SCP como o outro.
  - Task sem contrato usa o catálogo do Governo, como antes.
- O código da atividade X-VIA vem da atividade marcada ("DOC.07 - …"). Sem contrato marcado, vem do que a X-VIA escreveu na descrição ("Catálogo DOC.07"). Nesse caso o valor só sai do catálogo X-VIA quando a atividade tem uma única complexidade; senão a Task fica "a classificar".
- **Quem é tarefa da X-VIA** (`ehTarefaXvia`): Task com o contrato da X-VIA, ou Task sem contrato na área `Customização UST`. Task com o contrato do Governo **nunca** entra, mesmo nessa área.
- **Valor:** a `ust` do catálogo X-VIA. Sem ela, a UST unitária do ETP. A aba diz quantas tarefas ainda dependem do código da descrição (`semContrato`) e do valor do ETP (`valorDoEtp`). O previsto continua sendo a memória de cálculo do ETP.

**Resultado em 03/11** (ainda sem o catálogo X-VIA colado, então todo valor é do ETP):

| | |
|---|---|
| Tarefas da X-VIA | 583 |
| UST lançada | 2.166 (9,3% do ETP) |
| UST executada | 66 |
| Tarefas sem contrato marcado | 286 |

## Adendo 2026-11-11 — refatoração do BI X-VIA

Frente X-VIA × SGD pelo contrato (ADR-017), cadeia financeira manual (`financeiro.json`), mês civil do
contrato e cronograma de dependências. Documentação completa em [docs/projeto-xvia/](../projeto-xvia/):
01 diagnóstico, 02 arquitetura da informação, 03 dicionário, 04 regras, 05 fontes, 06 histórico, 07 pendências.
