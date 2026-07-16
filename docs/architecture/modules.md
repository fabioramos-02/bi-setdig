# Módulos e domínios

## Domínios (ver ADR-005)

| Domínio | Rota | Fonte de dados | Origem histórica |
|---|---|---|---|
| Portal Único | `/analytics/portal-ms` | Matomo | 5 abas `matomo` + painel 1 `bench-carta` |
| MS Digital | `/analytics/ms-digital` | GA4 | 4 abas `matomo` + painel 2 `bench-carta` |
| Serviços | `/servicos` | Postgres cartas + JSON maturidade | 6 abas cartas `matomo` + `mapeamento-inicial` |
| Avaliação da Carta | `/qualidade` | Postgres cartas | `cruzamento-carta` |
| Governança | `/governanca` | Matomo (estudos) | estudo filtro-perfil do `bench-carta` |

## Estrutura de código (portal)

```
components/ds/          wrappers React sobre ds-sis — sem estilo próprio
components/dashboard/   biblioteca de composição de dashboard (cards, KPI, grid)
components/charts/      wrappers Recharts temados via var(--ds-*)
components/filters/     filtros reutilizáveis entre domínios (data, órgão, categoria)
modules/<dominio>/      lógica de apresentação específica do domínio — sem fetch
lib/data.ts             único ponto de leitura de datasets/
```

Regra de dependência: `app/**/page.tsx` → `modules/*` → `components/*`. Nunca o
inverso — um componente de `components/` não conhece um domínio específico.
