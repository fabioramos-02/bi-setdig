# Indicadores de retenção (uso do app)

3 recortes solicitados pela gestão. Fonte primária: `dbo.Conta.ultimoLogin` +
`createdAt`. **NÃO existe coluna `loginCount`** no banco — as definições abaixo
são as possíveis com o schema atual.

Números apurados em 2026-08-17 sobre 367.508 contas.

## 1. Contas que nunca acessaram

**Pergunta:** Quantos cidadãos criaram conta e nunca abriram o app?

**Definição:** `ultimoLogin IS NULL`.

**Número:** 35.243 (9,6%).

**Ressalva:** Uma conta pode ter `ultimoLogin = createdAt` se o app registrar
login no ato do cadastro. Sem `loginCount`, não dá pra distinguir "acessou só
uma vez" de "nunca acessou depois de cadastrar" — só dá pra saber "nunca teve
login registrado".

## 2. Contas inativas há 2+ anos

**Pergunta:** Quantos criaram conta mas abandonaram há 2 anos ou mais?

**Definição:** `ultimoLogin < DATEADD(year, -2, GETDATE())`.

**Número:** 141.850 (38,6%).

**Ressalva:** Não inclui os que nunca acessaram (item 1) — critério é ter
logado alguma vez, e o último ter sido há 2+ anos.

## 3. Contas recorrentes

**Pergunta:** Quantos usam o app com frequência?

**Definição (proposta):** `ultimoLogin > DATEADD(month, -6, GETDATE())`.

**Número:** 82.493 (22,5%).

**Ressalva:** "Recorrente" no sentido estrito exigiria contagem de logins —
não temos. A definição usa "acessou nos últimos 6 meses" como proxy de
"engajado". Validar com gestor se o corte de 6 meses é adequado.

## Decisão

Todos os 3 indicadores saem do BD (`Conta.ultimoLogin`), não do GA4. Motivo:
GA4 tem retenção padrão de 14 meses — inviabiliza "2 anos" — e mede sessões
por dispositivo, não por conta.

## Publicação

Dataset `datasets/msdigital-db/v1/uso-retencao.json`:
```json
{
  "nuncaAcessou": 35243,
  "inativos2Anos": 141850,
  "recorrentes6Meses": 82493,
  "totalContas": 367508
}
```
