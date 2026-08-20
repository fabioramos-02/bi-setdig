# Spec — Aba "Contas" (MS Digital)

Cada seção da aba responde uma pergunta de negócio (AGENTS.md § "BI de
gestão"). Título visível na tela é a pergunta, nunca "COUNT" ou nome de
coluna.

## 1. Situação geral

Texto de 3-4 frases gerado por `lib/insights-contas.ts` + semáforo:

- **Verde:** taxa de ativação ≥ 90%
- **Amarelo:** 80-90%
- **Vermelho:** < 80%

Ex.: "O app tem 367.508 contas criadas; 93,6% seguem ativas. Nos últimos 6
meses, 82 mil pessoas voltaram ao app. Existem 20.596 servidores com carteira
funcional cadastrada."

## 2. KPIs (4 cards)

| Card | Pergunta | Métrica |
|---|---|---|
| Contas ativas | Quantos cidadãos têm conta ativa? | `contasAtivas` |
| Contas criadas | Quantos já criaram conta desde 2020? | `contasTotal` |
| Servidores com matrícula | Quantos servidores têm carteira funcional? | `matriculas` |
| Taxa de ativação | Quanto do cadastro permanece ativo? | `contasAtivas / contasTotal` (%) |

## 3. Contas criadas por ano

**Pergunta:** Como o app cresceu ano a ano?

Gráfico de barras empilhadas: ativas × canceladas por ano de cadastro. Dado
histórico total (2020-hoje).

**Ressalva:** Ano corrente é parcial.

## 4. Perfil etário

**Pergunta:** Qual faixa etária mais usa o app?

Histograma: 0-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+, "não informado".

**Ressalva crítica:** 92,7% dos usuários NÃO informaram data de nascimento no
cadastro. O gráfico mostra a distribuição dos ~26 mil que informaram — usar
essa ressalva em texto visível, não esconder.

## 5. Uso do app (retenção)

3 cards + StoryCard integrador. Ver `indicadores-inatividade.md`.

| Card | Pergunta | Número (2026-08-17) |
|---|---|---:|
| Nunca acessaram | Quantos criaram conta e nunca abriram o app? | 35.243 |
| Inativos há 2+ anos | Quantos abandonaram o app? | 141.850 |
| Recorrentes | Quantos usam com frequência (últimos 6 meses)? | 82.493 |

**Ressalva:** "Recorrente" = "acessou nos últimos 6 meses" (proxy — não há
contador de logins no banco).

## 6. Distribuição geográfica

**Pergunta:** Em quais cidades de MS o app é mais usado?

Mapa MS (`ChoroplethMap`) colorindo por contas ativas por município.

**Ressalva:** Só 1,8% das contas têm endereço cadastrado. Mostra
concentração dos cadastrados, não uso real.

## 7. Pontos de atenção

Bullets condicionais em `lib/insights-contas.ts`:
- Se `nuncaAcessou / total > 5%`: "X% das contas foram criadas mas nunca
  usadas — investigar fricção no primeiro acesso."
- Se `inativos2Anos / total > 30%`: "Mais de 30% das contas estão abandonadas
  há 2+ anos — considerar reengajamento ou expurgo."
- Se `sem_info_nascimento / total > 50%`: "Maioria das contas sem data de
  nascimento cadastrada — perfil etário é aproximado."
- Se `taxaAtivacao < 90%`: "Taxa de ativação abaixo de 90% — investigar
  motivos de exclusão em `Auditoria_Exclusao_De_Conta`."

## 8. Tipo de autenticação

**Pergunta (aba Contas):** Como o cidadão prefere entrar no app?
**Pergunta (aba Jornada):** Quem volta hoje é mais Gov.BR ou login próprio?

**Fonte:** `dbo.Conta.contaGovBr` (smallint no MS_digital SQL Server).

**Regra de reclassificação** (aplicada em `data-platform/transform/msdigital.py`
nas funções `contas_por_tipo_login` e `faixas_de_acesso_por_tipo`):

| Valor no banco | Bucket exibido |
|---|---|
| `1` | Gov.BR |
| `0` OU `NULL` | Login Próprio |

**Por que NULL vira Login Próprio:** contas antigas foram criadas antes de o
campo `contaGovBr` existir; o dev do MS Digital confirmou que na prática
usam login próprio do app. Reclassificamos na raiz (pipeline) para que o
painel não exponha ruído de esquema como se fosse uma terceira categoria
real de comportamento — ver AGENTS.md § "honestidade sobre limitação do
dado": esta é uma reclassificação técnica documentada, não omissão. A
ressalva aparece no `caption` visível dos dois cards que consomem o dado
(`ContasTab` e `JornadaTab`).

**Datasets publicados:**
- `datasets/msdigital-db/v1/tipo-login.json` — 2 buckets absolutos
  (`{tipo, quantidade}`). Consumido pela aba **Contas** (card "Tipo de
  autenticação").
- `datasets/msdigital-db/v1/faixas-de-acesso-por-tipo.json` — cruzamento
  faixa × tipo (`{faixa, govbr, proprio, total}` × 5 faixas). Consumido
  pela aba **Jornada** (novo StoryCard após "Faixas de acesso"), respondendo
  se a adoção do Gov.BR é maior entre quem volta ou entre quem parou.
