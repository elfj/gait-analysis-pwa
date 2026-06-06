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
- Draft captures intentionally remain after analysis failure so clinicians can retry analysis without recapturing. They are deleted after successful result persistence or when the linked patient is deleted.

`results`

- Primary key: `assessmentId`
- Indexes: `patientId`, `performedAt`
- Stores the complete `GaitAnalysisResult`, including quality, spatiotemporal metrics, kinematics, symmetry, events, and confidence flags.

## Deletion Semantics

Deleting a patient cascades across linked assessment metadata, gait results, final pose sequences, and the patient's draft pose sequence. This avoids retaining derived health data after the visible patient record is removed.

The cascade includes the bare `patientId` in the pose-sequence lookup because draft records are indexed by patient ID before a final assessment ID exists.

## Privacy Notes

Pose keypoints are derived biometric health data. Use de-identified patient IDs and export only clinically necessary PDF reports. Mobile browser storage can be cleared by the operating system under storage pressure.
