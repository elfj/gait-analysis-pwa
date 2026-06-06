import { describe, expect, it } from 'vitest';

import {
  computeJointAngles,
  computeKinematicMetrics,
  normalizeToGaitCycle,
} from '../../src/lib/gait/kinematics';
import { LANDMARK } from '../../src/types/pose';
import type { GaitEvent } from '../../src/types/gait';
import type { Landmark3D, PoseFrame, PoseSequence } from '../../src/types/pose';

const FPS = 30;
const FRAME_COUNT = 150;

describe('joint kinematics', () => {
  it('computes knee flexion peak in the expected 50-70 degree range', () => {
    const seq = createKinematicSequence();

    const angles = computeJointAngles(seq);

    expect(Math.max(...angles.kneeLeft)).toBeGreaterThanOrEqual(50);
    expect(Math.max(...angles.kneeLeft)).toBeLessThanOrEqual(70);
    expect(Math.max(...angles.kneeRight)).toBeGreaterThanOrEqual(50);
    expect(Math.max(...angles.kneeRight)).toBeLessThanOrEqual(70);
    expect(angles.hipLeft).toHaveLength(FRAME_COUNT);
    expect(angles.ankleRight).toHaveLength(FRAME_COUNT);
  });

  it('computes kinematic ranges and normalized gait-cycle curves', () => {
    const seq = createKinematicSequence();
    const events = createHeelStrikeEvents();

    const metrics = computeKinematicMetrics(seq, events);

    expect(metrics.kneeFlexionRange.left).toBeGreaterThan(45);
    expect(metrics.kneeFlexionRange.left).toBeLessThan(55);
    expect(metrics.kneeFlexionRange.right).toBeGreaterThan(40);
    expect(metrics.kneeFlexionRange.right).toBeLessThan(55);
    expect(metrics.hipFlexionRange.left).toBeGreaterThan(15);
    expect(metrics.ankleRange.left).toBeGreaterThan(5);
    expect(metrics.trunkLean).toBeLessThan(1);
    expect(metrics.cyclePlots.kneeLeft).toHaveLength(101);
    expect(metrics.cyclePlots.kneeRight).toHaveLength(101);
    expect(metrics.cyclePlots.kneeLeft.every(Number.isFinite)).toBe(true);
  });

  it('normalizes a simple signal to 101 gait-cycle samples', () => {
    const signal = Array.from({ length: 101 }, (_, index) => index);
    const events: GaitEvent[] = [
      createEvent('left', 0),
      createEvent('left', 50),
      createEvent('left', 100),
    ];

    const cycle = normalizeToGaitCycle(signal, events, 'left', FPS);

    expect(cycle).toHaveLength(101);
    expect(cycle[0]).toBeCloseTo(25);
    expect(cycle[50]).toBeCloseTo(50);
    expect(cycle[100]).toBeCloseTo(75);
  });

  it('returns NaN cycle when fewer than two heel strikes are available', () => {
    const cycle = normalizeToGaitCycle([1, 2, 3], [createEvent('left', 0)], 'left', FPS);

    expect(cycle).toHaveLength(101);
    expect(cycle.every(Number.isNaN)).toBe(true);
  });
});

/** Creates deterministic lower-limb kinematics with physiologic knee flexion. */
function createKinematicSequence(): PoseSequence {
  const frames: PoseFrame[] = [];

  for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex += 1) {
    const phase = (2 * Math.PI * frameIndex) / 50;
    const leftKneeFlexion = 35 + 25 * Math.sin(phase - Math.PI / 2);
    const rightKneeFlexion = 35 + 23 * Math.sin(phase + Math.PI / 2);
    const leftHipFlexion = 15 + 10 * Math.sin(phase);
    const rightHipFlexion = 15 + 9 * Math.sin(phase + Math.PI);
    const leftAnkleDorsiflexion = 6 + 8 * Math.sin(phase);
    const rightAnkleDorsiflexion = 6 + 7 * Math.sin(phase + Math.PI);
    const landmarks = createLandmarks();

    setLowerLimb(
      landmarks,
      'left',
      -0.15,
      leftHipFlexion,
      leftKneeFlexion,
      leftAnkleDorsiflexion,
    );
    setLowerLimb(
      landmarks,
      'right',
      0.15,
      rightHipFlexion,
      rightKneeFlexion,
      rightAnkleDorsiflexion,
    );

    frames.push({
      timestamp: (frameIndex / FPS) * 1000,
      landmarks,
    });
  }

  return {
    fps: FPS,
    durationMs: (FRAME_COUNT / FPS) * 1000,
    frames,
    capturedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** Places shoulder, hip, knee, ankle, and toe landmarks for one limb. */
function setLowerLimb(
  landmarks: Landmark3D[],
  side: 'left' | 'right',
  xOffset: number,
  hipFlexionDeg: number,
  kneeFlexionDeg: number,
  ankleDorsiflexionDeg: number,
): void {
  const indices = getSideIndices(side);
  const hip = point(xOffset, 0, 0);
  const shoulder = point(xOffset, -1, 0);
  const knee = add(hip, {
    x: Math.sin(toRadians(hipFlexionDeg)),
    y: Math.cos(toRadians(hipFlexionDeg)),
    z: 0,
  });
  const kneeToHip = subtract(hip, knee);
  const kneeToAnkle = rotate2d(kneeToHip, 180 - kneeFlexionDeg);
  const ankle = add(knee, kneeToAnkle);
  const ankleToKnee = subtract(knee, ankle);
  const ankleToToe = rotate2d(ankleToKnee, -(90 + ankleDorsiflexionDeg));
  const toe = add(ankle, scale(ankleToToe, 0.45));

  landmarks[indices.shoulder] = toLandmark(shoulder);
  landmarks[indices.hip] = toLandmark(hip);
  landmarks[indices.knee] = toLandmark(knee);
  landmarks[indices.ankle] = toLandmark(ankle);
  landmarks[indices.foot] = toLandmark(toe);
}

/** Returns MediaPipe landmark indices for one body side. */
function getSideIndices(side: 'left' | 'right'): {
  shoulder: number;
  hip: number;
  knee: number;
  ankle: number;
  foot: number;
} {
  if (side === 'left') {
    return {
      shoulder: LANDMARK.LEFT_SHOULDER,
      hip: LANDMARK.LEFT_HIP,
      knee: LANDMARK.LEFT_KNEE,
      ankle: LANDMARK.LEFT_ANKLE,
      foot: LANDMARK.LEFT_FOOT_INDEX,
    };
  }

  return {
    shoulder: LANDMARK.RIGHT_SHOULDER,
    hip: LANDMARK.RIGHT_HIP,
    knee: LANDMARK.RIGHT_KNEE,
    ankle: LANDMARK.RIGHT_ANKLE,
    foot: LANDMARK.RIGHT_FOOT_INDEX,
  };
}

/** Creates neutral landmarks for a complete MediaPipe pose. */
function createLandmarks(): Landmark3D[] {
  return Array.from({ length: 33 }, () => toLandmark(point(0, 0, 0)));
}

/** Creates heel-strike events for left and right cycle normalization. */
function createHeelStrikeEvents(): GaitEvent[] {
  return [
    createEvent('left', 0),
    createEvent('right', 25),
    createEvent('left', 50),
    createEvent('right', 75),
    createEvent('left', 100),
    createEvent('right', 125),
  ];
}

/** Creates one heel-strike event at a frame. */
function createEvent(side: GaitEvent['side'], frameIndex: number): GaitEvent {
  return {
    side,
    type: 'heel_strike',
    frameIndex,
    timestampMs: (frameIndex / FPS) * 1000,
  };
}

/** Converts degrees to radians. */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Creates a 3D point. */
function point(x: number, y: number, z: number): { x: number; y: number; z: number } {
  return { x, y, z };
}

/** Converts a point to a visible landmark. */
function toLandmark(input: { x: number; y: number; z: number }): Landmark3D {
  return {
    ...input,
    visibility: 0.95,
  };
}

/** Adds two points. */
function add(
  first: { x: number; y: number; z: number },
  second: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  return {
    x: first.x + second.x,
    y: first.y + second.y,
    z: first.z + second.z,
  };
}

/** Subtracts two points. */
function subtract(
  first: { x: number; y: number; z: number },
  second: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  return {
    x: first.x - second.x,
    y: first.y - second.y,
    z: first.z - second.z,
  };
}

/** Scales a point vector. */
function scale(
  input: { x: number; y: number; z: number },
  factor: number,
): { x: number; y: number; z: number } {
  return {
    x: input.x * factor,
    y: input.y * factor,
    z: input.z * factor,
  };
}

/** Rotates a vector in the sagittal x-y plane. */
function rotate2d(
  input: { x: number; y: number; z: number },
  degrees: number,
): { x: number; y: number; z: number } {
  const radians = toRadians(degrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: input.x * cos - input.y * sin,
    y: input.x * sin + input.y * cos,
    z: input.z,
  };
}
