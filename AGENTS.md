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
