import type { Cidade } from "@/lib/data";

/** Os 79 municípios oficiais de MS (IBGE). Catálogo fixo por natureza — não
 * passa pelo pipeline, nunca muda (mesma exceção documentada em AGENTS.md
 * pra catálogo-servicos). */
export const MUNICIPIOS_MS: readonly string[] = [
  "Água Clara", "Alcinópolis", "Amambai", "Anastácio", "Anaurilândia",
  "Angélica", "Antônio João", "Aparecida do Taboado", "Aquidauana", "Aral Moreira",
  "Bandeirantes", "Bataguassu", "Batayporã", "Bela Vista", "Bodoquena",
  "Bonito", "Brasilândia", "Caarapó", "Camapuã", "Campo Grande",
  "Caracol", "Cassilândia", "Chapadão do Sul", "Corguinho", "Coronel Sapucaia",
  "Corumbá", "Costa Rica", "Coxim", "Deodápolis", "Dois Irmãos do Buriti",
  "Douradina", "Dourados", "Eldorado", "Fátima do Sul", "Figueirão",
  "Glória de Dourados", "Guia Lopes da Laguna", "Iguatemi", "Inocência", "Itaporã",
  "Itaquiraí", "Ivinhema", "Japorã", "Jaraguari", "Jardim",
  "Jateí", "Juti", "Ladário", "Laguna Carapã", "Maracaju",
  "Miranda", "Mundo Novo", "Naviraí", "Nioaque", "Nova Alvorada do Sul",
  "Nova Andradina", "Novo Horizonte do Sul", "Paraíso das Águas", "Paranaíba", "Paranhos",
  "Pedro Gomes", "Ponta Porã", "Porto Murtinho", "Ribas do Rio Pardo", "Rio Brilhante",
  "Rio Negro", "Rio Verde de Mato Grosso", "Rochedo", "Santa Rita do Pardo", "São Gabriel do Oeste",
  "Selvíria", "Sete Quedas", "Sidrolândia", "Sonora", "Tacuru",
  "Taquarussu", "Terenos", "Três Lagoas", "Vicentina",
];

/** A fonte de geolocalização do Matomo grafa alguns nomes diferente do
 * oficial IBGE — sem isso, o cruzamento gera falso "sem acesso". Chave já
 * normalizada (ver normalizar()). */
const ALIASES_GEOLOCALIZACAO: Record<string, string> = {
  bataipora: "Batayporã",
};

function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function reportadosNormalizados(cidades: Cidade[]): Set<string> {
  return new Set(
    cidades.map((c) => {
      const norm = normalizar(c.cidade);
      return normalizar(ALIASES_GEOLOCALIZACAO[norm] ?? c.cidade);
    }),
  );
}

/**
 * Municípios oficiais de MS COM visita no período. Conta sobre a lista
 * oficial, não sobre o que a geolocalização reportou: ela devolve rótulos que
 * não são município (bairro, grafia inexistente), então usar o tamanho da
 * lista dela dava um total incoerente com os ausentes — "49 de 79 com acesso"
 * ao lado de "34 sem acesso" (49+34=83). As duas contas têm que sair da mesma
 * base, senão o gestor vê a soma não fechar e perde a confiança no painel.
 */
export function municipiosComAcesso(cidades: Cidade[]): string[] {
  const reportados = reportadosNormalizados(cidades);
  return MUNICIPIOS_MS.filter((m) => reportados.has(normalizar(m)));
}

/** Municípios oficiais de MS sem nenhuma visita no período — complemento
 * exato de `municipiosComAcesso` (as duas somam sempre 79). */
export function municipiosSemAcesso(cidades: Cidade[]): string[] {
  const reportados = reportadosNormalizados(cidades);
  return MUNICIPIOS_MS.filter((m) => !reportados.has(normalizar(m)));
}
