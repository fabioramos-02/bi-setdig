import type { FrequenciaAcesso } from "@/lib/data";

type Camada = { rotulo: string; valor: number; pctDoTopo: number; cor: string };

/** Funil de 3 camadas escaladas por MAU (100%) — quantas pessoas voltam a
 *  cada janela (mês → semana → dia). Entre camadas, mostra explicitamente
 *  quantas pessoas deixam de voltar (drop-off) — leitura de gestão, não só
 *  proporção. CSS puro, sem lib de gráfico. */
export function CadenciaAcessoFunil({ freq }: { freq: FrequenciaAcesso }) {
  const mau = freq.ativosMes || 1;
  const camadas: Camada[] = [
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

  const rotuloTransicao = ["do mês para a semana", "da semana para hoje"];

  return (
    <div className="flex flex-col gap-4">
      {camadas.map((c, i) => {
        const anterior = i > 0 ? camadas[i - 1] : null;
        const perdidos = anterior ? Math.max(0, anterior.valor - c.valor) : 0;
        const pctPerdidos = anterior && anterior.valor > 0 ? (100 * perdidos) / anterior.valor : 0;
        return (
          <div key={c.rotulo} className="flex flex-col gap-2">
            {anterior && perdidos > 0 && (
              <div
                className="flex items-center gap-2 text-xs pl-1"
                style={{ color: "var(--ds-color-text-muted)" }}
              >
                <span aria-hidden className="tabular-nums">↓</span>
                <span>
                  <span className="tabular-nums">{perdidos.toLocaleString("pt-BR")}</span> pessoas
                  a menos {rotuloTransicao[i - 1]}{" "}
                  <span className="tabular-nums">({pctPerdidos.toFixed(1)}%)</span>
                </span>
              </div>
            )}
            <div>
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
          </div>
        );
      })}
    </div>
  );
}
