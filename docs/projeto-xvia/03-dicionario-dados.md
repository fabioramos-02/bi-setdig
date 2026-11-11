# 03 — Dicionário de dados (indicadores)

Funções em `src/lib/tfs.ts` (salvo indicação). "Hoje" = data da extração do TFS. Valores do retrato
de 11/11/2026, para conferência.

| Indicador | Pergunta | Fonte / campo | Regra | Filtros | Período | Valor 11/11 | Limitação |
|---|---|---|---|---|---|---|---|
| Mês do contrato | Em que mês estamos? | contrato.json `inicio`, `vigenciaMeses` | mês civil desde a assinatura (assinatura = 1), limite 18 (`prazoProjeto`) | não | hoje | 6 | — |
| % do prazo | Quanto do prazo passou? | idem | dias decorridos / dias da vigência | não | hoje | 30% | — |
| UST executada | Quanto do contrato a X-VIA usou? | TFS Task: `empresa`, `codigoCatalogo`, `ust`, `estado` | soma de `ustDaTarefa` das Tasks `ehTarefaXvia` Done (`execucaoXvia`) | sim | acumulado | 553 | depende do código do catálogo na Task |
| UST lançada | Quanto está planejado em tarefas? | idem | mesma regra, todas as Tasks com valor | sim | acumulado | — | — |
| % executado | Quanto do contratado foi usado? | + contrato.json `ustTotalTr` | executada / 23.356 | não compara com recorte | acumulado | 2,4% | — |
| Previsto até o mês | Quanto o TR previa até agora? | contrato.json `previsaoMensal` | soma meses 1..N (`consumoContrato`) | só sem filtro | até o mês N | 8.659 | tabela do TR, não OS |
| Valor consumido | Quanto em R$ foi executado? | + `valorUst` | UST executada × 154,61 | sim | acumulado | R$ 85.499,33 | é cálculo, não faturamento |
| UST no mês | O que foi feito no mês? | Task `fechadoEm` (senão `dataExecucao`) | `executadoPorMes` | sim | mês | nov: 500; out: 47 | X-VIA fecha em lote; ver 07 |
| UST por órgão / serviço | Quanto cada órgão consumiu? | Task `orgao`, `pbiId` | `consumoPorOrgao` (mesma regra; sem órgão = linha própria) | sim | acumulado | soma = total | 22 Tasks Done sem órgão |
| Entregas em produção | Quanto do planejado está disponível? | PBI/Bug `coluna` | coluna "Em Produção" / entregas não removidas, só X-VIA (`andamentoEntregas(soXvia)`) | sim | hoje | 75 de 246 (30%) | depende do board atualizado |
| Atrasadas | O que passou do prazo? | `sprint`, `prazo` + sprints | aberta e sprint encerrada ou Target Date vencido (`atrasadas`) | sim | hoje | 72 (X-VIA) | Target Date pouco preenchido |
| Pendências | O que está travado? | `coluna`, `tags` | Aguardando decisão, Impedido ou etiqueta Dependência (`pendencias`) | sim | hoje | 41 (X-VIA) | — |
| Em risco (cronograma) | O que pode atrasar por dependência? | `dependeDe`, `trava`, sprints | `lib/cronograma.ts:situacoes` | sim | hoje | 3 | só dependências registradas (48 ligações X-VIA) |
| UST previstas (OS), aceitas, faturado, pago, pendente, glosado | Quanto foi pedido, aceito, cobrado e pago? | financeiro.json | `cadeiaFinanceira` | por órgão | acumulado | Não informado | sem registros ainda |
| Itens sem frente | O que não dá para atribuir? | `frente = Não identificado` | `qualidadeDados` | sim | hoje | 185 Tasks | precisa marcar contrato |

## Campos do item (`datasets/tfs/v1/itens.json`)

| Campo | Origem no TFS | Observação |
|---|---|---|
| `frente` | calculado (`transform/tfs.py:frente`) | X-VIA, SGD ou Não identificado (ADR-017) |
| `empresa` | `Custom.SGI.Empresa` | contrato marcado na Task |
| `ust` | `Custom.SGI.LancamentoAtividadeID` → catálogo do contrato | só Task |
| `codigoCatalogo` | `Custom.SGI.AtividadeUST` ou "Catálogo XXX.NN" na descrição | — |
| `orgao` / `orgaoOrigem` | `Custom.SGD.OrgaosSecretarias` (item, PBI, Feature) ou prefixo da Feature | — |
| `dependeDe` / `trava` | links Predecessor / Successor | Related não conta |
| `fechadoEm` | `Microsoft.VSTS.Common.ClosedDate` | mês da execução |
| `dataExecucao` | `Custom.SGI.DataExecucao` | pouco preenchida pela X-VIA |
| `timeSgd` | login do responsável ∈ time SGD | **só alerta**, não classifica |
| `faturado`, `dataFaturamento` | `Custom.SGI.Faturado`, `DataFaturamento` | vazios no TFS |
