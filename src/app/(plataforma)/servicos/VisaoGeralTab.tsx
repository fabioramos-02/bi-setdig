import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { labelCategoria, resumoPrazo, resumoPublico, agruparOrgaosSetores } from "@/lib/servicos";
import { calcularInsightConcentracaoOrgaos } from "@/lib/insights";
import { destinosPorHost, totalCliques } from "@/lib/insights-acessos-botao";
import {
  contarCartasNovosNoMes,
  gerarPontosAtencao,
  mesAtualEAnterior,
  sintetizarSituacao,
} from "@/lib/insights-visao-geral-servicos";
import type { InventarioResumo, CartaRelacao, InventarioOrgao, AcessoBotaoCarta } from "@/lib/data";
import type { LiveServicos } from "./ServicosClient";

/** Visão macro executiva de /servicos: resumo das outras 4 abas em 4 blocos
 *  textuais (Situação → Achados → Impacto → Pontos de atenção). Sem gráficos —
 *  detalhes ficam nas abas específicas. Segue AGENTS.md ("BI de gestão, não
 *  de métrica"). */
export function VisaoGeralTab({
  resumo,
  cartas,
  orgaos,
  live,
  acessosBotao,
  status,
  rotuloPeriodo,
}: {
  resumo: InventarioResumo;
  cartas: CartaRelacao[];
  orgaos: InventarioOrgao[];
  live: LiveServicos | null;
  acessosBotao: AcessoBotaoCarta[];
  status: StatusIntervalo;
  rotuloPeriodo: string;
}) {
  const totalAcessos = live ? live.porCarta.reduce((acc, c) => acc + c.visitas, 0) : null;
  const totalCliquesBotao = totalCliques(acessosBotao);
  const destinos = destinosPorHost(acessosBotao, 1);
  const destinoLider = destinos[0] ?? null;

  const situacao = sintetizarSituacao({
    servicosAtivos: resumo.ativos,
    totalAcessos,
    totalCliquesBotao,
    rotuloPeriodo,
  });

  const { grupos, temSetor } = agruparOrgaosSetores(orgaos, cartas);
  const insightConcentracao = calcularInsightConcentracaoOrgaos(grupos, temSetor);

  const orgaoDemandaTop = live?.porOrgao[0] ?? null;
  const categoriaDemandaTop = live?.porCategoria[0] ?? null;
  const orgaoDemandaPct =
    orgaoDemandaTop && totalAcessos && totalAcessos > 0
      ? (orgaoDemandaTop.visitas / totalAcessos) * 100
      : 0;
  const categoriaLiderPct =
    categoriaDemandaTop && totalAcessos && totalAcessos > 0
      ? (categoriaDemandaTop.visitas / totalAcessos) * 100
      : 0;

  const publicos = resumoPublico(cartas);
  const prazos = resumoPrazo(cartas);
  const totalPrazos = prazos.reduce((acc, f) => acc + f.total, 0);
  const imediatoPct =
    totalPrazos > 0 ? ((prazos.find((f) => f.label === "Acesso imediato")?.total ?? 0) / totalPrazos) * 100 : 0;
  const ate15DiasPct =
    totalPrazos > 0
      ? ((prazos.find((f) => f.label === "Até 15 dias")?.total ?? 0) / totalPrazos) * 100
      : 0;

  const hoje = new Date().toISOString().slice(0, 10);
  const { atual, anterior } = mesAtualEAnterior(hoje);
  const cartasNovosMesAtual = contarCartasNovosNoMes(cartas, atual);
  const cartasNovosMesAnterior = contarCartasNovosNoMes(cartas, anterior);

  const pontos = gerarPontosAtencao({
    concentracaoOrgaoPct: insightConcentracao?.participacaoPct ?? 0,
    orgaoSigla: insightConcentracao?.orgaoSigla ?? null,
    destinoLiderPct: destinoLider?.pct ?? 0,
    destinoLiderHost: destinoLider?.host ?? null,
    categoriaLiderPct,
    cartasNovosMesAtual,
    cartasNovosMesAnterior,
  });

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado
        status={status}
        mensagemFallback="Não foi possível buscar os acessos desse período agora — tenta um período menor ou tenta de novo em instantes."
      />

      <DashboardSection title="Situação geral">
        <p className="text-lg font-medium mb-2" style={{ color: "var(--ds-color-text-primary)" }}>
          {situacao.frase}
        </p>
        <p className="text-sm mb-4" style={{ color: "var(--ds-color-text-secondary)" }}>
          {situacao.notaSaude}
        </p>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Serviços ativos"
            value={resumo.ativos}
            sub={`de ${resumo.total.toLocaleString("pt-BR")} cadastrados`}
          />
          <MetricCard
            label={`Acessos a serviços ${rotuloPeriodo}`}
            value={totalAcessos ?? "—"}
            sub={live ? `soma de todas as cartas` : "aguardando dados"}
          />
          <MetricCard
            label="Cliques em Acessar Serviço"
            value={totalCliquesBotao}
            sub={destinoLider ? `${destinoLider.pct.toFixed(0)}% vai para ${destinoLider.host}` : "—"}
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Achados">
        <ul className="flex flex-col gap-3">
          {insightConcentracao && (
            <li className="flex items-start gap-3">
              <span
                className="material-icons mt-0.5"
                aria-hidden
                style={{ color: "var(--ds-color-primary-600)", fontSize: 22 }}
              >
                account_balance
              </span>
              <p className="text-base" style={{ color: "var(--ds-color-text-primary)" }}>
                <span className="font-semibold">{insightConcentracao.orgaoSigla}</span> responde por{" "}
                <span className="font-semibold">{insightConcentracao.participacaoPct.toFixed(0)}%</span> dos serviços cadastrados no portal — a maior concentração entre os {insightConcentracao.totalOrgaos} órgãos.
              </p>
            </li>
          )}
          {orgaoDemandaTop && totalAcessos !== null && totalAcessos > 0 && (
            <li className="flex items-start gap-3">
              <span
                className="material-icons mt-0.5"
                aria-hidden
                style={{ color: "var(--ds-color-primary-600)", fontSize: 22 }}
              >
                trending_up
              </span>
              <p className="text-base" style={{ color: "var(--ds-color-text-primary)" }}>
                <span className="font-semibold">{orgaoDemandaTop.rotulo}</span> recebeu{" "}
                <span className="font-semibold">{orgaoDemandaPct.toFixed(0)}%</span> dos acessos {rotuloPeriodo} — o órgão mais procurado pelo cidadão.
              </p>
            </li>
          )}
          {destinoLider && (
            <li className="flex items-start gap-3">
              <span
                className="material-icons mt-0.5"
                aria-hidden
                style={{ color: "var(--ds-color-primary-600)", fontSize: 22 }}
              >
                open_in_new
              </span>
              <p className="text-base" style={{ color: "var(--ds-color-text-primary)" }}>
                <span className="font-semibold">{destinoLider.host}</span> concentra{" "}
                <span className="font-semibold">{destinoLider.pct.toFixed(0)}%</span> dos cliques em Acessar Serviço — o sistema externo que mais recebe cidadãos do portal.
              </p>
            </li>
          )}
        </ul>
      </DashboardSection>

      <DashboardSection title="Impacto para a gestão">
        <ul className="flex flex-col gap-3">
          {publicos.length > 0 && (
            <li className="text-base" style={{ color: "var(--ds-color-text-primary)" }}>
              <span className="font-semibold">Cobertura por público:</span>{" "}
              {publicos.map((p) => `${p.label}: ${p.total.toLocaleString("pt-BR")}`).join(" · ")}.
            </li>
          )}
          {totalPrazos > 0 && (
            <li className="text-base" style={{ color: "var(--ds-color-text-primary)" }}>
              <span className="font-semibold">Prazo de atendimento:</span>{" "}
              {imediatoPct.toFixed(0)}% dos serviços têm acesso imediato
              {ate15DiasPct > 0 ? `, ${ate15DiasPct.toFixed(0)}% em até 15 dias` : ""}.
            </li>
          )}
          {cartasNovosMesAtual !== null && (
            <li className="text-base" style={{ color: "var(--ds-color-text-primary)" }}>
              <span className="font-semibold">Crescimento do catálogo:</span>{" "}
              {cartasNovosMesAtual} novos serviços cadastrados no mês atual
              {cartasNovosMesAnterior !== null ? ` (contra ${cartasNovosMesAnterior} no mês anterior)` : ""}.
            </li>
          )}
          {categoriaDemandaTop && totalAcessos !== null && totalAcessos > 0 && (
            <li className="text-base" style={{ color: "var(--ds-color-text-primary)" }}>
              <span className="font-semibold">Área mais procurada:</span>{" "}
              {labelCategoria(categoriaDemandaTop.rotulo)} responde por {categoriaLiderPct.toFixed(0)}% dos acessos {rotuloPeriodo}.
            </li>
          )}
        </ul>
      </DashboardSection>

      {pontos.length > 0 && (
        <DashboardSection title="Pontos de atenção">
          <ul className="flex flex-col gap-3">
            {pontos.map((p) => (
              <li key={p.chave} className="flex items-start gap-3">
                <span
                  className="material-icons mt-0.5"
                  aria-hidden
                  style={{ color: "var(--ds-color-warning, #b45309)", fontSize: 22 }}
                >
                  warning_amber
                </span>
                <p className="text-base" style={{ color: "var(--ds-color-text-primary)" }}>
                  {p.frase}
                </p>
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}
    </div>
  );
}
