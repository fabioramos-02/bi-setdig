/**
 * Recalcula "perfil-filtro" e "servicos-mais-acessados" ao vivo pro intervalo
 * exato (ADR-010), server-only — usado só pelo Route Handler de portal-ms.
 *
 * Diferente de matomo-transform.ts (que porta as regras de agregação), aqui NÃO
 * reduplicamos o catálogo de serviços do portal (HIGHLIGHTED_SERVICES /
 * _SERVICE_META / labels — ~90 linhas de dados mantidos à mão em
 * transform/perfil.py). O catálogo é ESTÁVEL (não varia por período): só as
 * visitas mudam. Então recebemos o snapshot estático (perfil-filtro.mes) como
 * TEMPLATE de estrutura e só reescrevemos os números de visita a partir do
 * índice ao vivo de Actions.getPageUrls. Fonte de verdade do catálogo continua
 * única (o pipeline Python); aqui só re-pontuamos.
 */
import type { PerfilFiltroPeriodo, PerfilServico, ServicoAcessado } from "@/lib/data";

type MatomoRow = { label?: string; url?: string; nb_visits?: number; nb_hits?: number };

// Fração estimada das visitas a serviços que vêm da home — porta de
// transform/perfil.py::HOME_REFERRAL_FRACTION (amostra pequena de 2025). É a
// única constante duplicada; ADOPTION_THRESHOLD/limiarPct vem do template.
const HOME_REFERRAL_FRACTION = 0.015;

// 1º segmento de URL que conta como "página de serviço" — porta de
// transform/servicos.py::CATEGORIAS_SERVICO (lista estável de categorias do
// portal). ponytail: 22 strings estáveis; fonte de verdade em servicos.py.
const CATEGORIAS_SERVICO = new Set([
  "administracao-publica", "agropecuaria-e-vida-rural", "arte-e-cultura", "assistencia-social",
  "ciencia-e-tecnologia", "comunicacao-e-transparencia", "direitos-e-cidadania", "educacao-e-pesquisa",
  "empresa-industria-e-comercio", "energia", "esporte-e-lazer", "financas-e-impostos",
  "forcas-armadas-e-defesa-civil", "habitacao", "infraestrutura", "justica", "meio-ambiente",
  "saude-e-cuidado", "seguranca", "trabalho-emprego-e-previdencia", "transito-e-transportes", "turismo",
]);

/** Caminho limpo e comparável — porta de perfil.py::_normalize. */
function normalizePath(url: string): string {
  let u = (url || "").trim().toLowerCase().replace(/\/+$/, "");
  for (const scheme of ["https://", "http://"]) if (u.startsWith(scheme)) u = u.slice(scheme.length);
  for (const host of ["www.ms.gov.br", "ms.gov.br"]) if (u.startsWith(host)) u = u.slice(host.length);
  if (u.startsWith("/index")) u = u.slice("/index".length);
  return "/" + u.replace(/^\/+/, "");
}

/** Mapa caminho-normalizado -> visitas — porta de perfil.py::_build_index. */
function buildIndex(rows: MatomoRow[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = normalizePath(row.label || row.url || "");
    const visits = Math.trunc(Number(row.nb_visits ?? row.nb_hits ?? 0)) || 0;
    index.set(key, (index.get(key) ?? 0) + visits);
  }
  return index;
}

const round4 = (x: number) => Math.round(x * 10000) / 10000;
const pct = (parte: number, total: number) => (total > 0 ? round4((parte / total) * 100) : 0);

/**
 * Reescreve as visitas do template (snapshot mês) com o índice do intervalo e
 * recalcula resumo/distribuição/topServicos — porta de perfil.py::build_periodo,
 * mas iterando o catálogo já materializado no template em vez das dicts.
 */
export function perfilFiltroLive(rows: MatomoRow[], template: PerfilFiltroPeriodo): PerfilFiltroPeriodo {
  const index = buildIndex(rows);
  const visitasDe = (path: string) => index.get(normalizePath(path)) ?? 0;
  const home = index.get("/") ?? 0;

  // perfil -> rótulo (derivado do template, sem duplicar PROFILE_LABEL).
  const perfilLabel = new Map<string, string>();
  for (const s of template.topServicos) perfilLabel.set(s.perfil, s.perfilLabel);

  const servicosPorPerfil: Record<string, typeof template.servicosPorPerfil[string]> = {};
  for (const [perfil, cards] of Object.entries(template.servicosPorPerfil)) {
    servicosPorPerfil[perfil] = cards.map((c) => ({ ...c, visitas: visitasDe(c.path) }));
  }

  // Atribuíveis = serviços exclusivos, dedup por path.
  const pathsExclusivos = new Set<string>();
  const totaisPorPerfil = new Map<string, number>();
  for (const [perfil, cards] of Object.entries(servicosPorPerfil)) {
    let temExclusivo = false;
    let soma = 0;
    for (const c of cards) {
      if (!c.exclusivo) continue;
      temExclusivo = true;
      soma += c.visitas;
      pathsExclusivos.add(normalizePath(c.path));
    }
    if (temExclusivo) totaisPorPerfil.set(perfil, soma);
  }
  const atribuiveis = [...pathsExclusivos].reduce((acc, p) => acc + (index.get(p) ?? 0), 0);

  const proxy = home > 0 ? atribuiveis / home : 0;
  const usoReal = proxy * HOME_REFERRAL_FRACTION;
  const resumo = {
    homeVisitors: home,
    atribuiveis,
    proxyRatePct: round4(proxy * 100),
    usoRealPct: round4(usoReal * 100),
    umACada: usoReal > 0 ? Math.round(1 / usoReal) : 0,
    limiarPct: template.resumo.limiarPct, // reusa ADOPTION_THRESHOLD do template
  };

  const distribuicao = [...totaisPorPerfil.entries()]
    .map(([perfil, visitas]) => ({
      perfil,
      perfilLabel: perfilLabel.get(perfil) ?? perfil,
      visitas,
      participacaoPct: pct(visitas, atribuiveis),
    }))
    .sort((a, b) => b.visitas - a.visitas);

  // topServicos: todos os destaques re-pontuados, dedup por path, top 10.
  const vistos = new Set<string>();
  const topServicos: PerfilServico[] = [];
  const todos: PerfilServico[] = [];
  for (const [perfil, cards] of Object.entries(servicosPorPerfil)) {
    for (const c of cards) {
      todos.push({
        servico: c.servico,
        perfil,
        perfilLabel: perfilLabel.get(perfil) ?? perfil,
        path: c.path,
        visitas: c.visitas,
        exclusivo: c.exclusivo,
      });
    }
  }
  for (const row of todos.sort((a, b) => b.visitas - a.visitas)) {
    if (vistos.has(row.path)) continue;
    vistos.add(row.path);
    topServicos.push(row);
  }

  return { resumo, distribuicao, topServicos: topServicos.slice(0, 10), servicosPorPerfil };
}

const nomeDoSlug = (slug: string) => {
  const s = slug.replace(/\d+$/, "").replace(/-/g, " ").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : slug;
};

/**
 * Top N serviços REAIS do portal por visitas no intervalo — porta de
 * servicos.py::top_servicos_acessados. Nome amigável vem do catálogo do template
 * (path -> serviço) quando conhecido; senão, deriva do slug.
 */
export function topServicosLive(rows: MatomoRow[], template: PerfilFiltroPeriodo, n = 15): ServicoAcessado[] {
  const index = buildIndex(rows);
  const conhecidos = new Map<string, string>();
  for (const cards of Object.values(template.servicosPorPerfil))
    for (const c of cards) conhecidos.set(normalizePath(c.path), c.servico);

  const linhas: ServicoAcessado[] = [];
  for (const [path, visitas] of index) {
    const partes = path.split("/").filter(Boolean);
    if (partes.length < 2 || !CATEGORIAS_SERVICO.has(partes[0])) continue;
    const slug = partes[1];
    if (slug.startsWith("-") || ["", "others"].includes(nomeDoSlug(slug).toLowerCase())) continue;
    linhas.push({ servico: conhecidos.get(path) ?? nomeDoSlug(slug), path, visitas });
  }
  return linhas.sort((a, b) => b.visitas - a.visitas).slice(0, n);
}
