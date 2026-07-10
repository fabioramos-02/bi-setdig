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
- **Período (ADR-007):** breakdowns são `Record<"dia"|"semana"|"mes"|"ano", T[]>`;
  "intervalo" cai em `mes`. Filtro vive na Sidebar (`usePeriodo`/`chavePeriodoFixo`).
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
- **Quando a aproximação é inevitável (ADR-007: "intervalo" cai em "mes" pra
  todo `BreakdownPorPeriodo<T>`), 2 obrigações, não 1:** (a) o texto/label
  tem que usar o período que o dado *realmente é* (`periodoAtual`), nunca o
  que o usuário selecionou (`estado.tipo`) — já aconteceu de `BuscaTab`/
  `PaginasTab` dizerem "no intervalo" pra um número que era do mês, o que
  pareceu um bug de dado quando era só rótulo errado; (b) todo consumidor
  do breakdown precisa do aviso visível (`AvisoSnapshotAproximado`), não só
  a nota genérica da Sidebar — ela não cobre o dataset específico.
