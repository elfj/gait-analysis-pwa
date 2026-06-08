import { Copy, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ImuLinkQrCode } from '@/components/ImuLinkQrCode';

const ASSESSMENT_SESSION_STORAGE_PREFIX = 'gait-assessment-session';

/** Render the assessment type selection route placeholder. */
export function NewAssessmentPage(): React.JSX.Element {
  const { patientId } = useParams();
  const hasPatientId = typeof patientId === 'string' && patientId.length > 0;
  const [sessionId] = useState(() =>
    hasPatientId ? getOrCreateAssessmentSessionId(patientId) : crypto.randomUUID(),
  );
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const sessionQuery = `?sessionId=${encodeURIComponent(sessionId)}`;
  const encodedPatientId = hasPatientId ? encodeURIComponent(patientId) : '';
  const imuPath = hasPatientId
    ? `/patient/${encodedPatientId}/imu${sessionQuery}`
    : '/imu/record';
  const capturePath = hasPatientId
    ? `/patient/${encodedPatientId}/capture${sessionQuery}`
    : '/';
  const imuUrl = new URL(imuPath, window.location.origin).toString();
  const isLocalOrigin = isLocalhostOrigin(window.location.origin);

  /** Copy the paired IMU recorder link for manual sharing. */
  async function handleCopyImuLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(imuUrl);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Assessment</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">New 10MWT Assessment</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Patient ID: <span className="font-medium text-slate-950">{patientId ?? 'unknown'}</span>
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-6">
        <h3 className="text-base font-semibold text-slate-950">10-meter walk test</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          MVP supports 10MWT only. Continue when the patient is ready for a
          sagittal-view walking capture.
        </p>
        {hasPatientId ? (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                to={capturePath}
              >
                Continue to capture
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                to={imuPath}
              >
                <Smartphone aria-hidden="true" className="h-4 w-4" />
                Open IMU recorder
              </Link>
            </div>

            <div className="grid gap-5 rounded-md border border-teal-100 bg-teal-50 p-4 md:grid-cols-[12rem_1fr] md:items-center">
              <ImuLinkQrCode url={imuUrl} />
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-teal-950">
                  Pair waist phone
                </h4>
                <p className="mt-2 text-sm leading-6 text-teal-950">
                  Scan this QR code on the waist phone to open the paired IMU
                  recorder with the same session ID.
                </p>
                <p className="mt-3 break-all rounded-md bg-white px-3 py-2 text-xs text-slate-700">
                  {imuUrl}
                </p>
                <button
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-100"
                  onClick={() => {
                    void handleCopyImuLink();
                  }}
                  type="button"
                >
                  <Copy aria-hidden="true" className="h-4 w-4" />
                  Copy IMU link
                </button>
                {copyStatus === 'copied' ? (
                  <p className="mt-2 text-xs font-medium text-teal-800" role="status">
                    IMU link copied.
                  </p>
                ) : null}
                {copyStatus === 'failed' ? (
                  <p className="mt-2 text-xs font-medium text-red-700" role="alert">
                    Copy failed. Use the QR code or copy the link manually.
                  </p>
                ) : null}
                {isLocalOrigin ? (
                  <p className="mt-3 text-xs leading-5 text-amber-800">
                    Localhost QR codes are usually reachable only from this
                    computer. Use the deployed HTTPS app for two-phone testing.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <Link
            className="mt-5 inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            to="/"
          >
            Return to patients
          </Link>
        )}
      </div>
    </section>
  );
}

/** Get a stable assessment pairing session for one patient in this browser tab. */
function getOrCreateAssessmentSessionId(patientId: string): string {
  const storageKey = `${ASSESSMENT_SESSION_STORAGE_PREFIX}:${patientId}`;
  const existingSessionId = window.sessionStorage.getItem(storageKey);

  if (existingSessionId !== null && existingSessionId.length > 0) {
    return existingSessionId;
  }

  const sessionId = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, sessionId);
  return sessionId;
}

/** Check if a QR URL points to a local development origin. */
function isLocalhostOrigin(origin: string): boolean {
  const hostname = new URL(origin).hostname;

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local')
  );
}
