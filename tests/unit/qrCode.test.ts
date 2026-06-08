import { describe, expect, it } from 'vitest';
import { createQrSvgPath, generateQrCodeMatrix } from '@/lib/utils/qrCode';

describe('QR code generator', () => {
  it('creates a version 8 QR matrix for an IMU URL', () => {
    const matrix = generateQrCodeMatrix(
      'https://gait-analysis-pwa.vercel.app/patient/patient-1/imu?sessionId=session-1',
    );

    expect(matrix).toHaveLength(49);
    expect(matrix[0]).toHaveLength(49);
    expect(matrix.flat().filter(Boolean).length).toBeGreaterThan(500);
    expect(createQrSvgPath(matrix)).toContain('M');
  });

  it('keeps timing modules separate from format information', () => {
    const matrix = generateQrCodeMatrix('https://example.test/patient/p1/imu?sessionId=s1');

    expect(matrix[8]?.[6]).toBe(true);
    expect(matrix[6]?.[8]).toBe(true);
  });

  it('rejects payloads that exceed the local QR capacity', () => {
    expect(() => {
      generateQrCodeMatrix(`https://example.test/${'x'.repeat(220)}`);
    }).toThrow('QR payload is too long');
  });
});
