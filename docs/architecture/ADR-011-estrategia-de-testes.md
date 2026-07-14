# ADR-011 — Estratégia de testes (unitário, componente, E2E, CI)

## Contexto

Hoje o projeto tem só teste unitário com o **test runner nativo do Node**
(`node --test --experimental-strip-types`, script `npm test`), cobrindo 2
arquivos de lógica pura: `src/lib/period-filter.test.ts` (26 casos entre esse
e o de baixo) e `src/lib/servico-app-classifier.test.ts`. Zero dependência de
teste instalada, zero teste de componente React, zero E2E. O CI
(`.github/workflows/ci.yml`) roda `lint` + `build`, mas **não** roda `npm test`.

O pedido: estratégia completa (front-end + rotas de API), ferramentas,
organização de pasta, e pipeline de CI com meta de cobertura (~80%). Este ADR
registra a estratégia; a implementação das camadas 2/3 (componente/E2E) é
trabalho futuro condicionado à aprovação de instalar as dependências — não é
feita junto com este documento.

## Decisão

Estratégia em 3 camadas, adotadas incrementalmente (não tudo de uma vez):

### 1. Unitário — lógica pura de `lib/` (JÁ EXISTE, manter e expandir)

- **Ferramenta**: `node --test` nativo. **Não trocar por Jest/Vitest pra esta
  camada** — funciona, é zero-config, zero-dependência, e roda em ~100ms.
- **Organização**: arquivo `X.test.ts` **ao lado** de `X.ts` (não pasta
  `__tests__/` separada) — é o padrão já estabelecido, mudá-lo fragmentaria o
  que já existe sem ganho.
- **Alvo prioritário** (onde mora o risco de regressão real): todo `lib/` puro
  — `period-filter`, `servico-app-classifier`, `insights`, `cross-canal`,
  `catalogo-app`, `pagina-label`, `normalizar-cidade`, e os transforms
  server-only `server/perfil-live` e `server/matomo-transform`. Essas são
  funções puras (entrada → saída, sem I/O nem React) — baratas de testar e é
  onde bugs silenciosos de cálculo se escondem (ver histórico: rótulo de
  período errado, categoria contada como serviço).

### 2. Componente — **Vitest + React Testing Library** (futuro)

- Recomendo **Vitest sobre Jest** (apesar do Jest ter sido cogitado): Next 16
  é Turbopack/ESM-first; Jest precisa de shim de transform (`babel-jest`/
  `ts-jest` + `moduleNameMapper` pro alias `@/`), Vitest lê o `tsconfig`/paths
  nativamente e roda mais rápido. Ambos entregam o mesmo com RTL — a diferença
  é config, não capacidade.
- **Alvo**: componentes com lógica de apresentação não-trivial —
  `AvisoSnapshotAproximado` (3 estados), `ChartLoading` (skeleton × conteúdo),
  `PeriodFilter` (input adaptativo + clamp), `CategoriasTab` (link web ×
  "não cadastrado", expand/collapse). Não testar wrapper burro de Recharts
  (testaria a lib, não o nosso código).
- **Organização**: mesmo padrão — `Componente.test.tsx` ao lado.

### 3. E2E — **Playwright** (futuro)

- Recomendo **Playwright sobre Cypress**: é o E2E recomendado pela própria doc
  do Next.js, mais rápido, roda os 3 browsers headless no CI sem serviço
  externo.
- **Alvo**: o fluxo do cidadão que atravessa várias camadas e que um teste
  unitário não pega — carregar `/analytics/portal-ms`, trocar granularidade e
  conferir que os números mudam, entrar em modo Intervalo e ver o skeleton →
  dado, navegar entre abas. 3-5 cenários de caminho feliz, não cobertura
  exaustiva.

### Meta de cobertura

80% é razoável como **meta de médio prazo, não gate do dia 1**. Perseguir 80%
cego desde o começo incentiva teste de baixo valor (testar getter trivial só
pra subir o número). Ordem: primeiro `lib/` puro perto de 100% (barato, alto
valor), depois componentes com lógica, E2E por último. Medir cobertura só
quando a camada 2 entrar (Vitest tem `--coverage` via v8 embutido; `node --test`
tem `--experimental-test-coverage`).

### Pipeline CI/CD

- **Agora (zero-custo, próximo passo real)**: adicionar `npm test` ao
  `ci.yml`, depois de `lint` e antes/depois de `build` — já roda contra as
  libs puras existentes, sem instalar nada. **Este é o único passo deste ADR
  que dá pra fazer sem aprovar dependência nova.**
- **Quando a camada 2 entrar**: `npm run test:unit` (Vitest) no mesmo job.
- **Quando a camada 3 entrar**: job separado `e2e` (Playwright precisa buildar
  e servir a app — mais lento; roda em paralelo ou só em PR pra `master`, não
  em todo push).
- Regra: **PR não mergeia com teste vermelho** — todos os jobs são required
  check.

## Consequências

- Camadas 2 e 3 exigem `npm install` de dev-deps (`vitest`,
  `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`;
  `@playwright/test`) — **não instaladas neste ADR**, ficam pra follow-up
  aprovado explicitamente (ponytail: não adicionar dependência sem pedido de
  implementar de fato).
- `node --test` continua sendo a fonte da verdade pra `lib/` — as duas
  camadas novas complementam, não substituem.
- `ci.yml` ganha `npm test` já (sem custo de dependência) — a partir daí,
  regressão em `period-filter`/`servico-app-classifier` quebra o build, não
  passa silenciosa.
