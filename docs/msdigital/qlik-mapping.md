# Mapeamento Qlik → BD `MS_digital`

Cada card/gráfico do dashboard Qlik atual (imagem `docs/image.png`) mapeado ao
campo real do BD, com número apurado em 2026-08-17 (VPN, banco vivo).

## KPIs

| Componente Qlik | Nº Qlik | Nº BD (2026-08-17) | Tabela.Coluna | Agregação |
|---|---:|---:|---|---|
| Contas Ativas | 343.729 | **343.803** | `dbo.Conta.ativo` | `COUNT WHERE ativo = 1` |
| Total de Contas | 367.433 | **367.508** | `dbo.Conta` | `COUNT(*)` |
| Matrículas | 20.591 | **20.596** | `dbo.CarteiraFuncional` | `COUNT(*)` (PK é `matricula`) |

Diferença de +74/+75/+5 = crescimento entre snapshot do Qlik e apuração atual.
Dentro da tolerância <0.1% (PBI 6).

## Gráficos

| Componente Qlik | Tabela | Agregação |
|---|---|---|
| Contas criadas por ano (total × ativas) | `dbo.Conta` | `GROUP BY YEAR(createdAt)`, `SUM(CASE ativo=1)` |
| Distribuição por faixa etária | `dbo.Usuario.dataNascimento` | `DATEDIFF(YEAR, dataNascimento, GETDATE())` bucketizado |
| Cidades com contas ativas (mapa) | `dbo.Endereco.cidade` (código IBGE) | JOIN via `cpf` com `Conta WHERE ativo=1`, `GROUP BY cidade` |

## Dicionário de cidade

`Endereco.cidade` é código IBGE de 7 dígitos (ex. `5002704` = Campo Grande).
`Endereco.uf` é código IBGE de 2 dígitos (`50` = MS).

**Lookup MS:** `public/geo/ms-municipios.geojson` já tem `properties.id` (código
IBGE) e `properties.name` — reusar como dicionário no transform Python
(gerar `data-platform/reference/ibge_ms.json` a partir do geojson).

**Cobertura no BD:** 25 UFs distintas, 318 cidades distintas, 6.736 endereços.
Só ~1,8% das contas têm endereço cadastrado. O mapa mostra concentração dos
cadastrados, não distribuição real.

## Não-mapeados / achados extras

- `dbo.Auditoria_Exclusao_De_Conta` (1.107 registros) — motivos de exclusão
  auto-declarados. Fonte pra análise futura de churn.
- `dbo.Conta.contaGovBr` — flag gov.br (segmentação extra não pedida no Qlik).
- `dbo.Conta.ultimoLogin` — base pros indicadores de retenção (PBI 3).
