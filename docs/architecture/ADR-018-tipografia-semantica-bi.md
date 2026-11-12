# ADR-018 — Tipografia semântica do BI

Data: 12/11/2026. Situação: adotado.

## Contexto

A revisão de `/projeto-xvia` encontrou conclusões, corpo, metadados e dados tabulares com o mesmo tamanho. O piso local de 14px não criava hierarquia. Componentes comuns usavam utilitários ou pixels independentes; tooltips e metadados de serviços ainda tinham 10–12px. O DS-MS vendorizado usa regras sem camada, que podem vencer utilitários.

## Decisão

Manter o DS vendorizado intacto (ADR-006) e importar `src/styles/bi-typography.css` em `globals.css`, depois do DS. O arquivo centraliza os tokens `--ds-bi-*` e os papéis `bi-display`, `bi-heading-1`, `bi-heading-2`, `bi-headline`, `bi-metric`, `bi-card-title`, `bi-body`, `bi-body-small`, `bi-label`, `bi-caption` e `bi-table`.

Escala-base em 16px: display 28–32; seção 24; subseção/conclusão 20; métrica 32; título de registro 17; corpo 16; tabela/label 15; apoio/metadado 14. Unidades em rem, entrelinhas por papel, peso regular no corpo e semibold no destaque. Raiz em 100% permite respeitar o tamanho padrão escolhido no navegador.

Componentes compartilhados consomem esses papéis. Os utilitários legados `text-xs` até `text-3xl` recebem valores da mesma escala via `@theme inline`, para manter compatibilidade durante a migração das páginas. Não criar novos tamanhos locais para texto. Ícones mantêm dimensões gráficas próprias; tamanho de fonte de um ícone não representa texto auxiliar.

`bi-narrative` limita narrativas a 60rem. Isso não limita tabelas, gráficos ou cronogramas. A prioridade é quebrar linhas, reposicionar e permitir rolagem própria; não reduzir fonte para acomodar densidade. Cada bloco tem uma mensagem dominante. Ação e referência de origem mantêm destaque distinto.

## Consequências

- Mudanças de escala passam por um lugar único e exigem conferência dos componentes compartilhados nos demais domínios.
- CSS global contém apenas a escala e papéis comuns; composições locais ficam em CSS Modules, conforme orientação do Next instalado.
- Gantt mantém sua escala de texto/grade e cálculos existentes. Exportação de SVG resolve as variáveis para fontes calculadas.
- Toda mudança tipográfica deve ser conferida em 375px e 1366×768, zoom equivalente 100/125/150/200% e fonte ampliada. Tabelas e gráficos devem permitir alcançar a última coluna; a página não deve alargar.
- Não há alteração de cálculo, indicador, dataset, período ou regra de negócio.

Diagnóstico, execução e evidências: [auditoria tipográfica X-VIA](../projeto-xvia/10-auditoria-tipografica.md).
