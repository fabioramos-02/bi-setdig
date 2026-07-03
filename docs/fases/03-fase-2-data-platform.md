# Fase 2 — Data Platform

**Status: 🟡 POC rodando contra fontes reais (Matomo + GA4). Postgres bloqueado por VPN. Generalização pros ~15 datasets pendente.**

## Intuito

Hoje cada BI tem seu próprio cliente Matomo/GA4 (duplicado entre `matomo` e
`bench-carta`) e o portal novo não pode chamar Matomo/GA4/Postgres direto em
runtime (Vercel não alcança o Postgres via VPN; rate limits; secrets expostos
à toa). Solução: um projeto Python independente (`data-platform/`) que
extrai, valida e publica os dados como JSON versionado — o portal só lê
arquivo. Decisão registrada em `docs/architecture/ADR-001-etl-vs-api.md` e
`ADR-004-json-datasets.md`.

## O que foi feito (POC)

Credenciais reais chegaram (Matomo token, GA4 OAuth, Postgres) — desbloqueou
provar o pipeline de ponta a ponta antes de generalizar. Rodado com sucesso:

```
python data-platform/run.py
[matomo] ok -> datasets/matomo/v1/visitas-resumo.json  (visitas=36652, únicos=29900)
[ga4]    ok -> datasets/ga4/v1/visao-geral.json         (4 linhas)
[cartas] FALHOU: could not translate host name "s0845.ms" — sem VPN daqui
```

- `extract/matomo.py`: porta mínima de `api/matomo_client.py` (repo matomo) —
  só `VisitsSummary.get`, sem Streamlit, lê `.env` direto.
- `extract/ga4.py`: porta mínima de `api/google_analytics_client.py` — só
  `get_overview` (newVsReturning × activeUsers/sessions/screenPageViews).
- `extract/cartas.py`: conexão Postgres (`psycopg2`), pronta pra rodar de
  máquina com VPN — falhou como esperado aqui, **sem derrubar matomo/ga4**
  (cada fonte roda isolada em `run.py`, erro de uma não aborta as outras).
- `validate/rules.py`: checagens simples (campo obrigatório, não-negativo) em
  Python puro — **sem `jsonschema`** (não instalado, e checagem de 2-3 campos
  não justifica motor genérico ainda; reavaliar quando o número de regras
  crescer, ver ladder do ponytail).
- `publish/writer.py`: escreve `datasets/<fonte>/v1/<dataset>.json`, faz
  upsert em `datasets/catalog.json`, grava `datasets/logs/<timestamp>.json`,
  aborta se o dataset passar de 2MB (meta de `convencoes.md`).
- `schemas/{matomo-visitas-resumo,ga4-visao-geral}.schema.json`: contrato dos
  2 datasets publicados.
- `requirements.txt`: `requests`, `python-dotenv`, `google-analytics-data`,
  `google-auth`, `psycopg2-binary` (todas já estavam instaladas globalmente
  nesta máquina — `pip install -r` ainda não testado num venv limpo).

`transform/` **ficou vazio propositalmente** — com só 2 datasets, a
normalização cabe inline em `run.py`; criar módulo separado por dataset só
quando o padrão se repetir (YAGNI).

## Estrutura atual

```
data-platform/
├── extract/        matomo.py, ga4.py, cartas.py — feito (ver acima)
├── transform/       vazio — normalização ainda cabe inline em run.py
├── validate/       rules.py — feito, Python puro
├── publish/        writer.py — feito
├── schemas/        2 de ~15 feitos
├── run.py          orquestrador do POC — extract→validate→publish, 3 fontes
└── outputs/        staging local (ainda sem uso — publish escreve direto
                    em ../datasets/, staging entra se o transform ficar
                    pesado o suficiente pra precisar de passo intermediário)
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

1. **Cartas/Postgres**: rodar `python data-platform/run.py` de uma máquina
   conectada na VPN da SETDIG pra validar `extract/cartas.py` de verdade
   (aqui só validei que o código está certo e falha do jeito esperado sem
   VPN — não validei contra o banco real ainda).
2. Generalizar `extract/matomo.py` e `extract/ga4.py` pros outros datasets
   listados em "Datasets a publicar" abaixo — copiar mais métodos de
   `api/matomo_client.py`/`api/google_analytics_client.py` (repo `matomo`)
   seguindo o mesmo padrão (função pura, lê `.env`, sem Streamlit).
3. Escrever o schema de cada dataset novo antes do transform (ADR-004).
4. Decidir GitHub Actions (cron 06:00 UTC) só depois de ter mais de 1 dataset
   por fonte — não vale o setup de CI pra rodar 2 chamadas de API.
5. `requirements.txt` existe mas nunca foi testado num ambiente limpo — rodar
   `pip install -r data-platform/requirements.txt` num venv novo antes de
   confiar nele em CI.
