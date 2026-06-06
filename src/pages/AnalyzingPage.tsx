import { Link, useParams } from 'react-router-dom';

/** Render the analysis progress route placeholder. */
export function AnalyzingPage(): React.JSX.Element {
  const { id } = useParams();

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Analysis</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">Analyzing Assessment</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Assessment ID: <span className="font-medium text-slate-950">{id ?? 'unknown'}</span>
        </p>
      </div>

      <ol className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-700">
        <li>1. Event detection</li>
        <li className="mt-2">2. Spatiotemporal metrics</li>
        <li className="mt-2">3. Joint kinematics</li>
        <li className="mt-2">4. Symmetry scoring</li>
      </ol>

      <Link
        className="inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        to={`/assessment/${id ?? 'demo'}/result`}
      >
        View result
      </Link>
    </section>
  );
}
