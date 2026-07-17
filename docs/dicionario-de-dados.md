# Dicionário de dados — Portal Único (portal-ms)

Este documento explica, em linguagem simples, o que cada tipo de página e
cada indicador do painel **Portal Único** significa — e o que ele **não**
mede. Pensado para quem herda o relatório sem ter acompanhado a construção:
gestor, novo integrante da equipe, ou qualquer pessoa que precise responder
"de onde veio esse número?" sem abrir código.

## Tipos de página

Toda visita ao portal cai em um destes tipos. A classificação usa o
cadastro oficial de cartas de serviço (a mesma fonte que alimenta a aba
"Serviços") — nunca adivinha o significado de uma página pelo formato da
URL.

| Tipo | O que é | Exemplo de URL | Como aparece na tela |
|---|---|---|---|
| **Serviço** | Uma carta de serviço real, cadastrada e ativa | `/financas-e-impostos/ipva-consulta-de-debito54` | Nome oficial do serviço + órgão responsável (ex. "IPVA - consulta de débito — SEFAZ MS") |
| **Página inicial** | A home do portal | `/` | "Página inicial" |
| **Página de órgão** | A página que lista os serviços de um órgão específico | `/orgao/sefaz-ms.../servicos` | "Serviços da [SIGLA]" |
| **Meu Painel** | Área logada do cidadão/servidor | `/workspace` | "Meu Painel" |
| **Notícia** | Matéria do portal | `/noticias/...` | "Notícia" |
| **Lista de categoria** | Página que lista todos os serviços de um tema | `/transito-e-transportes` | "Lista de serviços de [tema]" |
| **Busca** | Resultado de busca interna | `/buscar/q=ipva` | "Busca no portal" |
| **Não identificado** | Página que parece serviço mas não bateu com nenhuma carta cadastrada | — | Aparece como "não identificado", nunca escondido |

**Por que "não identificado" existe e por que isso é bom, não ruim:** o
cadastro de cartas de serviço é mantido por outra equipe e muda com o
tempo. Quando uma página nova ainda não foi cadastrada, ou foi
descadastrada, o painel avisa isso explicitamente em vez de inventar um
nome ou simplesmente somar a visita em algum outro lugar. Se esse número
crescer muito, é sinal de que o cadastro de cartas precisa de atenção — não
que o painel está quebrado.

## Indicadores

- **Visitas** — quantas vezes alguém acessou o portal no período. Uma
  pessoa que volta duas vezes no mesmo dia conta duas visitas.
- **Visitantes únicos** — quantas pessoas diferentes (por navegador/aparelho)
  acessaram no período. Sempre menor ou igual às visitas.
- **Páginas por visita** — quantas páginas, em média, cada visita percorre
  antes de sair. É a melhor pista disponível para responder "o cidadão
  encontrou o que procurava, ou entrou e saiu?" — um número de ações brutas
  (ex. "683 mil ações") não responde essa pergunta sozinho; páginas por
  visita responde.
- **Serviço mais procurado** — a carta de serviço com mais visitas no
  período, dentre as que puderam ser identificadas.
- **Demanda por órgão** — quantas visitas a cartas de serviço cada órgão
  recebeu no período, e qual a participação percentual de cada um sobre o
  total identificado. Quando um órgão concentra uma fatia muito grande
  (a partir de 40%), o painel sinaliza isso como ponto de atenção — não é
  necessariamente um problema, mas é informação relevante para quem decide
  onde investir em melhoria digital.
- **Municípios com acesso** — quantos dos 79 municípios de MS tiveram pelo
  menos uma visita no período, sobre o total de municípios do estado.

Todo indicador aparece sempre com uma referência (total, histórico ou meta)
— um número absoluto sozinho não responde "isso é bom ou ruim?".

## O que este painel NÃO mede

- **Se o cidadão concluiu o serviço.** O portal encaminha para o sistema
  que de fato executa o serviço (ex. sistema do DETRAN, da SEFAZ, da
  Delegacia Virtual). O que acontece depois desse encaminhamento não é
  visível aqui.
- **A jornada completa de uma mesma pessoa** (ex. "entrou pela home, foi
  para o login, usou o app, terminou o serviço"). Não existe uma chave em
  comum entre os diferentes sistemas medidos (portal, app MS Digital) que
  permita seguir a mesma pessoa entre eles — o painel mostra o alcance de
  cada canal separadamente, nunca soma nem monta um funil entre eles.
- **Serviços ou órgãos em alta** (comparação de crescimento entre
  períodos) — ainda não publicado neste painel.
- **Para onde o cidadão foi depois de sair do portal** (encaminhamento para
  sistemas externos) — dado existe internamente, ainda não publicado numa
  visão agregada por órgão.

## Referências técnicas

- Classificação de página: [`src/lib/pagina-tipo.ts`](../src/lib/pagina-tipo.ts)
- Cadastro de cartas de serviço (fonte do nome/órgão): `datasets/cartas/v1/inventario-relacao.json`
- Decisão arquitetural completa: [`docs/architecture/ADR-012-camada-semantica.md`](architecture/ADR-012-camada-semantica.md)
