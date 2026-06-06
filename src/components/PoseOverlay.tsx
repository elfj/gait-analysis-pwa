import { useEffect, useRef } from 'react';
import { LANDMARK } from '@/lib/pose/landmarks';
import type { PoseFrame } from '@/types/pose';

const SKELETON_CONNECTIONS = [
  [LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_HIP],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_HIP],
  [LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP],
  [LANDMARK.LEFT_HIP, LANDMARK.LEFT_KNEE],
  [LANDMARK.LEFT_KNEE, LANDMARK.LEFT_ANKLE],
  [LANDMARK.LEFT_ANKLE, LANDMARK.LEFT_HEEL],
  [LANDMARK.LEFT_HEEL, LANDMARK.LEFT_FOOT_INDEX],
  [LANDMARK.RIGHT_HIP, LANDMARK.RIGHT_KNEE],
  [LANDMARK.RIGHT_KNEE, LANDMARK.RIGHT_ANKLE],
  [LANDMARK.RIGHT_ANKLE, LANDMARK.RIGHT_HEEL],
  [LANDMARK.RIGHT_HEEL, LANDMARK.RIGHT_FOOT_INDEX],
] as const;

/** Props for rendering a pose skeleton over the camera preview. */
export interface PoseOverlayProps {
  /** Latest pose frame to render. */
  frame: PoseFrame | null;
  /** CSS class name for the canvas element. */
  className?: string;
  /** Canvas drawing width in pixels. */
  width: number;
  /** Canvas drawing height in pixels. */
  height: number;
}

/** Draw a MediaPipe pose skeleton on a transparent canvas. */
export function PoseOverlay({
  className,
  frame,
  height,
  width,
}: PoseOverlayProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    const context = canvas.getContext('2d');

    if (context === null) {
      return;
    }

    context.clearRect(0, 0, width, height);

    if (frame === null) {
      return;
    }

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 4;
    context.strokeStyle = '#14b8a6';

    for (const [fromIndex, toIndex] of SKELETON_CONNECTIONS) {
      const from = frame.landmarks[fromIndex];
      const to = frame.landmarks[toIndex];

      if (from === undefined || to === undefined) {
        continue;
      }

      if (!isVisible(from) || !isVisible(to)) {
        continue;
      }

      context.beginPath();
      context.moveTo(from.x * width, from.y * height);
      context.lineTo(to.x * width, to.y * height);
      context.stroke();
    }

    context.fillStyle = '#f97316';

    for (const landmark of frame.landmarks) {
      if (!isVisible(landmark)) {
        continue;
      }

      context.beginPath();
      context.arc(landmark.x * width, landmark.y * height, 4, 0, Math.PI * 2);
      context.fill();
    }
  }, [frame, height, width]);

  return (
    <canvas
      aria-label="Pose skeleton overlay"
      className={className}
      height={height}
      ref={canvasRef}
      width={width}
    />
  );
}

/** Return true when a landmark is visible enough to draw. */
function isVisible(landmark: { visibility?: number }): boolean {
  return (landmark.visibility ?? 0) >= 0.5;
}
