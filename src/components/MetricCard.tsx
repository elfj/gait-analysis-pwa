/** Props for one dashboard metric card. */
export interface MetricCardProps {
  /** Short metric label. */
  label: string;
  /** Optional supporting text. */
  subtitle?: string;
  /** Metric unit. */
  unit?: string;
  /** Display value. */
  value: string;
}

/** Render one compact result summary card. */
export function MetricCard({
  label,
  subtitle,
  unit,
  value,
}: MetricCardProps): React.JSX.Element {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-3 text-2xl font-bold text-slate-950">
        {value}
        {unit ? <span className="ml-1 text-sm font-semibold text-slate-500">{unit}</span> : null}
      </p>
      {subtitle ? <p className="mt-2 text-xs text-slate-500">{subtitle}</p> : null}
    </article>
  );
}
