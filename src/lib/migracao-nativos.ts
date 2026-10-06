import type { Servico } from "./data.ts";
import { normalizar } from "./servico-app-classifier.ts";

/**
 * Prioridade de migração dos serviços NATIVOS do app pra nova plataforma.
 *
 * Mapa curado a partir da planilha "Serviços Existentes APP × Estrutura para
 * migração" (SETDIG, 2026-10): 40 telas atuais → 37 serviços-alvo. Estático
 * por natureza (é decisão de negócio, não dado de fonte) — mesma exceção do
 * catálogo e do inventário de cartas. Os números de uso, esses sim, reagem ao
 * período: entram via `serv` (telas cruas do GA4 já resolvidas no Client).
 *
 * Casa direto contra o nome da tela, sem passar pelo catálogo
 * (classificarAcessosApp): o catálogo não tem "Cartão SUS Online" (nome real
 * no app), nem as sub-telas de vacina, nem o LACEN.
 *
 * ponytail: nomes de tela fixos — se o app renomear uma tela, o alvo zera.
 * Atualização = editar `telas` aqui.
 */
export type AlvoMigracao = {
  servico: string;
  categoria: string;
  telas: string[];
  /** Serviço sem tela própria que roda dentro de uma área do app (TV/Rádio
   * tocam dentro de "Entretenimento"). Uso da área é mostrado à parte — não
   * entra no Pareto (seria contar a mesma abertura pra 2 serviços). */
  areaCompartilhada?: string;
};

export const MIGRACAO_NATIVOS: AlvoMigracao[] = [
  { servico: "Vacinas", categoria: "Saúde", telas: ["Cartão de Vacinação", "Cartão de Vacinação Covid-19", "Cartão de Vacinação de Rotina"] },
  { servico: "Cartão do SUS", categoria: "Saúde", telas: ["Cartão SUS Online", "Cartão do SUS Online"] },
  { servico: "Cartão do Doador de Sangue", categoria: "Saúde", telas: ["Cartão do Doador de Sangue"] },
  { servico: "Exames", categoria: "Saúde", telas: ["Resultado de Exames Hemosul", "Resultado de Exames LACEN"] },
  { servico: "Consultar Estabelecimentos de Saúde", categoria: "Saúde", telas: ["Estabelecimentos de Saúde"] },
  { servico: "Consultar Medicamentos", categoria: "Saúde", telas: ["Medicamentos"] },
  { servico: "Pontuação CNH", categoria: "Detran", telas: ["Pontuação CNH"] },
  { servico: "Multas", categoria: "Detran", telas: ["Multas"] },
  { servico: "Débito de Veículos", categoria: "Detran", telas: ["Débito de Veículos"] },
  { servico: "Carteira do Estudante > Consultar", categoria: "Educação", telas: ["Consultar CDIEMS"] },
  { servico: "Carteira do Estudante > Solicitar", categoria: "Educação", telas: ["Solicitar CDIEMS"] },
  { servico: "Pessoal > Servidores", categoria: "Transparência", telas: ["Servidores"] },
  { servico: "Pessoal > Diárias", categoria: "Transparência", telas: ["Diárias"] },
  { servico: "Pessoal > Passagens", categoria: "Transparência", telas: ["Passagens"] },
  { servico: "Receitas > Simplificada", categoria: "Transparência", telas: ["Simplificada"] },
  { servico: "Receitas > Consolidada", categoria: "Transparência", telas: ["Consolidada"] },
  { servico: "Receitas > Pesquisa de Receita", categoria: "Transparência", telas: ["Pesquisa de Receita"] },
  { servico: "Despesas > Despesa", categoria: "Transparência", telas: ["Despesa"] },
  { servico: "Despesas > Detran - Destinação de Multas", categoria: "Transparência", telas: ["Detran - Destinação de Multas"] },
  { servico: "Consultar Delegacias e Endereços", categoria: "Segurança", telas: ["Delegacias e Endereços", "Delegacias da Mulher"] },
  { servico: "Combate à Violência", categoria: "Segurança", telas: ["Combate à Violência"] },
  { servico: "Portal do Servidor > Contracheque", categoria: "Servidor Público", telas: ["Contracheque"] },
  { servico: "Portal do Servidor > Informe de Rendimentos", categoria: "Servidor Público", telas: ["Informe de Rendimentos"] },
  { servico: "Portal do Servidor > Carteira Funcional", categoria: "Servidor Público", telas: ["Carteira Funcional"] },
  { servico: "Portal do Servidor > BIM", categoria: "Servidor Público", telas: ["BIM"] },
  { servico: "Relatório de diárias", categoria: "Servidor Público", telas: ["Relatório de diárias"] },
  { servico: "Clube de Benefícios", categoria: "Servidor Público", telas: ["Clube de Benefícios"] },
  { servico: "Estrada Viva > Registrar Notificação", categoria: "Meio Ambiente", telas: ["Registrar Notificação"] },
  { servico: "Estrada Viva > Notificações Pendentes", categoria: "Meio Ambiente", telas: ["Notificações Pendentes"] },
  { servico: "Licenciamento Ambiental", categoria: "Meio Ambiente", telas: ["Licenciamento Ambiental"] },
  { servico: "Previsão Semanal", categoria: "Meio Ambiente", telas: ["Previsão Semanal"] },
  { servico: "Autorização de Pesca Digital (Carteira)", categoria: "Meio Ambiente", telas: ["Autorização de Pesca Digital (Carteira)"] },
  { servico: "Passe Livre Intermunicipal", categoria: "Assistência Social", telas: ["Passe Livre Intermunicipal"] },
  { servico: "Endereços dos CRAS", categoria: "Assistência Social", telas: ["Endereços dos CRAS"] },
  // Player não registra tela própria (confirmado no GA4 em 2026-10: só a tela
  // "Entretenimento"; o nome da funcionalidade vai num parâmetro de evento não
  // cadastrado) — não dá pra separar TV de Rádio.
  { servico: "TV Educativa MS", categoria: "Entretenimento", telas: [], areaCompartilhada: "Entretenimento" },
  { servico: "Rádio Educativa MS", categoria: "Entretenimento", telas: [], areaCompartilhada: "Entretenimento" },
  { servico: "Leia MS", categoria: "Cultura e Esporte", telas: ["Leia MS"] },
];

/** Corte das ondas sobre o uso acumulado (Pareto): 1ª onda = serviços que
 * somam 80% do uso, 2ª = até 95%, 3ª = o resto com algum uso. */
export const CORTE_ONDA_1 = 80;
export const CORTE_ONDA_2 = 95;

export type Onda = 1 | 2 | 3 | null;

export type ItemMigracao = {
  servico: string;
  categoria: string;
  acessos: number;
  participacaoPct: number;
  acumuladoPct: number;
  /** null = sem uso registrado no período. */
  onda: Onda;
  origens: { tela: string; acessos: number }[];
  /** Aberturas da área onde o serviço roda, sem separar qual serviço foi usado. */
  usoArea?: { area: string; acessos: number };
};

export type RankingMigracao = { itens: ItemMigracao[]; totalNativo: number };

export function rankingMigracao(serv: Servico[], alvos: AlvoMigracao[] = MIGRACAO_NATIVOS): RankingMigracao {
  const porTela = new Map<string, { tela: string; acessos: number }>();
  for (const r of serv) {
    const chave = normalizar(r.servico);
    const atual = porTela.get(chave);
    porTela.set(chave, { tela: atual?.tela ?? r.servico, acessos: (atual?.acessos ?? 0) + r.acessos });
  }

  const brutos = alvos.map((a) => {
    // Set evita contar 2x quando duas grafias do alvo normalizam igual.
    const chaves = [...new Set(a.telas.map(normalizar))];
    const origens = chaves
      .map((k) => porTela.get(k))
      .filter((o): o is { tela: string; acessos: number } => o !== undefined && o.acessos > 0)
      .sort((x, y) => y.acessos - x.acessos);
    const usoArea = a.areaCompartilhada
      ? { area: a.areaCompartilhada, acessos: porTela.get(normalizar(a.areaCompartilhada))?.acessos ?? 0 }
      : undefined;
    return { servico: a.servico, categoria: a.categoria, acessos: origens.reduce((s, o) => s + o.acessos, 0), origens, usoArea };
  });

  const totalNativo = brutos.reduce((s, b) => s + b.acessos, 0);
  let acumulado = 0;
  const itens = brutos
    .sort((a, b) => b.acessos - a.acessos)
    .map((b): ItemMigracao => {
      const participacaoPct = totalNativo > 0 ? (b.acessos / totalNativo) * 100 : 0;
      const antes = acumulado;
      acumulado += participacaoPct;
      // O item que cruza o corte entra na onda de baixo (é ele que fecha os 80%).
      const onda: Onda = b.acessos === 0 ? null : antes < CORTE_ONDA_1 ? 1 : antes < CORTE_ONDA_2 ? 2 : 3;
      return { ...b, participacaoPct, acumuladoPct: acumulado, onda };
    });

  return { itens, totalNativo };
}

export type InsightMigracao = {
  lider: string;
  liderPct: number;
  qtdOnda1: number;
  qtdOnda2: number;
  pctOnda1: number;
  semUso: string[];
  usoNaoSeparado: string[];
  total: number;
};

export function calcularInsightMigracao(r: RankingMigracao): InsightMigracao | null {
  if (r.totalNativo === 0) return null;
  const onda1 = r.itens.filter((i) => i.onda === 1);
  return {
    lider: r.itens[0].servico,
    liderPct: r.itens[0].participacaoPct,
    qtdOnda1: onda1.length,
    qtdOnda2: r.itens.filter((i) => i.onda === 2).length,
    pctOnda1: onda1.reduce((s, i) => s + i.participacaoPct, 0),
    semUso: r.itens.filter((i) => i.onda === null && !i.usoArea).map((i) => i.servico),
    usoNaoSeparado: r.itens.filter((i) => i.onda === null && i.usoArea).map((i) => i.servico),
    total: r.itens.length,
  };
}
