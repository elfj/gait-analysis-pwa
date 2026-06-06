import type {
  AnalysisWorkerRequest,
  AnalysisWorkerResponse,
} from './analysisWorker';
import type { GaitAnalysisResult } from '../../types/gait';
import type { Patient } from '../../types/patient';
import type { PoseSequence } from '../../types/pose';

/** Function shape used by UI code to run gait analysis. */
export type AnalyzeGaitRunner = (
  sequence: PoseSequence,
  patient: Patient,
) => Promise<GaitAnalysisResult>;

/** Run gait analysis inside a Web Worker to keep the UI responsive. */
export function analyzeGaitInWorker(
  sequence: PoseSequence,
  patient: Patient,
): Promise<GaitAnalysisResult> {
  return new Promise((resolve, reject) => {
    let worker: Worker;

    try {
      worker = new Worker(new URL('./analysisWorker.ts', import.meta.url), {
        type: 'module',
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    worker.addEventListener('message', (event: MessageEvent<AnalysisWorkerResponse>) => {
      worker.terminate();

      if (event.data.status === 'success') {
        resolve(event.data.result);
        return;
      }

      reject(new Error(event.data.error));
    });
    worker.addEventListener('error', (event) => {
      worker.terminate();
      reject(new Error(event.message));
    });
    worker.postMessage({
      patient,
      sequence,
    } satisfies AnalysisWorkerRequest);
  });
}
