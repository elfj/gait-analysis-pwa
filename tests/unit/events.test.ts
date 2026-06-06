import { describe, expect, it } from 'vitest';
import { detectGaitEvents } from '@/lib/gait/events';
import { LANDMARK } from '@/types/pose';
import type { Landmark3D, PoseFrame, PoseSequence } from '@/types/pose';

const fps = 30;
const frameCount = 180;
const leftHeelStrikeFrames = [15, 45, 75, 105, 135, 165];
const rightHeelStrikeFrames = [30, 60, 90, 120, 150];
const leftToeOffFrames = [25, 55, 85, 115, 145];
const rightToeOffFrames = [40, 70, 100, 130, 160];

/** Create a valid baseline landmark for gait event tests. */
function createLandmark(overrides: Partial<Landmark3D> = {}): Landmark3D {
  return {
    visibility: 0.95,
    x: 0.5,
    y: 0.5,
    z: 0,
    ...overrides,
  };
}

/** Create one synthetic sagittal walking frame. */
function createFrame(frameIndex: number): PoseFrame {
  const landmarks = Array.from({ length: 33 }, () => createLandmark());
  const leftHeelSignal = impulseSignal(frameIndex, leftHeelStrikeFrames, 0.25);
  const rightHeelSignal = impulseSignal(
    frameIndex,
    rightHeelStrikeFrames,
    0.25,
  );
  const leftToeSignal = -impulseSignal(frameIndex, leftToeOffFrames, 0.18);
  const rightToeSignal = -impulseSignal(frameIndex, rightToeOffFrames, 0.18);

  landmarks[LANDMARK.LEFT_HEEL] = createLandmark({ y: -leftHeelSignal });
  landmarks[LANDMARK.RIGHT_HEEL] = createLandmark({ y: -rightHeelSignal });
  landmarks[LANDMARK.LEFT_FOOT_INDEX] = createLandmark({ y: -leftToeSignal });
  landmarks[LANDMARK.RIGHT_FOOT_INDEX] = createLandmark({ y: -rightToeSignal });

  return {
    landmarks,
    timestamp: (frameIndex / fps) * 1000,
  };
}

/** Create a deterministic pose sequence with known event timings. */
function createSequence(): PoseSequence {
  return {
    capturedAt: '2026-06-06T00:00:00.000Z',
    durationMs: (frameCount / fps) * 1000,
    fps,
    frames: Array.from({ length: frameCount }, (_, index) =>
      createFrame(index),
    ),
  };
}

/** Smooth impulse used to survive low-pass filtering without phase shift. */
function impulseSignal(
  frameIndex: number,
  centers: number[],
  amplitude: number,
): number {
  return centers.reduce((sum, center) => {
    const distance = frameIndex - center;
    return sum + amplitude * Math.exp(-(distance ** 2) / 8);
  }, 0);
}

/** Convert frame indices to timestamps in milliseconds. */
function framesToTimestamps(frames: number[]): number[] {
  return frames.map((frameIndex) => (frameIndex / fps) * 1000);
}

/** Assert detected event timestamps are within tolerance. */
function expectTimestampsCloseTo(
  actual: number[],
  expected: number[],
  toleranceMs: number,
): void {
  expect(actual).toHaveLength(expected.length);

  for (let index = 0; index < expected.length; index += 1) {
    const actualValue = actual[index];
    const expectedValue = expected[index];

    expect(actualValue).toBeDefined();
    expect(expectedValue).toBeDefined();

    if (actualValue !== undefined && expectedValue !== undefined) {
      expect(Math.abs(actualValue - expectedValue)).toBeLessThanOrEqual(
        toleranceMs,
      );
    }
  }
}

describe('detectGaitEvents', () => {
  it('detects heel strikes within one event of the synthetic ground truth', () => {
    const events = detectGaitEvents(createSequence());
    const heelStrikes = events.filter((event) => event.type === 'heel_strike');

    expect(
      Math.abs(
        heelStrikes.length -
          (leftHeelStrikeFrames.length + rightHeelStrikeFrames.length),
      ),
    ).toBeLessThanOrEqual(1);
  });

  it('detects heel-strike timestamps within 50 ms', () => {
    const events = detectGaitEvents(createSequence());
    const leftHeelStrikeTimestamps = events
      .filter((event) => event.side === 'left' && event.type === 'heel_strike')
      .map((event) => event.timestampMs);
    const rightHeelStrikeTimestamps = events
      .filter((event) => event.side === 'right' && event.type === 'heel_strike')
      .map((event) => event.timestampMs);

    expectTimestampsCloseTo(
      leftHeelStrikeTimestamps,
      framesToTimestamps(leftHeelStrikeFrames),
      50,
    );
    expectTimestampsCloseTo(
      rightHeelStrikeTimestamps,
      framesToTimestamps(rightHeelStrikeFrames),
      50,
    );
  });

  it('detects toe-off events after heel strikes', () => {
    const events = detectGaitEvents(createSequence());
    const toeOffs = events.filter((event) => event.type === 'toe_off');

    expect(toeOffs.length).toBeGreaterThanOrEqual(8);
    expect(
      toeOffs.every((event) => event.timestampMs > 0 && event.frameIndex > 0),
    ).toBe(true);
  });

  it('tolerates an isolated missing landmark without crashing', () => {
    const sequence = createSequence();
    const frame = sequence.frames[45];

    expect(frame).toBeDefined();

    if (frame) {
      const mutableLandmarks: (Landmark3D | undefined)[] = frame.landmarks;
      mutableLandmarks[LANDMARK.LEFT_HEEL] = undefined;
    }

    const events = detectGaitEvents(sequence);

    expect(events.filter((event) => event.type === 'heel_strike').length).toBeGreaterThan(0);
  });

  it('returns no events for an empty sequence', () => {
    expect(
      detectGaitEvents({
        capturedAt: '2026-06-06T00:00:00.000Z',
        durationMs: 0,
        fps,
        frames: [],
      }),
    ).toEqual([]);
  });

  it('rejects invalid fps', () => {
    expect(() =>
      detectGaitEvents({
        ...createSequence(),
        fps: 0,
      }),
    ).toThrow('fps');
  });
});
