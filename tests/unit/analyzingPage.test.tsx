// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AnalyzingPageRepository } from '../../src/pages/AnalyzingPage';
import { AnalyzingPage } from '../../src/pages/AnalyzingPage';
import { useAssessmentStore } from '../../src/stores/assessmentStore';
import type { Assessment } from '../../src/types/assessment';
import type { GaitAnalysisResult } from '../../src/types/gait';
import type { Patient } from '../../src/types/patient';
import type { PoseSequence } from '../../src/types/pose';

const patient: Patient = {
  birthYear: 1975,
  createdAt: '2026-01-01T00:00:00.000Z',
  diagnosis: 'healthy',
  heightCm: 170,
  id: 'patient-1',
  sex: 'F',
};

const sequence: PoseSequence = {
  capturedAt: '2026-01-02T00:00:00.000Z',
  durationMs: 1000,
  fps: 30,
  frames: [],
};

describe('AnalyzingPage', () => {
  afterEach(() => {
    cleanup();
    useAssessmentStore.getState().clearCapturedSequence();
  });

  it('runs analysis, persists outputs, and navigates to result', async () => {
    const result = createResultFixture();
    const analyze = vi.fn(() => Promise.resolve(result));
    const repository = createRepository();

    useAssessmentStore.getState().setCapturedSequence(sequence);
    renderAnalyzingPage({ analyze, repository });

    await waitFor(() => {
      expect(screen.getByText('Result route')).toBeDefined();
    });
    expect(analyze).toHaveBeenCalledWith(sequence, patient);
    expect(repository.createAssessment).toHaveBeenCalledWith({
      id: result.assessmentId,
      patientId: result.patientId,
      performedAt: result.performedAt,
      testType: '10MWT',
    });
    expect(repository.savePoseSequence).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: result.assessmentId,
        data: sequence,
      }),
    );
    expect(repository.saveResult).toHaveBeenCalledWith(result);
    expect(repository.deletePoseSequence).toHaveBeenCalledWith('draft:patient-1');
    expect(useAssessmentStore.getState().capturedSequence).toBeNull();
  });

  it('recovers a captured sequence from local persistence when memory state is empty', async () => {
    const result = createResultFixture();
    const analyze = vi.fn(() => Promise.resolve(result));
    const repository = createRepository();

    repository.getPoseSequenceByAssessment.mockResolvedValueOnce({
      assessmentId: patient.id,
      data: sequence,
      id: 'draft:patient-1',
    });
    renderAnalyzingPage({ analyze, repository });

    await waitFor(() => {
      expect(screen.getByText('Result route')).toBeDefined();
    });
    expect(repository.getPoseSequenceByAssessment).toHaveBeenCalledWith(patient.id);
    expect(analyze).toHaveBeenCalledWith(sequence, patient);
    expect(repository.deletePoseSequence).toHaveBeenCalledWith('draft:patient-1');
  });

  it('shows an error when no captured sequence is available', async () => {
    renderAnalyzingPage({
      analyze: vi.fn(),
      repository: createRepository(),
    });

    expect(await screen.findByText('Analysis failed')).toBeDefined();
    expect(screen.getByText('No captured pose sequence is available.')).toBeDefined();
  });

  it('shows quality guidance and allows retry when analysis fails', async () => {
    const analyze = vi.fn(() => Promise.reject(new Error('insufficient gait events')));

    useAssessmentStore.getState().setCapturedSequence(sequence);
    renderAnalyzingPage({
      analyze,
      repository: createRepository(),
    });

    expect(await screen.findByText('Analysis failed')).toBeDefined();
    expect(screen.getByText('Capture quality report')).toBeDefined();
    expect(screen.getByText('Detection rate')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Retry analysis' })).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: 'Retry analysis' }));

    await waitFor(() => {
      expect(analyze).toHaveBeenCalledTimes(2);
    });
  });
});

/** Render AnalyzingPage with route context and dependency injection. */
function renderAnalyzingPage({
  analyze,
  repository,
}: {
  analyze: (sequence: PoseSequence, patient: Patient) => Promise<GaitAnalysisResult>;
  repository: AnalyzingPageRepository;
}): void {
  render(
    <MemoryRouter initialEntries={['/assessment/patient-1/analyzing']}>
      <Routes>
        <Route
          path="/assessment/:id/analyzing"
          element={<AnalyzingPage analyze={analyze} repository={repository} />}
        />
        <Route
          path="/assessment/:id/result"
          element={<div>Result route</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

/** Create a repository test double for analysis persistence. */
function createRepository(): AnalyzingPageRepository & {
  createAssessment: ReturnType<typeof vi.fn<(assessment: Assessment) => Promise<string>>>;
  getPatient: ReturnType<typeof vi.fn<(patientId: string) => Promise<Patient | undefined>>>;
  getPoseSequenceByAssessment: ReturnType<
    typeof vi.fn<
      (
        assessmentId: string,
      ) => Promise<{ assessmentId: string; data: PoseSequence; id: string } | undefined>
    >
  >;
  savePoseSequence: ReturnType<
    typeof vi.fn<
      (record: { assessmentId: string; data: PoseSequence; id: string }) => Promise<string>
    >
  >;
  saveResult: ReturnType<typeof vi.fn<(result: GaitAnalysisResult) => Promise<string>>>;
  deletePoseSequence: ReturnType<typeof vi.fn<(recordId: string) => Promise<void>>>;
} {
  return {
    createAssessment: vi.fn((assessment: Assessment) => Promise.resolve(assessment.id)),
    deletePoseSequence: vi.fn((recordId: string) => {
      void recordId;
      return Promise.resolve();
    }),
    getPatient: vi.fn((patientId: string) =>
      Promise.resolve(patientId === patient.id ? patient : undefined),
    ),
    getPoseSequenceByAssessment: vi.fn((assessmentId: string) => {
      void assessmentId;
      return Promise.resolve(undefined);
    }),
    savePoseSequence: vi.fn((record) => Promise.resolve(record.id)),
    saveResult: vi.fn((result: GaitAnalysisResult) => Promise.resolve(result.assessmentId)),
  };
}

/** Build a complete gait result fixture for persistence tests. */
function createResultFixture(): GaitAnalysisResult {
  return {
    assessmentId: 'assessment-result-1',
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
      hipFlexionRange: { left: 25, right: 25 },
      kneeFlexionRange: { left: 60, right: 60 },
      trunkLean: 1,
    },
    patientId: patient.id,
    performedAt: sequence.capturedAt,
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
