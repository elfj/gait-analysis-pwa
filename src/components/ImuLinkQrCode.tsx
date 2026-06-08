import { useMemo } from 'react';
import { createQrSvgPath, generateQrCodeMatrix } from '@/lib/utils/qrCode';

/** Render a scannable QR code for opening the paired IMU recorder. */
export function ImuLinkQrCode({ url }: { url: string }): React.JSX.Element {
  const matrix = useMemo(() => generateQrCodeMatrix(url), [url]);
  const path = useMemo(() => createQrSvgPath(matrix), [matrix]);
  const size = matrix.length;

  return (
    <svg
      aria-label="QR code for paired IMU recorder"
      className="h-48 w-48 rounded-md bg-white p-2"
      role="img"
      viewBox={`-4 -4 ${String(size + 8)} ${String(size + 8)}`}
    >
      <path d={`M-4 -4h${String(size + 8)}v${String(size + 8)}h-${String(size + 8)}z`} fill="#fff" />
      <path d={path} fill="#0f172a" />
    </svg>
  );
}
