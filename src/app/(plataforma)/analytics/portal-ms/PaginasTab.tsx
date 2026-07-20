import { EmptyCard } from "@/components/ds/EmptyCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { OportunidadeCard } from "@/components/dashboard/OportunidadeCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { agruparPaginasClassificadas, type ContextoSemantico } from "@/lib/pagina-tipo";
import { calcularComposicaoPaginas, gerarResumoPaginas, obterTemasMaisDemandados } from "@/lib/paginas-portal";
import type { Pagina } from "@/lib/data";

const TOP_N = 5;

/** Conteúdo da aba "4. Páginas mais acessadas" — pensada pra leitura de
 * gestor (AGENTS.md "BI de gestão"): o que aconteceu → o que significa →
 * oportunidade, depois serviço (transação) separado de apoio/conteúdo
 * (informação) — gestor pensa em jornada até o serviço, não em URL isolada.
 * Extraído de PortalMsClient pra não estourar 250 linhas/arquivo.
 * `rotuloPeriodo` reflete o período que o dado REALMENTE é — intervalo real
 * quando `status` é "ok" (busca ao vivo, ADR-010), snapshot do mês em
 * "fallback". `totalVisitas` é o total REAL do período (não sofre o
 * truncamento do top-20 de páginas). */
export function PaginasTab({
  paginas,
  rotuloPeriodo,
  totalVisitas,
  status,
  ctxSemantico,
}: {
  paginas: Pagina[];
  rotuloPeriodo: string;
  totalVisitas: number;
  status: StatusIntervalo;
  ctxSemantico: ContextoSemantico;
}) {
  if (paginas.length === 0) {
    return <EmptyCard message="Sem páginas acessadas no período." />;
  }

  // Agrupa por identidade resolvida, não por URL crua — a mesma carta pode
  // ser alcançada por mais de uma categoria no site real (ADR-012); sem
  // agrupar, ela aparece 2x no ranking (visitas divididas, key duplicada).
  const classificadas = agruparPaginasClassificadas(paginas, ctxSemantico);
  const servicos = classificadas.filter((p) => p.tipo === "servico");
  const apoio = classificadas.filter((p) => p.tipo !== "servico");
  const composicao = calcularComposicaoPaginas(classificadas, totalVisitas);
  const resumo = composicao ? gerarResumoPaginas(composicao, servicos, rotuloPeriodo) : null;

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />

      {resumo && (
        <StoryCard
          anchor={resumo.oQueAconteceu}
          caption={resumo.oQueSignifica}
          comoLer="Comparamos o volume de acessos à página inicial com o volume de acessos a páginas de serviço no mesmo período — não é o caminho de uma pessoa específica dentro do portal, só o tamanho de cada grupo."
        >
          <OportunidadeCard texto={resumo.oportunidade} />
        </StoryCard>
      )}

      {servicos.length > 0 && (
        <DashboardSection title="Temas mais demandados">
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {obterTemasMaisDemandados(servicos, 4).map((t) => (
              <li key={t.slug} className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border bg-white dark:bg-transparent shadow-sm hover:shadow-md transition-shadow" style={{ borderColor: "var(--ds-color-border)", color: "var(--ds-color-text-primary)" }}>
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ padding: "20px", backgroundColor: "var(--ds-color-primary-light, #EDF5FB)" }}
                >
                  <span className="material-icons" style={{ fontSize: "32px", color: "var(--ds-color-primary, rgb(0, 81, 156))" }} aria-hidden="true">
                    {t.icon}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm font-semibold text-center leading-tight">{t.titulo}</span>
                  <span className="text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>
                    {t.visitas.toLocaleString("pt-BR")} acessos
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}

      <DashboardSection
        title="Como os cidadãos utilizaram o portal?"
        action={<ExportCsvButton rows={paginas} filename="paginas-mais-acessadas" />}
      >
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <RankingSecao titulo="Serviços mais procurados" itens={servicos} status={status} vazio="Nenhuma página de serviço identificada no período." />
          <RankingSecao titulo="Páginas de apoio e informação" itens={apoio} status={status} vazio="Sem páginas de apoio no período." />
        </div>
      </DashboardSection>
    </div>
  );
}

function RankingSecao({
  titulo,
  itens,
  status,
  vazio,
}: {
  titulo: string;
  itens: { nome: string; visitas: number; href?: string }[];
  status: StatusIntervalo;
  vazio: string;
}) {
  if (itens.length === 0) {
    return (
      <div>
        <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
          {titulo}
        </h3>
        <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
          {vazio}
        </p>
      </div>
    );
  }

  const top = itens.slice(0, TOP_N);
  const restante = itens.slice(TOP_N);

  return (
    <div>
      <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-3">
        {titulo}
      </h3>
      <ChartLoading status={status} height={180}>
        <RankingBarChart itens={top.map((p) => ({ label: p.nome, valor: p.visitas, href: p.href }))} />
      </ChartLoading>

      {restante.length > 0 && (
        <details className="mt-3 print-expandir">
          <summary className="text-sm cursor-pointer" style={{ color: "var(--ds-color-text-secondary)" }}>
            Ver todas as {itens.length} páginas
          </summary>
          <ul className="text-sm mt-2 space-y-1">
            {restante.map((p) => (
              <li key={p.nome} className="flex justify-between border-t py-1" style={{ borderColor: "var(--ds-color-border)" }}>
                {p.href ? (
                  <a href={p.href} target="_blank" rel="noopener noreferrer" className="hover:underline" title={p.href}>
                    {p.nome}
                  </a>
                ) : (
                  <span>{p.nome}</span>
                )}
                <span style={{ color: "var(--ds-color-text-muted)" }}>{p.visitas.toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
