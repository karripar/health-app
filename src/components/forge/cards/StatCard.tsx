export function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="border-t border-(--border) py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
        {label}
      </div>
      <div className="mt-2 text-2xl font-medium tracking-tighter text-foreground">
        {value}
      </div>
      {helper ? (
        <div className="mt-1 text-xs text-(--text-secondary)">{helper}</div>
      ) : null}
    </div>
  );
}
