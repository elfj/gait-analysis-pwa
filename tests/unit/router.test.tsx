// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import App from '../../src/App';
import { AnalyzingPage } from '../../src/pages/AnalyzingPage';
import { CapturePage } from '../../src/pages/CapturePage';
import { HomePage } from '../../src/pages/HomePage';
import { NewAssessmentPage } from '../../src/pages/NewAssessmentPage';
import { NewPatientPage } from '../../src/pages/NewPatientPage';
import { ResultPage } from '../../src/pages/ResultPage';

const routes = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'patient/new', element: <NewPatientPage /> },
      { path: 'assessment/new/:patientId', element: <NewAssessmentPage /> },
      { path: 'assessment/:id/capture', element: <CapturePage /> },
      { path: 'assessment/:id/analyzing', element: <AnalyzingPage /> },
      { path: 'assessment/:id/result', element: <ResultPage /> },
    ],
  },
];

describe('application routes', () => {
  it.each([
    ['/', 'Gait Analysis MVP'],
    ['/patient/new', 'New Patient'],
    ['/assessment/new/patient-1', 'New 10MWT Assessment'],
    ['/assessment/assessment-1/capture', 'Guided Camera Capture'],
    ['/assessment/assessment-1/analyzing', 'Analyzing Assessment'],
    ['/assessment/assessment-1/result', 'Assessment Result'],
  ])('renders %s', (path, heading) => {
    renderRoute(path);

    expect(screen.getAllByRole('heading', { name: heading }).length).toBeGreaterThan(0);
  });
});

/** Render one app route with an in-memory router. */
function renderRoute(path: string): void {
  const router = createMemoryRouter(routes, {
    initialEntries: [path],
  });

  render(<RouterProvider router={router} />);
}
