# ADR-007 — Breakdowns nos 4 períodos fixos do filtro, não período arbitrário

## Contexto
O filtro de período do portal (`PeriodRadioGroup`) tem 5 opções: Dia, Semana,
Mês, Ano, Intervalo de datas. A série de visitas (`visitas-diarias.json`, desde
01/01/2024) já é agregável client-side pra qualquer uma delas, sem nova
chamada ao Matomo. Mas os breakdowns por categoria — navegadores, dispositivos, horários,
geografia — não têm série temporal: cada API do Matomo devolve só o breakdown
do período consultado, não uma série. Tornar esses breakdowns reativos a
qualquer período arbitrário exigiria 1 chamada por breakdown por período (ex.
52 semanas × 4 breakdowns = 208+ chamadas) — inviável pra um cron diário.

## Decisão
Extrair os 4 breakdowns (navegadores, dispositivos, horários, geografia)
**só pros 4 períodos fixos que já são opção no radio** (dia=hoje,
semana=atual, mês=atual, ano=atual) — 16 chamadas extras por execução do
pipeline, custo aceitável. Formato do dataset muda de array pra objeto com
4 chaves:

```json
{ "dia": [...], "semana": [...], "mes": [...], "ano": [...] }
```

Trocar o radio no portal só troca qual chave é lida — dado já embutido no
build, zero requisição nova (ADR-001 preservado). Para "Intervalo de datas"
(range arbitrário), os breakdowns caem no snapshot "mês" com aviso visível
na UI — só o gráfico de tendência (que usa a série diária completa) reflete
o intervalo real.

## Consequências
- `data-platform/run.py::run_matomo_perfil` faz um loop de 4 períodos em vez
  de 1 chamada fixa por breakdown.
- `validate/rules.py::validate_period_breakdown` valida cada uma das 4 chaves.
- `src/lib/data.ts`: os 4 getters afetados retornam
  `Record<PeriodoFixo, T[]>` em vez de `T[]`.
- Tamanho por dataset ~4× o anterior (medido: ~21KB total pros 4 breakdowns),
  longe do limite de 2MB.
- Sem consumidor externo desses JSONs além do próprio portal (Qlik lê de
  `matomo/exports/*.csv`, pipeline totalmente separado) — mudança de formato
  não quebra nada fora deste repo.
