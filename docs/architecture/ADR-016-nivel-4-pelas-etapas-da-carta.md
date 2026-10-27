# ADR-016 — Nível 4 do censo conferido pelas etapas da carta no Portal Único

**Status:** aceito (2026-10-27)

## Contexto

No censo autodeclarado (ADR-015), o nível 4 significa "100% online para o cidadão, com um servidor analisando o pedido". É a maior faixa: 509 de 817 serviços na carga de 2026-10-27. Ele conta como digital no "% online" do painel.

O grau é a visão do próprio órgão e ninguém confere. Na prática, parte desses serviços manda o cidadão **baixar um formulário, preencher e mandar por e-mail**. O serviço conta como digital, mas não facilita o pedido. A coluna "etapa presencial" do censo não pega esse caso: em 376 dos 509 serviços ela está vazia, e no resto é texto livre, muitas vezes "não tem".

O jeito que o cidadão faz o pedido está descrito nas **etapas** da carta publicada no Portal Único. O repositório não tem esse texto: o inventário (`cartas/v1/inventario-relacao.json`) corta as descrições longas para ficar abaixo do limite de 2MB.

## Decisão

- **Fonte das etapas:** a API de serviços do Portal Único, `GET https://admin.ms.gov.br/api/cms/servicos/?slug=<slug>`, que é o mesmo endpoint que o ms.gov.br usa para montar a página da carta.
  - Campos usados: `jornada[]` (`ordem`, `titulo`, `conteudo` em HTML), `url_externo`, `acesso_externo` e `link_integrado`.
  - A chave vai no header `Authorization`, lida de `PORTAL_API_KEY` no `.env`, que não é versionado.
- **Extração separada do censo:** `data-platform/build_etapas_n4.py` (+ `extract/portal_cartas.py`) lê o `censo.json` já publicado, não o xlsx.
  - Busca só as cartas de nível 4 que têm `slug` (448 de 509).
  - Publica `datasets/censo/v2/etapas-n4.json`.
  - Converte o HTML em texto e mantém o destino dos links (.pdf, e-mail, sistema), porque é ele que classifica a carta.
  - Segue o padrão do censo: `frequency: manual`, fora do `run.py` e do cron. Se alguma chamada falhar, aborta sem publicar.
- **Classificação no front (`src/lib/censo-n4.ts`)**, por palavra-chave no molde de `busca-tema.ts`. Vale a primeira regra que casar:
  1. **Ainda pede ida presencial**: comparecer, presencialmente, dirigir-se, protocolar na unidade. A palavra não conta quando vem logo depois de "não", "sem" ou "dispensa".
  2. **Baixa formulário e envia por e-mail**: verbo (baixar, imprimir, preencher) perto de "formulário", "requerimento" ou "ficha", ou formulário apontando para .pdf/.doc. Só vale se houver e-mail ou não houver sistema. O verbo sozinho não basta: "baixe o certificado" acontece em serviço com sistema.
  3. **Formulário online ou sistema**: forms.ms.gov.br, sistema, gov.br ou link, ou o botão "Acessar serviço" habilitado. Vem antes de "só e-mail" porque um e-mail de contato não tira o serviço do sistema.
  4. **Pedido só por e-mail.**
  5. **Carta não diz como pedir.**
  6. **Sem carta no portal**: o serviço não tem `slug` ou o portal não achou a carta.
- **Base honesta:** todos os percentuais são sobre os 509 serviços de nível 4, incluindo "sem carta" e "não diz como pedir". A tabela mostra o **trecho da carta** que decidiu a categoria, para o gestor conferir.
- **Exibição:** aba **"2. Nível 4 na prática"** dentro de `/censo-digital`, ao lado de "1. Visão Geral", no padrão de abas da Carta de Serviços, e não como item próprio no menu.
  - Mostra a frase-âncora, os indicadores, a distribuição por forma de pedido, o ranking dos órgãos com mais "formulário + e-mail" e a tabela filtrável com exportação em CSV.
  - Não tem filtro de período: é estático, como o censo.

### Alternativas descartadas

- **Banco das Cartas (Postgres):** é a mesma fonte do inventário, mas recusa a conexão desta máquina (`pg_hba`), e o nome da tabela de etapas não é conhecido.
- **Ler a página renderizada da carta:** o portal é um SPA, então isso exigiria um navegador por carta. É lento e quebra a cada mudança de layout.
- **Classificar no pipeline (Python):** deixaria a regra longe do teste com `node --test` e do resto do cálculo em `lib/` (convencoes.md).

## Consequências

- O painel passa a mostrar a diferença entre o que o órgão **declarou** (nível 4) e o que a carta **descreve**. Não muda o nível do censo, nem o "% online" da Visão Geral.
- A classificação é heurística. Carta mal escrita cai na categoria errada, e a evidência na tabela torna o erro visível. Depois de cada coleta, revisar uma amostra de cada categoria e ajustar as palavras em `censo-n4.ts` (testes em `censo-n4.test.ts`).
- Há uma dependência nova de credencial (`PORTAL_API_KEY`). Sem ela, a aba mostra que as etapas ainda não foram lidas e não inventa números.
- Nova rodada do censo: rodar `build_censo.py` e depois `build_etapas_n4.py`.
- Achado colateral: `--ds-color-error` e `--ds-color-neutral-300/400` não existem no DS vendorizado. As telas do censo passaram a usar `--ds-color-danger` e `--ds-color-neutral-500`. Outros domínios ainda usam os tokens inexistentes.
