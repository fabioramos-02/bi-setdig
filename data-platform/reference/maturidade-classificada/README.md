# Classificação de maturidade digital — vendorizado

Cópia estática de `mapeamento-inicial-servicos-digitais/data/{iagro,detran,sead}/maturidade.json`
(2026-07-10). 210 cartas classificadas individualmente (nível 0-4 + justificativa),
pela rubrica em `mapeamento-inicial-servicos-digitais/data/rubrica_maturidade.md`.

Vendorizado (não lido do path do repo irmão) porque o pipeline roda em CI/máquinas
sem esse repo disponível — ver `data-platform/transform/servicos_cartas.py::carregar_classificados()`.

Cobre só 3 órgãos (IAGRO, DETRAN, SEAD); o restante das cartas usa a heurística
determinística sobre os booleanos de cadastro (`nivel_maturidade()`). Se o
projeto `mapeamento-inicial-servicos-digitais` classificar mais órgãos, recopiar
os JSONs novos aqui.
