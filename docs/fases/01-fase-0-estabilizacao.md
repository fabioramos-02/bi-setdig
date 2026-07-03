# Fase 0 — Estabilização

**Status: ✅ concluída**

## Intuito

Antes de qualquer reescrita, fazer os BIs em uso real (matomo, bench-carta)
pararem de constranger quem usa — contraste quebrado em tema claro, cores fora
do padrão gov, carregamento lento. Sem tocar arquitetura (isso é trabalho da
Fase 1+). Escopo: só os apps com usuário real hoje; cruzamento-carta e
mapeamento-inicial são estáticos e já razoáveis, receberam só auditoria.

## O que foi feito

### `ds_plotly.py` (novo, vendorizado idêntico nos 2 repos Streamlit)
- `matomo/matomo-analytics-dashboard/utils/ds_plotly.py`
- `bench-carta/src/ui/ds_plotly.py`
- Template Plotly default (`apply_ds_template()`) com paleta DS-MS e cores de
  fonte/grid que reagem ao tema ativo (`is_dark()` via `st.context.theme` com
  fallback `st.get_option`).
- Chamado 1x no topo de cada `app.py`.

### matomo (`matomo-analytics-dashboard/`)
- `.streamlit/config.toml` novo (não existia — app seguia o tema do SO,
  causa raiz do contraste quebrado).
- `utils/charts_formatter.py`: corrigido texto `#E0E0E0` hardcoded que ficava
  invisível em tema claro (heurística agora usa `is_dark()`).
- Removidas 24 ocorrências de paleta hardcoded (`Pastel`, `Set2`, `Plotly`,
  `Prism`, hex soltos) em 14 arquivos de `views/**/*.py` — o template DS supre
  a cor agora.
- `@st.cache_resource` em `get_api()`/`get_ga_api()` (antes recriava e
  reautenticava a cada rerun).
- `_load_trend_monthly_chunks` paralelizado com `ThreadPoolExecutor` (era
  serial — até 24 requests em fila num range de 2 anos).
- `utils/ui.py` novo: `empty_state()` + `inject_ds_css()`, aplicado nos 2
  pontos de "sem dados" em `app.py`.

### bench-carta
- `ds_plotly.py` aplicado, sem mais paleta local.
- `src/ui/theme.py`: dark mode completo — dict de tokens claro/escuro
  (`_LIGHT`/`_DARK`), `_refresh_globals()` corrige um bug em que as constantes
  de módulo (`theme.PRIMARY` etc., usadas por `sections.py`/`app_view.py`)
  ficavam congeladas no valor de import e não acompanhavam a troca de tema.

### cruzamento-carta
- `src/cruzamento_carta/caracteres/graficos.py`: marcadores trocados para
  paleta DS (`DS_BLUE #0d99f7`, `DS_GREEN #28a44c`, `DS_YELLOW #f9bb00`,
  `DS_RED #da1e28`).

## O que foi pulado (decisão consciente, não esquecimento)

- **`st.form` nos filtros do matomo**: risco de regressão na lógica condicional
  de período > ganho — dados já cacheados via `@st.cache_data`, reruns de
  widget não batem rede de novo.
- **Navegação lazy (tabs → sidebar radio)**: mudaria estrutura de `app.py`,
  contradiz "sem reescrever arquitetura ainda" da Fase 0; risco de quebrar aba
  silenciosamente.
- **Cards padronizados no matomo**: portar o padrão HTML/CSS do bench-carta
  pras 15 views é invasivo demais pro escopo "estabilizar", não "redesenhar".
- **Lighthouse no cruzamento-carta**: sem acesso à URL pública da Vercel
  daqui — pendente, rodar manualmente ou via CI (Fase 4).
- **mapeamento-inicial**: nenhuma ação — já consome DS via npm (antes do
  pacote quebrar, ver Fase 1) e está com contraste ok.

## Não tocado (propositalmente)

`run_export.py` e `.github/workflows/data_sync.yml` do repo matomo —
alimentam o Qlik Sense. Zero mudança até a Fase 3 decidir a transição.

## Como verificar

```bash
cd matomo/matomo-analytics-dashboard && streamlit run app.py
cd bench-carta && streamlit run app.py
```
Alternar tema claro/escuro nas configurações do Streamlit, conferir
legibilidade nas 15 abas (matomo) e 2 painéis (bench-carta).
`python run_export.py` deve gerar CSVs idênticos aos de antes (diff em
`/exports`) — nada na Fase 0 toca essa lógica.
