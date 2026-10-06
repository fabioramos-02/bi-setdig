import { ChevronDown } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { CORTE_ONDA_1, CORTE_ONDA_2, type InsightMigracao, type ItemMigracao, type Onda, type RankingMigracao } from "@/lib/migracao-nativos";

// Mesma cor (primária do DS) em 3 intensidades: onda é ordem, não categoria —
// escala sequencial lê "mais forte = antes" sem legenda decorada.
const COR_ONDA: Record<"1" | "2" | "3" | "null", string> = {
  "1": "var(--ds-color-primary-600)",
  "2": "color-mix(in srgb, var(--ds-color-primary-600) 50%, transparent)",
  "3": "color-mix(in srgb, var(--ds-color-primary-600) 22%, transparent)",
  null: "var(--ds-color-border)",
};
const corOnda = (o: Onda) => COR_ONDA[String(o) as keyof typeof COR_ONDA];
const rotuloOnda = (o: Onda, naoSeparado = false) => (o !== null ? `${o}ª onda` : naoSeparado ? "Uso não separado" : "Sem uso");
const fmt = (n: number) => n.toLocaleString("pt-BR");
// Fatia > 0 que arredonda pra 0 vira "<0,1%" — "0%" ao lado de 47 acessos lê como erro.
const pct = (n: number) => (n > 0 && n < 0.05 ? "<0,1%" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

/** Prioridade de migração dos serviços nativos — ranking dos 37 serviços-alvo
 * por uso no período, agrupado em ondas pela concentração (ver
 * lib/migracao-nativos.ts). Cálculo todo no lib; aqui só apresenta. */
export function MigracaoTab({
  ranking,
  insight,
  rotuloPeriodo,
  status,
}: {
  ranking: RankingMigracao;
  insight: InsightMigracao | null;
  rotuloPeriodo: string;
  status: StatusIntervalo;
}) {
  const maior = ranking.itens[0]?.acessos ?? 0;
  const csv = ranking.itens.map((i, idx) => ({
    posicao: idx + 1,
    servico: i.servico,
    categoria: i.categoria,
    acessos: i.acessos,
    participacao_pct: i.participacaoPct.toFixed(1),
    onda: rotuloOnda(i.onda, !!i.usoArea),
    uso_da_area: i.usoArea ? `${i.usoArea.acessos} aberturas de ${i.usoArea.area} (soma com outros serviços)` : "",
  }));

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />

      {insight ? (
        <StoryCard
          anchor={
            <>
              {insight.qtdOnda1} dos {insight.total} serviços nativos concentram {pct(insight.pctOnda1)} do uso {rotuloPeriodo} — são a
              1ª onda da migração. &ldquo;{insight.lider}&rdquo; lidera, com {pct(insight.liderPct)}.
            </>
          }
          caption={`Considera só os ${insight.total} serviços que funcionam dentro do app (não os que abrem um site), agrupados como na estrutura da nova plataforma.`}
          comoLer={`Cada acesso é uma vez que alguém abriu a tela do serviço no app. As ondas seguem a concentração de uso: a 1ª reúne os poucos serviços que somam ${CORTE_ONDA_1}% de todo o uso, a 2ª leva até ${CORTE_ONDA_2}% e a 3ª reúne o restante. Uso não mede complexidade técnica, prazo legal nem público prioritário — a ordem final pondera isso.`}
        >
          <ChartLoading status={status} height={56}>
            <FaixaConcentracao itens={ranking.itens} />
          </ChartLoading>
        </StoryCard>
      ) : (
        <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
          Nenhum acesso aos serviços nativos foi registrado {rotuloPeriodo}.
        </p>
      )}

      {insight && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="1ª onda" value={`${insight.qtdOnda1} serviços`} sub={`${pct(insight.pctOnda1)} do uso dos nativos`} />
          <MetricCard label="2ª onda" value={`${insight.qtdOnda2} serviços`} sub={`completam ${CORTE_ONDA_2}% do uso`} />
          <MetricCard label="Sem uso registrado" value={`${insight.semUso.length} de ${insight.total}`} sub={insight.usoNaoSeparado.length > 0 ? `${rotuloPeriodo} · +${insight.usoNaoSeparado.length} sem uso separado (TV e Rádio)` : rotuloPeriodo} />
        </div>
      )}

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold">
            Quais serviços nativos migrar primeiro?
          </h3>
          <ExportCsvButton rows={csv} filename="prioridade-migracao-nativos" />
        </div>
        <ChartLoading status={status} height={480}>
          <ol style={{ borderTop: "1px solid var(--ds-color-border)" }}>
            {ranking.itens.map((item, idx) => (
              <LinhaRanking key={item.servico} item={item} posicao={idx + 1} maior={maior} />
            ))}
          </ol>
        </ChartLoading>
        {insight && insight.usoNaoSeparado.length > 0 && (
          <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
            {insight.usoNaoSeparado.join(" e ")} tocam dentro da área Entretenimento, sem tela própria — o app não informa qual
            dos dois foi aberto, então o número mostrado é o da área inteira e eles ficam fora das ondas.
          </p>
        )}
        {insight && insight.semUso.length > 0 && (
          <p className="mt-2 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
            Sem uso registrado {rotuloPeriodo}: {insight.semUso.join(", ")}.
          </p>
        )}
      </div>
    </div>
  );
}

/** Uma barra só, um segmento por serviço com largura = participação no uso.
 * Mostra de relance que poucos segmentos escuros ocupam quase tudo. */
function FaixaConcentracao({ itens }: { itens: ItemMigracao[] }) {
  const ondas = ([1, 2, 3] as const).map((o) => {
    const doGrupo = itens.filter((i) => i.onda === o);
    return { onda: o, qtd: doGrupo.length, pct: doGrupo.reduce((s, i) => s + i.participacaoPct, 0) };
  });
  return (
    <div>
      <div
        className="flex h-6 w-full overflow-hidden"
        style={{ borderRadius: "var(--ds-radius-sm)", background: "var(--ds-color-background-muted)" }}
        role="img"
        aria-label={ondas.map((o) => `${o.onda}ª onda: ${o.qtd} serviços, ${pct(o.pct)} do uso`).join("; ")}
      >
        {itens
          .filter((i) => i.acessos > 0)
          .map((i) => (
            <div
              key={i.servico}
              title={`${i.servico}: ${pct(i.participacaoPct)}`}
              style={{
                width: `${i.participacaoPct}%`,
                background: corOnda(i.onda),
                boxShadow: "inset -1px 0 0 var(--ds-color-background)",
              }}
            />
          ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>
        {ondas.map((o) => (
          <li key={o.onda} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: corOnda(o.onda) }} />
            {o.onda}ª onda · {o.qtd} serviços · {pct(o.pct)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LinhaRanking({ item, posicao, maior }: { item: ItemMigracao; posicao: number; maior: number }) {
  const largura = maior > 0 ? (item.acessos / maior) * 100 : 0;
  return (
    <li style={{ borderBottom: "1px solid var(--ds-color-border)" }}>
      <details className="group">
        <summary className="flex items-start gap-3 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <span className="w-6 shrink-0 pt-0.5 text-xs font-semibold tabular-nums" style={{ color: "var(--ds-color-text-muted)" }}>
            {String(posicao).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm font-medium break-words" style={{ color: "var(--ds-color-text-primary)" }}>
                {item.servico}
              </span>
              <span
                className="text-xs px-1.5 rounded"
                style={{ color: "var(--ds-color-text-secondary)", background: "var(--ds-color-background-muted)" }}
              >
                {item.categoria}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full" style={{ background: "var(--ds-color-background-muted)" }}>
              <div className="h-full rounded-full" style={{ width: `${largura}%`, background: corOnda(item.onda) }} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--ds-color-text-primary)" }}>
              {item.usoArea ? `≈ ${fmt(item.usoArea.acessos)}` : fmt(item.acessos)}
            </div>
            <div className="mt-0.5 flex items-center justify-end gap-1.5 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
              {!item.usoArea && <span className="tabular-nums">{pct(item.participacaoPct)}</span>}
              <SeloOnda onda={item.onda} naoSeparado={!!item.usoArea} />
              <ChevronDown size={14} aria-hidden className="transition-transform group-open:rotate-180" />
            </div>
          </div>
        </summary>
        <div className="pb-3 pl-9 text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>
          {item.usoArea ? (
            <p>
              Sem tela própria no app: {fmt(item.usoArea.acessos)} aberturas da área {item.usoArea.area} no período, somando todos
              os serviços dessa área.
            </p>
          ) : item.origens.length === 0 ? (
            <p>Nenhuma tela deste serviço foi aberta no período.</p>
          ) : (
            <>
              <p className="mb-1" style={{ color: "var(--ds-color-text-muted)" }}>
                Telas do app que somam neste serviço:
              </p>
              <ul className="flex flex-col gap-0.5">
                {item.origens.map((o) => (
                  <li key={o.tela} className="flex justify-between gap-3">
                    <span className="min-w-0 break-words">{o.tela}</span>
                    <span className="tabular-nums shrink-0">{fmt(o.acessos)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </details>
    </li>
  );
}

function SeloOnda({ onda, naoSeparado = false }: { onda: Onda; naoSeparado?: boolean }) {
  const forte = onda === 1;
  return (
    <span
      className="px-1.5 rounded font-medium whitespace-nowrap"
      style={{
        background: corOnda(onda),
        color: forte ? "var(--ds-color-text-inverse)" : "var(--ds-color-text-primary)",
      }}
    >
      {rotuloOnda(onda, naoSeparado)}
    </span>
  );
}
