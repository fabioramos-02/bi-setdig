# data-platform/

Pipeline ETL que gera os datasets do portal. Roda **fora do runtime** (diário / sob demanda) e publica JSONs em [`../datasets/`](../datasets/) — o portal só lê esses arquivos, nunca chama API (ADR-001).

## Fluxo

```
extract → transform → validate → publish
(fontes)   (agrega)    (checa)    (datasets/ + catalog + log)
```

- **extract/** — clientes das fontes: `matomo.py` (portal web), `ga4.py` (app MS Digital), `cartas.py` (Postgres, exige VPN).
- **transform/** — agregações puras (sem I/O): `matomo.py`, `perfil.py` (adoção do filtro de Perfil), `servicos.py` (serviços reais mais acessados).
- **validate/rules.py** — campo obrigatório, não-negativo, breakdown por período. Falha aborta o publish (dado velho > dado errado).
- **publish/writer.py** — escreve `datasets/<fonte>/<versão>/<dataset>.json`, atualiza `catalog.json` e grava log.
- **schemas/** — contrato JSON de cada dataset; fonte da verdade dos tipos TS em `src/lib/data.ts`.

## Rodar

Em produção roda **automático**: [`.github/workflows/refresh-datasets.yml`](../.github/workflows/refresh-datasets.yml)
executa o pipeline todo dia (cron 06:00 UTC) e commita os datasets atualizados
— dispara o redeploy da Vercel. Também dá pra disparar sob demanda pela aba
Actions (`workflow_dispatch`). Cartas/Postgres fica de fora do cron (exige VPN
SETDIG); `run.py` isola falha por fonte, então as demais publicam mesmo assim.

Manual (dev, ou quando a planilha do catálogo muda):

```bash
pip install -r requirements.txt

# .env na raiz do repo:
#   MATOMO_URL, MATOMO_SITE_ID, MATOMO_TOKEN
#   GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_PROPERTY_ID
#   HOST, PORT, USER, PASSWORD, BANCO   (cartas — opcional, exige VPN SETDIG)

python data-platform/run.py                       # roda tudo (fonte indisponível não derruba as outras)
python data-platform/build_catalogo.py            # catálogo de serviços do app (lê o xlsx manual + enriquece com URL)
python data-platform/enriquecer_catalogo_com_url.py  # só re-casa URL no catálogo já publicado (sem reler o xlsx)
```

O catálogo do app ganha `url` por serviço via `data-platform/reference/ms_digital_catalogo_urls.py`
(cópia curada do repo irmão bench-carta) — casa por nome-folha/rótulo GA4,
~83% de cobertura; sem match fica `null` ("link não cadastrado" na UI).

## Convenções

- **ADR-004**: mudança de shape que quebra = nova pasta de versão (`v2`). GA4 está em `v2` (recorte por período).
- **ADR-007**: breakdowns só nos 4 períodos fixos `{dia, semana, mes, ano}`; "intervalo" cai em `mes`.
- **≤2MB por dataset**: agregar no transform, não despejar bruto.
- Sem chamada de API no portal — tudo passa por aqui primeiro.
