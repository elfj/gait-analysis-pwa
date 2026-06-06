import type { Assessment } from '@/types/assessment';
import type { GaitAnalysisResult } from '@/types/gait';
import type { Patient } from '@/types/patient';
import type { PoseSequence } from '@/types/pose';
import { db, type GaitDB, type PoseSequenceRecord } from '@/lib/db/schema';

/** Create or replace a patient record. */
export async function createPatient(
  patient: Patient,
  database: GaitDB = db,
): Promise<string> {
  await database.patients.put(patient);
  return patient.id;
}

/** List all patient records ordered by creation time. */
export async function listPatients(database: GaitDB = db): Promise<Patient[]> {
  return database.patients.orderBy('createdAt').toArray();
}

/** Fetch one patient by internal identifier. */
export async function getPatient(
  patientId: string,
  database: GaitDB = db,
): Promise<Patient | undefined> {
  return database.patients.get(patientId);
}

/** Delete one patient by internal identifier. */
export async function deletePatient(
  patientId: string,
  database: GaitDB = db,
): Promise<void> {
  await database.transaction(
    'rw',
    database.patients,
    database.assessments,
    database.poseSequences,
    database.results,
    async () => {
      const assessments = await database.assessments.where({ patientId }).toArray();
      const assessmentIds = assessments.map((assessment) => assessment.id);
      // Draft captures are indexed by patientId until analysis creates a final assessment.
      const poseAssessmentIds = [...assessmentIds, patientId];

      await Promise.all([
        database.patients.delete(patientId),
        database.assessments.where({ patientId }).delete(),
        database.results.where({ patientId }).delete(),
        database.poseSequences.where('assessmentId').anyOf(poseAssessmentIds).delete(),
      ]);
    },
  );
}

/** Create or replace assessment metadata. */
export async function createAssessment(
  assessment: Assessment,
  database: GaitDB = db,
): Promise<string> {
  await database.assessments.put(assessment);
  return assessment.id;
}

/** Fetch one assessment by internal identifier. */
export async function getAssessment(
  assessmentId: string,
  database: GaitDB = db,
): Promise<Assessment | undefined> {
  return database.assessments.get(assessmentId);
}

/** Delete one assessment by internal identifier. */
export async function deleteAssessment(
  assessmentId: string,
  database: GaitDB = db,
): Promise<void> {
  await database.assessments.delete(assessmentId);
}

/** Save or replace one captured pose sequence. */
export async function savePoseSequence(
  record: PoseSequenceRecord,
  database: GaitDB = db,
): Promise<string> {
  await database.poseSequences.put(record);
  return record.id;
}

/** Fetch a pose sequence record by assessment identifier. */
export async function getPoseSequenceByAssessment(
  assessmentId: string,
  database: GaitDB = db,
): Promise<PoseSequenceRecord | undefined> {
  return database.poseSequences.where({ assessmentId }).first();
}

/** Delete a pose sequence record by internal identifier. */
export async function deletePoseSequence(
  recordId: string,
  database: GaitDB = db,
): Promise<void> {
  await database.poseSequences.delete(recordId);
}

/** Save or replace an analysis result. */
export async function saveResult(
  result: GaitAnalysisResult,
  database: GaitDB = db,
): Promise<string> {
  await database.results.put(result);
  return result.assessmentId;
}

/** Fetch one analysis result by assessment identifier. */
export async function getResult(
  assessmentId: string,
  database: GaitDB = db,
): Promise<GaitAnalysisResult | undefined> {
  return database.results.get(assessmentId);
}

/** List analysis results for one patient ordered by performed date. */
export async function listResultsByPatient(
  patientId: string,
  database: GaitDB = db,
): Promise<GaitAnalysisResult[]> {
  return database.results.where({ patientId }).sortBy('performedAt');
}

/** Delete one analysis result by assessment identifier. */
export async function deleteResult(
  assessmentId: string,
  database: GaitDB = db,
): Promise<void> {
  await database.results.delete(assessmentId);
}

/** Create a minimal empty pose sequence for tests and recovery flows. */
export function createEmptyPoseSequence(capturedAt: string): PoseSequence {
  return {
    capturedAt,
    durationMs: 0,
    fps: 0,
    frames: [],
  };
}
