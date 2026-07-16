# Censo Digital — como funciona o censo de maturidade

O **Censo Digital** mede quanto de cada serviço do Governo de MS já pode ser
resolvido pela internet, sem o cidadão precisar ir a um balcão. Cada carta de
serviço recebe uma nota numa régua de **0 a 4**, e o painel (`/censo-digital`)
mostra o panorama do governo e o retrato de cada órgão.

Hoje é um **retrato estático** de 3 órgãos (IAGRO, DETRAN, SEAD). Foi pensado para
crescer: cada órgão novo é um arquivo a mais, sem mudar a estrutura.

## A régua de maturidade (0 a 4)

| Nível | Rótulo | Resolve online? | O que significa |
|:-:|---|:-:|---|
| **0** | Apenas presencial | Não | Só dá para resolver no balcão — nada pela internet. |
| **1** | Informação online | Não | Dá para se informar online (requisitos, prazos), mas o processo corre todo no balcão. |
| **2** | Começa online, termina no balcão | Em parte | Começa pela internet (formulário, agendamento) e termina presencial. |
| **3** | Quase tudo online | Quase | Quase tudo pela internet — trava só numa etapa física (uma vistoria ou assinatura). |
| **4** | 100% pela internet | Sim | Resolve do começo ao fim sem sair de casa. |

A régua é **ordinal**: não existe uma nota contínua, cada carta cai num dos cinco
degraus. A fonte da verdade dos rótulos e cores está em
[`src/lib/censo.ts`](../src/lib/censo.ts) (`NIVEIS`).

## Os indicadores

- **Já resolvem online (% digital)** — proporção de serviços nos níveis **3 e 4**.
  É o indicador-resumo de avanço do órgão e do governo.
- **100% pela internet** — serviços no nível **4** (jornada inteira sem balcão).
- **A um passo** — serviços nos níveis **2 e 3**. São os que já começaram a
  digitalização e estão perto de fechar o ciclo; a métrica de priorização (o
  menor esforço para o maior ganho).
- **Usam algum sistema** — cartas que mencionam um sistema/plataforma digital.

No panorama do governo, o **% digital é recalculado sobre o total geral** de
serviços (não é a média das médias entre órgãos), e o ranking ordena os órgãos do
mais ao menos avançado por esse percentual.

## Como os dados são coletados

A maturidade de cada serviço é levantada num processo de **três etapas**. Ele roda
no repositório de origem (`mapeamento-inicial-servicos-digitais`); aqui no portal
o que existe é o **resultado congelado** (ver "Estado atual" abaixo).

### 1. Levantamento dos serviços

Os serviços e a **jornada de cada um** (o passo a passo que o cidadão percorre) são
lidos direto da base de serviços do Estado — a mesma que alimenta o portal
ms.gov.br. Para cada serviço registra-se: título, descrição, requisitos, e a lista
de **etapas** da jornada, cada etapa com o seu **canal de atendimento** (se aquele
passo é feito pela internet, presencialmente, ou dos dois jeitos). As etapas são
guardadas uma a uma, sem juntar num texto só — porque o canal de cada etapa é o
sinal mais importante para medir a maturidade.

### 2. Classificação na régua 0–4

Cada serviço é lido e recebe um nível de 0 a 4 com apoio de **inteligência
artificial**, seguindo a régua e as regras abaixo, e passa por **revisão humana**.

**O sinal mais forte é o canal de cada etapa da jornada:**

- Todas as etapas pela internet → candidato a **nível 3 ou 4**.
- Todas presenciais → **nível 0 ou 1**.
- Mistura de online e presencial → **nível 2 ou 3**.

**Regras de desempate** (quando o serviço fica entre dois níveis):

1. O canal das etapas decide primeiro (regra acima).
2. Se a jornada é toda online e trava **só numa** etapa física — uma vistoria no
   local, uma perícia, uma junta médica ou uma assinatura à mão — é **nível 3**
   (não 2). É o caso típico de vistoria sanitária, por exemplo.
3. Se há várias etapas presenciais, ou a conclusão obrigatoriamente acontece no
   balcão, é **nível 2**.
4. Se só existe informação online (requisitos, prazos), sem nenhum passo de
   solicitação pela internet, é **nível 1**. Se nem isso, **nível 0**.
5. Um serviço que usa um sistema/plataforma próprio reforça o nível 3 ou 4 —
   conferindo se o sistema cobre a jornada inteira ou só um pedaço.
6. **Na dúvida entre dois níveis, escolhe-se o menor** (critério conservador), e o
   motivo fica registrado na justificativa daquele serviço.

Para cada serviço o resultado guarda: o nível, **a etapa que impede subir de
nível** (o que ainda trava), se menciona algum sistema (e qual), e uma
justificativa de 1–2 frases citando a evidência.

### 3. Montagem do painel

O levantamento e a classificação são cruzados serviço a serviço, e viram os
indicadores e a tabela que este painel mostra.

## Por que dá para crescer sem retrabalho

O censo foi montado em duas camadas: uma **base comum** (a régua, o cálculo dos
indicadores, o layout) que vale para qualquer órgão, e uma **parte por órgão**
(a identidade e os sistemas próprios daquele órgão). Adicionar um órgão novo mexe
só na parte dele — a base não muda. Por isso o painel escala para outros órgãos do
Estado com pouco esforço.

## Estado atual

Hoje o portal traz um **retrato estático** de 3 órgãos. Os números são um
congelamento da classificação — não se atualizam sozinhos a cada acesso. Quando um
órgão é reavaliado, o retrato dele é regerado e substituído (ver
[`datasets/censo/README.md`](../datasets/censo/README.md)).

> **Honestidade sobre o dado:** a classificação é assistida por inteligência
> artificial e pode conter aproximações. Por isso o painel sempre mostra a
> justificativa de cada nível e deixa claro que houve revisão humana — o número
> orienta a decisão, não a substitui.

## Como adicionar um órgão

Ver o passo a passo em [`datasets/censo/README.md`](../datasets/censo/README.md).
Em resumo: gerar o `<sigla>.json`, registrar a sigla em `SIGLAS_CENSO`
(`src/lib/censo.ts`) e a entrada em `datasets/catalog.json`. A rota
`/censo-digital/<sigla>` aparece sozinha.
