# Censo Digital — como funciona

O **Censo Digital** mede quanto de cada serviço do Governo de MS já pode ser
resolvido pela internet, sem o cidadão precisar ir a um balcão. Cada carta de
serviço recebe um **grau de digitalização de 0 a 5**. O painel (`/censo-digital`)
mostra o panorama do governo e o retrato de cada órgão.

A fonte é o **levantamento da Superintendência de Governo Digital (SGD)**: um
questionário em que **cada órgão informou** o grau dos próprios serviços, a
etapa presencial e quantos pedidos cada um recebe por mês. Decisão registrada no
[ADR-015](architecture/ADR-015-censo-autodeclarado.md).

## A escala (0 a 5)

| Nível | Rótulo no painel | Resolve online? | Quando o órgão escolhe |
|:-:|---|:-:|---|
| **0** | Só presencial | Não | Informação e serviço só no balcão — o serviço nem está no Portal Único. |
| **1** | Só a informação está online | Não | A carta está no Portal Único, mas nenhuma etapa é digital. |
| **2** | Parte online, pode virar digital | Em parte | Alguma etapa já é digital, e a etapa presencial **pode** ser transformada. |
| **3** | Parte online, presença exigida por lei | Em parte | Alguma etapa já é digital, mas a etapa presencial é **exigência legal**. |
| **4** | 100% online para o cidadão | Sim | O cidadão começa e termina online; por dentro, um servidor ainda analisa o pedido. |
| **5** | 100% online e automático | Sim | Online do começo ao fim, sem interação com servidor público. |

A escala é **ordinal**: cada carta cai num dos seis degraus. A fonte da verdade
dos rótulos e cores está em [`src/lib/censo.ts`](../src/lib/censo.ts) (`NIVEIS`).

## Os indicadores

- **Já resolvem online (% digital):** proporção de serviços nos níveis **4 e 5**, calculada sobre os serviços com grau informado.
- **Online e automáticos:** serviços no nível **5**.
- **Podem virar digitais:** serviços nos níveis **1 e 2**, onde a ida ao balcão não é obrigação legal. É a métrica de priorização. O nível 3 fica de fora de propósito e aparece no painel como "etapa presencial por lei".
- **Dos pedidos mensais caem em serviço 100% online:** soma dos pedidos por mês dos serviços nos níveis 4–5, dividida pela soma de todos os pedidos. O card mostra a conta inteira ("1,2 mi de 1,3 mi pedidos/mês informados") e quantos serviços entram nela. A base são **só os serviços que informaram um número**.

## Matriz de impacto × esforço ("Onde investir")

Cada serviço com grau **e** número de pedidos cai num de quatro quadrantes. A matriz existe no governo (todos os órgãos) e em cada órgão.

- **Esforço** vem do nível: quanto menor, mais falta digitalizar. Níveis **0–2 = alto esforço**, **3–5 = baixo**.
- **Impacto** vem dos pedidos por mês. **Alto impacto = acima da mediana do recorte**: no governo, a mediana de todos os serviços; no órgão, a mediana dos serviços dele. É uma comparação relativa, então todo órgão tem os seus "mais procurados".
- **Todos os níveis entram, inclusive o 5.** Cada quadrante mostra uma faixa com a mistura de níveis e quantos já estão no nível 5 (online e automático, sem nada a transformar). O texto acima da matriz dá o total do nível 5.

| Quadrante | Leitura |
|---|---|
| Alto impacto, baixo esforço | Muito procurados e quase digitais: completar ou automatizar primeiro. |
| Alto impacto, alto esforço | Muito procurados e ainda no balcão: projeto maior, alto retorno. |
| Baixo impacto, baixo esforço | Ajustes quando houver fôlego. |
| Baixo impacto, alto esforço | Deixe para depois. |

Fica fora da matriz quem não tem grau ou número de pedidos, e a tela diz quantos são. A tabela do órgão exporta CSV (das linhas filtradas) com o quadrante de cada serviço. Cálculo em `matrizImpactoEsforco`/`quadranteDe` (`src/lib/censo.ts`).

No panorama do governo, o % digital é recalculado sobre o total geral de
serviços, não como média das médias dos órgãos. O ranking ordena os órgãos do mais
ao menos avançado. Órgão que não informou nenhum serviço fica fora do ranking e
aparece citado no texto.

## Limitações do dado (e como o painel mostra)

- **Autodeclarado:** o grau é a visão do próprio órgão, sem conferência externa. O painel diz isso no texto de leitura.
- **Grau não informado:** algumas linhas vieram sem grau. Elas aparecem como "Não informado" na tabela e ficam fora dos percentuais.
- **Pedidos por mês em texto livre:** a planilha traz respostas como "aprox 5500", "7 ao ano" e "Não é possível quantificar". O conversor lê o que é número. Quando não consegue, guarda o texto original, e a tabela mostra "sem número" com o texto como dica. A seção de prioridades diz quantos serviços ficaram de fora.

## Como atualizar

Ver [`datasets/censo/README.md`](../datasets/censo/README.md). Em resumo:

```bash
python data-platform/build_censo.py "caminho/da/planilha unificada.xlsx"
```

Cada aba `Serviços <SIGLA>` vira um órgão, e a rota `/censo-digital/<sigla>`
aparece sozinha. As colunas são reconhecidas pelo texto da pergunta no cabeçalho,
então uma aba com colunas a mais (como as da AGRAER e da SAD) continua funcionando.
