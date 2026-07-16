# Censo de maturidade digital — dados

Um arquivo por órgão: `v1/<sigla>.json`. Retrato **estático** (snapshot) do
estado de cada carta de serviço na régua de maturidade 0–4. Diferente das outras
fontes, **não é gerado pelo pipeline `data-platform/`** nem tem filtro de período
— é um congelamento manual da classificação (IA + revisão humana). Metodologia da
escala em [`docs/censo-maturidade.md`](../../docs/censo-maturidade.md).

## Shape

```jsonc
{
  "orgaoSigla": "IAGRO",
  "orgaoNome": "Agência Estadual de Defesa Sanitária...",
  "cartas": [
    {
      "id": "1406",
      "titulo": "Atualizar cadastro de núcleo avícola comercial",
      "nomePopular": "...",
      "slug": "...",              // slug no portal ms.gov.br
      "urlServico": "https://www.ms.gov.br/...",
      "urlExterno": null,          // sistema externo, se houver
      "nivel": 2,                  // 0–4 (ver docs/censo-maturidade.md)
      "etapaBloqueio": "Entrega presencial da documentação...", // o que trava
      "falaSistema": true,         // menciona algum sistema/plataforma
      "sistemaCitado": "e-Saniagro",
      "justificativa": "..."       // por que recebeu esse nível
    }
  ]
}
```

Os tipos TypeScript (`LinhaCensal`, `OrgaoCenso`) e o cálculo dos indicadores
(% online, "a um passo", distribuição) vivem em [`src/lib/censo.ts`](../../src/lib/censo.ts).

## Como adicionar um órgão

1. No repo de origem (`mapeamento-inicial-servicos-digitais`), gerar a
   classificação do órgão (`exports/<sigla>/cartas.json` + `data/<sigla>/maturidade.json`).
2. Rodar o join/trim (script one-shot que produziu estes arquivos) para gerar
   `v1/<sigla>.json` no shape acima.
3. Registrar a sigla em `SIGLAS_CENSO` (`src/lib/censo.ts`).
4. Adicionar a entrada em `datasets/catalog.json`.

A rota `/censo-digital/<sigla>` é gerada automaticamente (`generateStaticParams`).
