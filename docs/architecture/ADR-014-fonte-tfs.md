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
