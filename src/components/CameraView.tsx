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
  /** Start camera preview and pose detection without recording frames. */
  startPreview: () => Promise<void>;
  /** Start recording pose frames, starting preview first if needed. */
  startRecording: () => Promise<void>;
  /** Backward-compatible alias for starting frame recording. */
  start: () => Promise<void>;
  /** Stop recording pose frames while keeping camera preview active. */
  stopRecording: () => void;
  /** Stop camera preview, pose detection, and frame recording. */
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
    const isMountedRef = useRef(true);
    const isPreviewingRef = useRef(false);
    const isRecordingRef = useRef(false);
    const previewStartMsRef = useRef<number | null>(null);
    const recordingStartMsRef = useRef<number | null>(null);
    const startTokenRef = useRef(0);
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [latestFrame, setLatestFrame] = useState<PoseFrame | null>(null);
    const [overlaySize, setOverlaySize] = useState({
      height: 720,
      width: 1280,
    });

    const stop = useCallback((): void => {
      startTokenRef.current += 1;

      if (frameRequestRef.current !== null) {
        cancelAnimationFrame(frameRequestRef.current);
        frameRequestRef.current = null;
      }

      for (const track of streamRef.current?.getTracks() ?? []) {
        track.stop();
      }

      streamRef.current = null;
      isPreviewingRef.current = false;
      isRecordingRef.current = false;
      previewStartMsRef.current = null;
      recordingStartMsRef.current = null;
      detectorRef.current.dispose();
      setIsRunning(false);
    }, []);

    const assertStartStillActive = useCallback((startToken: number): void => {
      if (!isMountedRef.current || startToken !== startTokenRef.current) {
        throw new Error('Camera startup was cancelled.');
      }
    }, []);

    const detectLoop = useCallback((): void => {
      const video = videoRef.current;
      const previewStartMs = previewStartMsRef.current;

      if (video === null || previewStartMs === null) {
        return;
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const nowMs = performance.now();
        const recordingStartMs = recordingStartMsRef.current;
        const timestampMs =
          recordingStartMs === null
            ? nowMs - previewStartMs
            : nowMs - recordingStartMs;
        const frame = detectorRef.current.detect(video, timestampMs);

        if (frame !== null) {
          setLatestFrame(frame);

          if (isRecordingRef.current) {
            framesRef.current.push(frame);
            onPoseFrame?.(frame);
          }
        }
      }

      frameRequestRef.current = requestAnimationFrame(detectLoop);
    }, [onPoseFrame]);

    const startPreview = useCallback(async (): Promise<void> => {
      if (isPreviewingRef.current) {
        return;
      }

      try {
        stop();
        const startToken = startTokenRef.current;
        setLatestFrame(null);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints,
        });
        streamRef.current = stream;
        assertStartStillActive(startToken);
        const video = videoRef.current;

        if (video === null) {
          throw new Error('Camera preview element is unavailable.');
        }

        video.srcObject = stream;
        await video.play();
        assertStartStillActive(startToken);

        setOverlaySize({
          height: video.videoHeight || 720,
          width: video.videoWidth || 1280,
        });

        await detectorRef.current.initialize();
        assertStartStillActive(startToken);

        previewStartMsRef.current = performance.now();
        isPreviewingRef.current = true;
        setIsRunning(true);
        frameRequestRef.current = requestAnimationFrame(detectLoop);
      } catch (error) {
        stop();
        const normalizedError =
          error instanceof Error ? error : new Error(String(error));
        onError?.(normalizedError);
        throw normalizedError;
      }
    }, [assertStartStillActive, detectLoop, onError, stop, videoConstraints]);

    const startRecording = useCallback(async (): Promise<void> => {
      await startPreview();
      framesRef.current = [];
      recordingStartMsRef.current = performance.now();
      isRecordingRef.current = true;
    }, [startPreview]);

    const stopRecording = useCallback((): void => {
      isRecordingRef.current = false;
      recordingStartMsRef.current = null;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getFrames: () => [...framesRef.current],
        start: startRecording,
        startPreview,
        startRecording,
        stopRecording,
        stop,
      }),
      [startPreview, startRecording, stop, stopRecording],
    );

    useEffect(() => {
      isMountedRef.current = true;

      return () => {
        isMountedRef.current = false;
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
          {isRunning ? 'Camera preview running' : 'Camera stopped'}
        </p>
      </div>
    );
  },
);
