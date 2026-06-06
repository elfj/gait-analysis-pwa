// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraView, type CameraViewHandle } from '@/components/CameraView';
import type { PoseDetector } from '@/lib/pose/poseDetector';
import type { PoseFrame } from '@/types/pose';

const poseFrame: PoseFrame = {
  landmarks: Array.from({ length: 33 }, (_, index) => ({
    visibility: 0.9,
    x: index / 33,
    y: index / 66,
    z: 0,
  })),
  timestamp: 16,
};

const mediaTrack = {
  stop: vi.fn(),
} satisfies Pick<MediaStreamTrack, 'stop'>;

const mediaStream = {
  getTracks: vi.fn(() => [mediaTrack as unknown as MediaStreamTrack]),
} satisfies Pick<MediaStream, 'getTracks'>;

/** Mocked detector and its spies for CameraView tests. */
interface DetectorMock {
  /** Detector instance passed to CameraView. */
  detector: PoseDetector;
  /** Detect spy. */
  detectMock: ReturnType<typeof vi.fn>;
  /** Dispose spy. */
  disposeMock: ReturnType<typeof vi.fn>;
  /** Initialize spy. */
  initializeMock: ReturnType<typeof vi.fn>;
}

/** Build a detector mock compatible with CameraView. */
function createDetectorMock(): DetectorMock {
  const detectMock = vi.fn(() => poseFrame);
  const disposeMock = vi.fn();
  const initializeMock = vi.fn(() => Promise.resolve());

  return {
    detectMock,
    detector: {
      detect: detectMock,
      dispose: disposeMock,
      initialize: initializeMock,
    } as unknown as PoseDetector,
    disposeMock,
    initializeMock,
  };
}

describe('CameraView', () => {
  let animationCallback: FrameRequestCallback | null;
  let detectorMock: DetectorMock;
  let getUserMediaMock: ReturnType<typeof vi.fn>;
  let onPoseFrame: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    animationCallback = null;
    detectorMock = createDetectorMock();
    getUserMediaMock = vi.fn(() =>
      Promise.resolve(mediaStream as unknown as MediaStream),
    );
    onPoseFrame = vi.fn();
    mediaTrack.stop.mockClear();

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: getUserMediaMock,
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn(() => Promise.resolve()),
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      configurable: true,
      value: 720,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    });

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationCallback = callback;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(
      () => undefined,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValue(1016);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('starts camera capture and records pose frames', async () => {
    const ref = createRef<CameraViewHandle>();

    render(
      <CameraView
        detector={detectorMock.detector}
        onPoseFrame={onPoseFrame}
        ref={ref}
      />,
    );

    await act(async () => {
      await ref.current?.start();
    });
    act(() => {
      animationCallback?.(1016);
    });

    expect(getUserMediaMock.mock.calls[0]?.[0]).toEqual({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        frameRate: { ideal: 30 },
        height: { ideal: 720 },
        width: { ideal: 1280 },
      },
    });
    expect(detectorMock.initializeMock.mock.calls).toHaveLength(1);
    expect(detectorMock.detectMock.mock.calls).toHaveLength(1);
    expect(onPoseFrame).toHaveBeenCalledWith(poseFrame);
    expect(ref.current?.getFrames()).toEqual([poseFrame]);
    expect(screen.getByRole('status').textContent).toBe('Camera running');
  });

  it('stops camera tracks and disposes detector', async () => {
    const ref = createRef<CameraViewHandle>();

    render(<CameraView detector={detectorMock.detector} ref={ref} />);

    await act(async () => {
      await ref.current?.start();
    });
    act(() => {
      ref.current?.stop();
    });

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(mediaTrack.stop.mock.calls).toHaveLength(1);
    expect(detectorMock.disposeMock.mock.calls).toHaveLength(2);
    expect(screen.getByRole('status').textContent).toBe('Camera stopped');
  });

  it('reports startup errors and rethrows them', async () => {
    const error = new Error('Camera denied');
    const onError = vi.fn();
    const ref = createRef<CameraViewHandle>();

    getUserMediaMock.mockRejectedValueOnce(error);
    render(
      <CameraView
        detector={detectorMock.detector}
        onError={onError}
        ref={ref}
      />,
    );

    await expect(ref.current?.start()).rejects.toThrow(error);

    expect(onError).toHaveBeenCalledWith(error);
  });
});
