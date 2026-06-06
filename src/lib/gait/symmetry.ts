import type {
  KinematicMetrics,
  SpatiotemporalMetrics,
  SymmetryMetrics,
} from '../../types/gait';

/**
 * Computes Robinson Symmetry Index in percent.
 *
 * SI = |L - R| / (0.5 * (L + R)) * 100
 */
export function symmetryIndex(left: number, right: number): number {
  validateNonNegativeFinite(left, 'left');
  validateNonNegativeFinite(right, 'right');

  if (left + right === 0) {
    return 0;
  }

  return (Math.abs(left - right) / (0.5 * (left + right))) * 100;
}

/**
 * Computes bilateral gait symmetry metrics from spatiotemporal and kinematic
 * summaries. Lower values indicate more symmetric gait.
 */
export function computeSymmetryMetrics(
  st: SpatiotemporalMetrics,
  kin: KinematicMetrics,
): SymmetryMetrics {
  const stepLengthSI = symmetryIndex(st.stepLengthLeft, st.stepLengthRight);
  const stanceTimeSI = symmetryIndex(st.stancePhasePctLeft, st.stancePhasePctRight);
  const swingTimeSI = symmetryIndex(
    100 - st.stancePhasePctLeft,
    100 - st.stancePhasePctRight,
  );
  const kneeFlexionSI = symmetryIndex(
    kin.kneeFlexionRange.left,
    kin.kneeFlexionRange.right,
  );
  const overallAsymmetryScore =
    stepLengthSI * 0.3 +
    stanceTimeSI * 0.3 +
    swingTimeSI * 0.2 +
    kneeFlexionSI * 0.2;

  return {
    stepLengthSI,
    stanceTimeSI,
    swingTimeSI,
    kneeFlexionSI,
    overallAsymmetryScore,
  };
}

/** Throws when a symmetry input cannot produce a valid clinical score. */
function validateNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative finite number.`);
  }
}
