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

```bash
pip install -r requirements.txt

# .env na raiz do repo:
#   MATOMO_URL, MATOMO_SITE_ID, MATOMO_TOKEN
#   GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_PROPERTY_ID
#   HOST, PORT, USER, PASSWORD, BANCO   (cartas — opcional, exige VPN SETDIG)

python data-platform/run.py            # roda tudo (fonte indisponível não derruba as outras)
python data-platform/build_catalogo.py # catálogo de serviços do app (lê o xlsx manual)
```

## Convenções

- **ADR-004**: mudança de shape que quebra = nova pasta de versão (`v2`). GA4 está em `v2` (recorte por período).
- **ADR-007**: breakdowns só nos 4 períodos fixos `{dia, semana, mes, ano}`; "intervalo" cai em `mes`.
- **≤2MB por dataset**: agregar no transform, não despejar bruto.
- Sem chamada de API no portal — tudo passa por aqui primeiro.
