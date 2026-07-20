/**
 * Normalização dos payloads Matomo — porta TS de data-platform/transform/matomo.py,
 * usada só pelo Route Handler de "Intervalo de datas" (ADR-010). Mesmas
 * regras, mesmo shape de saída dos tipos já usados pelo dataset estático
 * (Navegador, Dispositivo, Horario, Cidade, Pagina, TermoBusca, ...) — as
 * Tabs que já existem não precisam saber se o dado veio do JSON ou daqui.
 */
import type { Cidade, Horario, Pagina, TermoBusca, PaginaEntrada, DominioSaida, VisitaDiaria } from "@/lib/data";

type MatomoRow = { label?: string; nb_visits?: number; url?: string };
type MatomoDailyRaw = Record<string, { nb_visits?: number; nb_uniq_visitors?: number; nb_actions?: number }>;

/** Espelhado em data-platform/transform/matomo.py (EXCLUIR_URLS) — manter em
 * sincronia. "/login/callback" é o retorno técnico do SSO (OAuth), não página
 * real acessada pelo cidadão — mesma classe de ruído filtrada de outlinks(). */
const EXCLUIR_URLS = ["/login/callback"];

/** VisitsSummary.get com period=day&date="inicio,fim" retorna {data: {...}} por dia. */
export function visitsDaily(raw: MatomoDailyRaw): VisitaDiaria[] {
  const out: VisitaDiaria[] = [];
  for (const [data, values] of Object.entries(raw ?? {})) {
    if (!values || typeof values !== "object") continue;
    out.push({ data, visitas: values.nb_visits ?? 0, visitantesUnicos: values.nb_uniq_visitors ?? 0, acoes: values.nb_actions ?? 0 });
  }
  out.sort((a, b) => a.data.localeCompare(b.data));
  return out;
}

export function topNWithOthers<K extends string>(rows: MatomoRow[], labelField: K, n: number): (Record<K, string> & { visitas: number })[] {
  if (!rows || rows.length === 0) return [];
  const ordenado = [...rows].sort((a, b) => (b.nb_visits ?? 0) - (a.nb_visits ?? 0));
  const linha = (r: MatomoRow) => ({ [labelField]: r.label ?? "", visitas: r.nb_visits ?? 0 }) as Record<K, string> & { visitas: number };
  if (ordenado.length <= n) return ordenado.map(linha);
  const top = ordenado.slice(0, n).map(linha);
  const outros = ordenado.slice(n).reduce((acc, r) => acc + (r.nb_visits ?? 0), 0);
  top.push({ [labelField]: "Outros", visitas: outros } as Record<K, string> & { visitas: number });
  return top;
}

export function citiesMs(rows: MatomoRow[]): Cidade[] {
  const out = new Map<string, number>();
  for (const item of rows ?? []) {
    const label = item.label ?? "";
    if (!label.includes("Mato Grosso do Sul")) continue;
    const cidade = (label.split(",")[0] ?? "").replace(/\s*\(.*?\)/g, "").trim();
    out.set(cidade, (out.get(cidade) ?? 0) + (item.nb_visits ?? 0));
  }
  return [...out.entries()].map(([cidade, visitas]) => ({ cidade, visitas })).sort((a, b) => b.visitas - a.visitas);
}

export function visitTime(rows: MatomoRow[]): Horario[] {
  return (rows ?? []).map((r) => ({ hora: r.label ?? "", visitas: r.nb_visits ?? 0 }));
}

export function topPages(rows: MatomoRow[], n = 20): Pagina[] {
  const flat = (rows ?? [])
    .filter((r) => !EXCLUIR_URLS.some((p) => (r.url ?? r.label ?? "").includes(p)))
    .map((r) => {
      const url = r.url ?? r.label ?? "";
      return { url: url === "/" ? "Página inicial" : url, visitas: r.nb_visits ?? 0 };
    });
  flat.sort((a, b) => b.visitas - a.visitas);
  return flat.slice(0, n);
}

/** Não trunca aqui: o corte pro top-20 é feito em mergeSearch, depois de
 * somar com os termos extraídos de URL — truncar antes subestimaria o
 * total real de buscas (ver AGENTS.md "BI de gestão"). */
export function searchKeywords(rows: MatomoRow[]): TermoBusca[] {
  const out: TermoBusca[] = [];
  for (const r of rows ?? []) {
    const termo = (r.label ?? "").trim();
    if (!termo || termo.startsWith("/")) continue;
    out.push({ termo, buscas: r.nb_visits ?? 0 });
  }
  out.sort((a, b) => b.buscas - a.buscas);
  return out;
}

const Q_RE = /[?/]q=([^&/]+)/;

export function searchFromUrls(pageUrlsRaw: MatomoRow[]): TermoBusca[] {
  const somas = new Map<string, number>();
  for (const row of pageUrlsRaw ?? []) {
    const url = row.url ?? "";
    const m = Q_RE.exec(url);
    if (!m) continue;
    const termo = decodeURIComponent(m[1]).trim().toLowerCase();
    if (termo) somas.set(termo, (somas.get(termo) ?? 0) + (row.nb_visits ?? 0));
  }
  return [...somas.entries()].map(([termo, buscas]) => ({ termo, buscas })).sort((a, b) => b.buscas - a.buscas);
}

/** Combina SiteSearch nativo + termos extraídos de URL, somando por termo.
 * Devolve top-N e o total de buscas ANTES do corte — permite calcular
 * participação real de um termo, não só sobre a lista truncada. */
export function mergeSearch(nativo: TermoBusca[], deUrls: TermoBusca[], n = 20): { termos: TermoBusca[]; total: number } {
  const somas = new Map<string, number>();
  for (const r of [...nativo, ...deUrls]) somas.set(r.termo, (somas.get(r.termo) ?? 0) + r.buscas);
  const ordenado = [...somas.entries()].map(([termo, buscas]) => ({ termo, buscas })).sort((a, b) => b.buscas - a.buscas);
  const total = ordenado.reduce((acc, r) => acc + r.buscas, 0);
  return { termos: ordenado.slice(0, n), total };
}

/** Path fica cru (sem traduzir "/" pra "Página inicial" aqui) — quem consome
 * (FluxoNavegacaoTab) classifica com classificarPagina/ADR-012, que já
 * resolve o rótulo cidadão E o tipo (serviço/órgão/página inicial);
 * traduzir cedo demais quebrava esse classificador. */
export function entryPages(rows: MatomoRow[], n = 10): PaginaEntrada[] {
  const out = (rows ?? [])
    .filter((r) => !EXCLUIR_URLS.some((p) => (r.label ?? "").includes(p)))
    .map((r) => ({ pagina: r.label ?? "", entradas: r.nb_visits ?? 0 }));
  out.sort((a, b) => b.entradas - a.entradas);
  return out.slice(0, n);
}

export function outlinks(rows: MatomoRow[], n = 10): DominioSaida[] {
  const out = (rows ?? [])
    .filter((r) => !(r.label ?? "").includes("ms.gov.br/login"))
    .map((r) => ({ dominio: r.label ?? "", saidas: r.nb_visits ?? 0 }));
  out.sort((a, b) => b.saidas - a.saidas);
  return out.slice(0, n);
}
