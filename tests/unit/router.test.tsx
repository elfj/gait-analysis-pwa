// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import App from '../../src/App';
import { AnalyzingPage } from '../../src/pages/AnalyzingPage';
import { CapturePage } from '../../src/pages/CapturePage';
import { HomePage } from '../../src/pages/HomePage';
import { ImuRecorderPage } from '../../src/pages/ImuRecorderPage';
import { NewAssessmentPage } from '../../src/pages/NewAssessmentPage';
import { NewPatientPage } from '../../src/pages/NewPatientPage';
import { ResultPage } from '../../src/pages/ResultPage';
import { appRoutes } from '../../src/routes';

const testRoutes = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'patient/new', element: <NewPatientPage /> },
      { path: 'assessment/new/:patientId', element: <NewAssessmentPage /> },
      { path: 'patient/:patientId/capture', element: <CapturePage /> },
      { path: 'imu/record', element: <ImuRecorderPage /> },
      { path: 'patient/:patientId/imu', element: <ImuRecorderPage /> },
      { path: 'patient/:patientId/analyzing', element: <AnalyzingPage /> },
      { path: 'assessment/:assessmentId/result', element: <ResultPage /> },
    ],
  },
];

describe('application routes', () => {
  it('defines lazy route chunks for production routing', () => {
    const childRoutes = appRoutes[0]?.children ?? [];

    expect(childRoutes).toHaveLength(8);
    expect(childRoutes.every((route) => typeof route.lazy === 'function')).toBe(
      true,
    );
  });

  it.each([
    ['/', 'Gait Analysis MVP'],
    ['/patient/new', 'New Patient'],
    ['/assessment/new/patient-1', 'New 10MWT Assessment'],
    ['/patient/patient-1/capture', 'Guided Camera Capture'],
    ['/imu/record', 'IMU Recorder'],
    ['/patient/patient-1/imu', 'IMU Recorder'],
    ['/patient/patient-1/analyzing', 'Analyzing Assessment'],
    ['/assessment/assessment-1/result', 'Assessment Result'],
  ])('renders %s', async (path, heading) => {
    renderRoute(path);

    expect(
      (await screen.findAllByRole('heading', { name: heading })).length,
    ).toBeGreaterThan(0);
  });
});

/** Render one app route with an in-memory router. */
function renderRoute(path: string): void {
  const router = createMemoryRouter(testRoutes, {
    initialEntries: [path],
  });

  render(<RouterProvider router={router} />);
}
