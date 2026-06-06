import { describe, expect, it } from 'vitest';

import { computeSymmetryMetrics, symmetryIndex } from '../../src/lib/gait/symmetry';
import type { KinematicMetrics, SpatiotemporalMetrics } from '../../src/types/gait';

describe('symmetry metrics', () => {
  it('computes Robinson symmetry index for typical paired values', () => {
    expect(symmetryIndex(0.7, 0.7)).toBe(0);
    expect(symmetryIndex(0.7, 0.5)).toBeCloseTo(33.333, 3);
    expect(symmetryIndex(0, 0)).toBe(0);
  });

  it('detects clinically meaningful asymmetry above 10 percent', () => {
    const metrics = computeSymmetryMetrics(createAsymmetricSpatiotemporal(), createKinematics());

    expect(metrics.stepLengthSI).toBeGreaterThan(10);
    expect(metrics.stanceTimeSI).toBeGreaterThan(10);
    expect(metrics.swingTimeSI).toBeGreaterThan(10);
    expect(metrics.kneeFlexionSI).toBeGreaterThan(10);
    expect(metrics.overallAsymmetryScore).toBeGreaterThan(10);
  });

  it('returns low overall asymmetry for symmetric gait inputs', () => {
    const metrics = computeSymmetryMetrics(createSymmetricSpatiotemporal(), {
      ...createKinematics(),
      kneeFlexionRange: { left: 60, right: 60 },
    });

    expect(metrics.stepLengthSI).toBe(0);
    expect(metrics.stanceTimeSI).toBe(0);
    expect(metrics.swingTimeSI).toBe(0);
    expect(metrics.kneeFlexionSI).toBe(0);
    expect(metrics.overallAsymmetryScore).toBe(0);
  });

  it('rejects negative or non-finite symmetry inputs', () => {
    expect(() => symmetryIndex(-1, 1)).toThrow(
      'left must be a non-negative finite number.',
    );
    expect(() => symmetryIndex(1, Number.NaN)).toThrow(
      'right must be a non-negative finite number.',
    );
  });
});

/** Creates asymmetric spatiotemporal metrics representing hemiparetic gait. */
function createAsymmetricSpatiotemporal(): SpatiotemporalMetrics {
  return {
    cadence: 95,
    gaitSpeed: 0.85,
    strideTimeMean: 1.25,
    strideTimeCV: 4,
    stepLengthLeft: 0.68,
    stepLengthRight: 0.48,
    stepWidth: 0.14,
    stancePhasePctLeft: 58,
    stancePhasePctRight: 72,
    doubleSupportPct: 24,
  };
}

/** Creates symmetric spatiotemporal metrics for a healthy reference case. */
function createSymmetricSpatiotemporal(): SpatiotemporalMetrics {
  return {
    cadence: 110,
    gaitSpeed: 1.2,
    strideTimeMean: 1.05,
    strideTimeCV: 2,
    stepLengthLeft: 0.65,
    stepLengthRight: 0.65,
    stepWidth: 0.12,
    stancePhasePctLeft: 60,
    stancePhasePctRight: 60,
    doubleSupportPct: 18,
  };
}

/** Creates kinematic metrics with asymmetric knee flexion range. */
function createKinematics(): KinematicMetrics {
  return {
    hipFlexionRange: { left: 30, right: 28 },
    kneeFlexionRange: { left: 62, right: 45 },
    ankleRange: { left: 18, right: 15 },
    trunkLean: 3,
    cyclePlots: {
      hipLeft: createCurve(30),
      hipRight: createCurve(28),
      kneeLeft: createCurve(62),
      kneeRight: createCurve(45),
    },
  };
}

/** Creates a deterministic placeholder gait-cycle curve. */
function createCurve(value: number): number[] {
  return Array.from({ length: 101 }, () => value);
}
