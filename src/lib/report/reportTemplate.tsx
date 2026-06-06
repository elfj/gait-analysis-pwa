import type { GaitAnalysisResult } from '@/types/gait';

/** Props for the report capture template. */
export interface ReportTemplateProps {
  /** Result used for report metadata. */
  result: GaitAnalysisResult;
  /** Report body content to capture. */
  children: React.ReactNode;
}

/** Render a report-friendly wrapper around the result dashboard content. */
export function ReportTemplate({
  result,
  children,
}: ReportTemplateProps): React.JSX.Element {
  return (
    <section
      className="space-y-6 bg-slate-50 p-1"
      data-testid="pdf-report-template"
    >
      <header className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Clinical gait assessment
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">
              10MWT Gait Analysis Report
            </h3>
          </div>
          <dl className="grid gap-1 text-sm text-slate-600 sm:text-right">
            <div>
              <dt className="inline font-medium text-slate-950">
                Patient ID:{' '}
              </dt>
              <dd className="inline">{result.patientId}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-slate-950">Date: </dt>
              <dd className="inline">{formatDate(result.performedAt)}</dd>
            </div>
          </dl>
        </div>
      </header>

      {children}

      <footer className="rounded-md border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600">
        This report supports clinical decision-making and should not be used as the
        sole basis for diagnosis, treatment, fall-risk classification, or
        neurological disease classification.
      </footer>
    </section>
  );
}

/** Format an ISO timestamp for report display. */
function formatDate(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);

  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp;
  }

  return parsed.toISOString().slice(0, 10);
}
