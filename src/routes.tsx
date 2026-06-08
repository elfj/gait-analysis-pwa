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
        path: 'patient/:patientId/capture',
        lazy: async () => {
          const { CapturePage } = await import('./pages/CapturePage');
          return { Component: CapturePage };
        },
      },
      {
        path: 'imu/record',
        lazy: async () => {
          const { ImuRecorderPage } = await import('./pages/ImuRecorderPage');
          return { Component: ImuRecorderPage };
        },
      },
      {
        path: 'patient/:patientId/imu',
        lazy: async () => {
          const { ImuRecorderPage } = await import('./pages/ImuRecorderPage');
          return { Component: ImuRecorderPage };
        },
      },
      {
        path: 'patient/:patientId/analyzing',
        lazy: async () => {
          const { AnalyzingPage } = await import('./pages/AnalyzingPage');
          return { Component: AnalyzingPage };
        },
      },
      {
        path: 'assessment/:assessmentId/result',
        lazy: async () => {
          const { ResultPage } = await import('./pages/ResultPage');
          return { Component: ResultPage };
        },
      },
    ],
  },
];
