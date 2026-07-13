import type { PeriodoFixo, VisitaDiaria } from "./data";

/**
 * Filtro de período client-side sobre a série diária já publicada (ADR-001 —
 * nunca uma nova consulta ao Matomo). Réplica da UX do app.py antigo
 * (radios Dia/Semana/Mês/Ano/Intervalo de datas), adaptada a agregação
 * sobre dado já extraído em vez de uma query nova por período.
 */
export type PeriodoTipo = "dia" | "semana" | "mes" | "ano" | "intervalo";

export type PeriodoState = {
  tipo: PeriodoTipo;
  dataRef: string; // "referência" (igual ao app antigo) — usada por dia/semana/mes/ano
  inicio?: string; // só "intervalo"
  fim?: string; // só "intervalo"
};

export type PontoAgregado = { rotulo: string; visitas: number; visitantesUnicos: number; acoes: number };

/** Qual chave de breakdown ler para o período atual. "Intervalo" não tem
 * breakdown próprio (ADR-007) — cai no snapshot "mês". Regra única, reusada por
 * todo domínio que lê datasets no formato BreakdownPorPeriodo. */
export function chavePeriodoFixo(estado: PeriodoState): PeriodoFixo {
  return estado.tipo === "intervalo" ? "mes" : estado.tipo;
}

const DIAS_JANELA_DIA = 30;

export function aplicarFiltroPeriodo(dados: VisitaDiaria[], estado: PeriodoState): PontoAgregado[] {
  if (dados.length === 0) return [];

  if (estado.tipo === "intervalo") {
    const inicio = estado.inicio ?? dados[0].data;
    const fim = estado.fim ?? dados[dados.length - 1].data;
    return dados
      .filter((d) => d.data >= inicio && d.data <= fim)
      .map((d) => ({ rotulo: d.data, visitas: d.visitas, visitantesUnicos: d.visitantesUnicos, acoes: d.acoes }));
  }

  const ateRef = dados.filter((d) => d.data <= estado.dataRef);
  const base = ateRef.length > 0 ? ateRef : dados;

  if (estado.tipo === "dia") {
    return base
      .slice(-DIAS_JANELA_DIA)
      .map((d) => ({ rotulo: d.data, visitas: d.visitas, visitantesUnicos: d.visitantesUnicos, acoes: d.acoes }));
  }

  const granularidade = estado.tipo === "semana" ? "semana" : estado.tipo === "mes" ? "mes" : "ano";
  return agregarPor(base, granularidade);
}

function agregarPor(dados: VisitaDiaria[], granularidade: "semana" | "mes" | "ano"): PontoAgregado[] {
  const grupos = new Map<string, PontoAgregado>();
  for (const d of dados) {
    const chave =
      granularidade === "mes" ? d.data.slice(0, 7) : granularidade === "ano" ? d.data.slice(0, 4) : chaveSemanaISO(d.data);
    const atual = grupos.get(chave) ?? { rotulo: chave, visitas: 0, visitantesUnicos: 0, acoes: 0 };
    atual.visitas += d.visitas;
    atual.visitantesUnicos += d.visitantesUnicos;
    atual.acoes += d.acoes;
    grupos.set(chave, atual);
  }
  return [...grupos.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo));
}

export type ResumoPeriodo = { visitas: number; visitantesUnicos: number; acoes: number };

/** Diárias do "bucket" que contém a data de referência (ou o intervalo, se
 * for o caso) — usado pra somar os KPIs de topo conforme o período. */
function diariasDoBucket(dados: VisitaDiaria[], estado: PeriodoState): VisitaDiaria[] {
  if (dados.length === 0) return [];
  if (estado.tipo === "intervalo") {
    const inicio = estado.inicio ?? dados[0].data;
    const fim = estado.fim ?? dados[dados.length - 1].data;
    return dados.filter((d) => d.data >= inicio && d.data <= fim);
  }
  const ref = estado.dataRef;
  if (estado.tipo === "dia") return dados.filter((d) => d.data === ref);
  if (estado.tipo === "mes") return dados.filter((d) => d.data.slice(0, 7) === ref.slice(0, 7));
  if (estado.tipo === "ano") return dados.filter((d) => d.data.slice(0, 4) === ref.slice(0, 4));
  const chaveRef = chaveSemanaISO(ref);
  return dados.filter((d) => chaveSemanaISO(d.data) === chaveRef);
}

/** Totais (visitas/únicos/ações) do período selecionado — reage ao filtro.
 * Únicos são somados por dia: em períodos de vários dias é uma APROXIMAÇÃO
 * (quem visita em N dias conta N vezes) — mesma limitação do app antigo,
 * inevitável sem re-consultar o Matomo por período (ADR-001). */
export function resumoDoPeriodo(dados: VisitaDiaria[], estado: PeriodoState): ResumoPeriodo {
  return diariasDoBucket(dados, estado).reduce(
    (acc, d) => ({
      visitas: acc.visitas + d.visitas,
      visitantesUnicos: acc.visitantesUnicos + d.visitantesUnicos,
      acoes: acc.acoes + d.acoes,
    }),
    { visitas: 0, visitantesUnicos: 0, acoes: 0 },
  );
}

/** Semana ISO 8601 — desloca a data pra quinta-feira da mesma semana (o ano
 * dessa quinta é o "ano ISO"), então conta semanas desde 1º de janeiro. */
function chaveSemanaISO(dataISO: string): string {
  const data = new Date(dataISO + "T00:00:00Z");
  data.setUTCDate(data.getUTCDate() + 4 - (data.getUTCDay() || 7));
  const anoISO = data.getUTCFullYear();
  const inicioAno = new Date(Date.UTC(anoISO, 0, 1));
  const semana = Math.ceil((((data.getTime() - inicioAno.getTime()) / 86400000) + 1) / 7);
  return `${anoISO}-W${String(semana).padStart(2, "0")}`;
}

// --- Data de referência → range do período (ADR-010 estendido) --------------
// Os breakdowns não têm histórico local (1 snapshot por granularidade). Pra
// fazer a "Data de referência" mover TODOS os gráficos, traduzimos o período
// selecionado (dia/semana/mês/ano da data escolhida) num intervalo de datas e
// reusamos a busca ao vivo do "Intervalo". Helpers puros (testáveis).

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function limitar(d: string, min: string, max: string): string {
  return d < min ? min : d > max ? max : d;
}

/** Valida/normaliza uma data YYYY-MM-DD e prende no intervalo [min,max].
 * Vazio ou inválido cai em `max` (a referência padrão = período corrente). */
export function clampData(v: string, min: string, max: string): string {
  if (!RE_DATA.test(v) || Number.isNaN(new Date(v + "T00:00:00Z").getTime())) return max;
  return limitar(v, min, max);
}

function fimDoMes(d: string): string {
  const ultimo = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).getUTCDate();
  return `${d.slice(0, 7)}-${String(ultimo).padStart(2, "0")}`;
}

function boundsSemanaISO(d: string): [string, string] {
  const dt = new Date(d + "T00:00:00Z");
  const dow = dt.getUTCDay() || 7; // seg=1 … dom=7
  dt.setUTCDate(dt.getUTCDate() - (dow - 1)); // volta pra segunda
  const seg = dt.toISOString().slice(0, 10);
  dt.setUTCDate(dt.getUTCDate() + 6); // domingo
  return [seg, dt.toISOString().slice(0, 10)];
}

/** Intervalo [inicio,fim] que o período selecionado representa, clampado a
 * [min,max]. "intervalo" devolve o próprio inicio/fim do estado. */
export function intervaloDoBucket(estado: PeriodoState, min: string, max: string): { inicio: string; fim: string } {
  if (estado.tipo === "intervalo") {
    return { inicio: estado.inicio ?? min, fim: estado.fim ?? max };
  }
  const d = clampData(estado.dataRef, min, max);
  let inicio: string, fim: string;
  if (estado.tipo === "dia") {
    inicio = fim = d;
  } else if (estado.tipo === "mes") {
    inicio = `${d.slice(0, 7)}-01`;
    fim = fimDoMes(d);
  } else if (estado.tipo === "ano") {
    inicio = `${d.slice(0, 4)}-01-01`;
    fim = `${d.slice(0, 4)}-12-31`;
  } else {
    [inicio, fim] = boundsSemanaISO(d);
  }
  return { inicio: limitar(inicio, min, max), fim: limitar(fim, min, max) };
}

/** O período selecionado é o CORRENTE (contém `max`, a borda do dado)? Se sim,
 * o snapshot publicado já serve — não precisa buscar ao vivo (preserva ADR-001
 * no caso padrão). "intervalo" nunca é corrente (sempre ao vivo). */
export function ehPeriodoCorrente(estado: PeriodoState, min: string, max: string): boolean {
  if (estado.tipo === "intervalo") return false;
  const { inicio, fim } = intervaloDoBucket(estado, min, max);
  return inicio <= max && max <= fim;
}

function brData(d: string): string {
  return RE_DATA.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d;
}

/** Rótulo humano do período resolvido pra feedback no input ("maio de 2026",
 * "semana de 05/05 a 11/05/2026", "2026", "10/05/2026"). */
export function rotuloPeriodoResolvido(estado: PeriodoState): string {
  if (estado.tipo === "intervalo") {
    return estado.inicio && estado.fim ? `${brData(estado.inicio)} a ${brData(estado.fim)}` : "";
  }
  const d = estado.dataRef;
  if (!RE_DATA.test(d)) return "";
  if (estado.tipo === "ano") return d.slice(0, 4);
  if (estado.tipo === "mes") return `${MESES_PT[+d.slice(5, 7) - 1]} de ${d.slice(0, 4)}`;
  if (estado.tipo === "dia") return brData(d);
  const [ini, fim] = boundsSemanaISO(d);
  return `semana de ${brData(ini)} a ${brData(fim)}`;
}
