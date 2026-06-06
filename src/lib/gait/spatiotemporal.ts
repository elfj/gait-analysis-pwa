import { LANDMARK } from '../pose/landmarks';
import type { GaitEvent, SpatiotemporalMetrics } from '../../types/gait';
import type { Patient } from '../../types/patient';
import type { Landmark3D, PoseFrame, PoseSequence } from '../../types/pose';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60000;

/**
 * Computes clinically interpretable temporal and spatial walking metrics from
 * a pose sequence and detected gait events.
 */
export function computeSpatiotemporal(
  seq: PoseSequence,
  events: GaitEvent[],
  patient: Patient,
): SpatiotemporalMetrics {
  validateInputs(seq, patient);

  const heelStrikes = events
    .filter((event) => event.type === 'heel_strike')
    .sort((a, b) => a.timestampMs - b.timestampMs);

  if (heelStrikes.length === 0) {
    throw new Error('At least one heel-strike event is required.');
  }

  const cadence = heelStrikes.length / (seq.durationMs / MS_PER_MINUTE);
  const strideTimesLeft = computeStrideIntervalsSeconds(heelStrikes, 'left');
  const strideTimesRight = computeStrideIntervalsSeconds(heelStrikes, 'right');
  const allStrideTimes = [...strideTimesLeft, ...strideTimesRight];
  const strideTimeMean = meanOrNaN(allStrideTimes);
  const strideTimeCV = coefficientOfVariationPct(allStrideTimes);
  const stepLengthLeft = computeMeanStepLength(seq, heelStrikes, 'left', patient);
  const stepLengthRight = computeMeanStepLength(seq, heelStrikes, 'right', patient);
  const gaitSpeed = ((stepLengthLeft + stepLengthRight) / 2) * (cadence / 60);
  const stancePhasePctLeft = computeStancePhasePct(events, 'left');
  const stancePhasePctRight = computeStancePhasePct(events, 'right');
  const doubleSupportPct = computeDoubleSupportPct(events, seq.durationMs);
  const stepWidth = computeStepWidth(seq, heelStrikes, patient);

  return {
    cadence,
    gaitSpeed,
    strideTimeMean,
    strideTimeCV,
    stepLengthLeft,
    stepLengthRight,
    stepWidth,
    stancePhasePctLeft,
    stancePhasePctRight,
    doubleSupportPct,
  };
}

/** Validates required sequence and anthropometric inputs. */
function validateInputs(seq: PoseSequence, patient: Patient): void {
  if (seq.durationMs <= 0) {
    throw new Error('Pose sequence duration must be positive.');
  }

  if (seq.frames.length === 0) {
    throw new Error('Pose sequence must contain at least one frame.');
  }

  if (patient.heightCm <= 0) {
    throw new Error('Patient height must be positive.');
  }
}

/** Returns same-side heel-strike intervals in seconds. */
function computeStrideIntervalsSeconds(
  heelStrikes: GaitEvent[],
  side: 'left' | 'right',
): number[] {
  const sideHeelStrikes = heelStrikes.filter((event) => event.side === side);
  const intervals: number[] = [];

  for (let index = 1; index < sideHeelStrikes.length; index += 1) {
    const current = sideHeelStrikes[index];
    const previous = sideHeelStrikes[index - 1];

    if (!current || !previous) {
      continue;
    }

    intervals.push((current.timestampMs - previous.timestampMs) / MS_PER_SECOND);
  }

  return intervals;
}

/** Computes the mean step length for the specified landing side. */
function computeMeanStepLength(
  seq: PoseSequence,
  heelStrikes: GaitEvent[],
  side: 'left' | 'right',
  patient: Patient,
): number {
  const sideHeelStrikes = heelStrikes.filter((event) => event.side === side);
  const lengths = sideHeelStrikes
    .map((event) => computeStepLengthAtHeelStrike(seq, event, patient))
    .filter(Number.isFinite);

  return meanOrNaN(lengths);
}

/** Measures sagittal ankle separation at a heel-strike event. */
function computeStepLengthAtHeelStrike(
  seq: PoseSequence,
  event: GaitEvent,
  patient: Patient,
): number {
  const frame = getFrame(seq, event.frameIndex);
  const landingIndex = event.side === 'left' ? LANDMARK.LEFT_ANKLE : LANDMARK.RIGHT_ANKLE;
  const oppositeIndex = event.side === 'left' ? LANDMARK.RIGHT_ANKLE : LANDMARK.LEFT_ANKLE;
  const landing = getMetricLandmark(frame, landingIndex, patient);
  const opposite = getMetricLandmark(frame, oppositeIndex, patient);
  const axis = hasWorldLandmarks(frame) ? 'z' : 'x';

  return Math.abs(landing[axis] - opposite[axis]);
}

/** Estimates stance phase as heel-strike to toe-off over the same-side stride. */
function computeStancePhasePct(events: GaitEvent[], side: 'left' | 'right'): number {
  const sideEvents = events
    .filter((event) => event.side === side)
    .sort((a, b) => a.timestampMs - b.timestampMs);
  const heelStrikes = sideEvents.filter((event) => event.type === 'heel_strike');
  const stancePercentages: number[] = [];

  for (let index = 0; index < heelStrikes.length - 1; index += 1) {
    const currentHeelStrike = heelStrikes[index];
    const nextHeelStrike = heelStrikes[index + 1];

    if (!currentHeelStrike || !nextHeelStrike) {
      continue;
    }

    const toeOff = sideEvents.find(
      (event) =>
        event.type === 'toe_off' &&
        event.timestampMs > currentHeelStrike.timestampMs &&
        event.timestampMs < nextHeelStrike.timestampMs,
    );

    if (!toeOff) {
      continue;
    }

    const stanceMs = toeOff.timestampMs - currentHeelStrike.timestampMs;
    const strideMs = nextHeelStrike.timestampMs - currentHeelStrike.timestampMs;
    stancePercentages.push((stanceMs / strideMs) * 100);
  }

  return meanOrNaN(stancePercentages);
}

/** Computes the percentage of recording time where both feet are in stance. */
function computeDoubleSupportPct(events: GaitEvent[], durationMs: number): number {
  const leftStance = computeStanceIntervals(events, 'left');
  const rightStance = computeStanceIntervals(events, 'right');
  let overlapMs = 0;

  for (const left of leftStance) {
    for (const right of rightStance) {
      overlapMs += intervalOverlap(left, right);
    }
  }

  return (overlapMs / durationMs) * 100;
}

/** Builds heel-strike to toe-off stance intervals for one side. */
function computeStanceIntervals(events: GaitEvent[], side: 'left' | 'right'): [number, number][] {
  const sideEvents = events
    .filter((event) => event.side === side)
    .sort((a, b) => a.timestampMs - b.timestampMs);
  const heelStrikes = sideEvents.filter((event) => event.type === 'heel_strike');
  const intervals: [number, number][] = [];

  for (let index = 0; index < heelStrikes.length - 1; index += 1) {
    const heelStrike = heelStrikes[index];
    const nextHeelStrike = heelStrikes[index + 1];

    if (!heelStrike || !nextHeelStrike) {
      continue;
    }

    const toeOff = sideEvents.find(
      (candidate) =>
        candidate.type === 'toe_off' &&
        candidate.timestampMs > heelStrike.timestampMs &&
        candidate.timestampMs < nextHeelStrike.timestampMs,
    );

    if (toeOff) {
      intervals.push([heelStrike.timestampMs, toeOff.timestampMs]);
    }
  }

  return intervals;
}

/** Returns the overlap duration between two time intervals in milliseconds. */
function intervalOverlap(first: [number, number], second: [number, number]): number {
  const start = Math.max(first[0], second[0]);
  const end = Math.min(first[1], second[1]);

  return Math.max(0, end - start);
}

/** Computes mean lateral ankle separation at heel strikes. */
function computeStepWidth(
  seq: PoseSequence,
  heelStrikes: GaitEvent[],
  patient: Patient,
): number {
  const widths = heelStrikes.map((event) => {
    const frame = getFrame(seq, event.frameIndex);
    const left = getMetricLandmark(frame, LANDMARK.LEFT_ANKLE, patient);
    const right = getMetricLandmark(frame, LANDMARK.RIGHT_ANKLE, patient);
    const axis = hasWorldLandmarks(frame) ? 'x' : 'z';

    return Math.abs(left[axis] - right[axis]);
  });

  return meanOrNaN(widths);
}

/** Returns true when metric MediaPipe world landmarks are available. */
function hasWorldLandmarks(frame: PoseFrame): boolean {
  return frame.worldLandmarks !== undefined;
}

/** Returns a frame by clamped index so event boundaries remain safe. */
function getFrame(seq: PoseSequence, frameIndex: number): PoseFrame {
  const clampedIndex = Math.max(0, Math.min(seq.frames.length - 1, frameIndex));
  const frame = seq.frames[clampedIndex];

  if (!frame) {
    throw new Error('Pose sequence frame index is out of range.');
  }

  return frame;
}

/** Returns landmarks in meters, preferring MediaPipe world coordinates. */
function getMetricLandmark(frame: PoseFrame, landmarkIndex: number, patient: Patient): Landmark3D {
  const worldLandmark = frame.worldLandmarks?.[landmarkIndex];

  if (worldLandmark) {
    return worldLandmark;
  }

  const normalizedLandmark = frame.landmarks[landmarkIndex];

  if (!normalizedLandmark) {
    throw new Error(`Landmark index ${String(landmarkIndex)} is missing.`);
  }

  const heightMeters = patient.heightCm / 100;

  return {
    x: normalizedLandmark.x * heightMeters,
    y: normalizedLandmark.y * heightMeters,
    z: normalizedLandmark.z * heightMeters,
    visibility: normalizedLandmark.visibility,
  };
}

/** Computes arithmetic mean or NaN when no valid values are available. */
function meanOrNaN(values: number[]): number {
  const validValues = values.filter(Number.isFinite);

  if (validValues.length === 0) {
    return Number.NaN;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

/** Computes coefficient of variation as a percentage. */
function coefficientOfVariationPct(values: number[]): number {
  const validValues = values.filter(Number.isFinite);
  const mean = meanOrNaN(validValues);

  if (!Number.isFinite(mean) || mean === 0 || validValues.length < 2) {
    return Number.NaN;
  }

  const variance =
    validValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (validValues.length - 1);

  return (Math.sqrt(variance) / mean) * 100;
}
