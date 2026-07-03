# Fase 2 — Data Platform

**Status: ⬜ não iniciada**

## Intuito

Hoje cada BI tem seu próprio cliente Matomo/GA4 (duplicado entre `matomo` e
`bench-carta`) e o portal novo não pode chamar Matomo/GA4/Postgres direto em
runtime (Vercel não alcança o Postgres via VPN; rate limits; secrets expostos
à toa). Solução: um projeto Python independente (`data-platform/`) que
extrai, valida e publica os dados como JSON versionado — o portal só lê
arquivo. Decisão registrada em `docs/architecture/ADR-001-etl-vs-api.md` e
`ADR-004-json-datasets.md`.

## Por que não começou

Precisa de credenciais reais que a sessão que gerou este doc não tinha:
`MATOMO_TOKEN`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REFRESH_TOKEN`
(ou idealmente trocar por service account, ver riscos), e acesso VPN ao
Postgres da SETDIG. Sem isso dá pra montar a estrutura e a lógica de
validação, mas não dá pra rodar um extract de verdade contra as fontes.

## Estrutura a criar

```
data-platform/
├── extract/        matomo.py, ga4.py, cartas.py — portar a lógica que já
│                   existe e funciona em matomo/matomo-analytics-dashboard/
│                   (api/matomo_client.py, api/google_analytics_client.py) e
│                   bench-carta/src/matomo/client.py, src/ga4/client.py.
│                   Não reescrever do zero — os clientes atuais já resolvem
│                   paginação, timeout, chunking.
├── transform/      normalização por dataset (uma função por dataset final)
├── validate/       schema (jsonschema) + regras de qualidade (ver abaixo)
├── publish/        escreve em ../datasets/<fonte>/v<N>/, atualiza catalog.json
│                   e datasets/logs/<execução>.json
├── schemas/        *.schema.json — fonte da verdade, gera tipos TS
└── outputs/        staging local antes do publish
```

## Datasets a publicar (mínimo viável — ver `docs/architecture/data-flow.md`)

- `datasets/matomo/v1/{pageviews,usuarios,sessoes,devices,buscas,servicos}.json`
- `datasets/ga4/v1/{visao-geral,categorias,servicos,jornada}.json`
- `datasets/cartas/v1/{inventario,erros,votos,maturidade,perfis}.json`
- `datasets/shared/v1/{orgaos,categorias}.json`
- `datasets/catalog.json` — índice de tudo acima

Campos do `catalog.json` por entrada: `dataset`, `owner`, `updatedAt`,
`frequency`, `version`, `source`, `schema`.

## Regras de qualidade (`validate/`, além do schema)

- Nenhuma métrica de contagem negativa.
- Total ≥ únicos, quando os dois existem no mesmo dataset.
- Datas em ordem crescente, sem gap inesperado.
- Campo obrigatório nunca nulo.
- **Falha de validação → publish aborta**, dataset anterior continua no ar.
  Dado velho é preferível a dado errado.

## Orquestração

```
GitHub Actions (repo refatoracao-bi), cron 06:00 UTC
  ├─ job matomo+ga4 (runner hospedado): extract → transform → validate → publish
  │    → commit datasets/ → push → redeploy Vercel automático
  └─ cartas (Postgres via VPN): rodar de máquina com VPN (cadência semanal,
       documentar procedimento manual); avaliar runner self-hosted com a SETDIG
```

## Riscos / decisões pendentes

- **Secrets Matomo/GA4 em Actions**: GitHub Secrets; para GA4, trocar OAuth2
  interativo (usado hoje) por **service account** — elimina o refresh token
  manual. Decisão de quem provisiona a service account no GCP da SETDIG.
- **Postgres via VPN**: nenhum runner hospedado alcança. Definir se alguém
  roda manualmente toda semana ou se vale um runner self-hosted na rede da
  SETDIG.
- **Tamanho de dataset**: meta <2MB (ver `convencoes.md`) — agregar no
  transform, nunca publicar dado bruto.
- **Não mexer** em `matomo/matomo-analytics-dashboard/run_export.py` nem
  `.github/workflows/data_sync.yml` — o Qlik depende deles até a Fase 3
  decidir a transição.

## Como retomar

1. Conseguir as credenciais (perguntar pra quem administra Matomo/GA4/Postgres
   da SETDIG hoje, provavelmente STI).
2. Copiar a lógica de `api/matomo_client.py` e `api/google_analytics_client.py`
   (repo `matomo`) pra `data-platform/extract/`, adaptando só a saída (retornar
   dict/DataFrame cru, sem os `@st.cache_data` do Streamlit).
3. Escrever 1 schema por dataset antes de escrever o transform — schema é a
   fonte da verdade (ADR-004).
4. Rodar o pipeline local contra 1 dataset só (ex.: `pageviews`) de ponta a
   ponta antes de generalizar pros outros 14.
