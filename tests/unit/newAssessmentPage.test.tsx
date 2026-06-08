// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NewAssessmentPage } from '@/pages/NewAssessmentPage';

describe('NewAssessmentPage', () => {
  it('links to camera capture and patient IMU recording when patient id is present', () => {
    renderNewAssessment('/assessment/new/patient-1');

    const captureHref =
      screen.getByRole('link', { name: 'Continue to capture' }).getAttribute('href') ?? '';
    const imuHref =
      screen.getByRole('link', { name: 'Open IMU recorder' }).getAttribute('href') ?? '';
    const captureUrl = new URL(captureHref, 'https://example.test');
    const imuUrl = new URL(imuHref, 'https://example.test');

    expect(captureUrl.pathname).toBe('/patient/patient-1/capture');
    expect(imuUrl.pathname).toBe('/patient/patient-1/imu');
    expect(captureUrl.searchParams.get('sessionId')).toBeTruthy();
    expect(imuUrl.searchParams.get('sessionId')).toBe(
      captureUrl.searchParams.get('sessionId'),
    );
  });

  it('returns to patients when no patient id is present', () => {
    renderNewAssessment('/assessment/new');

    expect(
      screen.getByRole('link', { name: 'Return to patients' }).getAttribute('href'),
    ).toBe('/');
  });
});

/** Render assessment setup with route params. */
function renderNewAssessment(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/assessment/new" element={<NewAssessmentPage />} />
        <Route path="/assessment/new/:patientId" element={<NewAssessmentPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
