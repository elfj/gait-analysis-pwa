import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createAssessment,
  createEmptyPoseSequence,
  createPatient,
  deleteAssessment,
  deletePatient,
  deletePoseSequence,
  deleteResult,
  getAssessment,
  getPatient,
  getPoseSequenceByAssessment,
  getResult,
  listPatients,
  listResultsByPatient,
  savePoseSequence,
  saveResult,
} from '@/lib/db/repositories';
import { GaitDB } from '@/lib/db/schema';
import type { Assessment } from '@/types/assessment';
import type { GaitAnalysisResult } from '@/types/gait';
import type { Patient } from '@/types/patient';

const now = '2026-06-06T00:00:00.000Z';

/** Create a disposable IndexedDB database for each repository test. */
function createTestDatabase(): GaitDB {
  return new GaitDB(`GaitDBTest-${crypto.randomUUID()}`);
}

/** Build a valid patient fixture for repository tests. */
function createPatientFixture(id = 'patient-1'): Patient {
  return {
    birthYear: 1970,
    createdAt: now,
    diagnosis: 'healthy',
    externalId: 'MRN-001',
    heightCm: 170,
    id,
    sex: 'F',
  };
}

/** Build a valid assessment fixture for repository tests. */
function createAssessmentFixture(
  id = 'assessment-1',
  patientId = 'patient-1',
): Assessment {
  return {
    id,
    patientId,
    performedAt: now,
    testType: '10MWT',
  };
}

/** Build a valid gait result fixture for repository tests. */
function createResultFixture(
  assessmentId = 'assessment-1',
  patientId = 'patient-1',
): GaitAnalysisResult {
  return {
    assessmentId,
    confidenceFlags: [],
    events: [],
    kinematics: {
      ankleRange: { left: 10, right: 11 },
      cyclePlots: {
        hipLeft: new Array<number>(101).fill(0),
        hipRight: new Array<number>(101).fill(0),
        kneeLeft: new Array<number>(101).fill(0),
        kneeRight: new Array<number>(101).fill(0),
      },
      hipFlexionRange: { left: 30, right: 31 },
      kneeFlexionRange: { left: 60, right: 61 },
      trunkLean: 2,
    },
    patientId,
    performedAt: now,
    quality: {
      detectionRate: 95,
      meanConfidence: 0.85,
      occlusionRate: 2,
      passed: true,
      stepCount: 8,
      warnings: [],
    },
    spatiotemporal: {
      cadence: 110,
      doubleSupportPct: 20,
      gaitSpeed: 1.2,
      stancePhasePctLeft: 60,
      stancePhasePctRight: 61,
      stepLengthLeft: 0.6,
      stepLengthRight: 0.61,
      stepWidth: 0.1,
      strideTimeCV: 3,
      strideTimeMean: 1.1,
    },
    symmetry: {
      kneeFlexionSI: 1.6,
      overallAsymmetryScore: 2,
      stanceTimeSI: 1.7,
      stepLengthSI: 1.6,
      swingTimeSI: 1.8,
    },
    testType: '10MWT',
  };
}

describe('IndexedDB repositories', () => {
  let database: GaitDB;

  afterEach(async () => {
    await database.delete();
    database.close();
  });

  it('writes, reads, lists, and deletes patients', async () => {
    database = createTestDatabase();
    const patient = createPatientFixture();

    await expect(createPatient(patient, database)).resolves.toBe(patient.id);

    await expect(getPatient(patient.id, database)).resolves.toEqual(patient);
    await expect(listPatients(database)).resolves.toEqual([patient]);

    await deletePatient(patient.id, database);

    await expect(getPatient(patient.id, database)).resolves.toBeUndefined();
  });

  it('writes, reads, and deletes assessments', async () => {
    database = createTestDatabase();
    const assessment = createAssessmentFixture();

    await expect(createAssessment(assessment, database)).resolves.toBe(
      assessment.id,
    );

    await expect(getAssessment(assessment.id, database)).resolves.toEqual(
      assessment,
    );

    await deleteAssessment(assessment.id, database);

    await expect(
      getAssessment(assessment.id, database),
    ).resolves.toBeUndefined();
  });

  it('writes, reads, and deletes pose sequences', async () => {
    database = createTestDatabase();
    const record = {
      assessmentId: 'assessment-1',
      data: createEmptyPoseSequence(now),
      id: 'pose-sequence-1',
    };

    await expect(savePoseSequence(record, database)).resolves.toBe(record.id);

    await expect(
      getPoseSequenceByAssessment(record.assessmentId, database),
    ).resolves.toEqual(record);

    await deletePoseSequence(record.id, database);

    await expect(
      getPoseSequenceByAssessment(record.assessmentId, database),
    ).resolves.toBeUndefined();
  });

  it('writes, lists by patient, and deletes results', async () => {
    database = createTestDatabase();
    const result = createResultFixture();

    await expect(saveResult(result, database)).resolves.toBe(
      result.assessmentId,
    );

    await expect(getResult(result.assessmentId, database)).resolves.toEqual(
      result,
    );
    await expect(
      listResultsByPatient(result.patientId, database),
    ).resolves.toEqual([result]);

    await deleteResult(result.assessmentId, database);

    await expect(
      listResultsByPatient(result.patientId, database),
    ).resolves.toEqual([]);
  });
});
