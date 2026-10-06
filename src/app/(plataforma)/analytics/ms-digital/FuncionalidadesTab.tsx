import { ArrowRight } from "lucide-react";
import { RankingHorizontal, type ItemRanking } from "@/components/charts/RankingHorizontal";
import type { FatiaCategoria } from "@/components/charts/CategoryDonut";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { NativoWebBar } from "@/components/dashboard/NativoWebBar";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { iconeCategoria } from "@/lib/catalogo-app";
import type { InsightServico, InsightCategoria, InsightTipoUso } from "@/lib/insights";
import type { ServicoFolha } from "@/lib/servico-app-classifier";

const TOP_SERVICOS = 10;
const pct = (n: number) => `${n.toFixed(0)}%`;
const ONDE = { nativo: "no app", web: "abre site" } as const;

function Pergunta({ children, acao }: { children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h3 style={{ color: "var(--ds-color-text-primary)", fontSize: "1rem", lineHeight: 1.4, fontWeight: 600, margin: 0 }}>
        {children}
      </h3>
      {acao}
    </div>
  );
}

/** Briefing de uso, amplo → específico: onde o uso acontece (app × site) →
 * qual área → qual serviço. Dados já reclassificados em
 * lib/servico-app-classifier.ts (tela do app → categoria/serviço-folha). */
export function FuncionalidadesTab({
  servicosFolha,
  categorias,
  naoIdentificadoPct,
  insightServico,
  insightCategoria,
  insightTipoUso,
  rotuloPeriodo,
  status,
  onIrPara,
}: {
  servicosFolha: ServicoFolha[];
  categorias: FatiaCategoria[];
  naoIdentificadoPct: number;
  insightServico: InsightServico | null;
  insightCategoria: InsightCategoria | null;
  insightTipoUso: InsightTipoUso | null;
  rotuloPeriodo: string;
  status: StatusIntervalo;
  onIrPara: (id: string) => void;
}) {
  const totalServicos = servicosFolha.reduce((s, x) => s + x.acessos, 0);
  const itensServico: ItemRanking[] = servicosFolha.map((s) => ({
    label: s.servico,
    valor: s.acessos,
    sharePct: totalServicos > 0 ? (100 * s.acessos) / totalServicos : 0,
    sub: ONDE[s.tipo],
  }));
  const itensArea: ItemRanking[] = categorias.map((c) => ({
    label: c.categoria,
    valor: c.valor,
    sharePct: c.participacaoPct ?? 0,
    icone: iconeCategoria(c.categoria),
  }));
  const restantes = itensServico.slice(TOP_SERVICOS);

  return (
    <div className="flex flex-col gap-8">
      <AvisoSnapshotAproximado status={status} />

      {insightTipoUso && (
        <section className="min-w-0">
          <Pergunta>Quanto do uso acontece dentro do app?</Pergunta>
          <StoryCard
            anchor={`${pct(insightTipoUso.pctNativo)} dos acessos a serviços ${rotuloPeriodo} acontecem dentro do app; o restante abre um site do órgão.`}
            comoLer="Serviço dentro do app tem tela própria — é o que a nova plataforma precisa reconstruir. Serviço que abre site depende da página do órgão: o app só leva o cidadão até lá. Conta só acessos a serviços, sem as telas de menu."
          >
            <ChartLoading status={status} height={72}>
              <NativoWebBar
                nativo={insightTipoUso.nativo}
                web={insightTipoUso.web}
                unidade="acessos"
                rotulos={{ nativo: "no app", web: "em site" }}
              />
            </ChartLoading>
          </StoryCard>
        </section>
      )}

      <section className="min-w-0">
        <Pergunta acao={<ExportCsvButton rows={categorias} filename="app-areas-mais-usadas" />}>
          Quais áreas do app as pessoas mais usam?
        </Pergunta>
        {insightCategoria && (
          <div className="mb-4">
            <StoryCard
              anchor={`"${insightCategoria.categoria}" é a área mais usada do app, com ${pct(insightCategoria.participacaoPct)} dos acessos ${rotuloPeriodo}.`}
              comoLer="Cada área soma quem abriu o menu dela com quem usou qualquer serviço dentro dela (ex.: Servidor Público reúne Contracheque, Carteira Funcional etc.). Mostra onde concentrar esforço antes de olhar serviço por serviço."
            />
          </div>
        )}
        <ChartLoading status={status} height={320}>
          <RankingHorizontal itens={itensArea} />
        </ChartLoading>
      </section>

      <section className="min-w-0">
        <Pergunta
          acao={<ExportCsvButton rows={servicosFolha.map((s) => ({ ...s, tipo: ONDE[s.tipo] }))} filename="app-servicos-mais-usados" />}
        >
          Quais serviços as pessoas mais usam?
        </Pergunta>
        {insightServico && (
          <div className="mb-4">
            <StoryCard
              anchor={`"${insightServico.servico}" é o serviço mais usado, com ${pct(insightServico.participacaoPct)} dos acessos a serviços ${rotuloPeriodo}.`}
              comoLer={`Conta as telas de serviço abertas no app, sem as telas de menu. O selo mostra se o serviço roda dentro do app ou abre um site. Lista os ${TOP_SERVICOS} com mais acessos; os demais ficam logo abaixo.`}
            />
          </div>
        )}
        <ChartLoading status={status} height={360}>
          <RankingHorizontal itens={itensServico.slice(0, TOP_SERVICOS)} />
          {restantes.length > 0 && (
            <details className="group mt-4">
              <summary
                className="cursor-pointer text-sm font-semibold list-none [&::-webkit-details-marker]:hidden"
                style={{ color: "var(--ds-color-primary-600)" }}
              >
                <span className="group-open:hidden">Ver os outros {restantes.length} serviços</span>
                <span className="hidden group-open:inline">Esconder os outros serviços</span>
              </summary>
              <div className="mt-4">
                <RankingHorizontal itens={restantes} />
              </div>
            </details>
          )}
        </ChartLoading>
        {naoIdentificadoPct > 3 && (
          <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
            {pct(naoIdentificadoPct)} dos acessos são a telas de menu intermediário (ex.: &ldquo;Portal do Servidor&rdquo;) que não
            são área nem serviço — ficam fora das duas listas.
          </p>
        )}
        <button
          type="button"
          onClick={() => onIrPara("migracao")}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--ds-color-primary-600)" }}
        >
          Qual serviço do app migrar primeiro?
          <ArrowRight size={16} aria-hidden />
        </button>
      </section>
    </div>
  );
}
