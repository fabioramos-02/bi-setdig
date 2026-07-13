import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import type { InsightPlataforma, InsightServico } from "@/lib/insights";

/** Conteúdo da aba "Visão Geral" — resumo executivo: KPIs do período
 * selecionado + destaque de plataforma/serviço líderes, com link direto pra aba
 * de detalhe. Extraído de MsDigitalClient pra não estourar 250 linhas/arquivo. */
export function VisaoGeralTab({
  totalUsers,
  totalSessions,
  totalViews,
  novos,
  recorrentes,
  rotuloPeriodo,
  insightPlataforma,
  insightServico,
  onIrPara,
  status,
}: {
  totalUsers: number;
  totalSessions: number;
  totalViews: number;
  novos: number;
  recorrentes: number;
  rotuloPeriodo: string;
  insightPlataforma: InsightPlataforma | null;
  insightServico: InsightServico | null;
  onIrPara: (id: string) => void;
  status: StatusIntervalo;
}) {
  const totalNovosRecorrentes = novos + recorrentes;
  const recorrentesPct = totalNovosRecorrentes > 0 ? (recorrentes / totalNovosRecorrentes) * 100 : null;
  const telasPorSessao = totalSessions > 0 ? totalViews / totalSessions : 0;

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={`Usuários ativos ${rotuloPeriodo}`} value={totalUsers} />
        <MetricCard label="Sessões" value={totalSessions} />
        <MetricCard label="Visualizações de tela" value={totalViews} />
        <MetricCard label="Telas por sessão" value={telasPorSessao.toFixed(1)} />
      </div>

      {recorrentesPct !== null && (
        <StoryCard
          anchor={`${recorrentesPct.toFixed(0)}% dos usuários que acessaram o app ${rotuloPeriodo} já eram recorrentes.`}
          caption={`${recorrentes.toLocaleString("pt-BR")} recorrentes contra ${novos.toLocaleString("pt-BR")} novos.`}
          comoLer="Recorrente é quem já tinha aberto o app antes do período. Alta recorrência indica hábito de uso; muitos novos sem recorrência sugere baixa retenção — ver aba Jornada do Usuário."
        />
      )}

      <div>
        <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-3">
          Destaques
        </h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <button type="button" onClick={() => onIrPara("perfil")} className="text-left">
            <MetricCard
              label="Plataforma líder"
              value={insightPlataforma?.operatingSystem ?? "—"}
              sub={insightPlataforma ? `${insightPlataforma.participacaoPct.toFixed(0)}% dos usuários` : undefined}
            />
          </button>
          <button type="button" onClick={() => onIrPara("funcionalidades")} className="text-left">
            <MetricCard
              label="Serviço mais acessado"
              value={insightServico?.servico ?? "—"}
              sub={insightServico ? `${insightServico.participacaoPct.toFixed(0)}% dos acessos a serviços` : undefined}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
