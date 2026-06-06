import { Link, useParams } from 'react-router-dom';

/** Render the result dashboard route placeholder. */
export function ResultPage(): React.JSX.Element {
  const { id } = useParams();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Results</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">Assessment Result</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Assessment ID: <span className="font-medium text-slate-950">{id ?? 'unknown'}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Gait speed', 'Cadence', 'Quality', 'Symmetry'].map((label) => (
          <article className="rounded-md border border-slate-200 bg-white p-5" key={label}>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">N/A</p>
          </article>
        ))}
      </div>

      <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" to="/">
        Back to patients
      </Link>
    </section>
  );
}
