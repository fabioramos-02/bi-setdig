export type OpcaoSelect = { value: string; label: string };

/** Select rotulado, estilo DS (`.ds-field`/`.ds-select`, ver globals.css) —
 * um só componente pros filtros dropdown do app, em vez de repetir
 * `<label className="ds-field">...` cru em cada Tab. */
export function Select({
  label,
  value,
  onChange,
  opcoes,
  todosLabel,
  maxWidth = 220,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  opcoes: OpcaoSelect[];
  todosLabel: string;
  maxWidth?: number;
}) {
  return (
    <label className="ds-field" style={{ maxWidth }}>
      <span className="ds-field__label">{label}</span>
      <select className="ds-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{todosLabel}</option>
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
