# MS Digital — Levantamento e BI de Contas

Docs de apoio à feature "BI de Contas MS Digital" (aba `Contas` em
`analytics/ms-digital/`, alimentada por SQL Server `MS_digital`).

Plano completo: `~/.claude/plans/feature-levantamento-e-sequential-pie.md`.

## Fluxo

| PBI | Doc | Estado |
|---|---|---|
| 1 — Levantamento do BD | `schema-dump.md` (gerado) | pendente |
| 2 — Mapeamento Qlik → BD | `qlik-mapping.md` | pendente |
| 3 — Indicadores de retenção | `indicadores-inatividade.md` | pendente |
| 4 — Spec dos indicadores | `spec-contas.md` | pendente |
| 6 — Validação vs Qlik | `validacao-vs-qlik.md` | pendente |

## Rodar introspecção (PBI 1)

Exige VPN da SETDIG + envs `MSDIGITAL_*` no `.env` local.

```bash
pip install -r data-platform/requirements.txt
python data-platform/scripts/introspect_msdigital.py
```

Saída: `docs/msdigital/schema-dump.md` (tabelas, colunas, PKs/FKs, contagens).
