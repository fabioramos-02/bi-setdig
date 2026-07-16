# Convenções e metas

## Código

- SRP, arquivo ≤250 linhas.
- Componentes de UI não fazem fetch — dados chegam via props desde `page.tsx`.
- Cálculo/transformação de domínio mora em `lib/`, nunca no `.tsx`.
- Sem hex fora de `globals.css` — cor sempre `var(--ds-*)`.
- **Mobile-first** (ADR-009): estilo base = ~375px; `sm:`/`md:`/`lg:` só adicionam.
  Item flex com gráfico/tabela precisa de `min-w-0` (senão estoura o viewport).
  Checar em 375px antes de subir: `scrollWidth <= innerWidth`.
- ADR novo para toda decisão estrutural (não revisitar a mesma discussão depois).

## Componentes (ver modules.md)

- `dashboard/`: DashboardCard, MetricCard, KPI, ChartCard, TrendCard, StatGrid,
  LoadingCard, EmptyCard, DashboardSection, FilterBar.
- `charts/`: BarChart, LineChart, PieChart, DonutChart, HeatMap, Radar — todos
  recebem dados já formatados, nunca fazem transformação de domínio.
- `filters/`: DateFilter, OrgaoFilter, CategoriaFilter, UnidadeFilter,
  SearchFilter — estado do filtro sobe via callback, não Context global.

## Metas de performance (objetivas, validadas em CI)

| Métrica                      | Meta    |
| ---------------------------- | ------- |
| Primeiro carregamento        | < 2s    |
| Troca de página              | < 300ms |
| Tamanho de cada dataset JSON | < 2MB   |

## Avaliação da Carta de dado (data-platform/validate/)

- Nenhuma métrica de contagem negativa.
- Total ≥ únicos (quando ambos existem no mesmo dataset).
- Datas em ordem crescente, sem campo obrigatório nulo.
- Falha de validação → publish aborta, dataset anterior permanece no ar (dado
  velho é preferível a dado errado).
