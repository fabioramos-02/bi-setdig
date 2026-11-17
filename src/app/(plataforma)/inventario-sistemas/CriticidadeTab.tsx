"use client";

import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { REGUA, pct, progressoCriticidade, rotuloSistema, type DadosInventario } from "@/lib/inventario-sistemas";
import { BarraPercentual, ListaSistemas, corTexto } from "./Comuns";

/** Criticidade em dois momentos: agora mostra a régua e o andamento da
 * avaliação; quando houver sistemas avaliados, mostra distribuição, os mais
 * críticos e o cruzamento com o alcance de uso. */
export function CriticidadeTab({ dados, onAbrir }: { dados: DadosInventario; onAbrir: (id: string) => void }) {
  const c = progressoCriticidade(dados.sistemas);
  const n = (v: number) => v.toLocaleString("pt-BR");
  const temAvaliacao = c.avaliados > 0;
  const anchor = temAvaliacao
    ? `${n(c.avaliados)} de ${n(c.total)} sistemas (${c.pctAvaliados}%) já têm criticidade avaliada. ${n(c.distribuicao.filter((d) => d.nivel >= 4).reduce((s, d) => s + d.total, 0))} deles ficaram em nível Alto ou Crítico.`
    : `Nenhum dos ${n(c.total)} sistemas teve a criticidade avaliada ainda. Sem isso, não é possível dizer quais sistemas precisam de mais proteção ou de plano de continuidade.`;

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={anchor}
        comoLer="Cada sistema responde 8 perguntas de sim ou não. O percentual de respostas sim define o nível, de 1 (Muito baixa) a 5 (Crítica). Ser usado por muitos órgãos é só uma das 8 perguntas: popularidade não é sinônimo de criticidade."
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <MetricCard label="Sistemas avaliados" value={`${n(c.avaliados)} de ${n(c.total)}`} sub={`${c.pctAvaliados}% do inventário`} cor={temAvaliacao ? undefined : "var(--ds-color-warning)"} />
        <MetricCard label="Avaliação começada" value={c.emAndamento} sub="com parte das 8 perguntas respondida" />
        <MetricCard label="Sem avaliação" value={c.total - c.avaliados - c.emAndamento} sub="nenhuma pergunta respondida" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <DashboardSection title="Como a criticidade é medida?">
            <ol className="flex flex-col gap-2 mb-5">
              {(dados.meta?.criterios ?? []).map((q) => (
                <li key={q.id} className="bi-body-small flex gap-2" style={{ color: corTexto.primario }}>
                  <strong style={{ color: "var(--ds-color-primary-600)", minWidth: 28 }}>{q.id}</strong>
                  {q.pergunta}
                </li>
              ))}
            </ol>
            <table className="w-full bi-table">
              <thead>
                <tr style={{ color: corTexto.secundario }}>
                  <th className="text-left py-1">Respostas sim</th>
                  <th className="text-left py-1">Nível</th>
                </tr>
              </thead>
              <tbody>
                {REGUA.map((r) => (
                  <tr key={r.nivel} style={{ borderTop: "1px solid var(--ds-color-border)" }}>
                    <td className="py-1">{r.faixa}</td>
                    <td className="py-1">{r.nivel} · {r.rotulo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardSection>
        </div>
        <div className="min-w-0">
          <DashboardSection title="Quanto da avaliação cada órgão já fez?">
            <div className="flex flex-col gap-3 max-h-[28rem] overflow-y-auto pr-1">
              {c.porOrgao.map((o) => (
                <BarraPercentual
                  key={o.sigla}
                  rotulo={o.sigla}
                  pct={pct(o.avaliados, o.total)}
                  detalhe={`${o.avaliados} de ${o.total} sistemas`}
                  cor="var(--ds-color-success)"
                />
              ))}
            </div>
          </DashboardSection>
        </div>
      </div>

      {temAvaliacao ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <DashboardSection title="Como os sistemas avaliados se distribuem por nível?">
              <RankingBarChart itens={[...c.distribuicao].reverse().map((d) => ({ label: `${d.nivel} · ${d.rotulo}`, valor: d.total }))} />
            </DashboardSection>
          </div>
          <div className="min-w-0">
            <DashboardSection title="Quais sistemas são mais críticos e usados por mais órgãos?">
              <ListaSistemas
                sistemas={c.maisCriticos}
                onAbrir={onAbrir}
                detalhe={(s) => `${s.criticidade?.rotulo} · ${s.pct}% · ${s.nOrgaosQueUsam} órgãos`}
                vazio="Nenhum sistema avaliado."
              />
              <p className="bi-caption mt-3" style={{ color: corTexto.apoio }}>
                Ordenado pela pontuação e, no empate, pelo número de órgãos que usam. Ex.: {c.maisCriticos[0] ? rotuloSistema(c.maisCriticos[0]) : ""}.
              </p>
            </DashboardSection>
          </div>
        </div>
      ) : (
        <p className="bi-body-small" style={{ color: corTexto.secundario }}>
          A distribuição por nível, a lista dos sistemas mais críticos e o cruzamento entre criticidade e número de órgãos que usam
          aparecem aqui assim que as perguntas C1 a C8 forem respondidas na planilha.
        </p>
      )}
    </div>
  );
}
