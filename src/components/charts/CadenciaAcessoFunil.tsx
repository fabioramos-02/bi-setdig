import type { FrequenciaAcesso } from "@/lib/data";

/** Funil de 3 camadas escaladas por MAU (100%) — quantas pessoas voltam a
 *  cada janela (mês → semana → dia). CSS puro, sem lib de gráfico. */
export function CadenciaAcessoFunil({ freq }: { freq: FrequenciaAcesso }) {
  const mau = freq.ativosMes || 1;
  const camadas = [
    {
      rotulo: "Abriram o app no mês",
      valor: freq.ativosMes,
      pctDoTopo: 100,
      cor: "var(--ds-color-primary-600)",
    },
    {
      rotulo: "Abriram na semana",
      valor: freq.ativosSemana,
      pctDoTopo: Math.min(100, (100 * freq.ativosSemana) / mau),
      cor: "var(--ds-color-primary-500, var(--ds-color-primary-600))",
    },
    {
      rotulo: "Abriram hoje",
      valor: freq.ativosHoje,
      pctDoTopo: Math.min(100, (100 * freq.ativosHoje) / mau),
      cor: "var(--ds-color-success)",
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      {camadas.map((c) => (
        <div key={c.rotulo}>
          <div className="flex justify-between items-baseline text-sm mb-1">
            <span style={{ color: "var(--ds-color-text-primary)" }} className="font-medium">
              {c.rotulo}
            </span>
            <span style={{ color: "var(--ds-color-text-secondary)" }} className="tabular-nums">
              {c.valor.toLocaleString("pt-BR")}{" "}
              <span style={{ color: "var(--ds-color-text-muted)" }} className="text-xs">
                ({c.pctDoTopo.toFixed(1)}%)
              </span>
            </span>
          </div>
          <div
            className="h-3 rounded overflow-hidden"
            style={{ background: "var(--ds-color-background-muted)" }}
          >
            <div
              style={{
                width: `${c.pctDoTopo}%`,
                background: c.cor,
                height: "100%",
                transition: "width 300ms ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
