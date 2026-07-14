# Portal de BI — SETDIG

Plataforma de analytics do Governo de Mato Grosso do Sul (Next.js + Design System MS). Reúne, em domínios de negócio, os dados de uso dos canais digitais do Estado.

## Domínios

| Rota | O que mostra | Fonte |
|------|--------------|-------|
| `/analytics/portal-ms` | Portal web www.ms.gov.br | Matomo |
| `/analytics/ms-digital` | App MS Digital | GA4 |
| `/servicos`, `/qualidade`, `/governanca` | — (em construção) | — |

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind · Recharts.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm run build       # build de produção
npm run lint        # eslint
npm test            # node --test nativo (src/**/*.test.ts)
```

Os dashboards leem JSONs estáticos de [`datasets/`](datasets/) em build-time — **não há chamada de API em runtime**, salvo a exceção pontual do filtro "Intervalo de datas" e datas de referência passadas, que buscam ao vivo (ADR-001, ADR-010). Os datasets são atualizados automaticamente todo dia por [`.github/workflows/refresh-datasets.yml`](.github/workflows/refresh-datasets.yml) (cron); pra rodar manualmente, use o pipeline em [`data-platform/`](data-platform/).

## Arquitetura

```
fontes (Matomo/GA4/Postgres)
   └─ data-platform/   ETL: extract → transform → validate → publish
        └─ datasets/   JSONs versionados (fonte da verdade dos dados)
             └─ src/   Next.js: lê datasets, calcula insights em lib/, renderiza
```

- **`data-platform/`** — pipeline Python. Ver [data-platform/README.md](data-platform/README.md).
- **`datasets/`** — dados publicados + `catalog.json`. Ver [datasets/README.md](datasets/README.md).
- **`src/lib/`** — leitura de datasets, tipos, cálculo de insights (sem cálculo em componente).
- **`src/components/`** — DS (`ds/`), dashboard (`dashboard/`), gráficos (`charts/`).
- **`src/styles/ds-sis/`** — Design System MS vendorizado (ADR-006).

Decisões de projeto em `docs/architecture/` (ADRs) e convenções em [AGENTS.md](AGENTS.md).

## Padrões

- Sem fetch/cálculo em componente `.tsx` → mora em `src/lib/`.
- Tipografia/cor via tokens `var(--ds-*)`.
- Filtro de período (sidebar) nas rotas com dado; breakdowns em 4 períodos fixos (ADR-007).
