import { describe, expect, it } from 'vitest';
import {
  angleBetween3Points,
  euclideanDistance,
  findPeaks,
  landmarkToPoint,
  lowPassFilter,
} from '@/lib/utils/math';
import type { Landmark3D } from '@/types/pose';

describe('angleBetween3Points', () => {
  it('computes a right angle', () => {
    expect(
      angleBetween3Points(
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
      ),
    ).toBeCloseTo(90);
  });

  it('computes a straight angle', () => {
    expect(
      angleBetween3Points(
        { x: -1, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
      ),
    ).toBeCloseTo(180);
  });

  it('rejects zero-length vectors', () => {
    expect(() =>
      angleBetween3Points(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
      ),
    ).toThrow('zero-length vector');
  });
});

describe('lowPassFilter', () => {
  it('preserves constant signals', () => {
    expect(lowPassFilter([2, 2, 2, 2, 2], 2, 30)).toEqual([2, 2, 2, 2, 2]);
  });

  it('smooths a step signal without changing length', () => {
    const filtered = lowPassFilter([0, 0, 0, 10, 10, 10], 2, 30);

    expect(filtered).toHaveLength(6);
    expect(filtered[0]).toBeGreaterThanOrEqual(0);
    expect(filtered[5]).toBeLessThanOrEqual(10);
    expect(filtered[2]).toBeLessThan(filtered[4] ?? 0);
  });

  it('rejects cutoff at or above Nyquist frequency', () => {
    expect(() => lowPassFilter([1, 2, 3], 15, 30)).toThrow('Nyquist');
  });
});

describe('findPeaks', () => {
  it('finds local maxima above prominence threshold', () => {
    expect(findPeaks([0, 2, 0, 1, 0, 3, 0], 0.5, 1)).toEqual([1, 3, 5]);
  });

  it('enforces minimum distance by keeping the taller nearby peak', () => {
    expect(findPeaks([0, 3, 0, 2.5, 0, 1, 0], 0.5, 3)).toEqual([1, 5]);
  });

  it('rejects invalid minimum distance', () => {
    expect(() => findPeaks([0, 1, 0], 0.1, 0)).toThrow('minDistance');
  });
});

describe('euclideanDistance', () => {
  it('computes 3D distance', () => {
    expect(euclideanDistance({ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 2 })).toBe(
      3,
    );
  });

  it('returns zero for identical points', () => {
    expect(euclideanDistance({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 })).toBe(
      0,
    );
  });

  it('rejects non-finite coordinates', () => {
    expect(() =>
      euclideanDistance({ x: 0, y: 0, z: 0 }, { x: Number.NaN, y: 0, z: 0 }),
    ).toThrow('finite');
  });
});

describe('landmarkToPoint', () => {
  it('drops visibility while preserving coordinates', () => {
    const landmark: Landmark3D = {
      visibility: 0.8,
      x: 1,
      y: 2,
      z: 3,
    };

    expect(landmarkToPoint(landmark)).toEqual({ x: 1, y: 2, z: 3 });
  });
});
