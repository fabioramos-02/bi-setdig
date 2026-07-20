import { EmptyCard } from "@/components/ds/EmptyCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { OportunidadeCard } from "@/components/dashboard/OportunidadeCard";
import { RankingComExpansao } from "@/components/dashboard/RankingComExpansao";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { agruparPaginasClassificadas, type ContextoSemantico } from "@/lib/pagina-tipo";
import { agruparSaidasPorOrgao } from "@/lib/dominio-orgao";
import { calcularComposicaoPaginas } from "@/lib/paginas-portal";
import { gerarResumoFluxo } from "@/lib/fluxo-portal";
import type { PaginaEntrada, DominioSaida } from "@/lib/data";

/** Conteúdo da aba "6. Fluxo de Navegação" — pensada pra leitura de gestor
 * (AGENTS.md "BI de gestão"): como o cidadão chega → pra onde segue depois →
 * oportunidade. Entradas e saídas passam pelo mesmo dicionário de páginas/
 * órgãos das outras abas (ADR-012) — nunca URL crua ou domínio técnico em
 * destaque. "Para onde segue" é continuidade da jornada num sistema do
 * governo (o cidadão achou o serviço e foi executá-lo lá), não abandono do
 * portal — e é composição agregada, não jornada por visitante: Transitions
 * foi removido do pipeline por instabilidade (ADR-010). Extraído de
 * PortalMsClient pra não estourar 250 linhas/arquivo. */
export function FluxoNavegacaoTab({
  portasEntrada,
  fugaHub,
  rotuloPeriodo,
  totalVisitas,
  status,
  ctxSemantico,
}: {
  portasEntrada: PaginaEntrada[];
  fugaHub: DominioSaida[];
  rotuloPeriodo: string;
  totalVisitas: number;
  status: StatusIntervalo;
  ctxSemantico: ContextoSemantico;
}) {
  if (portasEntrada.length === 0 && fugaHub.length === 0) {
    return <EmptyCard message="Ainda não há esse dado disponível — deve aparecer aqui em breve." />;
  }

  // Mesma função de classificação/agrupamento da aba "Páginas mais acessadas"
  // (ADR-012) — entrada é só outro tipo de contagem de página, mesmo
  // dicionário serve.
  const entradasClassificadas = agruparPaginasClassificadas(
    portasEntrada.map((p) => ({ url: p.pagina, visitas: p.entradas })),
    ctxSemantico,
  );
  const servicosEntrada = entradasClassificadas.filter((p) => p.tipo === "servico");
  const saidasAgrupadas = agruparSaidasPorOrgao(fugaHub);

  const composicaoEntrada = calcularComposicaoPaginas(entradasClassificadas, totalVisitas);
  const resumo = composicaoEntrada ? gerarResumoFluxo(composicaoEntrada, servicosEntrada, saidasAgrupadas, rotuloPeriodo) : null;

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />

      {resumo && (
        <StoryCard
          anchor={resumo.comoChegam}
          caption={resumo.paraOndeSeguem}
          comoLer="Entrada é a primeira página que a pessoa abre na visita. Saída é pra qual outro sistema do governo ela segue depois — não significa que ela desistiu, é a continuidade do atendimento em outro sistema."
        >
          <OportunidadeCard texto={resumo.oportunidade} />
        </StoryCard>
      )}

      <DashboardSection title="Como os cidadãos chegam e para onde seguem">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <RankingComExpansao
            titulo="Portas de entrada"
            itens={entradasClassificadas.map((p) => ({ nome: p.nome, valor: p.visitas, href: p.href }))}
            cor="var(--ds-color-green-600)"
            status={status}
            vazio="Sem entradas no período."
            rotuloItem="pontos de entrada"
          />
          <RankingComExpansao
            titulo="Saídas para outros serviços"
            itens={saidasAgrupadas.map((s) => ({ nome: s.nome, valor: s.saidas }))}
            cor="var(--ds-color-red-600)"
            status={status}
            vazio="Sem saídas no período."
            rotuloItem="órgãos/sistemas"
          />
        </div>
      </DashboardSection>
    </div>
  );
}
