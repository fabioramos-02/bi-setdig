"use client";

import { Bar, BarChart as RBarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Quebra texto em até 2 linhas com corte por espaço. Se palavra única maior
 *  que `max`, aceita e trunca 2ª linha com "…". */
function quebrarEmDuasLinhas(texto: string, max: number): string[] {
  if (texto.length <= max) return [texto];
  const palavras = texto.split(/\s+/);
  let l1 = "";
  let l2 = "";
  for (const p of palavras) {
    if (!l1) l1 = p;
    else if (`${l1} ${p}`.length <= max) l1 = `${l1} ${p}`;
    else l2 = l2 ? `${l2} ${p}` : p;
  }
  if (l2.length > max) l2 = l2.slice(0, max - 1) + "…";
  return l2 ? [l1, l2] : [l1];
}

function TickQuebrado({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string | number } }) {
  const texto = String(payload?.value ?? "");
  const linhas = quebrarEmDuasLinhas(texto, 14);
  return (
    <text x={x} y={(y ?? 0) + 12} textAnchor="middle" fill="var(--ds-color-text-secondary)" fontSize={12}>
      {linhas.map((linha, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 14}>
          {linha}
        </tspan>
      ))}
    </text>
  );
}

export function BarChart({
  data,
  xKey,
  yKey,
  height = 260,
  corPorIndice,
  mostrarValorNaBarra = false,
  quebrarLabelX = false,
  mostrarTodosTicks = false,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  height?: number;
  /** Cor por barra (índice) — se omitido, usa a cor única padrão (comportamento anterior). */
  corPorIndice?: (index: number) => string;
  /** Exibe o valor numérico dentro/em cima da barra (formatado pt-BR). */
  mostrarValorNaBarra?: boolean;
  /** Quebra rótulos longos do eixo X em até 2 linhas (ideal pra nomes de serviço). */
  quebrarLabelX?: boolean;
  /** Força mostrar todos os ticks (`interval={0}`) — necessário quando N pequeno
   *  onde `preserveStartEnd` pode esconder o último rótulo em containers estreitos. */
  mostrarTodosTicks?: boolean;
}) {
  const intervalX = quebrarLabelX || mostrarTodosTicks ? 0 : "preserveStartEnd";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: quebrarLabelX ? 20 : 8 }}>
        <CartesianGrid stroke="var(--ds-color-border)" strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tick={quebrarLabelX ? <TickQuebrado /> : { fill: "var(--ds-color-text-secondary)", fontSize: 12 }}
          height={quebrarLabelX ? 46 : undefined}
          interval={intervalX}
          minTickGap={quebrarLabelX ? undefined : 8}
          tickMargin={6}
        />
        <YAxis tick={{ fill: "var(--ds-color-text-secondary)", fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: "var(--ds-color-background)",
            border: "1px solid var(--ds-color-border)",
            color: "var(--ds-color-text-primary)",
          }}
        />
        <Bar dataKey={yKey} fill="var(--ds-color-primary-600)" radius={[4, 4, 0, 0]}>
          {corPorIndice && data.map((_, i) => <Cell key={i} fill={corPorIndice(i)} />)}
          {mostrarValorNaBarra && (
            <LabelList
              dataKey={yKey}
              position="insideTop"
              offset={10}
              fill="#fff"
              fontSize={12}
              fontWeight={600}
              formatter={(v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : String(v))}
            />
          )}
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  );
}
