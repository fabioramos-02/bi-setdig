import { getBrowserIcon } from "react-browser-icons";
import { BarChart } from "@/components/charts/BarChart";
import { CategoryLegend } from "@/components/ds/CategoryLegend";
import { chaveDoNavegador, corPorIndice } from "@/lib/browser-icon-map";
import type { Navegador } from "@/lib/data";

/**
 * Navegadores com ícone de marca + cor por barra — antes tudo saía na mesma
 * cor (--ds-color-primary-600), sem diferenciação visual nem ícone.
 */
export function BrowserBarChart({ dados }: { dados: Navegador[] }) {
  return (
    <div>
      <CategoryLegend
        items={dados.map((d, i) => {
          const chave = chaveDoNavegador(d.navegador);
          return {
            label: d.navegador,
            color: corPorIndice(i),
            icon: chave ? getBrowserIcon({ browser: chave, size: 16 }) : undefined,
          };
        })}
      />
      <BarChart data={dados} xKey="navegador" yKey="visitas" height={220} corPorIndice={corPorIndice} />
    </div>
  );
}
