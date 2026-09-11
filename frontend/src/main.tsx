import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { PwaServiceWorker } from '@/components/PwaServiceWorker';
import '@/index.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <PwaServiceWorker />
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
