import { Link } from 'react-router-dom';

/** Render the patient list landing page placeholder. */
export function HomePage(): React.JSX.Element {
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

      <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
        <h3 className="text-base font-semibold text-slate-950">No patients yet</h3>
        <p className="mt-2 text-sm text-slate-600">
          Patient persistence is implemented in the data layer; CRUD UI starts in Task 4.2.
        </p>
      </div>
    </section>
  );
}
