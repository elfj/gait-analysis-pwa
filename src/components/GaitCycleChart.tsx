import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { KinematicMetrics } from '@/types/gait';

/** Props for the gait-cycle joint angle chart. */
export interface GaitCycleChartProps {
  /** Kinematic metrics containing 101-point cycle curves. */
  kinematics: KinematicMetrics;
}

/** Render hip and knee angle curves across the normalized gait cycle. */
export function GaitCycleChart({ kinematics }: GaitCycleChartProps): React.JSX.Element {
  const data = kinematics.cyclePlots.kneeLeft.map((_, index) => ({
    cycle: index,
    hipLeft: finiteOrNull(kinematics.cyclePlots.hipLeft[index]),
    hipRight: finiteOrNull(kinematics.cyclePlots.hipRight[index]),
    kneeLeft: finiteOrNull(kinematics.cyclePlots.kneeLeft[index]),
    kneeRight: finiteOrNull(kinematics.cyclePlots.kneeRight[index]),
  }));

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-950">Gait cycle</h3>
        <p className="mt-1 text-sm text-slate-600">Joint angles normalized to 0-100% cycle.</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data} margin={{ bottom: 0, left: 0, right: 16, top: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              dataKey="cycle"
              label={{ position: 'insideBottom', value: 'Gait cycle (%)' }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              label={{ angle: -90, position: 'insideLeft', value: 'Angle (deg)' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            <Line dataKey="hipLeft" dot={false} name="Hip L" stroke="#0f766e" strokeWidth={2} />
            <Line dataKey="hipRight" dot={false} name="Hip R" stroke="#14b8a6" strokeWidth={2} />
            <Line dataKey="kneeLeft" dot={false} name="Knee L" stroke="#7c3aed" strokeWidth={2} />
            <Line dataKey="kneeRight" dot={false} name="Knee R" stroke="#a78bfa" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/** Convert non-finite chart values into null so Recharts skips them. */
function finiteOrNull(value: number | undefined): number | null {
  if (value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return value;
}
