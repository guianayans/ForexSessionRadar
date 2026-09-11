import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);

function DashboardFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background text-sm text-mutedForeground">
      Abrindo o radar…
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/app"
          element={
            <Suspense fallback={<DashboardFallback />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
