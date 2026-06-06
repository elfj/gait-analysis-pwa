import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import type { QualityScore } from '@/types/gait';

/** Props for the capture quality summary. */
export interface QualityIndicatorProps {
  /** Current quality score, or null before enough frames are available. */
  quality: QualityScore | null;
}

/** Render a compact capture quality indicator for live recording. */
export function QualityIndicator({ quality }: QualityIndicatorProps): React.JSX.Element {
  const state = getQualityState(quality);
  const Icon = state.icon;

  return (
    <aside className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <span className={state.iconClassName}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Capture quality</h3>
          <p className="text-sm text-slate-600">{state.label}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Detection</dt>
          <dd className="font-semibold text-slate-950">
            {quality ? `${quality.detectionRate.toFixed(0)}%` : 'N/A'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Confidence</dt>
          <dd className="font-semibold text-slate-950">
            {quality ? quality.meanConfidence.toFixed(2) : 'N/A'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Steps</dt>
          <dd className="font-semibold text-slate-950">{quality?.stepCount ?? 'N/A'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Occlusion</dt>
          <dd className="font-semibold text-slate-950">
            {quality ? `${quality.occlusionRate.toFixed(0)}%` : 'N/A'}
          </dd>
        </div>
      </dl>

      {quality && quality.warnings.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-amber-800">
          {quality.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

/** Selects visual status for the quality score. */
function getQualityState(quality: QualityScore | null): {
  icon: typeof Circle;
  iconClassName: string;
  label: string;
} {
  if (!quality) {
    return {
      icon: Circle,
      iconClassName: 'text-slate-400',
      label: 'Waiting for pose frames',
    };
  }

  if (quality.passed) {
    return {
      icon: CheckCircle2,
      iconClassName: 'text-emerald-700',
      label: 'Ready for analysis',
    };
  }

  return {
    icon: AlertTriangle,
    iconClassName: 'text-amber-700',
    label: 'Needs adjustment',
  };
}
