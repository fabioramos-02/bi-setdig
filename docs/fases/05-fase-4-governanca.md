# Fase 4 — Governança contínua

**Status: ⬜ não iniciada (roda em paralelo à Fase 1 em diante, não é sequencial)**

## Intuito

Impedir que o portal novo vire o mesmo problema que motivou este projeto —
fragmentação e falta de padrão. Governança aqui é código (CI) e processo
(esteira), não documento que ninguém lê.

## O que fazer

### Esteira `/spec-driven`
Uma spec por fase/domínio antes de implementar — a spec da arquitetura
(`docs/architecture/`) já é a primeira. Agente Validar da esteira roda antes
de cada deploy.

### CI (`refatoracao-bi/.github/workflows/ci.yml`, ainda não existe)
Pipeline: `eslint` → `tsc --noEmit` → `vitest` (só `modules/*` e `lib/*` —
componente de UI burro não precisa de teste, ver `convencoes.md`) → **Lighthouse
CI** com assert automático das metas:

| Métrica | Meta |
|---|---|
| Performance | ≥ 95 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 95 |
| Primeiro carregamento | < 2s |
| Troca de página | < 300ms |

Accessibility ≥95 no CI é a resposta estrutural pra reclamação original da
chefia (contraste) — deixa de depender de olho humano.

### Lint anti-hex
Regra de lint proibindo cor hex fora de `globals.css` — força `var(--ds-*)`
em todo componente novo. Sem isso, o portal reproduz o mesmo problema dos BIs
antigos (cor hardcoded espalhada) em 6 meses.

## Como retomar

Não é bloqueante pra nada — pode ser feito a qualquer momento a partir do fim
da Fase 1 (precisa ter `package.json`/`tsconfig` estáveis pro CI rodar contra
algo). Boa tarefa pra encaixar em paralelo enquanto Fase 2/3 avançam, já que
não compete por atenção com decisões de negócio.
