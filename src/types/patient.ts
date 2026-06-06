/** Diagnosis category supported by the MVP patient form. */
export type DiagnosisCategory =
  | 'healthy'
  | 'parkinson'
  | 'stroke'
  | 'other_neurological';

/** Patient demographic and clinical metadata used for gait assessment. */
export interface Patient {
  /** Internal patient identifier. */
  id: string;
  /** Optional de-identified hospital or clinic record identifier. */
  externalId?: string;
  /** Patient birth year, used instead of full date of birth for privacy. */
  birthYear: number;
  /** Patient sex recorded for clinical context. */
  sex: 'M' | 'F' | 'other';
  /** Patient height in centimeters, used for spatial metric scaling. */
  heightCm: number;
  /** Broad diagnosis class for assessment context. */
  diagnosis: DiagnosisCategory;
  /** Optional free-text clinical notes. */
  notes?: string;
  /** ISO timestamp for when the patient record was created. */
  createdAt: string;
}
