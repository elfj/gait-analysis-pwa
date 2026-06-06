// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HomePage, type HomePageRepository } from '../../src/pages/HomePage';
import type { GaitAnalysisResult } from '../../src/types/gait';
import type { Patient } from '../../src/types/patient';

const patients: Patient[] = [
  {
    birthYear: 1970,
    createdAt: '2026-01-01T00:00:00.000Z',
    diagnosis: 'healthy',
    externalId: 'MRN-001',
    heightCm: 170,
    id: 'patient-1',
    sex: 'F',
  },
  {
    birthYear: 1964,
    createdAt: '2026-01-02T00:00:00.000Z',
    diagnosis: 'stroke',
    externalId: 'MRN-002',
    heightCm: 165,
    id: 'patient-2',
    sex: 'M',
  },
];

describe('HomePage', () => {
  afterEach(() => {
    cleanup();
  });

  it('lists and searches patients', async () => {
    renderHomePage(createRepository());

    expect(await screen.findByText('MRN-001')).toBeDefined();
    expect(screen.getByText('MRN-002')).toBeDefined();

    await userEvent.type(screen.getByRole('searchbox'), 'stroke');

    expect(screen.queryByText('MRN-001')).toBeNull();
    expect(screen.getByText('MRN-002')).toBeDefined();
  });

  it('loads assessment history when a patient is selected', async () => {
    const repository = createRepository({
      results: [createResultFixture()],
    });

    renderHomePage(repository);

    await userEvent.click(await screen.findByText('MRN-001'));

    expect(await screen.findByText('Assessment history')).toBeDefined();
    expect(screen.getByText(/gait speed 1.20 m\/s/u)).toBeDefined();
    expect(repository.listResultsByPatient).toHaveBeenCalledWith('patient-1');
  });

  it('deletes a patient and refreshes the list', async () => {
    const repository = createRepository();

    renderHomePage(repository);

    await userEvent.click(await screen.findByLabelText('Delete MRN-001'));

    await waitFor(() => {
      expect(screen.queryByText('MRN-001')).toBeNull();
    });
    expect(repository.deletePatient).toHaveBeenCalledWith('patient-1');
  });
});

/** Render HomePage with a memory router for Link support. */
function renderHomePage(repository: HomePageRepository): void {
  render(
    <MemoryRouter>
      <HomePage repository={repository} />
    </MemoryRouter>,
  );
}

/** Create a stateful repository test double. */
function createRepository({
  results = [],
}: {
  results?: GaitAnalysisResult[];
} = {}): HomePageRepository {
  let currentPatients = [...patients];

  return {
    deletePatient: vi.fn((patientId: string) => {
      currentPatients = currentPatients.filter((patient) => patient.id !== patientId);
      return Promise.resolve();
    }),
    listPatients: vi.fn(() => Promise.resolve(currentPatients)),
    listResultsByPatient: vi.fn(() => Promise.resolve(results)),
  };
}

/** Build one result used in assessment-history rendering tests. */
function createResultFixture(): GaitAnalysisResult {
  return {
    assessmentId: 'assessment-1',
    confidenceFlags: [],
    events: [],
    kinematics: {
      ankleRange: { left: 10, right: 10 },
      cyclePlots: {
        hipLeft: new Array<number>(101).fill(0),
        hipRight: new Array<number>(101).fill(0),
        kneeLeft: new Array<number>(101).fill(0),
        kneeRight: new Array<number>(101).fill(0),
      },
      hipFlexionRange: { left: 20, right: 20 },
      kneeFlexionRange: { left: 60, right: 60 },
      trunkLean: 1,
    },
    patientId: 'patient-1',
    performedAt: '2026-01-03T08:00:00.000Z',
    quality: {
      detectionRate: 95,
      meanConfidence: 0.9,
      occlusionRate: 1,
      passed: true,
      stepCount: 8,
      warnings: [],
    },
    spatiotemporal: {
      cadence: 110,
      doubleSupportPct: 18,
      gaitSpeed: 1.2,
      stancePhasePctLeft: 60,
      stancePhasePctRight: 60,
      stepLengthLeft: 0.65,
      stepLengthRight: 0.65,
      stepWidth: 0.12,
      strideTimeCV: 2,
      strideTimeMean: 1.1,
    },
    symmetry: {
      kneeFlexionSI: 0,
      overallAsymmetryScore: 0,
      stanceTimeSI: 0,
      stepLengthSI: 0,
      swingTimeSI: 0,
    },
    testType: '10MWT',
  };
}
