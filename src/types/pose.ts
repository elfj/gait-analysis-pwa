/** MediaPipe Pose landmark indices used by the MVP gait pipeline. */
export const LANDMARK = {
  /** Nose landmark index. */
  NOSE: 0,
  /** Left shoulder landmark index. */
  LEFT_SHOULDER: 11,
  /** Right shoulder landmark index. */
  RIGHT_SHOULDER: 12,
  /** Left hip landmark index. */
  LEFT_HIP: 23,
  /** Right hip landmark index. */
  RIGHT_HIP: 24,
  /** Left knee landmark index. */
  LEFT_KNEE: 25,
  /** Right knee landmark index. */
  RIGHT_KNEE: 26,
  /** Left ankle landmark index. */
  LEFT_ANKLE: 27,
  /** Right ankle landmark index. */
  RIGHT_ANKLE: 28,
  /** Left heel landmark index. */
  LEFT_HEEL: 29,
  /** Right heel landmark index. */
  RIGHT_HEEL: 30,
  /** Left foot index landmark index. */
  LEFT_FOOT_INDEX: 31,
  /** Right foot index landmark index. */
  RIGHT_FOOT_INDEX: 32,
} as const;

/** One normalized or world-space MediaPipe Pose landmark. */
export interface Landmark3D {
  /** Horizontal position, normalized to [0, 1] for image landmarks. */
  x: number;
  /** Vertical position, normalized to [0, 1] for image landmarks. */
  y: number;
  /** Depth relative to the hip origin for MediaPipe pose coordinates. */
  z: number;
  /** Landmark visibility confidence in [0, 1]. */
  visibility: number;
}

/** Pose landmarks detected for one video frame. */
export interface PoseFrame {
  /** Milliseconds since recording start. */
  timestamp: number;
  /** Image-space landmarks; MediaPipe Pose returns 33 landmarks. */
  landmarks: Landmark3D[];
  /** Optional metric-scale landmarks, when MediaPipe provides them. */
  worldLandmarks?: Landmark3D[];
}

/** Time series of pose frames captured during one assessment. */
export interface PoseSequence {
  /** Capture frame rate in frames per second. */
  fps: number;
  /** Total recording duration in milliseconds. */
  durationMs: number;
  /** Ordered pose frames in capture order. */
  frames: PoseFrame[];
  /** ISO timestamp for when capture started. */
  capturedAt: string;
}
