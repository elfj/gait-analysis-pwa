// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
  createReportFileName,
  exportPdfReport,
  type PdfDocument,
} from '../../src/lib/report/pdfExporter';
import type { GaitAnalysisResult } from '../../src/types/gait';

describe('pdfExporter', () => {
  it('captures the report element and saves an A4 PDF', async () => {
    const result = createResultFixture();
    const element = document.createElement('section');
    const canvas = createCanvasStub();
    const pdf = createPdfStub();
    const captureElement = vi.fn(() => Promise.resolve(canvas));

    await exportPdfReport(
      { element, result },
      {
        captureElement,
        createPdf: () => Promise.resolve(pdf),
      },
    );

    expect(captureElement).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: true,
      }),
    );
    expect(pdf.addImage).toHaveBeenCalledWith(
      'data:image/png;base64,report',
      'PNG',
      10,
      10,
      190,
      95,
    );
    expect(pdf.save).toHaveBeenCalledWith('gait-report-assessment-1.pdf');
  });

  it('creates a de-identified report filename from the assessment ID', () => {
    expect(createReportFileName(createResultFixture())).toBe(
      'gait-report-assessment-1.pdf',
    );
  });
});

/** Build a canvas test double. */
function createCanvasStub(): HTMLCanvasElement {
  return {
    height: 500,
    toDataURL: vi.fn(() => 'data:image/png;base64,report'),
    width: 1000,
  } as unknown as HTMLCanvasElement;
}

/** Build a minimal jsPDF test double. */
function createPdfStub(): PdfDocument {
  return {
    addImage: vi.fn(),
    internal: {
      pageSize: {
        getHeight: () => 297,
        getWidth: () => 210,
      },
    },
    save: vi.fn(),
  };
}

/** Build one result fixture for PDF tests. */
function createResultFixture(): GaitAnalysisResult {
  return {
    assessmentId: 'assessment-1',
    confidenceFlags: [],
    events: [],
    kinematics: {
      ankleRange: { left: 12, right: 11 },
      cyclePlots: {
        hipLeft: [],
        hipRight: [],
        kneeLeft: [],
        kneeRight: [],
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
