# Censo de serviços digitais — dados

Arquivo único: `v2/censo.json`, com a lista de órgãos e as cartas de cada um. É o retrato
**autodeclarado** pelos órgãos no questionário da Superintendência de Governo
Digital (SGD): cada órgão informou o grau de digitalização (0–5) de cada serviço.
Não tem filtro de período, porque cada arquivo é uma rodada do censo. Metodologia da escala em
[`docs/censo-maturidade.md`](../../docs/censo-maturidade.md).

`v1/` (3 órgãos, régua 0–4 classificada por IA) foi substituído pelo `v2` — ver
[ADR-015](../../docs/architecture/ADR-015-censo-autodeclarado.md).

## Shape

```jsonc
[
  {
    "orgaoSigla": "SEFAZ",
    "orgaoNome": "Secretaria de Estado de Fazenda de Mato Grosso do Sul",
    "cartas": [
      {
        "id": "sefaz-1",               // <sigla>-<ordem na aba>
        "titulo": "IPVA - consulta de débito",
        "setor": "...",
        "nivel": 5,                    // 0–5; null = órgão não informou
        "etapaPresencial": null,       // o que ainda é feito no balcão
        "demandaMensal": 595721,       // pedidos/mês; null = não informado ou ilegível
        "demandaTexto": null,          // texto original quando demandaMensal é null
        "slug": "...",                 // casado com cartas/v1/inventario-relacao
        "urlServico": "https://www.ms.gov.br/..."
      }
    ]
  }
]
```

Os tipos TypeScript (`LinhaCensal`, `OrgaoCenso`) e o cálculo dos indicadores
(% online, oportunidades, demanda) ficam em [`src/lib/censo.ts`](../../src/lib/censo.ts).

## Como atualizar (nova rodada do censo)

```bash
python data-platform/build_censo.py "caminho/da/planilha unificada.xlsx"
```

- O caminho padrão é `~/Downloads/planilha unificada.xlsx`.
- O xlsx **não** é versionado, porque traz o nome e o e-mail de quem preencheu. Esses campos não vão para o JSON.
- O script imprime:
  - a contagem por nível;
  - quantos serviços casaram com o inventário de cartas (link no portal);
  - quantos tiveram a demanda lida como número.
- A rota `/censo-digital/<sigla>` aparece sozinha para cada aba `Serviços <SIGLA>`.

## Etapas das cartas nível 4 (`v2/etapas-n4.json`)

Alimenta a aba "Nível 4 na prática" de `/censo-digital`: para cada serviço nível 4 com carta
ligada (`slug`), as etapas publicadas no Portal Único, para conferir se o
"100% online" declarado é formulário online/sistema ou baixar formulário e
mandar por e-mail. Classificação por palavra-chave em
[`src/lib/censo-n4.ts`](../../src/lib/censo-n4.ts). Decisão em
[ADR-016](../../docs/architecture/ADR-016-nivel-4-pelas-etapas-da-carta.md).

```jsonc
[{ "id": "aem-1", "slug": "...", "etapas": [{ "titulo": "...", "texto": "..." }],
   "linkAcesso": null, "linkIntegrado": false }]
```

Rode depois do `build_censo.py` (lê o `censo.json` publicado, não o xlsx).
Precisa de `PORTAL_API_KEY` no `.env` (header Authorization da API de serviços do portal):

```bash
python data-platform/build_etapas_n4.py
```
