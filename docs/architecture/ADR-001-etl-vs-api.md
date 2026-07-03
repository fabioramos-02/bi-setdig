# ADR-001 — ETL agendado → datasets estáticos, não API ao vivo

## Contexto
O portal precisa de dados de 3 fontes: Matomo (API HTTP), GA4 (OAuth2) e Postgres
de cartas de serviço (acessível só via VPN). O portal roda na Vercel.

## Decisão
Um ETL agendado (`data-platform/`, GitHub Actions, cron diário) extrai, valida e
publica os dados como JSON versionado em `datasets/`, commitado no próprio repo.
O portal Next.js lê esses arquivos estáticos em build/SSG — nunca chama as fontes
originais em runtime.

## Alternativas rejeitadas
- **Route handlers/ISR chamando as APIs direto**: a Vercel não alcança o Postgres
  (exige VPN); rate limits do Matomo/GA4 tornam runtime caro; secrets ficariam
  expostos a mais superfície.
- **Vercel Cron + KV/Blob**: duplica um ETL que já funciona hoje
  (`matomo/.../run_export.py` + `data_sync.yml`) e soma um serviço a mais.
- **Repo de dados separado**: só adiciona um webhook de revalidação sem ganho
  imediato — migrar para lá depois, se o histórico de commits de dados incomodar.

## Consequências
- Commit em `datasets/` dispara redeploy automático — zero configuração extra.
- Dados de Postgres (cartas) ficam com cadência mais baixa (extração manual via
  VPN, semanal) até haver runner self-hosted.
- `run_export.py`/`data_sync.yml` do repo matomo continuam intocados enquanto o
  Qlik depender deles — desacoplar só na Fase 3.
