# ADR-015 — Censo Digital passa a usar o levantamento autodeclarado da SGD (escala 0–5)

**Status:** aceito (2026-10-27)

## Contexto

A primeira versão do `/censo-digital` (`datasets/censo/v1`) cobria 3 órgãos: IAGRO, DETRAN e SEAD. Cada carta tinha um nível numa régua 0–4, classificado com apoio de IA e revisão humana no repositório `mapeamento-inicial-servicos-digitais`.

A Superintendência de Governo Digital (SGD) rodou depois um questionário com os próprios órgãos. O resultado é a planilha unificada, com uma aba por órgão: 27 órgãos e cerca de 800 serviços. Ela usa uma escala de **0 a 5**, cujo dicionário está na aba "Comece por aqui" do modelo da planilha. Cada linha traz também a etapa presencial e a demanda mensal.

## Decisão

- **Substituir** o v1 pela planilha. O shape mudou de forma incompatível: a escala, os campos e o arquivo único no lugar de um arquivo por órgão. Por isso o dataset vai para **`datasets/censo/v2/censo.json`** (ADR-004). O v1 sai do repositório.
- **Conversão reprodutível:** `data-platform/build_censo.py` lê o xlsx e `transform/censo.py` faz as regras puras, com testes em `censo_test.py`. Segue o mesmo padrão de `build_catalogo.py`:
  - fonte manual, `frequency: manual`, fora do `run.py` e do cron;
  - o xlsx não é versionado, porque tem o nome e o e-mail de quem preencheu.
- **Colunas achadas pelo texto do cabeçalho**, não pela posição: AGRAER e SAD têm colunas a mais.
- **Indicadores** (lib/censo.ts):
  - **digital** = níveis 4–5, ou seja, o cidadão não vai ao balcão. O nível 3 deixa de contar como digital.
  - **oportunidade** = níveis 1–2. O nível 3 fica de fora porque a etapa presencial é exigência legal.
  - **% da demanda já online**, calculado sobre a base dos serviços que informaram número.
  - **Matriz impacto × esforço**: esforço = nível (0–2 alto), impacto = pedidos por mês acima da mediana do recorte (governo ou órgão). Todos os níveis entram, e o nível 5 aparece contado em cada quadrante.
- **Demanda mensal** vem em texto livre. A heurística em `parse_demanda` lê número, separador de milhar, "por ano" (÷12) e frases com um único número. O que não dá para ler fica `null`, o texto original é preservado, e o painel diz quantos ficaram de fora.
- **Link no portal:** título normalizado + sigla casados contra `cartas/v1/inventario-relacao.json`. Na carga de 2026-10-27, 687 de 817 serviços casaram.

## Consequências

- O painel passa a refletir a **visão do próprio órgão**, sem conferência externa, e diz isso no texto. Saem a justificativa e a "etapa que trava" geradas pela IA.
- Os percentuais do painel mudam e não são comparáveis com o v1, porque o critério de "digital" mudou de 3–4 para 4–5.
- Nova rodada do censo = trocar o xlsx e rodar o script. Nenhum código muda enquanto o cabeçalho mantiver as mesmas perguntas.
