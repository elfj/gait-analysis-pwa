# Manual E2E Test Checklist

This checklist verifies the MVP flow from patient creation to capture, analysis, result review, and PDF export. Run it on at least one desktop browser for baseline behavior, then repeat the camera-specific items on iPhone Safari and Android Chrome.

## Test Environment

- App URL:
- Build or commit:
- Tester:
- Test date:
- Device and browser:
- Network condition:

## Checklist

1. [ ] Open the app URL over HTTPS or localhost.
   - Expected: The app loads without a blank screen and shows the patient list home page.
   - Evidence:

2. [ ] Confirm PWA assets are available after production build.
   - Expected: `manifest.webmanifest` and generated service worker are served without 404 errors.
   - Evidence:

3. [ ] Install or add the PWA to the home screen where supported.
   - Expected: The installed app opens to the same home page and does not show browser-only layout breakage.
   - Evidence:

4. [ ] Create a new patient with valid values for external ID, birth year, sex, height, diagnosis, and notes.
   - Expected: Submit succeeds and the app returns to the patient list.
   - Evidence:

5. [ ] Try submitting the new patient form with required fields missing.
   - Expected: Inline validation messages appear and no patient is created.
   - Evidence:

6. [ ] Search the patient list by the newly created patient external ID.
   - Expected: The matching patient remains visible and unrelated patients are filtered out.
   - Evidence:

7. [ ] Open the patient assessment history from the patient list.
   - Expected: The patient detail area shows assessment history controls and a new assessment action.
   - Evidence:

8. [ ] Start a new 10MWT assessment for the patient.
   - Expected: The app navigates to the capture route for that assessment.
   - Evidence:

9. [ ] Read the capture guidance before starting camera capture.
   - Expected: Guidance mentions sagittal view, camera distance, and hip-height framing.
   - Evidence:

10. [ ] Grant camera permission on iPhone Safari.
    - Expected: The rear camera starts, video is visible, and no permission error remains.
    - Evidence:

11. [ ] Grant camera permission on Android Chrome.
    - Expected: The rear camera starts, video is visible, and no permission error remains.
    - Evidence:

12. [ ] Deny camera permission once.
    - Expected: The app shows a clear camera access failure state and does not crash.
    - Evidence:

13. [ ] Start recording a 10MWT capture with a person fully visible.
    - Expected: The recording timer and live capture state update continuously.
    - Evidence:

14. [ ] Confirm pose overlay behavior during capture.
    - Expected: Landmarks and skeleton lines render over the video when pose detection succeeds.
    - Evidence:

15. [ ] Confirm live quality indicator behavior during capture.
    - Expected: Quality status changes based on detection confidence, visibility, duration, and step count.
    - Evidence:

16. [ ] Stop recording after at least 5 seconds and 6 or more visible steps.
    - Expected: The app stores captured pose frames and navigates to the analyzing route.
    - Evidence:

17. [ ] Observe the analyzing page until completion.
    - Expected: The app shows progress stages and then navigates to the result route without freezing.
    - Evidence:

18. [ ] Review the result dashboard on a desktop-width viewport.
    - Expected: Summary metrics, gait cycle chart, symmetry chart, spatiotemporal table, and confidence notes render coherently.
    - Evidence:

19. [ ] Review the result dashboard on a phone-width viewport.
    - Expected: Cards stack cleanly, tables scroll horizontally where needed, and text does not overlap.
    - Evidence:

20. [ ] Click Download PDF and open the generated file.
    - Expected: The PDF opens as an A4 report with header, de-identified patient ID, date, summary metrics, charts, table, warnings, and disclaimer.
    - Evidence:

## Pass Criteria

- All 20 checklist items pass on the baseline desktop browser.
- Camera-specific items pass on both iPhone Safari and Android Chrome.
- Any failed item has a linked issue or follow-up task before release.
