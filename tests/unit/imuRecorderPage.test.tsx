// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImuRecorderPage } from '@/pages/ImuRecorderPage';
import { useNavigationGuardStore } from '@/stores/navigationGuardStore';
import type { ImuSequenceRecord } from '@/lib/db/schema';

const saveImuSequenceMock = vi.hoisted(() =>
  vi.fn<(record: ImuSequenceRecord) => Promise<string>>(),
);

vi.mock('@/lib/db/repositories', () => ({
  saveImuSequence: saveImuSequenceMock,
}));

describe('ImuRecorderPage', () => {
  let anchorClickMock: ReturnType<typeof vi.fn>;
  let createObjectUrlMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    saveImuSequenceMock.mockResolvedValue('imu:draft:patient-1');
    Object.defineProperty(window, 'DeviceMotionEvent', {
      configurable: true,
      value: class MockDeviceMotionEvent extends Event {},
    });
    vi.spyOn(performance, 'now').mockReturnValueOnce(1000).mockReturnValue(1050);
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    createObjectUrlMock = vi.fn(() => 'blob:imu-json');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    anchorClickMock = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(anchorClickMock);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    saveImuSequenceMock.mockReset();
    useNavigationGuardStore.getState().unblockNavigation();
  });

  it('records motion samples and saves a patient draft', async () => {
    renderImuRecorder('/patient/patient-1/imu?sessionId=session-1');

    await userEvent.click(screen.getByRole('button', { name: 'Start IMU' }));
    dispatchMotionSample();
    await userEvent.click(screen.getByRole('button', { name: 'Stop IMU' }));

    expect(await screen.findByText('1')).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: 'Save IMU draft' }));

    await waitFor(() => {
      expect(saveImuSequenceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: 'session-1',
          id: 'imu:draft:session-1',
          patientId: 'patient-1',
        }),
      );
    });
    const savedRecord = saveImuSequenceMock.mock.calls[0]?.[0];
    expect(savedRecord?.data.samples).toHaveLength(1);
  });

  it('exports recorded samples as JSON', async () => {
    renderImuRecorder('/imu/record');

    await userEvent.click(screen.getByRole('button', { name: 'Start IMU' }));
    dispatchMotionSample();
    await userEvent.click(screen.getByRole('button', { name: 'Stop IMU' }));
    expect(await screen.findByText('1')).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Download JSON' }));

    expect(createObjectUrlMock).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchorClickMock).toHaveBeenCalled();
  });

  it('shows a permission message when motion access is denied', async () => {
    Object.defineProperty(window, 'DeviceMotionEvent', {
      configurable: true,
      value: {
        requestPermission: vi.fn(() => Promise.resolve('denied')),
      },
    });

    renderImuRecorder('/imu/record');

    await userEvent.click(screen.getByRole('button', { name: 'Start IMU' }));

    expect(await screen.findByText('IMU recording needs attention')).toBeDefined();
    expect(
      screen.getByText(
        'Motion sensor access was denied. Allow motion and orientation access, then try again.',
      ),
    ).toBeDefined();
  });
});

/** Render the IMU recorder route with optional patient parameter. */
function renderImuRecorder(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/imu/record" element={<ImuRecorderPage />} />
        <Route path="/patient/:patientId/imu" element={<ImuRecorderPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Dispatch one DeviceMotion-like event in jsdom. */
function dispatchMotionSample(): void {
  const event = new Event('devicemotion') as DeviceMotionEvent;
  Object.defineProperties(event, {
    acceleration: {
      value: { x: 0.1, y: 0.2, z: 0.3 },
    },
    accelerationIncludingGravity: {
      value: { x: 0.1, y: 9.8, z: 0.3 },
    },
    rotationRate: {
      value: { alpha: 1, beta: 2, gamma: 3 },
    },
  });

  window.dispatchEvent(event);
}
