# Fase 1 — Fundação do portal

**Status: 🟡 bootstrap + rotas dos 5 domínios feitos; 2 rotas já mostram dado real (ver Fase 2); resto dos componentes de dashboard/chart pendente**

> ⚠️ **`refatoracao-bi` é pasta sincronizada entre duas máquinas** (mesmo
> `.git`, remote `github.com/fabioramos-02/bi-setdig`, provavelmente via
> sync de pasta em `Documents`). As duas sessões escrevem no mesmo working
> tree ao vivo. **Sempre rodar `git status` e `git log --oneline -10` antes
> de criar/mover arquivo no portal** — já aconteceu de uma sessão recriar
> (e quase apagar) o que a outra tinha acabado de commitar. Nunca presumir
> que "não existe ainda" sem checar o git primeiro.

## Intuito

Criar a casca do portal único (`refatoracao-bi/portal`, Next.js) que vai
receber os domínios migrados na Fase 3: shell de layout, Design System
funcionando (claro/escuro), biblioteca de componentes de dashboard e de
gráficos reutilizável entre domínios. Sem isso pronto, não tem onde migrar
nada.

## O que foi feito

- `portal/` criado via `create-next-app` (TypeScript, App Router, Tailwind,
  ESLint, `src/`, alias `@/*`).
- **Achado crítico, documentado em `docs/architecture/ADR-006-ds-vendorizado.md`**:
  `@design-system-ms/ds-sis` no npm (testado v0.6.1, a mais recente) instala
  **sem a pasta `dist/`** — o pacote está deprecado de fato (README do próprio
  pacote confirma: "Descontinuado... sem pacote npm"). O repo local
  `design-system-ms` tem `"private": true`, não publica mais nada.
  → **Solução aplicada**: vendorizar `design-system-ms/src/styles/*.css` e
  `src/assets/fonts/*.otf` direto em `portal/src/styles/ds-sis/` (cópia, não
  symlink — repos independentes). Isso invalida a premissa original do
  ADR-003 (consumo via npm) — se o DS voltar a publicar de verdade, trocar a
  cópia pela dependência.
- `next-themes` + `recharts` instalados.
- `globals.css`: importa `ds-sis/styles/main.css` + `fonts.css`; overrides de
  dark mode em `[data-theme="dark"]` para os tokens semânticos que o DS ainda
  não define (`--ds-color-text-*`, `--ds-color-background*`,
  `--ds-color-border`, `--ds-color-primary-600` clareado pra `#4f9ddb`).
- `layout.tsx`: fonte Open Sans via `next/font/google` mapeada pro token
  `--ds-font-family-body`; `ThemeProvider` do `next-themes` com
  `attribute="data-theme"`.
- `components/ds/ThemeToggle.tsx`: botão claro/escuro funcional.
- `components/ds/PageHeader.tsx`: header reutilizável (título + link "← Portal"
  + ThemeToggle) — usado por todas as páginas de domínio.
- `components/ds/EmptyCard.tsx`: placeholder padrão pra domínio sem dado ainda.
- **5 rotas de domínio já existem** (rotas flat em `app/`, sem route group):
  `app/analytics/portal-ms/page.tsx`, `app/analytics/ms-digital/page.tsx`,
  `app/servicos/page.tsx`, `app/qualidade/page.tsx`, `app/governanca/page.tsx`.
  Cada uma: `<PageHeader title="..." /> + <EmptyCard message="..." />`, sem
  layout compartilhado (cada page.tsx importa `PageHeader` direto — não existe
  `app/layout.tsx` de grupo, é decisão válida pra 5 rotas flat sem nesting).
- `app/page.tsx`: home com grid linkando pras 5 rotas acima (todas 200 agora,
  não mais 404).
- Build (`npm run build`) limpo, 9 rotas estáticas geradas. Dark mode testado
  ao vivo (dev server): clique no toggle muda `data-theme`,
  `--ds-color-primary-600` e `background` no DOM de verdade.
- `.claude/launch.json` criado (no repo `matomo`, que é a raiz de sessão desta
  máquina) apontando pro dev server do portal via `npm --prefix`.
- Histórico git relevante: `bd54afe` (create-next-app) → `7de50af` (fundação DS
  + tema) → `4c6be78` (fix ThemeToggle: `useSyncExternalStore` em vez de
  `useState`+`useEffect`, evita flash de hidratação) → `a53ae56` (scaffold das
  5 rotas) → `7260df0` (lockfile).

## O que falta

| Item | Descrição |
|---|---|
| E1.3 | Wrappers React finos sobre os componentes ds-sis além dos já feitos (PageHeader/EmptyCard/ThemeToggle): Button, Card, Alert, Badge, Select. Vendorizar o CSS de cada componente (`design-system-ms/src/components/<nome>/`) **sob demanda**, um por vez conforme for usado — não copiar os 16 de uma vez (ver ADR-006). |
| E1.4 | Biblioteca `components/dashboard/`: MetricCard, KPI, ChartCard, TrendCard, StatGrid, LoadingCard, DashboardSection, FilterBar (EmptyCard já existe). |
| E1.5 | Biblioteca `components/charts/`: BarChart, LineChart, PieChart, DonutChart, HeatMap, Radar — Recharts, cor via `var(--ds-*)` (ver ADR-002), sem transformação de domínio dentro do componente. |
| E1.6 | Módulo `components/filters/`: DateFilter, OrgaoFilter, CategoriaFilter, UnidadeFilter, SearchFilter. |
| E1.2 (opcional) | Se a navegação crescer além de 5 rotas flat (sub-rotas dentro de `/servicos`, por ex.), aí sim vale um `app/(plataforma)/layout.tsx` com Sidebar/Breadcrumb — não antes, YAGNI enquanto for só 5 páginas soltas. |
| E1.7 | Abrir PR/issue no repo `design-system-ms` propondo tokens dark oficiais — hoje é só override local no portal. |

## Decisões que precisam de você

- Ícone/Material Symbols: os BIs antigos usam `Material Icons` via Google
  Fonts CDN — decidir se o portal segue igual ou troca por um set SVG local
  (menos dependência de CDN externo).
- Confirmar se `Open_Sans` + `Avenir Next LT Pro` (vendorizada) é o par de
  fontes definitivo, ou se o DS mudou isso nas versões mais novas do
  `storybook-ds-ms` (o pacote local pode ter avançado desde a última leitura).

## Como retomar

```bash
cd refatoracao-bi/portal
npm install
npm run dev   # http://localhost:3000
```
Testar toggle de tema na home antes de começar E1.3 — se quebrou, o problema
está em `globals.css` ou nos overrides `[data-theme="dark"]`.

**Antes de mexer**: `git status` + `git log --oneline -10` (ver aviso de
sincronismo no topo deste doc) — a outra máquina pode ter avançado desde a
última vez que este arquivo foi atualizado.

Próximo passo natural: E1.4 (biblioteca `components/dashboard/`) — as 5 rotas
já têm onde colocar componente novo, não precisa mais criar layout antes.
