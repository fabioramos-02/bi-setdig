"use client";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { AgeHistogram } from "@/components/charts/AgeHistogram";
import { ChoroplethMap } from "@/components/charts/ChoroplethMap";
import type {
  ContasResumo,
  ContaPorAno,
  ContaPorFaixaEtaria,
  ContaPorCidade,
  UsoRetencao,
} from "@/lib/data";
import {
  pctSemInformacaoNascimento,
  pontosAtencao,
  saudeAtivacao,
  situacaoGeral,
} from "@/lib/insights-contas";

const CORES_SAUDE = {
  verde: "var(--ds-color-success)",
  amarelo: "var(--ds-color-warning)",
  vermelho: "var(--ds-color-danger)",
} as const;

/** Aba "Contas" — cadastro do app MS Digital (SQL Server MS_digital).
 * Snapshot único, ignora o filtro de período (cadastro é estado, não série).
 * Ver docs/msdigital/spec-contas.md. */
export function ContasTab({
  resumo,
  porAno,
  faixaEtaria,
  porCidade,
  retencao,
}: {
  resumo: ContasResumo;
  porAno: ContaPorAno[];
  faixaEtaria: ContaPorFaixaEtaria[];
  porCidade: ContaPorCidade[];
  retencao: UsoRetencao | null;
}) {
  const saude = saudeAtivacao(resumo.taxaAtivacaoPct);
  const situacao = situacaoGeral(resumo, retencao);
  const alertas = pontosAtencao(resumo, retencao, faixaEtaria);
  const pctSemNascimento = pctSemInformacaoNascimento(faixaEtaria);

  const canceladas = resumo.contasTotal - resumo.contasAtivas;
  const anoAtual = new Date().getFullYear();

  const itensPorAno = porAno.map((r) => ({
    label: r.ano === anoAtual ? `${r.ano} (parcial)` : String(r.ano),
    atendidos: r.ativas,
    pendentes: Math.max(0, r.criadas - r.ativas),
  }));

  // ChoroplethMap espera {cidade, visitas} — reusar sem tocar no componente.
  const cidadesParaMapa = porCidade
    .filter((c) => c.codigoIbge)
    .map((c) => ({ cidade: c.cidade, visitas: c.ativas }));

  const topCidades = porCidade.slice(0, 5);
  const percentComEndereco = resumo.contasTotal > 0
    ? (100 * porCidade.reduce((acc, c) => acc + c.ativas, 0)) / resumo.contasAtivas
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Situação Geral */}
      <DashboardSection title="Situação geral">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div
            aria-hidden
            style={{ background: CORES_SAUDE[saude.nivel] }}
            className="w-3 h-3 rounded-full mt-2 shrink-0"
          />
          <div>
            <p style={{ color: "var(--ds-color-text-primary)" }} className="text-base font-semibold">
              {saude.texto}
            </p>
            <p style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm mt-2">
              {situacao}
            </p>
          </div>
        </div>
      </DashboardSection>

      {/* 2. KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Contas ativas"
          value={resumo.contasAtivas}
          sub={`${resumo.taxaAtivacaoPct.toFixed(1)}% do total`}
        />
        <MetricCard label="Contas criadas" value={resumo.contasTotal} sub="desde 2020" />
        <MetricCard
          label="Servidores com matrícula"
          value={resumo.matriculas}
          sub="carteira funcional cadastrada"
        />
        <MetricCard
          label="Taxa de ativação"
          value={`${resumo.taxaAtivacaoPct.toFixed(1)}%`}
          sub="contas ativas / criadas"
        />
      </div>

      {/* 3. Contas criadas por ano */}
      <StoryCard
        anchor={`O app cresceu de ${porAno[0]?.criadas.toLocaleString("pt-BR") ?? "—"} contas em ${porAno[0]?.ano ?? "—"} para ${resumo.contasTotal.toLocaleString("pt-BR")} contas hoje.`}
        caption={`${resumo.contasAtivas.toLocaleString("pt-BR")} ativas, ${canceladas.toLocaleString("pt-BR")} canceladas.`}
        comoLer="Cada barra mostra as contas criadas naquele ano — verde são as que seguem ativas, vermelho as que foram canceladas ou desativadas. O ano corrente é parcial (fecha em 31/12)."
      >
        <StackedBarChart itens={itensPorAno} />
      </StoryCard>

      {/* 4. Perfil etário */}
      <StoryCard
        anchor="Qual faixa etária mais usa o app?"
        caption={
          pctSemNascimento > 50
            ? `Apenas ${(100 - pctSemNascimento).toFixed(0)}% dos usuários informaram a data de nascimento — o gráfico mostra o perfil dessa parcela.`
            : "Distribuição das contas por faixa etária."
        }
        comoLer='A barra "Não informado" reúne os cadastros sem data de nascimento no banco — não significa que essas contas não existem, só que o perfil etário delas é desconhecido.'
      >
        <AgeHistogram faixas={faixaEtaria} />
      </StoryCard>

      {/* 5. Uso do app */}
      {retencao && (
        <StoryCard
          anchor={`${retencao.recorrentes6Meses.toLocaleString("pt-BR")} pessoas voltaram ao app nos últimos 6 meses.`}
          caption={`${retencao.nuncaAcessou.toLocaleString("pt-BR")} contas foram criadas mas nunca abriram o app; ${retencao.inativos2Anos.toLocaleString("pt-BR")} estão sem acesso há mais de 2 anos.`}
          comoLer='"Recorrente" aqui significa "acessou nos últimos 6 meses" — o banco registra apenas a data do último acesso, não a quantidade de vezes que a pessoa entrou.'
        >
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <MetricCard
              label="Nunca acessaram"
              value={retencao.nuncaAcessou}
              sub={`${((100 * retencao.nuncaAcessou) / retencao.totalContas).toFixed(1)}% das contas`}
            />
            <MetricCard
              label="Sem acesso há 2+ anos"
              value={retencao.inativos2Anos}
              sub={`${((100 * retencao.inativos2Anos) / retencao.totalContas).toFixed(1)}% das contas`}
            />
            <MetricCard
              label="Acesso nos últimos 6 meses"
              value={retencao.recorrentes6Meses}
              sub={`${((100 * retencao.recorrentes6Meses) / retencao.totalContas).toFixed(1)}% das contas`}
            />
          </div>
        </StoryCard>
      )}

      {/* 6. Distribuição geográfica */}
      <StoryCard
        anchor={`${topCidades[0]?.cidade ?? "—"} concentra a maior parte dos cadastros com endereço em MS.`}
        caption={`Apenas ${percentComEndereco.toFixed(1)}% das contas ativas têm endereço cadastrado — o mapa mostra a distribuição dessa parcela.`}
        comoLer="Cores mais escuras indicam mais contas ativas com endereço naquele município. A maioria das contas não tem endereço no cadastro, então o mapa mostra concentração, não uso real do app por região."
      >
        <ChoroplethMap cidades={cidadesParaMapa} unidade="contas ativas" />
        {topCidades.length > 0 && (
          <div className="mt-4 grid gap-2 grid-cols-1 sm:grid-cols-5">
            {topCidades.map((c) => (
              <MetricCard key={c.codigoIbge || c.cidade} label={c.cidade} value={c.ativas} />
            ))}
          </div>
        )}
      </StoryCard>

      {/* 7. Pontos de atenção */}
      {alertas.length > 0 && (
        <DashboardSection title="Pontos de atenção">
          <ul className="flex flex-col gap-2">
            {alertas.map((p, i) => (
              <li
                key={i}
                style={{ color: "var(--ds-color-text-primary)" }}
                className="text-sm flex gap-2 items-start"
              >
                <span
                  aria-hidden
                  style={{
                    background:
                      p.severidade === "alerta"
                        ? "var(--ds-color-danger)"
                        : p.severidade === "atencao"
                        ? "var(--ds-color-warning)"
                        : "var(--ds-color-primary-600)",
                  }}
                  className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                />
                <span>{p.texto}</span>
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}
    </div>
  );
}
