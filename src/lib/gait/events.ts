import { LANDMARK } from '@/lib/pose/landmarks';
import { findPeaks, lowPassFilter } from '@/lib/utils/math';
import type { GaitEvent, GaitSide } from '@/types/gait';
import type { PoseFrame, PoseSequence } from '@/types/pose';

const HEEL_STRIKE_MIN_PROMINENCE = 0.001;
const TOE_OFF_MIN_DELAY_SEC = 0.12;

/** Detect heel-strike and toe-off events from a pose sequence. */
export function detectGaitEvents(seq: PoseSequence): GaitEvent[] {
  if (seq.frames.length === 0) {
    return [];
  }

  if (!Number.isFinite(seq.fps) || seq.fps <= 0) {
    throw new Error('PoseSequence fps must be greater than 0.');
  }

  const events: GaitEvent[] = [];

  for (const side of ['left', 'right'] as const) {
    events.push(...detectSideEvents(seq, side));
  }

  return events.sort((a, b) => {
    if (a.timestampMs !== b.timestampMs) {
      return a.timestampMs - b.timestampMs;
    }

    return a.side.localeCompare(b.side);
  });
}

/** Detect all gait events for one side. */
function detectSideEvents(seq: PoseSequence, side: GaitSide): GaitEvent[] {
  const heelIndex = side === 'left' ? LANDMARK.LEFT_HEEL : LANDMARK.RIGHT_HEEL;
  const toeIndex =
    side === 'left' ? LANDMARK.LEFT_FOOT_INDEX : LANDMARK.RIGHT_FOOT_INDEX;
  const minDistance = Math.max(1, Math.floor(seq.fps * 0.4));
  const heelY = extractImageY(seq.frames, heelIndex);
  const toeY = extractImageY(seq.frames, toeIndex);
  const heelYFiltered = lowPassFilter(heelY, 6, seq.fps);
  const toeYFiltered = lowPassFilter(toeY, 6, seq.fps);
  const heelStrikeFrames = findPeaks(
    heelYFiltered,
    HEEL_STRIKE_MIN_PROMINENCE,
    minDistance,
  );
  const heelStrikes = heelStrikeFrames.map((frameIndex) =>
    createEvent(seq, side, 'heel_strike', frameIndex),
  );
  const toeOffs = detectToeOffs(seq, side, toeYFiltered, heelStrikeFrames);

  return [...heelStrikes, ...toeOffs];
}

/** Extract an image-space y trajectory for one landmark. */
function extractImageY(
  frames: PoseFrame[],
  landmarkIndex: number,
): number[] {
  const rawSignal = frames.map((frame) => {
    const landmark = frame.landmarks[landmarkIndex];

    if (landmark === undefined) {
      return Number.NaN;
    }

    return landmark.y;
  });

  return fillMissingSamples(rawSignal);
}

/** Linearly fills missing samples so isolated dropped landmarks do not crash analysis. */
function fillMissingSamples(signal: number[]): number[] {
  const finiteEntries = signal
    .map((value, index) => ({ index, value }))
    .filter((entry) => Number.isFinite(entry.value));

  if (finiteEntries.length === 0) {
    return signal.map(() => 0);
  }

  return signal.map((value, index) => {
    if (Number.isFinite(value)) {
      return value;
    }

    const previous = findPreviousFinite(finiteEntries, index);
    const next = findNextFinite(finiteEntries, index);

    if (previous && next) {
      const fraction = (index - previous.index) / (next.index - previous.index);
      return previous.value + (next.value - previous.value) * fraction;
    }

    return previous?.value ?? next?.value ?? 0;
  });
}

/** Finds the nearest finite sample before an index. */
function findPreviousFinite(
  entries: { index: number; value: number }[],
  index: number,
): { index: number; value: number } | undefined {
  return entries.findLast((entry) => entry.index < index);
}

/** Finds the nearest finite sample after an index. */
function findNextFinite(
  entries: { index: number; value: number }[],
  index: number,
): { index: number; value: number } | undefined {
  return entries.find((entry) => entry.index > index);
}

/** Detect toe-off derivative zero crossings after heel strikes. */
function detectToeOffs(
  seq: PoseSequence,
  side: GaitSide,
  toeYFiltered: number[],
  heelStrikeFrames: number[],
): GaitEvent[] {
  if (heelStrikeFrames.length === 0) {
    return [];
  }

  const toeVelocity = derivative(toeYFiltered, 1 / seq.fps);
  const minDelayFrames = Math.max(
    1,
    Math.floor(seq.fps * TOE_OFF_MIN_DELAY_SEC),
  );
  const events: GaitEvent[] = [];

  for (let index = 0; index < heelStrikeFrames.length; index += 1) {
    const heelStrikeFrame = heelStrikeFrames[index];

    if (heelStrikeFrame === undefined) {
      continue;
    }

    const nextHeelStrikeFrame =
      heelStrikeFrames[index + 1] ?? seq.frames.length - 1;
    const searchStart = heelStrikeFrame + minDelayFrames;
    const searchEnd = Math.max(searchStart, nextHeelStrikeFrame - 1);
  const toeOffFrame = findFirstPositiveToNegativeCrossing(
      toeVelocity,
      searchStart,
      searchEnd,
    );

    if (toeOffFrame !== null) {
      events.push(createEvent(seq, side, 'toe_off', toeOffFrame));
    }
  }

  return events;
}

/** Find the first derivative crossing from positive to non-positive. */
function findFirstPositiveToNegativeCrossing(
  signal: number[],
  startFrame: number,
  endFrame: number,
): number | null {
  const boundedStart = Math.max(1, startFrame);
  const boundedEnd = Math.min(signal.length - 1, endFrame);

  for (
    let frameIndex = boundedStart;
    frameIndex <= boundedEnd;
    frameIndex += 1
  ) {
    const previous = signal[frameIndex - 1];
    const current = signal[frameIndex];

    if (previous === undefined || current === undefined) {
      continue;
    }

    if (previous > 0 && current <= 0) {
      return frameIndex;
    }
  }

  return null;
}

/** Create a typed gait event from a frame index. */
function createEvent(
  seq: PoseSequence,
  side: GaitSide,
  type: GaitEvent['type'],
  frameIndex: number,
): GaitEvent {
  const frame = seq.frames[frameIndex];

  if (frame === undefined) {
    throw new Error(
      `Frame ${String(frameIndex)} is outside the pose sequence.`,
    );
  }

  return {
    frameIndex,
    side,
    timestampMs: frame.timestamp,
    type,
  };
}

/** Compute first derivative for equally sampled signals. */
function derivative(signal: number[], dt: number): number[] {
  const output = [0];

  for (let index = 1; index < signal.length; index += 1) {
    const current = signal[index];
    const previous = signal[index - 1];

    if (current === undefined || previous === undefined) {
      throw new Error('Unexpected missing signal sample.');
    }

    output.push((current - previous) / dt);
  }

  return output;
}
