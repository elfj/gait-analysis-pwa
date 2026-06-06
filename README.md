# Gait Analysis MVP

Privacy-first home gait analysis PWA for 10-meter walk tests.

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

## Development

```bash
pnpm install
pnpm dev
```

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## MediaPipe Model

The pose model will be added in Task 2.1:

`public/models/pose_landmarker_full.task`

Source URL to document during Task 2.1:

`https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task`
