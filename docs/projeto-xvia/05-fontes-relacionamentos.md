# 05 — Fontes e relacionamentos

## Fontes (lista única em `FONTES_CONTRATO`, `src/lib/tfs.ts`)

| Fonte | Arquivo | Como chega | Atualização |
|---|---|---|---|
| TFS — backlog XVIA | `datasets/tfs/v1/itens.json`, `sprints.json`, `painel-time.json` | `python data-platform/run.py --domain tfs` (rede do Governo/VPN; `TFS_PAT`) | manual |
| Contrato (TR) | `contrato.json` | manual, do TR pós-parecer | quando o contrato muda |
| ETP | `etp-ust.json` | manual, memória de cálculo pp. 68–71 | fixo |
| Catálogos de UST | `catalogo-ust.json` (Governo), `catalogo-ust-xvia.json` | manual, da tabela de atividades do SCP | quando o catálogo muda |
| Órgãos | `stakeholders.json` | vault + manual | eventual |
| Financeiro do contrato | `financeiro.json` (schema `data-platform/schemas/tfs-financeiro.schema.json`) | manual, pela fiscalização/ATEC | a cada medição, nota e pagamento |

## Chaves

```
Epic ──< Feature ──< PBI/Bug ──< Task          (TFS: hierarquia; epicoId, featureId, pbiId)
PBI ──(Predecessor/Successor)── PBI            (dependeDe / trava)
Task.codigoCatalogo ── catalogo-ust-xvia (código) ── etp-ust (código)
Task.orgao ── stakeholders.sigla
```

### Órgão → serviço → Ordem de Serviço

- **Órgão** da Task: campo Órgãos/Secretarias (da Task, do PBI ou da Feature); sem ele, sigla no prefixo da Feature (`[SES] - Saúde`).
- **Serviço** = PBI pai da Task (`pbiId`, título do PBI). Não há catálogo oficial de serviços ligado.
- **Ordem de Serviço** (`financeiro.ordensServico`): `orgao` (sigla igual à do TFS), `servico`, `pbiIds` (opcional, liga a OS aos PBIs).

### Medição → nota fiscal → pagamento

```
ordensServico.numero ──< medicoes.os
medicoes.id          >──< notasFiscais.medicoes[]
notasFiscais.numero  ──< pagamentos.notaFiscal
glosas.medicao | glosas.notaFiscal
```

Recorte por órgão (`recorteFinanceiro`): OS do órgão → medições dessas OS → notas dessas medições →
pagamentos dessas notas. Registro que aponta chave inexistente vira divergência.

**Limite conhecido:** a soma por órgão no financeiro só funciona quando cada nota fiscal é de medições de
um órgão. Nota que junta órgãos diferentes aparece inteira em cada órgão: registrar uma nota por OS,
ou tratar isso quando surgir o primeiro caso.

## TFS — extração

`data-platform/extract/tfs.py`: árvore a partir dos Epics não removidos (item fora de Epic não entra),
campos `CAMPOS`, relations e sprints do `XVIA Team`. API 4.1. Transformação pura em
`transform/tfs.py:montar_itens`.
