// @vitest-environment jsdom

import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
  type PoseLandmarker as PoseLandmarkerInstance,
} from '@mediapipe/tasks-vision';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PoseDetector } from '@/lib/pose/poseDetector';

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn(),
  },
  PoseLandmarker: {
    createFromOptions: vi.fn(),
  },
}));

const visibility = 0.9;
const filesetResolverMock = vi.mocked(FilesetResolver);
const poseLandmarkerMock = vi.mocked(PoseLandmarker);

/** Create 33 normalized MediaPipe landmarks for pose detector tests. */
function createNormalizedLandmarks(): PoseLandmarkerResult['landmarks'][number] {
  return Array.from({ length: 33 }, (_, index) => ({
    visibility,
    x: index / 100,
    y: index / 200,
    z: -index / 300,
  }));
}

/** Create 33 world MediaPipe landmarks for pose detector tests. */
function createWorldLandmarks(): PoseLandmarkerResult['worldLandmarks'][number] {
  return Array.from({ length: 33 }, (_, index) => ({
    visibility,
    x: index / 10,
    y: index / 20,
    z: -index / 30,
  }));
}

/** Create a mocked MediaPipe PoseLandmarker instance. */
function createLandmarkerMock(result: PoseLandmarkerResult): {
  closeMock: ReturnType<typeof vi.fn>;
  instance: PoseLandmarkerInstance;
} {
  const closeMock = vi.fn();
  const instance = {
    close: closeMock,
    detectForVideo: vi.fn(() => result),
  } as unknown as PoseLandmarkerInstance;

  return { closeMock, instance };
}

/** Create a MediaPipe result fixture with the required close method. */
function createResult(
  landmarks: PoseLandmarkerResult['landmarks'] = [],
  worldLandmarks: PoseLandmarkerResult['worldLandmarks'] = [],
): PoseLandmarkerResult {
  return {
    close: vi.fn(),
    landmarks,
    segmentationMasks: undefined,
    worldLandmarks,
  };
}

describe('PoseDetector', () => {
  const vision = {};
  const modelAssetPath = '/models/pose_landmarker_full.task';
  const wasmBaseUrl = '/wasm';

  beforeEach(() => {
    vi.clearAllMocks();
    filesetResolverMock.forVisionTasks.mockResolvedValue(
      vision as Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
    );
  });

  it('initializes with GPU delegate by default', async () => {
    const landmarker = createLandmarkerMock(createResult());
    poseLandmarkerMock.createFromOptions.mockResolvedValue(landmarker.instance);

    const detector = new PoseDetector();
    await detector.initialize({ modelAssetPath, wasmBaseUrl });

    expect(filesetResolverMock.forVisionTasks).toHaveBeenCalledWith(
      wasmBaseUrl,
    );
    expect(poseLandmarkerMock.createFromOptions.mock.calls).toHaveLength(1);

    const firstCall = poseLandmarkerMock.createFromOptions.mock.calls[0];

    expect(firstCall?.[0]).toBe(vision);
    expect(firstCall?.[1].baseOptions?.delegate).toBe('GPU');
    expect(firstCall?.[1].baseOptions?.modelAssetPath).toBe(modelAssetPath);
    expect(firstCall?.[1].runningMode).toBe('VIDEO');
  });

  it('falls back to CPU when GPU initialization fails', async () => {
    const landmarker = createLandmarkerMock(createResult());
    poseLandmarkerMock.createFromOptions
      .mockRejectedValueOnce(new Error('GPU unavailable'))
      .mockResolvedValueOnce(landmarker.instance);

    const detector = new PoseDetector();
    await detector.initialize({ modelAssetPath, wasmBaseUrl });

    expect(poseLandmarkerMock.createFromOptions.mock.calls).toHaveLength(2);

    const secondCall = poseLandmarkerMock.createFromOptions.mock.calls[1];

    expect(secondCall?.[0]).toBe(vision);
    expect(secondCall?.[1].baseOptions?.delegate).toBe('CPU');
    expect(secondCall?.[1].baseOptions?.modelAssetPath).toBe(modelAssetPath);
  });

  it('converts MediaPipe detection output to a PoseFrame', async () => {
    const normalizedLandmarks = createNormalizedLandmarks();
    const worldLandmarks = createWorldLandmarks();
    const result = createResult([normalizedLandmarks], [worldLandmarks]);
    const landmarker = createLandmarkerMock(result);
    poseLandmarkerMock.createFromOptions.mockResolvedValue(landmarker.instance);

    const detector = new PoseDetector();
    await detector.initialize({ preferredDelegate: 'CPU' });

    const video = document.createElement('video');
    const frame = detector.detect(video, 1234);

    expect(frame).toEqual({
      landmarks: normalizedLandmarks.map((landmark) => ({
        visibility: landmark.visibility,
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
      })),
      timestamp: 1234,
      worldLandmarks: worldLandmarks.map((landmark) => ({
        visibility: landmark.visibility,
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
      })),
    });
  });

  it('returns null when no pose is detected and disposes resources', async () => {
    const landmarker = createLandmarkerMock(createResult());
    poseLandmarkerMock.createFromOptions.mockResolvedValue(landmarker.instance);

    const detector = new PoseDetector();
    await detector.initialize();

    expect(detector.detect(document.createElement('video'), 0)).toBeNull();

    detector.dispose();

    expect(landmarker.closeMock.mock.calls).toHaveLength(1);
  });
});
