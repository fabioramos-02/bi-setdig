import type { GA4Overview, Plataforma, Servico, Dispositivo } from "./data";

/**
 * Reconciliação app (GA4/MS Digital) × portal web (Matomo/Portal Único) — o mesmo
 * cidadão em dois canais. Cálculo fica aqui (convencoes.md: sem cálculo em
 * componente); o componente só apresenta.
 *
 * Duas grandezas por canal:
 *  - `totalApp` / `totalPortal`: quantidade de USUÁRIOS CADASTRADOS (banco,
 *    total absoluto histórico — não reage ao filtro).
 *  - `alcanceApp` / `alcancePortal`: quantos desses acessaram no período
 *    (GA4 activeUsers / Matomo visitantesUnicos — reagem ao filtro).
 */

export type ServicoCanal = { servico: string; valor: number };

export type ComparacaoCanais = {
  totalApp: number; // usuários cadastrados no app (msdigital-db.contas-resumo)
  totalPortal: number | null; // cidadãos com acesso registrado ao Portal Único (portal-unico.cadastros); null se dataset ainda não publicado
  alcanceApp: number; // usuários ativos do app no período
  alcancePortal: number; // visitantes únicos do portal no período
  appServicos: ServicoCanal[]; // top-N funcionalidades do app
  portalServicos: ServicoCanal[]; // top-N serviços do portal
  appPlataforma: Plataforma[]; // Android/iOS
  portalDispositivos: Dispositivo[]; // mobile/desktop
};

export function compararCanais(args: {
  totalApp: number;
  totalPortal: number | null;
  appVisaoGeral: GA4Overview[];
  appServicos: Servico[];
  appPlataforma: Plataforma[];
  portalUniques: number;
  portalServicos: { servico: string; visitas: number }[];
  portalDispositivos: Dispositivo[];
  topN?: number;
}): ComparacaoCanais {
  const n = args.topN ?? 5;
  return {
    totalApp: args.totalApp,
    totalPortal: args.totalPortal,
    alcanceApp: args.appVisaoGeral.reduce((acc, r) => acc + r.activeUsers, 0),
    alcancePortal: args.portalUniques,
    appServicos: args.appServicos.slice(0, n).map((s) => ({ servico: s.servico, valor: s.acessos })),
    portalServicos: args.portalServicos.slice(0, n).map((s) => ({ servico: s.servico, valor: s.visitas })),
    appPlataforma: args.appPlataforma,
    portalDispositivos: args.portalDispositivos,
  };
}
