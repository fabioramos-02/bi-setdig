# ADR-004 — Datasets JSON versionados e catalogados

## Contexto
Dados de 3 fontes heterogêneas (Matomo, GA4, Postgres) precisam de um contrato
estável entre o ETL (`data-platform/`) e o portal, sem acoplar o portal ao
formato interno de cada fonte.

## Decisão
- Cada dataset é um arquivo JSON em `datasets/<fonte>/v<N>/<nome>.json`,
  validado contra um schema em `data-platform/schemas/*.schema.json`.
- Um `datasets/catalog.json` indexa todos os datasets: `dataset`, `owner`,
  `updatedAt`, `frequency`, `version`, `source`, `schema`.
- Breaking change de schema → nova pasta `v2/`; dashboards migram no próprio
  ritmo; o catálogo aponta a versão vigente.
- Tipos TypeScript são gerados dos schemas (`json-schema-to-typescript`) — o
  schema é a fonte da verdade, não o tipo TS.

## Consequências
- Portal nunca lê Postgres/Matomo/GA4 diretamente — só `datasets/`.
- Avaliação da Carta de dado é responsabilidade do publish (ver `data-platform/validate/`),
  não do consumidor.
- Tamanho de dataset é uma restrição de design: meta <2MB por arquivo (ver
  metas de performance) — agregações no transform, nunca dado bruto.
