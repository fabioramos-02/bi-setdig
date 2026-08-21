import type { FrequenciaAcesso } from "@/lib/data";

/** Como o cidadão volta ao app — leitura de comportamento, não de perda.
 *  Substitui o antigo funil MAU→WAU→DAU (que sugeria "perda entre camadas"
 *  quando na verdade as janelas são cumulativas — quem abriu hoje também
 *  entrou na semana e no mês). Aqui: KPIs de "também voltaram" +
 *  segmentação comportamental exclusiva. */
export function CadenciaAcessoSegmentos({ freq }: { freq: FrequenciaAcesso }) {
  const mau = freq.ativosMes;
  const wau = freq.ativosSemana;
  const dau = freq.ativosHoje;

  const wauPct = mau > 0 ? (100 * wau) / mau : 0;
  const dauPct = mau > 0 ? (100 * dau) / mau : 0;

  // Segmentos exclusivos (grupos que não se sobrepõem)
  const soMes = Math.max(0, mau - wau);
  const soSemana = Math.max(0, wau - dau);
  const diarios = dau;

  const soMesPct = mau > 0 ? (100 * soMes) / mau : 0;
  const soSemanaPct = mau > 0 ? (100 * soSemana) / mau : 0;
  const diariosPct = mau > 0 ? (100 * diarios) / mau : 0;

  const fmt = (n: number) => n.toLocaleString("pt-BR");

  const anchor =
    mau === 0
      ? "Ainda sem dados de retorno no período."
      : `${wauPct.toFixed(0)}% dos usuários mensais também voltam ao menos uma vez na semana. Núcleo diário: ${dauPct.toFixed(0)}%.`;

  return (
    <div className="flex flex-col gap-6">
      <p
        className="text-base font-medium"
        style={{ color: "var(--ds-color-text-primary)" }}
      >
        {anchor}
      </p>

      {/* 3 KPIs — janelas de retorno (cumulativas, mas SEM linguagem de perda) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <JanelaCard
          rotulo="Abriram no mês"
          valor={mau}
          pct={100}
          cor="var(--ds-color-primary-600)"
          descricao="base do período (últimos 28 dias)"
          destaque="Base"
        />
        <JanelaCard
          rotulo="Também voltaram na semana"
          valor={wau}
          pct={wauPct}
          cor="var(--ds-color-primary-500, var(--ds-color-primary-600))"
          descricao={`${wauPct.toFixed(0)}% da base do mês`}
          destaque="Retornaram na semana"
        />
        <JanelaCard
          rotulo="Também voltaram hoje"
          valor={dau}
          pct={dauPct}
          cor="var(--ds-color-success)"
          descricao={`${dauPct.toFixed(0)}% da base do mês`}
          destaque="Núcleo diário"
        />
      </div>

      {/* Barra 100% empilhada — segmentos comportamentais exclusivos */}
      <div>
        <h4
          className="text-sm font-semibold mb-2"
          style={{ color: "var(--ds-color-text-secondary)" }}
        >
          Como os usuários do mês se comportam
        </h4>
        <div
          className="flex w-full h-6 rounded overflow-hidden"
          style={{ border: "1px solid var(--ds-color-border)" }}
          role="img"
          aria-label={`Segmentos: ${diariosPct.toFixed(1)}% diários, ${soSemanaPct.toFixed(1)}% semanais, ${soMesPct.toFixed(1)}% só no mês`}
        >
          {diariosPct > 0 && (
            <div
              style={{
                width: `${diariosPct}%`,
                background: "var(--ds-color-success)",
              }}
              title={`Diários: ${fmt(diarios)} pessoas (${diariosPct.toFixed(1)}%)`}
            />
          )}
          {soSemanaPct > 0 && (
            <div
              style={{
                width: `${soSemanaPct}%`,
                background: "var(--ds-color-primary-600)",
              }}
              title={`Semanais: ${fmt(soSemana)} pessoas (${soSemanaPct.toFixed(1)}%)`}
            />
          )}
          {soMesPct > 0 && (
            <div
              style={{
                width: `${soMesPct}%`,
                background: "var(--ds-color-background-muted)",
              }}
              title={`Só no mês: ${fmt(soMes)} pessoas (${soMesPct.toFixed(1)}%)`}
            />
          )}
        </div>

        <ul className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-3 flex-wrap">
          <LegendaSegmento
            cor="var(--ds-color-success)"
            titulo="Diários"
            desc={`Voltam todos os dias — ${fmt(diarios)} pessoas (${diariosPct.toFixed(1)}%).`}
          />
          <LegendaSegmento
            cor="var(--ds-color-primary-600)"
            titulo="Semanais"
            desc={`Voltam na semana, mas não diariamente — ${fmt(soSemana)} pessoas (${soSemanaPct.toFixed(1)}%).`}
          />
          <LegendaSegmento
            cor="var(--ds-color-background-muted)"
            borda
            titulo="Só no mês"
            desc={`Usaram uma vez no mês, sem voltar na semana — ${fmt(soMes)} pessoas (${soMesPct.toFixed(1)}%).`}
          />
        </ul>
      </div>
    </div>
  );
}

function JanelaCard({
  rotulo,
  valor,
  pct,
  cor,
  descricao,
  destaque,
}: {
  rotulo: string;
  valor: number;
  pct: number;
  cor: string;
  descricao: string;
  destaque: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 p-4 rounded"
      style={{
        border: "1px solid var(--ds-color-border)",
        background: "var(--ds-color-background)",
      }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: cor }}
      >
        {destaque}
      </span>
      <span
        className="text-base"
        style={{ color: "var(--ds-color-text-secondary)" }}
      >
        {rotulo}
      </span>
      <span
        className="text-2xl font-bold tabular-nums"
        style={{ color: "var(--ds-color-text-primary)" }}
      >
        {valor.toLocaleString("pt-BR")}
      </span>
      <div
        className="mt-1 h-1.5 rounded overflow-hidden"
        style={{ background: "var(--ds-color-background-muted)" }}
        aria-hidden
      >
        <div
          style={{
            width: `${Math.min(100, pct)}%`,
            height: "100%",
            background: cor,
          }}
        />
      </div>
      <span
        className="text-xs mt-1"
        style={{ color: "var(--ds-color-text-secondary)" }}
      >
        {descricao}
      </span>
    </div>
  );
}

function LegendaSegmento({
  cor,
  titulo,
  desc,
  borda = false,
}: {
  cor: string;
  titulo: string;
  desc: string;
  borda?: boolean;
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        aria-hidden
        className="w-3 h-3 rounded shrink-0 mt-1"
        style={{
          background: cor,
          border: borda ? "1px solid var(--ds-color-border)" : undefined,
        }}
      />
      <span style={{ color: "var(--ds-color-text-primary)" }}>
        <span className="font-semibold">{titulo}</span>{" "}
        <span style={{ color: "var(--ds-color-text-secondary)" }}>— {desc}</span>
      </span>
    </li>
  );
}
