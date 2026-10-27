import Link from "next/link";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { agregarGoverno, matrizImpactoEsforco, type OrgaoCenso } from "@/lib/censo";
import { ComoLerEscala } from "./ComoLerEscala";
import { KpiCenso } from "./KpiCenso";
import { PizzaDistribuicao } from "./PizzaDistribuicao";
import { MatrizImpactoEsforco } from "./MatrizImpactoEsforco";

/** Aba "Visão Geral": panorama do governo na escala 0–5, ranking dos órgãos,
 * matriz impacto × esforço e atalho para a página de cada órgão. */
export function VisaoGeralTab({ orgaos }: { orgaos: OrgaoCenso[] }) {
  const p = agregarGoverno(orgaos);
  const lider = p.orgaos[0];
  const lanterna = p.orgaos[p.orgaos.length - 1];
  // maior número absoluto de serviços que podem virar digitais
  const maisOportunidade = [...p.orgaos].sort((a, b) => b.oportunidades - a.oportunidades)[0];
  const matriz = matrizImpactoEsforco(orgaos);
  const n = (v: number) => v.toLocaleString("pt-BR");
  const c = (v: number) => v.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={`${n(p.nOrgaos)} órgãos informaram ${n(p.total)} serviços. ${p.pctDigital.toLocaleString("pt-BR")}% deles (${n(p.nDigital)}) já podem ser resolvidos 100% pela internet, e ${n(p.oportunidades)} ainda exigem ir ao balcão sem obrigação legal — esses podem virar digitais.`}
        comoLer={`Cada serviço tem um grau de 0 (só presencial) a 5 (100% online e automático). Chamamos de digital quem está nos níveis 4 e 5. O grau foi informado pelo próprio órgão, sem conferência externa.${p.nSemNivel ? ` ${n(p.nSemNivel)} ${p.nSemNivel === 1 ? "serviço ficou" : "serviços ficaram"} sem grau informado e não entram nos percentuais.` : ""}${p.semResposta.length ? ` Sem serviços informados: ${p.semResposta.join(", ")}.` : ""}`}
      />

      <ComoLerEscala distribuicao={p.distribuicao} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <KpiCenso label="Serviços informados" value={p.total} sub={`por ${n(p.nOrgaos)} órgãos`} />
        <KpiCenso label="Já resolvem online" value={`${p.pctDigital.toLocaleString("pt-BR")}%`} sub={`${n(p.nDigital)} serviços (níveis 4 e 5)`} tom="digital" />
        <KpiCenso label="Online e automáticos" value={p.nTopo} sub="sem depender de servidor (nível 5)" tom="digital" />
        <KpiCenso label="Podem virar digitais" value={p.oportunidades} sub={`níveis 1 e 2 · outros ${n(p.nExigenciaLegal)} têm etapa presencial por lei`} tom="win" />
        <KpiCenso
          label="dos pedidos mensais caem em serviço 100% online"
          value={`${p.pctDemandaDigital.toLocaleString("pt-BR")}%`}
          sub={`${c(p.demandaDigital)} de ${c(p.demandaTotal)} pedidos/mês informados (${n(p.nComDemanda)} serviços)`}
          tom="info"
        />
      </div>

      <DashboardSection title="Serviços distribuídos por categorias">
        <PizzaDistribuicao distribuicao={p.distribuicao} total={p.total} />
      </DashboardSection>

      <DashboardSection title="Quais órgãos estão mais avançados na oferta de serviços digitais?">
        <RankingBarChart
          itens={p.orgaos.map((o) => ({ label: o.sigla, valor: o.pctDigital, sublabel: `${o.total} serviços` }))}
          formatarValor={(v) => `${v.toLocaleString("pt-BR")}%`}
        />
        {lider && lanterna && lider.sigla !== lanterna.sigla && (
          <p className="mt-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            <strong>{lider.sigla}</strong> lidera com {lider.pctDigital.toLocaleString("pt-BR")}% dos serviços já online.{" "}
            {maisOportunidade && maisOportunidade.oportunidades > 0 && (
              <><strong>{maisOportunidade.sigla}</strong> concentra a maior oportunidade: {n(maisOportunidade.oportunidades)} serviços que podem virar digitais.</>
            )}
          </p>
        )}
      </DashboardSection>

      <MatrizImpactoEsforco matriz={matriz} recorte="governo" />

      <DashboardSection title="Análise por órgão">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {p.orgaos.map((o) => (
            <Link
              key={o.sigla}
              href={`/censo-digital/${o.sigla.toLowerCase()}`}
              className="block rounded-md p-4 transition-colors hover:bg-[var(--ds-color-background-muted)]"
              style={{ border: "1px solid var(--ds-color-border)" }}
            >
              <div className="font-semibold text-lg" style={{ color: "var(--ds-color-primary-600)" }}>{o.sigla}</div>
              <div className="text-xs mb-3 line-clamp-2" style={{ color: "var(--ds-color-text-muted)" }}>{o.nome}</div>
              <div className="flex gap-4 text-sm">
                <Stat valor={o.total.toLocaleString("pt-BR")} rotulo="serviços" />
                <Stat valor={`${o.pctDigital.toLocaleString("pt-BR")}%`} rotulo="online" />
                <Stat valor={n(o.oportunidades)} rotulo="podem virar digitais" />
              </div>
            </Link>
          ))}
        </div>
      </DashboardSection>
    </div>
  );
}

function Stat({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <div className="font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>{valor}</div>
      <div className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>{rotulo}</div>
    </div>
  );
}
