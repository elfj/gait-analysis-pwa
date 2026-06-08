/** Create a stable draft pose sequence ID for interrupted capture recovery. */
export function createDraftPoseSequenceId(
  assessmentId: string,
  patientId?: string,
): string {
  if (patientId === undefined || patientId.length === 0) {
    return `draft:${assessmentId}`;
  }

  return `draft:${patientId}:${assessmentId}`;
}
