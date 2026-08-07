import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const nativeClose = window.close;
  window.close = function() {
    if (window.self === window.top) {
      console.warn('Prevented window.close() on top-level window to protect Android WebView APK from closing.');
      return;
    }
    try {
      if (nativeClose) nativeClose.call(window);
    } catch (_) {}
  };

  // Global console.error filter for IndexedDB iframe errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const errorStr = args.map(arg => {
      if (arg instanceof Error) return arg.message + '\n' + arg.stack;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (_) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    if (
      errorStr.includes('Database is closing/hidden') ||
      errorStr.includes('closing/hidden') ||
      (errorStr.includes('Database') && errorStr.includes('closing')) ||
      (errorStr.includes('database') && errorStr.includes('hidden'))
    ) {
      console.warn('[Filtered Safe Error]', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Unhandled promise rejections filter
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    if (
      msg.includes('Database is closing/hidden') ||
      msg.includes('closing/hidden') ||
      (msg.includes('Database') && msg.includes('closing')) ||
      (msg.includes('database') && msg.includes('hidden'))
    ) {
      event.preventDefault();
      console.warn('Prevented unhandled promise rejection for IndexedDB/Firebase iframe bug:', reason);
    }
  });

  // Global error filter
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('Database is closing/hidden') ||
      msg.includes('closing/hidden') ||
      (msg.includes('Database') && msg.includes('closing')) ||
      (msg.includes('database') && msg.includes('hidden'))
    ) {
      event.preventDefault();
      console.warn('Prevented global error event for IndexedDB/Firebase iframe bug:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

