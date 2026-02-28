import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary.tsx';
import './index.css';

// Suppress extension-related warnings in development
if (import.meta.env.DEV) {
  const originalError = console.error;
  const originalWarn = console.warn;

  // React 18 calls console.error('Warning: %s', actualMessage, ...)
  // so we must search ALL args, not just args[0].
  const SUPPRESSED = [
    'validateDOMNesting',
    'cannot appear as a child of',
    'WebSocket connection',
    'ws://localhost:8081',
    'ws://localhost:3001',
    'ws://localhost:3000',
    'Reload server disconnected',
    'extension',
    'Download the React DevTools',
    'SES Removing unpermitted',
    '[aiService]',
  ];

  const shouldSuppress = (...args: unknown[]): boolean =>
    args.some(
      (a) => typeof a === 'string' && SUPPRESSED.some((pattern) => a.includes(pattern))
    );

  console.error = (...args: unknown[]) => {
    if (shouldSuppress(...args)) return;
    originalError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    if (shouldSuppress(...args)) return;
    originalWarn.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>  
  </React.StrictMode>,
);