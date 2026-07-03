# Fluxo de dados

```
Matomo API ──┐
GA4 API ─────┼─→ data-platform/extract → transform → validate → publish ─┐
Postgres ────┘        (Python, projeto independente)                    │
  (via VPN,                                                              ▼
   manual/semanal)                                          datasets/<fonte>/v1/*.json
                                                              datasets/catalog.json
                                                              datasets/logs/<execução>.json
                                                                          │
                                                              commit + push (GitHub Actions,
                                                              cron 06:00 UTC p/ matomo+ga4)
                                                                          │
                                                                          ▼
                                                              redeploy automático Vercel
                                                                          │
                                                                          ▼
                                                    portal/src/lib/data.ts (lê datasets/,
                                                    valida contra schema, tipa via TS)
                                                                          │
                                                                          ▼
                                                    portal/src/app/(plataforma)/**/page.tsx
                                                    (SSG — nunca chama Matomo/GA4/Postgres
                                                     em runtime)
```

Regra: nenhum componente do portal importa cliente HTTP de fonte externa. Toda
leitura passa por `lib/data.ts`, que só conhece `datasets/`.

Qlik Sense continua lendo `matomo/matomo-analytics-dashboard/exports/*.csv`,
gerado por `run_export.py` — pipeline paralelo, desacoplado deste fluxo até a
Fase 3 decidir a transição.
