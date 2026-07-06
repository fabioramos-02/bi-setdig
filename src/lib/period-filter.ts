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
