import { BarChart } from "@/components/charts/BarChart";
import { CadenciaAcessoFunil } from "@/components/charts/CadenciaAcessoFunil";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { SnapshotBadge } from "@/components/dashboard/SnapshotBadge";
import { FaixasDeAcessoCard } from "@/components/dashboard/FaixasDeAcessoCard";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { rotuloEstagioFunil } from "@/lib/insights";
import type { InsightFunil } from "@/lib/insights";
import type { EventoFunil, FrequenciaAcesso, FaixaAcesso } from "@/lib/data";
import { fraseCadencia, interpretaStickiness } from "@/lib/insights-jornada";
import { fraseFaixaMaior } from "@/lib/insights-contas";

/** Peça central de storytelling do domínio — funil de aquisição -> ativação
 * -> navegação -> retenção, com a maior queda entre estágios explicada (ver
 * calcularInsightFunil em lib/insights.ts, porta de tab4_jornada.py). */
export function JornadaTab({
  funil,
  insightFunil,
  status,
  frequenciaAcesso,
  snapshotFrequenciaEm,
  faixasDeAcesso,
  snapshotFaixasEm,
  totalContas,
}: {
  funil: EventoFunil[];
  insightFunil: InsightFunil | null;
  status: StatusIntervalo;
  frequenciaAcesso: FrequenciaAcesso | null;
  snapshotFrequenciaEm: string | null;
  faixasDeAcesso: FaixaAcesso[];
  snapshotFaixasEm: string | null;
  totalContas: number;
}) {
  const dadosFunil = funil.map((f) => ({ estagio: rotuloEstagioFunil(f.evento), usuarios: f.usuarios }));

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />
      <div>
        <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
          Jornada do usuário no app: download → primeiro uso → uso do app → uso recorrente
        </h3>
        <ChartLoading status={status} height={280}>
          <BarChart data={dadosFunil} xKey="estagio" yKey="usuarios" height={280} mostrarValorNaBarra />
        </ChartLoading>
      </div>

      {insightFunil && (
        <StoryCard
          anchor={`O maior ponto de abandono é entre "${rotuloEstagioFunil(insightFunil.estagioAtual)}" e "${rotuloEstagioFunil(
            insightFunil.estagioProximo
          )}", onde ${Math.abs(insightFunil.usuariosPerdidos).toLocaleString("pt-BR")} usuários ${
            insightFunil.usuariosPerdidos >= 0 ? "somem" : "aparecem a mais"
          } (${insightFunil.quedaPct.toFixed(0)}%).`}
          caption={insightFunil.interpretacao}
          comoLer="Cada etapa conta usuários únicos que realizaram aquela ação no período — não é uma jornada estritamente sequencial por pessoa, mas revela onde o volume de gente cai mais entre uma etapa e a próxima."
        />
      )}

      {frequenciaAcesso && (
        <StoryCard
          snapshot
          anchor={fraseCadencia(frequenciaAcesso)}
          caption={interpretaStickiness(frequenciaAcesso)}
          comoLer="Cada acesso conta um dispositivo, não uma pessoa — quem usa o app em celular e tablet aparece duas vezes. As janelas de 1, 7 e 28 dias são fixas por definição (não reagem ao filtro de período). O intervalo médio é uma média entre todos os usuários — pode esconder grupos muito engajados junto de grupos que quase não voltam."
        >
          <SnapshotBadge updatedAt={snapshotFrequenciaEm} texto="Cadência apurada em" />
          <CadenciaAcessoFunil freq={frequenciaAcesso} />
        </StoryCard>
      )}

      {faixasDeAcesso.length > 0 && (
        <StoryCard
          snapshot
          anchor={fraseFaixaMaior(faixasDeAcesso)}
          caption={`Base analisada: ${totalContas.toLocaleString("pt-BR")} contas cadastradas no app.`}
          comoLer='Cada conta aparece em uma única faixa, definida pela data do último acesso registrado no cadastro. "Uma vez apenas" inclui quem criou a conta e não voltou depois do dia do cadastro — o banco guarda apenas o último acesso, não a contagem.'
        >
          <SnapshotBadge updatedAt={snapshotFaixasEm} />
          <FaixasDeAcessoCard faixas={faixasDeAcesso} />
        </StoryCard>
      )}
    </div>
  );
}
