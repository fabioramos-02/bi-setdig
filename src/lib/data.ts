import fs from "node:fs";
import path from "node:path";

/**
 * Único ponto de leitura de datasets/ (ver docs/architecture/data-flow.md).
 * fs direto, não import de JSON — evita depender de resolveJsonModule e lê
 * o arquivo publicado pelo data-platform sem cache de build do bundler.
 */
function readDataset<T>(source: string, version: string, dataset: string): T | null {
  const filePath = path.join(process.cwd(), "datasets", source, version, `${dataset}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

export type VisitasResumo = {
  date: string;
  visitas: number;
  visitantesUnicos: number;
  acoes: number;
};

export type GA4Overview = {
  newVsReturning: string;
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
};

export function getMatomoVisitasResumo(): VisitasResumo[] | null {
  return readDataset<VisitasResumo[]>("matomo", "v1", "visitas-resumo");
}

export type Plataforma = { operatingSystem: string; activeUsers: number };
export type Servico = { servico: string; acessos: number };
export type EventoFunil = { evento: string; usuarios: number };
export type HorarioGa4 = { hora: string; sessoes: number };

// GA4 v2: breakdown por período fixo (dia/semana/mes/ano), igual ao Matomo —
// o filtro do MS Digital agora recorta os KPIs por período (ver run.py::GA4_PERIODOS
// e ADR-007). BreakdownPorPeriodo/BREAKDOWN_VAZIO definidos abaixo (usados no corpo
// da função, avaliados só na chamada — sem TDZ).
export function getGa4VisaoGeral(): BreakdownPorPeriodo<GA4Overview> {
  return readDataset<BreakdownPorPeriodo<GA4Overview>>("ga4", "v2", "visao-geral") ?? BREAKDOWN_VAZIO;
}
export function getGa4Plataforma(): BreakdownPorPeriodo<Plataforma> {
  return readDataset<BreakdownPorPeriodo<Plataforma>>("ga4", "v2", "plataforma") ?? BREAKDOWN_VAZIO;
}
export function getGa4Servicos(): BreakdownPorPeriodo<Servico> {
  return readDataset<BreakdownPorPeriodo<Servico>>("ga4", "v2", "servicos") ?? BREAKDOWN_VAZIO;
}
export function getGa4Funil(): BreakdownPorPeriodo<EventoFunil> {
  return readDataset<BreakdownPorPeriodo<EventoFunil>>("ga4", "v2", "funil") ?? BREAKDOWN_VAZIO;
}
export function getGa4Horarios(): BreakdownPorPeriodo<HorarioGa4> {
  return readDataset<BreakdownPorPeriodo<HorarioGa4>>("ga4", "v2", "horarios") ?? BREAKDOWN_VAZIO;
}

export type Cidade = { cidade: string; visitas: number };
export type Navegador = { navegador: string; visitas: number };
export type Dispositivo = { dispositivo: string; visitas: number };
export type Horario = { hora: string; visitas: number };
export type Pagina = { url: string; visitas: number };
export type VisitaDiaria = { data: string; visitas: number; visitantesUnicos: number; acoes: number };

/** Ver ADR-007 — breakdowns só reagem aos 4 períodos fixos do radio, não a
 * qualquer intervalo arbitrário (custo de API por período seria proibitivo). */
export type PeriodoFixo = "dia" | "semana" | "mes" | "ano";
export type BreakdownPorPeriodo<T> = Record<PeriodoFixo, T[]>;

const BREAKDOWN_VAZIO: BreakdownPorPeriodo<never> = { dia: [], semana: [], mes: [], ano: [] };

export function getMatomoGeografia(): BreakdownPorPeriodo<Cidade> {
  return readDataset<BreakdownPorPeriodo<Cidade>>("matomo", "v1", "geografia") ?? BREAKDOWN_VAZIO;
}
export function getMatomoNavegadores(): BreakdownPorPeriodo<Navegador> {
  return readDataset<BreakdownPorPeriodo<Navegador>>("matomo", "v1", "navegadores") ?? BREAKDOWN_VAZIO;
}
export function getMatomoDispositivos(): BreakdownPorPeriodo<Dispositivo> {
  return readDataset<BreakdownPorPeriodo<Dispositivo>>("matomo", "v1", "dispositivos") ?? BREAKDOWN_VAZIO;
}
export function getMatomoHorarios(): BreakdownPorPeriodo<Horario> {
  return readDataset<BreakdownPorPeriodo<Horario>>("matomo", "v1", "horarios") ?? BREAKDOWN_VAZIO;
}
export function getMatomoPaginas(): Pagina[] {
  return readDataset<Pagina[]>("matomo", "v1", "paginas-mais-acessadas") ?? [];
}
export function getMatomoVisitasDiarias(): VisitaDiaria[] {
  return readDataset<VisitaDiaria[]>("matomo", "v1", "visitas-diarias") ?? [];
}

export type TermoBusca = { termo: string; buscas: number };
export function getMatomoBusca(): TermoBusca[] {
  return readDataset<TermoBusca[]>("matomo", "v1", "busca") ?? [];
}

// --- Governança: adoção do filtro de Perfil (estudo portado do bench-carta) ---
export type PerfilResumo = {
  homeVisitors: number;
  atribuiveis: number;
  proxyRatePct: number;
  usoRealPct: number;
  umACada: number;
  limiarPct: number;
};
export type PerfilDistribuicao = { perfil: string; perfilLabel: string; visitas: number; participacaoPct: number };
export type PerfilServico = {
  servico: string;
  perfil: string;
  perfilLabel: string;
  path: string;
  visitas: number;
  exclusivo: boolean;
};
export type PerfilServicoCard = {
  servico: string;
  orgao: string;
  icone: string;
  path: string;
  visitas: number;
  exclusivo: boolean;
};
export type PerfilFiltroPeriodo = {
  resumo: PerfilResumo;
  distribuicao: PerfilDistribuicao[];
  topServicos: PerfilServico[];
  servicosPorPerfil: Record<string, PerfilServicoCard[]>;
};

const RESUMO_VAZIO: PerfilResumo = {
  homeVisitors: 0,
  atribuiveis: 0,
  proxyRatePct: 0,
  usoRealPct: 0,
  umACada: 0,
  limiarPct: 0,
};
const PERIODO_PERFIL_VAZIO: PerfilFiltroPeriodo = {
  resumo: RESUMO_VAZIO,
  distribuicao: [],
  topServicos: [],
  servicosPorPerfil: {},
};
const PERFIL_VAZIO: Record<PeriodoFixo, PerfilFiltroPeriodo> = {
  dia: PERIODO_PERFIL_VAZIO,
  semana: PERIODO_PERFIL_VAZIO,
  mes: PERIODO_PERFIL_VAZIO,
  ano: PERIODO_PERFIL_VAZIO,
};

export function getMatomoPerfilFiltro(): Record<PeriodoFixo, PerfilFiltroPeriodo> {
  return readDataset<Record<PeriodoFixo, PerfilFiltroPeriodo>>("matomo", "v1", "perfil-filtro") ?? PERFIL_VAZIO;
}

// Serviços REAIS mais acessados do portal (todas as páginas de serviço, não só as
// do filtro de Perfil) — ranqueado por visitas, por período (ADR-007).
export type ServicoAcessado = { servico: string; path: string; visitas: number };

export function getMatomoServicosMaisAcessados(): BreakdownPorPeriodo<ServicoAcessado> {
  return readDataset<BreakdownPorPeriodo<ServicoAcessado>>("matomo", "v1", "servicos-mais-acessados") ?? BREAKDOWN_VAZIO;
}

// --- Fluxo de navegação — 3 relatórios leves (não N+1), porta de
// matomo-analytics-dashboard/views/portal/tab4_jornada.py. Breakdown real por
// período (ADR-007), não amostra replicada — Entry Pages/Outlinks são 1
// chamada cada, Transitions na Home também (exceto ano, chunked no pipeline). ---
export type PaginaEntrada = { pagina: string; entradas: number };
export function getMatomoPortasEntrada(): BreakdownPorPeriodo<PaginaEntrada> {
  return readDataset<BreakdownPorPeriodo<PaginaEntrada>>("matomo", "v1", "portas-entrada") ?? BREAKDOWN_VAZIO;
}

export type DominioSaida = { dominio: string; saidas: number };
export function getMatomoFugaHub(): BreakdownPorPeriodo<DominioSaida> {
  return readDataset<BreakdownPorPeriodo<DominioSaida>>("matomo", "v1", "fuga-hub") ?? BREAKDOWN_VAZIO;
}

export type TipoJornada = { tipo: string; acessos: number; participacaoPct: number };
export type DestinoJornada = { pagina: string; tipo: string; acessos: number };
export type PadraoComportamental = { distribuicao: TipoJornada[]; topDestinos: DestinoJornada[] };

const PADRAO_COMPORTAMENTAL_VAZIO: PadraoComportamental = { distribuicao: [], topDestinos: [] };
const PADRAO_COMPORTAMENTAL_POR_PERIODO_VAZIO: Record<PeriodoFixo, PadraoComportamental> = {
  dia: PADRAO_COMPORTAMENTAL_VAZIO,
  semana: PADRAO_COMPORTAMENTAL_VAZIO,
  mes: PADRAO_COMPORTAMENTAL_VAZIO,
  ano: PADRAO_COMPORTAMENTAL_VAZIO,
};

export function getMatomoPadraoComportamental(): Record<PeriodoFixo, PadraoComportamental> {
  return (
    readDataset<Record<PeriodoFixo, PadraoComportamental>>("matomo", "v1", "padrao-comportamental") ??
    PADRAO_COMPORTAMENTAL_POR_PERIODO_VAZIO
  );
}

// --- Catálogo de serviços do app MS Digital (nativo × web) ---
// Fonte: planilha manual, gerada por data-platform/build_catalogo.py. Estático
// (não varia por período) — é a relação de serviços, não métrica de uso.
export type ServicoCatalogo = { categoria: string; servico: string; tipo: "nativo" | "web"; ativo: boolean };

export function getAppCatalogoServicos(): ServicoCatalogo[] {
  return readDataset<ServicoCatalogo[]>("app", "v1", "catalogo-servicos") ?? [];
}
