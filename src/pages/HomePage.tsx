import { CalendarDays, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deletePatient,
  listPatients,
  listResultsByPatient,
} from '@/lib/db/repositories';
import type { GaitAnalysisResult } from '@/types/gait';
import type { Patient } from '@/types/patient';

/** Data access contract used by the patient list page. */
export interface HomePageRepository {
  /** Delete one patient by internal identifier. */
  deletePatient: (patientId: string) => Promise<void>;
  /** List all stored patients. */
  listPatients: () => Promise<Patient[]>;
  /** List stored gait results for one patient. */
  listResultsByPatient: (patientId: string) => Promise<GaitAnalysisResult[]>;
}

const defaultRepository: HomePageRepository = {
  deletePatient,
  listPatients,
  listResultsByPatient,
};

/** Render the patient list landing page. */
export function HomePage({
  repository = defaultRepository,
}: {
  /** Optional repository override for focused UI tests. */
  repository?: HomePageRepository;
}): React.JSX.Element {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [histories, setHistories] = useState<Record<string, GaitAnalysisResult[]>>({});
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const filteredPatients = useMemo(
    () => filterPatients(patients, query),
    [patients, query],
  );

  useEffect(() => {
    void refreshPatients(repository, setPatients, setStatus, setErrorMessage);
  }, [repository]);

  /** Delete a patient and refresh the visible list. */
  async function handleDelete(patientId: string, displayLabel: string): Promise<void> {
    if (!confirmPatientDeletion(displayLabel)) {
      return;
    }

    await repository.deletePatient(patientId);
    setHistories((current) => removeHistory(current, patientId));

    if (selectedPatientId === patientId) {
      setSelectedPatientId(null);
    }

    await refreshPatients(repository, setPatients, setStatus, setErrorMessage);
  }

  /** Select a patient and lazy-load assessment history. */
  async function handleSelect(patientId: string): Promise<void> {
    setSelectedPatientId(patientId);

    if (histories[patientId] !== undefined) {
      return;
    }

    const results = await repository.listResultsByPatient(patientId);
    setHistories((current) => ({
      ...current,
      [patientId]: results,
    }));
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-teal-700">Patients</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Gait Analysis MVP</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Manage de-identified patients and start a local 10-meter walk assessment.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          to="/patient/new"
        >
          New Patient
        </Link>
      </div>

      <label className="block">
        <span className="sr-only">Search patients</span>
        <span className="relative block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Search by patient ID, diagnosis, sex, or birth year"
            type="search"
            value={query}
          />
        </span>
      </label>

      {status === 'loading' ? (
        <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Loading patients...
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {errorMessage ?? 'Unable to load patients.'}
        </div>
      ) : null}

      {status === 'idle' && filteredPatients.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-base font-semibold text-slate-950">No patients found</h3>
          <p className="mt-2 text-sm text-slate-600">
            Create a patient record, then return here to start an assessment.
          </p>
        </div>
      ) : null}

      {status === 'idle' && filteredPatients.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-200">
            {filteredPatients.map((patient) => {
              const isSelected = selectedPatientId === patient.id;
              const history = histories[patient.id] ?? [];

              return (
                <li key={patient.id}>
                  <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <button
                      className="text-left"
                      onClick={() => {
                        void handleSelect(patient.id);
                      }}
                      type="button"
                    >
                      <p className="text-base font-semibold text-slate-950">
                        {patient.externalId ?? patient.id}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Born {String(patient.birthYear)} | {formatSex(patient.sex)} |{' '}
                        {String(patient.heightCm)} cm | {formatDiagnosis(patient.diagnosis)}
                      </p>
                    </button>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                        to={`/assessment/new/${patient.id}`}
                      >
                        New 10MWT
                      </Link>
                      <button
                        aria-label={`Delete ${patient.externalId ?? patient.id}`}
                        className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white p-2 text-red-700 hover:bg-red-50"
                        onClick={() => {
                          void handleDelete(patient.id, patient.externalId ?? patient.id);
                        }}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                        <CalendarDays aria-hidden="true" className="h-4 w-4 text-teal-700" />
                        Assessment history
                      </h3>
                      {history.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-600">No assessments recorded.</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {history.map((result) => (
                            <li className="text-sm text-slate-700" key={result.assessmentId}>
                              <Link
                                className="font-medium text-teal-700 hover:text-teal-800"
                                to={`/assessment/${result.assessmentId}/result`}
                              >
                                {formatDate(result.performedAt)}
                              </Link>{' '}
                              | gait speed {formatMetric(result.spatiotemporal.gaitSpeed)} m/s
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Refresh patients from the repository into page state. */
async function refreshPatients(
  repository: HomePageRepository,
  setPatients: (patients: Patient[]) => void,
  setStatus: (status: 'idle' | 'loading' | 'error') => void,
  setErrorMessage: (message: string | null) => void,
): Promise<void> {
  setStatus('loading');
  setErrorMessage(null);

  try {
    setPatients(await repository.listPatients());
    setStatus('idle');
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : 'Unable to load patients.');
    setStatus('error');
  }
}

/** Filter patients by de-identified searchable fields. */
function filterPatients(patients: Patient[], query: string): Patient[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return patients;
  }

  return patients.filter((patient) =>
    [
      patient.id,
      patient.externalId ?? '',
      String(patient.birthYear),
      patient.sex,
      patient.diagnosis,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

/** Remove stale assessment history after deleting a patient. */
function removeHistory(
  histories: Record<string, GaitAnalysisResult[]>,
  patientId: string,
): Record<string, GaitAnalysisResult[]> {
  return Object.fromEntries(
    Object.entries(histories).filter(([historyPatientId]) => historyPatientId !== patientId),
  );
}

/** Confirm destructive patient deletion with the browser-native dialog. */
function confirmPatientDeletion(displayLabel: string): boolean {
  return window.confirm(
    `Delete patient ${displayLabel} and all linked assessments, pose keypoints, and results?`,
  );
}

/** Format sex labels for the patient list. */
function formatSex(sex: Patient['sex']): string {
  const labels: Record<Patient['sex'], string> = {
    F: 'Female',
    M: 'Male',
    other: 'Other',
  };

  return labels[sex];
}

/** Format diagnosis category labels for display. */
function formatDiagnosis(diagnosis: Patient['diagnosis']): string {
  const labels: Record<Patient['diagnosis'], string> = {
    healthy: 'Healthy',
    other_neurological: 'Other neurological',
    parkinson: 'Parkinson',
    stroke: 'Stroke',
  };

  return labels[diagnosis];
}

/** Format an ISO date for compact assessment history. */
function formatDate(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-TW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

/** Format a metric with two decimal places. */
function formatMetric(value: number): string {
  if (!Number.isFinite(value)) {
    return 'N/A';
  }

  return value.toFixed(2);
}
