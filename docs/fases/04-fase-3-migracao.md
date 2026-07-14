# Fase 3 — Migração por domínio

**Status: ⬜ não iniciada (depende de Fase 1 completa + Fase 2 publicando dados)**

## Intuito

Mover cada domínio de negócio dos 4 repos antigos pro portal único, aposentar
o que sobra, sem quebrar quem usa hoje. Não é "portar código" — é reimplementar
a página no portal lendo de `datasets/` (Fase 2), com os componentes da Fase 1.

## Ordem e por quê

**Serviços+Qualidade (cartas) → Analytics Portal Único → Analytics MS Digital → Governança**

- Cartas primeiro: consolida **3 repos de uma vez** (matomo abas cartas +
  cruzamento-carta + mapeamento-inicial), dados já batem como estático/JSON —
  maior ganho, menor risco.
- Portal Único (Matomo) em seguida: reaproveita o ETL Matomo já existente.
- MS Digital (GA4) por último: troca de OAuth2 pra service account é o setup
  mais chato (ver Fase 2).

## Mapa de migração

| Onda | Rota nova | Migra de | Aposenta | Redirect |
|---|---|---|---|---|
| 1 | `/servicos`, `/qualidade` | 6 abas cartas do `matomo` + `cruzamento-carta` inteiro + `mapeamento-inicial` inteiro | 2 projetos Vercel + abas cartas do matomo | `vercel.json` 308 nos 2 projetos antigos |
| 2 | `/analytics/portal-ms` | 5 abas Matomo do `matomo` + painel 1 do `bench-carta` (filtro de perfil) | Abas portal do matomo. Painel 1 do bench-carta morre sem substituto — conclusão dele já era "remover o filtro" (adoção 0,091%, ver `bench-carta/docs/estudo-uso-filtro-perfil.md`) | Banner no Streamlit (sem redirect HTTP nativo) |
| 3 | `/analytics/ms-digital` | 4 abas GA4 do `matomo` + painel 2 do `bench-carta` (categorias app) | `matomo` e `bench-carta` desligados após 30 dias de banner | Banner + comunicação à chefia |
| — | `/governanca` | Estudo do filtro de perfil vira página de registro histórico (não painel ativo) | — | — |

## Validação de paridade (antes de cada aposentadoria)

Comparar números do portal novo × app antigo no mesmo período. A partir da
Fase 2 os dois leem a mesma origem (`datasets/`), então divergência = bug na
página nova, não diferença de fonte. Congelar a lógica de métricas nos apps
velhos enquanto convivem.

## Decisões que são suas, não técnicas

- **Timing da comunicação à chefia/usuários** — quando avisar que um painel
  vai sumir, por qual canal.
- **Decisão sobre o Qlik**: `run_export.py` do matomo alimenta Qlik Sense hoje.
  Trocar a fonte do Qlik pra `datasets/` é opcional e pode ficar pra depois —
  não é pré-requisito de nada nesta fase.
- **Links antigos favoritados**: 308 cobre acesso direto à URL, mas quem tem o
  link do Streamlit salvo só vê via banner — decidir prazo de tolerância.

## Como retomar

Só começar depois de:
1. Fase 1 ter pelo menos os componentes de `dashboard/` e `charts/` prontos
   (E1.4/E1.5) — senão cada página de domínio reinventa UI do zero.
2. Fase 2 publicando pelo menos os datasets do domínio da onda 1 (cartas).

Primeira tarefa concreta: `/servicos` (Onda 1) — página que já pode nascer
correta, sem legado, porque nenhum dos 3 repos de origem tem arquitetura pra
preservar (2 são geração estática, o terceiro é uma aba dentro de um monólito
Streamlit).
