import {
  AlertTriangle,
  Camera,
  CircleStop,
  Play,
  RotateCcw,
  Ruler,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CameraView,
  type CameraViewHandle,
  type CameraViewProps,
} from '@/components/CameraView';
import { QualityIndicator } from '@/components/QualityIndicator';
import { createDraftPoseSequenceId } from '@/lib/db/draftPoseSequence';
import { savePoseSequence } from '@/lib/db/repositories';
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
  /** Optional local pose persistence override for focused tests. */
  persistPoseSequence?: typeof savePoseSequence;
}

/** Render the guided camera capture workflow. */
export function CapturePage({
  CameraComponent = CameraView,
  persistPoseSequence = savePoseSequence,
}: CapturePageProps): React.JSX.Element {
  const { patientId: patientIdParam } = useParams();
  const navigate = useNavigate();
  const setCapturedSequence = useAssessmentStore(
    (state) => state.setCapturedSequence,
  );
  const cameraRef = useRef<CameraViewHandle | null>(null);
  const isStartingRef = useRef(false);
  const previewStartTokenRef = useRef(0);
  const [frames, setFrames] = useState<PoseFrame[]>([]);
  const [quality, setQuality] = useState<QualityScore | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPreviewStarting, setIsPreviewStarting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const patientId = patientIdParam ?? 'demo';
  const sequencePreview = useMemo(() => buildPoseSequence(frames), [frames]);

  /** Start camera preview without adding frames to the current recording. */
  async function handleStartPreview(): Promise<void> {
    const previewStartToken = previewStartTokenRef.current + 1;
    previewStartTokenRef.current = previewStartToken;

    setErrorMessage(null);
    setIsPreviewStarting(true);

    try {
      await cameraRef.current?.startPreview();

      if (previewStartToken === previewStartTokenRef.current) {
        setIsPreviewing(true);
      }
    } catch (error) {
      if (previewStartToken === previewStartTokenRef.current) {
        setErrorMessage(createCameraErrorMessage(error));
        setIsPreviewing(false);
      }
    } finally {
      if (previewStartToken === previewStartTokenRef.current) {
        setIsPreviewStarting(false);
      }
    }
  }

  useEffect(() => {
    const camera = cameraRef.current;
    void Promise.resolve().then(() => {
      void handleStartPreview();
    });

    return () => {
      previewStartTokenRef.current += 1;
      camera?.stop();
    };
  }, []);

  /** Start pose frame recording while keeping the already-running preview visible. */
  async function handleStart(): Promise<void> {
    if (isRecording || isStartingRef.current) {
      return;
    }

    isStartingRef.current = true;
    setErrorMessage(null);
    setFrames([]);
    setQuality(null);
    setIsStarting(true);

    try {
      await cameraRef.current?.startRecording();
      setIsPreviewing(true);
      setIsRecording(true);
    } catch (error) {
      setErrorMessage(createCameraErrorMessage(error));
      setIsRecording(false);
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  }

  /** Stop capture, persist frames in transient state, and continue to analysis. */
  async function handleStop(): Promise<void> {
    if (isSaving) {
      return;
    }

    const capturedFrames = cameraRef.current?.getFrames() ?? frames;
    cameraRef.current?.stopRecording();
    setIsRecording(false);

    const sequence = buildPoseSequence(capturedFrames);

    if (sequence.frames.length === 0) {
      setErrorMessage(
        'No pose frames were captured. Keep the full body visible and record again.',
      );
      return;
    }

    try {
      setIsSaving(true);
      await persistPoseSequence({
        assessmentId: patientId,
        data: sequence,
        id: createDraftPoseSequenceId(patientId),
      });
      setCapturedSequence(sequence);
      navigate(`/patient/${patientId}/analyzing`);
    } catch (error) {
      setErrorMessage(createPosePersistenceErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
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
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Guided Camera Capture
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Assessment ID:{' '}
            <span className="font-medium text-slate-950">{patientId}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              isRecording || isStarting || isSaving || isPreviewStarting
            }
            onClick={() => {
              void handleStart();
            }}
            type="button"
          >
            <Play aria-hidden="true" className="h-4 w-4" />
            {isStarting ? 'Starting...' : 'Start recording'}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isRecording || isSaving}
            onClick={() => {
              void handleStop();
            }}
            type="button"
          >
            <CircleStop aria-hidden="true" className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Stop recording'}
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
              setErrorMessage(createCameraErrorMessage(error));
            }}
            onPoseFrame={handlePoseFrame}
            ref={cameraRef}
          />

          {errorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <h3 className="flex items-center gap-2 font-semibold">
                <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                Capture needs attention
              </h3>
              <p className="mt-2">{errorMessage}</p>
              <button
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
                onClick={() => {
                  void handleStartPreview();
                }}
                type="button"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Try again
              </button>
            </div>
          ) : null}

          {!errorMessage ? (
            <p className="text-sm text-slate-600">
              {isRecording
                ? 'Recording keypoints now. Keep the full body in frame.'
                : isPreviewing
                  ? 'Camera preview is active. Align the subject, then start recording.'
                  : isPreviewStarting
                    ? 'Starting camera preview...'
                    : 'Camera preview is not active.'}
            </p>
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
                <dd className="font-medium text-slate-950">
                  {String(frames.length)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Duration</dt>
                <dd className="font-medium text-slate-950">
                  {(sequencePreview.durationMs / 1000).toFixed(1)} s
                </dd>
              </div>
            </dl>
          </div>
          <Link
            className="text-sm font-medium text-teal-700 hover:text-teal-800"
            to="/"
          >
            Back to patients
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Convert camera and pose startup failures into actionable user messages. */
function createCameraErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof DOMException ? error.name : '';
  const normalized = `${name} ${message}`.toLowerCase();

  if (
    normalized.includes('notallowed') ||
    normalized.includes('permission') ||
    normalized.includes('denied')
  ) {
    return 'Camera access was denied. Allow camera permission in the browser settings, then try again.';
  }

  if (
    normalized.includes('notfound') ||
    normalized.includes('no camera') ||
    normalized.includes('device not found')
  ) {
    return 'No camera was found. Connect a camera or open this page on a phone with a rear camera.';
  }

  if (
    normalized.includes('mediapipe') ||
    normalized.includes('pose') ||
    normalized.includes('wasm') ||
    normalized.includes('task') ||
    normalized.includes('model')
  ) {
    return 'Pose detection could not load. Check the network connection, then try again.';
  }

  return 'Unable to start camera capture. Check camera permission and device availability, then try again.';
}

/** Convert local pose persistence failures into actionable user messages. */
function createPosePersistenceErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('quota') || normalized.includes('storage')) {
    return 'Captured keypoints could not be saved because browser storage is unavailable or full. Free device storage, then try again.';
  }

  return 'Captured keypoints could not be saved locally. Start a new recording before leaving this page.';
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
