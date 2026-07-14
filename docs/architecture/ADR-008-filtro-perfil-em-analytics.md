# ADR-008 — Estudo do filtro de Perfil vive em Analytics · Portal Único, não em Governança

## Contexto
O ADR-005 mapeou o "estudo filtro-perfil do bench-carta" para o domínio **Governança**
("estudos de adoção de funcionalidade"). Na implementação, o estudo (funil, KPIs de uso
real, distribuição por perfil, top serviços) e o grid "Serviços em destaque" (cards por
perfil, réplica do portal www.ms.gov.br) usam **a mesma fonte do Portal Único**: Matomo
idSite=298, via `Actions.getPageUrls`. Colocá-lo em Governança separava, no menu, uma
análise que é do mesmo portal e do mesmo dataset que as demais abas de Analytics · Portal Único.

## Decisão
O estudo do filtro de Perfil passa a ser a aba **"Serviços por Perfil"** dentro de
**Analytics · Portal Único** (`/analytics/portal-ms`), reaproveitando o slot antes reservado
à aba desabilitada "Serviços Consumidos". Isto **supersede** o trecho do ADR-005 que
mapeava esse estudo para Governança.

- Rota/menu: sem rota nova — é aba do domínio Analytics · Portal Único.
- Dataset: `datasets/matomo/v1/perfil-filtro.json` (inclui `servicosPorPerfil` p/ o grid).
- `/governanca` volta a placeholder, reservada a relatório CGE e outros estudos futuros.

## Consequências
- Coesão de escopo: tudo que é do portal Matomo idSite=298 fica sob o mesmo domínio,
  reagindo ao mesmo filtro de período global (ADR-007).
- O inventário Postgres de Cartas de Serviço, que ocupava o slot placeholder "Serviços
  Consumidos", entra como **aba própria** numa fase futura (fonte de dado distinta).
- ADR-005 continua válido no restante; só o item "Governança → estudo filtro-perfil" é
  anulado por este ADR.
