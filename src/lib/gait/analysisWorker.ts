import { analyzeGait } from './pipeline';
import type { GaitAnalysisResult } from '../../types/gait';
import type { Patient } from '../../types/patient';
import type { PoseSequence } from '../../types/pose';

/** Message sent to the gait analysis worker. */
export interface AnalysisWorkerRequest {
  /** Patient metadata needed for scaling and result ownership. */
  patient: Patient;
  /** Captured pose sequence to analyze. */
  sequence: PoseSequence;
}

/** Message returned by the gait analysis worker. */
export type AnalysisWorkerResponse =
  | {
      /** Successful analysis result. */
      result: GaitAnalysisResult;
      /** Worker status. */
      status: 'success';
    }
  | {
      /** Error message from analysis. */
      error: string;
      /** Worker status. */
      status: 'error';
    };

self.addEventListener('message', (event: MessageEvent<AnalysisWorkerRequest>) => {
  void analyzeGait(event.data.sequence, event.data.patient)
    .then((result) => {
      postMessage({
        result,
        status: 'success',
      } satisfies AnalysisWorkerResponse);
    })
    .catch((error: unknown) => {
      postMessage({
        error: error instanceof Error ? error.message : 'Unable to analyze gait.',
        status: 'error',
      } satisfies AnalysisWorkerResponse);
    });
});
