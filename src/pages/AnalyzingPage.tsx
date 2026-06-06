import { CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createAssessment,
  getPatient,
  savePoseSequence,
  saveResult,
} from '@/lib/db/repositories';
import {
  analyzeGaitInWorker,
  type AnalyzeGaitRunner,
} from '@/lib/gait/analysisRunner';
import { computeQualityScore } from '@/lib/pose/qc';
import { useAssessmentStore } from '@/stores/assessmentStore';
import type { Assessment } from '@/types/assessment';
import type { GaitAnalysisResult, QualityScore } from '@/types/gait';
import type { Patient } from '@/types/patient';
import type { PoseSequence } from '@/types/pose';

const analysisStages = [
  'Event detection',
  'Spatiotemporal metrics',
  'Joint kinematics',
  'Symmetry scoring',
] as const;

const FALLBACK_QC_HEIGHT_CM = 170;

type AnalysisStage = (typeof analysisStages)[number];

/** Data access contract used by the analyzing page. */
export interface AnalyzingPageRepository {
  /** Persist assessment metadata. */
  createAssessment: (assessment: Assessment) => Promise<string>;
  /** Load patient metadata by identifier. */
  getPatient: (patientId: string) => Promise<Patient | undefined>;
  /** Persist captured pose sequence. */
  savePoseSequence: (record: {
    assessmentId: string;
    data: PoseSequence;
    id: string;
  }) => Promise<string>;
  /** Persist final gait analysis result. */
  saveResult: (result: GaitAnalysisResult) => Promise<string>;
}

/** Props for analysis page dependency injection. */
export interface AnalyzingPageProps {
  /** Optional analysis runner override for tests. */
  analyze?: AnalyzeGaitRunner;
  /** Optional repository override for tests. */
  repository?: AnalyzingPageRepository;
}

const defaultRepository: AnalyzingPageRepository = {
  createAssessment,
  getPatient,
  savePoseSequence,
  saveResult,
};

/** Render analysis progress and run gait analysis in a worker. */
export function AnalyzingPage({
  analyze = analyzeGaitInWorker,
  repository = defaultRepository,
}: AnalyzingPageProps): React.JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const capturedSequence = useAssessmentStore((state) => state.capturedSequence);
  const clearCapturedSequence = useAssessmentStore((state) => state.clearCapturedSequence);
  const [completedStages, setCompletedStages] = useState<AnalysisStage[]>([]);
  const [activeStage, setActiveStage] = useState<AnalysisStage | null>(analysisStages[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failureQuality, setFailureQuality] = useState<QualityScore | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const patientId = id ?? '';

  useEffect(() => {
    let isMounted = true;

    async function runAnalysis(): Promise<void> {
      setCompletedStages([]);
      setActiveStage(analysisStages[0]);
      setErrorMessage(null);
      setFailureQuality(null);

      if (!capturedSequence) {
        setErrorMessage('No captured pose sequence is available.');
        setActiveStage(null);
        return;
      }

      try {
        const patient = await repository.getPatient(patientId);

        if (!patient) {
          throw new Error('Patient record was not found.');
        }

        for (const stage of analysisStages) {
          if (!isMounted) {
            return;
          }

          setActiveStage(stage);
          await Promise.resolve();
          setCompletedStages((current) => [...current, stage]);
        }

        const result = await analyze(capturedSequence, patient);

        await repository.createAssessment({
          id: result.assessmentId,
          patientId: result.patientId,
          performedAt: result.performedAt,
          testType: '10MWT',
        });
        await repository.savePoseSequence({
          assessmentId: result.assessmentId,
          data: capturedSequence,
          id: crypto.randomUUID(),
        });
        await repository.saveResult(result);

        if (!isMounted) {
          return;
        }

        clearCapturedSequence();
        navigate(`/assessment/${result.assessmentId}/result`);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(createAnalysisErrorMessage(error));
          setFailureQuality(computeQualityScore(capturedSequence, FALLBACK_QC_HEIGHT_CM));
          setActiveStage(null);
        }
      }
    }

    void runAnalysis();

    return () => {
      isMounted = false;
    };
  }, [analyze, capturedSequence, clearCapturedSequence, navigate, patientId, repository, retryCount]);

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Analysis</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">Analyzing Assessment</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Patient ID: <span className="font-medium text-slate-950">{patientId || 'unknown'}</span>
        </p>
      </div>

      <ol className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-700">
        {analysisStages.map((stage, index) => (
          <li className="flex items-center gap-3 py-2" key={stage}>
            {completedStages.includes(stage) ? (
              <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-700" />
            ) : activeStage === stage ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-teal-700" />
            ) : (
              <span className="h-5 w-5 rounded-full border border-slate-300" />
            )}
            <span>
              {String(index + 1)}. {stage}
            </span>
          </li>
        ))}
      </ol>

      {errorMessage ? (
        <div className="space-y-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <h3 className="flex items-center gap-2 font-semibold">
            <XCircle aria-hidden="true" className="h-4 w-4" />
            Analysis failed
          </h3>
          <p>{errorMessage}</p>
          {failureQuality ? <FailureQualityReport quality={failureQuality} /> : null}
          {capturedSequence ? (
            <button
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
              onClick={() => {
                setRetryCount((current) => current + 1);
              }}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Retry analysis
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-600">Analysis is running in a Web Worker.</p>
      )}

      <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" to="/">
        Back to patients
      </Link>
    </section>
  );
}

/** Render a compact QC report to guide analysis failure recovery. */
function FailureQualityReport({ quality }: { quality: QualityScore }): React.JSX.Element {
  return (
    <div className="rounded-md border border-red-200 bg-white p-3 text-red-900">
      <h4 className="font-semibold">Capture quality report</h4>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt>Detection rate</dt>
          <dd className="font-medium">{quality.detectionRate.toFixed(0)}%</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Mean confidence</dt>
          <dd className="font-medium">{quality.meanConfidence.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Step count</dt>
          <dd className="font-medium">{String(quality.stepCount)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Occlusion rate</dt>
          <dd className="font-medium">{quality.occlusionRate.toFixed(0)}%</dd>
        </div>
      </dl>
      {quality.warnings.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {quality.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3">No QC warnings were generated. Retry analysis before retaking video.</p>
      )}
    </div>
  );
}

/** Convert analysis failures into actionable recovery text. */
function createAnalysisErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('patient record')) {
    return 'Patient data could not be loaded. Return to the patient list and start the assessment again.';
  }

  if (normalized.includes('worker')) {
    return 'Analysis worker failed to start. Reload the app and retry analysis.';
  }

  if (normalized.includes('not enough') || normalized.includes('insufficient')) {
    return 'The capture does not contain enough usable gait data. Review the quality report and retake the video if needed.';
  }

  return 'Analysis could not be completed. Review the quality report, retry analysis, or retake the capture.';
}
