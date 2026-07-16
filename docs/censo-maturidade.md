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

## De onde vêm os dados

1. **Cartas de serviço** — extraídas do portal ms.gov.br (título, etapas, canais
   de atendimento de cada serviço).
2. **Classificação** — cada carta é lida e recebe um nível de 0 a 4 com apoio de
   **inteligência artificial**, seguindo a régua acima, e passa por **revisão
   humana**. O canal de atendimento de cada etapa é o sinal mais forte: se a
   jornada inteira é online, é nível 4; se trava só numa vistoria ou assinatura
   física, é nível 3; e assim por diante. Na dúvida, escolhe-se o menor nível
   (critério conservador).
3. **Retrato estático** — o resultado é congelado em `datasets/censo/v1/<sigla>.json`
   (ver [`datasets/censo/README.md`](../datasets/censo/README.md)).

> **Honestidade sobre o dado:** a classificação é assistida por IA e pode conter
> aproximações. Por isso o painel sempre mostra a justificativa de cada nível e
> deixa claro que houve revisão humana — o número orienta a decisão, não a
> substitui.

## Como adicionar um órgão

Ver o passo a passo em [`datasets/censo/README.md`](../datasets/censo/README.md).
Em resumo: gerar o `<sigla>.json`, registrar a sigla em `SIGLAS_CENSO`
(`src/lib/censo.ts`) e a entrada em `datasets/catalog.json`. A rota
`/censo-digital/<sigla>` aparece sozinha.
