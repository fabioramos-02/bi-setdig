# ADR-016 — Nível 4 do censo conferido pelas etapas da carta no Portal Único

**Status:** aceito (2026-10-28)

## Contexto

No censo autodeclarado (ADR-015), o nível 4 significa "100% online para o cidadão, com um servidor analisando o pedido". É a maior faixa: 509 de 817 serviços na carga de 2026-10-27. Ele conta como digital no "% online" do painel.

O grau é a visão do próprio órgão e ninguém confere. Na prática, parte desses serviços manda o cidadão **baixar um formulário, preencher e mandar por e-mail**. O serviço conta como digital, mas não facilita o pedido. A coluna "etapa presencial" do censo não pega esse caso: em 376 dos 509 serviços ela está vazia, e no resto é texto livre, muitas vezes "não tem".

O jeito que o cidadão faz o pedido está descrito nas **etapas** da carta publicada no Portal Único. O repositório não tinha esse texto: o inventário (`cartas/v1/inventario-relacao.json`) corta as descrições longas para ficar abaixo do limite de 2MB.

## Decisão

- **Fonte das etapas:** a tabela `gerenciamento_jornada` do banco das Cartas (`admin_prd`), o mesmo banco do inventário (`extract/cartas.py`, exige VPN da SETDIG).
  - Campos usados: `ordem`, `titulo`, `conteudo` (HTML) e `canal_prestacao`. Este último é a marcação que a própria carta faz de cada etapa como "Online" e/ou "Presencial".
  - Também são usados `url_externo`, `acesso_externo` e `link_integrado` de `gerenciamento_servicos`, que formam o botão "Acessar serviço".
- **Extração separada do censo:** `data-platform/build_etapas_n4.py` (+ `get_jornadas` em `extract/cartas.py`) lê o `censo.json` já publicado, não o xlsx.
  - Busca só as cartas de nível 4 que têm `slug` (448 de 509), numa única consulta.
  - Publica `datasets/censo/v2/etapas-n4.json` (~730KB).
  - Converte o HTML em texto e mantém o destino dos links (.pdf, e-mail, sistema), porque é ele que classifica a carta.
  - Segue o padrão do censo: `frequency: manual`, fora do `run.py` e do cron. Sem conexão, nada é publicado.
- **Classificação no front (`src/lib/censo-n4.ts`)**, por palavra-chave no molde de `busca-tema.ts`. Vale a primeira regra que casar:
  1. **Ainda pede ida presencial**:
     - Palavras: comparecer, presencialmente, dirigir-se, protocolar na unidade.
     - Também conta etapa marcada só como "Presencial" na carta.
     - A palavra é ignorada quando vem negada ("não precisa comparecer") ou como opção ("por telefone ou pessoalmente", "pessoalmente ou via e-mail").
  2. **Baixa formulário e envia por e-mail**:
     - Baixar ou imprimir perto de "formulário", "requerimento" ou "ficha", ou formulário apontando para .pdf/.doc.
     - Só vale se houver e-mail ou não houver sistema.
     - "Preencher o formulário" sozinho não basta, porque é o que se faz no online. "Baixe o certificado" também não.
  3. **Formulário online ou sistema**:
     - Sinais: forms.ms.gov.br, sistema, gov.br, link real (com domínio) ou o botão "Acessar serviço" habilitado. Link vazio (`http://`) não conta.
     - Vem antes de "só e-mail" porque um e-mail de contato não tira o serviço do sistema.
  4. **Pedido só por e-mail.**
  5. **Carta não diz como pedir.**
  6. **Sem carta no portal**: o serviço não tem `slug` ou a carta não está no banco.
- **Base honesta:** todos os percentuais são sobre os 509 serviços de nível 4, incluindo "sem carta" e "não diz como pedir". A tabela mostra o **trecho da carta** que decidiu a categoria, para o gestor conferir.
- **Exibição:** aba **"2. Nível 4 na prática"** dentro de `/censo-digital`, ao lado de "1. Visão Geral", no padrão de abas da Carta de Serviços, e não como item próprio no menu.
  - Mostra a frase-âncora, os indicadores, a distribuição por forma de pedido, o ranking dos órgãos com mais "formulário + e-mail" e a tabela filtrável com exportação em CSV.
  - Não tem filtro de período: é estático, como o censo.

### Resultado da primeira carga (2026-10-28)

| Forma de pedido | Serviços | % dos 509 |
|---|--:|--:|
| Formulário online ou sistema | 359 | 70,5 |
| Sem carta no portal | 61 | 12,0 |
| Ainda pede ida presencial | 50 | 9,8 |
| Carta não diz como pedir | 17 | 3,3 |
| Baixa formulário e envia por e-mail | 12 | 2,4 |
| Pedido só por e-mail | 10 | 2,0 |

O caso que motivou a análise existe, mas é menor que o esperado. A contradição mais frequente com o nível 4 é a etapa presencial (50 serviços).

### Alternativas descartadas

- **API de serviços do Portal Único** (`admin.ms.gov.br/api/cms/servicos/?slug=`): traz os mesmos campos, mas exige uma chave de API e uma chamada por carta. O banco já é fonte do pipeline e lê tudo numa consulta.
- **Ler a página renderizada da carta:** o portal é um SPA, então isso exigiria um navegador por carta. É lento e quebra a cada mudança de layout.
- **Classificar no pipeline (Python):** deixaria a regra longe do teste com `node --test` e do resto do cálculo em `lib/` (convencoes.md).

## Consequências

- O painel passa a mostrar a diferença entre o que o órgão **declarou** (nível 4) e o que a carta **descreve**. Não muda o nível do censo, nem o "% online" da Visão Geral.
- A classificação é heurística. Carta mal escrita cai na categoria errada, e a evidência na tabela torna o erro visível. Depois de cada coleta, revisar uma amostra de cada categoria e ajustar as palavras em `censo-n4.ts` (testes em `censo-n4.test.ts`).
- `canal_prestacao` também é preenchido por quem escreve a carta. Há etapas marcadas "Presencial" que parecem só preparo, como "Reunir os documentos". A evidência mostra o nome da etapa para isso ser conferido.
- A extração depende da VPN, igual ao resto do domínio Cartas. Sem dados, a aba diz que as etapas ainda não foram lidas e não inventa números.
- Nova rodada do censo: rodar `build_censo.py` e depois `build_etapas_n4.py`.
- Achado colateral: `--ds-color-error` e `--ds-color-neutral-300/400` não existem no DS vendorizado. As telas do censo passaram a usar `--ds-color-danger` e `--ds-color-neutral-500`. Outros domínios ainda usam os tokens inexistentes.
