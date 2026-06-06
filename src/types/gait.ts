/** Side label for left or right gait measurements. */
export type GaitSide = 'left' | 'right';

/** Detectable gait event types used by the MVP algorithms. */
export type GaitEventType = 'heel_strike' | 'toe_off';

/** One detected gait event in a pose sequence. */
export interface GaitEvent {
  /** Body side where the event occurred. */
  side: GaitSide;
  /** Event class. */
  type: GaitEventType;
  /** Zero-based frame index in the source pose sequence. */
  frameIndex: number;
  /** Event timestamp in milliseconds since recording start. */
  timestampMs: number;
}

/** Spatiotemporal gait metrics for one 10-meter walk assessment. */
export interface SpatiotemporalMetrics {
  /** Step rate in steps per minute. */
  cadence: number;
  /** Estimated walking speed in meters per second. */
  gaitSpeed: number;
  /** Mean stride time in seconds. */
  strideTimeMean: number;
  /** Stride time coefficient of variation in percent. */
  strideTimeCV: number;
  /** Left step length in meters, normalized or scaled by patient height. */
  stepLengthLeft: number;
  /** Right step length in meters, normalized or scaled by patient height. */
  stepLengthRight: number;
  /** Mean step width in meters. */
  stepWidth: number;
  /** Left stance phase as percent of gait cycle. */
  stancePhasePctLeft: number;
  /** Right stance phase as percent of gait cycle. */
  stancePhasePctRight: number;
  /** Double support as percent of gait cycle or total walking time. */
  doubleSupportPct: number;
}

/** Joint angle summary metrics and normalized gait-cycle curves. */
export interface KinematicMetrics {
  /** Hip flexion range of motion in degrees. */
  hipFlexionRange: { left: number; right: number };
  /** Knee flexion range of motion in degrees. */
  kneeFlexionRange: { left: number; right: number };
  /** Ankle range of motion in degrees. */
  ankleRange: { left: number; right: number };
  /** Mean trunk lean in degrees. */
  trunkLean: number;
  /** Mean joint angle curves resampled to 0-100% gait cycle. */
  cyclePlots: {
    /** Left hip curve; expected length is 101. */
    hipLeft: number[];
    /** Right hip curve; expected length is 101. */
    hipRight: number[];
    /** Left knee curve; expected length is 101. */
    kneeLeft: number[];
    /** Right knee curve; expected length is 101. */
    kneeRight: number[];
  };
}

/** Bilateral symmetry metrics where lower values indicate better symmetry. */
export interface SymmetryMetrics {
  /** Step length Symmetry Index in percent. */
  stepLengthSI: number;
  /** Stance time Symmetry Index in percent. */
  stanceTimeSI: number;
  /** Swing time Symmetry Index in percent. */
  swingTimeSI: number;
  /** Knee flexion Symmetry Index in percent. */
  kneeFlexionSI: number;
  /** Weighted asymmetry score from 0 to 100; lower is better. */
  overallAsymmetryScore: number;
}

/** Capture and landmark quality score for one pose sequence. */
export interface QualityScore {
  /** Percent of frames with valid landmarks. */
  detectionRate: number;
  /** Percent of frames with clinically relevant landmark occlusion. */
  occlusionRate: number;
  /** Estimated number of detected walking steps. */
  stepCount: number;
  /** Mean landmark confidence across relevant frames. */
  meanConfidence: number;
  /** Whether sequence quality passes MVP analysis thresholds. */
  passed: boolean;
  /** Human-readable quality warnings for the clinician. */
  warnings: string[];
}

/** Complete analysis result persisted for one assessment. */
export interface GaitAnalysisResult {
  /** Internal assessment identifier. */
  assessmentId: string;
  /** Internal patient identifier. */
  patientId: string;
  /** Assessment type; MVP supports 10MWT only. */
  testType: '10MWT';
  /** ISO timestamp for when the assessment was performed. */
  performedAt: string;
  /** Capture quality and acceptance result. */
  quality: QualityScore;
  /** Spatiotemporal metrics computed from gait events. */
  spatiotemporal: SpatiotemporalMetrics;
  /** Kinematic angle metrics computed from landmarks. */
  kinematics: KinematicMetrics;
  /** Bilateral symmetry metrics. */
  symmetry: SymmetryMetrics;
  /** Detected heel-strike and toe-off events. */
  events: GaitEvent[];
  /** Machine-readable confidence warnings for downstream UI/reporting. */
  confidenceFlags: string[];
}
