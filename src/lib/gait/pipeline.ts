import { computeSpatiotemporal } from './spatiotemporal';
import { detectGaitEvents } from './events';
import { computeKinematicMetrics } from './kinematics';
import { computeSymmetryMetrics } from './symmetry';
import { computeQualityScore } from '../pose/qc';
import type { GaitAnalysisResult } from '../../types/gait';
import type { Patient } from '../../types/patient';
import type { PoseSequence } from '../../types/pose';

/**
 * Runs the complete MVP gait analysis pipeline for one 10MWT pose sequence.
 */
export function analyzeGait(
  sequence: PoseSequence,
  patient: Patient,
): Promise<GaitAnalysisResult> {
  return Promise.resolve().then(() => {
    const quality = computeQualityScore(sequence, patient.heightCm);
    const events = detectGaitEvents(sequence);

    validateEventsForAnalysis(events);

    const spatiotemporal = computeSpatiotemporal(sequence, events, patient);
    const kinematics = computeKinematicMetrics(sequence, events);
    const symmetry = computeSymmetryMetrics(spatiotemporal, kinematics);
    validateFiniteMetrics(spatiotemporal, symmetry.overallAsymmetryScore);

    return {
      assessmentId: createAssessmentId(sequence, patient),
      patientId: patient.id,
      testType: '10MWT',
      performedAt: sequence.capturedAt,
      quality,
      spatiotemporal,
      kinematics,
      symmetry,
      events,
      confidenceFlags: createConfidenceFlags(quality.warnings),
    };
  });
}

/** Ensure detected events support stride, stance, and symmetry metrics. */
function validateEventsForAnalysis(events: GaitAnalysisResult['events']): void {
  const heelStrikes = events.filter((event) => event.type === 'heel_strike');
  const toeOffs = events.filter((event) => event.type === 'toe_off');

  if (heelStrikes.length < 4) {
    throw new Error('At least four heel-strike events are required for gait analysis.');
  }

  for (const side of ['left', 'right'] as const) {
    const sideHeelStrikes = heelStrikes.filter((event) => event.side === side);
    const sideToeOffs = toeOffs.filter((event) => event.side === side);

    if (sideHeelStrikes.length < 2) {
      throw new Error(`At least two ${side} heel-strike events are required.`);
    }

    const hasToeOffWithinStride = sideHeelStrikes.some((heelStrike, index) => {
      const nextHeelStrike = sideHeelStrikes[index + 1];

      if (!nextHeelStrike) {
        return false;
      }

      return sideToeOffs.some(
        (toeOff) =>
          toeOff.timestampMs > heelStrike.timestampMs &&
          toeOff.timestampMs < nextHeelStrike.timestampMs,
      );
    });

    if (!hasToeOffWithinStride) {
      throw new Error(`At least one ${side} toe-off event within a stride is required.`);
    }
  }
}

/** Reject non-finite numeric metrics before the UI can render misleading results. */
function validateFiniteMetrics(
  spatiotemporal: GaitAnalysisResult['spatiotemporal'],
  overallAsymmetryScore: number,
): void {
  const metricEntries = Object.entries(spatiotemporal);

  for (const [name, value] of metricEntries) {
    if (!Number.isFinite(value)) {
      throw new Error(`Gait metric ${name} is not finite.`);
    }
  }

  if (!Number.isFinite(overallAsymmetryScore)) {
    throw new Error('Overall asymmetry score is not finite.');
  }
}

/** Creates a deterministic assessment identifier for local-only analysis. */
function createAssessmentId(sequence: PoseSequence, patient: Patient): string {
  const capturedAtMs = Date.parse(sequence.capturedAt);
  const timestampPart = Number.isFinite(capturedAtMs)
    ? String(capturedAtMs)
    : String(sequence.frames.length);
  const uniquePart = globalThis.crypto.randomUUID();

  return `${patient.id}-${timestampPart}-${uniquePart}`;
}

/** Converts human-readable quality warnings into machine-readable flags. */
function createConfidenceFlags(warnings: string[]): string[] {
  return warnings.map((warning) =>
    warning
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, ''),
  );
}
