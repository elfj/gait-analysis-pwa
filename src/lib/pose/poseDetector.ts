import {
  FilesetResolver,
  PoseLandmarker,
  type Landmark,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import type { Landmark3D, PoseFrame } from '@/types/pose';

const DEFAULT_WASM_BASE_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const DEFAULT_MODEL_ASSET_PATH = '/models/pose_landmarker_full.task';

/** Configuration for MediaPipe Pose detector initialization. */
export interface PoseDetectorOptions {
  /** Base URL for MediaPipe WASM assets. */
  wasmBaseUrl?: string;
  /** Public URL for the pose landmarker task model. */
  modelAssetPath?: string;
  /** Delegate attempted before CPU fallback. */
  preferredDelegate?: 'GPU' | 'CPU';
}

/** Convert one MediaPipe normalized landmark into the app landmark shape. */
export function convertNormalizedLandmark(
  landmark: NormalizedLandmark,
): Landmark3D {
  return {
    visibility: landmark.visibility,
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
  };
}

/** Convert one MediaPipe world landmark into the app landmark shape. */
export function convertWorldLandmark(landmark: Landmark): Landmark3D {
  return {
    visibility: landmark.visibility,
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
  };
}

/** Browser-side MediaPipe PoseLandmarker wrapper with CPU fallback. */
export class PoseDetector {
  private landmarker: PoseLandmarker | null = null;

  /** Initialize MediaPipe PoseLandmarker, falling back to CPU if GPU fails. */
  async initialize(options: PoseDetectorOptions = {}): Promise<void> {
    const wasmBaseUrl = options.wasmBaseUrl ?? DEFAULT_WASM_BASE_URL;
    const modelAssetPath = options.modelAssetPath ?? DEFAULT_MODEL_ASSET_PATH;
    const preferredDelegate = options.preferredDelegate ?? 'GPU';
    const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl);

    try {
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          delegate: preferredDelegate,
          modelAssetPath,
        },
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        numPoses: 1,
        outputSegmentationMasks: false,
        runningMode: 'VIDEO',
      });
    } catch (error) {
      if (preferredDelegate === 'CPU') {
        throw error;
      }

      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          delegate: 'CPU',
          modelAssetPath,
        },
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        numPoses: 1,
        outputSegmentationMasks: false,
        runningMode: 'VIDEO',
      });
    }
  }

  /** Detect one pose frame from a video element at the provided timestamp. */
  detect(
    videoElement: HTMLVideoElement,
    timestampMs: number,
  ): PoseFrame | null {
    if (this.landmarker === null) {
      throw new Error('PoseDetector is not initialized.');
    }

    const result = this.landmarker.detectForVideo(videoElement, timestampMs);
    const landmarks = result.landmarks[0];

    if (landmarks === undefined) {
      return null;
    }

    const worldLandmarks = result.worldLandmarks[0];
    const frame: PoseFrame = {
      landmarks: landmarks.map(convertNormalizedLandmark),
      timestamp: timestampMs,
    };

    if (worldLandmarks !== undefined) {
      frame.worldLandmarks = worldLandmarks.map(convertWorldLandmark);
    }

    return frame;
  }

  /** Release MediaPipe resources held by this detector. */
  dispose(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
