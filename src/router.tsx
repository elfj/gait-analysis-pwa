import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { AnalyzingPage } from './pages/AnalyzingPage';
import { CapturePage } from './pages/CapturePage';
import { HomePage } from './pages/HomePage';
import { NewAssessmentPage } from './pages/NewAssessmentPage';
import { NewPatientPage } from './pages/NewPatientPage';
import { ResultPage } from './pages/ResultPage';

/** Browser router for the MVP assessment workflow. */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'patient/new', element: <NewPatientPage /> },
      { path: 'assessment/new/:patientId', element: <NewAssessmentPage /> },
      { path: 'assessment/:id/capture', element: <CapturePage /> },
      { path: 'assessment/:id/analyzing', element: <AnalyzingPage /> },
      { path: 'assessment/:id/result', element: <ResultPage /> },
    ],
  },
]);
