"use client";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { AgeHistogram } from "@/components/charts/AgeHistogram";
import { ChoroplethMap } from "@/components/charts/ChoroplethMap";
import { ContasPorAnoChart } from "@/components/charts/ContasPorAnoChart";
import type {
  ContasResumo,
  ContaPorAno,
  ContaPorFaixaEtaria,
  ContaPorCidade,
  FaixaAcesso,
  ContaCriadaDia,
  TipoLogin,
} from "@/lib/data";
import type { PeriodoState } from "@/lib/period-filter";
import {
  contasNoPeriodo,
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
 * KPI de "criadas no período" reage ao filtro (série diária + agregação
 * cliente-side); demais painéis são snapshot atual do cadastro. */
export function ContasTab({
  resumo,
  porAno,
  faixaEtaria,
  porCidade,
  faixasDeAcesso,
  criadasPorDia,
  tipoLogin,
  estadoPeriodo,
  rotuloPeriodo,
}: {
  resumo: ContasResumo;
  porAno: ContaPorAno[];
  faixaEtaria: ContaPorFaixaEtaria[];
  porCidade: ContaPorCidade[];
  faixasDeAcesso: FaixaAcesso[];
  criadasPorDia: ContaCriadaDia[];
  tipoLogin: TipoLogin[];
  estadoPeriodo: PeriodoState;
  rotuloPeriodo: string;
}) {
  const saude = saudeAtivacao(resumo.taxaAtivacaoPct);
  const situacao = situacaoGeral(resumo, faixasDeAcesso);
  const alertas = pontosAtencao(resumo, faixasDeAcesso, faixaEtaria);
  const pctSemNascimento = pctSemInformacaoNascimento(faixaEtaria);

  const anoAtual = new Date().getFullYear();
  const semInfo = faixaEtaria.find((f) => f.faixa === "Não informado")?.quantidade ?? 0;
  const comInfo = faixaEtaria.filter((f) => f.faixa !== "Não informado");
  const totalComInfo = comInfo.reduce((a, f) => a + f.quantidade, 0);

  // Reage ao filtro de período (dia/semana/mês/ano/intervalo).
  const noPeriodo = contasNoPeriodo(criadasPorDia, estadoPeriodo);

  const cidadesParaMapa = porCidade
    .filter((c) => c.codigoIbge)
    .map((c) => ({ cidade: c.cidade, visitas: c.ativas }));

  const topCidades = porCidade.slice(0, 5);
  const percentComEndereco = resumo.contasAtivas > 0
    ? (100 * porCidade.reduce((acc, c) => acc + c.ativas, 0)) / resumo.contasAtivas
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Situação geral */}
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

      {/* KPIs de cadastro (snapshot atual) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Contas ativas"
          value={resumo.contasAtivas}
          sub={`${resumo.taxaAtivacaoPct.toFixed(1)}% do total`}
        />
        <MetricCard label="Contas criadas" value={resumo.contasTotal} sub="total acumulado" />
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

      {/* Tipo de Login */}
      {tipoLogin.length > 0 && (
        <StoryCard
          anchor={`O login com Gov.BR é utilizado por ${
            (
              (100 * (tipoLogin.find((t) => t.tipo === "Gov.BR")?.quantidade ?? 0)) /
              Math.max(1, tipoLogin.reduce((acc, t) => acc + t.quantidade, 0))
            ).toFixed(1)
          }% dos usuários.`}
          caption="Distribuição do tipo de autenticação escolhida no momento do cadastro."
          comoLer="Mostra a proporção de cidadãos que optaram por integrar sua conta ao Gov.BR em vez de criar um login próprio do aplicativo."
        >
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {tipoLogin.map((t) => (
              <MetricCard
                key={t.tipo}
                label={t.tipo}
                value={t.quantidade}
                sub={`${(
                  (100 * t.quantidade) /
                  Math.max(1, tipoLogin.reduce((acc, current) => acc + current.quantidade, 0))
                ).toFixed(1)}% do total`}
              />
            ))}
          </div>
        </StoryCard>
      )}

      {/* Contas criadas por ano — vertical, título igual Qlik */}
      <DashboardSection title="Contas criadas por ano">
        <ContasPorAnoChart dados={porAno} />
        <p style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mt-3">
          Cinza: total de contas criadas naquele ano. Azul: as que seguem ativas hoje. Ano {anoAtual} é parcial.
        </p>
      </DashboardSection>

      {/* Faixa etária — sem "Não informado" no gráfico */}
      <StoryCard
        anchor="Qual faixa etária mais usa o app?"
        caption={`Distribuição das ${totalComInfo.toLocaleString("pt-BR")} contas que informaram data de nascimento no cadastro.`}
        comoLer="A faixa etária é auto-declarada pelo usuário no cadastro. Cadastros sem essa informação estão contabilizados fora do gráfico, no card ao lado."
      >
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <AgeHistogram faixas={faixaEtaria} />
          </div>
          <div className="flex flex-col gap-3">
            <MetricCard
              label="Sem data de nascimento"
              value={semInfo}
              sub={`${pctSemNascimento.toFixed(1)}% dos cadastros`}
            />
            <p style={{ color: "var(--ds-color-text-muted)" }} className="text-xs">
              Essas contas existem, só não têm o campo preenchido — o perfil etário mostra apenas quem informou.
            </p>
          </div>
        </div>
      </StoryCard>

      {/* Bloco de faixas de retorno migrou pra aba Jornada do Usuário —
          retorno é comportamento, não cadastro. Situação Geral e Pontos de
          Atenção continuam citando as faixas como contexto de resumo. */}

      {/* Distribuição geográfica — endereço declarado no cadastro (não é local de acesso) */}
      <StoryCard
        anchor={`${topCidades[0]?.cidade ?? "—"} é a cidade onde mais cidadãos criaram conta no app com endereço declarado.`}
        caption={`Apenas ${percentComEndereco.toFixed(1)}% das contas ativas informaram endereço no cadastro. Para ver de onde os cidadãos ABREM o app, veja a aba "Perfil Técnico".`}
        comoLer='Este mapa mostra a MORADIA declarada no cadastro do app, não de onde a pessoa acessa. Uma pessoa cadastrada em Campo Grande pode abrir o app em qualquer lugar — esse dado fica na aba "Perfil Técnico". Cores mais escuras indicam mais contas ativas com endereço naquele município.'
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

      {/* Pontos de atenção */}
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
