# MS_digital — dump de schema

Gerado por `data-platform/scripts/introspect_msdigital.py`. Nenhum dado
sensível é incluído (só estrutura + contagens).

- Total de tabelas: **47**
- Total de colunas: **326**

## Índice de tabelas

| Schema | Tabela | Linhas |
|---|---|---:|
| dbo | Acao | 6 |
| dbo | Auditoria_Exclusao_De_Conta | 1.107 |
| dbo | Campanha | 9 |
| dbo | Cartao_Doador_De_Sangue | 31.337 |
| dbo | CarteiraDeVacinacao | 98.905 |
| dbo | CarteiraDoAtleta | 4 |
| dbo | CarteiraFuncional | 20.596 |
| dbo | CarteiraVacinacaoRotina | 3.973 |
| dbo | Categorias_Dos_Textos | 4 |
| dbo | Categorias_Duvidas_Frequentes | 9 |
| dbo | Configuracoes_Hotsite | 3 |
| dbo | Conta | 367.508 |
| dbo | Contatos_De_Emergencia | 0 |
| dbo | Duvidas_Frequentes | 8 |
| dbo | Endereco | 6.736 |
| dbo | Endereco_Da_Vitima | 0 |
| dbo | EnderecoReu | 0 |
| dbo | Funcionalidade | 1 |
| dbo | Funcionalidade_Acao | 160 |
| dbo | Funcionalidade_Gerenciador | 38 |
| dbo | Funcionalidades_Do_App | 119 |
| dbo | Icones | 107 |
| dbo | ItemTexto | 25 |
| dbo | LeiaMSGenero | 6 |
| dbo | LeiaMSLivro | 72 |
| dbo | Medida | 0 |
| dbo | Notificacao | 24 |
| dbo | Notificacao_Usuario | 18 |
| dbo | Ocorrencia | 0 |
| dbo | Passe_Livre | 1.379 |
| dbo | Perfil | 6 |
| dbo | Privilegio | 538 |
| dbo | Relato | 24 |
| dbo | Reu | 0 |
| dbo | ReuMedida | 0 |
| dbo | SequelizeMeta | 12 |
| dbo | TextoInformativo | 9 |
| dbo | textos | 1 |
| dbo | Tipo_Funcionalidade_Gerenciador | 4 |
| dbo | Tipo_Perfil | 2 |
| dbo | TipoRelato | 3 |
| dbo | Tipos_De_Funcionalidade_do_App | 6 |
| dbo | Tipos_De_Icones | 2 |
| dbo | TipoTextoInformativo | 9 |
| dbo | Usuario | 367.501 |
| dbo | Usuario_Gerenciador | 10 |
| dbo | Usuario_Perfil | 13 |

## Detalhe por tabela

### `dbo.Acao`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | nome | nvarchar(255) | NO | `` |
| 3 | descricao | nvarchar(512) | YES | `` |
| 4 | icone | nvarchar(128) | YES | `` |
| 5 | cor | nvarchar(64) | YES | `` |
| 6 | createdAt | datetimeoffset | YES | `` |
| 7 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__Acao__3213E83FF7D27BF5)

### `dbo.Auditoria_Exclusao_De_Conta`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | cpf | char(4) | NO | `` |
| 3 | nome | nvarchar(20) | NO | `` |
| 4 | data_exclusao | datetimeoffset | NO | `` |
| 5 | motivo | nvarchar(50) | NO | `` |
| 6 | descricao | nvarchar(100) | NO | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__Auditori__3213E83F3DA285CA)

### `dbo.Campanha`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | cor | nvarchar(255) | YES | `` |
| 3 | titulo | nvarchar(255) | YES | `` |
| 4 | subtitulo | nvarchar(255) | YES | `` |
| 5 | descricao | nvarchar | YES | `` |
| 6 | status | smallint | NO | `((0))` |
| 7 | createdAt | datetimeoffset | YES | `` |
| 8 | updatedAt | datetimeoffset | YES | `` |
| 9 | mes | smallint | YES | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__Campanha__3213E83FCDCC78B7)

### `dbo.Cartao_Doador_De_Sangue`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | cpf | nvarchar(11) | NO | `` |
| 2 | codigo_de_verificacao | nvarchar(12) | NO | `` |
| 3 | createdAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `cpf` (PK__Cartao_D__D836E71EFFCC04B3)

### `dbo.CarteiraDeVacinacao`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | cpf | nvarchar(255) | NO | `` |
| 2 | codigo_de_verificacao | nvarchar(255) | NO | `` |
| 3 | createdAt | datetimeoffset | YES | `` |
| 4 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `cpf` (PK__Carteira__D836E71E29217F3B)

### `dbo.CarteiraDoAtleta`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | cpf | nvarchar(255) | NO | `` |
| 2 | codigo_de_inscricao | int | NO | `` |
| 3 | codigo_de_verificacao | nvarchar(255) | NO | `` |
| 4 | createdAt | datetimeoffset | YES | `` |
| 5 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `cpf` (PK__Carteira__D836E71EA7DA69B2)

### `dbo.CarteiraFuncional`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | matricula | nvarchar(255) | NO | `` |
| 2 | autenticacao | nvarchar(255) | YES | `` |
| 3 | token | nvarchar(255) | YES | `` |
| 4 | createdAt | datetimeoffset | YES | `` |
| 5 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `matricula` (PK__Carteira__30962D1450A2C1DF)

### `dbo.CarteiraVacinacaoRotina`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | cpf | nvarchar(255) | NO | `` |
| 2 | codigo_de_verificacao | nvarchar(255) | NO | `` |
| 3 | createdAt | datetimeoffset | YES | `` |
| 4 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `cpf` (PK__Carteira__D836E71E1F9266C0)

### `dbo.Categorias_Dos_Textos`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | titulo | nvarchar(255) | NO | `` |
| 3 | descricao | nvarchar(1024) | YES | `` |
| 4 | status | smallint | YES | `((0))` |
| 5 | createdAt | datetimeoffset | YES | `` |
| 6 | updatedAt | datetimeoffset | YES | `` |
| 7 | funcionalidadeGerenciadorID | int | YES | `` |

**Chaves:**
- FOREIGN KEY — `funcionalidadeGerenciadorID` (FK_CATEGORIAS-DOS-TEXTOS_FUNCIONALIDADE)
- PRIMARY KEY — `id` (PK__Categori__3213E83F22EF6890)

### `dbo.Categorias_Duvidas_Frequentes`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | titulo | nvarchar(100) | NO | `` |
| 3 | descricao | nvarchar(255) | YES | `` |
| 4 | createdAt | datetimeoffset | YES | `` |
| 5 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__Categori__3213E83F9BDDEEA5)

### `dbo.Configuracoes_Hotsite`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | parametro | nvarchar(50) | NO | `` |
| 2 | valor | nvarchar(100) | YES | `` |
| 3 | createdAt | datetimeoffset | YES | `` |
| 4 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `parametro` (PK__Configur__F9C4829D864598D7)

### `dbo.Conta`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | cpf | nvarchar(255) | NO | `` |
| 2 | senha | nvarchar(255) | YES | `` |
| 3 | ativo | bit | YES | `` |
| 4 | ultimoLogin | datetimeoffset | YES | `` |
| 5 | createdAt | datetimeoffset | YES | `` |
| 6 | updatedAt | datetimeoffset | YES | `` |
| 7 | contaGovBr | smallint | YES | `((0))` |

**Chaves:**
- PRIMARY KEY — `cpf` (PK__Conta__D836E71EE8616AFE)

### `dbo.Contatos_De_Emergencia`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | cpf | nvarchar(255) | YES | `` |
| 3 | nome | nvarchar(255) | YES | `` |
| 4 | telefone | nvarchar(11) | YES | `` |
| 5 | vinculo | nvarchar(10) | YES | `` |
| 6 | createdAt | datetimeoffset | YES | `` |
| 7 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `cpf` (FK_CONTATOS_DE_EMERGENCIA__USUARIO)
- PRIMARY KEY — `id` (PK__Contatos__3213E83FB8CBC2B0)

### `dbo.Duvidas_Frequentes`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | duvida | nvarchar(500) | NO | `` |
| 3 | resposta | nvarchar(2000) | NO | `` |
| 4 | categoria_ID | char(36) | YES | `` |
| 5 | destaque | bit | YES | `` |
| 6 | createdAt | datetimeoffset | YES | `` |
| 7 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `categoria_ID` (FK_CATEGORIAS_DUVIDAS_FREQUENTES_DUVIDAS_FREQUENTES)
- PRIMARY KEY — `id` (PK__Duvidas___3213E83FAA679EE5)

### `dbo.Endereco`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | cpf | nvarchar(255) | NO | `` |
| 2 | rua | nvarchar(255) | YES | `` |
| 3 | cep | nvarchar(255) | YES | `` |
| 4 | numero | int | YES | `` |
| 5 | bairro | nvarchar(255) | YES | `` |
| 6 | complemento | nvarchar(255) | YES | `` |
| 7 | cidade | int | YES | `` |
| 8 | uf | int | YES | `` |
| 9 | createdAt | datetimeoffset | YES | `` |
| 10 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `cpf` (FK__Endereco__cpf__6CD828CA)
- PRIMARY KEY — `cpf` (PK__Endereco__D836E71E70C45802)

### `dbo.Endereco_Da_Vitima`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | cpf | nvarchar(255) | YES | `` |
| 3 | cep | nvarchar(8) | YES | `` |
| 4 | cidade | int | YES | `` |
| 5 | bairro | nvarchar(255) | YES | `` |
| 6 | rua | nvarchar(255) | YES | `` |
| 7 | complemento | nvarchar(255) | YES | `` |
| 8 | numero | nvarchar(10) | YES | `` |
| 9 | uf | int | YES | `` |
| 10 | createdAt | datetimeoffset | YES | `` |
| 11 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `cpf` (FK_ENDERECO_DA_VITIMA__USUARIO)
- PRIMARY KEY — `id` (PK__Endereco__3213E83F0C9F3A37)

### `dbo.EnderecoReu`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | cpf | nvarchar(255) | YES | `` |
| 3 | cep | nvarchar(8) | YES | `` |
| 4 | cidade | int | YES | `` |
| 5 | bairro | nvarchar(255) | YES | `` |
| 6 | rua | nvarchar(255) | YES | `` |
| 7 | complemento | nvarchar(255) | YES | `` |
| 8 | numero | nvarchar(10) | YES | `` |
| 9 | tipo | nvarchar(20) | YES | `` |
| 10 | uf | int | YES | `` |
| 11 | createdAt | datetimeoffset | YES | `` |
| 12 | updatedAt | datetimeoffset | YES | `` |
| 13 | id_reu | char(36) | NO | `` |

**Chaves:**
- FOREIGN KEY — `id_reu` (FK_ENDERECO-REU_REU)
- PRIMARY KEY — `id` (PK__Endereco__3213E83FA3EB0C5E)

### `dbo.Funcionalidade`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | nome | nvarchar(255) | YES | `` |
| 3 | icone | nvarchar(255) | YES | `` |
| 4 | descricao | nvarchar(255) | YES | `` |
| 5 | tipo | int | YES | `` |
| 6 | nivel | int | YES | `` |
| 7 | caminho | nvarchar(255) | YES | `` |
| 8 | situacao | smallint | YES | `` |
| 9 | funcionalidadeId | int | YES | `` |
| 10 | createdAt | datetimeoffset | YES | `` |
| 11 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `funcionalidadeId` (FK__Funcional__funci__671F4F74)
- PRIMARY KEY — `id` (PK__Funciona__3213E83F54DEBFC1)

### `dbo.Funcionalidade_Acao`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | funcionalidadeId | int | NO | `` |
| 3 | acaoId | int | NO | `` |
| 4 | createdAt | datetimeoffset | YES | `` |
| 5 | updatedAt | datetimeoffset | YES | `` |
| 6 | tipo | smallint | YES | `((1))` |
| 7 | associacao | smallint | YES | `((1))` |

**Chaves:**
- FOREIGN KEY — `acaoId` (FK_FUNCIONALIDADEACAO_ACAO)
- FOREIGN KEY — `funcionalidadeId` (FK_FUNCIONALIDADEACAO_FUNCIONALIDADE)
- PRIMARY KEY — `id` (PK__Funciona__3213E83FA3082F3C)

### `dbo.Funcionalidade_Gerenciador`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | nome | nvarchar(255) | NO | `` |
| 3 | descricao | nvarchar(512) | YES | `` |
| 4 | tipo | smallint | YES | `` |
| 5 | funcionalidadeId | int | YES | `` |
| 6 | status | smallint | YES | `((0))` |
| 7 | createdAt | datetimeoffset | NO | `` |
| 8 | updatedAt | datetimeoffset | NO | `` |
| 9 | icone | nvarchar(128) | YES | `` |
| 10 | caminho | nvarchar(256) | YES | `` |

**Chaves:**
- FOREIGN KEY — `funcionalidadeId` (FK_FUNCIONALIDADEGER_FUNCIONALIDADE)
- FOREIGN KEY — `tipo` (FK_FUNCIONALIDADEGER_TIPO)
- PRIMARY KEY — `id` (PK__Funciona__3213E83F3191B16A)

### `dbo.Funcionalidades_Do_App`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | nome | nvarchar(255) | NO | `` |
| 3 | descricao | nvarchar(1024) | YES | `` |
| 4 | caminho | nvarchar(255) | YES | `` |
| 5 | status | smallint | YES | `((0))` |
| 6 | icone_id | char(36) | YES | `` |
| 7 | tipo_id | nvarchar(255) | YES | `` |
| 8 | funcionalidade_id | char(36) | YES | `` |
| 9 | createdAt | datetimeoffset | YES | `` |
| 10 | updatedAt | datetimeoffset | YES | `` |
| 11 | url_imagem | nvarchar(255) | YES | `` |
| 12 | destaque | bit | YES | `` |
| 13 | descricao_do_hotsite | nvarchar(500) | YES | `` |

**Chaves:**
- FOREIGN KEY — `funcionalidade_id` (FK_FUNCIONALIDADES_FUNCIONALIDADES)
- FOREIGN KEY — `icone_id` (FK_FUNCIONALIDADES-DO-APP_ICONES)
- FOREIGN KEY — `tipo_id` (FK_FUNCIONALIDADES-DO-APP_TIPO-FUNCIONALIDADE)
- PRIMARY KEY — `id` (PK__Funciona__3213E83F4BD20384)

### `dbo.Icones`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | tags | nvarchar(1024) | NO | `` |
| 3 | tipo_de_icone_id | char(36) | YES | `` |
| 4 | nome_do_arquivo | nvarchar(255) | NO | `` |
| 5 | url_icone | nvarchar(1024) | YES | `` |
| 6 | createdAt | datetimeoffset | YES | `` |
| 7 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `tipo_de_icone_id` (FK_ICONES_TIPOS_DE_ICONES)
- PRIMARY KEY — `id` (PK__Icones__3213E83F84418117)

### `dbo.ItemTexto`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | titulo | nvarchar(255) | YES | `` |
| 3 | subtitulo | nvarchar(255) | YES | `` |
| 4 | textoInformativo | int | NO | `` |
| 5 | createdAt | datetimeoffset | YES | `` |
| 6 | updatedAt | datetimeoffset | YES | `` |
| 7 | descricao | nvarchar | YES | `` |

**Chaves:**
- FOREIGN KEY — `textoInformativo` (FK__ItemTexto__texto__76619304)
- PRIMARY KEY — `id` (PK__ItemText__3213E83F1886BA32)

### `dbo.LeiaMSGenero`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | nome | nvarchar(255) | NO | `` |
| 3 | createdAt | datetimeoffset | YES | `` |
| 4 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__LeiaMSGe__3213E83F2A48C552)

### `dbo.LeiaMSLivro`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | url_do_arquivo | nvarchar(255) | NO | `` |
| 3 | nome_do_arquivo | nvarchar(255) | NO | `` |
| 4 | nome_da_obra | nvarchar(255) | NO | `` |
| 5 | genero_id | char(36) | YES | `` |
| 6 | autor | nvarchar(255) | NO | `` |
| 7 | ano | int | NO | `` |
| 8 | classificacao | nvarchar(255) | NO | `` |
| 9 | resumo_da_obra | nvarchar | YES | `` |
| 10 | url_da_capa | nvarchar(255) | YES | `` |
| 11 | nome_da_capa | nvarchar(255) | YES | `` |
| 12 | status | smallint | YES | `((0))` |
| 13 | createdAt | datetimeoffset | YES | `` |
| 14 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `genero_id` (FK_LIVRO_GENERO)
- PRIMARY KEY — `id` (PK__LeiaMSLi__3213E83F3A7B0B45)

### `dbo.Medida`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | cpf | nvarchar(255) | NO | `` |
| 3 | numeroMedida | nvarchar(255) | YES | `` |
| 4 | dataExpedicao | datetimeoffset | YES | `` |
| 5 | ativo | smallint | YES | `((1))` |
| 6 | createdAt | datetimeoffset | YES | `` |
| 7 | updatedAt | datetimeoffset | YES | `` |
| 8 | nomeDaMae | nvarchar(255) | YES | `` |
| 9 | observacoes | nvarchar(255) | YES | `` |

**Chaves:**
- FOREIGN KEY — `cpf` (FK__Medida__cpf__0D44F85C)
- PRIMARY KEY — `id` (PK__Medida__3213E83F39FD39A6)

### `dbo.Notificacao`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | nvarchar(255) | NO | `` |
| 2 | dataEnvio | datetimeoffset | YES | `` |
| 3 | titulo | nvarchar(255) | YES | `` |
| 4 | descricao | nvarchar | YES | `` |
| 5 | autorNome | nvarchar(255) | YES | `` |
| 6 | autorUsuario | nvarchar(255) | YES | `` |
| 7 | envioAgendado | bit | YES | `` |
| 8 | status | int | NO | `((1))` |
| 9 | createdAt | datetimeoffset | YES | `` |
| 10 | updatedAt | datetimeoffset | YES | `` |
| 11 | url | nvarchar(255) | YES | `` |
| 12 | publico | nvarchar(50) | YES | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__Notifica__3213E83F75BFED3D)

### `dbo.Notificacao_Usuario`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | idNotificacao | nvarchar(255) | NO | `` |
| 2 | cpfUsuario | nvarchar(255) | NO | `` |

**Chaves:**
- FOREIGN KEY — `idNotificacao` (FK_NOTIFICACAO_USUARIO__NOTIFICACAO)
- FOREIGN KEY — `cpfUsuario` (FK_NOTIFICACAO_USUARIO__USUARIO)
- PRIMARY KEY — `cpfUsuario` (PK__Notifica__3191BB8C93E24F2E)
- PRIMARY KEY — `idNotificacao` (PK__Notifica__3191BB8C93E24F2E)

### `dbo.Ocorrencia`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | cpf | nvarchar(255) | YES | `` |
| 3 | createdAt | datetimeoffset | YES | `` |
| 4 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `cpf` (FK_OCORRENCIA_USUARIO_MEDIDA)
- PRIMARY KEY — `id` (PK__Ocorrenc__3213E83FA246A05D)

### `dbo.Passe_Livre`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | cpf | nvarchar(11) | NO | `` |
| 2 | codigo_de_verificacao | nvarchar(255) | NO | `` |
| 3 | data_de_nascimento | datetimeoffset | NO | `` |
| 4 | createdAt | datetimeoffset | YES | `` |
| 5 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `cpf` (PK__Passe_Li__D836E71EA59F34DA)

### `dbo.Perfil`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | nome | nvarchar(255) | NO | `` |
| 3 | descricao | nvarchar(512) | YES | `` |
| 4 | grupoId | int | YES | `` |
| 5 | tipo | smallint | YES | `((1))` |
| 6 | status | smallint | YES | `((0))` |
| 7 | createdAt | datetimeoffset | YES | `` |
| 8 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `tipo` (FK_PERFIL_TIPO)
- PRIMARY KEY — `id` (PK__Perfil__3213E83F34E2A7B2)

### `dbo.Privilegio`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | perfilId | int | NO | `` |
| 3 | funcionalidadeAcaoId | int | NO | `` |
| 4 | createdAt | datetimeoffset | YES | `` |
| 5 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `funcionalidadeAcaoId` (FK_PRIVILEGIO_FUNCIONALIDADE)
- FOREIGN KEY — `perfilId` (FK_PRIVILEGIO_PERFIL)
- PRIMARY KEY — `id` (PK__Privileg__3213E83F464F145C)

### `dbo.Relato`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | tipo | int | NO | `` |
| 3 | descricao | nvarchar | YES | `` |
| 4 | cpf | nvarchar(255) | NO | `` |
| 5 | status | smallint | YES | `((1))` |
| 6 | createdAt | datetimeoffset | YES | `` |
| 7 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `cpf` (FK__Relato__cpf__7E02B4CC)
- FOREIGN KEY — `tipo` (FK__Relato__tipo__7D0E9093)
- PRIMARY KEY — `id` (PK__Relato__3213E83F7B3BA0B5)

### `dbo.Reu`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | nome | nvarchar(255) | YES | `` |
| 2 | createdAt | datetimeoffset | YES | `` |
| 3 | updatedAt | datetimeoffset | YES | `` |
| 4 | telefone | nvarchar(255) | YES | `` |
| 5 | data_de_nascimento | date | YES | `` |
| 6 | url_da_imagem | nvarchar(255) | YES | `` |
| 7 | cpf | nvarchar(255) | YES | `` |
| 8 | id | char(36) | NO | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__Reu__3213E83F088AEBDD)

### `dbo.ReuMedida`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | medida | int | NO | `` |
| 2 | reu | char(36) | NO | `` |
| 3 | createdAt | datetimeoffset | YES | `` |
| 4 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `medida` (FK__ReuMedida__medid__10216507)
- FOREIGN KEY — `reu` (FK_REU_MEDIDA)
- PRIMARY KEY — `medida` (PK_Reu_Medida)
- PRIMARY KEY — `reu` (PK_Reu_Medida)

### `dbo.SequelizeMeta`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | name | nvarchar(255) | NO | `` |

**Chaves:**
- PRIMARY KEY — `name` (PK__Sequeliz__72E12F1A8B4D7D38)

### `dbo.TextoInformativo`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | titulo | nvarchar(255) | YES | `` |
| 3 | descricao | nvarchar | YES | `` |
| 4 | tipo | int | NO | `` |
| 5 | status | smallint | NO | `((0))` |
| 6 | createdAt | datetimeoffset | YES | `` |
| 7 | updatedAt | datetimeoffset | YES | `` |
| 8 | funcionalidadeGerenciadorId | int | YES | `` |

**Chaves:**
- FOREIGN KEY — `tipo` (FK_TEXTO_TIPO)
- FOREIGN KEY — `funcionalidadeGerenciadorId` (FK_TEXTOS_FUNCIONALIDADEGERENCIADOR)
- PRIMARY KEY — `id` (PK__TextoInf__3213E83F7FA8E8EC)

### `dbo.textos`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | titulo | nvarchar(255) | NO | `` |
| 3 | subtitulo | nvarchar(255) | YES | `` |
| 4 | corpo | nvarchar | YES | `` |
| 5 | status | smallint | YES | `((0))` |
| 6 | createdAt | datetimeoffset | YES | `` |
| 7 | updatedAt | datetimeoffset | YES | `` |
| 8 | textoID | char(36) | YES | `` |
| 9 | funcionalidadeGerenciadorID | int | YES | `` |
| 10 | categoriaID | char(36) | YES | `` |

**Chaves:**
- FOREIGN KEY — `textoID` (FK_TEXTOS_TEXTOS)
- FOREIGN KEY — `categoriaID` (FK_TEXTOS_CATEGORIA)
- FOREIGN KEY — `funcionalidadeGerenciadorID` (FK_TEXTOS_FUNCIONALIDADE)
- PRIMARY KEY — `id` (PK__textos__3213E83FBF1FA1AF)

### `dbo.Tipo_Funcionalidade_Gerenciador`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | smallint | NO | `` |
| 2 | nome | nvarchar(255) | NO | `` |
| 3 | descricao | nvarchar(512) | YES | `` |
| 4 | ordem | int | NO | `((1))` |
| 5 | createdAt | datetimeoffset | YES | `` |
| 6 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__Tipo_Fun__3213E83F54C1A3AE)

### `dbo.Tipo_Perfil`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | smallint | NO | `` |
| 2 | nome | nvarchar(255) | NO | `` |
| 3 | createdAt | datetimeoffset | YES | `` |
| 4 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__Tipo_Per__3213E83F033E804A)

### `dbo.TipoRelato`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | nome | nvarchar(255) | YES | `` |
| 3 | status | smallint | YES | `((1))` |
| 4 | createdAt | datetimeoffset | YES | `` |
| 5 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__TipoRela__3213E83F58BDD8C6)

### `dbo.Tipos_De_Funcionalidade_do_App`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | nvarchar(255) | NO | `` |
| 2 | nome | nvarchar(255) | NO | `` |
| 3 | descricao | nvarchar(1024) | YES | `` |
| 4 | icone_id | char(36) | YES | `` |
| 5 | createdAt | datetimeoffset | YES | `` |
| 6 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- FOREIGN KEY — `icone_id` (FK_TIPOS-DE-FUNCIONALIDADE_ICONES)
- PRIMARY KEY — `id` (PK__Tipos_De__3213E83F53055C21)

### `dbo.Tipos_De_Icones`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | char(36) | NO | `` |
| 2 | nome | nvarchar(255) | NO | `` |
| 3 | descricao | nvarchar(1024) | YES | `` |
| 4 | createdAt | datetimeoffset | YES | `` |
| 5 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__Tipos_De__3213E83FAEE6CAE5)

### `dbo.TipoTextoInformativo`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | nome | nvarchar(255) | YES | `` |
| 3 | status | smallint | YES | `((1))` |
| 4 | createdAt | datetimeoffset | YES | `` |
| 5 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `id` (PK__TipoText__3213E83F2B9524F2)

### `dbo.Usuario`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | cpf | nvarchar(255) | NO | `` |
| 2 | nome | nvarchar(255) | YES | `` |
| 3 | telefone | nvarchar(255) | YES | `` |
| 4 | email | nvarchar(255) | YES | `` |
| 5 | dataNascimento | datetimeoffset | YES | `` |
| 6 | escolaridade | nvarchar(255) | YES | `` |
| 7 | createdAt | datetimeoffset | YES | `` |
| 8 | updatedAt | datetimeoffset | YES | `` |
| 9 | conta | nvarchar(255) | NO | `` |
| 10 | nomeSocial | nvarchar(150) | YES | `` |

**Chaves:**
- FOREIGN KEY — `conta` (FK__Usuario__conta__607251E5)
- PRIMARY KEY — `cpf` (PK__Usuario__D836E71EE271B332)

### `dbo.Usuario_Gerenciador`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | cpf | nvarchar(255) | NO | `` |
| 2 | usuarioId | int | YES | `` |
| 3 | nome | nvarchar(255) | YES | `` |
| 4 | login | nvarchar(255) | YES | `` |
| 5 | dominio | nvarchar(255) | YES | `` |
| 6 | email | nvarchar(255) | YES | `` |
| 7 | dataNascimento | datetimeoffset | YES | `` |
| 8 | status | smallint | YES | `((0))` |
| 9 | createdAt | datetimeoffset | YES | `` |
| 10 | updatedAt | datetimeoffset | YES | `` |

**Chaves:**
- PRIMARY KEY — `cpf` (PK__Usuario___D836E71E0C20FBE9)

### `dbo.Usuario_Perfil`

| # | Coluna | Tipo | Nulo | Default |
|---:|---|---|---|---|
| 1 | id | int | NO | `` |
| 2 | perfilId | int | NO | `` |
| 3 | usuarioId | nvarchar(255) | NO | `` |
| 4 | createdAt | datetimeoffset | NO | `` |
| 5 | updatedAt | datetimeoffset | NO | `` |

**Chaves:**
- FOREIGN KEY — `perfilId` (FK_USUARIOPERFIL_PERFIL)
- FOREIGN KEY — `usuarioId` (FK_USUARIOPERFIL_USUARIO)
- PRIMARY KEY — `id` (PK__Usuario___3213E83FE360EDD3)
