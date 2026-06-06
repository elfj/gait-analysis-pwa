import { describe, expect, it } from 'vitest';
import { computeQualityScore } from '@/lib/pose/qc';
import { LANDMARK } from '@/types/pose';
import type { Landmark3D, PoseFrame, PoseSequence } from '@/types/pose';

const fps = 30;
const frameCount = 180;

/** Create a valid MediaPipe landmark for quality tests. */
function createLandmark(overrides: Partial<Landmark3D> = {}): Landmark3D {
  return {
    visibility: 0.95,
    x: 0.5,
    y: 0.5,
    z: 0,
    ...overrides,
  };
}

/** Build 33 landmarks with alternating ankle peaks to mimic walking. */
function createWalkingLandmarks(frameIndex: number): Landmark3D[] {
  const landmarks = Array.from({ length: 33 }, () => createLandmark());
  const leftPeak = frameIndex % 30 === 7;
  const rightPeak = frameIndex % 30 === 22;

  landmarks[LANDMARK.LEFT_SHOULDER] = createLandmark({ x: 0.45, y: 0.25 });
  landmarks[LANDMARK.RIGHT_SHOULDER] = createLandmark({ x: 0.55, y: 0.25 });
  landmarks[LANDMARK.LEFT_HIP] = createLandmark({ x: 0.45, y: 0.5 });
  landmarks[LANDMARK.RIGHT_HIP] = createLandmark({ x: 0.55, y: 0.5 });
  landmarks[LANDMARK.LEFT_ANKLE] = createLandmark({
    x: 0.42,
    y: leftPeak ? 0.8 : 0.7,
  });
  landmarks[LANDMARK.RIGHT_ANKLE] = createLandmark({
    x: 0.58,
    y: rightPeak ? 0.8 : 0.7,
  });

  return landmarks;
}

/** Create a synthetic pose sequence for QC tests. */
function createPoseSequence(
  frameFactory: (frameIndex: number) => Landmark3D[],
): PoseSequence {
  const frames: PoseFrame[] = Array.from(
    { length: frameCount },
    (_, index) => ({
      landmarks: frameFactory(index),
      timestamp: (index / fps) * 1000,
    }),
  );

  return {
    capturedAt: '2026-06-06T00:00:00.000Z',
    durationMs: 6_000,
    fps,
    frames,
  };
}

describe('computeQualityScore', () => {
  it('passes a complete sequence with enough detected steps', () => {
    const sequence = createPoseSequence(createWalkingLandmarks);
    const quality = computeQualityScore(sequence, 170);

    expect(quality.passed).toBe(true);
    expect(quality.detectionRate).toBe(100);
    expect(quality.meanConfidence).toBeCloseTo(0.95);
    expect(quality.occlusionRate).toBe(0);
    expect(quality.stepCount).toBeGreaterThanOrEqual(6);
    expect(quality.warnings).toEqual([]);
  });

  it('fails when half of landmark frames are missing', () => {
    const sequence = createPoseSequence((frameIndex) =>
      frameIndex % 2 === 0 ? createWalkingLandmarks(frameIndex) : [],
    );
    const quality = computeQualityScore(sequence, 170);

    expect(quality.passed).toBe(false);
    expect(quality.detectionRate).toBe(50);
    expect(quality.occlusionRate).toBe(50);
    expect(quality.warnings).toContain('Pose detection rate is below 90%.');
    expect(quality.warnings).toContain(
      'Shoulders, hips, or ankles are frequently occluded.',
    );
  });

  it('fails short recordings with too few steps', () => {
    const sequence: PoseSequence = {
      ...createPoseSequence(createWalkingLandmarks),
      durationMs: 4_000,
      frames: createPoseSequence(createWalkingLandmarks).frames.slice(0, 60),
    };
    const quality = computeQualityScore(sequence, 170);

    expect(quality.passed).toBe(false);
    expect(quality.warnings).toContain('Recording is shorter than 5 seconds.');
    expect(quality.warnings).toContain(
      'Fewer than 6 walking steps were detected.',
    );
  });
});
