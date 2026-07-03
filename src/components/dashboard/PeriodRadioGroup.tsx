"use client";

import type { PeriodoTipo } from "@/lib/period-filter";

const OPCOES: { valor: PeriodoTipo; rotulo: string }[] = [
  { valor: "dia", rotulo: "Dia" },
  { valor: "semana", rotulo: "Semana" },
  { valor: "mes", rotulo: "Mês" },
  { valor: "ano", rotulo: "Ano" },
  { valor: "intervalo", rotulo: "Intervalo de datas" },
];

export function PeriodRadioGroup({
  value,
  onChange,
}: {
  value: PeriodoTipo;
  onChange: (v: PeriodoTipo) => void;
}) {
  return (
    <fieldset className="flex flex-wrap gap-x-5 gap-y-2 border-0 p-0 m-0">
      <legend className="sr-only">Período</legend>
      {OPCOES.map((o) => (
        <label key={o.valor} className="ds-radio">
          <input
            className="ds-radio__input"
            type="radio"
            name="periodo"
            value={o.valor}
            checked={value === o.valor}
            onChange={() => onChange(o.valor)}
          />
          <span className="ds-radio__control" aria-hidden="true" />
          <span className="ds-radio__label">{o.rotulo}</span>
        </label>
      ))}
    </fieldset>
  );
}
