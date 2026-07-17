<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Portal de BI — SETDIG

Plataforma de analytics gov (Next.js + Design System MS). Dados vêm de JSONs em
`datasets/` lidos em build-time — **zero API em runtime** (ADR-001). Pipeline em
`data-platform/` (Python) gera esses JSONs. Ver `README.md`, `datasets/README.md`,
`data-platform/README.md` e os ADRs em `docs/architecture/`.

## Como estruturamos o front

```
app/(plataforma)/
  layout.tsx                    shell: Sidebar (drawer no mobile) + conteúdo + PeriodoProvider
  <dominio>/page.tsx            server: lê datasets via lib/data.ts, passa props ao client
  <dominio>/<Dominio>Client.tsx client: estado (período/abas), monta as tabs
  <dominio>/<Aba>Tab.tsx        uma aba por arquivo (≤250 linhas, SRP)
components/ds/                  wrappers do DS-MS (Sidebar, ContentTopBar, EmptyCard…)
components/dashboard/           composição (StoryCard, MetricCard, DashboardSection, Tabs…)
components/charts/              wrappers Recharts/mapa temados por var(--ds-*)
lib/data.ts                     ÚNICO ponto de leitura de datasets/ (+ tipos)
lib/*.ts                        cálculo/insights (insights, cross-canal, catalogo-app, period-filter)
```

Fluxo de dependência: `page.tsx (server)` → Client → Tabs → components. Cálculo
sempre em `lib/`, nunca no `.tsx` (convencoes.md). Cor/tipografia só via `var(--ds-*)`.

## Regras que mais pegam

- **Mobile-first (ADR-009):** estilo base = ~375px; `sm:`/`md:`/`lg:` só adicionam.
  Item flex com gráfico/tabela precisa de `min-w-0`. Checar em 375px antes de subir.
- **Período (ADR-007 + ADR-010):** breakdowns são `Record<"dia"|"semana"|"mes"|"ano", T[]>`
  — só 4 chaves, sempre o período *corrente* de quando o pipeline rodou. Filtro
  vive na Sidebar (`usePeriodo`/`chavePeriodoFixo`). Pra granularidade OU data
  de referência que não seja a corrente ("Intervalo" ou dia/semana/mês/ano
  passado), o Client busca ao vivo (`ehPeriodoCorrente`/`intervaloDoBucket` em
  `lib/period-filter.ts` → `/api/analytics/*`, ADR-010) — ~1-2s, com skeleton
  (`ChartLoading`) e aviso (`AvisoSnapshotAproximado`, `status: StatusIntervalo`)
  enquanto carrega. Ver `lib/server/perfil-live.ts` (recalcula visitas ao vivo
  reusando o catálogo estático do snapshot) e `lib/servico-app-classifier.ts`
  (reclassifica screen_view do GA4 em categoria/serviço-folha contra
  `catalogo-servicos.json`, usado em MS Digital › Funcionalidades e ›
  Categorias do app — essa última deixou de ser 100% estática: o catálogo
  categoria/serviço/URL continua fixo, mas os números de acesso reagem ao
  período).
- **DS-SIS unlayered vence Tailwind:** regra de tag do DS (ex. `h3`) sobrescreve
  utilities; cravar tipografia com `style` inline quando precisar.
- **Versão de dataset (ADR-004):** mudança de shape que quebra → nova pasta `vN`.
- **Nunca deixar gráfico/dado mockado ou estático num domínio com filtro de
  período.** Já aconteceu: `paginas-mais-acessadas` e `busca` ficaram presas
  num snapshot fixo (`period="month"` hardcoded no pipeline) enquanto o resto
  da aba reagia ao filtro — silencioso, só o usuário percebeu no uso real.
  Antes de dar por pronto um dataset/aba novo em domínio com `PeriodoProvider`,
  confirmar as 4 camadas batem: (1) `run.py` itera `PERIODOS_FIXOS`/`GA4_PERIODOS`,
  não período fixo isolado; (2) JSON publicado tem as 4 chaves
  `dia/semana/mes/ano`, não lista/objeto único; (3) tipo em `lib/data.ts` é
  `BreakdownPorPeriodo<T>`, não `T[]` solto; (4) o Client indexa
  `dataset[periodoAtual]` antes de repassar à Tab — nunca repassa o breakdown
  inteiro nem o array cru. Exceção só quando o dado é catálogo/estático por
  natureza (ex. `catalogo-servicos`, inventário de cartas) — aí documentar o
  porquê no comentário do getter, igual já feito nesses dois casos.
- **Quando a aproximação é inevitável (fetch ao vivo ainda carregando, ou
  falhou e caiu no snapshot), 2 obrigações, não 1:** (a) o texto/label tem
  que usar o período que o dado *realmente é* (`periodoAtual`), nunca o que
  o usuário selecionou (`estado.tipo`) — já aconteceu de `BuscaTab`/
  `PaginasTab` dizerem "no intervalo" pra um número que era do mês, o que
  pareceu um bug de dado quando era só rótulo errado; (b) todo consumidor
  do breakdown precisa do aviso visível (`AvisoSnapshotAproximado`), não só
  a nota genérica da Sidebar — ela não cobre o dataset específico.

## Data Storytelling & Linguagem Cidadã

Todo componente novo de gráfico/métrica/insight segue isso — não é só polimento,
é regra:

- **Linguagem cidadã, não jargão de TI/governo.** Título e texto descrevem o
  que o número significa pra quem usa o serviço, não o mecanismo técnico por
  trás. Errado: "Distribuição temporal de requisições HTTP". Certo: "Horário
  de pico de acessos". Errado: "screenPageViews agregado por unifiedScreenName".
  Certo: "Serviço mais usado". Evitar sigla/termo técnico sem explicar (ex.
  "screen_view", "breakdown", "snapshot" não vão pro texto voltado ao usuário
  — só pra comentário de código).
- **Frase-âncora + números, não tabela crua.** Todo `StoryCard` segue o molde
  já usado em `lib/insights.ts`: uma frase que já entrega a conclusão ("X é o
  Y mais usado, com Z% de..."), não só o dado solto — o gráfico ilustra a
  frase, não substitui ela. Ver `comoLer` em cada `calcularInsight*`: sempre
  explica em 1-2 frases simples como interpretar o número, incluindo a
  ressalva relevante (aproximação, viés, o que NÃO está sendo medido).
- **Honestidade sobre limitação do dado > omissão.** Quando o número é
  aproximado, incompleto ou não pôde ser classificado (ex.: `naoIdentificadoPct`
  em `servico-app-classifier.ts`, "sem link disponível" em `CategoriasTab`),
  mostrar isso explicitamente e em linguagem simples — nunca esconder a
  lacuna nem fingir precisão que o dado não tem.
- **Checklist de termo banido em texto visível** (achado real: vazou pro repo
  inteiro até a revisão de 2026-07 — `AvisoSnapshotAproximado`, `BuscaTab`,
  `ServicosPorPerfilTab` e outros): nunca aparecer em `anchor`/`caption`/
  `comoLer`/`label`/`message`/heading — nome de ferramenta/vendor ("Matomo",
  "GA4", "screen_view"), código interno ("ADR-XXX"), sintaxe técnica de URL
  ("?q="), termo de UI/dev ("sidebar", "snapshot", "recorte"/"recortam",
  "pipeline", "fonte de dados", "status" como rótulo cru), anglicismo evitável
  ("Top N" → "com mais acessos", "home" → "página inicial"). Se o termo
  precisar aparecer, ele descreve o que a coisa FAZ em português simples, não
  o nome dela.

## Pensamento Analítico (Analytics First)

Antes de criar, alterar ou refatorar qualquer gráfico, métrica ou componente de
dashboard, avaliar se a visualização realmente ajuda o usuário a entender o
problema — o objetivo não é mostrar todo dado disponível, é responder pergunta.

- **Pergunta antes de componente.** Sempre responder: qual pergunta de negócio
  isso responde? Qual decisão ajuda a tomar? O usuário entende a resposta em
  menos de 5 segundos? Existe forma mais simples de comunicar? Sem resposta
  clara pras 3 primeiras — reavaliar antes de implementar.
- **Todo componente responde uma pergunta, não só lista dado.** O título é a
  pergunta respondida, não a categoria do dado.
  - ❌ "Serviços por órgão" → ✔ "Quais órgãos concentram mais serviços?"
  - ❌ "Serviços digitais" → ✔ "Quanto da transformação digital já foi feito?"
  - ❌ "Lista de setores" → ✔ "Em quais setores os serviços se concentram?"
- **Priorizar leitura analítica sobre tabela crua**: maior/menor,
  crescimento/redução, distribuição, concentração, participação, comparação,
  tendência, anomalia. Gráfico que só redesenha uma tabela em barra não
  agrega nada.
- **Densidade de informação**: cada componente entrega o máximo de contexto
  no menor espaço — quantidade + percentual + variação + comparação juntos
  quando fizer sentido, não espalhado em cards genéricos. Ao revisar: "isso
  mostra só dado, ou já é conhecimento pronto pra decisão?"
- **5 públicos, 1 princípio**: cidadão, servidor, gestor, secretário,
  governador — nenhum precisa de treinamento técnico pra entender o gráfico.
  O componente explica o próprio significado (ver Data Storytelling acima);
  o usuário nunca "descobre" como ler.

## BI de gestão, não de métrica

O leitor-alvo da aba Visão Geral é o gestor, não o analista. Antes de dar por
pronta, checar se ela responde às 4 perguntas dele: está bom ou ruim? preciso
agir agora? onde investir? qual o risco? (Origem: revisão de 2026-07 da Visão
Geral do Portal Único por gestor real — nota 6,5/10, "muito orientada para
métrica, pouco para gestão".)

- **Ordem de leitura padrão de toda Visão Geral:** resumo executivo em texto
  (3-4 frases geradas em `lib/`) → saúde (semáforo verde/amarelo/vermelho com
  frase justificando contra o histórico — nunca cor sem palavra) → KPIs →
  tendência com contexto (comparação com o ano anterior/sazonalidade, sem
  repetir o que o texto já disse) → destaques/insights → pontos de atenção
  (bullets acionáveis; sem recomendação aplicável, a seção some — nunca bullet
  de enchimento). Domínio sem histórico comparável degrada honestamente:
  omite a saúde e diz numa linha por quê (ver `lib/saude-portal.ts`).
- **Número nunca anda sozinho.** Todo KPI carrega referência: total ("47 de 79
  municípios"), histórico ou meta. Número absoluto sem base de comparação não
  responde "está bom ou ruim?".
- **Métrica de ferramenta não é KPI de gestão.** Contador cru que só existe
  porque a ferramenta expõe (ex.: `nb_actions` do Matomo virando um card
  "Ações no mês: 683.352") não responde pergunta nenhuma — o próprio autor do
  painel não soube dizer o que significava. Quando o dado bruto não tem
  leitura, ou vira **razão/taxa** que responde algo ("2,1 páginas por visita"
  = o cidadão navega ou entra e sai?), ou sai do painel. Volume só é KPI
  quando o tamanho em si é a resposta (visitas, visitantes).
- **Nunca URL ou identificador técnico em destaque.** Rota de sistema (ex.
  retorno de login) sai no transform via lista de exclusão espelhada
  py↔ts (`EXCLUIR_URLS` em `transform/matomo.py` e
  `lib/server/matomo-transform.ts`); caminho em destaque vira nome legível
  ("Página inicial", não "/").
- **Percentual sempre sobre o total real.** Dado truncado (top-N): ou o
  pipeline publica o total junto (ex. `busca-total.json`), ou o rótulo declara
  a base ("entre os 20 termos mais procurados") — nunca % sobre lista
  truncada sem aviso.

## Testes

Unitário: `node --test` nativo (zero dependência), arquivo `Componente.test.ts`
colocado ao lado do arquivo testado (não usar `__tests__/`) — ver
`lib/period-filter.test.ts`/`lib/servico-app-classifier.test.ts`. Rodar com
`npm test`. Estratégia completa (teste de componente, E2E, meta de cobertura,
pipeline CI) em `docs/architecture/ADR-011-estrategia-de-testes.md`.
