import Dexie, { type Table } from 'dexie';
import type { Assessment } from '@/types/assessment';
import type { GaitAnalysisResult } from '@/types/gait';
import type { Patient } from '@/types/patient';
import type { PoseSequence } from '@/types/pose';

/** Stored pose sequence entity keyed by assessment. */
export interface PoseSequenceRecord {
  /** Internal pose sequence record identifier. */
  id: string;
  /** Assessment identifier linked to this sequence. */
  assessmentId: string;
  /** Captured pose sequence payload. */
  data: PoseSequence;
}

/** IndexedDB database for patients, assessments, pose data, and results. */
export class GaitDB extends Dexie {
  /** Patient table indexed by clinical lookup fields. */
  patients!: Table<Patient, string>;
  /** Assessment metadata table. */
  assessments!: Table<Assessment, string>;
  /** Captured pose sequences keyed by assessment. */
  poseSequences!: Table<PoseSequenceRecord, string>;
  /** Gait analysis results keyed by assessment. */
  results!: Table<GaitAnalysisResult, string>;

  /** Create the GaitDB schema. */
  constructor(databaseName = 'GaitDB') {
    super(databaseName);

    this.version(1).stores({
      patients: 'id, externalId, diagnosis, createdAt',
      assessments: 'id, patientId, performedAt',
      poseSequences: 'id, assessmentId',
      results: 'assessmentId, patientId, performedAt',
    });
  }
}

/** Default application database instance. */
export const db = new GaitDB();
