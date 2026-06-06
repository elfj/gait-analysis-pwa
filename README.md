# Gait Analysis MVP

Privacy-first browser PWA for 10-meter walk test gait assessment. The app runs capture, pose estimation, gait analysis, visualization, PDF export, and local history in the browser.

## MVP Scope

- Guided 10MWT capture with camera permission and real-time skeleton overlay.
- Patient profile entry, local assessment history, and result dashboard.
- MediaPipe Pose keypoint capture with recording quality checks.
- Gait metrics for cadence, gait speed, stride timing, step length, stance phase, double support, joint angle ranges, and symmetry.
- PDF report export for clinical documentation.
- Local-first persistence with IndexedDB.

The MVP does not include backend services, user authentication, cloud video upload, EMR/FHIR integration, or diagnostic ML classification.

## Privacy Model

- Raw camera video is processed in the browser and is not persisted by default.
- The app stores patient metadata, assessment metadata, pose keypoint sequences, and gait results in IndexedDB.
- Keypoint JSON can still be sensitive health data. Use de-identified external IDs whenever possible.
- Mobile browsers may clear IndexedDB when device storage is low. Export PDF reports or back up derived results as needed.
- Camera access requires a secure context: `https://` in production or `localhost` during development.

## Stack

- React 18.3
- Vite 5
- TypeScript 5.5 strict mode
- Tailwind CSS 3.4
- shadcn/ui-compatible configuration
- MediaPipe Tasks Vision
- Recharts
- Zustand
- Dexie IndexedDB
- vite-plugin-pwa
- jsPDF and html2canvas
- Vitest and React Testing Library

## Requirements

- Node.js 20 or newer.
- Corepack-enabled pnpm.
- A modern mobile browser for camera testing:
  - iPhone Safari
  - Android Chrome
- HTTPS for any deployed environment that needs camera access.
- MediaPipe model file at `public/models/pose_landmarker_full.task`.
- Raster PWA icons at `public/icons/icon-192.png` and `public/icons/icon-512.png`.

## Setup

```bash
corepack enable
corepack pnpm install
```

Start the development server:

```bash
corepack pnpm dev --host 127.0.0.1
```

Preview a production build:

```bash
corepack pnpm build
corepack pnpm preview --host 127.0.0.1
```

## Verification

Run the full local verification suite before every task handoff:

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Manual end-to-end checks are tracked in [docs/MANUAL_TEST_CHECKLIST.md](docs/MANUAL_TEST_CHECKLIST.md). Use that checklist for real-device validation of capture, analysis, result review, PDF export, and offline/PWA behavior.

## MediaPipe Model

The full MediaPipe pose landmarker model must be present before running camera capture or deploying:

```text
public/models/pose_landmarker_full.task
```

Source URL:

```text
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task
```

The model is served as a static public asset. If pose initialization fails in production, verify that this file is included in the deployed `public` assets and is reachable at `/models/pose_landmarker_full.task`.

MediaPipe WASM runtime files are served from `public/wasm/` so installed PWAs can initialize pose detection without relying on a third-party CDN at capture time.

## Project Structure

```text
src/
  components/        Camera, overlay, chart, metric, and UI components
  lib/db/            Dexie schema and repositories
  lib/gait/          Event detection, metrics, kinematics, symmetry, pipeline
  lib/pose/          MediaPipe wrapper and quality checks
  lib/report/        PDF template and exporter
  pages/             Route-level app screens
  routes.tsx         Lazy route definitions
  stores/            Zustand state stores
  types/             Shared TypeScript domain models
tests/
  fixtures/          Deterministic gait fixtures
  unit/              Algorithm, repository, UI, and pipeline tests
docs/
  MANUAL_TEST_CHECKLIST.md
```

## Deployment: Vercel

1. Import the repository into Vercel.
2. Use the Vite defaults:
   - Install command: `corepack pnpm install --frozen-lockfile`
   - Build command: `corepack pnpm build`
   - Output directory: `dist`
3. Confirm `public/models/pose_landmarker_full.task` is committed or otherwise included in the deployment.
4. Deploy to the default Vercel HTTPS domain or a custom HTTPS domain.
5. On a real phone, open the deployed URL and verify camera permission, pose initialization, and the PWA install prompt.

## Deployment: Netlify

1. Connect the repository in Netlify.
2. Configure build settings:
   - Build command: `corepack pnpm build`
   - Publish directory: `dist`
   - Node version: 20 or newer
3. Confirm `public/models/pose_landmarker_full.task` is included in the deployed static assets.
4. Use the Netlify HTTPS domain or a custom HTTPS domain.
5. Run the manual checklist on iPhone Safari and Android Chrome before clinical pilots.

## Lighthouse Checks

After building and starting `pnpm preview`, run Lighthouse against the preview URL. The PWA and performance checks are the release gates for the MVP:

```bash
corepack pnpm dlx lighthouse http://127.0.0.1:4173 --only-categories=pwa --chrome-flags="--headless --no-sandbox"
corepack pnpm dlx lighthouse http://127.0.0.1:4173 --only-categories=performance --chrome-flags="--headless --no-sandbox"
```

Target scores:

- PWA: 90 or higher.
- Performance: 80 or higher.

## Troubleshooting

### Camera Permission Denied

- Verify the site is running on `https://` or `localhost`.
- Check browser-level camera permissions.
- Close other apps that may be using the camera.
- Use the in-app retry action after restoring permission.

### Pose Model Fails To Load

- Verify `/models/pose_landmarker_full.task` returns the model file.
- Confirm the MediaPipe WASM files can load from the configured CDN.
- Retry initialization. The app falls back from GPU to CPU when GPU delegate initialization fails.

### Analysis Fails Quality Checks

- Record at least 5 seconds.
- Keep shoulders, hips, knees, ankles, heels, and toes visible.
- Capture the patient from the sagittal side view.
- Ensure at least 6 steps are visible.
- Review the quality report on the analysis screen before recapturing.

### PDF Download Issues On iOS

- Use Safari's download or share sheet behavior.
- If a PDF appears in a browser tab instead of downloading, save it from the share menu.

## Clinical Disclaimer

This MVP is a clinical decision support prototype. It should not be used as the sole basis for diagnosis, treatment decisions, fall-risk classification, or neurological disease classification.
