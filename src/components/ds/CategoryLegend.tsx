export function CategoryLegend({
  items,
}: {
  items: { label: string; color: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-2">
      {items.map(({ label, color, icon }) => (
        <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color }}>
          {icon}
          {label}
        </span>
      ))}
    </div>
  );
}
