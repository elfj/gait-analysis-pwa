// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ResultPage,
  type ResultPageRepository,
  type ResultPdfExporter,
} from '../../src/pages/ResultPage';
import type { GaitAnalysisResult } from '../../src/types/gait';

describe('ResultPage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: ResizeObserverMock,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders summary cards, charts, table, and confidence notes', async () => {
    renderResultPage(createRepository(createResultFixture()));

    expect(
      await screen.findByRole('heading', { name: 'Assessment Result' }),
    ).toBeDefined();
    expect(screen.getByText('10MWT Gait Analysis Report')).toBeDefined();
    expect(
      screen.getByText(/This report supports clinical decision-making/),
    ).toBeDefined();
    expect(screen.getByText('1.23')).toBeDefined();
    expect(screen.getByText('112')).toBeDefined();
    expect(screen.getByText('Spatiotemporal parameters')).toBeDefined();
    expect(screen.getByText('Stride time mean')).toBeDefined();
    expect(screen.getByText('Gait cycle')).toBeDefined();
    expect(screen.getByText('Symmetry')).toBeDefined();
    expect(screen.getByText('ankle_angle_low_confidence')).toBeDefined();
  });

  it('shows not found state when result is missing', async () => {
    renderResultPage(createRepository(undefined));

    expect(await screen.findByText('Result was not found.')).toBeDefined();
  });

  it('exports the report when the PDF button is clicked', async () => {
    const result = createResultFixture();
    const pdfExporter: ResultPdfExporter = vi.fn(() => Promise.resolve());

    renderResultPage(createRepository(result), pdfExporter);

    await screen.findByRole('heading', { name: 'Assessment Result' });
    await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }));

    expect(pdfExporter).toHaveBeenCalledTimes(1);
    expect(pdfExporter).toHaveBeenCalledWith(expect.any(HTMLElement), result);
  });
});

/** Minimal ResizeObserver test double required by Recharts ResponsiveContainer. */
class ResizeObserverMock {
  /** Start observing an element. */
  observe(): void {
    return undefined;
  }

  /** Stop observing an element. */
  unobserve(): void {
    return undefined;
  }

  /** Disconnect all observers. */
  disconnect(): void {
    return undefined;
  }
}

/** Render ResultPage with route params. */
function renderResultPage(
  repository: ResultPageRepository,
  pdfExporter?: ResultPdfExporter,
): void {
  const page = pdfExporter ? (
    <ResultPage pdfExporter={pdfExporter} repository={repository} />
  ) : (
    <ResultPage repository={repository} />
  );

  render(
    <MemoryRouter initialEntries={['/assessment/assessment-1/result']}>
      <Routes>
        <Route path="/assessment/:id/result" element={page} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Create a repository test double for result page tests. */
function createRepository(
  result: GaitAnalysisResult | undefined,
): ResultPageRepository {
  return {
    getResult: vi.fn(() => Promise.resolve(result)),
  };
}

/** Build one complete result fixture. */
function createResultFixture(): GaitAnalysisResult {
  return {
    assessmentId: 'assessment-1',
    confidenceFlags: ['ankle_angle_low_confidence'],
    events: [],
    kinematics: {
      ankleRange: { left: 12, right: 11 },
      cyclePlots: {
        hipLeft: createCurve(15),
        hipRight: createCurve(14),
        kneeLeft: createCurve(55),
        kneeRight: createCurve(52),
      },
      hipFlexionRange: { left: 30, right: 28 },
      kneeFlexionRange: { left: 60, right: 58 },
      trunkLean: 2,
    },
    patientId: 'patient-1',
    performedAt: '2026-01-02T00:00:00.000Z',
    quality: {
      detectionRate: 96,
      meanConfidence: 0.91,
      occlusionRate: 2,
      passed: true,
      stepCount: 8,
      warnings: [],
    },
    spatiotemporal: {
      cadence: 112,
      doubleSupportPct: 18,
      gaitSpeed: 1.23,
      stancePhasePctLeft: 60,
      stancePhasePctRight: 61,
      stepLengthLeft: 0.66,
      stepLengthRight: 0.64,
      stepWidth: 0.12,
      strideTimeCV: 2.4,
      strideTimeMean: 1.08,
    },
    symmetry: {
      kneeFlexionSI: 3.4,
      overallAsymmetryScore: 4.8,
      stanceTimeSI: 1.7,
      stepLengthSI: 3.1,
      swingTimeSI: 2.5,
    },
    testType: '10MWT',
  };
}

/** Create a 101-point chart curve. */
function createCurve(value: number): number[] {
  return Array.from(
    { length: 101 },
    (_, index) => value + Math.sin(index / 10),
  );
}
