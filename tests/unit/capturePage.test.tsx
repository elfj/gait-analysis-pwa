// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef, useImperativeHandle } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CameraViewHandle,
  CameraViewProps,
} from '../../src/components/CameraView';
import { CapturePage } from '../../src/pages/CapturePage';
import { useAssessmentStore } from '../../src/stores/assessmentStore';
import type { PoseFrame, PoseSequence } from '../../src/types/pose';

const poseFrame: PoseFrame = {
  landmarks: Array.from({ length: 33 }, (_, index) => ({
    visibility: 0.95,
    x: index / 33,
    y: index / 66,
    z: 0,
  })),
  timestamp: 1000,
};

const fakeStart = vi.fn<() => Promise<void>>();
const fakeStartPreview = vi.fn<() => Promise<void>>();
const fakeStop = vi.fn<() => void>();
const fakeStopRecording = vi.fn<() => void>();
const fakePersistPoseSequence =
  vi.fn<
    (record: {
      assessmentId: string;
      data: PoseSequence;
      id: string;
    }) => Promise<string>
  >();

const FakeCameraView = forwardRef<CameraViewHandle, CameraViewProps>(
  function FakeCameraView({ onPoseFrame }, ref): React.JSX.Element {
    useImperativeHandle(
      ref,
      () => ({
        getFrames: () => [poseFrame],
        start: () => {
          onPoseFrame?.(poseFrame);
          return fakeStart();
        },
        startPreview: () => fakeStartPreview(),
        startRecording: () => {
          onPoseFrame?.(poseFrame);
          return fakeStart();
        },
        stopRecording: () => {
          fakeStopRecording();
        },
        stop: () => {
          fakeStop();
        },
      }),
      [onPoseFrame],
    );

    return <div>Fake camera preview</div>;
  },
);

describe('CapturePage', () => {
  beforeEach(() => {
    fakeStart.mockResolvedValue();
    fakeStartPreview.mockResolvedValue();
    fakePersistPoseSequence.mockResolvedValue('draft:patient-1');
  });

  afterEach(() => {
    cleanup();
    fakeStart.mockReset();
    fakeStartPreview.mockReset();
    fakeStop.mockReset();
    fakeStopRecording.mockReset();
    fakePersistPoseSequence.mockReset();
    useAssessmentStore.getState().clearCapturedSequence();
  });

  it('starts capture and updates recording summary', async () => {
    renderCapturePage();

    expect(
      await screen.findByText(
        'Camera preview is active. Align the subject, then start recording.',
      ),
    ).toBeDefined();
    await userEvent.click(
      screen.getByRole('button', { name: 'Start recording' }),
    );

    expect(fakeStartPreview).toHaveBeenCalledTimes(1);
    expect(fakeStart).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('1')).toBeDefined();
    expect(screen.getByText('1.0 s')).toBeDefined();
  });

  it('shows an actionable message when camera permission is denied', async () => {
    fakeStartPreview.mockRejectedValueOnce(
      new DOMException('Permission denied', 'NotAllowedError'),
    );

    renderCapturePage();

    expect(await screen.findByText('Capture needs attention')).toBeDefined();
    expect(
      screen.getByText(
        'Camera access was denied. Allow camera permission in the browser settings, then try again.',
      ),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
  });

  it('stops capture, stores sequence, and navigates to analyzing', async () => {
    renderCapturePage();

    await screen.findByText(
      'Camera preview is active. Align the subject, then start recording.',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Start recording' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Stop recording' }),
    );

    await waitFor(() => {
      expect(screen.getByText('Analyzing route')).toBeDefined();
    });
    expect(fakePersistPoseSequence).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: 'patient-1',
        id: 'draft:patient-1',
      }),
    );
    expect(fakePersistPoseSequence.mock.calls[0]?.[0].data.frames).toEqual([
      poseFrame,
    ]);
    expect(fakeStopRecording).toHaveBeenCalledTimes(1);
    expect(useAssessmentStore.getState().capturedSequence?.frames).toEqual([
      poseFrame,
    ]);
  });

  it('ignores a second start click while startup is in flight', async () => {
    const deferredStart = createDeferred<undefined>();

    fakeStart.mockReturnValue(deferredStart.promise);

    renderCapturePage();

    await screen.findByText(
      'Camera preview is active. Align the subject, then start recording.',
    );
    const startButton = screen.getByRole('button', { name: 'Start recording' });
    fireEvent.click(startButton);
    fireEvent.click(startButton);

    expect(fakeStart).toHaveBeenCalledTimes(1);

    deferredStart.resolve(undefined);
    await screen.findByText('1');
  });
});

/** Create a manually resolved promise for startup race tests. */
function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise,
  };
}

/** Render CapturePage with route params and fake analyzing route. */
function renderCapturePage(): void {
  render(
    <MemoryRouter initialEntries={['/patient/patient-1/capture']}>
      <Routes>
        <Route
          path="/patient/:patientId/capture"
          element={
            <CapturePage
              CameraComponent={FakeCameraView}
              persistPoseSequence={fakePersistPoseSequence}
            />
          }
        />
        <Route
          path="/patient/:patientId/analyzing"
          element={<div>Analyzing route</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}
