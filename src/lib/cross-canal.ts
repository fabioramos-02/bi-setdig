import type { GA4Overview, Plataforma, Servico, Dispositivo } from "./data";

/**
 * Reconciliação app (GA4/MS Digital) × portal web (Matomo/Portal MS) — o mesmo
 * cidadão em dois canais. Cálculo fica aqui (convencoes.md: sem cálculo em
 * componente); o componente só apresenta. Comparação é de ALCANCE por canal,
 * não soma: a mesma pessoa pode usar os dois, e as janelas de cada fonte não
 * são idênticas (ver comoLer na CrossCanalTab).
 */

export type ServicoCanal = { servico: string; valor: number };

export type ComparacaoCanais = {
  alcanceApp: number; // usuários ativos do app no período
  alcancePortal: number; // visitantes únicos do portal no período
  appServicos: ServicoCanal[]; // top-N funcionalidades do app
  portalServicos: ServicoCanal[]; // top-N serviços do portal
  appPlataforma: Plataforma[]; // Android/iOS
  portalDispositivos: Dispositivo[]; // mobile/desktop
};

export function compararCanais(args: {
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
    alcanceApp: args.appVisaoGeral.reduce((acc, r) => acc + r.activeUsers, 0),
    alcancePortal: args.portalUniques,
    appServicos: args.appServicos.slice(0, n).map((s) => ({ servico: s.servico, valor: s.acessos })),
    portalServicos: args.portalServicos.slice(0, n).map((s) => ({ servico: s.servico, valor: s.visitas })),
    appPlataforma: args.appPlataforma,
    portalDispositivos: args.portalDispositivos,
  };
}
