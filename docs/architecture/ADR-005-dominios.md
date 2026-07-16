# ADR-005 — Domínios de negócio, não projetos antigos

## Contexto
Os 4 BIs existentes (matomo, bench-carta, cruzamento-carta, mapeamento-inicial)
cobrem só 3 fontes de dados reais, mas foram organizados por "quando foram
criados", não por assunto — daí a fragmentação e a duplicação de clientes
Matomo/GA4.

## Decisão
O portal se organiza por **domínio de negócio**, desacoplado da origem histórica:

```
Analytics    → Portal Único (Matomo) · MS Digital (GA4)
Serviços     → inventário de cartas · maturidade digital (0-4)
Avaliação da Carta    → erros/satisfação das cartas · deduplicação/perfis
Governança   → relatório CGE · estudos de adoção de funcionalidade
```

Rotas: `/analytics/portal-ms`, `/analytics/ms-digital`, `/servicos`,
`/qualidade`, `/governanca`.

## Consequências
- Um painel novo entra como página dentro de um domínio existente — não gera
  repositório novo.
- A migração (Fase 3) mapeia cada aba/painel antigo para o domínio correto,
  mesmo quando isso divide um repo antigo (ex.: bench-carta tem 1 painel em
  Analytics e outro parcialmente absorvido por Governança).
