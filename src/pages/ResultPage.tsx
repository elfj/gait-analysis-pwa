import { AlertTriangle, FileDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GaitCycleChart } from '@/components/GaitCycleChart';
import { MetricCard } from '@/components/MetricCard';
import { SymmetryChart } from '@/components/SymmetryChart';
import { getResult } from '@/lib/db/repositories';
import type { GaitAnalysisResult } from '@/types/gait';

/** Data access contract for the result dashboard. */
export interface ResultPageRepository {
  /** Fetch one gait analysis result by assessment ID. */
  getResult: (assessmentId: string) => Promise<GaitAnalysisResult | undefined>;
}

const defaultRepository: ResultPageRepository = {
  getResult,
};

/** Render the result dashboard. */
export function ResultPage({
  repository = defaultRepository,
}: {
  /** Optional repository override for tests. */
  repository?: ResultPageRepository;
}): React.JSX.Element {
  const { id } = useParams();
  const [result, setResult] = useState<GaitAnalysisResult | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const assessmentId = id ?? '';

  useEffect(() => {
    let isMounted = true;

    async function loadResult(): Promise<void> {
      setStatus('loading');
      setErrorMessage(null);

      try {
        const loadedResult = await repository.getResult(assessmentId);

        if (!isMounted) {
          return;
        }

        if (!loadedResult) {
          setStatus('not_found');
          return;
        }

        setResult(loadedResult);
        setStatus('ready');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load result.');
          setStatus('error');
        }
      }
    }

    void loadResult();

    return () => {
      isMounted = false;
    };
  }, [assessmentId, repository]);

  if (status === 'loading') {
    return <ResultShell assessmentId={assessmentId}>Loading result...</ResultShell>;
  }

  if (status === 'not_found') {
    return <ResultShell assessmentId={assessmentId}>Result was not found.</ResultShell>;
  }

  if (status === 'error') {
    return <ResultShell assessmentId={assessmentId}>{errorMessage ?? 'Unable to load result.'}</ResultShell>;
  }

  if (!result) {
    return <ResultShell assessmentId={assessmentId}>Result was not found.</ResultShell>;
  }

  return (
    <ResultShell assessmentId={assessmentId}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Gait speed"
          subtitle="10MWT estimate"
          unit="m/s"
          value={formatNumber(result.spatiotemporal.gaitSpeed, 2)}
        />
        <MetricCard
          label="Cadence"
          subtitle="Steps per minute"
          unit="spm"
          value={formatNumber(result.spatiotemporal.cadence, 0)}
        />
        <MetricCard
          label="Quality"
          subtitle={`${String(result.quality.stepCount)} detected steps`}
          unit="%"
          value={formatNumber(result.quality.detectionRate, 0)}
        />
        <MetricCard
          label="Asymmetry"
          subtitle="Lower is better"
          unit="%"
          value={formatNumber(result.symmetry.overallAsymmetryScore, 1)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <GaitCycleChart kinematics={result.kinematics} />
        <SymmetryChart symmetry={result.symmetry} />
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-950">Spatiotemporal parameters</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 font-medium">Metric</th>
                <th className="py-2 font-medium">Value</th>
                <th className="py-2 font-medium">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {createMetricRows(result).map((row) => (
                <tr key={row.label}>
                  <td className="py-2 font-medium text-slate-950">{row.label}</td>
                  <td className="py-2">{row.value}</td>
                  <td className="py-2">{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {result.confidenceFlags.length > 0 || result.quality.warnings.length > 0 ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <h3 className="flex items-center gap-2 font-semibold">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            Confidence notes
          </h3>
          <ul className="mt-3 space-y-1">
            {[...result.quality.warnings, ...result.confidenceFlags].map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 opacity-60"
          disabled
          type="button"
        >
          <FileDown aria-hidden="true" className="h-4 w-4" />
          Download PDF
        </button>
        <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" to="/">
          Back to patients
        </Link>
      </div>
    </ResultShell>
  );
}

/** Layout shell shared by all result loading states. */
function ResultShell({
  assessmentId,
  children,
}: {
  /** Assessment identifier shown in the header. */
  assessmentId: string;
  /** Dashboard content or loading message. */
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Results</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">Assessment Result</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Assessment ID:{' '}
          <span className="font-medium text-slate-950">{assessmentId || 'unknown'}</span>
        </p>
      </div>
      {typeof children === 'string' ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/** Create display rows for all spatiotemporal values. */
function createMetricRows(result: GaitAnalysisResult): { label: string; unit: string; value: string }[] {
  const st = result.spatiotemporal;

  return [
    { label: 'Stride time mean', unit: 's', value: formatNumber(st.strideTimeMean, 2) },
    { label: 'Stride time CV', unit: '%', value: formatNumber(st.strideTimeCV, 1) },
    { label: 'Left step length', unit: 'm', value: formatNumber(st.stepLengthLeft, 2) },
    { label: 'Right step length', unit: 'm', value: formatNumber(st.stepLengthRight, 2) },
    { label: 'Step width', unit: 'm', value: formatNumber(st.stepWidth, 2) },
    { label: 'Left stance', unit: '%', value: formatNumber(st.stancePhasePctLeft, 1) },
    { label: 'Right stance', unit: '%', value: formatNumber(st.stancePhasePctRight, 1) },
    { label: 'Double support', unit: '%', value: formatNumber(st.doubleSupportPct, 1) },
  ];
}

/** Format a finite number for display. */
function formatNumber(value: number, digits: number): string {
  if (!Number.isFinite(value)) {
    return 'N/A';
  }

  return value.toFixed(digits);
}
