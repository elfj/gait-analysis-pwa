import { LANDMARK } from '@/lib/pose/landmarks';
import type { QualityScore } from '@/types/gait';
import type { PoseFrame, PoseSequence } from '@/types/pose';

const MIN_DETECTION_RATE = 90;
const MIN_MEAN_CONFIDENCE = 0.6;
const MIN_STEP_COUNT = 6;
const MIN_DURATION_MS = 5_000;
const MIN_REQUIRED_VISIBILITY = 0.5;
const STEP_MIN_PROMINENCE = 0.03;

const REQUIRED_LANDMARKS = [
  LANDMARK.LEFT_SHOULDER,
  LANDMARK.RIGHT_SHOULDER,
  LANDMARK.LEFT_HIP,
  LANDMARK.RIGHT_HIP,
  LANDMARK.LEFT_ANKLE,
  LANDMARK.RIGHT_ANKLE,
] as const;

/** Compute capture quality metrics and pass/fail warnings for a pose sequence. */
export function computeQualityScore(
  seq: PoseSequence,
  patientHeightCm: number,
): QualityScore {
  const warnings: string[] = [];
  const validFrames = seq.frames.filter(isFrameDetected);
  const detectionRate = percentage(validFrames.length, seq.frames.length);
  const meanConfidence = mean(
    validFrames.flatMap((frame) =>
      REQUIRED_LANDMARKS.map(
        (landmarkIndex) => frame.landmarks[landmarkIndex]?.visibility ?? 0,
      ),
    ),
  );
  const completeBodyFrameCount = validFrames.filter(hasCompleteBody).length;
  const occlusionRate =
    100 - percentage(completeBodyFrameCount, seq.frames.length);
  const stepCount = estimateStepCount(seq);

  if (patientHeightCm <= 0) {
    warnings.push('Patient height must be greater than 0 cm.');
  }

  if (seq.durationMs < MIN_DURATION_MS) {
    warnings.push('Recording is shorter than 5 seconds.');
  }

  if (detectionRate < MIN_DETECTION_RATE) {
    warnings.push('Pose detection rate is below 90%.');
  }

  if (meanConfidence < MIN_MEAN_CONFIDENCE) {
    warnings.push('Mean landmark confidence is below 0.60.');
  }

  if (stepCount < MIN_STEP_COUNT) {
    warnings.push('Fewer than 6 walking steps were detected.');
  }

  if (occlusionRate > 10) {
    warnings.push('Shoulders, hips, or ankles are frequently occluded.');
  }

  return {
    detectionRate,
    meanConfidence,
    occlusionRate,
    passed: warnings.length === 0,
    stepCount,
    warnings,
  };
}

/** Return true when a frame has all 33 landmarks. */
function isFrameDetected(frame: PoseFrame): boolean {
  return frame.landmarks.length === 33;
}

/** Return true when shoulders, hips, and ankles are visible enough. */
function hasCompleteBody(frame: PoseFrame): boolean {
  return REQUIRED_LANDMARKS.every((landmarkIndex) => {
    const landmark = frame.landmarks[landmarkIndex];
    return (
      landmark !== undefined && landmark.visibility >= MIN_REQUIRED_VISIBILITY
    );
  });
}

/** Estimate total step count from left and right ankle vertical oscillations. */
function estimateStepCount(seq: PoseSequence): number {
  const minDistance = Math.max(1, Math.floor(seq.fps * 0.3));
  const leftAnkleY = extractVisibleLandmarkY(seq, LANDMARK.LEFT_ANKLE);
  const rightAnkleY = extractVisibleLandmarkY(seq, LANDMARK.RIGHT_ANKLE);

  return (
    countPeaks(leftAnkleY, STEP_MIN_PROMINENCE, minDistance) +
    countPeaks(rightAnkleY, STEP_MIN_PROMINENCE, minDistance)
  );
}

/** Extract y positions for one landmark, using NaN when unavailable. */
function extractVisibleLandmarkY(
  seq: PoseSequence,
  landmarkIndex: number,
): number[] {
  return seq.frames.map((frame) => {
    const landmark = frame.landmarks[landmarkIndex];
    if (
      landmark === undefined ||
      landmark.visibility < MIN_REQUIRED_VISIBILITY
    ) {
      return Number.NaN;
    }

    return landmark.y;
  });
}

/** Count simple local peaks separated by a minimum frame distance. */
function countPeaks(
  signal: number[],
  minProminence: number,
  minDistanceFrames: number,
): number {
  let peakCount = 0;
  let lastPeakIndex = -minDistanceFrames;

  for (let index = 1; index < signal.length - 1; index += 1) {
    const previous = signal[index - 1];
    const current = signal[index];
    const next = signal[index + 1];

    if (
      !isFiniteNumber(previous) ||
      !isFiniteNumber(current) ||
      !isFiniteNumber(next)
    ) {
      continue;
    }

    const isLocalPeak = current > previous && current >= next;
    const prominence = current - Math.max(previous, next);
    const isFarEnough = index - lastPeakIndex >= minDistanceFrames;

    if (isLocalPeak && prominence >= minProminence && isFarEnough) {
      peakCount += 1;
      lastPeakIndex = index;
    }
  }

  return peakCount;
}

/** Return true for finite numeric values. */
function isFiniteNumber(value: number | undefined): value is number {
  return Number.isFinite(value);
}

/** Compute a percentage with a zero denominator fallback. */
function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return (numerator / denominator) * 100;
}

/** Compute the arithmetic mean with a zero-length fallback. */
function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
