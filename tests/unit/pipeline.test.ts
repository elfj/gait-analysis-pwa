import { describe, expect, it } from 'vitest';

import { analyzeGait } from '../../src/lib/gait/pipeline';
import { LANDMARK } from '../../src/types/pose';
import type { Patient } from '../../src/types/patient';
import type { Landmark3D, PoseFrame, PoseSequence } from '../../src/types/pose';

const FPS = 30;
const FRAME_COUNT = 180;
const DURATION_MS = 6000;

const patient: Patient = {
  id: 'patient-pipeline',
  birthYear: 1985,
  sex: 'F',
  heightCm: 168,
  diagnosis: 'healthy',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('analyzeGait', () => {
  it('returns a complete gait analysis result in under five seconds', async () => {
    const sequence = createPipelineSequence();
    const startedAt = performance.now();

    const result = await analyzeGait(sequence, patient);
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(5000);
    expect(result.assessmentId).toBe('patient-pipeline-1767225600000');
    expect(result.patientId).toBe(patient.id);
    expect(result.testType).toBe('10MWT');
    expect(result.quality.passed).toBe(true);
    expect(result.events.filter((event) => event.type === 'heel_strike').length).toBeGreaterThan(6);
    expect(result.spatiotemporal.cadence).toBeGreaterThanOrEqual(90);
    expect(result.spatiotemporal.cadence).toBeLessThanOrEqual(130);
    expect(result.spatiotemporal.gaitSpeed).toBeGreaterThan(1);
    expect(result.kinematics.cyclePlots.kneeLeft).toHaveLength(101);
    expect(result.symmetry.overallAsymmetryScore).toBeLessThan(15);
    expect(result.confidenceFlags).toEqual([]);
  });

  it('throws when events are insufficient for analysis', async () => {
    const shortSequence = {
      ...createPipelineSequence(),
      frames: createPipelineSequence().frames.slice(0, 10),
      durationMs: 333,
    };

    await expect(analyzeGait(shortSequence, patient)).rejects.toThrow(
      'At least two heel-strike events are required for gait analysis.',
    );
  });
});

/** Creates a deterministic pose sequence that exercises the full pipeline. */
function createPipelineSequence(): PoseSequence {
  const frames: PoseFrame[] = [];

  for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex += 1) {
    const phase = (2 * Math.PI * frameIndex) / FPS;
    const landmarks = createLandmarks();
    const worldLandmarks = createLandmarks();

    setLowerLimb(landmarks, 'left', -0.15, 18 + 8 * Math.sin(phase), 35 + 18 * Math.sin(phase));
    setLowerLimb(
      landmarks,
      'right',
      0.15,
      18 + 8 * Math.sin(phase + Math.PI),
      35 + 18 * Math.sin(phase + Math.PI),
    );
    setLowerLimb(worldLandmarks, 'left', -0.15, 18 + 8 * Math.sin(phase), 35 + 18 * Math.sin(phase));
    setLowerLimb(
      worldLandmarks,
      'right',
      0.15,
      18 + 8 * Math.sin(phase + Math.PI),
      35 + 18 * Math.sin(phase + Math.PI),
    );
    setStepTrajectory(worldLandmarks, phase);
    setCaptureSignals(landmarks, phase, frameIndex);

    frames.push({
      timestamp: (frameIndex / FPS) * 1000,
      landmarks,
      worldLandmarks,
    });
  }

  return {
    fps: FPS,
    durationMs: DURATION_MS,
    frames,
    capturedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** Creates a complete landmark array with visible neutral points. */
function createLandmarks(): Landmark3D[] {
  return Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 0.95,
  }));
}

/** Places lower-limb landmarks for one body side. */
function setLowerLimb(
  landmarks: Landmark3D[],
  side: 'left' | 'right',
  xOffset: number,
  hipFlexionDeg: number,
  kneeFlexionDeg: number,
): void {
  const indices = getSideIndices(side);
  const hip = point(xOffset, 0.3, 0);
  const shoulder = point(xOffset, -0.5, 0);
  const knee = add(hip, {
    x: 0.45 * Math.sin(toRadians(hipFlexionDeg)),
    y: 0.45 * Math.cos(toRadians(hipFlexionDeg)),
    z: 0,
  });
  const kneeToHip = subtract(hip, knee);
  const kneeToAnkle = rotate2d(kneeToHip, 180 - kneeFlexionDeg);
  const ankle = add(knee, kneeToAnkle);
  const ankleToKnee = subtract(knee, ankle);
  const ankleToFoot = rotate2d(ankleToKnee, -96);
  const foot = add(ankle, scale(ankleToFoot, 0.25));

  landmarks[indices.shoulder] = toLandmark(shoulder);
  landmarks[indices.hip] = toLandmark(hip);
  landmarks[indices.knee] = toLandmark(knee);
  landmarks[indices.ankle] = toLandmark(ankle);
  landmarks[indices.foot] = toLandmark(foot);
}

/** Sets metric ankle positions used by spatiotemporal calculations. */
function setStepTrajectory(worldLandmarks: Landmark3D[], phase: number): void {
  const halfStepLength = 0.325 * Math.cos(phase);
  const leftAnkle = worldLandmarks[LANDMARK.LEFT_ANKLE];
  const rightAnkle = worldLandmarks[LANDMARK.RIGHT_ANKLE];

  if (!leftAnkle || !rightAnkle) {
    throw new Error('Ankle landmarks are missing.');
  }

  worldLandmarks[LANDMARK.LEFT_ANKLE] = {
    ...leftAnkle,
    x: halfStepLength,
    z: 0.06,
  };
  worldLandmarks[LANDMARK.RIGHT_ANKLE] = {
    ...rightAnkle,
    x: -halfStepLength,
    z: -0.06,
  };
}

/** Sets image-space oscillations used by event detection and quality scoring. */
function setCaptureSignals(
  landmarks: Landmark3D[],
  phase: number,
  frameIndex: number,
): void {
  const isLeftContact = frameIndex % FPS === 0;
  const isRightContact = frameIndex % FPS === FPS / 2;

  setLandmarkY(landmarks, LANDMARK.LEFT_HEEL, isLeftContact ? 0.45 : 0.6);
  setLandmarkY(landmarks, LANDMARK.RIGHT_HEEL, isRightContact ? 0.45 : 0.6);
  setLandmarkY(landmarks, LANDMARK.LEFT_ANKLE, isLeftContact ? 0.75 : 0.65);
  setLandmarkY(landmarks, LANDMARK.RIGHT_ANKLE, isRightContact ? 0.75 : 0.65);
  setLandmarkY(landmarks, LANDMARK.LEFT_FOOT_INDEX, 0.68 + 0.03 * Math.sin(phase));
  setLandmarkY(landmarks, LANDMARK.RIGHT_FOOT_INDEX, 0.68 + 0.03 * Math.sin(phase + Math.PI));
}

/** Updates one landmark y coordinate while preserving other fields. */
function setLandmarkY(landmarks: Landmark3D[], landmarkIndex: number, y: number): void {
  const landmark = landmarks[landmarkIndex];

  if (!landmark) {
    throw new Error(`Landmark index ${String(landmarkIndex)} is missing.`);
  }

  landmarks[landmarkIndex] = {
    ...landmark,
    y,
  };
}

/** Returns MediaPipe landmark indices for one side. */
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

/** Converts degrees to radians. */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Creates a 3D point. */
function point(x: number, y: number, z: number): { x: number; y: number; z: number } {
  return { x, y, z };
}

/** Converts a point to a landmark. */
function toLandmark(input: { x: number; y: number; z: number }): Landmark3D {
  return {
    ...input,
    visibility: 0.95,
  };
}

/** Adds two point vectors. */
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

/** Subtracts two point vectors. */
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
