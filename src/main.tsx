import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts (bundled woff2, same-origin — satisfies CSP font-src 'self').
// Display: Fraunces (full axes: wght + opsz + SOFT + WONK) for warm, crafted headings.
// Body/UI: Hanken Grotesk (variable weight) — humanist, legible, distinctive.
// Numeric/mono: Space Mono — characterful tabular figures for ringgit/ledger values.
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import App from './App.tsx';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the offline service worker in production (skipped in dev to avoid HMR
// interference). Same-origin only — consistent with the no-egress model.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is best-effort */
    });
  });
}
