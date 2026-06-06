import type { Landmark3D } from '@/types/pose';

/** 3D point accepted by vector math utilities. */
export interface Point3D {
  /** X coordinate. */
  x: number;
  /** Y coordinate. */
  y: number;
  /** Z coordinate. */
  z: number;
}

/** Calculate the angle ABC in degrees from three 3D points. */
export function angleBetween3Points(
  a: Point3D,
  b: Point3D,
  c: Point3D,
): number {
  validatePoint(a, 'a');
  validatePoint(b, 'b');
  validatePoint(c, 'c');

  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const baMagnitude = vectorMagnitude(ba);
  const bcMagnitude = vectorMagnitude(bc);

  if (baMagnitude === 0 || bcMagnitude === 0) {
    throw new Error('Cannot compute an angle with a zero-length vector.');
  }

  const cosine = clamp(dotProduct(ba, bc) / (baMagnitude * bcMagnitude), -1, 1);

  return (Math.acos(cosine) * 180) / Math.PI;
}

/** Apply a zero-phase four-pass low-pass filter to a numeric signal. */
export function lowPassFilter(
  signal: number[],
  cutoffHz: number,
  sampleRateHz: number,
): number[] {
  validateSignal(signal);

  if (!Number.isFinite(cutoffHz) || cutoffHz <= 0) {
    throw new Error('cutoffHz must be greater than 0.');
  }

  if (!Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
    throw new Error('sampleRateHz must be greater than 0.');
  }

  if (cutoffHz >= sampleRateHz / 2) {
    throw new Error('cutoffHz must be below the Nyquist frequency.');
  }

  if (signal.length <= 1) {
    return [...signal];
  }

  const dt = 1 / sampleRateHz;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = dt / (rc + dt);
  let filtered = [...signal];

  for (let pass = 0; pass < 4; pass += 1) {
    filtered = singlePoleLowPass(filtered, alpha);
  }

  filtered.reverse();

  for (let pass = 0; pass < 4; pass += 1) {
    filtered = singlePoleLowPass(filtered, alpha);
  }

  return filtered.reverse();
}

/** Find local maxima with minimum prominence and frame distance constraints. */
export function findPeaks(
  signal: number[],
  minProminence: number,
  minDistance: number,
): number[] {
  validateSignal(signal);

  if (!Number.isFinite(minProminence) || minProminence < 0) {
    throw new Error('minProminence must be a non-negative finite number.');
  }

  if (!Number.isInteger(minDistance) || minDistance < 1) {
    throw new Error('minDistance must be an integer greater than 0.');
  }

  const candidates: { index: number; value: number }[] = [];

  for (let index = 1; index < signal.length - 1; index += 1) {
    const previous = signal[index - 1];
    const current = signal[index];
    const next = signal[index + 1];

    if (
      previous === undefined ||
      current === undefined ||
      next === undefined ||
      current <= previous ||
      current < next
    ) {
      continue;
    }

    const prominence = current - Math.max(previous, next);

    if (prominence >= minProminence) {
      candidates.push({ index, value: current });
    }
  }

  const selected: number[] = [];

  for (const candidate of candidates.sort((a, b) => b.value - a.value)) {
    const isFarEnough = selected.every(
      (selectedIndex) =>
        Math.abs(candidate.index - selectedIndex) >= minDistance,
    );

    if (isFarEnough) {
      selected.push(candidate.index);
    }
  }

  return selected.sort((a, b) => a - b);
}

/** Calculate Euclidean distance between two 3D points. */
export function euclideanDistance(p1: Point3D, p2: Point3D): number {
  validatePoint(p1, 'p1');
  validatePoint(p2, 'p2');

  return vectorMagnitude({
    x: p1.x - p2.x,
    y: p1.y - p2.y,
    z: p1.z - p2.z,
  });
}

/** Convert a landmark into the generic point shape used by math utilities. */
export function landmarkToPoint(landmark: Landmark3D): Point3D {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
  };
}

/** Apply one causal single-pole low-pass pass. */
function singlePoleLowPass(signal: number[], alpha: number): number[] {
  const first = signal[0];

  if (first === undefined) {
    return [];
  }

  const output = [first];

  for (let index = 1; index < signal.length; index += 1) {
    const previous = output[index - 1];
    const current = signal[index];

    if (previous === undefined || current === undefined) {
      throw new Error('Unexpected missing signal sample.');
    }

    output.push(previous + alpha * (current - previous));
  }

  return output;
}

/** Calculate vector dot product. */
function dotProduct(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Calculate vector magnitude. */
function vectorMagnitude(vector: Point3D): number {
  return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
}

/** Clamp a number to a closed interval. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Throw if a point contains non-finite coordinates. */
function validatePoint(point: Point3D, name: string): void {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(point.z)
  ) {
    throw new Error(`${name} must contain finite x, y, and z coordinates.`);
  }
}

/** Throw if a signal is empty or contains non-finite samples. */
function validateSignal(signal: number[]): void {
  if (signal.length === 0) {
    throw new Error('signal must contain at least one sample.');
  }

  if (!signal.every(Number.isFinite)) {
    throw new Error('signal must contain only finite samples.');
  }
}
