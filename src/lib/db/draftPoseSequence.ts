/** Create a stable draft pose sequence ID for interrupted capture recovery. */
export function createDraftPoseSequenceId(assessmentId: string): string {
  return `draft:${assessmentId}`;
}
