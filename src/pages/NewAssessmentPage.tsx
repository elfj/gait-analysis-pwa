import { Link, useParams } from 'react-router-dom';

/** Render the assessment type selection route placeholder. */
export function NewAssessmentPage(): React.JSX.Element {
  const { patientId } = useParams();
  const hasPatientId = typeof patientId === 'string' && patientId.length > 0;

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
          <Link
            className="mt-5 inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            to={`/patient/${patientId}/capture`}
          >
            Continue to capture
          </Link>
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
