import { describe, expect, it } from 'vitest';

import { computeSpatiotemporal } from '../../src/lib/gait/spatiotemporal';
import { LANDMARK } from '../../src/types/pose';
import type { GaitEvent } from '../../src/types/gait';
import type { Patient } from '../../src/types/patient';
import type { Landmark3D, PoseFrame, PoseSequence } from '../../src/types/pose';

const FPS = 30;
const FRAME_COUNT = 180;
const DURATION_MS = 6000;

const patient: Patient = {
  id: 'patient-1',
  birthYear: 1980,
  sex: 'M',
  heightCm: 170,
  diagnosis: 'healthy',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('computeSpatiotemporal', () => {
  it('computes healthy gait metrics in the expected clinical range', () => {
    const seq = createSyntheticSequence(true);
    const events = createSyntheticEvents();

    const metrics = computeSpatiotemporal(seq, events, patient);

    expect(metrics.cadence).toBeGreaterThanOrEqual(90);
    expect(metrics.cadence).toBeLessThanOrEqual(130);
    expect(metrics.gaitSpeed).toBeGreaterThanOrEqual(1.0);
    expect(metrics.gaitSpeed).toBeLessThanOrEqual(1.4);
    expect(metrics.strideTimeMean).toBeCloseTo(1.1, 1);
    expect(metrics.strideTimeCV).toBeLessThan(2);
    expect(metrics.stepLengthLeft).toBeCloseTo(0.65, 2);
    expect(metrics.stepLengthRight).toBeCloseTo(0.64, 2);
    expect(metrics.stepWidth).toBeCloseTo(0.12, 2);
    expect(metrics.stancePhasePctLeft).toBeGreaterThan(55);
    expect(metrics.stancePhasePctLeft).toBeLessThan(65);
    expect(metrics.stancePhasePctRight).toBeGreaterThan(55);
    expect(metrics.stancePhasePctRight).toBeLessThan(65);
    expect(metrics.doubleSupportPct).toBeGreaterThan(10);
    expect(metrics.doubleSupportPct).toBeLessThan(30);
  });

  it('falls back to normalized coordinates scaled by patient height', () => {
    const seq = createSyntheticSequence(false);
    const events = createSyntheticEvents();

    const metrics = computeSpatiotemporal(seq, events, patient);

    expect(metrics.stepLengthLeft).toBeCloseTo(0.68, 2);
    expect(metrics.stepLengthRight).toBeCloseTo(0.66, 2);
    expect(metrics.gaitSpeed).toBeGreaterThan(1.1);
  });

  it('rejects sequences without heel-strike events', () => {
    const seq = createSyntheticSequence(true);

    expect(() => computeSpatiotemporal(seq, [], patient)).toThrow(
      'At least one heel-strike event is required.',
    );
  });

  it('rejects invalid patient height because fallback scaling needs anthropometrics', () => {
    const seq = createSyntheticSequence(true);
    const invalidPatient = { ...patient, heightCm: 0 };

    expect(() => computeSpatiotemporal(seq, createSyntheticEvents(), invalidPatient)).toThrow(
      'Patient height must be positive.',
    );
  });
});

/** Creates a deterministic sagittal walking sequence for golden-style tests. */
function createSyntheticSequence(includeWorldLandmarks: boolean): PoseSequence {
  const leftHeelStrikes = new Set([0, 33, 66, 99, 132, 165]);
  const rightHeelStrikes = new Set([16, 49, 82, 115, 148]);
  const frames: PoseFrame[] = [];

  for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex += 1) {
    const timestamp = (frameIndex / FPS) * 1000;
    const landmarks = createLandmarks();
    const worldLandmarks = includeWorldLandmarks ? createLandmarks() : undefined;

    if (leftHeelStrikes.has(frameIndex)) {
      setAnklePositions(landmarks, 0.4, 0.0, 0.06);
      if (worldLandmarks) {
        setAnklePositions(worldLandmarks, 0.65, 0.0, 0.06);
      }
    } else if (rightHeelStrikes.has(frameIndex)) {
      setAnklePositions(landmarks, 0.0, 0.38823529411764707, 0.06);
      if (worldLandmarks) {
        setAnklePositions(worldLandmarks, 0.0, 0.64, 0.06);
      }
    } else {
      setAnklePositions(landmarks, 0.18, 0.16, 0.06);
      if (worldLandmarks) {
        setAnklePositions(worldLandmarks, 0.3, 0.25, 0.06);
      }
    }

    const frame: PoseFrame = {
      timestamp,
      landmarks,
    };

    if (worldLandmarks) {
      frame.worldLandmarks = worldLandmarks;
    }

    frames.push(frame);
  }

  return {
    fps: FPS,
    durationMs: DURATION_MS,
    frames,
    capturedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** Creates deterministic heel-strike and toe-off events for the fixture. */
function createSyntheticEvents(): GaitEvent[] {
  const leftHeelStrikes = [0, 33, 66, 99, 132, 165];
  const rightHeelStrikes = [16, 49, 82, 115, 148];
  const leftToeOffs = [20, 53, 86, 119, 152];
  const rightToeOffs = [36, 69, 102, 135, 168];
  const events: GaitEvent[] = [];

  for (const frameIndex of leftHeelStrikes) {
    events.push(createEvent('left', 'heel_strike', frameIndex));
  }

  for (const frameIndex of rightHeelStrikes) {
    events.push(createEvent('right', 'heel_strike', frameIndex));
  }

  for (const frameIndex of leftToeOffs) {
    events.push(createEvent('left', 'toe_off', frameIndex));
  }

  for (const frameIndex of rightToeOffs) {
    events.push(createEvent('right', 'toe_off', frameIndex));
  }

  return events.sort((a, b) => a.timestampMs - b.timestampMs);
}

/** Creates a single gait event from a frame index. */
function createEvent(
  side: GaitEvent['side'],
  type: GaitEvent['type'],
  frameIndex: number,
): GaitEvent {
  return {
    side,
    type,
    frameIndex,
    timestampMs: (frameIndex / FPS) * 1000,
  };
}

/** Creates a complete MediaPipe landmark array with neutral visible points. */
function createLandmarks(): Landmark3D[] {
  return Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 0.95,
  }));
}

/** Assigns left and right ankle positions for step length and width checks. */
function setAnklePositions(
  landmarks: Landmark3D[],
  leftProgression: number,
  rightProgression: number,
  halfWidth: number,
): void {
  landmarks[LANDMARK.LEFT_ANKLE] = {
    x: leftProgression,
    y: 0,
    z: halfWidth,
    visibility: 0.95,
  };
  landmarks[LANDMARK.RIGHT_ANKLE] = {
    x: rightProgression,
    y: 0,
    z: -halfWidth,
    visibility: 0.95,
  };
}
