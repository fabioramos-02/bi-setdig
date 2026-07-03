# Plataforma Oficial de Analytics da SETDIG — visão geral

## Intuito

4 BIs da SETDIG (Secretaria-Executiva de Transformação Digital, MS) nasceram
separados, um por assunto/época, sem padrão visual e com clientes de API
duplicados. Problema disparador: chefia usou um painel e achou a legibilidade
ruim (contraste quebrado ao trocar pra tema claro). Investigação revelou que o
problema é maior — 4 repositórios cobrindo só 3 fontes de dados reais, sem
Design System, com carregamento lento em pelo menos um deles.

**Objetivo não é migrar 4 projetos — é construir uma plataforma única.** Os 4
BIs atuais viram módulos de um só portal, organizado por domínio de negócio
(não por "qual projeto era"), capaz de receber painel novo sem virar
repositório novo.

## Os 4 repositórios de origem

| Repo | Path local | URL pública | Stack |
|---|---|---|---|
| matomo | `SETDIG/2026/projetos/matomo/matomo-analytics-dashboard` | https://setdig-dados.streamlit.app/ | Streamlit — Matomo API + GA4 + Postgres |
| bench-carta | `SETDIG/2026/projetos/bench-carta` | https://bench-perfil.streamlit.app/ | Streamlit — Matomo + GA4 |
| cruzamento-carta | `SETDIG/2026/projetos/cruzamento-carta` | https://cruzamento-carta.vercel.app/ | Python CLI → Jinja2 → HTML estático |
| mapeamento-inicial-servicos-digitais | `SETDIG/2026/projetos/mapeamento-inicial-servicos-digitais` | https://mapeamento-inicial-servicos-digitai.vercel.app/ | Python CLI → Jinja2 → HTML estático |

Design System: `SETDIG/2026/projetos/design-system-ms` (repo `storybook-ds-ms`,
GitHub `fabioramos-02/storybook-ds-ms`). Tokens `--ds-*`, 16+ componentes
HTML/CSS. **Pacote npm `@design-system-ms/ds-sis` está quebrado/deprecado**
— ver `fase 1`, ADR-006.

## Destino

**Um repo só**: GitHub `fabioramos-02/bi-setdig`. Localmente clonado em
`SETDIG/2026/projetos/refatoracao-bi/portal/` — o nome da pasta local
("portal") é só histórico (`create-next-app` criou o Next.js ali e o clone já
nasceu com esse nome); no repo em si os arquivos do Next.js ficam na
**raiz** (`package.json`, `src/`, etc.), sem subpasta `portal/`.

```
refatoracao-bi/portal/        ← raiz do repo bi-setdig (nome de pasta local)
├── src/                      app Next.js (Fase 1)
├── docs/
│   ├── architecture/         ADRs + convenções (Fase -1)
│   └── fases/                este índice
├── data-platform/            pipeline Python independente (Fase 2, ainda não criado)
├── datasets/                 dados publicados + catálogo (Fase 2, ainda não criado)
├── .env / .env.example       credenciais Matomo/GA4/Postgres
└── package.json
```

Erro já cometido uma vez (corrigido): criar um segundo repo git separado só
pros docs, fora do bi-setdig. **Não repetir** — tudo (docs, app, futuro
data-platform/datasets) vive no mesmo repo/remote.

## Fases (ordem de execução)

| Fase | Nome | Status | Doc |
|---|---|---|---|
| -1 | Arquitetura | ✅ concluída | ADRs em `docs/architecture/` |
| 0 | Estabilização (urgente) | ✅ concluída | [01-fase-0-estabilizacao.md](01-fase-0-estabilizacao.md) |
| 1 | Fundação do portal | 🟡 bootstrap feito, resto pendente | [02-fase-1-fundacao-portal.md](02-fase-1-fundacao-portal.md) |
| 2 | Data Platform | ⬜ não iniciada | [03-fase-2-data-platform.md](03-fase-2-data-platform.md) |
| 3 | Migração por domínio | ⬜ não iniciada | [04-fase-3-migracao.md](04-fase-3-migracao.md) |
| 4 | Governança contínua | ⬜ não iniciada | [05-fase-4-governanca.md](05-fase-4-governanca.md) |

## Como retomar em outra máquina

1. Clonar `github.com/fabioramos-02/bi-setdig` — é o único repo novo deste
   projeto. Os 4 repos antigos (matomo, bench-carta, cruzamento-carta,
   mapeamento-inicial) continuam nos próprios repos, inalterados na Fase 0.
2. **`refatoracao-bi` é pasta sincronizada entre duas máquinas** (mesmo
   working tree aparecendo nas duas, provável sync de `Documents`). Rodar
   `git status` + `git log --oneline -10` antes de criar/mover qualquer
   arquivo — já causou um incidente (ver `docs/fases/02-fase-1-fundacao-portal.md`).
3. Copiar `.env.example` pra `.env` e preencher com as credenciais reais
   (pedir a quem já tem — Matomo/GA4/Postgres da SETDIG). `.env` nunca é
   commitado.
4. Ler `docs/architecture/` inteiro antes de tocar código — são as decisões já
   fechadas, não revisitar sem novo ADR.
5. Abrir o doc da fase com status 🟡 ou a próxima ⬜ — cada um lista "o que
   falta" e "como retomar" específico.
