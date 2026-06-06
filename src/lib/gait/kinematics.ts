import { LANDMARK } from '../pose/landmarks';
import { angleBetween3Points } from '../utils/math';
import type { GaitEvent, KinematicMetrics } from '../../types/gait';
import type { Landmark3D, PoseSequence } from '../../types/pose';

const GAIT_CYCLE_POINTS = 101;

/** Raw per-frame lower-limb joint angle signals in degrees. */
export interface JointAngleSeries {
  /** Left hip flexion signal. */
  hipLeft: number[];
  /** Right hip flexion signal. */
  hipRight: number[];
  /** Left knee flexion signal. */
  kneeLeft: number[];
  /** Right knee flexion signal. */
  kneeRight: number[];
  /** Left ankle dorsiflexion signal. */
  ankleLeft: number[];
  /** Right ankle dorsiflexion signal. */
  ankleRight: number[];
}

/**
 * Computes hip, knee, and ankle joint angle signals from every pose frame.
 */
export function computeJointAngles(seq: PoseSequence): JointAngleSeries {
  validateSequence(seq);

  const hipLeft: number[] = [];
  const hipRight: number[] = [];
  const kneeLeft: number[] = [];
  const kneeRight: number[] = [];
  const ankleLeft: number[] = [];
  const ankleRight: number[] = [];

  for (const frame of seq.frames) {
    const landmarks = frame.landmarks;

    hipLeft.push(
      180 -
        angleBetween3Points(
          getLandmark(landmarks, LANDMARK.LEFT_SHOULDER),
          getLandmark(landmarks, LANDMARK.LEFT_HIP),
          getLandmark(landmarks, LANDMARK.LEFT_KNEE),
        ),
    );
    hipRight.push(
      180 -
        angleBetween3Points(
          getLandmark(landmarks, LANDMARK.RIGHT_SHOULDER),
          getLandmark(landmarks, LANDMARK.RIGHT_HIP),
          getLandmark(landmarks, LANDMARK.RIGHT_KNEE),
        ),
    );
    kneeLeft.push(
      180 -
        angleBetween3Points(
          getLandmark(landmarks, LANDMARK.LEFT_HIP),
          getLandmark(landmarks, LANDMARK.LEFT_KNEE),
          getLandmark(landmarks, LANDMARK.LEFT_ANKLE),
        ),
    );
    kneeRight.push(
      180 -
        angleBetween3Points(
          getLandmark(landmarks, LANDMARK.RIGHT_HIP),
          getLandmark(landmarks, LANDMARK.RIGHT_KNEE),
          getLandmark(landmarks, LANDMARK.RIGHT_ANKLE),
        ),
    );
    ankleLeft.push(
      angleBetween3Points(
        getLandmark(landmarks, LANDMARK.LEFT_KNEE),
        getLandmark(landmarks, LANDMARK.LEFT_ANKLE),
        getLandmark(landmarks, LANDMARK.LEFT_FOOT_INDEX),
      ) - 90,
    );
    ankleRight.push(
      angleBetween3Points(
        getLandmark(landmarks, LANDMARK.RIGHT_KNEE),
        getLandmark(landmarks, LANDMARK.RIGHT_ANKLE),
        getLandmark(landmarks, LANDMARK.RIGHT_FOOT_INDEX),
      ) - 90,
    );
  }

  return { hipLeft, hipRight, kneeLeft, kneeRight, ankleLeft, ankleRight };
}

/**
 * Computes kinematic summary metrics and mean gait-cycle curves.
 */
export function computeKinematicMetrics(
  seq: PoseSequence,
  events: GaitEvent[],
): KinematicMetrics {
  const angles = computeJointAngles(seq);

  return {
    hipFlexionRange: {
      left: range(angles.hipLeft),
      right: range(angles.hipRight),
    },
    kneeFlexionRange: {
      left: range(angles.kneeLeft),
      right: range(angles.kneeRight),
    },
    ankleRange: {
      left: range(angles.ankleLeft),
      right: range(angles.ankleRight),
    },
    trunkLean: computeMeanTrunkLean(seq),
    cyclePlots: {
      hipLeft: normalizeToGaitCycle(angles.hipLeft, events, 'left', seq.fps),
      hipRight: normalizeToGaitCycle(angles.hipRight, events, 'right', seq.fps),
      kneeLeft: normalizeToGaitCycle(angles.kneeLeft, events, 'left', seq.fps),
      kneeRight: normalizeToGaitCycle(angles.kneeRight, events, 'right', seq.fps),
    },
  };
}

/**
 * Resamples same-side heel-strike-to-heel-strike signal slices to 101 points
 * and returns their pointwise mean gait-cycle curve.
 */
export function normalizeToGaitCycle(
  signal: number[],
  events: GaitEvent[],
  side: 'left' | 'right',
  fps: number,
): number[] {
  validateSignal(signal);

  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error('fps must be positive.');
  }

  const heelStrikes = events
    .filter((event) => event.type === 'heel_strike' && event.side === side)
    .sort((a, b) => a.frameIndex - b.frameIndex);

  if (heelStrikes.length < 2) {
    return Array.from({ length: GAIT_CYCLE_POINTS }, () => Number.NaN);
  }

  const cycles: number[][] = [];

  for (let index = 0; index < heelStrikes.length - 1; index += 1) {
    const start = heelStrikes[index];
    const end = heelStrikes[index + 1];

    if (!start || !end || end.frameIndex <= start.frameIndex) {
      continue;
    }

    const slice = signal.slice(start.frameIndex, end.frameIndex + 1);

    if (slice.length >= 2) {
      cycles.push(resampleLinear(slice, GAIT_CYCLE_POINTS));
    }
  }

  if (cycles.length === 0) {
    return Array.from({ length: GAIT_CYCLE_POINTS }, () => Number.NaN);
  }

  return Array.from({ length: GAIT_CYCLE_POINTS }, (_, pointIndex) =>
    mean(cycles.map((cycle) => getSample(cycle, pointIndex))),
  );
}

/** Resamples a signal to a fixed number of points using linear interpolation. */
function resampleLinear(signal: number[], outputLength: number): number[] {
  validateSignal(signal);

  if (!Number.isInteger(outputLength) || outputLength < 2) {
    throw new Error('outputLength must be an integer greater than 1.');
  }

  if (signal.length === 1) {
    const sample = getSample(signal, 0);

    return Array.from({ length: outputLength }, () => sample);
  }

  const inputMaxIndex = signal.length - 1;

  return Array.from({ length: outputLength }, (_, outputIndex) => {
    const sourceIndex = (outputIndex / (outputLength - 1)) * inputMaxIndex;
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.ceil(sourceIndex);
    const fraction = sourceIndex - leftIndex;
    const left = getSample(signal, leftIndex);
    const right = getSample(signal, rightIndex);

    return left + (right - left) * fraction;
  });
}

/** Computes mean absolute trunk lean from shoulder-midpoint to hip-midpoint. */
function computeMeanTrunkLean(seq: PoseSequence): number {
  const trunkAngles = seq.frames.map((frame) => {
    const landmarks = frame.landmarks;
    const leftShoulder = getLandmark(landmarks, LANDMARK.LEFT_SHOULDER);
    const rightShoulder = getLandmark(landmarks, LANDMARK.RIGHT_SHOULDER);
    const leftHip = getLandmark(landmarks, LANDMARK.LEFT_HIP);
    const rightHip = getLandmark(landmarks, LANDMARK.RIGHT_HIP);
    const shoulderMidpoint = midpoint(leftShoulder, rightShoulder);
    const hipMidpoint = midpoint(leftHip, rightHip);
    const dx = shoulderMidpoint.x - hipMidpoint.x;
    const dy = hipMidpoint.y - shoulderMidpoint.y;

    return Math.abs((Math.atan2(dx, dy) * 180) / Math.PI);
  });

  return mean(trunkAngles);
}

/** Returns one landmark or throws a clear error for malformed pose frames. */
function getLandmark(landmarks: Landmark3D[], landmarkIndex: number): Landmark3D {
  const landmark = landmarks[landmarkIndex];

  if (!landmark) {
    throw new Error(`Landmark index ${String(landmarkIndex)} is missing.`);
  }

  return landmark;
}

/** Computes midpoint between two landmarks. */
function midpoint(first: Landmark3D, second: Landmark3D): Landmark3D {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    z: (first.z + second.z) / 2,
    visibility: (first.visibility + second.visibility) / 2,
  };
}

/** Computes max-min range for finite values. */
function range(values: number[]): number {
  validateSignal(values);

  return Math.max(...values) - Math.min(...values);
}

/** Computes arithmetic mean for finite values. */
function mean(values: number[]): number {
  validateSignal(values);

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Reads one defined signal sample. */
function getSample(signal: number[], index: number): number {
  const sample = signal[index];

  if (sample === undefined) {
    throw new Error('Signal sample is missing.');
  }

  return sample;
}

/** Validates a pose sequence for kinematic processing. */
function validateSequence(seq: PoseSequence): void {
  if (seq.frames.length === 0) {
    throw new Error('Pose sequence must contain at least one frame.');
  }
}

/** Validates that a signal is non-empty and finite. */
function validateSignal(signal: number[]): void {
  if (signal.length === 0) {
    throw new Error('signal must contain at least one sample.');
  }

  if (!signal.every(Number.isFinite)) {
    throw new Error('signal must contain only finite samples.');
  }
}
