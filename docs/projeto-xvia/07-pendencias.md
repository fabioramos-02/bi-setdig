# 07 — Pendências e limitações

Estado em 11/11/2026. Responsáveis são sugestões, a confirmar.

## Dados que ainda não existem

| Falta | Efeito no BI | Ação | Quem |
|---|---|---|---|
| Ordens de Serviço, medições, aceite, notas fiscais, pagamentos e glosas | Etapas "Não informado" no relatório e no financeiro | Preencher `datasets/tfs/v1/financeiro.json` (modelo no arquivo) | Fiscalização / ATEC (há Task "[SGD] - Levantar com a ATEC a fonte das Ordens de Serviço e do aceite") |
| Relatório de SLA da X-VIA (TR 4.3.1) | Seção 6 mostra a tabela do TR e "ainda não medido" | Pedir à X-VIA o relatório mensal de prazos de atendimento, com a gravidade de cada chamado, e lançar em `contrato.json` → `ans.medicao` (ou num campo `sla` do financeiro.json, a decidir) | SGD / X-VIA |
| Itens 1 e 2 do contrato (licença e implantação, preço global) | Não acompanhados | Registrar marcos e pagamentos desses itens | SGD |
| Marcos formais (aceite de etapa) | Seção 5 só mostra o cronograma por sprint | Registrar marcos no financeiro ou no TFS | SGD |
| Campo Faturado do TFS | Vazio em todos os itens | Usar o financeiro.json ou preencher o campo | X-VIA |

## Qualidade do dado (retrato de 11/11/2026)

| Lacuna | Qtd. | Ação |
|---|---|---|
| Tasks sem frente identificada (sem contrato, fora das áreas) | 185 (52 Done; 93 com atividade do catálogo Governo, sem empresa) | Marcar o contrato na Task |
| Tasks da X-VIA sem código do catálogo | 162 | X-VIA marcar a atividade |
| Tasks com contrato X-VIA e responsável da SGD | 5 (#1349226, #1351267, #1367487, #1367488, #1367489) | Conferir o contrato marcado. **Antes não contavam; agora contam** (o contrato manda) |
| Entregas X-VIA com responsável da SGD | 11 (ex.: #1338539) | Conferir se falta `[SGD]` no título ou a área `XVIA\SGD` |
| Entregas abertas sem sprint / sem responsável | 79 / 91 | Planejar no TFS |
| Tasks X-VIA Done sem órgão | 22 | Preencher Órgãos/Secretarias no PBI |
| 240 UST do ETP em linhas sem código | — | Nunca atribuíveis por código; ficam fora do previsto por atividade |

## Divergências conhecidas

- **UST de novembro alta (500) e de outubro baixa (47):** pela data de fechamento, a X-VIA fechou tarefas em lote em novembro; pela Data da Execução, o mês 10 teria 337. O BI usa o fechamento (mesma regra do painel do TFS). A conferir com a X-VIA.
- **"Ata de reunião" como PBI da X-VIA** (ex.: #1373754) conta como entrega concluída. É a forma como a X-VIA registra: se não for entrega, ajustar no TFS.

- ~~% em produção: BI 30% × painel do TFS 40%~~ **Resolvido em 11/11/2026:** o `src.painel` passou a usar a régua do BI (só entregas da X-VIA, em produção = coluna Em Produção). Os dois mostram 75 de 246 (30%), 10 impedidos e 12 aguardando decisão.

## Limitações técnicas

- O TFS só é extraído à mão, na rede do Governo: o retrato envelhece. A Qualidade avisa quando passa de 7 dias.
- O cronograma usa a sprint, não Start/Target Date: o TFS 2018 não usa essas datas no plano, e elas estão pouco preenchidas (#1375476).
- Uma nota fiscal que junte órgãos diferentes aparece inteira em cada órgão (ver 05).
- O histórico de alterações não é extraído: só a última alteração; o histórico fica no item do TFS.

## Fora do escopo desta refatoração

- Abas que não são da X-VIA (portal-ms, serviços, sites…) e os arquivos com mais de 250 linhas delas.
- `datasets/logs` (mais de 1.000 arquivos versionados) e `datasets/ga4/v1` (obsoleto).
- Rodar o pytest no CI (`.github/workflows/ci.yml`): é uma linha e depende do ok do Fabio.
