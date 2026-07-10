# ADR-010 — Exceção ao ADR-001: busca ao vivo só pra "Intervalo de datas"

## Contexto

ADR-007 documentava que "Intervalo de datas" cai no snapshot do mês "com
aviso visível na UI" — mas na prática só uma aba (`ServicosPorPerfilTab`)
tinha esse aviso; o resto silenciosamente mostrava dado desatualizado, e
duas abas (`BuscaTab`/`PaginasTab`) chegaram a rotular o snapshot como "no
intervalo", mascarando o problema. Resultado real reportado: usuário
selecionou um intervalo de ~2,5 anos e viu MENOS buscas que selecionando
"Ano" — porque os dois caíam no mesmo snapshot de 1 mês, só que um dizia a
verdade (aba 5) e o outro mentia (aba 3).

A correção honesta (rótulo certo + aviso em toda aba afetada) resolveu a
mentira, mas não o problema de fundo: o usuário quer o dado real do
intervalo escolhido, não uma aproximação — mesmo que bem sinalizada.

Antes de contrariar o ADR-001 ("zero API em runtime"), investigamos se dava
pra fazer isso sem reabrir mão da arquitetura toda:

- **Matomo aceita `period=range&date=inicio,fim`** pros mesmos relatórios
  que hoje ficam presos no snapshot (navegadores, dispositivos, horário,
  geografia, páginas, busca, portas de entrada, fuga do hub) — **1 chamada
  por relatório, retorna o dado exato do intervalo**. Confirmado em uso real
  de produção no dashboard Streamlit irmão
  (`matomo/matomo-analytics-dashboard/app.py:202-279`,
  `utils/data_loaders.py:50-63`) — sem instabilidade documentada pra esses
  relatórios (a única instabilidade conhecida é em `Transitions`, removido
  do pipeline em sessão anterior).
- **GA4 Data API aceita `startDate`/`endDate` arbitrários numa única
  chamada nativamente** — o token OAuth2 renova sozinho via refresh token,
  sem interação humana, seguro de rodar numa function serverless.
- Nenhuma cota numérica documentada em lugar nenhum do repo — a rejeição
  original do ADR-001 foi qualitativa ("caro"), não baseada em número real.

## Decisão

Abrir uma exceção **pontual e escopada** ao ADR-001: **só quando o usuário
seleciona "Intervalo de datas"**, o portal faz chamada ao vivo — via Route
Handler do Next.js (`src/app/api/analytics/{portal-ms,ms-digital}/route.ts`),
rodando no servidor da Vercel, nunca no browser. Todo o resto (dia/semana/
mês/ano) continua 100% estático/build-time, sem nenhuma mudança.

**O que fica de fora, e por quê:**
- **Postgres/cartas**: continua excluído — a barreira é de rede (VPN), não
  de rate limit/secret, e essa barreira não muda com este ADR. Aliás o
  domínio Serviços não tem filtro de período (ADR-005), não se aplica.
- **`ServicosPorPerfilTab`** (estudo de adoção do filtro de Perfil): a
  transformação (`transform/perfil.py`) é mais complexa que os outros
  relatórios — fica no fallback snapshot+aviso por enquanto, é trabalho
  futuro portar pra TS.

**Fallback**: se a chamada ao vivo falhar (rede, rate limit, token expirado)
ou enquanto carrega, cai pro snapshot do mês + aviso visível
(`AvisoSnapshotAproximado`, 3 estados: `ok`/`carregando`/`fallback`) — a
página nunca quebra, só degrada pra aproximação honesta (mesmo mecanismo do
ADR-007, agora com estado explícito em vez de sempre-fallback).

## Consequências

- Credenciais `MATOMO_TOKEN`, `GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN/PROPERTY_ID`
  precisam existir também nas envs da Vercel (Production + Preview), sem
  prefixo `NEXT_PUBLIC_` — só o processo server-side do Route Handler as lê,
  nunca vão pro bundle do browser.
- Novo código server-only: `src/lib/server/{matomo-client,matomo-transform,ga4-client}.ts`
  — porta TS das mesmas funções Python já testadas em `data-platform/extract/`
  e `data-platform/transform/`, mesmo shape de saída dos tipos já usados
  pelos datasets estáticos (nenhuma Tab precisou mudar).
- Runtime real na Vercel pela primeira vez neste projeto — monitorar custo/
  rate limit na prática; se virar problema, avaliar cache de resposta por
  range (Vercel Data Cache/KV) antes de reverter a decisão.
- `docs/architecture/ADR-007-breakdown-por-periodo.md` fica parcialmente
  superada pra esses relatórios — o snapshot vira fallback, não o
  comportamento padrão.
