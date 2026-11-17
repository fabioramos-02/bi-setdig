# Inventário de Sistemas (`/inventario-sistemas`)

Módulo de Governança Estratégica que transforma a planilha "Inventário de Sistemas MS — unificado" num painel
de gestão do portfólio de sistemas do Estado.

## Perguntas que o módulo responde

| Aba | Pergunta |
|-----|----------|
| 1. Visão Geral | O que temos e onde olhar primeiro? |
| 2. Por órgão | O que é do órgão, o que ele usa dos outros e quem usa o que é dele? |
| 3. Compartilhamento | Quais sistemas e órgãos servem a mais órgãos? |
| 4. Criticidade | Quanto da avaliação C1–C8 foi feita e, depois, quais sistemas são críticos? |
| 5. Qualidade do inventário | O que falta preencher, validar e quem não respondeu? |
| 6. Catálogo | Busca e ficha de cada sistema (abre de qualquer aba). |

## Atualizar os dados

Fonte manual. Quando chegar versão nova da planilha:

```bash
python data-platform/build_inventario_sistemas.py "C:/caminho/Inventário de Sistemas MS - unificado DD-MM-AAAA vN.xlsx"
```

Sem argumento, lê o arquivo v4 em `Downloads`. Versão e data saem do nome do arquivo. Publica em
`datasets/inventario-sistemas/v1/`: `sistemas`, `orgaos`, `indicacoes`, `pendencias`, `meta` (perguntas C1–C8).
O xlsx não é versionado. **O telefone do gestor não é publicado**, só se existe (`temContato`).

Abas lidas: Inventário, Por órgão, Indicações, Pendências e Avaliação de Criticidade (texto das perguntas).

## Regras e limitações

- Identificador próprio por sistema (`sis-NNN`, coluna `#`): há nomes repetidos em órgãos diferentes (ex. Intranet).
  Indicações são ligadas por nome unificado + órgão responsável.
- Três conceitos separados: **responsabilidade** (dono), **uso** (órgãos que declararam usar) e **integração técnica**
  (não coletada; o painel avisa que uso não é integração).
- Criticidade: 1 ponto por "S" em C1–C8, percentual sobre 8, nível pela régua (0–20 Muito baixa … 81–100 Crítica).
  Só conta como avaliado o sistema com as 8 respostas. As seções de distribuição e mais críticos aparecem sozinhas
  quando houver avaliação.
- Completude mede campo preenchido, não informação conferida.
- Órgãos que não enviaram inventário aparecem com os sistemas que outros órgãos citaram.
