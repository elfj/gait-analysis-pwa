import { Camera, CircleStop, Play, Ruler } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CameraView,
  type CameraViewHandle,
  type CameraViewProps,
} from '@/components/CameraView';
import { QualityIndicator } from '@/components/QualityIndicator';
import { computeQualityScore } from '@/lib/pose/qc';
import { useAssessmentStore } from '@/stores/assessmentStore';
import type { QualityScore } from '@/types/gait';
import type { PoseFrame, PoseSequence } from '@/types/pose';

const DEFAULT_HEIGHT_CM = 170;

/** Capture page dependency injection for tests. */
export interface CapturePageProps {
  /** Optional camera component override for focused UI tests. */
  CameraComponent?: React.ForwardRefExoticComponent<
    CameraViewProps & React.RefAttributes<CameraViewHandle>
  >;
}

/** Render the guided camera capture workflow. */
export function CapturePage({
  CameraComponent = CameraView,
}: CapturePageProps): React.JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const setCapturedSequence = useAssessmentStore((state) => state.setCapturedSequence);
  const cameraRef = useRef<CameraViewHandle | null>(null);
  const [frames, setFrames] = useState<PoseFrame[]>([]);
  const [quality, setQuality] = useState<QualityScore | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const assessmentId = id ?? 'demo';
  const sequencePreview = useMemo(
    () => buildPoseSequence(frames),
    [frames],
  );

  /** Start camera capture through the CameraView imperative API. */
  async function handleStart(): Promise<void> {
    setErrorMessage(null);
    setFrames([]);
    setQuality(null);

    try {
      await cameraRef.current?.start();
      setIsRecording(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start camera.');
      setIsRecording(false);
    }
  }

  /** Stop capture, persist frames in transient state, and continue to analysis. */
  function handleStop(): void {
    const capturedFrames = cameraRef.current?.getFrames() ?? frames;
    cameraRef.current?.stop();
    setIsRecording(false);

    const sequence = buildPoseSequence(capturedFrames);
    setCapturedSequence(sequence);
    navigate(`/assessment/${assessmentId}/analyzing`);
  }

  /** Update local recording state whenever a pose frame arrives. */
  function handlePoseFrame(frame: PoseFrame): void {
    setFrames((currentFrames) => {
      const nextFrames = [...currentFrames, frame];
      const sequence = buildPoseSequence(nextFrames);
      setQuality(computeQualityScore(sequence, DEFAULT_HEIGHT_CM));
      return nextFrames;
    });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-teal-700">Capture</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Guided Camera Capture</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Assessment ID:{' '}
            <span className="font-medium text-slate-950">{assessmentId}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRecording}
            onClick={() => {
              void handleStart();
            }}
            type="button"
          >
            <Play aria-hidden="true" className="h-4 w-4" />
            Start recording
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isRecording}
            onClick={handleStop}
            type="button"
          >
            <CircleStop aria-hidden="true" className="h-4 w-4" />
            Stop recording
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div className="rounded-md border border-teal-100 bg-teal-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-teal-900">
              <Ruler aria-hidden="true" className="h-4 w-4" />
              Capture guide
            </h3>
            <ul className="mt-3 grid gap-2 text-sm text-teal-950 sm:grid-cols-3">
              <li>Distance 3-4 m</li>
              <li>Sagittal side view</li>
              <li>Phone at hip height</li>
            </ul>
          </div>

          <CameraComponent
            className="rounded-md border border-slate-200 bg-white p-3"
            onError={(error) => {
              setErrorMessage(error.message);
            }}
            onPoseFrame={handlePoseFrame}
            ref={cameraRef}
          />

          {errorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <QualityIndicator quality={quality} />
          <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <h3 className="flex items-center gap-2 font-semibold text-slate-950">
              <Camera aria-hidden="true" className="h-4 w-4 text-teal-700" />
              Recording summary
            </h3>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between gap-3">
                <dt>Frames</dt>
                <dd className="font-medium text-slate-950">{String(frames.length)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Duration</dt>
                <dd className="font-medium text-slate-950">
                  {(sequencePreview.durationMs / 1000).toFixed(1)} s
                </dd>
              </div>
            </dl>
          </div>
          <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" to="/">
            Back to patients
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Builds a pose sequence from captured frames. */
function buildPoseSequence(frames: PoseFrame[]): PoseSequence {
  const durationMs =
    frames.length > 0 ? Math.max(...frames.map((frame) => frame.timestamp)) : 0;
  const fps = durationMs > 0 ? (frames.length / durationMs) * 1000 : 0;

  return {
    capturedAt: new Date().toISOString(),
    durationMs,
    fps,
    frames,
  };
}
