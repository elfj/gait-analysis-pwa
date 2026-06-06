# Gait Analysis Algorithms

This document summarizes the MVP gait analysis pipeline implemented in `src/lib/gait`.

## Inputs

- `PoseSequence`: ordered MediaPipe pose frames with normalized image landmarks and optional metric `worldLandmarks`.
- `Patient`: height is required for normalized-coordinate distance fallback.

## Event Detection

`detectGaitEvents` extracts heel and toe image-space `y` trajectories for each side. MediaPipe image `y` increases downward, so heel-strike is detected as a local maximum in heel `y`. Toe-off is detected as the first toe vertical velocity crossing from positive to non-positive after a heel-strike and before the next same-side heel-strike.

Missing isolated samples are linearly filled before filtering. Invalid or zero FPS is rejected.

## Spatiotemporal Metrics

`computeSpatiotemporal` derives:

- cadence
- mean stride time and coefficient of variation
- left/right step length
- gait speed
- left/right stance phase
- double support percentage
- step width

For spatial metrics, the implementation infers the sagittal progression axis from heel-strike ankle separation. The larger horizontal separation axis across heel-strike frames is treated as progression; the other horizontal axis is used as width. World landmarks are preferred; normalized landmarks are scaled by patient height when world landmarks are absent.

## Kinematics

`computeKinematicMetrics` computes hip, knee, and ankle angle ranges from landmark triplets and normalizes hip/knee curves to a 0-100% gait cycle using same-side heel-strike boundaries.

## Symmetry

`computeSymmetryMetrics` uses the Robinson symmetry index:

`SI = |left - right| / (0.5 * (left + right)) * 100`

Overall asymmetry is a weighted combination of step length, stance time, swing time, and knee flexion symmetry.

## Pipeline Validation

`analyzeGait` requires enough events for both sides:

- at least four heel-strikes total
- at least two heel-strikes per side
- at least one toe-off inside a same-side stride per side

The pipeline rejects non-finite spatiotemporal metrics and non-finite overall asymmetry before returning a result.
