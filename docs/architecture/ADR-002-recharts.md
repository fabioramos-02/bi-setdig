# ADR-002 — Recharts para gráficos do portal

## Contexto
O portal precisa de gráficos que respeitem o Design System MS e alternem tema
claro/escuro sem lógica JS de retematização.

## Decisão
Usar **Recharts**. É SVG puro — `fill`/`stroke` aceitam `var(--ds-*)` do CSS, então
o dark mode é resolvido só com a troca dos tokens em `[data-theme="dark"]`, sem
recalcular cor em JS.

## Alternativas rejeitadas
- **ECharts**: tema é objeto JS; trocar de tema exige ler `getComputedStyle` e
  re-renderizar; bundle 300KB+ mesmo com tree-shaking.
- **Plotly (react-plotly.js)**: >1MB de bundle, a11y fraca, sem ganho para os
  gráficos de barra/linha/pizza/KPI que os BIs atuais usam.

## Consequências
- ~100KB de bundle.
- Dark mode "de graça" via CSS — sem estado de tema duplicado no componente de
  gráfico.
