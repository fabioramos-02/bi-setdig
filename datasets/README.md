# datasets/

Dados **publicados** que o portal lê em build-time. Nenhuma chamada de API em runtime (ADR-001) — o portal só lê estes JSONs.

Gerados pelo pipeline em [`../data-platform/`](../data-platform/). **Não edite à mão.**

## Estrutura

```
datasets/
├── catalog.json          # índice de todos os datasets (fonte, versão, linhas, bytes, updatedAt)
├── <fonte>/<versão>/<dataset>.json
└── logs/                 # 1 registro por execução do pipeline (ok/rows/bytes)
```

- **fonte**: `matomo` (portal web), `ga4` (app MS Digital), `app` (catálogo manual), `cartas` (inventário).
- **versão**: `vN`. Mudança de shape que quebra = nova pasta (ADR-004). Ex.: GA4 virou `v2` ao ganhar recorte por período.
- **schema**: cada dataset tem um contrato em [`../data-platform/schemas/`](../data-platform/schemas/) — fonte da verdade dos tipos TS em `src/lib/data.ts`.

## Datasets

| Fonte | Dataset | Formato | Descrição |
|-------|---------|---------|-----------|
| matomo | visitas-diarias | série | Visitas/únicos/ações por dia (desde 2024) |
| matomo | visitas-resumo | snapshot | Resumo do mês |
| matomo | navegadores, dispositivos, horarios, geografia | por período¹ | Breakdowns do portal |
| matomo | paginas-mais-acessadas | top 20 | Páginas por visitas |
| matomo | busca | top 20 | Termos buscados |
| matomo | perfil-filtro | por período¹ | Estudo de adoção do filtro de Perfil |
| matomo | servicos-mais-acessados | por período¹ | Serviços reais do portal por visitas |
| ga4 | visao-geral, plataforma, servicos, funil, horarios | por período¹ (v2) | Uso do app MS Digital |
| app | catalogo-servicos | lista | 121 serviços do app: categoria, nativo/web, ativo, url (só web, ~83% cadastrada) |
| cartas | inventario-count | 1 linha | Total de cartas de serviço |

¹ **por período** = objeto com 4 chaves `{ dia, semana, mes, ano }` (ADR-007). "Intervalo de datas" cai no snapshot `mes`.

## Atualização

Atualizados **automaticamente** todo dia pelo cron [`.github/workflows/refresh-datasets.yml`](../.github/workflows/refresh-datasets.yml) (roda o pipeline + commita) — antes disso os JSONs ficavam presos no último `python run.py` manual. Pra rodar sob demanda: aba Actions → "Refresh datasets" → Run workflow, ou local:

```bash
python ../data-platform/run.py
```
