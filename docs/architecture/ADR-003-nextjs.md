# ADR-003 — Next.js (App Router) como portal único

## Contexto
4 BIs fragmentados em Streamlit e HTML estático, sem componentização
compartilhada, hospedagem já na Vercel para 2 deles.

## Decisão
Um único app Next.js (App Router), single app (sem monorepo — 1 dev, sem
segundo consumidor do código hoje), com rotas por domínio de negócio
(`/analytics/*`, `/servicos`, `/qualidade`, `/governanca`), consumindo o DS-MS
via wrappers React finos (consumo real via cópia de fonte, não npm — ver
ADR-006).

## Alternativas rejeitadas
- **Manter Streamlit**: não consome o DS como componentes (é Python), contraste
  dark/light exige gambiarra de CSS injetado, sem SSG/CDN.
- **Monorepo (Turborepo etc.)**: infraestrutura para múltiplos pacotes/consumidores
  que não existem ainda — YAGNI. Reavaliar se surgir um segundo app consumindo o
  mesmo código.

## Consequências
- Deploy único na Vercel, preview por PR.
- Estrutura por domínio (não por "projeto antigo") — novo painel = nova rota,
  não novo repositório.
