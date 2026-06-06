// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PoseOverlay } from '@/components/PoseOverlay';
import type { PoseFrame } from '@/types/pose';

const drawingContext = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  fill: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  stroke: vi.fn(),
} satisfies Partial<CanvasRenderingContext2D>;

const frame: PoseFrame = {
  landmarks: Array.from({ length: 33 }, (_, index) => ({
    visibility: 0.9,
    x: index / 33,
    y: index / 33,
    z: 0,
  })),
  timestamp: 0,
};

describe('PoseOverlay', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      drawingContext as unknown as CanvasRenderingContext2D,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws skeleton lines and visible landmarks', () => {
    render(<PoseOverlay frame={frame} height={720} width={1280} />);

    expect(drawingContext.clearRect).toHaveBeenCalledWith(0, 0, 1280, 720);
    expect(drawingContext.stroke).toHaveBeenCalled();
    expect(drawingContext.arc).toHaveBeenCalled();
    expect(drawingContext.fill).toHaveBeenCalled();
  });

  it('clears the canvas when no frame is available', () => {
    render(<PoseOverlay frame={null} height={720} width={1280} />);

    expect(drawingContext.clearRect).toHaveBeenCalledWith(0, 0, 1280, 720);
    expect(drawingContext.stroke).not.toHaveBeenCalled();
    expect(drawingContext.arc).not.toHaveBeenCalled();
  });
});
