# ADR-009 — Mobile-first no front

## Contexto
O BI é consumido por gestores e servidores no celular, não só no desktop. Vários
painéis quebraram em ~375px: gráficos Recharts e o mapa (react-simple-maps)
renderizavam em largura desktop dentro de um flex sem `min-w-0`, estourando o
viewport (~778px de overflow horizontal — "não enquadrado"). O Tailwind já é
mobile-first (breakpoints `sm/md/lg` são *min-width*), mas o código vinha sendo
escrito pensando desktop primeiro, então o caso base (mobile) ficava sem tratamento.

## Decisão
**O caso base do estilo é o mobile.** Escrever para ~375px primeiro; `sm:`/`md:`/`lg:`
só *adicionam* para telas maiores.

Regras práticas:
- **`min-w-0` em item flex que contém gráfico/tabela/texto largo.** Sem isso o
  item não encolhe abaixo da largura intrínseca do filho e estoura o viewport.
  Já aplicado no wrapper de conteúdo em `app/(plataforma)/layout.tsx`.
- **Gráficos** (`components/charts/`) usam `ResponsiveContainer width="100%"` e
  precisam de ancestral com largura definida (garantida pelo `min-w-0` acima).
  Eixo X com nome longo usa `minTickGap`/`interval` pra não sobrepor.
- **Grids**: base `grid-cols-1` (ou 2 só quando o card é pequeno), subindo com
  `sm:`/`lg:`. Nunca começar em 3–4 colunas.
- **Tabelas** largas: `overflow-x-auto` + `truncate`/`max-w` menor no mobile.
- **Listas de abas/pílulas**: `overflow-x-auto flex-nowrap` (rola), não `flex-wrap`.
- **Alvo de toque** ≥ 44px (hamburguer, botões).
- **Navegação**: sidebar vira drawer com hambúrguer no mobile (`md:hidden` +
  translate); o `ContentTopBar` reserva espaço do hambúrguer com `pl-16 md:pl-6`.

## Verificação
Toda mudança de UI é checada em **375px** antes de subir. Teste objetivo de
enquadramento: `document.documentElement.scrollWidth <= window.innerWidth`
(sem overflow horizontal). Preferir viewport real (Playwright/DevTools a 375px),
não emulação escalada.

## Consequências
- Novos componentes nascem mobile-first; PRs de UI sem checagem em 375px são
  incompletos.
- Layout compartilhado (`layout.tsx`) resolve overflow pra todas as rotas de uma vez.
- Custo baixo: são classes Tailwind + `min-w-0`, sem lógica nova.
