"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { corCategorica } from "@/lib/categorical-palette";

export type FatiaCategoria = { categoria: string; valor: number; participacaoPct?: number };

export function CategoryDonut({ dados }: { dados: FatiaCategoria[] }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="w-full min-w-0 sm:flex-1" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dados} dataKey="valor" nameKey="categoria" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
              {dados.map((_, i) => (
                <Cell key={i} fill={corCategorica(i)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--ds-color-background)",
                border: "1px solid var(--ds-color-border)",
                color: "var(--ds-color-text-primary)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm w-full sm:w-auto">
        {dados.map((d, i) => (
          <li key={d.categoria} className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: corCategorica(i) }} />
            <span style={{ color: "var(--ds-color-text-primary)" }}>{d.categoria}</span>
            {d.participacaoPct !== undefined && (
              <span className="ml-auto font-semibold" style={{ color: "var(--ds-color-text-secondary)" }}>
                {d.participacaoPct.toFixed(1)}%
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
