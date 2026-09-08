import { type ReactNode } from "react";

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

export function MacroRow({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  const percentage = Math.min(100, target > 0 ? (value / target) * 100 : 0);

  return (
    <div className="border-t border-(--border) py-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-(--text-secondary)">{label}</span>
        <span className="text-foreground">
          {Math.round(value)} / {Math.round(target)} g
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-(--accent)"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function Button({
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={type}
      className={`min-h-11 rounded-lg border border-(--border) px-3 text-sm font-medium text-foreground transition-all duration-150 hover:border-(--accent)/80 hover:bg-(--accent)/8 hover:text-(--accent) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/70 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-11 w-full rounded-lg border border-(--border) bg-transparent px-3 text-foreground outline-none placeholder:text-(--text-muted) focus:border-(--accent) ${className}`}
    />
  );
}

export function Select({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`min-h-11 w-full rounded-lg border border-(--border) bg-transparent px-3 text-foreground outline-none focus:border-(--accent) ${className}`}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-xs uppercase tracking-[0.12em] text-(--text-muted)">
      <span>{label}</span>
      {children}
    </label>
  );
}
