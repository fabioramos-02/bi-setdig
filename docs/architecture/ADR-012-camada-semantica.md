# ADR-012 — Camada semântica: do portal medido ao serviço público medido

## Contexto

A Visão Geral do portal-ms media "o portal está saudável?" (ADR anteriores),
mas o gestor real que revisou o painel pediu o próximo nível: medir **entrega
de serviço público**, não página — qual serviço o cidadão usa, qual órgão
concentra demanda, sem exibir URL técnica em nenhum lugar (AGENTS.md "Data
Storytelling & Linguagem Cidadã").

A ideia inicial era construir um "dicionário de páginas" do zero (URL →
categoria → serviço → órgão). Investigação mostrou que **esse dicionário já
existe e está subutilizado**: `datasets/cartas/v1/inventario-relacao.json`
(1521 cartas, 1225 ativas, campos `titulo/orgao/orgaoSigla/setor/categoria/
slug/ativo` 100% preenchidos) já é a fonte de verdade do catálogo de
serviços do portal. O trabalho real não era criar um dicionário novo — era
ligar o que já estava pronto e corrigir 2 bugs que o mantinham escondido.

### Achados que motivam este ADR

1. **`(categoria, slug)` como chave perdia visitas silenciosamente.** A
   mesma carta é alcançável por mais de uma categoria no site real — ex.
   `/administracao-publica/pagamento-de-ipva-inscrito-em-divida-ativa134`
   está cadastrada no inventário como `financas-e-impostos`, então o join
   por `(categoria, slug)` não casava. Medido: 21/22 paths casavam por
   `(categoria, slug)`; **22/22 casam por slug isolado**. O slug NÃO tem
   colisão entre as 1225 cartas ativas.
2. **O número no fim do slug não é id.** `emitir-guia-de-licenciamento-
   anual100` — o `100` se repete entre cartas diferentes (248 números
   distintos para 1521 cartas; "72" repete 15×). A chave de match é o
   **slug inteiro** (string), nunca o sufixo numérico isolado.
3. **`topServicosLive`/`nomeDoSlug`/`CATEGORIAS_SERVICO` (perfil-live.ts)
   era uma 2ª implementação, pior, do mesmo catálogo.** Derivava nome a
   partir do slug da URL (`"ipva-consulta-de-debito54"` → `"Ipva consulta de
   debito"`) e não tinha órgão — quando o inventário já tem o nome oficial
   (`"IPVA - consulta de débito"`) e o órgão (`SEFAZ MS`). As 22 categorias
   hardcoded nesse módulo eram exatamente as mesmas do inventário: um proxy
   pior da mesma fonte.
4. **Nenhum sinal de taxa de identificação.** O join descartava página sem
   match silenciosamente (`continue`) — foi assim que o bug nº 1 (28 mil
   visitas/ano) passou despercebido. Precedente já existente no código:
   `naoIdentificadoPct` em `servico-app-classifier.ts`.

## Decisão

**O inventário de cartas É o dicionário de serviços — não existe (nem deve
existir) um dicionário de páginas separado.** Toda resolução de nome/órgão
de uma URL do portal passa por um único módulo:

- **`src/lib/pagina-tipo.ts`** — `construirContexto(inventario)` monta o
  contexto uma vez (mapa slug→carta + lista de órgãos únicos, normalizada);
  `classificarPagina(url, ctx)` classifica qualquer URL do Matomo em um
  `TipoPagina` (`servico | pagina-inicial | orgao | meu-painel | noticia |
  lista-categoria | busca | outro`) e devolve nome em linguagem cidadã.
  Reusado por: `lib/pagina-label.ts` (ranking de páginas),
  `lib/server/cartas-visitas.ts` (demanda por carta/órgão),
  `lib/server/perfil-live.ts` (serviços mais acessados ao vivo), e o
  espelho Python `transform/servicos.py::_carta_por_slug` (pipeline).
- **Chave de match = SLUG (2º segmento do path), não `(categoria, slug)`.**
  Corrige o achado nº 1 sem re-arquitetar nada — é o mesmo padrão em TS e
  Python (`chaveDoPath`/`_carta_por_slug`), comentado cruzado nos dois
  lados.
- **Página de órgão (`/orgao/{sigla-slug-concatenado}/...`) casa por
  prefixo normalizado** (`stripAlnum`: remove tudo que não é letra/número,
  já que a sigla no inventário pode ter espaço — `"SEFAZ MS"` — enquanto a
  URL real concatena sem separador — `sefaz-mssecretaria-de-...`).
  Órgãos candidatos são ordenados por tamanho de sigla decrescente, pra
  `"SEFAZ"` não casar antes de `"SEFAZ MS"` quando os dois seriam prefixo
  válido.
- **Honestidade obrigatória no join** (`joinVisitas`, `demandaPorOrgao`):
  todo resultado carrega `naoIdentificado: { visitas, pct }` — % sobre o
  total de páginas que **parecem serviço** (2+ segmentos, fora de
  órgão/workspace/notícia/busca) e não casaram com nenhuma carta. Home e
  notícia nunca contam como "miss" — não é omissão, é o dado dizendo "isto
  aqui não é um serviço".
- **Só cartas ATIVAS entram no join.** Efeito colateral esperado e aceito:
  os números de "serviços mais acessados"/"demanda por órgão" podem cair um
  pouco em relação à implementação anterior (que não filtrava por
  `ativo`) — é mais correto, não uma regressão.
- **Pipeline Python lê o inventário JÁ PUBLICADO** em
  `datasets/cartas/v1/inventario-relacao.json` (não o Postgres) — não exige
  VPN e não acopla `run_matomo_perfil_filtro` ao job `run_cartas`. Sem o
  arquivo (1ª execução), o job segue sem nome/órgão resolvido, com aviso —
  mesmo princípio de isolamento de falha que já existia pra `run_cartas`
  (ADR original do pipeline: fonte indisponível não derruba as outras).
- **`datasets/matomo/v1/servicos-mais-acessados.json` ganha `orgaoSigla`
  como campo aditivo** (nullable) — sem quebrar o shape v1 (ADR-004).
  **Novo dataset `datasets/matomo/v1/demanda-por-orgao.json`**
  (`BreakdownPorPeriodo<{orgaoSigla, orgao, visitas, pct}>`), agregado sobre
  a lista completa de páginas de serviço, não só o top-15 — denominador
  correto pro `pct`.

## Consequências

- **Uma fonte de verdade só para nome/órgão de serviço**, em vez de duas
  implementações divergentes (inventário vs. derivação de slug). Bug de
  nome errado (`"Delegacia Virtual (DEVIR)"` → nome real: `"Registrar
  boletim de ocorrências on-line"`) resolvido de graça ao eliminar a 2ª
  implementação.
- **O que este ADR não resolve, e por quê:**
  - **Funil por cidadão** (Portal → Login → MS Digital → Meu Painel →
    Concluiu): impossível com o dado disponível. `Transitions` (fluxo
    página→página) foi removido do pipeline por instabilidade (ADR-010).
    Portal (Matomo) e app (GA4) não têm chave comum de cidadão —
    `lib/cross-canal.ts` já documenta que a comparação entre os dois é de
    *alcance por canal*, nunca soma nem funil.
  - **"Serviço concluído"**: o portal encaminha para o sistema que executa
    (`meudetran`, `efazenda`, `devir.pc`, …) — a conclusão acontece fora da
    medição deste portal.
  - **Encaminhamento (pra onde o cidadão foi depois)** e **serviços/órgãos
    em alta** (variação período a período) ficam para uma fase futura —
    dados já mapeados, mas fora do escopo desta rodada.
- Consumidores de `ServicoAcessado`/novo `DemandaOrgao` (TS) devem tratar
  `orgaoSigla`/o dataset inteiro como possivelmente vazio/nulo — o
  classificador é honesto sobre o que não conseguiu identificar, a UI
  precisa ser honesta também (ver AGENTS.md "Honestidade sobre limitação do
  dado").
