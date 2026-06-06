/** 10-meter walk test assessment metadata. */
export interface Assessment {
  /** Internal assessment identifier. */
  id: string;
  /** Internal patient identifier linked to this assessment. */
  patientId: string;
  /** Assessment type; MVP supports 10MWT only. */
  testType: '10MWT';
  /** ISO timestamp for when the assessment was performed. */
  performedAt: string;
  /** Optional clinician notes for this assessment. */
  notes?: string;
}
