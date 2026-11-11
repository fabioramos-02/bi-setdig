# 04 — Regras de negócio

## Separação X-VIA × SGD (ADR-017)

Classificação no pipeline (`data-platform/transform/tfs.py:frente`), gravada no campo `frente` de
cada item. **Nunca pelo nome do responsável.**

| Item | Regra | Frente |
|---|---|---|
| Task com `Custom.SGI.Empresa` do contrato X-VIA | contrato | X-VIA, em qualquer área |
| Task com contrato "Governo do Estado" | contrato | SGD |
| Task sem contrato em `XVIA\Customização UST` | área faturada | X-VIA |
| Task sem contrato, na área `XVIA\SGD*`, com título `[SGD]` ou no épico 1333593 | pista explícita | SGD |
| Task sem contrato, sem pista | — | **Não identificado** |
| PBI, Bug, Feature, Epic | área `XVIA\SGD*`, título `[SGD]` ou épico 1333593 | SGD; senão X-VIA |

- **Não identificado** fica fora de todo total da X-VIA e aparece em Qualidade e em Equipes para validação.
- Trava no ponto do dinheiro (`ehTarefaXvia`, `tfs.ts`): Task com contrato que não é da X-VIA nunca soma, mesmo com snapshot antigo ou frente errada.
- O responsável (`timeSgd`) só gera **alerta** em Qualidade, sem classificar: "Tarefas com contrato da X-VIA e responsável do time SGD" e "Entregas contadas como X-VIA com responsável do time SGD".
- Caso real: Task #1372987 (área `XVIA\SGD`, contrato X-VIA, Edielson) conta como X-VIA.

## UST

- **Só Task fatura e leva UST** (Fabio, 11/11/2026). PBI/Feature/Epic nunca têm valor (pipeline zera; cálculo filtra `tipo === "Task"`).
- Valor da Task (`ustDaTarefa`, regra única do total, da soma por órgão e da soma por mês):
  1. código do catálogo na Task (atividade marcada; sem ela, "Catálogo XXX.NN" na descrição);
  2. valor = UST do catálogo X-VIA; sem ele, UST unitária do ETP;
  3. código fora do ETP com valor no catálogo X-VIA conta, com previsto 0;
  4. sem código, faixa (`NEG.03/04/05`) ou código inexistente: **a classificar**, fora da soma.
- Lançada = todas as Tasks com valor; **executada = só as Done**.
- Executada no mês: mês da data de fechamento (`fechadoEm`); sem ela, a Data da Execução.
- Task sem contrato na área faturada nunca recebe valor do catálogo do Governo.

## Contrato

- Contratado: 23.356 UST (TR 1.1); valor da UST: R$ 154,61 (TR 9.3).
- Mês do contrato: **mês civil**, a assinatura (01/06/2026) é o mês 1; nov/2026 = 6. Limite 18.
- Previsto até o mês: soma da tabela TR 3.3.3 até o mês corrente; **mês 18 = 228** (fecha 23.356).
- Consumo de UST **não** é % de conclusão: andamento = entregas em produção / entregas planejadas.

## Faturamento, pagamento e aceite

Cada etapa tem a própria fonte, data e status, e **nenhuma é deduzida da anterior**
(`cadeiaFinanceira`):

| Etapa | Fonte | Sem registro |
|---|---|---|
| UST previstas | Ordens de Serviço (financeiro.json) | Não informado |
| UST executadas | TFS (calculado) | — |
| UST aceitas | Medições com `ustAceita` | Não informado |
| Valor consumido | UST executadas × R$ 154,61 (calculado) | — |
| Faturado | Notas fiscais não canceladas | Não informado |
| Pago | Pagamentos com status `pago` | Não informado |
| Pendente | Faturado − pago (calculado só com faturado registrado) | Não informado |
| Glosado | Glosas | Não informado |

Situação de cada valor: `confirmado` (registro), `calculado`, `ausente`, `divergente`.
**Divergência** nunca é corrigida em silêncio: medição para OS inexistente, nota para medição
inexistente, pagamento para nota inexistente, aceite maior que o executado, pago maior que a nota.
Todas aparecem em Qualidade e no Detalhamento B.

## Entregas

- Entrega = PBI ou Bug não removido. Em produção = coluna "Em Produção".
- Atrasada = aberta e (sprint encerrada ou Target Date vencido).
- Pendência = coluna Aguardando decisão/Impedido ou etiqueta Dependência.
- Cronograma: risco = não concluído com predecessor atrasado, sem sprint ou na mesma sprint/posterior. PBI da SGD antigo (sprint encerrada, fora de cadeia) fica em "pendências antigas da SGD", fora do atraso.
- Dependência = só link Predecessor/Sucessor (Related não conta).
