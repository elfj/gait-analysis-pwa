// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  NewPatientPage,
  type NewPatientPageRepository,
} from '../../src/pages/NewPatientPage';
import type { Patient } from '../../src/types/patient';

describe('NewPatientPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('validates patient form fields before submit', async () => {
    const repository = createRepository();

    renderNewPatientPage(repository);

    await userEvent.clear(screen.getByLabelText('Birth year'));
    await userEvent.type(screen.getByLabelText('Birth year'), '2500');
    await userEvent.clear(screen.getByLabelText('Height (cm)'));
    await userEvent.type(screen.getByLabelText('Height (cm)'), '40');
    await userEvent.click(screen.getByRole('button', { name: 'Save Patient' }));

    expect(await screen.findByText('Birth year cannot be in the future.')).toBeDefined();
    expect(screen.getByText('Height must be at least 80 cm.')).toBeDefined();
    expect(repository.createPatient).not.toHaveBeenCalled();
  });

  it('creates a patient and navigates back to the patient list', async () => {
    const repository = createRepository();

    renderNewPatientPage(repository);

    await userEvent.clear(screen.getByLabelText('External ID'));
    await userEvent.type(screen.getByLabelText('External ID'), 'MRN-123');
    await userEvent.clear(screen.getByLabelText('Birth year'));
    await userEvent.type(screen.getByLabelText('Birth year'), '1978');
    await userEvent.selectOptions(screen.getByLabelText('Sex'), 'M');
    await userEvent.clear(screen.getByLabelText('Height (cm)'));
    await userEvent.type(screen.getByLabelText('Height (cm)'), '176');
    await userEvent.selectOptions(screen.getByLabelText('Diagnosis category'), 'stroke');
    await userEvent.type(screen.getByLabelText('Notes'), 'Uses a cane indoors.');
    await userEvent.click(screen.getByRole('button', { name: 'Save Patient' }));

    await waitFor(() => {
      expect(screen.getByText('Patients Home')).toBeDefined();
    });
    expect(repository.createPatient).toHaveBeenCalledTimes(1);

    const createdPatient = repository.createPatient.mock.calls[0]?.[0];
    expect(createdPatient).toMatchObject({
      birthYear: 1978,
      diagnosis: 'stroke',
      externalId: 'MRN-123',
      heightCm: 176,
      notes: 'Uses a cane indoors.',
      sex: 'M',
    });
    expect(createdPatient?.id).toHaveLength(36);
  });
});

/** Render NewPatientPage with routes needed for navigation. */
function renderNewPatientPage(repository: NewPatientPageRepository): void {
  render(
    <MemoryRouter initialEntries={['/patient/new']}>
      <Routes>
        <Route path="/" element={<div>Patients Home</div>} />
        <Route
          path="/patient/new"
          element={<NewPatientPage repository={repository} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

/** Create a repository test double for patient form tests. */
function createRepository(): NewPatientPageRepository & {
  createPatient: ReturnType<typeof vi.fn<(patient: Patient) => Promise<string>>>;
} {
  return {
    createPatient: vi.fn((patient: Patient) => Promise.resolve(patient.id)),
  };
}
