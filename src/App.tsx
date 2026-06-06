import { Activity, FileText, ShieldCheck, Smartphone } from 'lucide-react';

const workflowItems = [
  {
    title: 'Patient Setup',
    description:
      'Enter de-identified patient details for a 10-meter walk test.',
    icon: FileText,
  },
  {
    title: 'Guided Capture',
    description: 'Use phone camera guidance for sagittal-view walking capture.',
    icon: Smartphone,
  },
  {
    title: 'Local Analysis',
    description: 'Compute gait metrics from on-device pose keypoints.',
    icon: Activity,
  },
  {
    title: 'Privacy First',
    description: 'Keep raw video local and prepare report-ready summaries.',
    icon: ShieldCheck,
  },
] as const;

/** Render the MVP shell shown after project initialization. */
function App(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
              Home Gait Assessment
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
              Gait Analysis MVP
            </h1>
          </div>
          <div className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white">
            10MWT
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
              Privacy-first walking assessment for clinical home visits.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              This scaffold is ready for the 10-meter walk test workflow:
              patient setup, guided camera capture, pose-keypoint storage, gait
              metrics, visualization, and PDF reporting.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">
                Start Assessment
              </button>
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100">
                View Patients
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {workflowItems.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  key={item.title}
                >
                  <div className="flex items-start gap-4">
                    <span className="rounded-md bg-teal-50 p-2 text-teal-700">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
