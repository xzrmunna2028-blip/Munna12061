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
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

