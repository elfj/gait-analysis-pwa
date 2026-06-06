import type { RouteObject } from 'react-router-dom';
import App from './App';

/** Route definitions for the MVP assessment workflow. */
export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { HomePage } = await import('./pages/HomePage');
          return { Component: HomePage };
        },
      },
      {
        path: 'patient/new',
        lazy: async () => {
          const { NewPatientPage } = await import('./pages/NewPatientPage');
          return { Component: NewPatientPage };
        },
      },
      {
        path: 'assessment/new/:patientId',
        lazy: async () => {
          const { NewAssessmentPage } =
            await import('./pages/NewAssessmentPage');
          return { Component: NewAssessmentPage };
        },
      },
      {
        path: 'assessment/:id/capture',
        lazy: async () => {
          const { CapturePage } = await import('./pages/CapturePage');
          return { Component: CapturePage };
        },
      },
      {
        path: 'assessment/:id/analyzing',
        lazy: async () => {
          const { AnalyzingPage } = await import('./pages/AnalyzingPage');
          return { Component: AnalyzingPage };
        },
      },
      {
        path: 'assessment/:id/result',
        lazy: async () => {
          const { ResultPage } = await import('./pages/ResultPage');
          return { Component: ResultPage };
        },
      },
    ],
  },
];
