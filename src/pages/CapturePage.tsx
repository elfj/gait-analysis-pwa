import { Link, useParams } from 'react-router-dom';

/** Render the capture route placeholder. */
export function CapturePage(): React.JSX.Element {
  const { id } = useParams();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Capture</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">Guided Camera Capture</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Assessment ID: <span className="font-medium text-slate-950">{id ?? 'unknown'}</span>
        </p>
      </div>

      <div className="aspect-video rounded-md border border-slate-200 bg-slate-900 p-6 text-white">
        <div className="flex h-full items-center justify-center text-sm text-slate-300">
          CameraView integration starts in Task 4.4.
        </div>
      </div>

      <Link
        className="inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        to={`/assessment/${id ?? 'demo'}/analyzing`}
      >
        Continue to analyzing
      </Link>
    </section>
  );
}
