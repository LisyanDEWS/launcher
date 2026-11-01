import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './fonts/led-dot-matrix.css';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

