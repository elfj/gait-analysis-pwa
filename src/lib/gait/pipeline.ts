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
export async function analyzeGait(
  sequence: PoseSequence,
  patient: Patient,
): Promise<GaitAnalysisResult> {
  await Promise.resolve();

  const quality = computeQualityScore(sequence, patient.heightCm);
  const events = detectGaitEvents(sequence);

  if (events.filter((event) => event.type === 'heel_strike').length < 2) {
    throw new Error('At least two heel-strike events are required for gait analysis.');
  }

  const spatiotemporal = computeSpatiotemporal(sequence, events, patient);
  const kinematics = computeKinematicMetrics(sequence, events);
  const symmetry = computeSymmetryMetrics(spatiotemporal, kinematics);

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
}

/** Creates a deterministic assessment identifier for local-only analysis. */
function createAssessmentId(sequence: PoseSequence, patient: Patient): string {
  const capturedAtMs = Date.parse(sequence.capturedAt);
  const suffix = Number.isFinite(capturedAtMs)
    ? String(capturedAtMs)
    : String(sequence.frames.length);

  return `${patient.id}-${suffix}`;
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
