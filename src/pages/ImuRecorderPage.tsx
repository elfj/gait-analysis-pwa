import {
  AlertTriangle,
  Download,
  Play,
  Save,
  Smartphone,
  Square,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { saveImuSequence } from '@/lib/db/repositories';
import { useNavigationGuardStore } from '@/stores/navigationGuardStore';
import type { ImuPlacement, ImuSample, ImuSequence } from '@/types/imu';

const STANDALONE_PATIENT_ID = '__standalone__';

const placementOptions: { label: string; value: ImuPlacement }[] = [
  { label: 'Waist / sacrum', value: 'waist_sacrum' },
  { label: 'Front waist', value: 'waist_front' },
  { label: 'Left pocket demo', value: 'left_pocket' },
  { label: 'Right pocket demo', value: 'right_pocket' },
] as const;

/** Optional iOS motion permission API exposed on recent Safari versions. */
interface DeviceMotionEventConstructorWithPermission {
  /** Request motion sensor permission after a user gesture. */
  requestPermission?: () => Promise<'default' | 'denied' | 'granted'>;
}

/** Summary values rendered while samples remain stored in a ref. */
interface ImuRecordingSummary {
  /** Recorded sample count. */
  sampleCount: number;
  /** Recording duration in milliseconds. */
  durationMs: number;
  /** Estimated sample rate in Hz. */
  sampleRateHz: number;
}

/** Render a phone-based waist IMU recorder for prototype sensor fusion. */
export function ImuRecorderPage(): React.JSX.Element {
  const { patientId: patientIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const patientId = patientIdParam ?? STANDALONE_PATIENT_ID;
  const [standaloneSessionId] = useState(
    () => `standalone:${crypto.randomUUID()}`,
  );
  const sessionId =
    searchParams.get('sessionId') ??
    (patientIdParam === undefined ? standaloneSessionId : patientId);
  const frameRequestRef = useRef<number | null>(null);
  const samplesRef = useRef<ImuSample[]>([]);
  const pendingLatestSampleRef = useRef<ImuSample | null>(null);
  const recordingStartMsRef = useRef<number | null>(null);
  const blockNavigation = useNavigationGuardStore((state) => state.blockNavigation);
  const unblockNavigation = useNavigationGuardStore(
    (state) => state.unblockNavigation,
  );
  const [placement, setPlacement] = useState<ImuPlacement>('waist_sacrum');
  const [latestSample, setLatestSample] = useState<ImuSample | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasUnsavedSamples, setHasUnsavedSamples] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [recordingSummary, setRecordingSummary] = useState<ImuRecordingSummary>({
    durationMs: 0,
    sampleCount: 0,
    sampleRateHz: 0,
  });

  const flushDisplayUpdate = useCallback((): void => {
    frameRequestRef.current = null;
    const sample = pendingLatestSampleRef.current;
    const sampleCount = samplesRef.current.length;
    const durationMs = sample?.timestampMs ?? 0;

    setLatestSample(sample);
    setRecordingSummary({
      durationMs,
      sampleCount,
      sampleRateHz: durationMs > 0 ? (sampleCount / durationMs) * 1000 : 0,
    });
  }, []);

  const scheduleDisplayUpdate = useCallback((): void => {
    if (frameRequestRef.current !== null) {
      return;
    }

    frameRequestRef.current = requestAnimationFrame(flushDisplayUpdate);
  }, [flushDisplayUpdate]);

  const handleDeviceMotion = useCallback(
    (event: DeviceMotionEvent): void => {
      const recordingStartMs = recordingStartMsRef.current;

      if (recordingStartMs === null) {
        return;
      }

      const sample: ImuSample = {
        accelerationIncludingGravityX: normalizeNullableNumber(
          event.accelerationIncludingGravity?.x,
        ),
        accelerationIncludingGravityY: normalizeNullableNumber(
          event.accelerationIncludingGravity?.y,
        ),
        accelerationIncludingGravityZ: normalizeNullableNumber(
          event.accelerationIncludingGravity?.z,
        ),
        accelerationX: normalizeNullableNumber(event.acceleration?.x),
        accelerationY: normalizeNullableNumber(event.acceleration?.y),
        accelerationZ: normalizeNullableNumber(event.acceleration?.z),
        rotationAlpha: normalizeNullableNumber(event.rotationRate?.alpha),
        rotationBeta: normalizeNullableNumber(event.rotationRate?.beta),
        rotationGamma: normalizeNullableNumber(event.rotationRate?.gamma),
        timestampMs: performance.now() - recordingStartMs,
      };

      samplesRef.current.push(sample);
      setHasUnsavedSamples(true);
      pendingLatestSampleRef.current = sample;
      scheduleDisplayUpdate();
    },
    [scheduleDisplayUpdate],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      if (frameRequestRef.current !== null) {
        cancelAnimationFrame(frameRequestRef.current);
      }
    };
  }, [handleDeviceMotion]);

  useEffect(() => {
    const warning =
      'IMU samples are not saved yet. Save or download them before leaving this page.';

    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      if (!isRecording && !hasUnsavedSamples) {
        return;
      }

      event.preventDefault();
      requireBeforeUnloadPrompt(event);
    }

    if (isRecording || hasUnsavedSamples) {
      blockNavigation(warning);
    } else {
      unblockNavigation();
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unblockNavigation();
    };
  }, [blockNavigation, hasUnsavedSamples, isRecording, unblockNavigation]);

  /** Start phone IMU sampling after requesting motion permission when required. */
  async function handleStart(): Promise<void> {
    if (isRecording) {
      return;
    }

    if (
      hasUnsavedSamples &&
      !window.confirm('Starting a new IMU recording will discard unsaved samples. Continue?')
    ) {
      return;
    }

    setErrorMessage(null);
    setSavedRecordId(null);

    try {
      await requestMotionPermission();
      samplesRef.current = [];
      pendingLatestSampleRef.current = null;
      setHasUnsavedSamples(false);
      setRecordingSummary({
        durationMs: 0,
        sampleCount: 0,
        sampleRateHz: 0,
      });
      setLatestSample(null);
      recordingStartMsRef.current = performance.now();
      window.addEventListener('devicemotion', handleDeviceMotion);
      setIsRecording(true);
    } catch (error) {
      setErrorMessage(createMotionErrorMessage(error));
      recordingStartMsRef.current = null;
      setIsRecording(false);
    }
  }

  /** Stop phone IMU sampling while keeping the recorded samples visible. */
  function handleStop(): void {
    window.removeEventListener('devicemotion', handleDeviceMotion);
    recordingStartMsRef.current = null;
    setIsRecording(false);
  }

  /** Persist the current IMU sequence as a local draft for later fusion. */
  async function handleSave(): Promise<void> {
    const sequence = buildImuSequence(samplesRef.current, placement);

    if (sequence.samples.length === 0) {
      setErrorMessage('No IMU samples were recorded. Start recording and walk before saving.');
      return;
    }

    const recordId = createImuRecordId(sessionId);

    try {
      await saveImuSequence({
        assessmentId: sessionId,
        data: sequence,
        id: recordId,
        patientId,
      });
      setSavedRecordId(recordId);
      setHasUnsavedSamples(false);
      unblockNavigation();
    } catch (error) {
      setErrorMessage(createSaveErrorMessage(error));
    }
  }

  /** Download the current IMU sequence as JSON for manual inspection or sync. */
  function handleDownload(): void {
    const sequence = buildImuSequence(samplesRef.current, placement);

    if (sequence.samples.length === 0) {
      setErrorMessage('No IMU samples were recorded. Start recording before export.');
      return;
    }

    const blob = new Blob([JSON.stringify(sequence, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = `imu-${sessionId}-${String(Date.now())}.json`;
    anchor.href = url;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setHasUnsavedSamples(false);
    unblockNavigation();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-teal-700">Phone IMU</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">IMU Recorder</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Subject ID:{' '}
            <span className="font-medium text-slate-950">{patientId}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Session ID: <span className="font-medium">{sessionId}</span>
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
            Start IMU
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isRecording}
            onClick={handleStop}
            type="button"
          >
            <Square aria-hidden="true" className="h-4 w-4" />
            Stop IMU
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          <h3 className="flex items-center gap-2 font-semibold">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            IMU recording needs attention
          </h3>
          <p className="mt-2">{errorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div className="rounded-md border border-teal-100 bg-teal-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-teal-900">
              <Smartphone aria-hidden="true" className="h-4 w-4" />
              Waist phone setup
            </h3>
            <ul className="mt-3 grid gap-2 text-sm text-teal-950 sm:grid-cols-3">
              <li>Use a waist belt</li>
              <li>Place at center waist</li>
              <li>Stand still 2 seconds before walking</li>
            </ul>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4">
            <label className="text-sm font-semibold text-slate-950" htmlFor="imu-placement">
              Phone placement
            </label>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
              disabled={isRecording}
              id="imu-placement"
              onChange={(event) => {
                setPlacement(event.target.value as ImuPlacement);
              }}
              value={placement}
            >
              {placementOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-950">Latest sample</h3>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <Metric label="Accel X" value={formatNullable(latestSample?.accelerationX)} />
              <Metric label="Accel Y" value={formatNullable(latestSample?.accelerationY)} />
              <Metric label="Accel Z" value={formatNullable(latestSample?.accelerationZ)} />
              <Metric
                label="Gyro alpha"
                value={formatNullable(latestSample?.rotationAlpha)}
              />
              <Metric
                label="Gyro beta"
                value={formatNullable(latestSample?.rotationBeta)}
              />
              <Metric
                label="Gyro gamma"
                value={formatNullable(latestSample?.rotationGamma)}
              />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div
            aria-live="polite"
            className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600"
          >
            <h3 className="font-semibold text-slate-950">Recording summary</h3>
            <dl className="mt-3 space-y-2">
              <SummaryRow label="Status" value={isRecording ? 'Recording' : 'Stopped'} />
              <SummaryRow label="Samples" value={String(recordingSummary.sampleCount)} />
              <SummaryRow
                label="Duration"
                value={`${(recordingSummary.durationMs / 1000).toFixed(1)} s`}
              />
              <SummaryRow
                label="Sample rate"
                value={`${recordingSummary.sampleRateHz.toFixed(1)} Hz`}
              />
            </dl>
          </div>

          <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isRecording || recordingSummary.sampleCount === 0}
              onClick={() => {
                void handleSave();
              }}
              type="button"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              Save IMU draft
            </button>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={recordingSummary.sampleCount === 0}
              onClick={handleDownload}
              type="button"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Download JSON
            </button>
            {savedRecordId ? (
              <p className="text-xs text-teal-700" role="status">
                Saved locally as {savedRecordId}
              </p>
            ) : null}
          </div>

          {isRecording || hasUnsavedSamples ? (
            <p className="text-sm font-medium text-amber-700">
              Save or download IMU samples before leaving this page.
            </p>
          ) : (
            <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" to="/">
              Back to patients
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}

/** Render one compact metric value. */
function Metric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-semibold text-slate-950">{value}</p>
    </div>
  );
}

/** Render one summary row. */
function SummaryRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-medium text-slate-950">{value}</dd>
    </div>
  );
}

/** Build an IMU sequence from samples and selected placement. */
function buildImuSequence(samples: ImuSample[], placement: ImuPlacement): ImuSequence {
  const durationMs = samples.reduce(
    (maxTimestamp, sample) => Math.max(maxTimestamp, sample.timestampMs),
    0,
  );
  const sampleRateHz = durationMs > 0 ? (samples.length / durationMs) * 1000 : 0;

  return {
    capturedAt: new Date().toISOString(),
    deviceType: 'phone',
    durationMs,
    placement,
    sampleRateHz,
    samples,
    syncMode: 'manual',
  };
}

/** Create a stable local draft record identifier for one session scope. */
function createImuRecordId(scopeId: string): string {
  if (scopeId.startsWith('standalone:')) {
    return `imu:${scopeId}`;
  }

  return `imu:draft:${scopeId}`;
}

/** Request legacy beforeunload prompting without reading deprecated properties. */
function requireBeforeUnloadPrompt(event: BeforeUnloadEvent): void {
  Object.defineProperty(event, 'returnValue', {
    configurable: true,
    value: '',
    writable: true,
  });
}

/** Request DeviceMotion permission on platforms that require an explicit grant. */
async function requestMotionPermission(): Promise<void> {
  if (!('DeviceMotionEvent' in window)) {
    throw new Error('DeviceMotion is not supported by this browser.');
  }

  const motionConstructor =
    window.DeviceMotionEvent as unknown as DeviceMotionEventConstructorWithPermission;
  const requestPermission = motionConstructor.requestPermission;

  if (requestPermission === undefined) {
    return;
  }

  const permission = await requestPermission();

  if (permission !== 'granted') {
    throw new Error('Motion sensor permission was denied.');
  }
}

/** Normalize finite numeric sensor values and map missing values to null. */
function normalizeNullableNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Format a nullable numeric value for compact display. */
function formatNullable(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'N/A';
}

/** Convert motion sensor failures into operator-facing messages. */
function createMotionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('permission') || normalized.includes('denied')) {
    return 'Motion sensor access was denied. Allow motion and orientation access, then try again.';
  }

  if (normalized.includes('not supported')) {
    return 'This browser does not expose phone motion sensors. Try Safari or Chrome on a mobile device.';
  }

  return 'Unable to start IMU recording. Check phone motion sensor support and browser permission.';
}

/** Convert local IMU persistence failures into operator-facing messages. */
function createSaveErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('quota') || normalized.includes('storage')) {
    return 'IMU samples could not be saved because browser storage is unavailable or full.';
  }

  return 'IMU samples could not be saved locally. Download JSON before leaving this page.';
}
