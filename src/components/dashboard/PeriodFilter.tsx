"use client";

import { PeriodRadioGroup } from "@/components/dashboard/PeriodRadioGroup";
import { clampData, rotuloPeriodoResolvido, type PeriodoState } from "@/lib/period-filter";

const LABEL_REF: Record<Exclude<PeriodoState["tipo"], "intervalo">, string> = {
  dia: "Dia de referência",
  semana: "Semana (data de referência)",
  mes: "Mês de referência",
  ano: "Ano de referência",
};

/**
 * Réplica da UX do app.py antigo: radio de período (Dia/Semana/Mês/Ano/
 * Intervalo) + campo(s) de data condicional. O controle de data se ADAPTA à
 * granularidade (mês → seletor de mês, ano → seletor de ano, dia/semana →
 * data) e sempre valida/clampa no intervalo de dado disponível [min,max]. Um
 * texto de feedback mostra o período resolvido ("Mostrando: maio de 2026").
 * Controlado — estado vive no PeriodoProvider, consumido por
 * SidebarPeriodFilter e pelos gráficos do conteúdo.
 */
export function PeriodFilter({
  estado,
  onEstadoChange,
  inicio,
  fim,
  onIntervaloChange,
  min,
  max,
  vertical = false,
}: {
  estado: PeriodoState;
  onEstadoChange: (novo: PeriodoState) => void;
  inicio: string;
  fim: string;
  onIntervaloChange: (inicio: string, fim: string) => void;
  min: string;
  max: string;
  /** Empilhado (sidebar) em vez de em linha (barra horizontal). */
  vertical?: boolean;
}) {
  // Toda mudança de data passa por clampData — rejeita fora de [min,max],
  // vazio e datas impossíveis (cai no período corrente).
  const setDataRef = (v: string) => onEstadoChange({ ...estado, dataRef: clampData(v, min, max) });
  const resolvido = rotuloPeriodoResolvido(estado);
  const anos: number[] = [];
  for (let a = +min.slice(0, 4); a <= +max.slice(0, 4); a++) anos.push(a);

  return (
    <div className={vertical ? "flex flex-col gap-3" : "flex flex-wrap items-end gap-4"}>
      <PeriodRadioGroup
        value={estado.tipo}
        onChange={(tipo) =>
          onEstadoChange({
            ...estado,
            tipo,
            // Selecionar "Intervalo" já grava inicio/fim reais no estado (não só
            // o valor visual do input) — senão o filtro parece preenchido mas
            // `estado.inicio`/`estado.fim` ficam undefined até o usuário mexer
            // manualmente numa data, e a busca ao vivo (ADR-010) nunca dispara.
            ...(tipo === "intervalo" ? { inicio: estado.inicio ?? min, fim: estado.fim ?? max } : {}),
          })
        }
        vertical={vertical}
      />

      {estado.tipo === "intervalo" ? (
        <>
          <label className="ds-field" style={{ maxWidth: vertical ? undefined : 180 }}>
            <span className="ds-field__label">Data Início</span>
            <input
              className="ds-input"
              type="date"
              value={inicio}
              min={min}
              max={fim}
              onChange={(e) => onIntervaloChange(clampData(e.target.value, min, fim), fim)}
            />
          </label>
          <label className="ds-field" style={{ maxWidth: vertical ? undefined : 180 }}>
            <span className="ds-field__label">Data Fim</span>
            <input
              className="ds-input"
              type="date"
              value={fim}
              min={inicio}
              max={max}
              onChange={(e) => onIntervaloChange(inicio, clampData(e.target.value, inicio, max))}
            />
          </label>
        </>
      ) : (
        <label className="ds-field" style={{ maxWidth: vertical ? undefined : 180 }}>
          <span className="ds-field__label">{LABEL_REF[estado.tipo]}</span>
          {estado.tipo === "mes" ? (
            <input
              className="ds-input"
              type="month"
              value={estado.dataRef.slice(0, 7)}
              min={min.slice(0, 7)}
              max={max.slice(0, 7)}
              aria-describedby="periodo-resolvido"
              onChange={(e) => e.target.value && setDataRef(`${e.target.value}-01`)}
            />
          ) : estado.tipo === "ano" ? (
            <select
              className="ds-select"
              value={estado.dataRef.slice(0, 4)}
              aria-describedby="periodo-resolvido"
              onChange={(e) => setDataRef(`${e.target.value}-01-01`)}
            >
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="ds-input"
              type="date"
              value={estado.dataRef}
              min={min}
              max={max}
              aria-describedby="periodo-resolvido"
              onChange={(e) => e.target.value && setDataRef(e.target.value)}
            />
          )}
        </label>
      )}

      {resolvido && (
        <p id="periodo-resolvido" className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          Mostrando: <strong style={{ color: "var(--ds-color-text-secondary)" }}>{resolvido}</strong>
        </p>
      )}
    </div>
  );
}
