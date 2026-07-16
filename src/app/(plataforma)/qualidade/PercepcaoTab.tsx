import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { Bar, BarChart as RBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { calcularInsightPercepcao } from "@/lib/insights";
import type { PercepcaoResumo, PercepcaoOrgao } from "@/lib/data";

const FACES = [
  { nota: "1", label: "MUITO INSATISFEITO", icon: "sentiment_very_dissatisfied", color: "#ef4444" },
  { nota: "2", label: "INSATISFEITO", icon: "sentiment_dissatisfied", color: "#f97316" },
  { nota: "3", label: "REGULAR", icon: "sentiment_neutral", color: "#eab308" },
  { nota: "4", label: "SATISFEITO", icon: "sentiment_satisfied", color: "#22c55e" },
  { nota: "5", label: "MUITO SATISFEITO", icon: "sentiment_very_satisfied", color: "#16a34a" },
];

/** Aba "Avaliação da Carta": o cidadão entende e gosta do serviço — pergunta
 * diferente de "tem erro técnico" (essa é a aba Erros). CSAT (nota 1-5) +
 * clareza da descrição da carta. */
export function PercepcaoTab({
  percepcao,
  percepcaoPorOrgao,
  orgaoFiltro,
}: {
  percepcao: PercepcaoResumo | null;
  percepcaoPorOrgao: PercepcaoOrgao[];
  orgaoFiltro: string;
}) {
  const insightPercepcao = calcularInsightPercepcao(percepcao);

  if (!percepcao || !insightPercepcao) {
    return (
      <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
        Ainda não há dado de satisfação do cidadão disponível.
      </p>
    );
  }

  const csatIndex = (percepcao.csatMedia / 5) * 100;

  const chartData = (orgaoFiltro && percepcaoPorOrgao.length > 0
    ? percepcaoPorOrgao.filter(p => p.orgaoSigla === orgaoFiltro)
    : percepcaoPorOrgao
  ).map(p => {
    const total = p.totalVotos || 1;
    const n1 = p.csatDistribuicao["1"] || 0;
    const n2 = p.csatDistribuicao["2"] || 0;
    const n3 = p.csatDistribuicao["3"] || 0;
    const n4 = p.csatDistribuicao["4"] || 0;
    const n5 = p.csatDistribuicao["5"] || 0;
    return {
      orgao: p.orgaoSigla,
      n1: (n1 / total) * 100,
      n2: (n2 / total) * 100,
      n3: (n3 / total) * 100,
      n4: (n4 / total) * 100,
      n5: (n5 / total) * 100,
      insatisfacaoTotal: ((n1 + n2) / total) * 100
    };
  }).sort((a, b) => b.insatisfacaoTotal - a.insatisfacaoTotal);

  return (
    <div className="flex flex-col gap-6">
      <DashboardSection title="Satisfação dos Usuários">
        <div className="flex flex-col gap-8 py-4 px-2">
          <div className="flex flex-wrap justify-between items-center text-sm gap-6" style={{ color: "var(--ds-color-text-secondary)" }}>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="material-icons text-base">how_to_vote</span>
                <span>Total de Votos</span>
              </div>
              <div className="text-3xl font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
                {percepcao.totalVotos.toLocaleString("pt-BR")}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="material-icons text-base">bar_chart</span>
                <span>Índice CSAT</span>
              </div>
              <div className="text-3xl font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
                {csatIndex.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="material-icons text-base" style={{ color: "#eab308" }}>star</span>
                <span>Nota Média</span>
              </div>
              <div className="text-3xl font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
                {percepcao.csatMedia.toFixed(2)}/5
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-end mt-4 gap-4">
            {FACES.map((f) => {
              const total = percepcao.csatDistribuicao[f.nota as keyof typeof percepcao.csatDistribuicao] || 0;
              const pct = percepcao.totalVotos > 0 ? (total / percepcao.totalVotos) * 100 : 0;
              return (
                <div key={f.nota} className="flex flex-col items-center gap-2 flex-1 min-w-[100px]">
                  <div
                    className="flex items-center justify-center rounded-full text-white shadow-sm mb-2"
                    style={{ backgroundColor: f.color, width: 64, height: 64 }}
                  >
                    <span className="material-icons" style={{ fontSize: 40 }}>{f.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-center" style={{ color: "var(--ds-color-text-secondary)" }}>
                    {f.label}
                  </span>
                  <span className="text-xl font-bold" style={{ color: "var(--ds-color-text-primary)" }}>
                    {total}
                  </span>
                  <span className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </DashboardSection>

      {chartData.length > 0 && (
        <DashboardSection title="Satisfação por Órgão">
          <ResponsiveContainer width="100%" height={Math.max(chartData.length * 44 + 80, 200)}>
            <RBarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--ds-color-border)" />
              <XAxis type="number" hide />
              <YAxis dataKey="orgao" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 600, fill: "var(--ds-color-text-primary)" }} />
              <Tooltip
                formatter={(value) => `${Number(value || 0).toFixed(1)}%`}
                contentStyle={{ background: "var(--ds-color-background)", border: "1px solid var(--ds-color-border)", color: "var(--ds-color-text-primary)", fontSize: 12 }}
              />
              <Legend verticalAlign="top" align="right" iconType="square" wrapperStyle={{ fontSize: 12, paddingBottom: 10 }} />
              <Bar dataKey="n5" stackId="a" fill="#16a34a" name="(5)" />
              <Bar dataKey="n4" stackId="a" fill="#22c55e" name="(4)" />
              <Bar dataKey="n3" stackId="a" fill="#eab308" name="(3)" />
              <Bar dataKey="n2" stackId="a" fill="#f97316" name="(2)" />
              <Bar dataKey="n1" stackId="a" fill="#ef4444" name="(1)" />
            </RBarChart>
          </ResponsiveContainer>
          <div className="text-[11px] mt-2" style={{ color: "var(--ds-color-text-muted)" }}>
            Ranking ordenado pela taxa de insatisfação. Os órgãos no topo concentram a maior prioridade de intervenção.
          </div>
        </DashboardSection>
      )}

      <StoryCard
        anchor={`Nota média do cidadão pro serviço: ${insightPercepcao.csatMedia.toLocaleString("pt-BR")} de 5, em ${insightPercepcao.totalVotos.toLocaleString("pt-BR")} avaliações.`}
        caption={`Em ${insightPercepcao.clarezaPositivaPct.toFixed(0)}% das vezes, o cidadão achou a descrição do serviço clara.`}
        comoLer="A nota mede se o cidadão gostou do atendimento; a clareza mede se ele entendeu a explicação do serviço antes de usar. São perguntas diferentes — um serviço pode funcionar bem e ainda assim ter uma descrição confusa."
      />
    </div>
  );
}
