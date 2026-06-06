import { Link } from 'react-router-dom';

/** Render the new patient route placeholder. */
export function NewPatientPage(): React.JSX.Element {
  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Patient Setup</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">New Patient</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The validated patient form will be implemented in Task 4.3.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-950">Required fields</dt>
            <dd className="mt-1 text-slate-600">External ID, birth year, sex, height, diagnosis</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-950">Privacy</dt>
            <dd className="mt-1 text-slate-600">Only de-identified data is stored locally.</dd>
          </div>
        </dl>
      </div>

      <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" to="/">
        Back to patients
      </Link>
    </section>
  );
}
