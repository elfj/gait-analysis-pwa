import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  errorMessage: string | null;
}

/** Catch render-time app failures and show a recoverable fallback screen. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { errorMessage: null };
  }

  /** Convert thrown render errors into fallback UI state. */
  public static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unexpected application error.',
    };
  }

  /** Log component stack details for development diagnostics. */
  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled app render error', error, info.componentStack);
  }

  /** Render the app children or a recovery screen after an unhandled error. */
  public render(): ReactNode {
    if (this.state.errorMessage === null) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-950">
        <section
          aria-labelledby="app-error-title"
          className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-md bg-red-50 text-red-700">
              <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase text-red-700">Application error</p>
              <h1 id="app-error-title" className="mt-1 text-2xl font-bold">
                The app could not continue.
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-700">
            {this.state.errorMessage} Reload the app and retry the workflow. If capture or
            analysis was interrupted, start a new assessment for the patient.
          </p>

          <button
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            onClick={() => {
              window.location.reload();
            }}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reload app
          </button>
        </section>
      </main>
    );
  }
}
