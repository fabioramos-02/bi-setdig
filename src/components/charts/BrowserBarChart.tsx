import { getBrowserIcon } from "react-browser-icons";
import { BarChart } from "@/components/charts/BarChart";
import { chaveDoNavegador, corPorIndice } from "@/lib/browser-icon-map";
import type { Navegador } from "@/lib/data";

/**
 * Navegadores com ícone de marca + cor por barra — antes tudo saía na mesma
 * cor (--ds-color-primary-600), sem diferenciação visual nem ícone.
 */
export function BrowserBarChart({ dados }: { dados: Navegador[] }) {
  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-2">
        {dados.map((d, i) => {
          const chave = chaveDoNavegador(d.navegador);
          return (
            <span key={d.navegador} className="flex items-center gap-1.5 text-xs" style={{ color: corPorIndice(i) }}>
              {chave && getBrowserIcon({ browser: chave, size: 16 })}
              {d.navegador}
            </span>
          );
        })}
      </div>
      <BarChart data={dados} xKey="navegador" yKey="visitas" height={220} corPorIndice={corPorIndice} />
    </div>
  );
}
