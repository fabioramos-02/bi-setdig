# ADR-006 — DS-MS consumido por cópia de fonte, não via npm

## Contexto
O ADR-003 partiu do pressuposto (documentado na exploração dos 4 BIs) de que
`@design-system-ms/ds-sis` era instalável via npm com `dist/css/ds-sis.css`
publicado — é o que o `mapeamento-inicial-servicos-digitais` faz hoje.

Ao rodar `npm install @design-system-ms/ds-sis` neste repo (v0.6.1, a mais
recente), o pacote instala **sem a pasta `dist/`** — só `package.json` e
`README.md`. O npm marca a versão como deprecated: "Descontinuado. Novo
projeto (Storybook público, sem pacote npm): storybook-ds-ms". O repo local
`design-system-ms` (`storybook-ds-ms`) confirma: `"private": true` no
`package.json`, sem pipeline de publish — só Storybook + Vite dev, tokens e
CSS vivem como arquivos-fonte em `src/styles/*.css`.

## Decisão
O portal vendoriza os arquivos de `design-system-ms/src/styles/*.css` e
`src/assets/fonts/*.otf` diretamente em `portal/src/styles/ds-sis/` (cópia,
não symlink — os dois repos são independentes). `globals.css` importa
`ds-sis/styles/main.css`. Atualizações de token no DS exigem recopiar os
arquivos manualmente até existir um pacote publicável de verdade.

## Consequências
- Sem dependência de um registry externo quebrado.
- Drift é possível: se `design-system-ms` mudar um token, o portal não pega a
  mudança sozinho. Mitigação: comentário no topo de cada CSS vendorizado
  apontando a fonte, revisão manual quando o DS mudar.
- Se o DS voltar a publicar um pacote npm de verdade (`dist/` presente), trocar
  a cópia pela dependência — esta ADR fica obsoleta nesse dia.
- Componentes (`Button`, `Card` etc., CSS por componente em
  `design-system-ms/src/components/<nome>/`) são vendorizados sob demanda, um
  por vez, conforme os wrappers React forem criados (E1.3) — não copiar os 16
  de uma vez sem uso.
