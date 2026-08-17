# Validação — Portal (aba Contas) vs Qlik

Comparação apurada em **2026-08-17** com dado ao vivo do BD `MS_digital` vs
snapshot do dashboard Qlik atual (`docs/image.png`).

Tolerância: diferença absoluta < 0,1% (arredondamento/timing de snapshot).

## KPIs

| Indicador | Qlik | Portal | Δ abs | Δ % | Hipótese |
|---|---:|---:|---:|---:|---|
| Contas Ativas | 343.729 | 343.806 | +77 | +0,022% | Novas contas ativadas após snapshot do Qlik. |
| Total de Contas | 367.433 | 367.510 | +77 | +0,021% | Novas contas criadas após snapshot do Qlik. |
| Matrículas | 20.591 | 20.596 | +5 | +0,024% | Novas carteiras funcionais cadastradas. |
| Taxa de ativação | 93,5% | 93,5% | 0 | 0% | Idêntico. |

Todas dentro da tolerância. Definições confirmadas:
- **Contas Ativas** = `dbo.Conta WHERE ativo = 1`
- **Total** = `COUNT(*) FROM dbo.Conta`
- **Matrículas** = `COUNT(*) FROM dbo.CarteiraFuncional` (PK: `matricula`)

## Gráficos

### Contas criadas por ano
Distribuição por ano bate com o Qlik dentro da tolerância. Ano corrente
(2026) exibido com sufixo "(parcial)" — Qlik não sinaliza isso.

### Faixa etária
Ambos os painéis mostram o gráfico com a maioria em "Não informado" (92,7%
das contas sem `dataNascimento`). O portal explicita isso em texto visível;
o Qlik não. **Item a discutir com gestor:** manter ou promover "não
informado" fora do gráfico principal (KPI separado).

### Cidades
Portal usa geojson MS oficial e código IBGE (mais preciso que o Qlik, que
inferia por nome). Top 5 confirmadas:
1. Campo Grande — 3.158
2. Dourados — 687
3. Três Lagoas — 312
4. Corumbá — 178
5. Ponta Porã — 151

Ressalva idêntica em ambos: só 1,8% das contas têm endereço cadastrado.

## Indicadores novos (não presentes no Qlik)

Adicionados a pedido da gestão — sem paridade a comparar. Ver
`indicadores-inatividade.md` pra definição e ressalvas.

| Indicador | Valor |
|---|---:|
| Nunca acessaram | 35.242 (9,6%) |
| Sem acesso há 2+ anos | 141.890 (38,6%) |
| Recorrentes 6 meses | 82.621 (22,5%) |

## Conclusão

Paridade validada. Portal pode ser considerado equivalente ao Qlik +
indicadores extras de retenção. Próxima re-execução: sempre que
`data-platform/run.py` rodar (diariamente ou sob demanda).
