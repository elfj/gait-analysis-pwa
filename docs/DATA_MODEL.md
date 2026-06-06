# Data Model

The MVP stores derived gait data locally in IndexedDB. Raw camera video is not persisted by default.

## Tables

`patients`

- Primary key: `id`
- Indexes: `externalId`, `diagnosis`, `createdAt`
- Stores de-identified demographics and clinical category used for local assessment history.

`assessments`

- Primary key: `id`
- Indexes: `patientId`, `performedAt`
- Stores finalized 10MWT assessment metadata after gait analysis succeeds.

`poseSequences`

- Primary key: `id`
- Indexes: `assessmentId`
- Stores MediaPipe pose keypoint sequences. Draft captures use `assessmentId = patientId` and `id = draft:<patientId>` so analysis can recover after reload or tab discard. Final records use the generated assessment result ID.

`results`

- Primary key: `assessmentId`
- Indexes: `patientId`, `performedAt`
- Stores the complete `GaitAnalysisResult`, including quality, spatiotemporal metrics, kinematics, symmetry, events, and confidence flags.

## Deletion Semantics

Deleting a patient cascades across linked assessment metadata, gait results, final pose sequences, and the patient's draft pose sequence. This avoids retaining derived health data after the visible patient record is removed.

## Privacy Notes

Pose keypoints are derived biometric health data. Use de-identified patient IDs and export only clinically necessary PDF reports. Mobile browser storage can be cleared by the operating system under storage pressure.
