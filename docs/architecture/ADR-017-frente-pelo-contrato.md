# ADR-017 — Frente X-VIA × SGD pelo contrato, não pela pessoa

**Data:** 11/11/2026 · **Status:** aceito (Fabio Ramos) · **Relacionados:** ADR-014, `docs/projeto-xvia/04-regras-negocio.md`

## Contexto

O backlog XVIA no TFS mistura o trabalho da contratada (X-VIA) e o da SGD. Até 10/11/2026, a UST era
separada por uma lista fixa de 5 logins da SGD (`TIME_SGD`), e as entregas não eram separadas. Na
prática:

- uma Task sem responsável contava como X-VIA;
- uma Task reatribuída mudava de lado;
- 63 dos 138 itens "em produção" eram da SGD;
- não havia como dizer "não sei".

## Decisão

1. **Task:** o contrato marcado (`Custom.SGI.Empresa`) decide. X-VIA fatura; Governo do Estado = SGD. Sem contrato: a área `XVIA\Customização UST` conta como X-VIA; área, título ou épico da SGD = SGD; o resto = **Não identificado**.
2. **Demais tipos:** área `XVIA\SGD*`, título `[SGD]` ou épico 1333593 = SGD; senão X-VIA.
3. **Só Task fatura e leva UST.**
4. Não identificado fica fora de todo total da X-VIA e vai para a validação.
5. O responsável só gera alerta de qualidade.
6. Indicadores de execução, entregas e financeiro da X-VIA usam só a frente X-VIA (`soXvia`, `ehTarefaXvia`). Na função que soma dinheiro, contrato que não é da X-VIA nunca soma.

## Consequências

- 5 Tasks Done com contrato X-VIA e responsável da SGD passam a contar (alerta para conferir).
- 185 Tasks ficam como Não identificado até alguém marcar o contrato.
- O `lancar-demandas-xvia/src/painel.py` segue a mesma regra.
- Testes: `transform/tfs_test.py` e `src/lib/tfs-frentes.test.ts`.
