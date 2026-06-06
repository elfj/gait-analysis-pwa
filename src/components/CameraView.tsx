import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { PoseDetector } from '@/lib/pose/poseDetector';
import type { PoseFrame } from '@/types/pose';
import { PoseOverlay } from '@/components/PoseOverlay';

const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  frameRate: { ideal: 30 },
  height: { ideal: 720 },
  width: { ideal: 1280 },
};

/** Imperative API exposed by CameraView. */
export interface CameraViewHandle {
  /** Start camera capture and pose detection. */
  start: () => Promise<void>;
  /** Stop camera capture and pose detection. */
  stop: () => void;
  /** Return captured pose frames in recording order. */
  getFrames: () => PoseFrame[];
}

/** Props for camera preview and pose detection capture. */
export interface CameraViewProps {
  /** CSS class name for the root element. */
  className?: string;
  /** Optional detector injection for tests or alternate detector backends. */
  detector?: PoseDetector;
  /** Callback fired whenever a valid pose frame is detected. */
  onPoseFrame?: (frame: PoseFrame) => void;
  /** Callback fired when camera or detector startup fails. */
  onError?: (error: Error) => void;
  /** Video constraints for getUserMedia. */
  videoConstraints?: MediaTrackConstraints;
}

/** Camera preview that records MediaPipe pose frames and draws a skeleton. */
export const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(
  function CameraView(
    {
      className,
      detector,
      onError,
      onPoseFrame,
      videoConstraints = DEFAULT_VIDEO_CONSTRAINTS,
    },
    ref,
  ): React.JSX.Element {
    const detectorRef = useRef<PoseDetector>(detector ?? new PoseDetector());
    const frameRequestRef = useRef<number | null>(null);
    const framesRef = useRef<PoseFrame[]>([]);
    const recordingStartMsRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [latestFrame, setLatestFrame] = useState<PoseFrame | null>(null);
    const [overlaySize, setOverlaySize] = useState({
      height: 720,
      width: 1280,
    });

    const stop = useCallback((): void => {
      if (frameRequestRef.current !== null) {
        cancelAnimationFrame(frameRequestRef.current);
        frameRequestRef.current = null;
      }

      for (const track of streamRef.current?.getTracks() ?? []) {
        track.stop();
      }

      streamRef.current = null;
      recordingStartMsRef.current = null;
      detectorRef.current.dispose();
      setIsRunning(false);
    }, []);

    const detectLoop = useCallback((): void => {
      const video = videoRef.current;
      const recordingStartMs = recordingStartMsRef.current;

      if (video === null || recordingStartMs === null) {
        return;
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const timestampMs = performance.now() - recordingStartMs;
        const frame = detectorRef.current.detect(video, timestampMs);

        if (frame !== null) {
          framesRef.current.push(frame);
          setLatestFrame(frame);
          onPoseFrame?.(frame);
        }
      }

      frameRequestRef.current = requestAnimationFrame(detectLoop);
    }, [onPoseFrame]);

    const start = useCallback(async (): Promise<void> => {
      try {
        stop();
        framesRef.current = [];
        setLatestFrame(null);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints,
        });
        streamRef.current = stream;
        const video = videoRef.current;

        if (video === null) {
          throw new Error('Camera preview element is unavailable.');
        }

        video.srcObject = stream;
        await video.play();

        setOverlaySize({
          height: video.videoHeight || 720,
          width: video.videoWidth || 1280,
        });

        await detectorRef.current.initialize();

        recordingStartMsRef.current = performance.now();
        setIsRunning(true);
        frameRequestRef.current = requestAnimationFrame(detectLoop);
      } catch (error) {
        stop();
        const normalizedError =
          error instanceof Error ? error : new Error(String(error));
        onError?.(normalizedError);
        throw normalizedError;
      }
    }, [detectLoop, onError, stop, videoConstraints]);

    useImperativeHandle(
      ref,
      () => ({
        getFrames: () => [...framesRef.current],
        start,
        stop,
      }),
      [start, stop],
    );

    useEffect(() => {
      return () => {
        stop();
      };
    }, [stop]);

    return (
      <div className={className}>
        <div className="relative overflow-hidden rounded-lg bg-slate-950">
          <video
            aria-label="Camera preview"
            className="aspect-video w-full object-cover"
            muted
            playsInline
            ref={videoRef}
          />
          <PoseOverlay
            className="pointer-events-none absolute inset-0 h-full w-full"
            frame={latestFrame}
            height={overlaySize.height}
            width={overlaySize.width}
          />
        </div>
        <p className="sr-only" role="status">
          {isRunning ? 'Camera running' : 'Camera stopped'}
        </p>
      </div>
    );
  },
);
