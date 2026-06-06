import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SymmetryMetrics } from '@/types/gait';

/** Props for the symmetry bar chart. */
export interface SymmetryChartProps {
  /** Symmetry metrics in percent. */
  symmetry: SymmetryMetrics;
}

/** Render bilateral symmetry index bars. */
export function SymmetryChart({ symmetry }: SymmetryChartProps): React.JSX.Element {
  const data = [
    { metric: 'Step length', value: symmetry.stepLengthSI },
    { metric: 'Stance', value: symmetry.stanceTimeSI },
    { metric: 'Swing', value: symmetry.swingTimeSI },
    { metric: 'Knee ROM', value: symmetry.kneeFlexionSI },
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-950">Symmetry</h3>
        <p className="mt-1 text-sm text-slate-600">Lower SI indicates more symmetric gait.</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} margin={{ bottom: 0, left: 0, right: 16, top: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'SI']} />
            <Bar dataKey="value" fill="#0f766e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
