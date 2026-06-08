/** Body placement where the IMU sensor is worn during recording. */
export type ImuPlacement =
  | 'waist_sacrum'
  | 'waist_front'
  | 'left_pocket'
  | 'right_pocket'
  | 'handheld'
  | 'unknown';

/** Source device used to collect IMU samples. */
export type ImuDeviceType = 'phone' | 'm5stack' | 'other';

/** One inertial sample from a phone or wearable IMU. */
export interface ImuSample {
  /** Timestamp in milliseconds since IMU recording start. */
  timestampMs: number;
  /** Acceleration on device x-axis in m/s^2 when available. */
  accelerationX: number | null;
  /** Acceleration on device y-axis in m/s^2 when available. */
  accelerationY: number | null;
  /** Acceleration on device z-axis in m/s^2 when available. */
  accelerationZ: number | null;
  /** Acceleration including gravity on device x-axis in m/s^2 when available. */
  accelerationIncludingGravityX: number | null;
  /** Acceleration including gravity on device y-axis in m/s^2 when available. */
  accelerationIncludingGravityY: number | null;
  /** Acceleration including gravity on device z-axis in m/s^2 when available. */
  accelerationIncludingGravityZ: number | null;
  /** Rotation rate around device alpha/z-axis in degrees per second when available. */
  rotationAlpha: number | null;
  /** Rotation rate around device beta/x-axis in degrees per second when available. */
  rotationBeta: number | null;
  /** Rotation rate around device gamma/y-axis in degrees per second when available. */
  rotationGamma: number | null;
}

/** Full IMU time series captured for one patient or assessment. */
export interface ImuSequence {
  /** Estimated sampling rate in Hz. */
  sampleRateHz: number;
  /** Duration in milliseconds from first to last sample. */
  durationMs: number;
  /** Timestamp for when the recording was created. */
  capturedAt: string;
  /** Device type that produced the samples. */
  deviceType: ImuDeviceType;
  /** Body placement selected by the operator. */
  placement: ImuPlacement;
  /** Whether the sequence is intended to be synced manually with camera data. */
  syncMode: 'manual';
  /** Timestamped IMU samples. */
  samples: ImuSample[];
}
