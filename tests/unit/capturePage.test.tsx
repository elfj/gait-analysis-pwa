// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef, useImperativeHandle } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CameraViewHandle, CameraViewProps } from '../../src/components/CameraView';
import { CapturePage } from '../../src/pages/CapturePage';
import { useAssessmentStore } from '../../src/stores/assessmentStore';
import type { PoseFrame } from '../../src/types/pose';

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
const fakeStop = vi.fn<() => void>();

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
  afterEach(() => {
    cleanup();
    fakeStart.mockReset();
    fakeStop.mockReset();
    useAssessmentStore.getState().clearCapturedSequence();
  });

  it('starts capture and updates recording summary', async () => {
    fakeStart.mockResolvedValueOnce();

    renderCapturePage();

    await userEvent.click(screen.getByRole('button', { name: 'Start recording' }));

    expect(fakeStart).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('1')).toBeDefined();
    expect(screen.getByText('1.0 s')).toBeDefined();
  });

  it('stops capture, stores sequence, and navigates to analyzing', async () => {
    fakeStart.mockResolvedValueOnce();

    renderCapturePage();

    await userEvent.click(screen.getByRole('button', { name: 'Start recording' }));
    await userEvent.click(screen.getByRole('button', { name: 'Stop recording' }));

    await waitFor(() => {
      expect(screen.getByText('Analyzing route')).toBeDefined();
    });
    expect(fakeStop).toHaveBeenCalledTimes(1);
    expect(useAssessmentStore.getState().capturedSequence?.frames).toEqual([poseFrame]);
  });
});

/** Render CapturePage with route params and fake analyzing route. */
function renderCapturePage(): void {
  render(
    <MemoryRouter initialEntries={['/assessment/assessment-1/capture']}>
      <Routes>
        <Route
          path="/assessment/:id/capture"
          element={<CapturePage CameraComponent={FakeCameraView} />}
        />
        <Route
          path="/assessment/:id/analyzing"
          element={<div>Analyzing route</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}
